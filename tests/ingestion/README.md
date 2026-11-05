# Ingestion database regression tests

Run from the repository root:

```sh
bash tests/ingestion/run-postgres.sh
```

Prerequisites: PostgreSQL `initdb`, `pg_ctl`, and `psql` on PATH, pgvector
installed for that PostgreSQL version, and Python 3. The runner does not install
anything, use Docker, read application credentials, or connect to an existing
server. It creates a temporary cluster with a private Unix socket and TCP
listening disabled, and removes it on exit. Run as an ordinary non-root user.

The fixture reproduces the ingestion-related table shape from migration 0003;
it is intentionally not a full Supabase/auth environment. Production migrations
0004 and 0005 execute unchanged, including real pgvector casts. Migration 0005
is applied twice to check idempotence. These tests are separate from Vitest;
`npm test` does not run them.

## Coverage

- Pending claim, fresh duplicate, exact 15-minute boundary, stale reclaim,
  distinct retry token, missing file, and unknown processing age.
- Old success and failure before and after a newer successful publication.
- Missing/null token, completed/failed owner replay, and ready-state claim.
- Chunk identity derives from the locked file, ignoring JSON tenant identity.
- Real 1536-dimensional vector storage and atomic ready/count metadata.
- A unique violation after replacement begins restores the exact old chunk
  rows and does not publish ready/page metadata.
- Function ACLs for anon/authenticated/service_role and SECURITY INVOKER.
- Two independent PostgreSQL sessions in both lock orders: publication first
  blocks reclaim until ready commits; reclaim first blocks stale publication
  until the new attempt commits. A third session verifies the blocked session
  has a PostgreSQL lock wait, rather than relying on timing/sleeps alone.

The runner stops with an explicit missing-prerequisite error if PostgreSQL is
unavailable. A shell/Python syntax check alone does not establish that database
assertions passed. Run the harness with the prerequisites before accepting the
database behavior. It is not a production migration or Supabase RLS test.
