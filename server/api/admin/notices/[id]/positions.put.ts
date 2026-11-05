import { createError, getRouterParam, readBody } from 'h3'
import { requirePlatformEditor } from '../../../../utils/admin'
import { isUuid } from '../../../../../shared/domain/common/uuid'

interface PositionAssignmentBody { positionIds?: unknown }

export default defineEventHandler(async (event) => {
  const { supabase } = await requirePlatformEditor(event)
  const noticeId = getRouterParam(event, 'id')
  if (!isUuid(noticeId)) throw createError({ statusCode: 400, statusMessage: 'Identificador de edital inválido.' })

  const body = (await readBody<PositionAssignmentBody>(event)) ?? {}
  if (!Array.isArray(body.positionIds) || body.positionIds.length > 100 || !body.positionIds.every(isUuid)) {
    throw createError({ statusCode: 400, statusMessage: 'Informe uma lista válida de até 100 cargos.' })
  }

  const { data, error } = await supabase.rpc('set_notice_positions', {
    p_notice_id: noticeId,
    p_position_ids: body.positionIds,
  })

  if (error?.code === 'P0002') throw createError({ statusCode: 404, statusMessage: 'Edital não encontrado.' })
  if (error?.code === '23514') throw createError({ statusCode: 409, statusMessage: 'Despublique o edital antes de alterar seus cargos.' })
  if (error?.code === '22023') throw createError({ statusCode: 400, statusMessage: 'A lista contém cargos inválidos, repetidos ou de outro concurso.' })
  if (error) throw createError({ statusCode: 503, statusMessage: 'Não foi possível atualizar os cargos do edital.' })

  return { assignment: data }
})
