import { createError, getQuery } from 'h3'
import { requirePlatformEditor } from '../../utils/admin'
import { relatedRow } from '../../utils/related-row'
import { parseReviewQueueQuery, reviewSearchPattern, type ReviewQueueResponse } from '../../../shared/domain/questions/review-queue'
import { getReviewedQuestionDifficulty } from '../../../shared/domain/questions/difficulty'

export default defineEventHandler(async (event): Promise<ReviewQueueResponse> => {
  const { supabase } = await requirePlatformEditor(event)
  const filters = parseReviewQueueQuery(getQuery(event))
  if (!filters) throw createError({ statusCode: 400, statusMessage: 'Filtros inválidos. Use página positiva, até 50 itens e busca de até 200 caracteres.' })
  const empty = { questions: [], total: 0, page: filters.page, pageSize: filters.pageSize, hasMore: false }
  let releaseQuestionIds: string[] | undefined
  if (filters.releaseId) {
    // Repository releases are capped at 100 questions by the install contract.
    const { data, error } = await supabase.from('question_content_release_items')
      .select('question_id').eq('release_id', filters.releaseId).limit(101)
    if (error || (data?.length ?? 0) > 100) throw createError({ statusCode: 503, statusMessage: 'Não foi possível consultar o lote para revisão.' })
    releaseQuestionIds = (data ?? []).map(item => item.question_id)
    if (!releaseQuestionIds.length) return empty
  }
  let request = supabase.from('study_questions')
    .select('id, statement, status, difficulty, difficulty_reviewed, source_label, subject_id, topic_id, created_at, study_subjects(name), study_topics(name)', { count: 'exact' })
    .order('created_at', { ascending: false }).order('id', { ascending: false })
    .range(filters.offset, filters.offset + filters.pageSize - 1)
  if (filters.status !== 'all') request = request.eq('status', filters.status)
  if (filters.subjectId) request = request.eq('subject_id', filters.subjectId)
  if (filters.pending === 'difficulty') request = request.eq('difficulty_reviewed', false)
  if (filters.search) request = request.ilike('statement', reviewSearchPattern(filters.search))
  if (releaseQuestionIds) request = request.in('id', releaseQuestionIds)
  const { data, count, error } = await request
  if (error) throw createError({ statusCode: 503, statusMessage: 'Não foi possível carregar a fila editorial.' })
  const questions = (data ?? []).map(question => ({
    id: question.id, statementPreview: question.statement.length > 320 ? `${question.statement.slice(0, 320)}…` : question.statement,
    status: question.status, subjectName: relatedRow(question.study_subjects)?.name ?? '',
    topicName: relatedRow(question.study_topics)?.name ?? '', sourceLabel: question.source_label,
    difficulty: getReviewedQuestionDifficulty(question.difficulty, question.difficulty_reviewed),
    difficultyReviewed: question.difficulty_reviewed,
  }))
  const total = count ?? 0
  return { questions, total, page: filters.page, pageSize: filters.pageSize, hasMore: filters.offset + questions.length < total }
})
