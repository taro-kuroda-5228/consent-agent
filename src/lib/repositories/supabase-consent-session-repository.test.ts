import { describe, expect, it } from 'vitest';
import { retrieveMockEvidence } from '../consent-demo';
import { NOT_SIGNED_CONSENT_NOTICE } from './consent-session-repository';
import { SupabaseConsentSessionRepository } from './supabase-consent-session-repository';

type Row = Record<string, unknown>;

class FakeSupabaseClient {
  tables: Record<string, Row[]> = {
    consent_cases: [{ id: '00000000-0000-0000-0000-000000000101', institution_id: '00000000-0000-0000-0000-000000000001', case_handle: 'demo-aortic-dissection', diagnosis: '急性A型大動脈解離', planned_surgery: '上行大動脈人工血管置換術' }],
    consent_sessions: [],
    evidence_sources: [],
    selected_evidence: [],
    session_events: [],
    understanding_evaluations: [],
    physician_reviews: [],
    audit_events: [],
  };

  from(table: string) {
    return new FakeQuery(this, table);
  }
}

class FakeQuery {
  private filters: Array<[string, unknown]> = [];
  private selected = '*';
  private orderBy?: { column: string; ascending: boolean };

  constructor(private readonly client: FakeSupabaseClient, private readonly table: string) {}

  select(columns = '*') { this.selected = columns; return this; }
  eq(column: string, value: unknown) { this.filters.push([column, value]); return this; }
  order(column: string, options?: { ascending?: boolean }) { this.orderBy = { column, ascending: options?.ascending ?? true }; return this; }

  async maybeSingle() {
    const rows = this.applyFilters();
    return { data: rows[0] ?? null, error: null };
  }

  async single() {
    const rows = this.applyFilters();
    return { data: rows[0] ?? null, error: rows[0] ? null : { message: `No rows in ${this.table}` } };
  }

  async insert(input: Row | Row[]) {
    const rows = Array.isArray(input) ? input : [input];
    const inserted = rows.map((row) => this.withDefaults(row));
    this.client.tables[this.table].push(...inserted);
    return { data: this.selected === '*' ? inserted : inserted, error: null };
  }

  async upsert(input: Row | Row[], options?: unknown) {
    void options;
    const rows = Array.isArray(input) ? input : [input];
    const out: Row[] = [];
    for (const row of rows) {
      const conflict = this.findConflict(row);
      const next = this.withDefaults(row);
      if (conflict) Object.assign(conflict, next);
      else this.client.tables[this.table].push(next);
      out.push(conflict ?? next);
    }
    return { data: out, error: null };
  }

  update(input: Row) {
    return {
      eq: (column: string, value: unknown) => {
        this.filters.push([column, value]);
        const rows = this.applyFilters();
        rows.forEach((row) => Object.assign(row, input));
        return Promise.resolve({ data: rows, error: null });
      },
    };
  }

  delete() {
    return {
      eq: (column: string, value: unknown) => {
        this.filters.push([column, value]);
        const remaining = this.client.tables[this.table].filter((row) => !this.matches(row));
        this.client.tables[this.table] = remaining;
        return Promise.resolve({ data: [], error: null });
      },
    };
  }

  then(resolve: (value: { data: Row[]; error: null }) => void) {
    resolve({ data: this.applyFilters(), error: null });
  }

  private applyFilters() {
    let rows = this.client.tables[this.table].filter((row) => this.matches(row));
    if (this.orderBy) rows = [...rows].sort((a, b) => String(a[this.orderBy!.column]).localeCompare(String(b[this.orderBy!.column])) * (this.orderBy!.ascending ? 1 : -1));
    return rows;
  }

  private matches(row: Row) {
    return this.filters.every(([column, value]) => row[column] === value);
  }

  private withDefaults(row: Row) {
    const now = '2026-06-06T00:00:00.000Z';
    return {
      id: row.id ?? `00000000-0000-0000-0000-${String(this.client.tables[this.table].length + 1).padStart(12, '0')}`,
      created_at: row.created_at ?? now,
      started_at: row.started_at ?? now,
      updated_at: row.updated_at ?? now,
      selected_at: row.selected_at ?? now,
      ...row,
    };
  }

  private findConflict(row: Row) {
    if (this.table === 'evidence_sources') return this.client.tables[this.table].find((item) => item.institution_id === row.institution_id && item.pmid === row.pmid);
    if (this.table === 'consent_cases') return this.client.tables[this.table].find((item) => item.institution_id === row.institution_id && item.case_handle === row.case_handle);
    return row.id ? this.client.tables[this.table].find((item) => item.id === row.id) : undefined;
  }
}

describe('SupabaseConsentSessionRepository', () => {
  it('persists selected evidence, events, reviews, and audits to Supabase tables', async () => {
    const client = new FakeSupabaseClient();
    const repo = new SupabaseConsentSessionRepository(client as never);
    const session = await repo.createSession({ diagnosis: '急性A型大動脈解離', plannedSurgery: '上行大動脈人工血管置換術', modelMode: 'mock' });
    const selectedEvidence = retrieveMockEvidence('急性A型大動脈解離').slice(0, 2);

    await repo.saveSelectedEvidence({ sessionId: session.id, selectedEvidence });
    const event = await repo.appendSessionEvent({ sessionId: session.id, eventType: 'explanation_generated', actorType: 'model', payload: { selectedEvidenceIds: selectedEvidence.map((item) => item.evidenceId) } });
    const audit = await repo.appendAuditEvent({ sessionId: session.id, action: 'explanation_generated', resourceType: 'consent_session', metadata: { familyComment: 'MRN-1234567 の父が心配です' } });
    const review = await repo.savePhysicianReview({ sessionId: session.id, reviewStatus: 'needs_followup', physicianNotes: '患者ID 1234567 を伏せる', notSignedConsentNotice: NOT_SIGNED_CONSENT_NOTICE });

    expect(client.tables.consent_sessions).toHaveLength(1);
    expect(client.tables.evidence_sources).toHaveLength(2);
    expect(client.tables.selected_evidence).toHaveLength(2);
    expect(client.tables.session_events).toContainEqual(expect.objectContaining({ id: event.id, session_id: session.id }));
    expect(client.tables.audit_events).toContainEqual(expect.objectContaining({ id: audit.id, session_id: session.id }));
    expect(JSON.stringify(client.tables.audit_events)).not.toContain('MRN-1234567');
    expect(JSON.stringify(client.tables.audit_events)).not.toContain('1234567');
    expect(client.tables.physician_reviews).toContainEqual(expect.objectContaining({ id: review.id, session_id: session.id }));

    const summary = await repo.getSessionSummary(session.id);
    expect(summary?.selectedEvidence.map((item) => item.evidenceId)).toEqual(selectedEvidence.map((item) => item.evidenceId));
    expect(summary?.events).toHaveLength(2);
    expect(summary?.reviews).toHaveLength(1);
    expect(summary?.auditEvents).toHaveLength(1);
    const second = await repo.createSession({ diagnosis: '急性A型大動脈解離', plannedSurgery: '上行大動脈人工血管置換術', modelMode: 'mock' });
    expect(second.id).not.toBe(session.id);
    expect(client.tables.consent_sessions).toHaveLength(2);
  });
});
