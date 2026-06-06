import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const read = (path: string) => readFileSync(join(process.cwd(), path), 'utf8');
const omni = read('src/components/consent/OmniConsentSessionDemo.tsx');
const timeline = read('src/components/consent/AuditTimeline.tsx');
const badge = read('src/components/consent/SupabaseStatusBadge.tsx');

describe('Supabase consent workflow UI copy', () => {
  it('shows persistence, RLS, realtime, and audit timeline markers in sessions UI', () => {
    const combined = `${omni}\n${timeline}\n${badge}`;
    for (const copy of ['Persistence: Supabase configured', 'Model: deterministic mock', 'RLS tenant isolated', 'Realtime physician review', 'Realtime audit stream']) {
      expect(combined).toContain(copy);
    }
    for (const event of ['explanation_generated', 'family_response', 'understanding_evaluated', 'qa_answered', 'physician_reviewed', 'export_created']) {
      expect(combined).toContain(event);
    }
  });

  it('does not conflate deterministic model mock mode with database persistence fallback', () => {
    expect(badge).not.toContain('Persisted session: {status.persistedSession ? \'configured\' : \'mock fallback\'}');
    expect(badge).toContain('Persistence: Supabase configured');
    expect(badge).toContain('Model: deterministic mock');
  });

  it('uses direct NEXT_PUBLIC env references for client-side persistence detection', () => {
    const client = read('src/lib/supabase/client.ts');
    expect(client).toContain('process.env.NEXT_PUBLIC_SUPABASE_URL');
    expect(client).toContain('process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY');
  });

  it('repeats the clinical safety boundary in visible copy', () => {
    expect(timeline).toContain('署名済み同意ではない');
    expect(timeline).toContain('医師レビュー必須');
    expect(timeline).toContain('選択済み根拠のみ');
  });
});
