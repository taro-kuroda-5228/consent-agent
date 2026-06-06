export type SupabaseRuntimeMode = 'configured' | 'mock';

export type SupabaseEnv = {
  mode: SupabaseRuntimeMode;
  url: string;
  anonKey: string;
  serviceRoleKey?: string;
  hasServiceRole: boolean;
};

type EnvLike = Record<string, string | undefined>;

const MOCK_SUPABASE_URL = 'http://supabase.local/mock';
const MOCK_SUPABASE_ANON_KEY = 'mock-anon-key-for-anonymous-demo-only';

export function isConsentAgentDemoMode(source: EnvLike = process.env): boolean {
  const value = source.CONSENT_AGENT_DEMO_MODE?.trim().toLowerCase();
  return value === 'true' || value === '1' || value === 'yes';
}

export function getSupabaseEnv(source: EnvLike = process.env): SupabaseEnv {
  const url = source.NEXT_PUBLIC_SUPABASE_URL?.trim();
  const anonKey = source.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim();
  const serviceRoleKey = source.SUPABASE_SERVICE_ROLE_KEY?.trim();
  const isProduction = source.NODE_ENV === 'production';
  const explicitDemoMode = isConsentAgentDemoMode(source);

  if (!url || !anonKey) {
    if (isProduction && !explicitDemoMode) {
      const missing = [
        !url ? 'NEXT_PUBLIC_SUPABASE_URL' : '',
        !anonKey ? 'NEXT_PUBLIC_SUPABASE_ANON_KEY' : '',
      ].filter(Boolean).join(', ');
      throw new Error(`Missing Supabase environment variables for production: ${missing}`);
    }
    return {
      mode: 'mock',
      url: MOCK_SUPABASE_URL,
      anonKey: MOCK_SUPABASE_ANON_KEY,
      hasServiceRole: false,
    };
  }

  return {
    mode: 'configured',
    url,
    anonKey,
    serviceRoleKey,
    hasServiceRole: Boolean(serviceRoleKey),
  };
}
