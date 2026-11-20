import { createError, readBody } from 'h3'
import { isUuid } from '../../../../shared/domain/common/uuid'
import { isExamQuestionCount, validExamFilters } from '../../../../shared/domain/questions/exam-config'
import { examRpc } from '../../../utils/exams'

export default defineEventHandler(async event => {
  const body = await readBody<{ requestId?: unknown; contestId?: unknown; subjectId?: unknown; topicId?: unknown; questionCount?: unknown }>(event) ?? {}
  if (!isUuid(body.requestId) || !validExamFilters(body) || !isExamQuestionCount(body.questionCount)) {
    throw createError({ statusCode: 400, statusMessage: 'Configuração de simulado inválida.' })
  }
  return examRpc(event, 'start_filtered_exam_session', {
    p_request_id: body.requestId, p_contest_id: body.contestId ?? null,
    p_subject_id: body.subjectId ?? null, p_topic_id: body.topicId ?? null, p_question_count: body.questionCount,
  })
})
