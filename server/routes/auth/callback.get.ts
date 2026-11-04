import { createError, getQuery, sendRedirect } from 'h3'
import { createSupabaseServerClient } from '../../utils/supabase'

export default defineEventHandler(async (event) => {
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

  return sendRedirect(event, '/app', 303)
})
