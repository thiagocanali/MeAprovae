import { createError, getRouterParam, readBody } from 'h3'
import { requirePlatformEditor } from '../../../utils/admin'
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

  let questionData: {
    id: string
    notice_id: string
    subject_id: string
    topic_id: string | null
    difficulty: string
    difficulty_reviewed: boolean
    statement: string
    source_label: string | null
    source_url: string | null
    source_year: number | null
    status: string
    created_at: string
  } | null = null
  if (Object.keys(updates).length) {
    const { data, error } = await supabase.from('study_questions').update(updates).eq('id',id)
      .select('id, notice_id, subject_id, topic_id, difficulty, difficulty_reviewed, statement, source_label, source_url, source_year, status, created_at').maybeSingle()
    if(error?.code==='23514') throw createError({statusCode:409,statusMessage:'A regra de publicação ou o histórico de respostas impede esta alteração.'})
    if(error?.code==='23522'||error?.code==='23503') throw createError({statusCode:400,statusMessage:'Disciplina ou assunto incompatível com a questão.'})
    if(error) throw createError({statusCode:503,statusMessage:'Não foi possível atualizar a questão.'})
    if(!data) throw createError({statusCode:404,statusMessage:'Questão não encontrada.'})
    questionData=data
  } else {
    const { data, error } = await supabase.from('study_questions')
      .select('id, notice_id, subject_id, topic_id, difficulty, difficulty_reviewed, statement, source_label, source_url, source_year, status, created_at')
      .eq('id',id).maybeSingle()
    if(error) throw createError({statusCode:503,statusMessage:'Não foi possível carregar a questão.'})
    if(!data) throw createError({statusCode:404,statusMessage:'Questão não encontrada.'})
    questionData=data
  }

  if (explanation !== undefined) {
    const { error } = await supabase.from('study_question_editorial_details')
      .upsert({ question_id: id, explanation }, { onConflict: 'question_id' })
    if(error?.code==='23514') throw createError({statusCode:409,statusMessage:'O histórico de respostas impede a alteração da explicação.'})
    if(error) throw createError({statusCode:503,statusMessage:'Não foi possível atualizar a explicação editorial.'})
  }

  return { question: { ...questionData, ...(explanation === undefined ? {} : { explanation }) } }
})
