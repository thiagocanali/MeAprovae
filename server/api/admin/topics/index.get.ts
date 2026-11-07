import { createError } from 'h3'
import { requirePlatformEditor } from '../../utils/admin'

export default defineEventHandler(async (event) => {
  const { supabase } = await requirePlatformEditor(event)
  const { data, error } = await supabase.from('study_topics')
    .select('id, subject_id, parent_topic_id, name')
    .order('name', { ascending: true })
    .limit(1000)

  if (error) throw createError({ statusCode: 503, statusMessage: 'Não foi possível carregar os assuntos.' })
  return { topics: data ?? [] }
})
