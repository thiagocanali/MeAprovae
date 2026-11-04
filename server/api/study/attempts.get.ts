import { createError } from 'h3'
import { createSupabaseServerClient, getAuthenticatedUser } from '../../utils/supabase'

export default defineEventHandler(async (event) => {
  const user = await getAuthenticatedUser(event)
  if (!user) throw createError({ statusCode: 401, statusMessage: 'Entre para consultar seu histórico.' })

  const supabase = createSupabaseServerClient(event)
  const { data, error } = await supabase
    .from('question_attempts')
    .select('id, question_id, selected_option_id, is_correct, submitted_at')
    .eq('user_id', user.id)
    .order('submitted_at', { ascending: false })
    .limit(100)

  if (error) throw createError({ statusCode: 503, statusMessage: 'Não foi possível carregar seu histórico.' })
  return { attempts: data ?? [] }
})
