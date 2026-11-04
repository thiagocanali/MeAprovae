import { createError, readBody } from 'h3'
import { createSupabaseServerClient, getAuthenticatedUser } from '../../utils/supabase'
import { isUuid } from '../../../shared/domain/common/uuid'

interface SetGoalBody {
  contestId?: unknown
  noticeId?: unknown
  positionId?: unknown
}

export default defineEventHandler(async (event) => {
  const user = await getAuthenticatedUser(event)
  if (!user) throw createError({ statusCode: 401, statusMessage: 'Entre para definir seu objetivo.' })

  const body = (await readBody<SetGoalBody>(event)) ?? {}
  if (!isUuid(body.contestId)
    || (body.noticeId !== undefined && body.noticeId !== null && !isUuid(body.noticeId))
    || (body.positionId !== undefined && body.positionId !== null && !isUuid(body.positionId))) {
    throw createError({ statusCode: 400, statusMessage: 'Selecione um concurso, edital e cargo válidos.' })
  }

  const supabase = createSupabaseServerClient(event)
  const { data, error } = await supabase.rpc('set_student_study_goal', {
    p_contest_id: body.contestId,
    p_notice_id: body.noticeId ?? null,
    p_position_id: body.positionId ?? null,
  })

  if (error) {
    if (error.code === '22023') throw createError({ statusCode: 400, statusMessage: 'O edital ou cargo não pertence ao concurso selecionado.' })
    if (error.code === '28000' || error.code === '42501') throw createError({ statusCode: 401, statusMessage: 'Sua sessão não permite alterar o objetivo.' })
    throw createError({ statusCode: 503, statusMessage: 'Não foi possível salvar seu objetivo.' })
  }

  return { goal: data }
})
