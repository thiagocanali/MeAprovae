import { createError, readBody } from 'h3'
import { createSupabaseServerClient, getAuthenticatedUser } from '../../utils/supabase'
import { requestNeonAuth, usingNeon } from '../../utils/neon'
import { isValidPassword } from '../../../shared/domain/auth/validation'

interface UpdatePasswordBody { password?: unknown; token?: unknown }

export default defineEventHandler(async (event) => {
  const body = (await readBody<UpdatePasswordBody>(event)) ?? {}
  if (!isValidPassword(body.password)) throw createError({ statusCode: 400, statusMessage: 'A senha deve ter entre 8 e 72 caracteres.' })

  if (usingNeon(event)) {
    const token = typeof body.token === 'string' ? body.token.trim() : ''
    if (!token || token.length > 4096) throw createError({ statusCode: 400, statusMessage: 'Link de recuperação inválido ou ausente.' })
    const result = await requestNeonAuth(event, 'reset-password', { body: { token, newPassword: body.password }, forwardCookies: true })
    if (!result.ok) throw createError({ statusCode: 400, statusMessage: 'Não foi possível atualizar a senha. Solicite um novo link.' })
    return { success: true }
  }

  const user = await getAuthenticatedUser(event)
  if (!user) throw createError({ statusCode: 401, statusMessage: 'Sua sessão expirou. Solicite um novo link de recuperação.' })
  const supabase = createSupabaseServerClient(event)
  const { error } = await supabase.auth.updateUser({ password: body.password })
  if (error) throw createError({ statusCode: 400, statusMessage: 'Não foi possível atualizar a senha. Solicite um novo link.' })
  return { success: true }
})
