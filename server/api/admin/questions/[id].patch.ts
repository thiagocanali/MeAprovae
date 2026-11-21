import { createError, getRouterParam, readBody } from 'h3'
import { requirePlatformEditor } from '../../../utils/admin'
import { editorialQuestionError } from '../../../utils/editorial-question-error'
import { isUuid } from '../../../../shared/domain/common/uuid'
import { isQuestionDifficulty } from '../../../../shared/domain/questions/difficulty'

interface Body { noticeId?: unknown; subjectId?: unknown; topicId?: unknown; difficulty?: unknown; difficultyReviewed?: unknown; statement?: unknown; explanation?: unknown; sourceLabel?: unknown; sourceUrl?: unknown; sourceYear?: unknown; status?: unknown }
const text=(value:unknown)=>typeof value==='string'?value.trim():''

export default defineEventHandler(async (event) => {
  const { supabase } = await requirePlatformEditor(event)
  const id = getRouterParam(event, 'id')
  if (!isUuid(id)) throw createError({ statusCode: 400, statusMessage: 'Questão inválida.' })
  const body = (await readBody<Body>(event)) ?? {}
  const updates: Record<string, unknown> = {}
  let explanation: string | undefined

  if (body.noticeId !== undefined) {
    if (!isUuid(text(body.noticeId))) throw createError({ statusCode: 400, statusMessage: 'Edital inválido.' })
    updates.notice_id = text(body.noticeId)
  }
  if (body.subjectId !== undefined) {
    if (!isUuid(text(body.subjectId))) throw createError({ statusCode: 400, statusMessage: 'Disciplina inválida.' })
    updates.subject_id = text(body.subjectId)
  }
  if (body.topicId !== undefined) {
    if (body.topicId !== null && !isUuid(text(body.topicId))) throw createError({ statusCode: 400, statusMessage: 'Assunto inválido.' })
    updates.topic_id = body.topicId === null ? null : text(body.topicId)
  }
  if (body.difficulty !== undefined) {
    const value = text(body.difficulty)
    if (!isQuestionDifficulty(value)) throw createError({ statusCode: 400, statusMessage: 'Dificuldade inválida.' })
    updates.difficulty = value
    if (body.difficultyReviewed === undefined) updates.difficulty_reviewed = false
  }
  if (body.difficultyReviewed !== undefined) {
    if (typeof body.difficultyReviewed !== 'boolean') throw createError({ statusCode: 400, statusMessage: 'Status de revisão da dificuldade inválido.' })
    updates.difficulty_reviewed = body.difficultyReviewed
  }
  if (body.statement !== undefined) {
    const value=text(body.statement); if(value.length<10||value.length>20000) throw createError({statusCode:400,statusMessage:'Enunciado inválido.'}); updates.statement=value
  }
  if (body.explanation !== undefined) {
    explanation=text(body.explanation); if(explanation.length>12000) throw createError({statusCode:400,statusMessage:'Explicação muito longa.'})
  }
  if (body.sourceLabel !== undefined) updates.source_label=text(body.sourceLabel)||null
  if (body.sourceUrl !== undefined) {
    const value=text(body.sourceUrl); if(value&&!/^https?:\/\//i.test(value)) throw createError({statusCode:400,statusMessage:'A fonte deve usar HTTP ou HTTPS.'}); updates.source_url=value||null
  }
  if (body.sourceYear !== undefined) {
    const value=body.sourceYear===null||body.sourceYear===''?null:Number(body.sourceYear)
    if(value!==null&&(!Number.isInteger(value)||value<1900||value>2200)) throw createError({statusCode:400,statusMessage:'Ano da fonte inválido.'}); updates.source_year=value
  }
  if (body.status !== undefined) {
    if(body.status!=='draft'&&body.status!=='published'&&body.status!=='archived') throw createError({statusCode:400,statusMessage:'Status editorial inválido.'}); updates.status=body.status
  }
  if(!Object.keys(updates).length && explanation===undefined) throw createError({statusCode:400,statusMessage:'Nenhuma alteração informada.'})

  const { data, error } = await supabase.rpc('update_editorial_question', {
    p_question_id: id,
    p_fields: updates,
    p_explanation: explanation ?? null,
    p_set_explanation: explanation !== undefined,
  })
  if (error) throw editorialQuestionError(error)
  if (!data) throw editorialQuestionError({})
  return { question: data }
})
