#!/usr/bin/env bash
set -euo pipefail

# Never connect the clean-schema runner to remote or production databases.
case "${PGHOST:-127.0.0.1}" in
  127.0.0.1|localhost) ;;
  *) echo 'Neon CI schema tests require a disposable localhost PostgreSQL database.' >&2; exit 1 ;;
esac
export PGHOST="${PGHOST:-127.0.0.1}"
export PGUSER="${PGUSER:-postgres}"
export PGDATABASE="${PGDATABASE:-postgres}"

tmp_sql="$(mktemp)"
trap 'rm -f "$tmp_sql"' EXIT

python3 scripts/neon/render-clean-schema.py --output "$tmp_sql"

# One PostgreSQL transaction for bootstrap, existing migrations, and the
# Neon Auth bridge. An error anywhere rolls back the entire schema setup.
psql -X -v ON_ERROR_STOP=1 --single-transaction \
  -f tests/integration/neon-bootstrap.sql \
  -f neon/migrations/0000_managed_auth_bridge.sql \
  -f "$tmp_sql" \
  -f neon/migrations/0001_ensure_neon_student_account.sql

psql -X -v ON_ERROR_STOP=1 -f tests/integration/neon-clean.sql
