import { getUnderstandingQuestions, type UnderstandingQuestion } from '../understanding-checks';
import { inMemoryConsentSessionRepository } from '../repositories/in-memory-consent-session-repository';
import type { ConsentSessionRepository, ConsentSessionEvent } from '../repositories/consent-session-repository';
import type { ConsentDecisionResult, ConsentIntentRecord } from '../ai-consent-session';

export type SessionQaLogEntry = {
  question: string;
  answer: string;
  safetyLabel: string;
  escalated: boolean;
  createdAt: string;
};

export type FamilySessionView = {
  sessionId: string;
  status: string;
  diagnosis: string;
  plannedSurgery: string;
  explanation: unknown[];
  evidence: Array<{ evidenceId: string; title: string; sourceType: string; citation: string }>;
  understandingQuestions: UnderstandingQuestion[];
  qaLog: SessionQaLogEntry[];
  intent: ConsentIntentRecord | null;
  consentDecision: ConsentDecisionResult | null;
};

export function extractLatestExplanation(events: ConsentSessionEvent[]): unknown[] {
  for (let index = events.length - 1; index >= 0; index -= 1) {
    const event = events[index];
    if (event.eventType === 'explanation_generated' && Array.isArray(event.payload.explanation)) {
      return event.payload.explanation as unknown[];
    }
  }
  return [];
}

export function extractQaLog(events: ConsentSessionEvent[]): SessionQaLogEntry[] {
  return events
    .filter((event) => event.eventType === 'qa_answered' || event.eventType === 'safety_escalation')
    .map((event) => ({
      question: typeof event.payload.question === 'string' ? event.payload.question : '',
      answer: typeof event.payload.answer === 'string' ? event.payload.answer : '',
      safetyLabel: typeof event.payload.safetyLabel === 'string' ? event.payload.safetyLabel : 'general',
      escalated: event.eventType === 'safety_escalation',
      createdAt: event.createdAt,
    }))
    .filter((entry) => entry.question);
}

export function extractLatestIntent(events: ConsentSessionEvent[]): { intent: ConsentIntentRecord | null; decision: ConsentDecisionResult | null } {
  for (let index = events.length - 1; index >= 0; index -= 1) {
    const event = events[index];
    if (event.eventType === 'intent_recorded') {
      return {
        intent: (event.payload.intent as ConsentIntentRecord) ?? null,
        decision: (event.payload.decision as ConsentDecisionResult) ?? null,
      };
    }
  }
  return { intent: null, decision: null };
}

export async function handleSessionViewRequest(
  sessionId: string,
  repository: ConsentSessionRepository = inMemoryConsentSessionRepository,
): Promise<{ status: number; body: FamilySessionView | { error: string } }> {
  if (!sessionId?.trim()) {
    return { status: 400, body: { error: 'sessionId is required' } };
  }
  const summary = await repository.getSessionSummary(sessionId).catch(() => null);
  if (!summary) {
    return { status: 404, body: { error: 'session not found' } };
  }
  const { intent, decision } = extractLatestIntent(summary.events);
  return {
    status: 200,
    body: {
      sessionId: summary.id,
      status: summary.status,
      diagnosis: summary.diagnosis,
      plannedSurgery: summary.plannedSurgery,
      explanation: extractLatestExplanation(summary.events),
      evidence: summary.selectedEvidence.map((item) => ({
        evidenceId: item.evidenceId,
        title: item.title,
        sourceType: item.sourceType,
        citation: item.citation,
      })),
      understandingQuestions: getUnderstandingQuestions(),
      qaLog: extractQaLog(summary.events),
      intent,
      consentDecision: decision,
    },
  };
}
