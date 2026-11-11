import { createError, getQuery } from 'h3'
import { createSupabaseServerClient, getAuthenticatedUser } from '../../utils/supabase'
import { parsePerformanceQuery, type PerformanceOverview } from '../../../shared/domain/questions/performance'

export default defineEventHandler(async (event): Promise<PerformanceOverview> => {
  const user = await getAuthenticatedUser(event)
  if (!user) throw createError({ statusCode: 401, statusMessage: 'Entre para consultar seu desempenho.' })
  const filters = parsePerformanceQuery(getQuery(event))
  if (!filters) throw createError({ statusCode: 400, statusMessage: 'Escolha 7, 30 ou 90 dias e um fuso válido.' })
  const { data, error } = await createSupabaseServerClient(event).rpc('get_student_performance', {
    p_days: filters.days, p_timezone: filters.timezone,
  })
  if (error || !data) throw createError({ statusCode: 503, statusMessage: 'Não foi possível calcular sua evolução.' })
  return data as PerformanceOverview
})
