import { createError } from 'h3'
import { createSupabaseServerClient, getAuthenticatedUser } from '../../../utils/supabase'

export default defineEventHandler(async (event) => {
  const user = await getAuthenticatedUser(event)
  if (!user) throw createError({ statusCode: 401, statusMessage: 'Entre para revisar suas questões.' })

  const supabase = createSupabaseServerClient(event)
  const { data, error } = await supabase.rpc('get_student_wrong_questions', { p_limit: 50 })

  if (error) throw createError({ statusCode: 503, statusMessage: 'Não foi possível carregar suas questões para revisão.' })
  return { questions: data ?? [] }
})
