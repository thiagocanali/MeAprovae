import { createError, type H3Event } from 'h3'
import { createSupabaseServerClient, getAuthenticatedUser } from './supabase'

export async function requirePlatformEditor(event: H3Event) {
  const user = await getAuthenticatedUser(event)
  if (!user) {
    throw createError({ statusCode: 401, statusMessage: 'Entre para acessar a administração.' })
  }

  const supabase = createSupabaseServerClient(event)
  const { data: allowed, error } = await supabase.rpc('has_platform_role', {
    p_required_role: 'editor',
  })

  if (error) {
    throw createError({
      statusCode: 503,
      statusMessage: 'Não foi possível validar suas permissões administrativas. Verifique a migração editorial.',
    })
  }

  if (allowed !== true) {
    throw createError({ statusCode: 403, statusMessage: 'Sua conta não possui acesso administrativo.' })
  }

  return { user, supabase }
}
