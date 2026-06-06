import { describe, expect, it } from 'vitest';
import { buildRealtimeSubscriptionPlan, consentSessionChannelName, mapEvaluationToQueuePriority } from './consent-session-channel';
import { buildAorticDissectionCheckpoints, evaluateFamilyResponse } from '../ai-consent-session';

describe('consent session realtime channel', () => {
  it('uses stable consent-session channel names and polling fallback', () => {
    expect(consentSessionChannelName('session-123')).toBe('consent-session:session-123');
    expect(buildRealtimeSubscriptionPlan('session-123', true).mode).toBe('supabase-realtime');
    expect(buildRealtimeSubscriptionPlan('session-123', false)).toMatchObject({ mode: 'polling', intervalMs: 5000 });
  });

  it('maps unsafe and partial understanding to physician queue priorities', () => {
    const checkpoints = buildAorticDissectionCheckpoints();
    expect(mapEvaluationToQueuePriority(evaluateFamilyResponse(checkpoints[0], '怖いです。父は必ず助かりますか'))).toBe('urgent_intervention');
    expect(mapEvaluationToQueuePriority(evaluateFamilyResponse(checkpoints[0], '急いで手術が必要そうですが詳しく分かりません'))).toBe('reexplanation');
  });
});
