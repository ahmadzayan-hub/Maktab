-- Fence workers that survive the 15-minute reclaim window. Apply after 0004.
-- This migration defines database operations only; rollout must drain old
-- workers before enabling retries because old application versions bypass RPCs.
alter table public.private_files add column if not exists processing_attempt_id uuid;

create or replace function public.claim_file_ingestion(p_file_id uuid)
returns uuid
language plpgsql
security invoker
set search_path = public, extensions
as $$
declare
  v_attempt_id uuid;
begin
  -- UPDATE takes the same row lock as publication and rechecks its predicate
  -- after waiting. Database time avoids clock skew between request workers.
  update public.private_files
  set processing_status = 'processing',
      processing_error = null,
      processing_started_at = statement_timestamp(),
      processing_attempt_id = gen_random_uuid()
  where id = p_file_id
    and (
      processing_status in ('pending', 'failed')
      or (processing_status = 'processing'
          and processing_started_at < statement_timestamp() - interval '15 minutes')
    )
  returning processing_attempt_id into v_attempt_id;
  return v_attempt_id;
end;
$$;

create or replace function public.publish_file_ingestion(
  p_file_id uuid,
  p_attempt_id uuid,
  p_chunks jsonb,
  p_page_count integer
)
returns boolean
language plpgsql
security invoker
set search_path = public, extensions
as $$
declare
  v_file public.private_files%rowtype;
  v_chunk_count integer;
begin
  -- Hold ownership until the transaction commits. A preflight SELECT without
  -- this lock would let a reclaim slip between the check and chunk deletion.
  select * into v_file
  from public.private_files
  where id = p_file_id
    and processing_status = 'processing'
    and processing_attempt_id = p_attempt_id
  for update;
  if not found then
    return false;
  end if;

  if p_chunks is null or jsonb_typeof(p_chunks) <> 'array' then
    raise exception 'Ingestion chunks must be an array';
  end if;
  v_chunk_count := jsonb_array_length(p_chunks);
  if v_chunk_count = 0 then
    raise exception 'Cannot publish an empty ingestion';
  end if;

  delete from public.document_chunks where file_id = p_file_id;
  -- Derive tenant/file/course identity from the locked file, not JSON input.
  -- Any conversion, constraint or insert failure rolls back the deletion too.
  insert into public.document_chunks (
    file_id, user_id, course_id, chunk_index, text, token_count,
    page_num, slide_num, embedding
  )
  select p_file_id, v_file.user_id, v_file.course_id,
         (c->>'chunk_index')::integer, c->>'text',
         (c->>'token_count')::integer, (c->>'page_num')::integer,
         (c->>'slide_num')::integer, (c->'embedding')::text::vector(1536)
  from jsonb_array_elements(p_chunks) as c;

  update public.private_files
  set processing_status = 'ready',
      processing_error = null,
      chunk_count = v_chunk_count,
      page_count = p_page_count,
      processed_at = statement_timestamp()
  where id = p_file_id;
  return true;
end;
$$;

create or replace function public.fail_file_ingestion(
  p_file_id uuid, p_attempt_id uuid, p_message text
)
returns boolean
language plpgsql
security invoker
set search_path = public, extensions
as $$
begin
  update public.private_files
  set processing_status = 'failed',
      processing_error = left(p_message, 500),
      processed_at = statement_timestamp()
  where id = p_file_id
    and processing_status = 'processing'
    and processing_attempt_id = p_attempt_id;
  return found;
end;
$$;

-- Processing uses the server service client. Exposing these RPCs to ordinary
-- API users would allow them to claim/finalize ingestion outside the pipeline.
revoke all on function public.claim_file_ingestion(uuid) from public, anon, authenticated;
revoke all on function public.publish_file_ingestion(uuid, uuid, jsonb, integer) from public, anon, authenticated;
revoke all on function public.fail_file_ingestion(uuid, uuid, text) from public, anon, authenticated;
grant execute on function public.claim_file_ingestion(uuid) to service_role;
grant execute on function public.publish_file_ingestion(uuid, uuid, jsonb, integer) to service_role;
grant execute on function public.fail_file_ingestion(uuid, uuid, text) to service_role;
