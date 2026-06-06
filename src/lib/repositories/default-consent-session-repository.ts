import { getSupabaseEnv } from '../env';
import { createServiceRoleSupabaseClient } from '../supabase/server';
import type { ConsentSessionRepository } from './consent-session-repository';
import { inMemoryConsentSessionRepository } from './in-memory-consent-session-repository';
import { SupabaseConsentSessionRepository } from './supabase-consent-session-repository';

export function createDefaultConsentSessionRepository(): ConsentSessionRepository {
  const env = getSupabaseEnv();
  if (env.mode === 'configured' && env.hasServiceRole) {
    return new SupabaseConsentSessionRepository(createServiceRoleSupabaseClient());
  }
  return inMemoryConsentSessionRepository;
}
