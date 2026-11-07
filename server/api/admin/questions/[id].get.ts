import { createError, getRouterParam } from 'h3'
import { requirePlatformEditor } from '../../../utils/admin'
import { isUuid } from '../../../../shared/domain/common/uuid'

export default defineEventHandler(async (event) => {
  const { supabase } = await requirePlatformEditor(event)
  const id = getRouterParam(event, 'id')
  if (!isUuid(id)) throw createError({ statusCode: 400, statusMessage: 'Questão inválida.' })

  const [question, options, answer, details] = await Promise.all([
    supabase.from('study_questions').select('id, notice_id, subject_id, topic_id, difficulty, statement, source_label, source_url, source_year, status, created_at').eq('id', id).maybeSingle(),
    supabase.from('study_question_options').select('id, question_id, option_label, content, position').eq('question_id', id).order('position', { ascending: true }),
    supabase.from('study_question_answer_keys').select('question_id, correct_option_id, updated_at').eq('question_id', id).maybeSingle(),
    supabase.from('study_question_editorial_details').select('question_id, explanation').eq('question_id', id).maybeSingle(),
  ])

  if (question.error || options.error || answer.error || details.error) {
    throw createError({ statusCode: 503, statusMessage: 'Não foi possível carregar a questão.' })
  }
  if (!question.data) throw createError({ statusCode: 404, statusMessage: 'Questão não encontrada.' })

  return {
    question: { ...question.data, explanation: details.data?.explanation ?? '' },
    options: options.data ?? [],
    answer: answer.data,
  }
})
