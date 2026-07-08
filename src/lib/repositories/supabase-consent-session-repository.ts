import { randomUUID } from 'node:crypto';
import type { SupabaseClient } from '@supabase/supabase-js';
import { sanitizeClinicalFreeText } from '../ai-consent-session';
import type { EvidenceCard } from '../consent-demo';
import type { Database } from '../supabase/types';
import {
  DEFAULT_EXPLANATION_VERSION,
  DEMO_CASE_ID,
  DEMO_INSTITUTION_ID,
  NOT_SIGNED_CONSENT_NOTICE,
  type AppendAuditEventInput,
  type AppendSessionEventInput,
  type AuditEventRecord,
  type ConsentSessionEvent,
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

type SupabaseRow = Record<string, unknown>;

const DEMO_CASE_HANDLE = 'demo-aortic-dissection';

export class SupabaseConsentSessionRepository implements ConsentSessionRepository {
  constructor(private readonly supabase: SupabaseClient<Database>) {}

  async createSession(input: CreateConsentSessionInput): Promise<ConsentSessionRecord> {
    const institutionId = input.institutionId ?? DEMO_INSTITUTION_ID;
    const caseHandle = input.caseHandle ?? DEMO_CASE_HANDLE;
    const caseId = await this.ensureConsentCase({
      institutionId,
      caseHandle,
      diagnosis: input.diagnosis,
      plannedSurgery: input.plannedSurgery,
      urgency: input.urgency,
    });

    const existing = input.sessionId ? await this.findSessionRow(input.sessionId) : null;
    let row: SupabaseRow;
    if (existing) {
      row = existing;
    } else {
      const sessionId = isUuid(input.sessionId) ? input.sessionId! : randomUUID();
      await this.must(this.supabase.from('consent_sessions').insert({
        id: sessionId,
        case_id: caseId,
        institution_id: institutionId,
        status: 'explaining',
        model_mode: input.modelMode ?? 'mock',
        explanation_version: input.explanationVersion ?? DEFAULT_EXPLANATION_VERSION,
      } as never));
      row = await this.requireSessionRow(sessionId);
    }

    return this.toSessionRecord(row, {
      caseHandle,
      diagnosis: input.diagnosis,
      plannedSurgery: input.plannedSurgery,
      selectedEvidence: [],
      events: [],
      evaluations: [],
      reviews: [],
    });
  }

  async saveSelectedEvidence(input: SaveSelectedEvidenceInput): Promise<void> {
    const session = await this.requireSessionRow(input.sessionId);
    await this.must(this.supabase.from('selected_evidence').delete().eq('session_id', input.sessionId));
    for (const evidence of input.selectedEvidence.map(sanitizeEvidence)) {
      const evidenceSourceId = await this.upsertEvidenceSource(session.institution_id as string, evidence);
      await this.must(this.supabase.from('selected_evidence').insert({
        session_id: input.sessionId,
        evidence_source_id: evidenceSourceId,
      } as never));
    }
    await this.touchSession(input.sessionId);
  }

  async appendSessionEvent(input: AppendSessionEventInput): Promise<ConsentSessionEvent> {
    const id = randomUUID();
    const row = {
      id,
      session_id: input.sessionId,
      event_type: input.eventType,
      actor_type: input.actorType,
      payload: sanitizePayload(input.payload),
    };
    await this.must(this.supabase.from('session_events').insert(row as never));
    await this.touchSession(input.sessionId);
    return {
      id,
      sessionId: input.sessionId,
      eventType: input.eventType,
      actorType: input.actorType,
      payload: row.payload,
      createdAt: new Date().toISOString(),
    };
  }

  async appendAuditEvent(input: AppendAuditEventInput): Promise<AuditEventRecord> {
    const session = input.sessionId ? await this.requireSessionRow(input.sessionId) : null;
    const id = randomUUID();
    const institutionId = input.institutionId ?? (session?.institution_id as string | undefined) ?? DEMO_INSTITUTION_ID;
    const row = {
      id,
      institution_id: institutionId,
      session_id: input.sessionId,
      action: input.action,
      resource_type: input.resourceType,
      resource_id: input.resourceId,
      metadata: sanitizePayload(input.metadata ?? {}),
    };
    await this.must(this.supabase.from('audit_events').insert(row as never));
    return {
      id,
      institutionId,
      sessionId: input.sessionId,
      action: input.action,
      resourceType: input.resourceType,
      resourceId: input.resourceId,
      metadata: row.metadata,
      createdAt: new Date().toISOString(),
    };
  }

  async saveUnderstandingEvaluation(input: SaveUnderstandingEvaluationInput): Promise<void> {
    await this.must(this.supabase.from('understanding_evaluations').insert({
      id: randomUUID(),
      session_id: input.sessionId,
      checkpoint_id: input.evaluation.checkpointId,
      checkpoint_title: input.evaluation.checkpointTitle,
      level: input.evaluation.level,
      score: input.evaluation.score,
      missing_concepts: input.evaluation.missingConcepts,
      red_flags: input.evaluation.redFlags,
      recommended_next_action: input.evaluation.recommendedNextAction,
      sanitized_response: sanitizeClinicalFreeText(input.evaluation.evidence.sanitizedResponse),
    } as never));
    const status = input.evaluation.recommendedNextAction === 'continue' ? 'checking_understanding' : input.evaluation.recommendedNextAction === 'reexplain' ? 'needs_reexplanation' : 'ready_for_physician_review';
    await this.updateSessionStatus(input.sessionId, status);
    await this.appendSessionEvent({ sessionId: input.sessionId, eventType: 'understanding_evaluated', actorType: 'model', payload: input.evaluation as unknown as Record<string, unknown> });
  }

  async savePhysicianReview(input: SavePhysicianReviewInput): Promise<PhysicianReviewRecord> {
    const id = randomUUID();
    const row = {
      id,
      session_id: input.sessionId,
      reviewed_by: null,
      review_status: input.reviewStatus,
      physician_notes: input.physicianNotes ? sanitizeClinicalFreeText(input.physicianNotes) : null,
      not_signed_consent_notice: input.notSignedConsentNotice || NOT_SIGNED_CONSENT_NOTICE,
    };
    await this.must(this.supabase.from('physician_reviews').insert(row as never));
    await this.updateSessionStatus(input.sessionId, 'reviewed');
    await this.appendSessionEvent({ sessionId: input.sessionId, eventType: 'physician_reviewed', actorType: 'physician', payload: { reviewStatus: input.reviewStatus } });
    return {
      id,
      sessionId: input.sessionId,
      reviewStatus: input.reviewStatus,
      physicianNotes: row.physician_notes ?? undefined,
      notSignedConsentNotice: row.not_signed_consent_notice,
      createdAt: new Date().toISOString(),
    };
  }

  async getSessionSummary(sessionId: string): Promise<ConsentSessionSummary | null> {
    const session = await this.findSessionRow(sessionId);
    if (!session) return null;
    const consentCase = await this.findCaseRow(session.case_id as string);
    const selectedEvidence = await this.getSelectedEvidence(sessionId);
    const events = await this.getSessionEvents(sessionId);
    const evaluations = await this.getUnderstandingEvaluations(sessionId);
    const reviews = await this.getPhysicianReviews(sessionId);
    const auditEvents = await this.getAuditEvents(sessionId);
    return {
      ...this.toSessionRecord(session, {
        caseHandle: String(consentCase?.case_handle ?? DEMO_CASE_HANDLE),
        diagnosis: String(consentCase?.diagnosis ?? ''),
        plannedSurgery: String(consentCase?.planned_surgery ?? ''),
        selectedEvidence,
        events,
        evaluations,
        reviews,
      }),
      auditEvents,
    };
  }

  async getSelectedEvidence(sessionId: string): Promise<EvidenceCard[]> {
    const selected = await this.queryRows(this.supabase.from('selected_evidence').select('*').eq('session_id', sessionId));
    const evidence: EvidenceCard[] = [];
    for (const row of selected) {
      const source = await this.findEvidenceSourceRow(String(row.evidence_source_id));
      if (source) evidence.push(toEvidenceCard(source));
    }
    return evidence;
  }

  async getSourceDocumentCache(sourceUrl: string): Promise<SourceDocumentCacheRecord | null> {
    const doc = await this.queryOne(this.supabase.from('source_documents').select('*').eq('institution_id', DEMO_INSTITUTION_ID).eq('source_url', sourceUrl));
    if (!doc?.id) return null;
    const chunks = await this.queryRows(this.supabase.from('source_document_chunks').select('*').eq('source_document_id', doc.id).order('chunk_index', { ascending: true }));
    return {
      sourceUrl: String(doc.source_url),
      fileName: String(doc.file_name ?? ''),
      fileSize: Number(doc.file_size ?? 0),
      contentType: String(doc.content_type ?? 'application/octet-stream'),
      fullTextSha256: String(doc.full_text_sha256 ?? ''),
      updatedAt: doc.updated_at ? String(doc.updated_at) : undefined,
      chunks: chunks.map((chunk) => ({
        chunkId: String(chunk.id),
        chunkIndex: Number(chunk.chunk_index ?? 0),
        text: String(chunk.chunk_text ?? ''),
        page: chunk.page === null || chunk.page === undefined ? undefined : Number(chunk.page),
        sectionHeading: chunk.section_heading ? String(chunk.section_heading) : undefined,
      })).filter((chunk) => chunk.text.length > 0),
    };
  }

  async saveSourceDocumentCache(input: SaveSourceDocumentCacheInput): Promise<void> {
    await this.must(this.supabase.from('source_documents').upsert({
      institution_id: DEMO_INSTITUTION_ID,
      source_url: input.sourceUrl,
      file_name: sanitizeClinicalFreeText(input.fileName),
      file_size: input.fileSize,
      content_type: input.contentType,
      full_text_sha256: input.fullTextSha256,
      updated_at: new Date().toISOString(),
    } as never, { onConflict: 'institution_id,source_url' } as never));
    const doc = await this.queryOne(this.supabase.from('source_documents').select('*').eq('institution_id', DEMO_INSTITUTION_ID).eq('source_url', input.sourceUrl));
    if (!doc?.id) throw new Error(`Failed to upsert source document cache: ${input.sourceUrl}`);
    await this.must(this.supabase.from('source_document_chunks').delete().eq('source_document_id', doc.id));
    const rows = input.chunks.map((chunk) => ({
      source_document_id: doc.id,
      chunk_index: chunk.chunkIndex,
      page: chunk.page ?? null,
      section_heading: chunk.sectionHeading ? sanitizeClinicalFreeText(chunk.sectionHeading) : null,
      chunk_text: sanitizeClinicalFreeText(chunk.text),
    }));
    if (rows.length > 0) {
      await this.must(this.supabase.from('source_document_chunks').insert(rows as never));
    }
  }

  private async ensureConsentCase(input: { institutionId: string; caseHandle: string; diagnosis: string; plannedSurgery: string; urgency?: string }) {
    const existing = await this.queryOne(this.supabase.from('consent_cases').select('*').eq('institution_id', input.institutionId).eq('case_handle', input.caseHandle));
    if (existing?.id) return String(existing.id);
    const id = input.caseHandle === DEMO_CASE_HANDLE ? DEMO_CASE_ID : randomUUID();
    await this.must(this.supabase.from('consent_cases').insert({
      id,
      institution_id: input.institutionId,
      case_handle: input.caseHandle,
      diagnosis: sanitizeClinicalFreeText(input.diagnosis),
      planned_surgery: sanitizeClinicalFreeText(input.plannedSurgery),
      urgency: input.urgency,
      demo_only: true,
      phi_policy: 'anonymous-demo-only',
    } as never));
    return id;
  }

  private async upsertEvidenceSource(institutionId: string, evidence: EvidenceCard) {
    const pmid = evidence.evidenceId || evidence.pmid;
    const evidenceRow: SupabaseRow = {
      institution_id: institutionId,
      origin: toEvidenceOrigin(evidence.origin),
      title: sanitizeClinicalFreeText(evidence.title),
      source_url: evidence.sourceUrl,
      pmid,
      citation: evidence.citation,
      quoted_span: evidence.quotedSpan ? sanitizeClinicalFreeText(evidence.quotedSpan) : null,
      key_findings: evidence.keyFindings ?? [],
      display_for_family: sanitizeClinicalFreeText(evidence.displayForFamily),
      clinician_summary: evidence.clinicianSummary ? sanitizeClinicalFreeText(evidence.clinicianSummary) : null,
      outcome_tags: evidence.outcomeTags ?? [],
      approved_for_demo: true,
    };
    if (isUuid(evidence.evidenceId)) evidenceRow.id = evidence.evidenceId;
    await this.must(this.supabase.from('evidence_sources').upsert(evidenceRow as never, { onConflict: 'institution_id,pmid' } as never));
    const row = await this.queryOne(this.supabase.from('evidence_sources').select('*').eq('institution_id', institutionId).eq('pmid', pmid));
    if (!row?.id) throw new Error(`Failed to upsert evidence source: ${evidence.evidenceId}`);
    return String(row.id);
  }

  private async requireSessionRow(sessionId?: string, caseId?: string) {
    if (!sessionId && !caseId) throw new Error('Consent session id or case id is required');
    const row = sessionId ? await this.findSessionRow(sessionId) : await this.queryOne(this.supabase.from('consent_sessions').select('*').eq('case_id', caseId!));
    if (!row) throw new Error(`Consent session not found: ${sessionId ?? caseId}`);
    return row;
  }

  private async findSessionRow(sessionId: string) {
    return this.queryOne(this.supabase.from('consent_sessions').select('*').eq('id', sessionId));
  }

  private async findCaseRow(caseId: string) {
    return this.queryOne(this.supabase.from('consent_cases').select('*').eq('id', caseId));
  }

  private async findEvidenceSourceRow(evidenceSourceId: string) {
    return this.queryOne(this.supabase.from('evidence_sources').select('*').eq('id', evidenceSourceId));
  }

  private async getSessionEvents(sessionId: string): Promise<ConsentSessionEvent[]> {
    const rows = await this.queryRows(this.supabase.from('session_events').select('*').eq('session_id', sessionId).order('created_at', { ascending: true }));
    return rows.map((row) => ({
      id: String(row.id),
      sessionId,
      eventType: row.event_type as ConsentSessionEvent['eventType'],
      actorType: row.actor_type as ConsentSessionEvent['actorType'],
      payload: (row.payload ?? {}) as Record<string, unknown>,
      createdAt: String(row.created_at ?? ''),
    }));
  }

  private async getUnderstandingEvaluations(sessionId: string) {
    const rows = await this.queryRows(this.supabase.from('understanding_evaluations').select('*').eq('session_id', sessionId).order('created_at', { ascending: true }));
    return rows.map((row) => ({
      checkpointId: String(row.checkpoint_id),
      checkpointTitle: String(row.checkpoint_title),
      level: row.level,
      score: Number(row.score),
      missingConcepts: (row.missing_concepts ?? []) as string[],
      redFlags: (row.red_flags ?? []) as string[],
      recommendedNextAction: row.recommended_next_action,
      evidence: { sanitizedResponse: String(row.sanitized_response ?? '') },
    })) as never[];
  }

  private async getPhysicianReviews(sessionId: string): Promise<PhysicianReviewRecord[]> {
    const rows = await this.queryRows(this.supabase.from('physician_reviews').select('*').eq('session_id', sessionId).order('created_at', { ascending: true }));
    return rows.map((row) => ({
      id: String(row.id),
      sessionId,
      reviewStatus: row.review_status as PhysicianReviewRecord['reviewStatus'],
      physicianNotes: row.physician_notes ? String(row.physician_notes) : undefined,
      notSignedConsentNotice: String(row.not_signed_consent_notice),
      createdAt: String(row.created_at ?? ''),
    }));
  }

  private async getAuditEvents(sessionId: string): Promise<AuditEventRecord[]> {
    const rows = await this.queryRows(this.supabase.from('audit_events').select('*').eq('session_id', sessionId).order('created_at', { ascending: true }));
    return rows.map((row) => ({
      id: String(row.id),
      sessionId,
      institutionId: String(row.institution_id),
      action: String(row.action),
      resourceType: String(row.resource_type),
      resourceId: row.resource_id ? String(row.resource_id) : undefined,
      metadata: (row.metadata ?? {}) as Record<string, unknown>,
      createdAt: String(row.created_at ?? ''),
    }));
  }

  private async updateSessionStatus(sessionId: string, status: ConsentSessionRecord['status']) {
    await this.must(this.supabase.from('consent_sessions').update({ status, updated_at: new Date().toISOString() } as never).eq('id', sessionId));
  }

  private async touchSession(sessionId: string) {
    await this.must(this.supabase.from('consent_sessions').update({ updated_at: new Date().toISOString() } as never).eq('id', sessionId));
  }

  private toSessionRecord(row: SupabaseRow, context: { caseHandle: string; diagnosis: string; plannedSurgery: string; selectedEvidence: EvidenceCard[]; events: ConsentSessionEvent[]; evaluations: ConsentSessionRecord['evaluations']; reviews: PhysicianReviewRecord[] }): ConsentSessionRecord {
    return {
      id: String(row.id),
      caseId: String(row.case_id),
      institutionId: String(row.institution_id),
      caseHandle: context.caseHandle,
      diagnosis: sanitizeClinicalFreeText(context.diagnosis),
      plannedSurgery: sanitizeClinicalFreeText(context.plannedSurgery),
      status: row.status as ConsentSessionRecord['status'],
      modelMode: row.model_mode as ConsentSessionRecord['modelMode'],
      explanationVersion: String(row.explanation_version ?? DEFAULT_EXPLANATION_VERSION),
      selectedEvidence: context.selectedEvidence,
      events: context.events,
      evaluations: context.evaluations,
      reviews: context.reviews,
      createdAt: String(row.started_at ?? row.created_at ?? ''),
      updatedAt: String(row.updated_at ?? ''),
    };
  }

  private async queryOne(query: unknown): Promise<SupabaseRow | null> {
    const result = await (query as { maybeSingle?: () => Promise<{ data: SupabaseRow | null; error: unknown }>; single?: () => Promise<{ data: SupabaseRow | null; error: unknown }> }).maybeSingle?.() ?? await (query as { single: () => Promise<{ data: SupabaseRow | null; error: unknown }> }).single();
    if (result.error) throw new Error(JSON.stringify(result.error));
    return result.data;
  }

  private async queryRows(query: unknown): Promise<SupabaseRow[]> {
    const result = await query as { data: SupabaseRow[] | null; error: unknown };
    if (result.error) throw new Error(JSON.stringify(result.error));
    return result.data ?? [];
  }

  private async must(resultPromise: unknown) {
    const result = await resultPromise as { error?: unknown };
    if (result.error) throw new Error(JSON.stringify(result.error));
  }
}

function sanitizeEvidence(evidence: EvidenceCard): EvidenceCard {
  return {
    ...evidence,
    title: sanitizeClinicalFreeText(evidence.title),
    displayForFamily: sanitizeClinicalFreeText(evidence.displayForFamily),
    clinicianSummary: evidence.clinicianSummary ? sanitizeClinicalFreeText(evidence.clinicianSummary) : evidence.clinicianSummary,
    quotedSpan: evidence.quotedSpan ? sanitizeClinicalFreeText(evidence.quotedSpan) : evidence.quotedSpan,
    keyFindings: evidence.keyFindings?.map(sanitizeClinicalFreeText),
  };
}

function sanitizePayload(payload: Record<string, unknown>): Record<string, unknown> {
  return JSON.parse(JSON.stringify(payload), (_key, value) => typeof value === 'string' ? sanitizeClinicalFreeText(value) : value);
}

function toEvidenceOrigin(origin: EvidenceCard['origin']) {
  if (origin === 'facility-document') return 'facility';
  if (origin === 'physician-upload') return 'physician-upload';
  if (origin === 'curated-template') return 'guideline';
  return 'pubmed';
}

function toEvidenceCard(row: SupabaseRow): EvidenceCard {
  const origin = String(row.origin);
  const pmid = String(row.pmid ?? '');
  return {
    evidenceId: origin === 'facility' ? pmid : pmid.match(/^\d+$/) ? `PUBMED-${pmid}` : pmid,
    title: String(row.title ?? ''),
    sourceType: origin === 'facility' ? 'Facility' : 'Review',
    claim: String(row.clinician_summary ?? row.display_for_family ?? ''),
    displayForFamily: String(row.display_for_family ?? ''),
    confidence: 'moderate',
    citation: String(row.citation ?? ''),
    pmid,
    origin: origin === 'facility' ? 'facility-document' : origin === 'physician-upload' ? 'physician-upload' : origin === 'guideline' ? 'curated-template' : 'medevidence-rag',
    quotedSpan: row.quoted_span ? String(row.quoted_span) : undefined,
    sourceUrl: row.source_url ? String(row.source_url) : undefined,
    clinicianSummary: row.clinician_summary ? String(row.clinician_summary) : undefined,
    keyFindings: Array.isArray(row.key_findings) ? row.key_findings.map(String) : [],
    outcomeTags: Array.isArray(row.outcome_tags) ? row.outcome_tags.map(String) : [],
    retrievalStatus: origin === 'facility' ? 'facility-demo-document' : 'pubmed-verified',
  };
}

function isUuid(value?: string) {
  return Boolean(value?.match(/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i));
}
