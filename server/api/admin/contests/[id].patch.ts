import { createError, getRouterParam, readBody } from 'h3'
import { requirePlatformEditor } from '../../../utils/admin'
import { isUuid } from '../../../../shared/domain/common/uuid'

interface ContestUpdateBody {
  slug?: unknown
  title?: unknown
  organization?: unknown
  examBoard?: unknown
  status?: unknown
}

export default defineEventHandler(async (event) => {
  const { supabase } = await requirePlatformEditor(event)
  const id = getRouterParam(event, 'id')
  if (!isUuid(id)) throw createError({ statusCode: 400, statusMessage: 'Identificador de concurso inválido.' })

  const body = (await readBody<ContestUpdateBody>(event)) ?? {}
  const updates: Record<string, string | null> = {}

  if (body.slug !== undefined) {
    const slug = typeof body.slug === 'string' ? body.slug.trim().toLowerCase() : ''
    if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug)) {
      throw createError({ statusCode: 400, statusMessage: 'Slug inválido.' })
    }
    updates.slug = slug
  }
  if (body.title !== undefined) {
    const title = typeof body.title === 'string' ? body.title.trim() : ''
    if (title.length < 3 || title.length > 180) throw createError({ statusCode: 400, statusMessage: 'Título inválido.' })
    updates.title = title
  }
  if (body.organization !== undefined) {
    if (body.organization !== null && typeof body.organization !== 'string') throw createError({ statusCode: 400, statusMessage: 'Órgão inválido.' })
    const value = typeof body.organization === 'string' ? body.organization.trim() : ''
    if (value.length > 160) throw createError({ statusCode: 400, statusMessage: 'Órgão muito longo.' })
    updates.organization = value || null
  }
  if (body.examBoard !== undefined) {
    if (body.examBoard !== null && typeof body.examBoard !== 'string') throw createError({ statusCode: 400, statusMessage: 'Banca inválida.' })
    const value = typeof body.examBoard === 'string' ? body.examBoard.trim() : ''
    if (value.length > 160) throw createError({ statusCode: 400, statusMessage: 'Banca muito longa.' })
    updates.exam_board = value || null
  }
  if (body.status !== undefined) {
    if (body.status !== 'draft' && body.status !== 'published' && body.status !== 'archived') {
      throw createError({ statusCode: 400, statusMessage: 'Status editorial inválido.' })
    }
    updates.status = body.status
    if (body.status === 'published') updates.published_at = new Date().toISOString()
  }

  if (!Object.keys(updates).length) throw createError({ statusCode: 400, statusMessage: 'Nenhuma alteração informada.' })

  const { data, error } = await supabase.from('study_contests')
    .update(updates).eq('id', id)
    .select('id, slug, title, organization, exam_board, status, published_at, updated_at').maybeSingle()

  if (error?.code === '23505') throw createError({ statusCode: 409, statusMessage: 'Já existe um concurso com este slug.' })
  if (error) throw createError({ statusCode: 503, statusMessage: 'Não foi possível atualizar o concurso.' })
  if (!data) throw createError({ statusCode: 404, statusMessage: 'Concurso não encontrado.' })
  return { contest: data }
})
