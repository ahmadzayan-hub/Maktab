# Ingestion attempt ownership and recovery

The 15-minute timeout allows recovery of abandoned work, but does not stop the
old worker. Each successful claim now writes a fresh UUID in
`private_files.processing_attempt_id`. Every success or failure must present
that ID while the file is still `processing`.

`claim_file_ingestion` performs one conditional UPDATE using database time.
Pending and failed files are claimable; processing files are claimable only
when their start time is strictly older than 15 minutes. Ready/missing files
and processing rows with no start time are not claimable, as before.

`publish_file_ingestion` locks the owning file row with SELECT FOR UPDATE,
replaces all chunks and writes ready/count/page metadata in the same transaction.
Reclaim waits for this lock and rechecks its predicate. If reclaim wins first,
the old publisher rechecks its token and returns false without changing chunks.
Any insert/conversion failure rolls back the replacement, preserving earlier
chunks. File/user/course identity is read from the locked file, not chunk JSON.

`fail_file_ingestion` matches the file, attempt and processing status in one
UPDATE. A late failure cannot undo a newer result or a successful publication
whose response was lost. Stale workers return a skipped result from the pipeline.
All three functions use SECURITY INVOKER and allow EXECUTE only to service_role
(and database owners), not anonymous/authenticated API users.

## Verification

```sh
npm test -- src/lib/ingest/process.test.ts src/lib/ingest/supabase-store.test.ts
npm run typecheck
npm run lint
npm test
npm run build
bash tests/ingestion/run-postgres.sh
```

The Vitest cases cover token propagation, one-call publication and deterministic
overlap while a newer attempt is processing or ready. They model the store
contract; they do not prove PostgreSQL locking. The separate [database harness](../tests/ingestion/README.md)
creates a disposable local PostgreSQL cluster and tests the actual migrations,
rollback, permissions and concurrent lock ordering. It requires installed
PostgreSQL and pgvector and never connects to an application database.

## Rollout checklist

1. Run the quality commands and database harness. Review the target schema;
   the pre-existing application/migration differences around `name`/`file_name`
   and `status`/`processing_status` are not resolved by this fix.
2. Pause new uploads/retries and drain or stop all old ingestion workers before
   enabling the new flow. Legacy code writes directly to tables and does not
   honor attempt tokens, so mixed-version workers are not safe.
3. Apply migrations 0004 then 0005 to an approved staging environment. Deploy
   the fenced application code after the RPCs exist. Missing RPCs fail closed;
   there is deliberately no fallback to unguarded writes.
4. With synthetic documents, verify upload, retrieval/page references, failure,
   retry, stale reclaim, and tenant isolation. Repeat under the actual service
   client and API roles. The local database fixture is not full Supabase RLS
   or deployed integration coverage.
5. Follow the same drained-worker sequence for any separately approved release.
   Reverting to legacy application code reintroduces the race even if the
   migration remains installed.

Adding this migration to a branch does not apply it or deploy the application.
No live migration, paid embedding request or production acceptance is implied.
