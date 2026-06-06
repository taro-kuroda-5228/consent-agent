import { createBrowserClient } from '@supabase/ssr';
import { getSupabaseEnv, type SupabaseRuntimeMode } from '../env';
import type { Database } from './types';

export function createBrowserSupabaseClient() {
  const env = getSupabaseEnv();
  return createBrowserClient<Database>(env.url, env.anonKey);
}

function getPublicSupabaseClientMode(): SupabaseRuntimeMode {
  // Next.js only inlines direct NEXT_PUBLIC references into client bundles.
  // Do not use dynamic process.env access here, or the browser badge can falsely show local fallback.
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim();
  return url && anonKey ? 'configured' : 'mock';
}

export function getSupabaseClientStatus() {
  const mode = getPublicSupabaseClientMode();
  return {
    mode,
    persistedSession: mode === 'configured',
    rlsTenantIsolated: true,
    realtimePhysicianReview: mode === 'configured',
  };
}
