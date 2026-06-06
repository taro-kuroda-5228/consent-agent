const required = [
  'NEXT_PUBLIC_SUPABASE_URL',
  'NEXT_PUBLIC_SUPABASE_ANON_KEY',
  'SUPABASE_SERVICE_ROLE_KEY',
];

const missing = required.filter((name) => !process.env[name]);
const demoMode = process.env.CONSENT_AGENT_DEMO_MODE !== 'false';

if (missing.length > 0) {
  console.log(`Consent Agent demo env: mock-safe mode. Missing Supabase variables: ${missing.join(', ')}`);
  console.log('Local judges can still run the anonymous in-memory demo; production Vercel must configure these variables.');
  process.exit(0);
}

if (!demoMode) {
  console.error('CONSENT_AGENT_DEMO_MODE=false: verify PHI policy, BAA/DPA, region, encryption, and audit settings before clinical use.');
  process.exit(1);
}

console.log('Consent Agent demo env: Supabase variables present, anonymous demo mode enabled.');
