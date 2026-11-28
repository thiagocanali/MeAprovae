-- Entirely synthetic, disposable fixtures. Not human review or licensed content.
insert into auth.users(id) values
 ('ee710000-0000-4000-8000-000000000001'),('ee710000-0000-4000-8000-000000000002'),('ee710000-0000-4000-8000-000000000003');
insert into public.platform_admins(user_id,role) values
 ('ee710000-0000-4000-8000-000000000001','editor'),('ee710000-0000-4000-8000-000000000002','editor');
insert into public.study_contests(id,slug,title) values('ee710000-0000-4000-8000-000000000010','integration-only','Concurso sintético de integração');
insert into public.study_notices(id,contest_id,title) values('ee710000-0000-4000-8000-000000000011','ee710000-0000-4000-8000-000000000010','Edital sintético');
insert into public.study_subjects(id,name) values('ee710000-0000-4000-8000-000000000020','Matemática de integração'),('ee710000-0000-4000-8000-000000000021','Português de integração');
insert into public.study_topics(id,subject_id,name) values('ee710000-0000-4000-8000-000000000030','ee710000-0000-4000-8000-000000000020','Porcentagem sintética'),('ee710000-0000-4000-8000-000000000031','ee710000-0000-4000-8000-000000000021','Leitura sintética');
insert into public.study_questions(id,notice_id,subject_id,topic_id,statement,source_label)
select ('ee710000-0000-4000-8000-'||lpad(n::text,12,'0'))::uuid,'ee710000-0000-4000-8000-000000000011',
 case when n<103 then 'ee710000-0000-4000-8000-000000000020' else 'ee710000-0000-4000-8000-000000000021' end::uuid,
 case when n<103 then 'ee710000-0000-4000-8000-000000000030' else 'ee710000-0000-4000-8000-000000000031' end::uuid,
 case when n<103 then 'Questão sintética de integração: calcule '||n||'% de 200.' else 'Questão sintética de integração: leia o texto '||n||'.' end,
 'Fixture exclusiva de teste, sem direitos ou revisão humana declarados' from generate_series(101,104) n;
insert into public.study_question_options(id,question_id,option_label,content,position)
select md5(q.id::text||n)::uuid,q.id,case n when 1 then 'A' else 'B' end,case n when 1 then 'Resposta sintética correta' else 'Resposta sintética incorreta' end,n
from public.study_questions q cross join generate_series(1,2) n where q.id::text like 'ee710000%';
insert into public.study_question_answer_keys(question_id,correct_option_id)
select id,md5(id::text||1)::uuid from public.study_questions where id::text like 'ee710000%';
insert into public.study_question_editorial_details(question_id,explanation)
select id,'Explicação exclusivamente sintética para testar a conferência editorial.' from public.study_questions where id::text like 'ee710000%';
