#!/usr/bin/env bash
set -euo pipefail
case "${PGHOST:-127.0.0.1}" in 127.0.0.1|localhost) ;; *) exit 1 ;; esac
# Only the disposable runner invokes this test. Never run against a hosted DB.
psql -X -v ON_ERROR_STOP=1 <<'SQL'
insert into public.study_contests(id,slug,title) values('c0110000-0000-4000-8000-000000000001','catalog-lock-test','Catalog lock test');
insert into public.study_notices(id,contest_id,title) values('c0110000-0000-4000-8000-000000000002','c0110000-0000-4000-8000-000000000001','Catalog lock notice');
insert into public.study_subjects(id,name) values('c0110000-0000-4000-8000-000000000003','Catalog lock subject');
insert into public.study_questions(id,notice_id,subject_id,statement) values('c0110000-0000-4000-8000-000000000004','c0110000-0000-4000-8000-000000000002','c0110000-0000-4000-8000-000000000003','Catalog concurrency fixture question');
insert into public.exam_catalog_models(id,title,description,kind) values('c0110000-0000-4000-8000-000000000005','Catalog lock model','Fixture only, not published','subject-foundations');
insert into public.exam_catalog_versions(model_id,version,question_count,duration_minutes) values('c0110000-0000-4000-8000-000000000005',1,1,6);
insert into public.exam_catalog_items(model_id,version,position,question_id) values('c0110000-0000-4000-8000-000000000005',1,1,'c0110000-0000-4000-8000-000000000004');
SQL
holder_log=$(mktemp)
blocked_log=$(mktemp)
trap 'rm -f "$holder_log" "$blocked_log"' EXIT
PGAPPNAME=exam-catalog-item-writer psql -X -v ON_ERROR_STOP=1 >"$holder_log" 2>&1 <<'SQL' &
begin;
update public.exam_catalog_items set subject_id=null where model_id='c0110000-0000-4000-8000-000000000005';
select pg_sleep(4);
rollback;
SQL
holder_pid=$!
ready=0
for _ in $(seq 1 40); do
  sleeping=$(psql -XAt -v ON_ERROR_STOP=1 -c "select count(*) from pg_stat_activity where application_name='exam-catalog-item-writer' and wait_event='PgSleep'")
  if [[ "$sleeping" == "1" ]]; then ready=1; break; fi
  sleep 0.05
done
if [[ "$ready" != "1" ]]; then cat "$holder_log"; wait "$holder_pid"; exit 1; fi
if psql -X -v ON_ERROR_STOP=1 -v VERBOSITY=sqlstate >"$blocked_log" 2>&1 <<'SQL'
begin;
set local lock_timeout='200ms';
update public.exam_catalog_versions set status='in_review' where model_id='c0110000-0000-4000-8000-000000000005';
commit;
SQL
then
  echo 'Review transition bypassed the composition lock.' >&2
  wait "$holder_pid"; exit 1
fi
case "$(cat "$blocked_log")" in *55P03*) ;; *) cat "$blocked_log"; wait "$holder_pid"; exit 1 ;; esac
wait "$holder_pid"
psql -X -v ON_ERROR_STOP=1 <<'SQL'
begin;
do $$ begin
 if not exists(select 1 from public.exam_catalog_versions where model_id='c0110000-0000-4000-8000-000000000005' and status='draft') then raise exception 'Rejected concurrent review committed'; end if;
end $$;
update public.exam_catalog_versions set status='in_review' where model_id='c0110000-0000-4000-8000-000000000005';
update public.exam_catalog_versions set status='draft' where model_id='c0110000-0000-4000-8000-000000000005';
delete from public.exam_catalog_models where id='c0110000-0000-4000-8000-000000000005';
delete from public.study_contests where id='c0110000-0000-4000-8000-000000000001';
delete from public.study_subjects where id='c0110000-0000-4000-8000-000000000003';
commit;
SQL
echo 'PASS: composition mutation serializes review and failed transition leaves no partial state'
