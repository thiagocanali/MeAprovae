import { createError } from 'h3'
import { readImportBody } from '../../../utils/import-body'
import { requirePlatformEditor } from '../../../utils/admin'
import { IMPORT_MAX_BYTES, isImportRequest, parseQuestionImport } from '../../../../shared/domain/questions/import'

export default defineEventHandler(async (event) => {
  const { supabase } = await requirePlatformEditor(event)
  // JSON escaping can expand the JSONL body: bound the HTTP body as well as decoded content.
  const body = await readImportBody(event, IMPORT_MAX_BYTES * 2 + 10000)
  if (!isImportRequest(body)) throw createError({ statusCode: 400, statusMessage: 'Informe edital, identificador da fonte e identificador da requisição válidos.' })
  const parsed = parseQuestionImport(body.jsonl)
  if (parsed.issues.length) throw createError({ statusCode: 400, statusMessage: 'Revise os problemas no lote.', data: { issues: parsed.issues } })
  const names = [...new Set(parsed.questions.map(question => question.subject))]
  const { data: subjects, error: subjectError } = await supabase.from('study_subjects').select('id, name').in('name', names)
  if (subjectError) throw createError({ statusCode: 503, statusMessage: 'Não foi possível validar as disciplinas.' })
  const byName = new Map((subjects ?? []).map(subject => [subject.name, subject.id]))
  const missing = names.filter(name => !byName.has(name))
  if (missing.length) throw createError({ statusCode: 400, statusMessage: 'Há disciplinas não cadastradas.', data: { subjects: missing } })
  const { data, error } = await supabase.rpc('import_question_batch', {
    p_request_id: body.requestId, p_notice_id: body.noticeId, p_source_name: body.sourceName,
    p_questions: parsed.questions.map(question => ({ ...question, subjectId: byName.get(question.subject) })),
  })
  if (error?.code === '23505') throw createError({ statusCode: 409, statusMessage: 'Há questão ou identificador já importado. Nenhuma questão deste lote foi criada.' })
  if (error?.code === '22023' || error?.code === '22P02' || error?.code === '23514' || error?.code === '23503') throw createError({ statusCode: 400, statusMessage: 'Lote incompatível com o edital ou os dados esperados. Nenhuma questão foi criada.' })
  if (error?.code === '42501') throw createError({ statusCode: 403, statusMessage: 'Sua conta não possui acesso editorial.' })
  if (error || !data) throw createError({ statusCode: 503, statusMessage: 'Não foi possível concluir a importação. Tente novamente com o mesmo identificador.' })
  return { batch: data }
})
