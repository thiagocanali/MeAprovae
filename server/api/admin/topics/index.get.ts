import { createError } from 'h3'
import { requirePlatformEditor } from '../../../utils/admin'

export default defineEventHandler(async (event) => {
  const { supabase } = await requirePlatformEditor(event)
  const { data, error } = await supabase.from('study_topics')
    .select('id, subject_id, parent_topic_id, name, created_at')
    .order('subject_id', { ascending: true })
    .order('parent_topic_id', { ascending: true, nullsFirst: true })
    .order('name', { ascending: true })
    .limit(2000)

  if (error) throw createError({ statusCode: 503, statusMessage: 'Não foi possível carregar os assuntos.' })
  return { topics: data ?? [] }
})
