import { createError, getQuery, sendRedirect } from 'h3'
import { createSupabaseServerClient } from '../../utils/supabase'
import { usingNeon } from '../../utils/neon'

export default defineEventHandler(async (event) => {
  // Supabase PKCE codes cannot be exchanged with Neon Managed Auth.
  // Keep legacy callback only for the Supabase environment.
  if (usingNeon(event)) {
    throw createError({ statusCode: 404, statusMessage: 'Fluxo de autenticação indisponível neste ambiente.' })
  }
  const query = getQuery(event)
  const code = typeof query.code === 'string' ? query.code : null

  if (!code) {
    throw createError({ statusCode: 400, statusMessage: 'Código de autenticação ausente ou inválido.' })
  }

  const supabase = createSupabaseServerClient(event)
  const { error } = await supabase.auth.exchangeCodeForSession(code)

  if (error) {
    throw createError({ statusCode: 400, statusMessage: 'Não foi possível confirmar sua autenticação. Solicite um novo link.' })
  }

  const nextPath = query.next === '/redefinir-senha' ? '/redefinir-senha' : '/app'
  return sendRedirect(event, nextPath, 303)
})
