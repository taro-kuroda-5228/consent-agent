import { generateExplanation, shouldUseLiveGemini } from '../gemini';
import { createFamilyAccessToken } from '../family-access-token';
import { buildEvidenceTransparency, resolveEvidenceSelectionForRequest, retrieveMockEvidence, type EvidenceCard } from '../consent-demo';
import { inMemoryConsentSessionRepository } from '../repositories/in-memory-consent-session-repository';
import type { ConsentSessionRepository } from '../repositories/consent-session-repository';

export type ExplainHandlerInput = {
  diagnosis: string;
  plannedSurgery: string;
  risks?: string[] | string;
  urgency?: string;
  purpose?: string;
  cardiopulmonaryBypass?: boolean;
  transfusion?: string;
  notes?: string;
  selectedEvidenceIds?: string[];
  customEvidence?: EvidenceCard[];
  sessionId?: string;
};

export function normalizeRiskInput(risks: unknown): string[] {
  if (Array.isArray(risks)) {
    return risks
      .filter((risk): risk is string => typeof risk === 'string' && risk.trim().length > 0)
      .map((risk) => risk.trim());
  }
  if (typeof risks === 'string') {
    return risks
      .split(/[、,\n]/)
      .map((risk) => risk.trim())
      .filter(Boolean);
  }
  return [];
}

export async function handleExplainRequest(input: ExplainHandlerInput, repository: ConsentSessionRepository = inMemoryConsentSessionRepository) {
  if (!input.diagnosis || !input.plannedSurgery) {
    return { status: 400, body: { error: 'diagnosis and plannedSurgery are required' } };
  }

  const session = await repository.createSession({
    sessionId: input.sessionId,
    diagnosis: input.diagnosis,
    plannedSurgery: input.plannedSurgery,
    urgency: input.urgency,
    modelMode: shouldUseLiveGemini() ? 'gemini' : 'mock',
  });

  const physicianUploadedEvidence: EvidenceCard[] = Array.isArray(input.customEvidence)
    ? input.customEvidence.filter((item) => {
        if (!item?.evidenceId || !item?.displayForFamily) return false;
        return item.origin === 'physician-upload' || item.retrievalStatus === 'pubmed-verified' || item.evidenceId.startsWith('PUBMED-');
      })
    : [];
  const selectedEvidence = resolveEvidenceSelectionForRequest(
    [...retrieveMockEvidence(input.diagnosis), ...physicianUploadedEvidence],
    input.selectedEvidenceIds,
  );
  const evidenceTransparency = buildEvidenceTransparency(selectedEvidence);
  const risks = normalizeRiskInput(input.risks);
  await repository.saveSelectedEvidence({ sessionId: session.id, selectedEvidence });

  try {
    const explanation = await generateExplanation({
      diagnosis: input.diagnosis,
      plannedSurgery: input.plannedSurgery,
      risks,
      urgency: input.urgency || '',
      purpose: input.purpose || '',
      cardiopulmonaryBypass: input.cardiopulmonaryBypass ?? false,
      transfusion: input.transfusion || '',
      notes: input.notes || '',
      selectedEvidence,
    });
    const event = await repository.appendSessionEvent({
      sessionId: session.id,
      eventType: 'explanation_generated',
      actorType: 'model',
      payload: { selectedEvidenceIds: selectedEvidence.map((e) => e.evidenceId), evidenceTransparency, explanation },
    });
    const audit = await repository.appendAuditEvent({
      sessionId: session.id,
      action: 'explanation_generated',
      resourceType: 'consent_session',
      resourceId: session.id,
      metadata: { selectedEvidenceIds: selectedEvidence.map((e) => e.evidenceId), modelMode: session.modelMode },
    });
    const familyAccessToken = createFamilyAccessToken(session.id);
    return { status: 200, body: { explanation, selectedEvidence, evidenceTransparency, sessionId: session.id, familyAccessToken, auditEventId: audit.id, sessionEventId: event.id } };
  } catch {
    const audit = await repository.appendAuditEvent({
      sessionId: session.id,
      action: 'explanation_generation_failed',
      resourceType: 'consent_session',
      resourceId: session.id,
      metadata: { category: 'model-or-fallback-error', phiSafe: true },
    });
    return { status: 500, body: { error: 'Failed to generate explanation', auditEventId: audit.id } };
  }
}
