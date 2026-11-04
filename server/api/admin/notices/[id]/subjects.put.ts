import { createError, getRouterParam, readBody } from 'h3'
import { requirePlatformEditor } from '../../../../utils/admin'
import { isUuid } from '../../../../../shared/domain/common/uuid'

interface SubjectAssignmentBody { subjectIds?: unknown }

export default defineEventHandler(async (event) => {
  const { supabase } = await requirePlatformEditor(event)
  const noticeId = getRouterParam(event, 'id')
  if (!isUuid(noticeId)) throw createError({ statusCode: 400, statusMessage: 'Identificador de edital inválido.' })

  const body = (await readBody<SubjectAssignmentBody>(event)) ?? {}
  if (!Array.isArray(body.subjectIds) || body.subjectIds.length > 100 || !body.subjectIds.every(isUuid)) {
    throw createError({ statusCode: 400, statusMessage: 'Informe uma lista válida de até 100 disciplinas.' })
  }

  const { data, error } = await supabase.rpc('set_notice_subjects', {
    p_notice_id: noticeId,
    p_subject_ids: body.subjectIds,
  })

  if (error?.code === 'P0002') throw createError({ statusCode: 404, statusMessage: 'Edital não encontrado.' })
  if (error?.code === '23514') throw createError({ statusCode: 409, statusMessage: 'Despublique o edital antes de alterar suas disciplinas.' })
  if (error?.code === '22023') throw createError({ statusCode: 400, statusMessage: 'A lista contém disciplinas inválidas ou repetidas.' })
  if (error) throw createError({ statusCode: 503, statusMessage: 'Não foi possível atualizar as disciplinas do edital.' })
  return { assignment: data }
})
