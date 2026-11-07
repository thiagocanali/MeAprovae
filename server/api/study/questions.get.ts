import { createError, getQuery } from 'h3'
import { createSupabaseServerClient, getAuthenticatedUser } from '../../utils/supabase'
import { logSupabaseError } from '../../utils/supabase-diagnostics'
import { isUuid } from '../../../shared/domain/common/uuid'
import { parseQuestionPagination } from '../../../shared/domain/questions/pagination'

export default defineEventHandler(async (event) => {
  const user = await getAuthenticatedUser(event)
  if (!user) throw createError({ statusCode: 401, statusMessage: 'Entre para resolver questões.' })

  const query = getQuery(event)
  const subjectId = query.subjectId
  const topicId = query.topicId
  const difficulty = query.difficulty
  const contestId = query.contestId
  const questionId = query.questionId
  const pagination = parseQuestionPagination(query.page, query.pageSize)

  if (!pagination) {
    throw createError({ statusCode: 400, statusMessage: 'Paginação inválida. Use página positiva e até 100 questões por página.' })
  }

  if (difficulty !== undefined && !['easy', 'medium', 'hard'].includes(String(difficulty))) {
    throw createError({ statusCode: 400, statusMessage: 'Filtro difficulty inválido.' })
  }

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

    if (noticeError) {
      logSupabaseError('study.questions.notice_lookup', noticeError)
      throw createError({ statusCode: 503, statusMessage: 'Não foi possível consultar o edital.' })
    }
    noticeIds = (notices ?? []).map((notice) => notice.id)
    if (noticeIds.length === 0) {
      return {
        questions: [],
        page: pagination.page,
        pageSize: pagination.pageSize,
        total: 0,
        hasMore: false,
      }
    }
  }

  let request = supabase
    .from('study_questions')
    .select('id, notice_id, subject_id, topic_id, difficulty, statement, source_label, source_url, source_year, study_question_options(id, option_label, content, position)', { count: 'exact' })
    .eq('status', 'published')
    .order('created_at', { ascending: false })
    .order('id', { ascending: false })
    .range(pagination.offset, pagination.offset + pagination.pageSize - 1)

  if (questionId) request = request.eq('id', questionId)
  if (subjectId) request = request.eq('subject_id', subjectId)
  if (topicId) request = request.eq('topic_id', topicId)
  if (difficulty) request = request.eq('difficulty', difficulty)
  if (noticeIds) request = request.in('notice_id', noticeIds)

  const { data, error, count } = await request
  if (error) {
    logSupabaseError('study.questions.list', error)
    throw createError({ statusCode: 503, statusMessage: 'Não foi possível carregar as questões.' })
  }

  const questions = (data ?? []).map((question) => ({
    ...question,
    options: [...(question.study_question_options ?? [])].sort((a, b) => a.position - b.position),
    study_question_options: undefined,
  }))

  const total = count ?? 0
  return {
    questions,
    page: pagination.page,
    pageSize: pagination.pageSize,
    total,
    hasMore: pagination.offset + questions.length < total,
  }
})
