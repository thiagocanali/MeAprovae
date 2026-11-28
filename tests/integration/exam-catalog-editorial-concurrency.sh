#!/usr/bin/env bash
set -euo pipefail
case "${PGHOST:-127.0.0.1}" in 127.0.0.1|localhost) ;; *) exit 1 ;; esac
if [[ -n "${PGSERVICE:-}" || -n "${PGSERVICEFILE:-}" || "${PGHOSTADDR:-127.0.0.1}" != "127.0.0.1" || ! "${PGDATABASE:-postgres}" =~ ^[a-zA-Z0-9_-]+$ ]]; then exit 1; fi
# Fresh disposable fixtures. No hosted identities, no publication.
psql -X -v ON_ERROR_STOP=1 <<'SQL'
insert into auth.users(id) values('c0330000-0000-4000-8000-000000000001');
insert into public.platform_admins(user_id,role) values('c0330000-0000-4000-8000-000000000001','editor');
set role authenticated;
select set_config('request.jwt.claim.sub','c0330000-0000-4000-8000-000000000001',false);
select public.write_exam_catalog_draft('create','c0330000-0000-4000-8000-000000000002',1,null,'{"title":"Initial title","description":"Draft fixture only","kind":"subject-foundations","questionCount":1}');
SQL
holder_log=$(mktemp)
blocked_log=$(mktemp)
trap 'rm -f "$holder_log" "$blocked_log"' EXIT
PGAPPNAME=exam-catalog-rpc-writer psql -X -v ON_ERROR_STOP=1 >"$holder_log" 2>&1 <<'SQL' &
begin;
set local role authenticated;
select set_config('request.jwt.claim.sub','c0330000-0000-4000-8000-000000000001',true);
select public.write_exam_catalog_draft('save','c0330000-0000-4000-8000-000000000002',1,1,'{"title":"Committed writer","description":"Draft fixture only","kind":"subject-foundations","questionCount":1,"questionIds":[]}');
select pg_sleep(4);
commit;
SQL
holder_pid=$!
ready=0
for _ in $(seq 1 40); do
 sleeping=$(psql -XAt -v ON_ERROR_STOP=1 -c "select count(*) from pg_stat_activity where application_name='exam-catalog-rpc-writer' and wait_event='PgSleep'")
 if [[ "$sleeping" == "1" ]]; then ready=1;break;fi
 sleep .05
done
if [[ "$ready" != "1" ]];then cat "$holder_log";wait "$holder_pid";exit 1;fi
if psql -X -v ON_ERROR_STOP=1 -v VERBOSITY=sqlstate >"$blocked_log" 2>&1 <<'SQL'
begin;
set local lock_timeout='200ms';
set local role authenticated;
select set_config('request.jwt.claim.sub','c0330000-0000-4000-8000-000000000001',true);
select public.write_exam_catalog_draft('save','c0330000-0000-4000-8000-000000000002',1,1,'{"title":"Rejected writer","description":"Draft fixture only","kind":"subject-foundations","questionCount":1,"questionIds":[]}');
commit;
SQL
then echo 'Concurrent writer bypassed catalog root lock' >&2;wait "$holder_pid";exit 1;fi
case "$(cat "$blocked_log")" in *55P03*) ;; *) cat "$blocked_log";wait "$holder_pid";exit 1;; esac
wait "$holder_pid"
psql -X -v ON_ERROR_STOP=1 <<'SQL'
begin;
set local role authenticated;
select set_config('request.jwt.claim.sub','c0330000-0000-4000-8000-000000000001',true);
do $$ begin
 begin perform public.write_exam_catalog_draft('save','c0330000-0000-4000-8000-000000000002',1,1,'{"title":"Stale writer","description":"Draft fixture only","kind":"subject-foundations","questionCount":1,"questionIds":[]}'); raise exception 'Stale writer overwrote committed revision'; exception when sqlstate 'PT409' then null; end;
 if not exists(select 1 from public.exam_catalog_versions where model_id='c0330000-0000-4000-8000-000000000002' and title='Committed writer' and edit_revision=2) then raise exception 'Committed writer lost'; end if;
end $$;
reset role;
delete from public.exam_catalog_models where id='c0330000-0000-4000-8000-000000000002';
delete from auth.users where id='c0330000-0000-4000-8000-000000000001';
commit;
SQL
echo 'PASS: concurrent RPC serializes writes and stale revision cannot overwrite committed data'
