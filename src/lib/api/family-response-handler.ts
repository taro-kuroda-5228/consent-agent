import {
  deriveConsentDecision,
  detectRedFlags,
  sanitizeClinicalFreeText,
  type ConsentDecisionResult,
  type ConsentIntentRecord,
  type FamilyResponseEvaluation,
} from '../ai-consent-session';
import { getUnderstandingQuestions } from '../understanding-checks';
import { inMemoryConsentSessionRepository } from '../repositories/in-memory-consent-session-repository';
import type { ConsentSessionRepository } from '../repositories/consent-session-repository';
import { extractQaLog } from './session-view-handler';

export type FamilyResponseInput = {
  answers: Array<{ questionId: string; selectedIndex: number }>;
  concerns?: string;
  intent: 'agrees' | 'undecided' | 'declines';
};

export type FamilyResponseResult = {
  decision: ConsentDecisionResult;
  evaluations: FamilyResponseEvaluation[];
  intent: ConsentIntentRecord;
};

const VALID_INTENTS = new Set(['agrees', 'undecided', 'declines']);

export function evaluateUnderstandingAnswers(
  answers: FamilyResponseInput['answers'],
): FamilyResponseEvaluation[] {
  const questions = getUnderstandingQuestions();
  return questions.map((question) => {
    const answer = answers.find((item) => item.questionId === question.id);
    const answered = answer !== undefined;
    const correct = answered && answer.selectedIndex === question.correctIndex;
    return {
      checkpointId: question.id,
      checkpointTitle: question.concept,
      level: correct ? 'clear' : 'partial',
      score: correct ? 1 : 0,
      missingConcepts: correct ? [] : [question.concept],
      redFlags: [],
      recommendedNextAction: correct ? 'continue' : 'reexplain',
      evidence: {
        matchedConcepts: correct ? [question.concept] : [],
        sanitizedResponse: answered ? question.options[answer.selectedIndex] ?? '未回答' : '未回答',
      },
    };
  });
}

export function buildConcernsEvaluation(concerns: string): FamilyResponseEvaluation | null {
  const sanitized = sanitizeClinicalFreeText(concerns);
  if (!sanitized) return null;
  const redFlags = detectRedFlags(sanitized);
  if (redFlags.length === 0) return null;
  return {
    checkpointId: 'family-concerns',
    checkpointTitle: '家族の不安・自由記述',
    level: 'unsafe',
    score: 0,
    missingConcepts: [],
    redFlags,
    recommendedNextAction: 'escalate_to_physician',
    evidence: { matchedConcepts: [], sanitizedResponse: sanitized },
  };
}

export async function handleFamilyResponseRequest(
  sessionId: string,
  input: FamilyResponseInput,
  repository: ConsentSessionRepository = inMemoryConsentSessionRepository,
): Promise<{ status: number; body: FamilyResponseResult | { error: string } }> {
  if (!sessionId?.trim()) {
    return { status: 400, body: { error: 'sessionId is required' } };
  }
  if (!Array.isArray(input.answers) || !VALID_INTENTS.has(input.intent)) {
    return { status: 400, body: { error: 'answers and a valid intent (agrees/undecided/declines) are required' } };
  }
  const summary = await repository.getSessionSummary(sessionId).catch(() => null);
  if (!summary) {
    return { status: 404, body: { error: 'session not found' } };
  }

  const sanitizedConcerns = sanitizeClinicalFreeText(input.concerns ?? '');
  const evaluations = evaluateUnderstandingAnswers(input.answers);
  const concernsEvaluation = buildConcernsEvaluation(sanitizedConcerns);
  const allEvaluations = concernsEvaluation ? [...evaluations, concernsEvaluation] : evaluations;

  const intent: ConsentIntentRecord = {
    statedIntent: input.intent,
    confidence: 'high',
    freeTextSummary: sanitizedConcerns,
    questionsForPhysician: sanitizedConcerns ? [sanitizedConcerns] : [],
  };

  const escalatedQuestions = extractQaLog(summary.events)
    .filter((entry) => entry.escalated)
    .map((entry) => entry.question);

  const decision = deriveConsentDecision({ evaluations: allEvaluations, intent, escalatedQuestions });

  for (const evaluation of allEvaluations) {
    await repository.saveUnderstandingEvaluation({ sessionId, evaluation });
  }
  await repository.appendSessionEvent({
    sessionId,
    eventType: 'family_response',
    actorType: 'family',
    payload: { concerns: sanitizedConcerns, answeredQuestionIds: input.answers.map((item) => item.questionId) },
  });
  await repository.appendSessionEvent({
    sessionId,
    eventType: 'intent_recorded',
    actorType: 'family',
    payload: { intent, decision } as unknown as Record<string, unknown>,
  });
  await repository.appendAuditEvent({
    sessionId,
    action: 'intent_recorded',
    resourceType: 'consent_session',
    resourceId: sessionId,
    metadata: { statedIntent: intent.statedIntent, decision: decision.decision, reasonCount: decision.reasons.length },
  });

  return { status: 200, body: { decision, evaluations: allEvaluations, intent } };
}
