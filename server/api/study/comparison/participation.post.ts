import { createError, readBody } from 'h3'
import { comparisonClient } from '../../../utils/comparison'
import { parseComparisonParticipation } from '../../../../shared/domain/questions/comparison'
export default defineEventHandler(async event => {
  const client = await comparisonClient(event)
  const body = parseComparisonParticipation(await readBody(event))
  if (!body) throw createError({ statusCode: 400, statusMessage: 'Informe uma escolha válida e o aceite atual para participar.' })
  const { data, error } = await client.rpc('set_study_comparison_participation', { p_enabled: body.enabled, p_consent_version: body.consentVersion })
  if (error || !data) throw createError({ statusCode: 503, statusMessage: 'Não foi possível salvar sua escolha. Tente novamente.' })
  return { enabled: data.enabled === true }
})
