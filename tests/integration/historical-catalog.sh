#!/usr/bin/env bash
set -euo pipefail
catalog_sql=$(mktemp)
trap 'rm -f "$catalog_sql"' EXIT
python3 scripts/content/build_contest_catalog_sql.py --output "$catalog_sql"
{
printf 'begin;\n'
cat "$catalog_sql"
cat "$catalog_sql"
cat <<'SQL'
do $$ begin
 if (select count(*) from public.study_contests where slug in ('acervo-cnu-2024','acervo-cnu-2025','acervo-trf1-servidores-2024'))<>3 then raise exception 'Historical seed must contain exactly three contests after replay';end if;
 if exists(select 1 from public.study_notices n join public.study_contests c on c.id=n.contest_id where c.slug in ('acervo-cnu-2024','acervo-cnu-2025','acervo-trf1-servidores-2024')) then raise exception 'Do not invent notices for archived exams';end if;
end $$;
SQL
# A collision must be rejected without replacing an existing editorial record.
printf "update public.study_contests set title='Local editorial change' where slug='acervo-cnu-2024';\n"
printf 'do $test$ begin begin execute $seed_sql$\n'
cat "$catalog_sql"
printf "\$seed_sql\$; raise exception 'Expected a collision'; exception when sqlstate '22023' then null; end;\n"
cat <<'SQL'
if not exists(select 1 from public.study_contests where slug='acervo-cnu-2024' and title='Local editorial change') then raise exception 'Existing record was overwritten';end if;
end $test$;
rollback;
SQL
} | psql -X -v ON_ERROR_STOP=1
