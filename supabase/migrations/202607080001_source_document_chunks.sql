create table if not exists public.source_documents (
  id uuid primary key default gen_random_uuid(),
  institution_id uuid not null references public.institutions(id),
  source_url text not null,
  file_name text not null,
  file_size integer not null default 0,
  content_type text not null default 'application/octet-stream',
  full_text_sha256 text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (institution_id, source_url)
);

create table if not exists public.source_document_chunks (
  id uuid primary key default gen_random_uuid(),
  source_document_id uuid not null references public.source_documents(id) on delete cascade,
  chunk_index integer not null,
  page integer,
  section_heading text,
  chunk_text text not null,
  created_at timestamptz not null default now(),
  unique (source_document_id, chunk_index)
);

create index if not exists source_documents_institution_url_idx on public.source_documents(institution_id, source_url);
create index if not exists source_document_chunks_source_idx on public.source_document_chunks(source_document_id, chunk_index);

alter table public.source_documents enable row level security;
alter table public.source_document_chunks enable row level security;

create policy "members can read source documents in institution" on public.source_documents for select
  using (exists (select 1 from public.profiles p where p.id = auth.uid() and p.institution_id = source_documents.institution_id));

create policy "physicians can cache source documents in institution" on public.source_documents for insert
  with check (exists (select 1 from public.profiles p where p.id = auth.uid() and p.institution_id = source_documents.institution_id and p.role in ('admin','physician')));

create policy "physicians can update source documents in institution" on public.source_documents for update
  using (exists (select 1 from public.profiles p where p.id = auth.uid() and p.institution_id = source_documents.institution_id and p.role in ('admin','physician')))
  with check (exists (select 1 from public.profiles p where p.id = auth.uid() and p.institution_id = source_documents.institution_id and p.role in ('admin','physician')));

create policy "members can read source document chunks in institution" on public.source_document_chunks for select
  using (exists (select 1 from public.source_documents d join public.profiles p on p.institution_id = d.institution_id where d.id = source_document_chunks.source_document_id and p.id = auth.uid()));

create policy "physicians can cache source document chunks in institution" on public.source_document_chunks for insert
  with check (exists (select 1 from public.source_documents d join public.profiles p on p.institution_id = d.institution_id where d.id = source_document_chunks.source_document_id and p.id = auth.uid() and p.role in ('admin','physician')));

create policy "physicians can update source document chunks in institution" on public.source_document_chunks for update
  using (exists (select 1 from public.source_documents d join public.profiles p on p.institution_id = d.institution_id where d.id = source_document_chunks.source_document_id and p.id = auth.uid() and p.role in ('admin','physician')))
  with check (exists (select 1 from public.source_documents d join public.profiles p on p.institution_id = d.institution_id where d.id = source_document_chunks.source_document_id and p.id = auth.uid() and p.role in ('admin','physician')));

create policy "physicians can refresh source document chunks in institution" on public.source_document_chunks for delete
  using (exists (select 1 from public.source_documents d join public.profiles p on p.institution_id = d.institution_id where d.id = source_document_chunks.source_document_id and p.id = auth.uid() and p.role in ('admin','physician')));
