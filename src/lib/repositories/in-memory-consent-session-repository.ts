import { sanitizeClinicalFreeText } from '../ai-consent-session';
import type { EvidenceCard } from '../consent-demo';
import {
  DEFAULT_EXPLANATION_VERSION,
  DEMO_CASE_ID,
  DEMO_INSTITUTION_ID,
  makeId,
  type AppendAuditEventInput,
  type AppendSessionEventInput,
  type AuditEventRecord,
  type ConsentSessionRecord,
  type ConsentSessionRepository,
  type ConsentSessionSummary,
  type CreateConsentSessionInput,
  type PhysicianReviewRecord,
  type SavePhysicianReviewInput,
  type SaveSelectedEvidenceInput,
  type SaveSourceDocumentCacheInput,
  type SaveUnderstandingEvaluationInput,
  type SourceDocumentCacheRecord,
} from './consent-session-repository';

const sessions = new Map<string, ConsentSessionRecord>();
const audits = new Map<string, AuditEventRecord[]>();
const sourceDocuments = new Map<string, SourceDocumentCacheRecord>();

function sanitizeEvidence(evidence: EvidenceCard): EvidenceCard {
  return {
    ...evidence,
    displayForFamily: sanitizeClinicalFreeText(evidence.displayForFamily),
    clinicianSummary: evidence.clinicianSummary ? sanitizeClinicalFreeText(evidence.clinicianSummary) : evidence.clinicianSummary,
    quotedSpan: evidence.quotedSpan ? sanitizeClinicalFreeText(evidence.quotedSpan) : evidence.quotedSpan,
    keyFindings: evidence.keyFindings?.map(sanitizeClinicalFreeText),
  };
}

export function resetInMemoryConsentSessionRepository() {
  sessions.clear();
  audits.clear();
  sourceDocuments.clear();
}

export class InMemoryConsentSessionRepository implements ConsentSessionRepository {
  async createSession(input: CreateConsentSessionInput): Promise<ConsentSessionRecord> {
    if (input.sessionId && sessions.has(input.sessionId)) return sessions.get(input.sessionId)!;
    const now = new Date().toISOString();
    const record: ConsentSessionRecord = {
      id: input.sessionId ?? makeId('session'),
      caseId: DEMO_CASE_ID,
      institutionId: input.institutionId ?? DEMO_INSTITUTION_ID,
      caseHandle: input.caseHandle ?? 'demo-aortic-dissection',
      diagnosis: sanitizeClinicalFreeText(input.diagnosis),
      plannedSurgery: sanitizeClinicalFreeText(input.plannedSurgery),
      status: 'explaining',
      modelMode: input.modelMode ?? 'mock',
      explanationVersion: input.explanationVersion ?? DEFAULT_EXPLANATION_VERSION,
      selectedEvidence: [],
      events: [],
      evaluations: [],
      reviews: [],
      createdAt: now,
      updatedAt: now,
    };
    sessions.set(record.id, record);
    audits.set(record.id, []);
    return record;
  }

  async saveSelectedEvidence(input: SaveSelectedEvidenceInput): Promise<void> {
    const session = requireSession(input.sessionId);
    session.selectedEvidence = input.selectedEvidence.map(sanitizeEvidence);
    session.updatedAt = new Date().toISOString();
  }

  async appendSessionEvent(input: AppendSessionEventInput) {
    const session = requireSession(input.sessionId);
    const event = { id: makeId('event'), sessionId: input.sessionId, eventType: input.eventType, actorType: input.actorType, payload: sanitizePayload(input.payload), createdAt: new Date().toISOString() };
    session.events.push(event);
    session.updatedAt = event.createdAt;
    return event;
  }

  async appendAuditEvent(input: AppendAuditEventInput) {
    const institutionId = input.institutionId ?? (input.sessionId ? requireSession(input.sessionId).institutionId : DEMO_INSTITUTION_ID);
    const event: AuditEventRecord = { id: makeId('audit'), institutionId, sessionId: input.sessionId, action: input.action, resourceType: input.resourceType, resourceId: input.resourceId, metadata: sanitizePayload(input.metadata ?? {}), createdAt: new Date().toISOString() };
    const key = input.sessionId ?? institutionId;
    audits.set(key, [...(audits.get(key) ?? []), event]);
    return event;
  }

  async saveUnderstandingEvaluation(input: SaveUnderstandingEvaluationInput): Promise<void> {
    const session = requireSession(input.sessionId);
    session.evaluations.push({ ...input.evaluation, evidence: { ...input.evaluation.evidence, sanitizedResponse: sanitizeClinicalFreeText(input.evaluation.evidence.sanitizedResponse) } });
    session.status = input.evaluation.recommendedNextAction === 'continue' ? 'checking_understanding' : input.evaluation.recommendedNextAction === 'reexplain' ? 'needs_reexplanation' : 'ready_for_physician_review';
    await this.appendSessionEvent({ sessionId: input.sessionId, eventType: 'understanding_evaluated', actorType: 'model', payload: input.evaluation as unknown as Record<string, unknown> });
  }

  async savePhysicianReview(input: SavePhysicianReviewInput): Promise<PhysicianReviewRecord> {
    const session = requireSession(input.sessionId);
    const review = { id: makeId('review'), sessionId: input.sessionId, reviewStatus: input.reviewStatus, physicianNotes: input.physicianNotes ? sanitizeClinicalFreeText(input.physicianNotes) : undefined, notSignedConsentNotice: input.notSignedConsentNotice, createdAt: new Date().toISOString() };
    session.reviews.push(review);
    session.status = 'reviewed';
    await this.appendSessionEvent({ sessionId: input.sessionId, eventType: 'physician_reviewed', actorType: 'physician', payload: { reviewStatus: input.reviewStatus } });
    return review;
  }

  async getSessionSummary(sessionId: string): Promise<ConsentSessionSummary | null> {
    const session = sessions.get(sessionId);
    return session ? { ...session, auditEvents: audits.get(sessionId) ?? [] } : null;
  }

  async getSelectedEvidence(sessionId: string): Promise<EvidenceCard[]> {
    return requireSession(sessionId).selectedEvidence;
  }

  async getSourceDocumentCache(sourceUrl: string): Promise<SourceDocumentCacheRecord | null> {
    const cached = sourceDocuments.get(sourceUrl);
    return cached ? { ...cached, chunks: cached.chunks.map((chunk) => ({ ...chunk })) } : null;
  }

  async saveSourceDocumentCache(input: SaveSourceDocumentCacheInput): Promise<void> {
    sourceDocuments.set(input.sourceUrl, { ...input, chunks: input.chunks.map((chunk) => ({ ...chunk })), updatedAt: new Date().toISOString() });
  }
}

function requireSession(sessionId: string) {
  const session = sessions.get(sessionId);
  if (!session) throw new Error(`Consent session not found: ${sessionId}`);
  return session;
}

function sanitizePayload(payload: Record<string, unknown>): Record<string, unknown> {
  return JSON.parse(JSON.stringify(payload), (_key, value) => typeof value === 'string' ? sanitizeClinicalFreeText(value) : value);
}

export const inMemoryConsentSessionRepository = new InMemoryConsentSessionRepository();
