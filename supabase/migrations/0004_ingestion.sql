-- Durable, format-aware ingestion (2026-11-03).
--
-- Additive and idempotent: every statement tolerates the column or object
-- already existing, so it is safe on a project created from 0003 as well as
-- on one whose private_files/document_chunks were shaped by the application.
-- Apply and verify against the live project before relying on it.

create extension if not exists vector;

-- Processing state the application reads and writes.
alter table public.private_files add column if not exists processing_status text not null default 'pending';
alter table public.private_files drop constraint if exists private_files_processing_status_check;
alter table public.private_files add constraint private_files_processing_status_check
  check (processing_status in ('pending','processing','ready','failed'));
alter table public.private_files add column if not exists processing_error text;
alter table public.private_files add column if not exists processing_started_at timestamptz;
alter table public.private_files add column if not exists processed_at timestamptz;
alter table public.private_files add column if not exists chunk_count integer;
alter table public.private_files add column if not exists page_count integer;

create index if not exists private_files_processing_idx
  on public.private_files (processing_status, processing_started_at);

-- Chunk rows carry their source position and the embedding used for retrieval.
alter table public.document_chunks add column if not exists text text;
alter table public.document_chunks add column if not exists token_count integer;
alter table public.document_chunks add column if not exists page_num integer;
alter table public.document_chunks add column if not exists slide_num integer;
alter table public.document_chunks add column if not exists course_id uuid references public.courses(id) on delete set null;
alter table public.document_chunks add column if not exists embedding vector(1536);

create unique index if not exists document_chunks_file_index_uniq
  on public.document_chunks (file_id, chunk_index);

-- Retrieval used by src/lib/rag/retriever.ts: the caller's own chunks only.
create or replace function public.match_chunks(
  query_embedding vector(1536),
  match_user_id uuid,
  match_course_id uuid default null,
  match_count integer default 8,
  match_threshold double precision default 0.65
)
returns table (
  chunk_id uuid,
  file_id uuid,
  text text,
  page_num integer,
  similarity double precision
)
language sql
stable
as $$
  select
    c.id as chunk_id,
    c.file_id,
    c.text,
    c.page_num,
    1 - (c.embedding <=> query_embedding) as similarity
  from public.document_chunks c
  where c.user_id = match_user_id
    and c.embedding is not null
    and (match_course_id is null or c.course_id = match_course_id)
    and 1 - (c.embedding <=> query_embedding) >= match_threshold
  order by c.embedding <=> query_embedding
  limit greatest(match_count, 1);
$$;
