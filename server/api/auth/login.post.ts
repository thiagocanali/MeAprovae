import { createError, readBody } from 'h3'
import { createSupabaseServerClient } from '../../utils/supabase'
import { ensureNeonAuthAvailability, requestNeonAuth, usingNeon } from '../../utils/neon'
import { isValidPassword, normalizeEmail } from '../../../shared/domain/auth/validation'

interface LoginBody { email?: unknown; password?: unknown }

export default defineEventHandler(async (event) => {
  const body = (await readBody<LoginBody>(event)) ?? {}
  const email = normalizeEmail(body.email)
  const password = body.password
  if (!email || !isValidPassword(password)) {
    throw createError({ statusCode: 400, statusMessage: 'Informe e-mail e senha válidos.' })
  }

  if (usingNeon(event)) {
    const result = await requestNeonAuth(event, 'sign-in/email', {
      body: { email, password }, forwardCookies: true,
    })
    ensureNeonAuthAvailability(result)
    if (!result.ok || !result.data?.user?.id) {
      throw createError({ statusCode: 401, statusMessage: 'E-mail ou senha inválidos.' })
    }
    return { user: { id: result.data.user.id, email: result.data.user.email } }
  }

  const supabase = createSupabaseServerClient(event)
  const { data, error } = await supabase.auth.signInWithPassword({ email, password })
  if (error || !data.user) throw createError({ statusCode: 401, statusMessage: 'E-mail ou senha inválidos.' })
  return { user: { id: data.user.id, email: data.user.email } }
})
