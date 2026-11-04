import { createError, readBody } from 'h3'
import { requirePlatformEditor } from '../../../utils/admin'

interface ContestBody {
  slug?: unknown
  title?: unknown
  organization?: unknown
  examBoard?: unknown
}

export default defineEventHandler(async (event) => {
  const { supabase } = await requirePlatformEditor(event)
  const body = (await readBody<ContestBody>(event)) ?? {}
  const slug = typeof body.slug === 'string' ? body.slug.trim().toLowerCase() : ''
  const title = typeof body.title === 'string' ? body.title.trim() : ''
  const organization = typeof body.organization === 'string' ? body.organization.trim() : ''
  const examBoard = typeof body.examBoard === 'string' ? body.examBoard.trim() : ''

  if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug)) {
    throw createError({ statusCode: 400, statusMessage: 'Informe um slug válido, usando letras minúsculas, números e hífens.' })
  }
  if (title.length < 3 || title.length > 180) {
    throw createError({ statusCode: 400, statusMessage: 'O título deve ter entre 3 e 180 caracteres.' })
  }
  if (organization.length > 160 || examBoard.length > 160) {
    throw createError({ statusCode: 400, statusMessage: 'Órgão e banca devem ter até 160 caracteres.' })
  }

  const { data, error } = await supabase.from('study_contests').insert({
    slug, title, organization: organization || null, exam_board: examBoard || null, status: 'draft',
  }).select('id, slug, title, organization, exam_board, status, created_at').single()

  if (error?.code === '23505') throw createError({ statusCode: 409, statusMessage: 'Já existe um concurso com este slug.' })
  if (error) throw createError({ statusCode: 503, statusMessage: 'Não foi possível criar o concurso.' })
  return { contest: data }
})
