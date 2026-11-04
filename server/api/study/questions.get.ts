import { createError, getQuery } from 'h3'
import { createSupabaseServerClient, getAuthenticatedUser } from '../../utils/supabase'
import { isUuid } from '../../../shared/domain/common/uuid'

export default defineEventHandler(async (event) => {
  const user = await getAuthenticatedUser(event)
  if (!user) throw createError({ statusCode: 401, statusMessage: 'Entre para resolver questões.' })

  const query = getQuery(event)
  const subjectId = query.subjectId
  const topicId = query.topicId
  const contestId = query.contestId
  const questionId = query.questionId

  for (const [field, value] of Object.entries({ subjectId, topicId, contestId, questionId })) {
    if (value !== undefined && !isUuid(value)) {
      throw createError({ statusCode: 400, statusMessage: `Filtro ${field} inválido.` })
    }
  }

  const supabase = createSupabaseServerClient(event)
  let noticeIds: string[] | null = null

  if (contestId) {
    const { data: notices, error: noticeError } = await supabase
      .from('study_notices')
      .select('id')
      .eq('contest_id', contestId)
      .eq('status', 'published')

    if (noticeError) throw createError({ statusCode: 503, statusMessage: 'Não foi possível consultar o edital.' })
    noticeIds = (notices ?? []).map((notice) => notice.id)
    if (noticeIds.length === 0) return { questions: [] }
  }

  let request = supabase
    .from('study_questions')
    .select('id, notice_id, subject_id, topic_id, statement, source_label, source_url, source_year, study_question_options(id, option_label, content, position)')
    .eq('status', 'published')
    .order('created_at', { ascending: false })
    .limit(20)

  if (questionId) request = request.eq('id', questionId)
  if (subjectId) request = request.eq('subject_id', subjectId)
  if (topicId) request = request.eq('topic_id', topicId)
  if (noticeIds) request = request.in('notice_id', noticeIds)

  const { data, error } = await request
  if (error) throw createError({ statusCode: 503, statusMessage: 'Não foi possível carregar as questões.' })

  const questions = (data ?? []).map((question) => ({
    ...question,
    options: [...(question.study_question_options ?? [])].sort((a, b) => a.position - b.position),
    study_question_options: undefined,
  }))

  return { questions }
})
