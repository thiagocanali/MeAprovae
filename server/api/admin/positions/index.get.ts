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

  let request = supabase.from('study_positions')
    .select('id, contest_id, title, education_level, area, status, created_at')
    .order('title', { ascending: true })
    .limit(500)

  if (contestId) request = request.eq('contest_id', contestId)

  const { data, error } = await request
  if (error) throw createError({ statusCode: 503, statusMessage: 'Não foi possível carregar os cargos.' })

  return { positions: data ?? [] }
})
