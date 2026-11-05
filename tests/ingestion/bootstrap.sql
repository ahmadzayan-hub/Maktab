-- Isolated integration fixture: only the ingestion dependencies from 0003.
-- Production migrations 0004 and 0005 are applied unchanged by run-postgres.sh.
create role anon;
create role authenticated;
create role service_role bypassrls;
create extension vector;
create table public.users (id uuid primary key);
create table public.courses (id uuid primary key);
create table public.private_files (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id),
  course_id uuid references public.courses(id),
  status text not null default 'uploaded'
    check (status in ('uploaded','processing','ready','failed','archived')),
  processing_error text,
  page_count integer
);
create table public.document_chunks (
  id uuid primary key default gen_random_uuid(),
  file_id uuid not null references public.private_files(id) on delete cascade,
  user_id uuid not null references public.users(id),
  course_id uuid references public.courses(id),
  chunk_index integer not null,
  text text not null,
  token_count integer,
  page_num integer,
  slide_num integer,
  created_at timestamptz not null default now()
);
grant usage on schema public to anon, authenticated, service_role;
grant all on all tables in schema public to service_role;
insert into public.users values ('00000000-0000-0000-0000-000000000001');
insert into public.courses values ('00000000-0000-0000-0000-000000000002');
create function public.test_assert(ok boolean, message text) returns void
language plpgsql as $$ begin
  if ok is distinct from true then raise exception 'Assertion failed: %', message; end if;
end $$;
