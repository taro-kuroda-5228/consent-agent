import type { ConsentSessionEvent } from '../repositories/consent-session-repository';
import type { FamilyResponseEvaluation } from '../ai-consent-session';

export const CONSENT_REALTIME_FALLBACK_MS = 5000;

export function consentSessionChannelName(sessionId: string): string {
  if (!sessionId.trim()) throw new Error('sessionId is required');
  return `consent-session:${sessionId}`;
}

export type PhysicianQueuePriority = 'urgent_intervention' | 'reexplanation' | 'routine_review';

export function mapEvaluationToQueuePriority(evaluation: FamilyResponseEvaluation): PhysicianQueuePriority {
  if (evaluation.level === 'unsafe' || evaluation.recommendedNextAction === 'escalate_to_physician') return 'urgent_intervention';
  if (evaluation.level === 'partial' || evaluation.recommendedNextAction === 'reexplain') return 'reexplanation';
  return 'routine_review';
}

export function mapSessionEventToQueueCard(event: ConsentSessionEvent) {
  const payload = event.payload as Record<string, unknown>;
  return {
    id: event.id,
    sessionId: event.sessionId,
    eventType: event.eventType,
    priority: event.eventType === 'safety_escalation' ? 'urgent_intervention' : event.eventType === 'understanding_evaluated' ? 'reexplanation' : 'routine_review',
    title: event.eventType === 'qa_answered' ? '家族からの質問' : event.eventType === 'understanding_evaluated' ? '理解確認結果' : '監査イベント',
    summary: String(payload.question || payload.answer || payload.checkpointTitle || event.eventType),
    createdAt: event.createdAt,
  } as const;
}

export function buildRealtimeSubscriptionPlan(sessionId: string, realtimeAvailable: boolean) {
  return realtimeAvailable
    ? { mode: 'supabase-realtime' as const, channelName: consentSessionChannelName(sessionId), tables: ['session_events', 'understanding_evaluations'] }
    : { mode: 'polling' as const, intervalMs: CONSENT_REALTIME_FALLBACK_MS, channelName: consentSessionChannelName(sessionId), tables: ['session_events', 'understanding_evaluations'] };
}
