import {
  deriveConsentDecision,
  detectRedFlags,
  sanitizeClinicalFreeText,
  type ConsentDecisionResult,
  type ConsentIntentRecord,
  type FamilyResponseEvaluation,
} from '../ai-consent-session';
import { assessFamilyConcernsWithGemini, shouldUseLiveGemini, type ConcernsAssessment } from '../gemini';
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

export type ConcernsAssessor = (
  concerns: string,
  context: { diagnosis: string; plannedSurgery: string },
) => Promise<ConcernsAssessment>;

async function defaultAssessConcerns(
  concerns: string,
  context: { diagnosis: string; plannedSurgery: string },
): Promise<ConcernsAssessment | null> {
  if (!shouldUseLiveGemini()) return null;
  return assessFamilyConcernsWithGemini(concerns, context);
}

async function runConcernsAssessment(
  concerns: string,
  context: { diagnosis: string; plannedSurgery: string },
  assessor?: ConcernsAssessor,
): Promise<ConcernsAssessment | null> {
  if (!concerns) return null;
  try {
    const assessment = assessor ? await assessor(concerns, context) : await defaultAssessConcerns(concerns, context);
    return assessment ?? null;
  } catch (error) {
    // AI評価が失敗してもキーワード検出は機能している。失敗は警告に留める。
    console.warn('Concerns AI assessment failed; keyword red-flag detection remains active', error);
    return null;
  }
}

export async function handleFamilyResponseRequest(
  sessionId: string,
  input: FamilyResponseInput,
  repository: ConsentSessionRepository = inMemoryConsentSessionRepository,
  options: { concernsAssessor?: ConcernsAssessor } = {},
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

  // キーワード検出に加えて、AIが自由記述の不安・理解不足を評価する（取りこぼし防止の二重チェック）
  const aiAssessment = await runConcernsAssessment(
    sanitizedConcerns,
    { diagnosis: summary.diagnosis, plannedSurgery: summary.plannedSurgery },
    options.concernsAssessor,
  );
  if (aiAssessment?.escalate && !concernsEvaluation) {
    allEvaluations.push({
      checkpointId: 'family-concerns-ai',
      checkpointTitle: '家族の不安・自由記述（AI評価）',
      level: 'unsafe',
      score: 0,
      missingConcepts: [],
      redFlags: aiAssessment.reasons,
      recommendedNextAction: 'escalate_to_physician',
      evidence: { matchedConcepts: [], sanitizedResponse: sanitizedConcerns },
    });
  }

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
    payload: {
      concerns: sanitizedConcerns,
      answeredQuestionIds: input.answers.map((item) => item.questionId),
      aiConcernsAssessment: aiAssessment ?? undefined,
    },
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
