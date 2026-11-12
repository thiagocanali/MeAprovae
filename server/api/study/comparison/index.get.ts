import { createError, getQuery } from 'h3'
import { comparisonClient } from '../../../utils/comparison'
import type { StudyComparison } from '../../../../shared/domain/questions/comparison'
export default defineEventHandler(async event => {
  const client = await comparisonClient(event)
  if (Object.keys(getQuery(event)).length) throw createError({ statusCode: 400, statusMessage: 'A comparação usa somente seu objetivo e o mês atual, sem filtros adicionais.' })
  const { data, error } = await client.rpc('get_study_comparison')
  if (error || !data) throw createError({ statusCode: 503, statusMessage: 'Não foi possível consultar a comparação.' })
  return { comparison: data as StudyComparison }
})
