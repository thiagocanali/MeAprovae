import { createError, readBody } from 'h3'
import { createSupabaseServerClient } from '../../utils/supabase'
import { getAuthRedirectOrigin } from '../../utils/auth-origin'
import { normalizeEmail } from '../../../shared/domain/auth/validation'

interface RecoverBody {
  email?: unknown
}

export default defineEventHandler(async (event) => {
  const body = (await readBody<RecoverBody>(event)) ?? {}
  const email = normalizeEmail(body.email)
  if (!email) throw createError({ statusCode: 400, statusMessage: 'Informe um e-mail válido.' })

  const supabase = createSupabaseServerClient(event)
  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: new URL('/auth/callback?next=%2Fredefinir-senha', getAuthRedirectOrigin(event)).toString(),
  })

  if (error) throw createError({ statusCode: 400, statusMessage: 'Não foi possível solicitar a recuperação. Tente novamente mais tarde.' })
  return { success: true }
})
