import { createError, getRouterParam } from 'h3'
import { createSupabaseServerClient, getAuthenticatedUser } from '../../../../utils/supabase'
import { isUuid } from '../../../../../shared/domain/common/uuid'

export default defineEventHandler(async (event) => {
  const user = await getAuthenticatedUser(event)
  if (!user) throw createError({ statusCode: 401, statusMessage: 'Entre para atualizar suas favoritas.' })

  const questionId = getRouterParam(event, 'id')
  if (!isUuid(questionId)) throw createError({ statusCode: 400, statusMessage: 'Questão inválida.' })

  const supabase = createSupabaseServerClient(event)
  const { error } = await supabase
    .from('student_question_favorites')
    .delete()
    .eq('user_id', user.id)
    .eq('question_id', questionId)

  if (error) throw createError({ statusCode: 400, statusMessage: 'Não foi possível remover esta questão das favoritas.' })
  return { favorited: false }
})
