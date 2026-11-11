import { createError, getRouterParam, readBody } from 'h3'
import { isUuid } from '../../../../../shared/domain/common/uuid'
import { examRpc } from '../../../../utils/exams'
export default defineEventHandler(async event => {
  const id = getRouterParam(event, 'id')
  const body = await readBody<{ position?: unknown; optionId?: unknown }>(event) ?? {}
  if (!isUuid(id) || !isUuid(body.optionId) || !Number.isInteger(body.position) || Number(body.position) < 1 || Number(body.position) > 20) {
    throw createError({ statusCode: 400, statusMessage: 'Resposta inválida.' })
  }
  return examRpc(event, 'answer_exam_session', { p_session_id: id, p_position: body.position, p_option_id: body.optionId })
})
