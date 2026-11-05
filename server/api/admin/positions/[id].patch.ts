import { createError, getRouterParam, readBody } from 'h3'
import { requirePlatformEditor } from '../../../utils/admin'
import { isUuid } from '../../../../shared/domain/common/uuid'

interface PositionUpdateBody {
  title?: unknown
  educationLevel?: unknown
  area?: unknown
  status?: unknown
}

export default defineEventHandler(async (event) => {
  const { supabase } = await requirePlatformEditor(event)
  const id = getRouterParam(event, 'id')
  if (!isUuid(id)) throw createError({ statusCode: 400, statusMessage: 'Identificador de cargo inválido.' })

  const body = (await readBody<PositionUpdateBody>(event)) ?? {}
  const updates: Record<string, string | null> = {}

  if (body.title !== undefined) {
    const title = typeof body.title === 'string' ? body.title.trim() : ''
    if (title.length < 2 || title.length > 160) throw createError({ statusCode: 400, statusMessage: 'Cargo inválido.' })
    updates.title = title
  }
  if (body.educationLevel !== undefined) {
    if (body.educationLevel !== null && typeof body.educationLevel !== 'string') throw createError({ statusCode: 400, statusMessage: 'Escolaridade inválida.' })
    const value = typeof body.educationLevel === 'string' ? body.educationLevel.trim() : ''
    if (value.length > 120) throw createError({ statusCode: 400, statusMessage: 'Escolaridade muito longa.' })
    updates.education_level = value || null
  }
  if (body.area !== undefined) {
    if (body.area !== null && typeof body.area !== 'string') throw createError({ statusCode: 400, statusMessage: 'Área inválida.' })
    const value = typeof body.area === 'string' ? body.area.trim() : ''
    if (value.length > 120) throw createError({ statusCode: 400, statusMessage: 'Área muito longa.' })
    updates.area = value || null
  }
  if (body.status !== undefined) {
    if (body.status !== 'draft' && body.status !== 'published' && body.status !== 'archived') {
      throw createError({ statusCode: 400, statusMessage: 'Status editorial inválido.' })
    }
    updates.status = body.status
  }

  if (!Object.keys(updates).length) throw createError({ statusCode: 400, statusMessage: 'Nenhuma alteração informada.' })

  const { data, error } = await supabase.from('study_positions')
    .update(updates).eq('id', id)
    .select('id, contest_id, title, education_level, area, status, created_at').maybeSingle()

  if (error?.code === '23514') throw createError({ statusCode: 409, statusMessage: 'A regra de publicação impede esta alteração.' })
  if (error) throw createError({ statusCode: 503, statusMessage: 'Não foi possível atualizar o cargo.' })
  if (!data) throw createError({ statusCode: 404, statusMessage: 'Cargo não encontrado.' })

  return { position: data }
})
