#!/usr/bin/env bash
set -euo pipefail
# Only disposable loopback databases are permitted by this test runner.
case "${PGHOST:-127.0.0.1}" in
  127.0.0.1|localhost) ;;
  *) echo 'Database tests require a disposable local PostgreSQL instance.' >&2; exit 1 ;;
esac
# libpq allows these variables/connection strings to override PGHOST.
# Reject them before starting any fixture or migration.
if [[ -n "${PGSERVICE:-}" || -n "${PGSERVICEFILE:-}" ]]; then
  echo 'Database tests do not accept libpq service overrides.' >&2; exit 1
fi
case "${PGHOSTADDR:-127.0.0.1}" in
  127.0.0.1) ;;
  *) echo 'Database tests do not accept a remote PGHOSTADDR.' >&2; exit 1 ;;
esac
if [[ ! "${PGDATABASE:-postgres}" =~ ^[a-zA-Z0-9_-]+$ ]]; then
  echo 'Database tests require a plain local database name, not a connection string.' >&2; exit 1
fi
export PGHOST="${PGHOST:-127.0.0.1}"
export PGUSER="${PGUSER:-postgres}"
export PGDATABASE="${PGDATABASE:-postgres}"
psql -X -v ON_ERROR_STOP=1 -f tests/integration/bootstrap.sql
for migration in supabase/migrations/*.sql; do
  psql -X -v ON_ERROR_STOP=1 -f "$migration"
done
psql -X -v ON_ERROR_STOP=1 -f tests/integration/question-import.sql
psql -X -v ON_ERROR_STOP=1 -f tests/integration/exam-sessions.sql
psql -X -v ON_ERROR_STOP=1 -f tests/integration/content-releases.sql
psql -X -v ON_ERROR_STOP=1 -f tests/integration/performance-overview.sql
psql -X -v ON_ERROR_STOP=1 -f tests/integration/study-comparison.sql
psql -X -v ON_ERROR_STOP=1 -f tests/integration/editorial-atomic.sql
psql -X -v ON_ERROR_STOP=1 -f tests/integration/exam-filters.sql
psql -X -v ON_ERROR_STOP=1 -f tests/integration/exam-catalog-drafts.sql
bash tests/integration/editorial-concurrency.sh
bash tests/integration/math-release-002.sh
bash tests/integration/historical-catalog.sh
bash tests/integration/exam-catalog-concurrency.sh

psql -X -v ON_ERROR_STOP=1 -f tests/integration/account-isolation.sql
