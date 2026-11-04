import { createError, readBody } from 'h3'
import { createSupabaseServerClient, getAuthenticatedUser } from '../../utils/supabase'
import { isValidPassword } from '../../../shared/domain/auth/validation'

interface UpdatePasswordBody {
  password?: unknown
}

export default defineEventHandler(async (event) => {
  const user = await getAuthenticatedUser(event)
  if (!user) {
    throw createError({ statusCode: 401, statusMessage: 'Sua sessão expirou. Solicite um novo link de recuperação.' })
  }

  const body = await readBody<UpdatePasswordBody>(event)
  if (!isValidPassword(body.password)) {
    throw createError({ statusCode: 400, statusMessage: 'A senha deve ter entre 8 e 72 caracteres.' })
  }

  const supabase = createSupabaseServerClient(event)
  const { error } = await supabase.auth.updateUser({ password: body.password })

  if (error) {
    throw createError({ statusCode: 400, statusMessage: 'Não foi possível atualizar a senha. Solicite um novo link.' })
  }

  return { success: true }
})
