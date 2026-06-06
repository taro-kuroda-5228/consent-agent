import { describe, expect, it } from 'vitest';
import { getSupabaseEnv, isConsentAgentDemoMode } from '../env';

describe('Supabase environment boundary', () => {
  it('uses explicit mock mode in tests when keys are absent', () => {
    const env = getSupabaseEnv({ NODE_ENV: 'test' });
    expect(env.mode).toBe('mock');
    expect(env.url).toContain('supabase.local');
    expect(env.hasServiceRole).toBe(false);
  });

  it('throws a clear error in production when public keys are absent', () => {
    expect(() => getSupabaseEnv({ NODE_ENV: 'production' })).toThrow(/NEXT_PUBLIC_SUPABASE_URL/);
  });

  it('allows production mock fallback when anonymous demo mode is explicit', () => {
    const env = getSupabaseEnv({ NODE_ENV: 'production', CONSENT_AGENT_DEMO_MODE: 'true' });
    expect(env.mode).toBe('mock');
    expect(env.url).toContain('supabase.local');
    expect(env.hasServiceRole).toBe(false);
  });

  it('recognizes only explicit true-like demo mode values', () => {
    expect(isConsentAgentDemoMode({ CONSENT_AGENT_DEMO_MODE: 'true' })).toBe(true);
    expect(isConsentAgentDemoMode({ CONSENT_AGENT_DEMO_MODE: '1' })).toBe(true);
    expect(isConsentAgentDemoMode({ CONSENT_AGENT_DEMO_MODE: 'false' })).toBe(false);
    expect(isConsentAgentDemoMode({})).toBe(false);
  });

  it('accepts configured browser anon and server service role keys', () => {
    const env = getSupabaseEnv({
      NODE_ENV: 'production',
      NEXT_PUBLIC_SUPABASE_URL: 'https://demo.supabase.co',
      NEXT_PUBLIC_SUPABASE_ANON_KEY: 'anon-key',
      SUPABASE_SERVICE_ROLE_KEY: 'service-key',
    });
    expect(env.mode).toBe('configured');
    expect(env.url).toBe('https://demo.supabase.co');
    expect(env.anonKey).toBe('anon-key');
    expect(env.serviceRoleKey).toBe('service-key');
    expect(env.hasServiceRole).toBe(true);
  });
});
