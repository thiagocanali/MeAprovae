import { createError, readBody } from 'h3'
import { createSupabaseServerClient } from '../../utils/supabase'

interface LoginBody {
  email?: string
  password?: string
}

export default defineEventHandler(async (event) => {
  const body = await readBody<LoginBody>(event)
  const email = body.email?.trim().toLowerCase()
  const password = body.password

  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || !password) {
    throw createError({ statusCode: 400, statusMessage: 'Informe e-mail e senha válidos.' })
  }

  const supabase = createSupabaseServerClient(event)
  const { data, error } = await supabase.auth.signInWithPassword({ email, password })

  if (error || !data.user) {
    throw createError({ statusCode: 401, statusMessage: 'E-mail ou senha inválidos.' })
  }

  return { user: { id: data.user.id, email: data.user.email } }
})
