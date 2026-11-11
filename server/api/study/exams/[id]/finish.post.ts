import { createError, getRouterParam } from 'h3'
import { isUuid } from '../../../../../shared/domain/common/uuid'
import { examRpc } from '../../../../utils/exams'
export default defineEventHandler(async event => {
  const id = getRouterParam(event, 'id')
  if (!isUuid(id)) throw createError({ statusCode: 400, statusMessage: 'Simulado inválido.' })
  return examRpc(event, 'finish_exam_session', { p_session_id: id })
})
