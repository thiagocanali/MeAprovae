import { createError, readBody } from 'h3'
import { createSupabaseServerClient, getAuthenticatedUser } from '../../utils/supabase'
import { isUuid } from '../../../shared/domain/common/uuid'

interface SubmitAttemptBody {
  questionId?: unknown
  optionId?: unknown
  idempotencyKey?: unknown
}

export default defineEventHandler(async (event) => {
  const user = await getAuthenticatedUser(event)
  if (!user) throw createError({ statusCode: 401, statusMessage: 'Entre para registrar sua resposta.' })

  const body = await readBody<SubmitAttemptBody>(event)
  if (!isUuid(body.questionId) || !isUuid(body.optionId) || !isUuid(body.idempotencyKey)) {
    throw createError({ statusCode: 400, statusMessage: 'Dados da resposta inválidos.' })
  }

  const supabase = createSupabaseServerClient(event)
  const { data, error } = await supabase.rpc('submit_question_attempt', {
    p_question_id: body.questionId,
    p_option_id: body.optionId,
    p_idempotency_key: body.idempotencyKey,
  })

  if (error) {
    if (error.code === 'P0002') throw createError({ statusCode: 404, statusMessage: 'Questão indisponível.' })
    if (error.code === '22023') throw createError({ statusCode: 409, statusMessage: 'Resposta inválida ou chave de envio reutilizada incorretamente.' })
    if (error.code === '28000' || error.code === '42501') throw createError({ statusCode: 401, statusMessage: 'Sua sessão não permite registrar esta resposta.' })
    throw createError({ statusCode: 503, statusMessage: 'Não foi possível registrar a resposta.' })
  }

  return { result: data }
})
