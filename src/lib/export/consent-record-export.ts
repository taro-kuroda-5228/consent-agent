import { sanitizeClinicalFreeText } from '../ai-consent-session';
import { NOT_SIGNED_CONSENT_NOTICE, type ConsentSessionSummary } from '../repositories/consent-session-repository';

export type ConsentRecordExport = {
  recordType: 'anonymous_consent_agent_explanation_export';
  caseHandle: 'demo-anonymous-case';
  sessionId: string;
  generatedAt: string;
  notSignedConsentNotice: string;
  selectedEvidenceIds: string[];
  modelMode: string;
  explanationVersion: string;
  physicianReviewRequired: true;
  phiHandling: 'anonymous-demo-only-redacted';
  auditTimeline: Array<{ eventType: string; actorType: string; createdAt: string }>;
  reviews: Array<{ reviewStatus: string; physicianNotes?: string }>;
};

export function buildAnonymousConsentRecordExport(summary: ConsentSessionSummary, generatedAt = new Date().toISOString()): ConsentRecordExport {
  return sanitizeExport({
    recordType: 'anonymous_consent_agent_explanation_export',
    caseHandle: 'demo-anonymous-case',
    sessionId: summary.id,
    generatedAt,
    notSignedConsentNotice: NOT_SIGNED_CONSENT_NOTICE,
    selectedEvidenceIds: summary.selectedEvidence.map((evidence) => evidence.evidenceId),
    modelMode: summary.modelMode,
    explanationVersion: summary.explanationVersion,
    physicianReviewRequired: true,
    phiHandling: 'anonymous-demo-only-redacted',
    auditTimeline: summary.events.map((event) => ({ eventType: event.eventType, actorType: event.actorType, createdAt: event.createdAt })),
    reviews: summary.reviews.map((review) => ({ reviewStatus: review.reviewStatus, physicianNotes: review.physicianNotes })),
  });
}

function sanitizeExport<T>(value: T): T {
  return JSON.parse(JSON.stringify(value), (_key, innerValue) => typeof innerValue === 'string' ? sanitizeClinicalFreeText(innerValue) : innerValue);
}
