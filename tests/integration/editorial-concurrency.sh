#!/usr/bin/env bash
set -euo pipefail
case "${PGHOST:-127.0.0.1}" in 127.0.0.1|localhost) ;; *) exit 1 ;; esac
# This runs last, in the disposable CI database. No production connection.
psql -X -v ON_ERROR_STOP=1 <<'SQL'
insert into auth.users(id) values ('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa');
insert into public.platform_admins(user_id,role) values ('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa','editor');
insert into public.study_contests(id,slug,title) values ('cccccccc-cccc-4ccc-8ccc-cccccccccccc','atomic-lock-fixture','Atomic lock fixture');
insert into public.study_notices(id,contest_id,title) values ('dddddddd-dddd-4ddd-8ddd-dddddddddddd','cccccccc-cccc-4ccc-8ccc-cccccccccccc','Atomic lock notice');
insert into public.study_subjects(id,name) values ('eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee','Atomic lock subject');
insert into public.study_notice_subjects(notice_id,subject_id) values ('dddddddd-dddd-4ddd-8ddd-dddddddddddd','eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee');
insert into public.study_questions(id,notice_id,subject_id,statement) values ('bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb','dddddddd-dddd-4ddd-8ddd-dddddddddddd','eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee','Original concurrency fixture statement.');
insert into public.study_question_editorial_details(question_id,explanation) values ('bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb','Original concurrency explanation.');
SQL
holder_log=$(mktemp)
blocked_log=$(mktemp)
trap 'rm -f "$holder_log" "$blocked_log"' EXIT
PGAPPNAME=editorial-atomic-lock-holder psql -X -v ON_ERROR_STOP=1 >"$holder_log" 2>&1 <<'SQL' &
begin;
set local role authenticated;
select set_config('request.jwt.claim.sub','aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',true);
select public.update_editorial_question('bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb','{"statement":"First writer owns the question lock."}','First writer explanation.',true);
select pg_sleep(5);
commit;
SQL
holder_pid=$!
ready=0
for _ in $(seq 1 40); do
  sleeping=$(psql -XAt -v ON_ERROR_STOP=1 -c "select count(*) from pg_stat_activity where application_name='editorial-atomic-lock-holder' and wait_event='PgSleep'")
  if [[ "$sleeping" == "1" ]]; then ready=1; break; fi
  sleep 0.05
done
if [[ "$ready" != "1" ]]; then cat "$holder_log"; wait "$holder_pid"; exit 1; fi
if psql -X -v ON_ERROR_STOP=1 -v VERBOSITY=sqlstate >"$blocked_log" 2>&1 <<'SQL'
begin;
set local lock_timeout='200ms';
set local role authenticated;
select set_config('request.jwt.claim.sub','aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',true);
select public.update_editorial_question('bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb','{"statement":"Second writer must not partially commit."}','Second writer explanation.',true);
commit;
SQL
then
  echo 'Second editor bypassed the question lock.' >&2
  wait "$holder_pid"
  exit 1
fi
case "$(cat "$blocked_log")" in *55P03*) ;; *) cat "$blocked_log"; wait "$holder_pid"; exit 1 ;; esac
wait "$holder_pid"
psql -X -v ON_ERROR_STOP=1 <<'SQL'
do $$ begin
 if not exists(select 1 from public.study_questions q join public.study_question_editorial_details d on d.question_id=q.id
   where q.id='bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb' and q.statement='First writer owns the question lock.' and d.explanation='First writer explanation.')
 then raise exception 'Concurrent rejected edit left partial state'; end if;
end $$;
SQL
echo 'PASS: concurrent editorial update holds row lock and rejected writer leaves no partial content'
