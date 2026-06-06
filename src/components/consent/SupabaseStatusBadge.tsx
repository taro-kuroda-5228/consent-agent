import { getSupabaseClientStatus } from '../../lib/supabase/client';

export function SupabaseStatusBadge() {
  const status = getSupabaseClientStatus();
  const persistenceLabel = status.persistedSession ? 'Persistence: Supabase configured' : 'Persistence: local demo memory';
  return (
    <div className="flex flex-wrap gap-2" aria-label="Supabase workflow status">
      <span className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-bold text-emerald-700">{persistenceLabel}</span>
      <span className="rounded-full bg-slate-50 px-3 py-1 text-xs font-bold text-slate-700">Model: deterministic mock</span>
      <span className="rounded-full bg-blue-50 px-3 py-1 text-xs font-bold text-blue-700">RLS tenant isolated</span>
      <span className="rounded-full bg-purple-50 px-3 py-1 text-xs font-bold text-purple-700">Realtime physician review</span>
    </div>
  );
}
