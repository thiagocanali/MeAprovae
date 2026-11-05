import { createError, getRouterParam } from 'h3'
import { requirePlatformEditor } from '../../../../utils/admin'
import { isUuid } from '../../../../../shared/domain/common/uuid'

export default defineEventHandler(async (event) => {
  const { supabase } = await requirePlatformEditor(event)
  const noticeId = getRouterParam(event, 'id')
  if (!isUuid(noticeId)) throw createError({ statusCode: 400, statusMessage: 'Identificador de edital inválido.' })

  const { data, error } = await supabase.from('study_notice_positions')
    .select('position_id, position, study_positions(id, title, education_level, area, status)')
    .eq('notice_id', noticeId)
    .order('position', { ascending: true })

  if (error) throw createError({ statusCode: 503, statusMessage: 'Não foi possível carregar os cargos do edital.' })

  return { assignments: data ?? [] }
})
