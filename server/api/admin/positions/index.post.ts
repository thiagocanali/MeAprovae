import { createError, readBody } from 'h3'
import { requirePlatformEditor } from '../../../utils/admin'
import { isUuid } from '../../../../shared/domain/common/uuid'

interface PositionBody {
  contestId?: unknown
  title?: unknown
  educationLevel?: unknown
  area?: unknown
}

export default defineEventHandler(async (event) => {
  const { supabase } = await requirePlatformEditor(event)
  const body = (await readBody<PositionBody>(event)) ?? {}

  const contestId = typeof body.contestId === 'string' ? body.contestId : ''
  const title = typeof body.title === 'string' ? body.title.trim() : ''
  const educationLevel = typeof body.educationLevel === 'string' ? body.educationLevel.trim() : ''
  const area = typeof body.area === 'string' ? body.area.trim() : ''

  if (!isUuid(contestId)) throw createError({ statusCode: 400, statusMessage: 'Selecione um concurso válido.' })
  if (title.length < 2 || title.length > 160) {
    throw createError({ statusCode: 400, statusMessage: 'O cargo deve ter entre 2 e 160 caracteres.' })
  }
  if (educationLevel.length > 120 || area.length > 120) {
    throw createError({ statusCode: 400, statusMessage: 'Escolaridade e área devem ter até 120 caracteres.' })
  }

  const { data, error } = await supabase.from('study_positions').insert({
    contest_id: contestId,
    title,
    education_level: educationLevel || null,
    area: area || null,
    status: 'draft',
  }).select('id, contest_id, title, education_level, area, status, created_at').single()

  if (error?.code === '23503') throw createError({ statusCode: 404, statusMessage: 'Concurso não encontrado.' })
  if (error) throw createError({ statusCode: 503, statusMessage: 'Não foi possível criar o cargo.' })

  return { position: data }
})
