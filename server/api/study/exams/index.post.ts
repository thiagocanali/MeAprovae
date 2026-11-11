import { createError, readBody } from 'h3'
import { isUuid } from '../../../../shared/domain/common/uuid'
import { examRpc } from '../../../utils/exams'

export default defineEventHandler(async event => {
  const body = await readBody<{ requestId?: unknown; contestId?: unknown; questionCount?: unknown }>(event) ?? {}
  if (!isUuid(body.requestId) || (body.contestId !== null && body.contestId !== undefined && !isUuid(body.contestId)) || ![10, 20].includes(body.questionCount as number)) {
    throw createError({ statusCode: 400, statusMessage: 'Configuração de simulado inválida.' })
  }
  return examRpc(event, 'start_exam_session', { p_request_id: body.requestId, p_contest_id: body.contestId ?? null, p_question_count: body.questionCount })
})
