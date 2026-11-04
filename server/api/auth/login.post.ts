import { createError, readBody } from 'h3'
import { createSupabaseServerClient } from '../../utils/supabase'
import { isValidPassword, normalizeEmail } from '../../../shared/domain/auth/validation'

interface LoginBody {
  email?: unknown
  password?: unknown
}

export default defineEventHandler(async (event) => {
  const body = (await readBody<LoginBody>(event)
  const email = normalizeEmail(body.email)
  const password = body.password

  if (!email || !isValidPassword(password)) {
    throw createError({ statusCode: 400, statusMessage: 'Informe e-mail e senha válidos.' })
  }

  const supabase = createSupabaseServerClient(event)
  const { data, error } = await supabase.auth.signInWithPassword({ email, password })

  if (error || !data.user) {
    throw createError({ statusCode: 401, statusMessage: 'E-mail ou senha inválidos.' })
  }

  return { user: { id: data.user.id, email: data.user.email } }
})
