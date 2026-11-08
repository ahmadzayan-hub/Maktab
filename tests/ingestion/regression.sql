\set ON_ERROR_STOP on
-- Every assertion uses the real functions installed from the production migration.
do $$
declare
  f uuid := '10000000-0000-0000-0000-000000000001';
  u uuid := '00000000-0000-0000-0000-000000000001';
  a uuid;
  b uuid;
  chunks jsonb := jsonb_build_array(jsonb_build_object('chunk_index',0,'text','new winner','token_count',2,'page_num',1,'embedding',array_fill(0.01::real,array[1536]),'user_id','ffffffff-ffff-ffff-ffff-ffffffffffff'));
  before_chunks jsonb;
  rejected boolean;
begin
  insert into public.private_files(id,user_id,course_id) values
    (f,u,'00000000-0000-0000-0000-000000000002');
  a := public.claim_file_ingestion(f);
  perform public.test_assert(a is not null, 'pending file can be claimed');
  perform public.test_assert(public.claim_file_ingestion(f) is null, 'fresh duplicate cannot claim');
  perform public.test_assert(public.claim_file_ingestion(gen_random_uuid()) is null, 'missing file cannot claim');
  update public.private_files set processing_started_at=statement_timestamp()-interval '15 minutes' where id=f;
  perform public.test_assert(public.claim_file_ingestion(f) is null, 'exact 15-minute boundary is not stale');
  update public.private_files set processing_started_at=statement_timestamp()-interval '15 minutes 1 second' where id=f;
  b := public.claim_file_ingestion(f);
  perform public.test_assert(b is not null and b<>a, 'stale reclaim issues a distinct token');
  perform public.test_assert(not public.fail_file_ingestion(f,a,'old failure'), 'old failure before new publish rejected');
  perform public.test_assert(not public.publish_file_ingestion(f,a,chunks,1), 'old success before new publish rejected');
  perform public.test_assert(not public.publish_file_ingestion(f,null,chunks,1), 'null token cannot publish');
  perform public.test_assert(not public.fail_file_ingestion(f,null,'null'), 'null token cannot fail');
  perform public.test_assert(not public.publish_file_ingestion(gen_random_uuid(),b,chunks,1), 'missing file cannot publish');
  perform public.test_assert(not public.fail_file_ingestion(gen_random_uuid(),b,'missing'), 'missing file cannot fail');
  perform public.test_assert(public.publish_file_ingestion(f,b,chunks,1), 'current owner can publish');
  perform public.test_assert((select processing_status='ready' and chunk_count=1 and page_count=1 from public.private_files where id=f), 'ready and counts published');
  perform public.test_assert((select vector_dims(embedding)=1536 from public.document_chunks where file_id=f), 'real pgvector embedding stored');
  perform public.test_assert((select count(*)=1 and bool_and(user_id=u and course_id='00000000-0000-0000-0000-000000000002') from public.document_chunks where file_id=f), 'chunk ownership derives from file');
  perform public.test_assert(not public.fail_file_ingestion(f,a,'old failure'), 'old failure after newer success rejected');
  perform public.test_assert(not public.publish_file_ingestion(f,a,chunks,1), 'old success after newer success rejected');
  perform public.test_assert(not public.publish_file_ingestion(f,b,chunks,1), 'completed owner cannot replay success');
  perform public.test_assert(not public.fail_file_ingestion(f,b,'replay'), 'completed owner cannot replay failure');
  perform public.test_assert(public.claim_file_ingestion(f) is null, 'ready cannot be claimed');
  perform public.test_assert((select text='new winner' from public.document_chunks where file_id=f), 'late attempts leave winning chunks intact');

  -- Existing chunks must survive DELETE + partially successful INSERT rollback.
  update public.private_files set processing_status='failed' where id=f;
  a := public.claim_file_ingestion(f);
  select jsonb_agg(to_jsonb(c) order by c.chunk_index) into before_chunks from public.document_chunks c where file_id=f;
  rejected := false;
  begin
    perform public.publish_file_ingestion(f,a,'[{"chunk_index":0,"text":"replacement"},{"chunk_index":0,"text":"duplicate"}]',9);
  exception when unique_violation then rejected := true;
  end;
  perform public.test_assert(rejected, 'invalid insertion raises unique violation');
  perform public.test_assert((select jsonb_agg(to_jsonb(c) order by c.chunk_index)=before_chunks from public.document_chunks c where file_id=f), 'failed publication restores exact old chunks');
  perform public.test_assert((select processing_status='processing' and page_count=1 from public.private_files where id=f), 'failed publication does not mark ready or change page count');
  perform public.test_assert(public.fail_file_ingestion(f,a,'expected failure'), 'current owner can mark failure');
  perform public.test_assert(not public.publish_file_ingestion(f,a,chunks,1), 'failed owner cannot publish');
  perform public.test_assert(not public.fail_file_ingestion(f,a,'replay'), 'failed owner cannot replay failure');
  b := public.claim_file_ingestion(f);
  perform public.test_assert(b is not null and b<>a, 'failed retry gets a new token');
  update public.private_files set processing_started_at=null where id=f;
  perform public.test_assert(public.claim_file_ingestion(f) is null, 'unknown processing age is not reclaimable');
end $$;

-- Check ACLs and SECURITY INVOKER independently from runtime results.
do $$
declare signature text;
begin
  foreach signature in array array[
    'public.claim_file_ingestion(uuid)',
    'public.publish_file_ingestion(uuid,uuid,jsonb,integer)',
    'public.fail_file_ingestion(uuid,uuid,text)'
  ] loop
    perform public.test_assert(not has_function_privilege('anon',signature,'EXECUTE'), signature||' rejects anon');
    perform public.test_assert(not has_function_privilege('authenticated',signature,'EXECUTE'), signature||' rejects authenticated');
    perform public.test_assert(has_function_privilege('service_role',signature,'EXECUTE'), signature||' allows service_role');
    perform public.test_assert((select not prosecdef from pg_proc where oid=signature::regprocedure), signature||' is invoker');
  end loop;
end $$;
set role service_role;
select public.test_assert(public.claim_file_ingestion('ffffffff-ffff-ffff-ffff-ffffffffffff') is null, 'service_role can execute claim');
reset role;
\echo 'Sequential transaction and ACL assertions passed.'
