import { createError, getRouterParam, setHeader } from 'h3'
import { createSupabaseServerClient, getAuthenticatedUser } from '../../../utils/supabase'

export default defineEventHandler(async (event) => {
  setHeader(event, 'Cache-Control', 'private, no-store')
  const user = await getAuthenticatedUser(event)
  if (!user) throw createError({ statusCode: 401, statusMessage: 'Entre para consultar este concurso.' })

  const slug = getRouterParam(event, 'slug')
  if (!slug || !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug)) {
    throw createError({ statusCode: 400, statusMessage: 'Identificador de concurso inválido.' })
  }

  const supabase = createSupabaseServerClient(event)
  const { data: contest, error } = await supabase
    .from('study_contests')
    .select('id, slug, title, organization, exam_board, published_at, study_positions(id, title, education_level, area), study_notices(id, title, version, publication_date, source_url, study_notice_subjects(position, study_subjects(id, name)))')
    .eq('slug', slug)
    .eq('status', 'published')
    .eq('study_notices.status', 'published')
    .eq('study_positions.status', 'published')
    .maybeSingle()

  if (error) throw createError({ statusCode: 503, statusMessage: 'Não foi possível carregar o concurso.' })
  if (!contest) throw createError({ statusCode: 404, statusMessage: 'Concurso não encontrado.' })

  const { data: followed, error: followError } = await supabase
    .from('student_contests')
    .select('contest_id')
    .eq('user_id', user.id)
    .eq('contest_id', contest.id)
    .maybeSingle()

  if (followError) throw createError({ statusCode: 503, statusMessage: 'Não foi possível consultar seu acompanhamento.' })
  return { contest, isFollowed: Boolean(followed) }
})
