import { createServerClient } from '@supabase/ssr'
import type { User } from '@supabase/supabase-js'
import { createError, parseCookies, setCookie, type H3Event } from 'h3'

export function createSupabaseServerClient(event: H3Event) {
  const config = useRuntimeConfig(event)
  const url = config.supabaseUrl
  const anonKey = config.supabaseAnonKey

  if (typeof url !== 'string' || !url || typeof anonKey !== 'string' || !anonKey) {
    throw createError({
      statusCode: 503,
      statusMessage: 'Autenticação indisponível: configure o Supabase no ambiente do servidor.',
    })
  }

  return createServerClient(url, anonKey, {
    cookies: {
      getAll() {
        return Object.entries(parseCookies(event)).map(([name, value]) => ({ name, value }))
      },
      setAll(cookiesToSet) {
        for (const { name, value, options } of cookiesToSet) {
          setCookie(event, name, value, options)
        }
      },
    },
  })
}

export async function getAuthenticatedUser(event: H3Event): Promise<User | null> {
  const supabase = createSupabaseServerClient(event)
  const { data, error } = await supabase.auth.getUser()

  if (error || !data.user) return null
  return data.user
}
