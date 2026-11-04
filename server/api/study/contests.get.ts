import { createError } from 'h3'
import { createSupabaseServerClient, getAuthenticatedUser } from '../../utils/supabase'

export default defineEventHandler(async (event) => {
  const user = await getAuthenticatedUser(event)
  if (!user) throw createError({ statusCode: 401, statusMessage: 'Entre para consultar os concursos.' })

  const supabase = createSupabaseServerClient(event)
  const { data, error } = await supabase
    .from('study_contests')
    .select('id, slug, title, organization, exam_board, published_at, study_notices(id, title, version, publication_date), study_positions(id, title, education_level, area)')
    .eq('status', 'published')
    .order('published_at', { ascending: false })

  if (error) {
    throw createError({ statusCode: 503, statusMessage: 'Não foi possível carregar os concursos.' })
  }

  return { contests: data ?? [] }
})
