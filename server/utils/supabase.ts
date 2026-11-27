import { createServerClient } from '@supabase/ssr'
import type { User } from '@supabase/supabase-js'
import { createError, parseCookies, setCookie, setHeader, type H3Event } from 'h3'

export function createSupabaseServerClient(event: H3Event) {
  // Includes SSR responses and failures, even when no token refresh occurs.
  setHeader(event, 'Cache-Control', 'private, no-store')
  const config = useRuntimeConfig(event)
  const environment = (globalThis as { process?: { env?: Record<string, string | undefined> } }).process?.env ?? {}
  const url = config.supabaseUrl || environment.SUPABASE_URL
  const anonKey = config.supabaseAnonKey || environment.SUPABASE_ANON_KEY

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
      setAll(cookiesToSet, headers) {
        for (const [name, value] of Object.entries(headers ?? {})) {
          setHeader(event, name, value)
        }
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
