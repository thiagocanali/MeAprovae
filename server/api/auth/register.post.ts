import { createError, readBody } from 'h3'
import { createSupabaseServerClient } from '../../utils/supabase'

interface RegisterBody {
  email?: string
  password?: string
  displayName?: string
}

export default defineEventHandler(async (event) => {
  const body = await readBody<RegisterBody>(event)
  const email = body.email?.trim().toLowerCase()
  const password = body.password
  const displayName = body.displayName?.trim()

  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    throw createError({ statusCode: 400, statusMessage: 'Informe um e-mail válido.' })
  }
  if (!password || password.length < 8 || password.length > 72) {
    throw createError({ statusCode: 400, statusMessage: 'A senha deve ter entre 8 e 72 caracteres.' })
  }
  if (!displayName || displayName.length < 2 || displayName.length > 60) {
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
    // Do not expose provider internals or reveal whether an address is registered.
    throw createError({ statusCode: 400, statusMessage: 'Não foi possível criar a conta. Confira os dados e tente novamente.' })
  }

  return {
    user: data.user ? { id: data.user.id, email: data.user.email } : null,
    requiresEmailConfirmation: !data.session,
  }
})
