import { createError, readBody } from 'h3'
import { requirePlatformEditor } from '../../../utils/admin'
import { isUuid } from '../../../../shared/domain/common/uuid'

interface TopicBody { subjectId?: unknown; parentTopicId?: unknown; name?: unknown }

export default defineEventHandler(async (event) => {
  const { supabase } = await requirePlatformEditor(event)
  const body = (await readBody<TopicBody>(event)) ?? {}
  const subjectId = typeof body.subjectId === 'string' ? body.subjectId : ''
  const parentTopicId = body.parentTopicId === null || body.parentTopicId === '' ? null : typeof body.parentTopicId === 'string' ? body.parentTopicId : undefined
  const name = typeof body.name === 'string' ? body.name.trim().replace(/\s+/g, ' ') : ''

  if (!isUuid(subjectId) || (parentTopicId !== null && (parentTopicId === undefined || !isUuid(parentTopicId)))) {
    throw createError({ statusCode: 400, statusMessage: 'Disciplina ou assunto pai inválido.' })
  }
  if (name.length < 2 || name.length > 120) {
    throw createError({ statusCode: 400, statusMessage: 'O nome do assunto deve ter entre 2 e 120 caracteres.' })
  }

  const { data: subject, error: subjectError } = await supabase.from('study_subjects').select('id').eq('id', subjectId).maybeSingle()
  if (subjectError) throw createError({ statusCode: 503, statusMessage: 'Não foi possível validar a disciplina.' })
  if (!subject) throw createError({ statusCode: 400, statusMessage: 'Disciplina não encontrada.' })

  if (parentTopicId) {
    const { data: parent, error: parentError } = await supabase.from('study_topics')
      .select('id, subject_id')
      .eq('id', parentTopicId)
      .maybeSingle()
    if (parentError) throw createError({ statusCode: 503, statusMessage: 'Não foi possível validar o assunto pai.' })
    if (!parent || parent.subject_id !== subjectId) {
      throw createError({ statusCode: 400, statusMessage: 'O assunto pai precisa pertencer à mesma disciplina.' })
    }
  }

  const { data, error } = await supabase.from('study_topics')
    .insert({ subject_id: subjectId, parent_topic_id: parentTopicId, name })
    .select('id, subject_id, parent_topic_id, name, created_at')
    .single()

  if (error?.code === '23505') throw createError({ statusCode: 409, statusMessage: 'Este assunto já existe nesse nível da disciplina.' })
  if (error) throw createError({ statusCode: 503, statusMessage: 'Não foi possível cadastrar o assunto.' })
  return { topic: data }
})
