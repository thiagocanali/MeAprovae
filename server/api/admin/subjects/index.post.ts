import { createError, readBody } from 'h3'
import { requirePlatformEditor } from '../../../utils/admin'

interface SubjectBody { name?: unknown }

export default defineEventHandler(async (event) => {
  const { supabase } = await requirePlatformEditor(event)
  const body = (await readBody<SubjectBody>(event)) ?? {}
  const name = typeof body.name === 'string' ? body.name.trim().replace(/\s+/g, ' ') : ''

  if (name.length < 2 || name.length > 100) {
    throw createError({ statusCode: 400, statusMessage: 'O nome da disciplina deve ter entre 2 e 100 caracteres.' })
  }

  const { data, error } = await supabase.from('study_subjects')
    .insert({ name })
    .select('id, name, created_at')
    .single()

  if (error?.code === '23505') throw createError({ statusCode: 409, statusMessage: 'Esta disciplina já está cadastrada.' })
  if (error) throw createError({ statusCode: 503, statusMessage: 'Não foi possível cadastrar a disciplina.' })
  return { subject: data }
})
