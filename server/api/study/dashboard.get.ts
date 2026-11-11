import { createError } from 'h3'
import { createSupabaseServerClient, getAuthenticatedUser } from '../../utils/supabase'

export default defineEventHandler(async (event) => {
  const user = await getAuthenticatedUser(event)
  if (!user) throw createError({ statusCode: 401, statusMessage: 'Entre para consultar seu painel.' })

  const supabase = createSupabaseServerClient(event)
  const summary = await supabase.rpc('get_student_dashboard')

  if (summary.error || !summary.data) {
    throw createError({ statusCode: 503, statusMessage: 'Não foi possível calcular seu painel.' })
  }

  const performance = await supabase.rpc('get_student_subject_performance')

  if (performance.error || !Array.isArray(performance.data)) {
    throw createError({ statusCode: 503, statusMessage: 'Não foi possível calcular o desempenho por disciplina.' })
  }

  return {
    dashboard: summary.data,
    performanceBySubject: performance.data,
  }
})
