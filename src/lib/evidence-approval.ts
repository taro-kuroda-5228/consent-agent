import type { EvidenceCard } from './consent-demo';
import type { ConsentSessionRepository } from './repositories/consent-session-repository';

export function normalizeApprovedPubMedEvidence(card: EvidenceCard) {
  if (!card.pmid || !card.displayForFamily || !card.quotedSpan) {
    throw new Error('PubMed evidence requires pmid, quotedSpan, and displayForFamily before patient-facing reuse');
  }
  return {
    origin: 'pubmed' as const,
    evidenceId: card.evidenceId.startsWith('PUBMED-') ? card.evidenceId : `PUBMED-${card.pmid}`,
    pmid: card.pmid,
    title: card.title,
    sourceUrl: card.sourceUrl ?? `https://pubmed.ncbi.nlm.nih.gov/${card.pmid}/`,
    citation: card.citation,
    quotedSpan: card.quotedSpan,
    displayForFamily: card.displayForFamily,
    clinicianSummary: card.clinicianSummary ?? card.claim,
    keyFindings: card.keyFindings ?? [],
    outcomeTags: card.outcomeTags ?? [],
  };
}

export async function approveEvidenceForSession(input: { sessionId: string; evidence: EvidenceCard }, repository: ConsentSessionRepository) {
  const normalized = normalizeApprovedPubMedEvidence(input.evidence);
  const selected = await repository.getSelectedEvidence(input.sessionId).catch(() => []);
  const merged = [...selected.filter((evidence) => evidence.evidenceId !== normalized.evidenceId && evidence.pmid !== normalized.pmid), { ...input.evidence, evidenceId: normalized.evidenceId }];
  await repository.saveSelectedEvidence({ sessionId: input.sessionId, selectedEvidence: merged });
  await repository.appendSessionEvent({ sessionId: input.sessionId, eventType: 'intent_recorded', actorType: 'physician', payload: { action: 'evidence_approved', evidenceId: normalized.evidenceId, pmid: normalized.pmid } });
  await repository.appendAuditEvent({ sessionId: input.sessionId, action: 'evidence_approved', resourceType: 'evidence_source', metadata: { evidenceId: normalized.evidenceId, pmid: normalized.pmid, origin: normalized.origin } });
  return { selectedEvidence: merged, approvedEvidence: normalized };
}
