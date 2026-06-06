import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const root = process.cwd();
const migration = (name: string) => readFileSync(join(root, 'supabase/migrations', name), 'utf8');

describe('Supabase consent-agent schema and RLS', () => {
  it('creates workflow tables required for sessions, selected evidence, reviews and audit', () => {
    const sql = migration('202606060001_init_consent_agent.sql');
    for (const table of [
      'institutions',
      'profiles',
      'consent_cases',
      'evidence_sources',
      'consent_sessions',
      'selected_evidence',
      'session_events',
      'understanding_evaluations',
      'physician_reviews',
      'audit_events',
    ]) {
      expect(sql).toContain(`create table public.${table}`);
    }
    expect(sql).toContain('phi_policy text not null default');
    expect(sql).toContain('not_signed_consent_notice text not null');
  });

  it('enables RLS and keeps audit events insert-only for normal members', () => {
    const sql = migration('202606060002_rls_policies.sql');
    expect(sql).toContain('create or replace function public.current_institution_id()');
    for (const table of ['consent_sessions', 'evidence_sources', 'session_events', 'understanding_evaluations', 'physician_reviews', 'audit_events']) {
      expect(sql).toContain(`alter table public.${table} enable row level security`);
    }
    expect(sql).toContain('members can insert audit events in institution');
    expect(sql).not.toMatch(/audit_events[\s\S]{0,120}for update/i);
    expect(sql).not.toMatch(/audit_events[\s\S]{0,120}for delete/i);
  });
});
