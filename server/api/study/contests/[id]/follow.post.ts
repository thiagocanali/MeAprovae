import { createError, getRouterParam } from 'h3'
import { createSupabaseServerClient, getAuthenticatedUser } from '../../../../utils/supabase'
import { isUuid } from '../../../../../shared/domain/common/uuid'

export default defineEventHandler(async (event) => {
  const user = await getAuthenticatedUser(event)
  if (!user) throw createError({ statusCode: 401, statusMessage: 'Entre para acompanhar concursos.' })

  const contestId = getRouterParam(event, 'id')
  if (!isUuid(contestId)) throw createError({ statusCode: 400, statusMessage: 'Concurso inválido.' })

  const supabase = createSupabaseServerClient(event)
  const { error } = await supabase
    .from('student_contests')
    .upsert({ user_id: user.id, contest_id: contestId }, { onConflict: 'user_id,contest_id', ignoreDuplicates: true })

  if (error) throw createError({ statusCode: 400, statusMessage: 'Não foi possível acompanhar este concurso.' })
  return { followed: true }
})
