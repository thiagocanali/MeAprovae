import { createError } from 'h3'
import { requirePlatformEditor } from '../../../utils/admin'

export default defineEventHandler(async (event) => {
  const { supabase } = await requirePlatformEditor(event)
  const { data, error } = await supabase.from('study_contests')
    .select('id, slug, title, organization, exam_board, status, published_at, created_at')
    .order('created_at', { ascending: false }).limit(100)

  if (error) throw createError({ statusCode: 503, statusMessage: 'Não foi possível carregar os concursos editoriais.' })
  return { contests: data ?? [] }
})
