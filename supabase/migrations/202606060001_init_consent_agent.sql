create extension if not exists pgcrypto;

create table public.institutions (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  demo_mode boolean not null default true,
  created_at timestamptz not null default now()
);

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  institution_id uuid not null references public.institutions(id),
  role text not null check (role in ('admin','physician','nurse','auditor')),
  display_name text not null,
  created_at timestamptz not null default now()
);

create table public.consent_cases (
  id uuid primary key default gen_random_uuid(),
  institution_id uuid not null references public.institutions(id),
  case_handle text not null,
  diagnosis text not null,
  planned_surgery text not null,
  urgency text,
  demo_only boolean not null default true,
  phi_policy text not null default 'anonymous-demo-only',
  created_by uuid references public.profiles(id),
  created_at timestamptz not null default now(),
  unique (institution_id, case_handle)
);

create table public.evidence_sources (
  id uuid primary key default gen_random_uuid(),
  institution_id uuid not null references public.institutions(id),
  origin text not null check (origin in ('pubmed','facility','physician-upload','guideline')),
  title text not null,
  source_url text,
  pmid text,
  citation text,
  quoted_span text,
  key_findings jsonb not null default '[]'::jsonb,
  display_for_family text not null,
  clinician_summary text,
  outcome_tags text[] not null default '{}',
  uploaded_by uuid references public.profiles(id),
  approved_for_demo boolean not null default false,
  created_at timestamptz not null default now(),
  unique (institution_id, pmid)
);

create table public.consent_sessions (
  id uuid primary key default gen_random_uuid(),
  case_id uuid not null references public.consent_cases(id),
  institution_id uuid not null references public.institutions(id),
  status text not null check (status in ('draft','explaining','checking_understanding','needs_reexplanation','ready_for_physician_review','reviewed','archived')),
  model_mode text not null check (model_mode in ('mock','gemini','vertex-gemini')),
  explanation_version text not null,
  started_by uuid references public.profiles(id),
  started_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.selected_evidence (
  session_id uuid not null references public.consent_sessions(id) on delete cascade,
  evidence_source_id uuid not null references public.evidence_sources(id),
  selected_by uuid references public.profiles(id),
  selected_at timestamptz not null default now(),
  primary key (session_id, evidence_source_id)
);

create table public.session_events (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references public.consent_sessions(id) on delete cascade,
  event_type text not null check (event_type in ('explanation_generated','family_response','qa_answered','understanding_evaluated','intent_recorded','physician_reviewed','export_created','safety_escalation')),
  actor_type text not null check (actor_type in ('system','physician','family','model')),
  payload jsonb not null,
  created_at timestamptz not null default now()
);

create table public.understanding_evaluations (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references public.consent_sessions(id) on delete cascade,
  checkpoint_id text not null,
  checkpoint_title text not null,
  level text not null check (level in ('clear','partial','unsafe')),
  score numeric not null check (score >= 0 and score <= 1),
  missing_concepts text[] not null default '{}',
  red_flags text[] not null default '{}',
  recommended_next_action text not null check (recommended_next_action in ('continue','reexplain','escalate_to_physician')),
  sanitized_response text not null,
  created_at timestamptz not null default now()
);

create table public.physician_reviews (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references public.consent_sessions(id) on delete cascade,
  reviewed_by uuid not null references public.profiles(id),
  review_status text not null check (review_status in ('needs_followup','ready_for_consent_discussion','closed')),
  physician_notes text,
  not_signed_consent_notice text not null,
  created_at timestamptz not null default now()
);

create table public.audit_events (
  id uuid primary key default gen_random_uuid(),
  institution_id uuid not null references public.institutions(id),
  session_id uuid references public.consent_sessions(id),
  actor_id uuid references public.profiles(id),
  action text not null,
  resource_type text not null,
  resource_id uuid,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index consent_sessions_institution_status_idx on public.consent_sessions(institution_id, status, updated_at desc);
create index session_events_session_created_idx on public.session_events(session_id, created_at desc);
create index audit_events_institution_created_idx on public.audit_events(institution_id, created_at desc);
