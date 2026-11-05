import { createError } from 'h3'
import { requirePlatformEditor } from '../../../utils/admin'

export default defineEventHandler(async (event) => {
  const { supabase } = await requirePlatformEditor(event)
  const { data, error } = await supabase.from('study_subjects')
    .select('id, name, created_at')
    .order('name', { ascending: true })
    .limit(500)

  if (error) throw createError({ statusCode: 503, statusMessage: 'Não foi possível carregar as disciplinas.' })
  return { subjects: data ?? [] }
})
