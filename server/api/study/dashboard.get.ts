import { createError } from 'h3'
import { createSupabaseServerClient, getAuthenticatedUser } from '../../utils/supabase'

export default defineEventHandler(async (event) => {
  const user = await getAuthenticatedUser(event)
  if (!user) throw createError({ statusCode: 401, statusMessage: 'Entre para consultar seu painel.' })

  const supabase = createSupabaseServerClient(event)
  const [summary, performance] = await Promise.all([
    supabase.rpc('get_student_dashboard'),
    supabase.rpc('get_student_subject_performance'),
  ])

  if (summary.error || performance.error) {
    throw createError({ statusCode: 503, statusMessage: 'Não foi possível calcular seu painel.' })
  }

  return { dashboard: summary.data, performanceBySubject: performance.data }
})
