import { createError, readBody } from 'h3'
import { requirePlatformEditor } from '../../../utils/admin'
import { isUuid } from '../../../../shared/domain/common/uuid'

interface Body {
  noticeId?: unknown
  subjectId?: unknown
  topicId?: unknown
  statement?: unknown
  explanation?: unknown
  sourceLabel?: unknown
  sourceUrl?: unknown
  sourceYear?: unknown
}

function text(value: unknown) { return typeof value === 'string' ? value.trim() : '' }

export default defineEventHandler(async (event) => {
  const { supabase } = await requirePlatformEditor(event)
  const body = (await readBody<Body>(event)) ?? {}
  const noticeId = text(body.noticeId)
  const subjectId = text(body.subjectId)
  const topicId = text(body.topicId)
  const statement = text(body.statement)
  const explanation = text(body.explanation)
  const sourceLabel = text(body.sourceLabel)
  const sourceUrl = text(body.sourceUrl)
  const sourceYear = body.sourceYear === null || body.sourceYear === undefined || body.sourceYear === '' ? null : Number(body.sourceYear)

  if (!isUuid(noticeId) || !isUuid(subjectId)) throw createError({ statusCode: 400, statusMessage: 'Edital e disciplina são obrigatórios.' })
  if (topicId && !isUuid(topicId)) throw createError({ statusCode: 400, statusMessage: 'Assunto inválido.' })
  if (statement.length < 10 || statement.length > 20000) throw createError({ statusCode: 400, statusMessage: 'O enunciado deve ter entre 10 e 20000 caracteres.' })
  if (explanation.length > 12000) throw createError({ statusCode: 400, statusMessage: 'A explicação pode ter no máximo 12000 caracteres.' })
  if (sourceUrl && !/^https?:\/\//i.test(sourceUrl)) throw createError({ statusCode: 400, statusMessage: 'A fonte deve usar HTTP ou HTTPS.' })
  if (sourceYear !== null && (!Number.isInteger(sourceYear) || sourceYear < 1900 || sourceYear > 2200)) throw createError({ statusCode: 400, statusMessage: 'Ano da fonte inválido.' })

  const { data, error } = await supabase.from('study_questions').insert({
    notice_id: noticeId,
    subject_id: subjectId,
    topic_id: topicId || null,
    statement,
    explanation,
    source_label: sourceLabel || null,
    source_url: sourceUrl || null,
    source_year: sourceYear,
    status: 'draft',
  }).select('id, notice_id, subject_id, topic_id, statement, explanation, source_label, source_url, source_year, status, created_at').single()

  if (error?.code === '23522') throw createError({ statusCode: 400, statusMessage: 'Assunto ou edital incompatível.' })
  if (error?.code === '23503') throw createError({ statusCode: 400, statusMessage: 'Edital, disciplina ou assunto não encontrado.' })
  if (error) throw createError({ statusCode: 503, statusMessage: 'Não foi possível criar a questão.' })
  return { question: data }
})
