import { randomUUID } from 'node:crypto';
import type { EvidenceCard } from '../consent-demo';
import type { FamilyResponseEvaluation } from '../ai-consent-session';

export type SessionEventType = 'explanation_generated' | 'family_response' | 'qa_answered' | 'understanding_evaluated' | 'intent_recorded' | 'physician_reviewed' | 'export_created' | 'safety_escalation';
export type ActorType = 'system' | 'physician' | 'family' | 'model';

export type CreateConsentSessionInput = {
  sessionId?: string;
  diagnosis: string;
  plannedSurgery: string;
  urgency?: string;
  institutionId?: string;
  caseHandle?: string;
  modelMode?: 'mock' | 'gemini' | 'vertex-gemini';
  explanationVersion?: string;
};

export type ConsentSessionRecord = Required<Pick<CreateConsentSessionInput, 'diagnosis' | 'plannedSurgery'>> & {
  id: string;
  institutionId: string;
  caseHandle: string;
  caseId: string;
  status: 'draft' | 'explaining' | 'checking_understanding' | 'needs_reexplanation' | 'ready_for_physician_review' | 'reviewed' | 'archived';
  modelMode: 'mock' | 'gemini' | 'vertex-gemini';
  explanationVersion: string;
  selectedEvidence: EvidenceCard[];
  events: ConsentSessionEvent[];
  evaluations: FamilyResponseEvaluation[];
  reviews: PhysicianReviewRecord[];
  createdAt: string;
  updatedAt: string;
};

export type ConsentSessionEvent = {
  id: string;
  sessionId: string;
  eventType: SessionEventType;
  actorType: ActorType;
  payload: Record<string, unknown>;
  createdAt: string;
};

export type AuditEventRecord = {
  id: string;
  sessionId?: string;
  institutionId: string;
  action: string;
  resourceType: string;
  resourceId?: string;
  metadata: Record<string, unknown>;
  createdAt: string;
};

export type PhysicianReviewRecord = {
  id: string;
  sessionId: string;
  reviewStatus: 'needs_followup' | 'ready_for_consent_discussion' | 'closed';
  physicianNotes?: string;
  notSignedConsentNotice: string;
  createdAt: string;
};

export type ConsentSessionSummary = ConsentSessionRecord & { auditEvents: AuditEventRecord[] };

export type SaveSelectedEvidenceInput = { sessionId: string; selectedEvidence: EvidenceCard[] };
export type AppendSessionEventInput = { sessionId: string; eventType: SessionEventType; actorType: ActorType; payload: Record<string, unknown> };
export type SaveUnderstandingEvaluationInput = { sessionId: string; evaluation: FamilyResponseEvaluation };
export type SavePhysicianReviewInput = { sessionId: string; reviewStatus: PhysicianReviewRecord['reviewStatus']; physicianNotes?: string; notSignedConsentNotice: string };
export type AppendAuditEventInput = { sessionId?: string; institutionId?: string; action: string; resourceType: string; resourceId?: string; metadata?: Record<string, unknown> };

export interface ConsentSessionRepository {
  createSession(input: CreateConsentSessionInput): Promise<ConsentSessionRecord>;
  saveSelectedEvidence(input: SaveSelectedEvidenceInput): Promise<void>;
  appendSessionEvent(input: AppendSessionEventInput): Promise<ConsentSessionEvent>;
  appendAuditEvent(input: AppendAuditEventInput): Promise<AuditEventRecord>;
  saveUnderstandingEvaluation(input: SaveUnderstandingEvaluationInput): Promise<void>;
  savePhysicianReview(input: SavePhysicianReviewInput): Promise<PhysicianReviewRecord>;
  getSessionSummary(sessionId: string): Promise<ConsentSessionSummary | null>;
  getSelectedEvidence(sessionId: string): Promise<EvidenceCard[]>;
}

export const DEMO_INSTITUTION_ID = '00000000-0000-0000-0000-000000000001';
export const DEMO_CASE_ID = '00000000-0000-0000-0000-000000000101';
export const DEFAULT_EXPLANATION_VERSION = 'aortic-dissection-omni-demo-v1';
export const NOT_SIGNED_CONSENT_NOTICE = 'この記録は署名済み同意ではなく、医師最終確認前の同意説明支援レコードです。';

export function makeId(prefix = 'evt') {
  return `${prefix}-${randomUUID()}`;
}
