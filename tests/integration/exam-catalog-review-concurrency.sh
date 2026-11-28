#!/usr/bin/env bash
set -euo pipefail
case "${PGHOST:-127.0.0.1}" in 127.0.0.1|localhost) ;; *) exit 1 ;; esac
if [[ -n "${PGSERVICE:-}" || -n "${PGSERVICEFILE:-}" || "${PGHOSTADDR:-127.0.0.1}" != "127.0.0.1" || ! "${PGDATABASE:-postgres}" =~ ^[a-zA-Z0-9_-]+$ ]];then exit 1;fi
# Synthetic declarations exist only in the disposable database, never in production.
psql -X -v ON_ERROR_STOP=1 <<'SQL'
insert into auth.users(id) values('f0550000-0000-4000-8000-000000000001'),('f0550000-0000-4000-8000-000000000002');
insert into public.platform_admins(user_id,role) values('f0550000-0000-4000-8000-000000000001','editor'),('f0550000-0000-4000-8000-000000000002','editor');
insert into public.study_contests(id,slug,title) values('f0550000-0000-4000-8000-000000000003','review-lock-fixture','Review lock fixture');
insert into public.study_notices(id,contest_id,title) values('f0550000-0000-4000-8000-000000000004','f0550000-0000-4000-8000-000000000003','Review lock notice');
insert into public.study_subjects(id,name) values('f0550000-0000-4000-8000-000000000005','Review lock subject');
insert into public.study_questions(id,notice_id,subject_id,statement) values('f0550000-0000-4000-8000-000000000006','f0550000-0000-4000-8000-000000000004','f0550000-0000-4000-8000-000000000005','Original reviewed fixture statement');
insert into public.study_question_options(id,question_id,option_label,content,position) values('f0550000-0000-4000-8000-000000000008','f0550000-0000-4000-8000-000000000006','A','Correct fixture answer',1),('f0550000-0000-4000-8000-000000000009','f0550000-0000-4000-8000-000000000006','B','Incorrect fixture answer',2);
insert into public.study_question_answer_keys(question_id,correct_option_id) values('f0550000-0000-4000-8000-000000000006','f0550000-0000-4000-8000-000000000008');
insert into public.study_question_editorial_details(question_id,explanation) values('f0550000-0000-4000-8000-000000000006','Explanation of this synthetic fixture.');
set role authenticated;
select set_config('request.jwt.claim.sub','f0550000-0000-4000-8000-000000000001',false);
select public.write_exam_catalog_draft('create','f0550000-0000-4000-8000-000000000007',1,null,'{"title":"Review lock model","description":"Disposable fixture only","kind":"subject-foundations","questionCount":1}');
select public.write_exam_catalog_draft('save','f0550000-0000-4000-8000-000000000007',1,1,'{"title":"Review lock model","description":"Disposable fixture only","kind":"subject-foundations","questionCount":1,"questionIds":["f0550000-0000-4000-8000-000000000006"]}');
select public.write_exam_catalog_draft('request_review','f0550000-0000-4000-8000-000000000007',1,2,'{}');
SQL
holder_log=$(mktemp);blocked_log=$(mktemp)
trap 'rm -f "$holder_log" "$blocked_log"' EXIT
PGAPPNAME=exam-catalog-review-writer psql -X -v ON_ERROR_STOP=1 >"$holder_log" 2>&1 <<'SQL' &
begin;
set local role authenticated;
select set_config('request.jwt.claim.sub','f0550000-0000-4000-8000-000000000002',true);
select public.record_exam_catalog_review('f0550000-0000-4000-8000-000000000007',1,
 jsonb_build_object('requestId','f0550000-0000-4000-8000-000000000010','expectedRevision',3,
 'expectedFingerprint',public.get_exam_catalog_review_context('f0550000-0000-4000-8000-000000000007',1)->>'fingerprint',
 'decision','approved','notes','Synthetic declaration only, not a real human approval.',
 'rights','[{"questionId":"f0550000-0000-4000-8000-000000000006","basis":"original","evidence":"Synthetic original rights evidence for testing only.","sourceUrl":null}]'::jsonb,
 'attestations','{"content":true,"answers":true,"explanations":true,"rights":true,"independent":true}'::jsonb,'attestationVersion','catalog-human-review-v1'));
select pg_sleep(4);
commit;
SQL
holder_pid=$!;ready=0
for _ in $(seq 1 40);do
 sleeping=$(psql -XAt -v ON_ERROR_STOP=1 -c "select count(*) from pg_stat_activity where application_name='exam-catalog-review-writer' and wait_event='PgSleep'")
 if [[ "$sleeping" == "1" ]];then ready=1;break;fi
 sleep .05
done
if [[ "$ready" != "1" ]];then cat "$holder_log";wait "$holder_pid";exit 1;fi
if psql -X -v ON_ERROR_STOP=1 -v VERBOSITY=sqlstate >"$blocked_log" 2>&1 <<'SQL'
begin;
set local lock_timeout='200ms';
set local role authenticated;
select set_config('request.jwt.claim.sub','f0550000-0000-4000-8000-000000000001',true);
select public.update_editorial_question('f0550000-0000-4000-8000-000000000006','{"statement":"Concurrent change must wait for the review snapshot."}');
commit;
SQL
then echo 'Source update bypassed review lock' >&2;wait "$holder_pid";exit 1;fi
case "$(cat "$blocked_log")" in *55P03*) ;; *) cat "$blocked_log";wait "$holder_pid";exit 1;; esac
wait "$holder_pid"
psql -X -v ON_ERROR_STOP=1 <<'SQL'
begin;
set local role authenticated;
select set_config('request.jwt.claim.sub','f0550000-0000-4000-8000-000000000001',true);
select public.update_editorial_question('f0550000-0000-4000-8000-000000000006','{"statement":"Source changed after the review transaction committed."}');
select set_config('request.jwt.claim.sub','f0550000-0000-4000-8000-000000000002',true);
do $$ declare ctx jsonb;begin
 ctx:=public.get_exam_catalog_review_context('f0550000-0000-4000-8000-000000000007',1);
 if (ctx#>>'{latestReview,isCurrent}')::boolean then raise exception 'Source update kept approval current';end if;
 if (select content_snapshot#>>'{questions,0,statement}' from public.exam_catalog_reviews where id='f0550000-0000-4000-8000-000000000010')<>'Original reviewed fixture statement' then raise exception 'Review snapshot changed';end if;
end $$;
commit;
SQL
echo 'PASS: review serializes source edits; later edits stale the declaration while preserving its snapshot'
