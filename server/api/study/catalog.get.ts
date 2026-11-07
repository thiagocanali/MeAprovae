import { createError } from 'h3'
import { createSupabaseServerClient, getAuthenticatedUser } from '../../utils/supabase'

export default defineEventHandler(async (event) => {
  const user = await getAuthenticatedUser(event)
  if (!user) throw createError({ statusCode: 401, statusMessage: 'Entre para consultar as disciplinas.' })

  const supabase = createSupabaseServerClient(event)
  const [{ data: subjects, error: subjectsError }, { data: topics, error: topicsError }] = await Promise.all([
    supabase.from('study_subjects').select('id, name').order('name', { ascending: true }).limit(500),
    supabase.from('study_topics').select('id, subject_id, name').order('name', { ascending: true }).limit(2000),
  ])

  if (subjectsError || topicsError) {
    throw createError({ statusCode: 503, statusMessage: 'Não foi possível carregar os filtros de estudo.' })
  }

  return { subjects: subjects ?? [], topics: topics ?? [] }
})
