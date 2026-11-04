import { createError } from 'h3'
import { createSupabaseServerClient, getAuthenticatedUser } from '../../utils/supabase'

export default defineEventHandler(async (event) => {
  const user = await getAuthenticatedUser(event)
  if (!user) throw createError({ statusCode: 401, statusMessage: 'Entre para consultar suas favoritas.' })

  const supabase = createSupabaseServerClient(event)
  const { data, error } = await supabase
    .from('student_question_favorites')
    .select('question_id, created_at, study_questions(id, statement, source_label, source_year)')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })

  if (error) throw createError({ statusCode: 503, statusMessage: 'Não foi possível carregar suas questões favoritas.' })
  return { favorites: data ?? [] }
})
