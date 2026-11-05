#!/usr/bin/env bash
set -euo pipefail
ROOT=$(cd "$(dirname "$0")/../.." && pwd)
for command in initdb pg_ctl psql python3; do
  command -v "$command" >/dev/null || { echo "Missing $command. Install PostgreSQL with pgvector yourself, then rerun." >&2; exit 1; }
done
# Never connect to a supplied URL, existing server, or application database.
# Only this newly initialized cluster is touched; TCP listening is disabled.
WORK=$(mktemp -d "${TMPDIR:-/tmp}/maktab-ingestion.XXXXXXXX")
cleanup() {
  pg_ctl -D "$WORK/data" -m immediate stop >/dev/null 2>&1 || true
  rm -rf "$WORK"
}
trap cleanup EXIT
mkdir "$WORK/socket"
initdb -D "$WORK/data" -A trust -U ingestion_test --no-locale >"$WORK/initdb.log"
if ! pg_ctl -D "$WORK/data" -l "$WORK/server.log" -o "-k $WORK/socket -c listen_addresses=''" -w start >/dev/null; then
  cat "$WORK/server.log" >&2
  exit 1
fi
unset PGHOSTADDR PGSERVICE PGSERVICEFILE PGOPTIONS PGPASSWORD
export PGHOST="$WORK/socket" PGPORT=5432 PGDATABASE=postgres PGUSER=ingestion_test
psql -X -v ON_ERROR_STOP=1 -f "$ROOT/tests/ingestion/bootstrap.sql"
psql -X -v ON_ERROR_STOP=1 -f "$ROOT/supabase/migrations/0004_ingestion.sql"
MIGRATIONS=("$ROOT"/supabase/migrations/0005*.sql)
[[ ${#MIGRATIONS[@]} -eq 1 && -f "${MIGRATIONS[0]}" ]] || { echo 'Expected exactly one 0005 migration.' >&2; exit 1; }
psql -X -v ON_ERROR_STOP=1 -f "${MIGRATIONS[0]}"
# Verify idempotence on the same populated schema before assertions.
psql -X -v ON_ERROR_STOP=1 -f "${MIGRATIONS[0]}"
psql -X -v ON_ERROR_STOP=1 -f "$ROOT/tests/ingestion/regression.sql"
python3 "$ROOT/tests/ingestion/concurrency.py"
echo 'All PostgreSQL ingestion regression tests passed.'
