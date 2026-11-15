import { createError, getRequestURL, readBody } from 'h3'
import { createSupabaseServerClient } from '../../utils/supabase'
import { ensureNeonAuthAvailability, requestNeonAuth, usingNeon } from '../../utils/neon'
import { normalizeEmail } from '../../../shared/domain/auth/validation'

interface RecoverBody { email?: unknown }

export default defineEventHandler(async (event) => {
  const body = (await readBody<RecoverBody>(event)) ?? {}
  const email = normalizeEmail(body.email)
  if (!email) throw createError({ statusCode: 400, statusMessage: 'Informe um e-mail válido.' })

  if (usingNeon(event)) {
    const redirectTo = new URL('/redefinir-senha', getRequestURL(event)).toString()
    const result = await requestNeonAuth(event, 'request-password-reset', { body: { email, redirectTo } })
    ensureNeonAuthAvailability(result)
    if (!result.ok) throw createError({ statusCode: 400, statusMessage: 'Não foi possível solicitar a recuperação. Tente novamente mais tarde.' })
    return { success: true }
  }

  const supabase = createSupabaseServerClient(event)
  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: new URL('/auth/callback?next=%2Fredefinir-senha', getRequestURL(event)).toString(),
  })
  if (error) throw createError({ statusCode: 400, statusMessage: 'Não foi possível solicitar a recuperação. Tente novamente mais tarde.' })
  return { success: true }
})
