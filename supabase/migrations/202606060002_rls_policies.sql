create or replace function public.current_institution_id()
returns uuid
language sql
stable
security definer
set search_path = public
as $$
  select institution_id from public.profiles where id = auth.uid()
$$;

create or replace function public.current_profile_role()
returns text
language sql
stable
security definer
set search_path = public
as $$
  select role from public.profiles where id = auth.uid()
$$;

alter table public.institutions enable row level security;
alter table public.profiles enable row level security;
alter table public.consent_cases enable row level security;
alter table public.evidence_sources enable row level security;
alter table public.consent_sessions enable row level security;
alter table public.selected_evidence enable row level security;
alter table public.session_events enable row level security;
alter table public.understanding_evaluations enable row level security;
alter table public.physician_reviews enable row level security;
alter table public.audit_events enable row level security;

create policy "members can read own institution" on public.institutions for select
using (id = public.current_institution_id());

create policy "members can read profiles in institution" on public.profiles for select
using (institution_id = public.current_institution_id());

create policy "members can read cases in institution" on public.consent_cases for select
using (institution_id = public.current_institution_id());
create policy "physicians can create anonymous demo cases" on public.consent_cases for insert
with check (institution_id = public.current_institution_id() and demo_only = true and public.current_profile_role() in ('admin','physician','nurse'));

create policy "members can read evidence in institution" on public.evidence_sources for select
using (institution_id = public.current_institution_id());
create policy "physicians can insert evidence in institution" on public.evidence_sources for insert
with check (institution_id = public.current_institution_id() and public.current_profile_role() in ('admin','physician','nurse'));

create policy "members can read sessions in institution" on public.consent_sessions for select
using (institution_id = public.current_institution_id());
create policy "physicians can create sessions in institution" on public.consent_sessions for insert
with check (institution_id = public.current_institution_id() and public.current_profile_role() in ('admin','physician','nurse'));
create policy "physicians can update sessions in institution" on public.consent_sessions for update
using (institution_id = public.current_institution_id() and public.current_profile_role() in ('admin','physician','nurse'));

create policy "members can read selected evidence for own institution sessions" on public.selected_evidence for select
using (exists (select 1 from public.consent_sessions s where s.id = session_id and s.institution_id = public.current_institution_id()));
create policy "physicians can select evidence for own institution sessions" on public.selected_evidence for insert
with check (exists (select 1 from public.consent_sessions s where s.id = session_id and s.institution_id = public.current_institution_id()) and public.current_profile_role() in ('admin','physician','nurse'));

create policy "members can read session events for own institution" on public.session_events for select
using (exists (select 1 from public.consent_sessions s where s.id = session_id and s.institution_id = public.current_institution_id()));
create policy "members can insert session events for own institution" on public.session_events for insert
with check (exists (select 1 from public.consent_sessions s where s.id = session_id and s.institution_id = public.current_institution_id()));

create policy "members can read understanding evaluations for own institution" on public.understanding_evaluations for select
using (exists (select 1 from public.consent_sessions s where s.id = session_id and s.institution_id = public.current_institution_id()));
create policy "members can insert understanding evaluations for own institution" on public.understanding_evaluations for insert
with check (exists (select 1 from public.consent_sessions s where s.id = session_id and s.institution_id = public.current_institution_id()));

create policy "members can read physician reviews for own institution" on public.physician_reviews for select
using (exists (select 1 from public.consent_sessions s where s.id = session_id and s.institution_id = public.current_institution_id()));
create policy "physicians can insert physician reviews for own institution" on public.physician_reviews for insert
with check (exists (select 1 from public.consent_sessions s where s.id = session_id and s.institution_id = public.current_institution_id()) and public.current_profile_role() in ('admin','physician'));

create policy "members can read audit events in institution" on public.audit_events for select
using (institution_id = public.current_institution_id());
create policy "members can insert audit events in institution" on public.audit_events for insert
with check (institution_id = public.current_institution_id());
