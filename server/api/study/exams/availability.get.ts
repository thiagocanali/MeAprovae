import { createError, getQuery } from 'h3'
import { validExamFilters, type ExamAvailability } from '../../../../shared/domain/questions/exam-config'
import { examClient } from '../../../utils/exams'

export default defineEventHandler(async event => {
  const query = getQuery(event)
  const filters = { contestId: query.contestId, subjectId: query.subjectId, topicId: query.topicId }
  if (!validExamFilters(filters)) throw createError({ statusCode: 400, statusMessage: 'Filtros de simulado inválidos.' })
  const client = await examClient(event)
  const { data, error } = await client.rpc('get_exam_availability', {
    p_contest_id: filters.contestId ?? null, p_subject_id: filters.subjectId ?? null, p_topic_id: filters.topicId ?? null,
  })
  if (error?.code === '22023') throw createError({ statusCode: 400, statusMessage: 'Matéria, assunto ou concurso inválido. Revise os filtros.' })
  if (error?.code === '42501') throw createError({ statusCode: 401, statusMessage: 'Entre para consultar os simulados.' })
  if (error || !data || !Number.isInteger(data.available) || data.available < 0 || data.maxQuestions !== Math.min(20, data.available)) {
    throw createError({ statusCode: 503, statusMessage: 'Não foi possível consultar as questões disponíveis. Tente novamente.' })
  }
  return { ...data as ExamAvailability, filters: { contestId: filters.contestId ?? null, subjectId: filters.subjectId ?? null, topicId: filters.topicId ?? null } }
})
