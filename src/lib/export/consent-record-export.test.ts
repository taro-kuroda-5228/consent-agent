import { beforeEach, describe, expect, it } from 'vitest';
import { evaluateFamilyResponse, buildAorticDissectionCheckpoints } from '../ai-consent-session';
import { retrieveMockEvidence } from '../consent-demo';
import { InMemoryConsentSessionRepository, resetInMemoryConsentSessionRepository } from '../repositories/in-memory-consent-session-repository';
import { NOT_SIGNED_CONSENT_NOTICE } from '../repositories/consent-session-repository';
import { buildAnonymousConsentRecordExport } from './consent-record-export';

describe('anonymous consent record export', () => {
  beforeEach(() => resetInMemoryConsentSessionRepository());

  it('contains audit metadata and redacts identifiers from review/evaluation text', async () => {
    const repo = new InMemoryConsentSessionRepository();
    const session = await repo.createSession({ diagnosis: '急性A型大動脈解離', plannedSurgery: '上行大動脈人工血管置換術' });
    await repo.saveSelectedEvidence({ sessionId: session.id, selectedEvidence: retrieveMockEvidence('急性A型大動脈解離').slice(0, 1) });
    await repo.saveUnderstandingEvaluation({ sessionId: session.id, evaluation: evaluateFamilyResponse(buildAorticDissectionCheckpoints()[0], '山田太郎さん MRN-7654321 が不安です') });
    await repo.savePhysicianReview({ sessionId: session.id, reviewStatus: 'needs_followup', physicianNotes: '山田太郎さん 7654321 へ説明', notSignedConsentNotice: NOT_SIGNED_CONSENT_NOTICE });
    const summary = await repo.getSessionSummary(session.id);
    const exported = buildAnonymousConsentRecordExport(summary!, '2026-06-06T00:00:00.000Z');
    expect(exported.notSignedConsentNotice).toContain('署名済み同意ではなく');
    expect(exported.physicianReviewRequired).toBe(true);
    expect(exported.phiHandling).toBe('anonymous-demo-only-redacted');
    expect(exported.selectedEvidenceIds).toContain('FAC-001');
    const serialized = JSON.stringify(exported);
    expect(serialized).not.toContain('山田太郎');
    expect(serialized).not.toContain('7654321');
    expect(serialized).toContain('[REDACTED]');
  });
});
