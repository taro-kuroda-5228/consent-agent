import { beforeEach, describe, expect, it } from 'vitest';
import { evaluateFamilyResponse, buildAorticDissectionCheckpoints } from '../ai-consent-session';
import { retrieveMockEvidence } from '../consent-demo';
import { InMemoryConsentSessionRepository, resetInMemoryConsentSessionRepository } from './in-memory-consent-session-repository';
import { NOT_SIGNED_CONSENT_NOTICE } from './consent-session-repository';

describe('ConsentSessionRepository', () => {
  beforeEach(() => resetInMemoryConsentSessionRepository());

  it('persists sessions, selected evidence, events, evaluations, reviews, and audit summaries', async () => {
    const repo = new InMemoryConsentSessionRepository();
    const session = await repo.createSession({ diagnosis: '急性A型大動脈解離', plannedSurgery: '上行大動脈人工血管置換術' });
    const selectedEvidence = retrieveMockEvidence('急性A型大動脈解離').slice(0, 2);
    await repo.saveSelectedEvidence({ sessionId: session.id, selectedEvidence });
    await repo.appendSessionEvent({ sessionId: session.id, eventType: 'explanation_generated', actorType: 'model', payload: { selectedEvidenceIds: selectedEvidence.map(e => e.evidenceId) } });
    await repo.appendAuditEvent({ sessionId: session.id, action: 'explanation_generated', resourceType: 'consent_session', metadata: { selectedEvidenceIds: selectedEvidence.map(e => e.evidenceId) } });
    const evaluation = evaluateFamilyResponse(buildAorticDissectionCheckpoints()[0], '大動脈が裂け、MRN-1234567 の父が心配です');
    await repo.saveUnderstandingEvaluation({ sessionId: session.id, evaluation });
    await repo.savePhysicianReview({ sessionId: session.id, reviewStatus: 'needs_followup', physicianNotes: '患者ID 1234567 は伏せる', notSignedConsentNotice: NOT_SIGNED_CONSENT_NOTICE });

    const summary = await repo.getSessionSummary(session.id);
    expect(summary?.selectedEvidence).toHaveLength(2);
    expect(summary?.events.map(e => e.eventType)).toContain('understanding_evaluated');
    expect(JSON.stringify(summary)).not.toContain('MRN-1234567');
    expect(JSON.stringify(summary)).not.toContain('1234567');
    expect(JSON.stringify(summary)).toContain('[REDACTED]');
    expect(summary?.reviews[0].notSignedConsentNotice).toContain('署名済み同意ではなく');
  });
});
