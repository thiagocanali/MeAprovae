import { createError, readBody } from 'h3'
import { createSupabaseServerClient } from '../../utils/supabase'
import { isValidPassword, normalizeDisplayName, normalizeEmail } from '../../../shared/domain/auth/validation'

interface RegisterBody {
  email?: unknown
  password?: unknown
  displayName?: unknown
}

export default defineEventHandler(async (event) => {
  const body = (await readBody<RegisterBody>(event)
  const email = normalizeEmail(body.email)
  const password = body.password
  const displayName = normalizeDisplayName(body.displayName)

  if (!email) {
    throw createError({ statusCode: 400, statusMessage: 'Informe um e-mail válido.' })
  }
  if (!isValidPassword(password)) {
    throw createError({ statusCode: 400, statusMessage: 'A senha deve ter entre 8 e 72 caracteres.' })
  }
  if (!displayName) {
    throw createError({ statusCode: 400, statusMessage: 'Informe um nome entre 2 e 60 caracteres.' })
  }

  const supabase = createSupabaseServerClient(event)
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: { display_name: displayName },
      emailRedirectTo: new URL('/auth/callback', getRequestURL(event)).toString(),
    },
  })

  if (error) {
    throw createError({ statusCode: 400, statusMessage: 'Não foi possível criar a conta. Confira os dados e tente novamente.' })
  }

  return {
    user: data.user ? { id: data.user.id, email: data.user.email } : null,
    requiresEmailConfirmation: !data.session,
  }
})
