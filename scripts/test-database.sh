#!/usr/bin/env bash
set -euo pipefail
# Only disposable loopback databases are permitted by this test runner.
case "${PGHOST:-127.0.0.1}" in
  127.0.0.1|localhost) ;;
  *) echo 'Database tests require a disposable local PostgreSQL instance.' >&2; exit 1 ;;
esac
export PGHOST="${PGHOST:-127.0.0.1}"
export PGUSER="${PGUSER:-postgres}"
export PGDATABASE="${PGDATABASE:-postgres}"
psql -X -v ON_ERROR_STOP=1 -f tests/integration/bootstrap.sql
for migration in supabase/migrations/*.sql; do
  psql -X -v ON_ERROR_STOP=1 -f "$migration"
done
psql -X -v ON_ERROR_STOP=1 -f tests/integration/question-import.sql
