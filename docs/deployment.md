# Deployment

## Hackathon Vercel + Supabase demo

1. Create a Supabase project named `consent-agent-hackathon-demo`.
2. Apply migrations in `supabase/migrations/` and seed `supabase/seed.sql`.
3. Configure Vercel environment variables:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `SUPABASE_SERVICE_ROLE_KEY` (server routes only)
   - `GEMINI_API_KEY` or Vertex/Gemini config
   - `CONSENT_AGENT_DEMO_MODE=true`
4. Run:

```bash
npm run check:demo-env
npm run lint
npm run test -- --run
npm run build
```

5. Smoke path: `/sessions` → select/evidence explanation → understanding check/Q&A → `/approvals` → export.

## Safety gate

The public demo stores anonymous sample data only. Real PHI, signed consent, patient names, MRNs, emails, phone numbers, DICOM, and clinical notes are blocked from Vercel/Supabase demo operation.
