import { generateDoctorSummary, shouldUseLiveGemini } from '../gemini';
import type { ConsentDecisionResult, ConsentIntentRecord, FamilyResponseEvaluation } from '../ai-consent-session';
import { NOT_SIGNED_CONSENT_NOTICE } from '../repositories/consent-session-repository';
import { inMemoryConsentSessionRepository } from '../repositories/in-memory-consent-session-repository';
import type { ConsentSessionRepository } from '../repositories/consent-session-repository';
import { extractLatestIntent, extractQaLog, type SessionQaLogEntry } from './session-view-handler';

export type DoctorSummaryView = {
  sessionId: string;
  status: string;
  diagnosis: string;
  plannedSurgery: string;
  modelMode: string;
  understood: string[];
  notUnderstood: string[];
  concerns: string[];
  doctorQuestions: string[];
  qaLog: SessionQaLogEntry[];
  understandingScore: { correct: number; total: number };
  intent: ConsentIntentRecord | null;
  consentDecision: ConsentDecisionResult | null;
  suggestedScript: string[];
  anxietyLevel: 'low' | 'medium' | 'high';
  selectedEvidenceIds: string[];
  reviews: Array<{ reviewStatus: string; physicianNotes?: string; createdAt: string }>;
  notSignedConsentNotice: string;
};

function isUnderstandingCheckpoint(evaluation: FamilyResponseEvaluation): boolean {
  return evaluation.checkpointId !== 'family-concerns';
}

export function buildDeterministicSuggestedScript(input: {
  notUnderstood: string[];
  doctorQuestions: string[];
  intent: ConsentIntentRecord | null;
}): string[] {
  const script: string[] = [];
  for (const item of input.notUnderstood) {
    script.push(`「${item}」を平易な言葉で再説明する`);
  }
  for (const question of input.doctorQuestions) {
    script.push(`家族からの質問に直接回答する: ${question}`);
  }
  if (input.intent?.statedIntent === 'undecided') {
    script.push('同意の判断を急がせず、残っている迷いの内容を確認する');
  }
  if (input.intent?.statedIntent === 'declines') {
    script.push('同意しない理由を確認し、治療しない場合の経過を改めて説明する');
  }
  if (script.length === 0) {
    script.push('理解確認は完了。同意意思を最終確認し、署名手続きへ進む');
  }
  return script;
}

export async function handleDoctorSummaryRequest(
  sessionId: string,
  repository: ConsentSessionRepository = inMemoryConsentSessionRepository,
): Promise<{ status: number; body: DoctorSummaryView | { error: string } }> {
  if (!sessionId?.trim()) {
    return { status: 400, body: { error: 'sessionId is required' } };
  }
  const summary = await repository.getSessionSummary(sessionId).catch(() => null);
  if (!summary) {
    return { status: 404, body: { error: 'session not found' } };
  }

  const understandingEvaluations = summary.evaluations.filter(isUnderstandingCheckpoint);
  const understood = understandingEvaluations.filter((item) => item.level === 'clear').map((item) => item.checkpointTitle);
  const notUnderstood = understandingEvaluations
    .filter((item) => item.level !== 'clear')
    .map((item) => item.checkpointTitle);

  const concernEvaluations = summary.evaluations.filter((item) => !isUnderstandingCheckpoint(item));
  const familyResponses = summary.events
    .filter((event) => event.eventType === 'family_response' && typeof event.payload.concerns === 'string' && event.payload.concerns)
    .map((event) => event.payload.concerns as string);
  const concerns = Array.from(new Set([...familyResponses, ...concernEvaluations.map((item) => item.evidence.sanitizedResponse)]));

  const qaLog = extractQaLog(summary.events);
  const { intent, decision } = extractLatestIntent(summary.events);
  const doctorQuestions = Array.from(
    new Set([
      ...qaLog.filter((entry) => entry.escalated).map((entry) => entry.question),
      ...(decision?.unresolvedQuestions ?? []),
      ...(intent?.questionsForPhysician ?? []),
    ]),
  );

  const notUnderstoodWithRedFlags = concernEvaluations.length > 0 ? [...notUnderstood, '不安の訴えあり（自由記述）'] : notUnderstood;

  const view: DoctorSummaryView = {
    sessionId: summary.id,
    status: summary.status,
    diagnosis: summary.diagnosis,
    plannedSurgery: summary.plannedSurgery,
    modelMode: summary.modelMode,
    understood,
    notUnderstood: notUnderstoodWithRedFlags,
    concerns,
    doctorQuestions,
    qaLog,
    understandingScore: {
      correct: understandingEvaluations.filter((item) => item.level === 'clear').length,
      total: understandingEvaluations.length,
    },
    intent,
    consentDecision: decision,
    suggestedScript: buildDeterministicSuggestedScript({ notUnderstood: notUnderstoodWithRedFlags, doctorQuestions, intent }),
    anxietyLevel: concernEvaluations.length > 0 ? 'high' : notUnderstood.length > 0 ? 'medium' : 'low',
    selectedEvidenceIds: summary.selectedEvidence.map((item) => item.evidenceId),
    reviews: summary.reviews.map((review) => ({ reviewStatus: review.reviewStatus, physicianNotes: review.physicianNotes, createdAt: review.createdAt })),
    notSignedConsentNotice: NOT_SIGNED_CONSENT_NOTICE,
  };

  if (shouldUseLiveGemini()) {
    try {
      const aiSummary = await generateDoctorSummary({
        caseId: summary.caseHandle,
        explanationViewed: summary.selectedEvidence.map((item) => item.title),
        qaLog: qaLog.map((entry) => ({ question: entry.question, answer: entry.answer, safetyLabel: entry.safetyLabel })),
        understandingAnswers: understandingEvaluations.map((item) => ({
          question: item.checkpointTitle,
          answer: item.evidence.sanitizedResponse,
        })),
        concerns: concerns.join(' / '),
        risks: [],
      });
      if (typeof aiSummary?.suggestedScript === 'string' && aiSummary.suggestedScript.trim()) {
        view.suggestedScript = aiSummary.suggestedScript.split('\n').map((line: string) => line.trim()).filter(Boolean);
      }
      if (aiSummary?.anxietyLevel === 'low' || aiSummary?.anxietyLevel === 'medium' || aiSummary?.anxietyLevel === 'high') {
        view.anxietyLevel = aiSummary.anxietyLevel;
      }
    } catch (error) {
      console.warn('Doctor summary AI enrichment failed; deterministic summary is used', error);
    }
  }

  return { status: 200, body: view };
}
