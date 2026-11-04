import { createError, getQuery } from 'h3'
import { requirePlatformEditor } from '../../../utils/admin'
import { isUuid } from '../../../../shared/domain/common/uuid'

export default defineEventHandler(async (event) => {
  const { supabase } = await requirePlatformEditor(event)
  const query = getQuery(event)
  const contestId = typeof query.contestId === 'string' ? query.contestId : ''
  if (contestId && !isUuid(contestId)) {
    throw createError({ statusCode: 400, statusMessage: 'Identificador de concurso inválido.' })
  }

  let request = supabase.from('study_notices')
    .select('id, contest_id, title, version, publication_date, source_url, status, created_at')
    .order('created_at', { ascending: false }).limit(200)
  if (contestId) request = request.eq('contest_id', contestId)

  const { data, error } = await request
  if (error) throw createError({ statusCode: 503, statusMessage: 'Não foi possível carregar os editais.' })
  return { notices: data ?? [] }
})
