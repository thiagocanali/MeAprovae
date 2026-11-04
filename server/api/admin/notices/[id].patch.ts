import { createError, getRouterParam, readBody } from 'h3'
import { requirePlatformEditor } from '../../../utils/admin'
import { isUuid } from '../../../../shared/domain/common/uuid'

interface NoticeUpdateBody {
  contestId?: unknown
  title?: unknown
  version?: unknown
  publicationDate?: unknown
  sourceUrl?: unknown
  status?: unknown
}

function validDate(value: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false
  const date = new Date(value + 'T00:00:00.000Z')
  return !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === value
}

export default defineEventHandler(async (event) => {
  const { supabase } = await requirePlatformEditor(event)
  const id = getRouterParam(event, 'id')
  if (!isUuid(id)) throw createError({ statusCode: 400, statusMessage: 'Identificador de edital inválido.' })
  const body = (await readBody<NoticeUpdateBody>(event)) ?? {}
  const updates: Record<string, string | null> = {}

  if (body.contestId !== undefined) {
    if (!isUuid(body.contestId)) throw createError({ statusCode: 400, statusMessage: 'Concurso inválido.' })
    updates.contest_id = body.contestId
  }
  if (body.title !== undefined) {
    const value = typeof body.title === 'string' ? body.title.trim() : ''
    if (value.length < 3 || value.length > 180) throw createError({ statusCode: 400, statusMessage: 'Título inválido.' })
    updates.title = value
  }
  if (body.version !== undefined) {
    const value = typeof body.version === 'string' ? body.version.trim() : ''
    if (!value || value.length > 40) throw createError({ statusCode: 400, statusMessage: 'Versão inválida.' })
    updates.version = value
  }
  if (body.publicationDate !== undefined) {
    if (body.publicationDate !== null && body.publicationDate !== '' && (typeof body.publicationDate !== 'string' || !validDate(body.publicationDate))) {
      throw createError({ statusCode: 400, statusMessage: 'Data de publicação inválida.' })
    }
    updates.publication_date = typeof body.publicationDate === 'string' && body.publicationDate ? body.publicationDate : null
  }
  if (body.sourceUrl !== undefined) {
    if (body.sourceUrl !== null && body.sourceUrl !== '') {
      if (typeof body.sourceUrl !== 'string' || body.sourceUrl.length > 2048) throw createError({ statusCode: 400, statusMessage: 'URL da fonte inválida.' })
      try {
        const url = new URL(body.sourceUrl)
        if (url.protocol !== 'https:' && url.protocol !== 'http:') throw new Error('protocol')
        updates.source_url = url.toString()
      } catch {
        throw createError({ statusCode: 400, statusMessage: 'Informe uma URL HTTP ou HTTPS válida.' })
      }
    } else {
      updates.source_url = null
    }
  }
  if (body.status !== undefined) {
    if (body.status !== 'draft' && body.status !== 'published' && body.status !== 'archived') {
      throw createError({ statusCode: 400, statusMessage: 'Status editorial inválido.' })
    }
    updates.status = body.status
  }

  if (!Object.keys(updates).length) throw createError({ statusCode: 400, statusMessage: 'Nenhuma alteração informada.' })
  const { data, error } = await supabase.from('study_notices').update(updates).eq('id', id)
    .select('id, contest_id, title, version, publication_date, source_url, status, created_at').maybeSingle()

  if (error?.code === '23505') throw createError({ statusCode: 409, statusMessage: 'Já existe um edital com esta versão para o concurso.' })
  if (error?.code === '23503') throw createError({ statusCode: 404, statusMessage: 'Concurso não encontrado.' })
  if (error?.code === '23514') throw createError({ statusCode: 409, statusMessage: 'A regra de publicação impede esta alteração. Arquive primeiro as questões publicadas vinculadas.' })
  if (error) throw createError({ statusCode: 503, statusMessage: 'Não foi possível atualizar o edital.' })
  if (!data) throw createError({ statusCode: 404, statusMessage: 'Edital não encontrado.' })
  return { notice: data }
})
