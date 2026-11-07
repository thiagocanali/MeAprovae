import { createError, getQuery } from 'h3'
import { requirePlatformEditor } from '../../../utils/admin'
import { isUuid } from '../../../../shared/domain/common/uuid'

export default defineEventHandler(async (event) => {
  const { supabase } = await requirePlatformEditor(event)
  const query = getQuery(event)
  const noticeId = typeof query.noticeId === 'string' ? query.noticeId : ''
  if (noticeId && !isUuid(noticeId)) throw createError({ statusCode: 400, statusMessage: 'Edital inválido.' })

  let request = supabase.from('study_questions')
    .select('id, notice_id, subject_id, topic_id, difficulty, statement, source_label, source_url, source_year, status, created_at, study_subjects(id, name), study_topics(id, name, parent_topic_id)')
    .order('created_at', { ascending: false })
    .limit(200)
  if (noticeId) request = request.eq('notice_id', noticeId)

  const { data, error } = await request
  if (error) throw createError({ statusCode: 503, statusMessage: 'Não foi possível carregar as questões.' })

  const questions = data ?? []
  const ids = questions.map((question) => question.id)
  const detailsResult = ids.length
    ? await supabase.from('study_question_editorial_details').select('question_id, explanation').in('question_id', ids)
    : { data: [], error: null }

  if (detailsResult.error) throw createError({ statusCode: 503, statusMessage: 'Não foi possível carregar as explicações editoriais.' })

  const explanations = new Map((detailsResult.data ?? []).map((item) => [item.question_id, item.explanation]))
  return { questions: questions.map((question) => ({ ...question, explanation: explanations.get(question.id) ?? '' })) }
})
