import { beforeEach, describe, expect, it } from 'vitest';
import { approveEvidenceForSession, normalizeApprovedPubMedEvidence } from './evidence-approval';
import { InMemoryConsentSessionRepository, resetInMemoryConsentSessionRepository } from './repositories/in-memory-consent-session-repository';
import type { EvidenceCard } from './consent-demo';

const candidate: EvidenceCard = {
  evidenceId: 'PUBMED-123', title: 'Renal outcomes in ATAAD', sourceType: 'Review', claim: 'dialysis risk', displayForFamily: '透析リスクについて記載があります。', confidence: 'moderate', citation: 'Demo PMID: 123', pmid: '123', origin: 'medevidence-rag', quotedSpan: 'dialysis risk 5%', keyFindings: ['dialysis risk 5%'], outcomeTags: ['renal-failure'], sourceUrl: 'https://pubmed.ncbi.nlm.nih.gov/123/',
};

describe('evidence approval', () => {
  beforeEach(() => resetInMemoryConsentSessionRepository());

  it('requires answer-bearing fields before approving PubMed evidence', () => {
    expect(normalizeApprovedPubMedEvidence(candidate).pmid).toBe('123');
    expect(() => normalizeApprovedPubMedEvidence({ ...candidate, quotedSpan: undefined })).toThrow(/quotedSpan/);
  });

  it('adds approved PubMed evidence to physician-selected session evidence', async () => {
    const repo = new InMemoryConsentSessionRepository();
    const session = await repo.createSession({ diagnosis: '急性A型大動脈解離', plannedSurgery: '上行大動脈人工血管置換術' });
    const result = await approveEvidenceForSession({ sessionId: session.id, evidence: candidate }, repo);
    expect(result.selectedEvidence.map(e => e.evidenceId)).toContain('PUBMED-123');
    const summary = await repo.getSessionSummary(session.id);
    expect(summary?.auditEvents.map(e => e.action)).toContain('evidence_approved');
  });
});
