import { createError, readBody } from 'h3'
import { requirePlatformEditor } from '../../../utils/admin'
import { isUuid } from '../../../../shared/domain/common/uuid'

interface NoticeBody {
  contestId?: unknown
  title?: unknown
  version?: unknown
  publicationDate?: unknown
  sourceUrl?: unknown
}

function validDate(value: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false
  const date = new Date(value + 'T00:00:00.000Z')
  return !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === value
}

function validSource(value: unknown): string | null | undefined {
  if (value === undefined) return undefined
  if (value === null || value === '') return null
  if (typeof value !== 'string' || value.length > 2048) return undefined
  try {
    const url = new URL(value)
    if (url.protocol !== 'https:' && url.protocol !== 'http:') return undefined
    return url.toString()
  } catch {
    return undefined
  }
}

export default defineEventHandler(async (event) => {
  const { supabase } = await requirePlatformEditor(event)
  const body = (await readBody<NoticeBody>(event)) ?? {}
  const contestId = typeof body.contestId === 'string' ? body.contestId : ''
  const title = typeof body.title === 'string' ? body.title.trim() : ''
  const version = typeof body.version === 'string' ? body.version.trim() : '1'
  const publicationDate = typeof body.publicationDate === 'string' ? body.publicationDate : ''
  const sourceUrl = validSource(body.sourceUrl)

  if (!isUuid(contestId)) throw createError({ statusCode: 400, statusMessage: 'Selecione um concurso válido.' })
  if (title.length < 3 || title.length > 180) throw createError({ statusCode: 400, statusMessage: 'O título deve ter entre 3 e 180 caracteres.' })
  if (!version || version.length > 40) throw createError({ statusCode: 400, statusMessage: 'A versão deve ter entre 1 e 40 caracteres.' })
  if (publicationDate && !validDate(publicationDate)) throw createError({ statusCode: 400, statusMessage: 'Data de publicação inválida.' })
  if (sourceUrl === undefined) throw createError({ statusCode: 400, statusMessage: 'Informe uma URL HTTP ou HTTPS válida para a fonte.' })

  const { data, error } = await supabase.from('study_notices').insert({
    contest_id: contestId,
    title,
    version,
    publication_date: publicationDate || null,
    source_url: sourceUrl,
    status: 'draft',
  }).select('id, contest_id, title, version, publication_date, source_url, status, created_at').single()

  if (error?.code === '23505') throw createError({ statusCode: 409, statusMessage: 'Já existe um edital com esta versão para o concurso.' })
  if (error?.code === '23503') throw createError({ statusCode: 404, statusMessage: 'Concurso não encontrado.' })
  if (error) throw createError({ statusCode: 503, statusMessage: 'Não foi possível criar o edital.' })
  return { notice: data }
})
