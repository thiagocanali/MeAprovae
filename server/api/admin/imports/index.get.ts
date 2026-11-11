import { createError } from 'h3'
import { requirePlatformEditor } from '../../../utils/admin'

export default defineEventHandler(async (event) => {
  const { supabase } = await requirePlatformEditor(event)
  const { data, error } = await supabase.from('question_import_batches')
    .select('id, request_id, source_name, notice_id, question_count, created_at')
    .order('created_at', { ascending: false }).limit(50)
  if (error) throw createError({ statusCode: 503, statusMessage: 'Não foi possível carregar os lotes importados.' })
  return { batches: data ?? [] }
})
