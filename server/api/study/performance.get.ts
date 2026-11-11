import { createError } from 'h3'
import { createSupabaseServerClient, getAuthenticatedUser } from '../../utils/supabase'
import { dailyPerformance } from '../../../shared/domain/questions/performance'

export default defineEventHandler(async (event) => {
  const user = await getAuthenticatedUser(event)
  if (!user) throw createError({ statusCode: 401, statusMessage: 'Entre para consultar seu desempenho.' })
  const supabase = createSupabaseServerClient(event)
  const now = new Date()
  const start = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()) - 29 * 86400000)
  const { data, error, count } = await supabase.from('question_attempts')
    .select('is_correct, submitted_at', { count: 'exact' })
    .eq('user_id', user.id).gte('submitted_at', start.toISOString()).lte('submitted_at', now.toISOString())
    .order('submitted_at', { ascending: false }).order('id', { ascending: false }).limit(1000)
  if (error) throw createError({ statusCode: 503, statusMessage: 'Não foi possível calcular sua evolução.' })
  const attempts = data ?? []
  return { days: dailyPerformance(attempts, now), sampled: (count ?? 0) > attempts.length,
    totalInPeriod: count ?? 0, sampleSize: attempts.length, timezone: 'UTC' }
})
