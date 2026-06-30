import { generateQA } from '../gemini';
import { resolveEvidenceSelectionForRequest, retrieveMockEvidence, type EvidenceCard } from '../consent-demo';
import { inMemoryConsentSessionRepository } from '../repositories/in-memory-consent-session-repository';
import type { ConsentSessionRepository } from '../repositories/consent-session-repository';

export type QaHandlerInput = {
  question: string;
  diagnosis?: string;
  plannedSurgery?: string;
  risks?: string[];
  selectedEvidenceIds?: string[];
  customEvidence?: EvidenceCard[];
  facilityAnswerTemplates?: unknown[];
  sessionId?: string;
};

export async function handleQaRequest(input: QaHandlerInput, repository: ConsentSessionRepository = inMemoryConsentSessionRepository) {
  if (!input.question || !input.question.trim()) {
    return { status: 400, body: { error: 'question is required' } };
  }

  const requestCustomEvidence: EvidenceCard[] = Array.isArray(input.customEvidence)
    ? input.customEvidence.filter((item) => {
        if (!item?.evidenceId || !item?.displayForFamily) return false;
        return item.origin === 'physician-upload' || item.retrievalStatus === 'pubmed-verified' || item.evidenceId.startsWith('PUBMED-');
      })
    : [];
  let selectedEvidence: EvidenceCard[];
  let selectedEvidenceSource: 'database' | 'request' | 'database+request' = 'request';
  let metadataWarning: string | undefined;

  if (input.sessionId) {
    try {
      const dbEvidence = await repository.getSelectedEvidence(input.sessionId);
      const requestIds = new Set(input.selectedEvidenceIds ?? []);
      const dbEvidenceIds = new Set(dbEvidence.map((evidence) => evidence.evidenceId));
      const requestTimeSelectedEvidence = requestIds.size > 0
        ? requestCustomEvidence.filter((evidence) => requestIds.has(evidence.evidenceId) && !dbEvidenceIds.has(evidence.evidenceId))
        : [];
      selectedEvidence = [...dbEvidence, ...requestTimeSelectedEvidence];
      selectedEvidenceSource = requestTimeSelectedEvidence.length > 0 ? 'database+request' : 'database';
      if (dbEvidence.length === 0 && requestTimeSelectedEvidence.length === 0) {
        metadataWarning = 'persisted physician-selected evidence was empty; no request-time physician-selected evidence was provided for this session';
      } else if (requestTimeSelectedEvidence.length > 0) {
        metadataWarning = 'request-time physician-selected evidence was merged with persisted session evidence';
      } else if (requestIds.size > 0 && dbEvidence.some((evidence) => !requestIds.has(evidence.evidenceId))) {
        metadataWarning = 'request selectedEvidenceIds differed from persisted physician-selected evidence; database state was used';
      } else if (requestCustomEvidence.length > 0) {
        metadataWarning = 'request customEvidence was ignored because it was not selected for this session';
      }
    } catch {
      selectedEvidence = [];
      selectedEvidenceSource = 'database';
      metadataWarning = 'persisted physician-selected evidence could not be loaded; request evidence was not used for this session';
    }
  } else {
    selectedEvidence = resolveEvidenceSelectionForRequest([...retrieveMockEvidence(input.diagnosis || ''), ...requestCustomEvidence], input.selectedEvidenceIds);
  }

  const result = await generateQA(input.question, {
    diagnosis: input.diagnosis || '',
    plannedSurgery: input.plannedSurgery || '',
    risks: input.risks || [],
    selectedEvidence,
    facilityAnswerTemplates: Array.isArray(input.facilityAnswerTemplates) ? input.facilityAnswerTemplates as never[] : [],
  });

  if (input.sessionId) {
    await repository.appendSessionEvent({
      sessionId: input.sessionId,
      eventType: result.evidenceReferences?.length ? 'qa_answered' : 'safety_escalation',
      actorType: 'model',
      payload: {
        question: input.question,
        answer: result.answer,
        safetyLabel: result.safetyLabel,
        evidenceReferences: result.evidenceReferences ?? [],
        selectedEvidenceSource,
        metadataWarning,
        citationVerification: result.citationVerification,
      },
    });
    await repository.appendAuditEvent({
      sessionId: input.sessionId,
      action: 'qa_answered',
      resourceType: 'consent_session',
      metadata: {
        evidenceReferences: result.evidenceReferences ?? [],
        selectedEvidenceSource,
        escalated: !result.evidenceReferences?.length,
        citationVerifiedCount: result.citationVerification?.verifiedSpans.length ?? null,
        citationRejectedCount: result.citationVerification?.rejectedSpans.length ?? null,
      },
    });
  }

  return { status: 200, body: { ...result, selectedEvidence, metadata: { selectedEvidenceSource, warning: metadataWarning } } };
}
