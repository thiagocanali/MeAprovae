import { createError, setHeader } from 'h3'
import { createSupabaseServerClient, getAuthenticatedUser } from '../../utils/supabase'
import { logSupabaseError } from '../../utils/supabase-diagnostics'

export default defineEventHandler(async (event) => {
  setHeader(event, 'Cache-Control', 'private, no-store')
  const user = await getAuthenticatedUser(event)
  if (!user) throw createError({ statusCode: 401, statusMessage: 'Entre para consultar os concursos.' })

  const supabase = createSupabaseServerClient(event)
  const { data, error } = await supabase
    .from('study_contests')
    .select('id, slug, title, organization, exam_board, published_at, study_notices(id, title, version, publication_date), study_positions(id, title, education_level, area)')
    .eq('status', 'published')
    .eq('study_notices.status', 'published')
    .eq('study_positions.status', 'published')
    .order('published_at', { ascending: false })

  if (error) {
    logSupabaseError('study.contests.list', error)
    throw createError({ statusCode: 503, statusMessage: 'Não foi possível carregar os concursos.' })
  }

  const { data: followed, error: followError } = await supabase.from('student_contests').select('contest_id').eq('user_id', user.id)
  if (followError) throw createError({ statusCode: 503, statusMessage: 'Não foi possível carregar os concursos acompanhados.' })
  return { contests: data ?? [], followedContestIds: (followed ?? []).map(item => item.contest_id) }
})
