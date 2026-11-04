import { createError } from 'h3'
import { createSupabaseServerClient, getAuthenticatedUser } from '../../utils/supabase'

export default defineEventHandler(async (event) => {
  const user = await getAuthenticatedUser(event)
  if (!user) throw createError({ statusCode: 401, statusMessage: 'Entre para consultar seu objetivo.' })

  const supabase = createSupabaseServerClient(event)
  const { data, error } = await supabase
    .from('study_goals')
    .select('id, contest_id, notice_id, position_id, created_at, study_contests(title, slug), study_notices(title, version), study_positions(title)')
    .eq('user_id', user.id)
    .eq('status', 'active')
    .maybeSingle()

  if (error) throw createError({ statusCode: 503, statusMessage: 'Não foi possível carregar seu objetivo.' })
  return { goal: data ?? null }
})
