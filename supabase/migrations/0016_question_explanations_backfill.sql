-- Backfill explanations for published questions that currently have none.
-- The generated explanation identifies the keyed option and its content, then
-- explicitly rejects the distractors. Editorially richer explanations can be
-- refined later without allowing blank explanations into the student flow.

update public.study_questions q
set explanation = format(
  'A alternativa %s é a correta. Ela corresponde ao conceito cobrado em "%s": %s. As demais alternativas não atendem ao enunciado ou apresentam conceitos incompatíveis com o tema.',
  co.option_label,
  coalesce(t.name, 'conteúdo da questão'),
  co.content
)
from public.study_question_answer_keys ak
join public.study_question_options co
  on co.id = ak.correct_option_id
left join public.study_topics t
  on t.id = q.topic_id
where ak.question_id = q.id
  and q.status = 'published'
  and (q.explanation is null or btrim(q.explanation) = '');

-- Keep future published content from silently reaching students without an
-- explanation by making the editorial invariant explicit in the migration
-- comments. Enforcement remains application/editorial policy because existing
-- draft/import workflows may intentionally create a question before review.
