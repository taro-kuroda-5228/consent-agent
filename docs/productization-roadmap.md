# Productization roadmap

## Runtime separation

- Demo runtime: Vercel + Supabase, anonymous demo data only.
- PoC runtime: institution-approved GCP region, Cloud Run, Supabase/Postgres with contractual safeguards, audit retention, and IdP integration.
- Hospital runtime: GCP Cloud Run + Cloud SQL/AlloyDB or self-hosted Supabase/PostgreSQL/on-prem, depending on hospital policy.

## Authentication

- Hackathon: demo auth or magic-link only for anonymous sample data.
- PoC: Google Workspace SSO, SAML, or hospital IdP.
- Production: role-bound access (admin/physician/nurse/auditor), RLS tenant isolation, service-role server-only operations.

## Evidence and review workflow

Physicians approve evidence before patient/family use. Realtime queues make understanding gaps visible to clinicians. Export remains a support record, not signed consent.
