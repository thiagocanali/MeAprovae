#!/usr/bin/env bash
set -euo pipefail
release_sql=$(mktemp)
trap 'rm -f "$release_sql"' EXIT
python3 scripts/content/build_release_sql.py --release matematica-original-002 --notice-id 'e2000000-0000-4000-8000-000000000002' --commit '0000000000000000000000000000000000000000' --output "$release_sql"
{
cat <<'SQL'
begin;
insert into public.study_contests(id,slug,title,status) values('e2000000-0000-4000-8000-000000000001','release-002-test','Release test','draft');
insert into public.study_notices(id,contest_id,title,status) values('e2000000-0000-4000-8000-000000000002','e2000000-0000-4000-8000-000000000001','Release test','draft');
insert into public.study_subjects(name) values('Raciocínio Lógico e Matemática') on conflict(name) do nothing;
insert into public.study_notice_subjects(notice_id,subject_id,position) select 'e2000000-0000-4000-8000-000000000002',id,1 from public.study_subjects where name='Raciocínio Lógico e Matemática';
SQL
cat "$release_sql"
cat "$release_sql"
cat <<'SQL'
do $$
declare r uuid; n integer;
begin
 select id into r from public.question_content_releases where release_name='matematica-original-002';
 select count(*) into n from public.question_content_release_items where release_id=r;
 if n<>100 then raise exception 'Release must contain exactly 100 items after replay';end if;
 if (select count(*) from public.study_questions q join public.question_content_release_items i on i.question_id=q.id where i.release_id=r and q.status='draft' and not q.difficulty_reviewed)<>100 then raise exception 'No automatic publication or review allowed';end if;
 if (select count(*) from public.study_question_options o join public.question_content_release_items i on i.question_id=o.question_id where i.release_id=r)<>400 then raise exception 'Options missing';end if;
 if (select count(*) from public.study_question_answer_keys k join public.question_content_release_items i on i.question_id=k.question_id where i.release_id=r)<>100 then raise exception 'Keys missing';end if;
 if (select count(*) from public.study_question_editorial_details e join public.question_content_release_items i on i.question_id=e.question_id where i.release_id=r and length(e.explanation)>0)<>100 then raise exception 'Explanations missing';end if;
end $$;
rollback;
SQL
} | psql -X -v ON_ERROR_STOP=1
