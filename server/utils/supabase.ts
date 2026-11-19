import { createServerClient } from '@supabase/ssr'
import { createError, parseCookies, setCookie, type H3Event } from 'h3'
import { ensureNeonAccount, fetchNeonData, usingNeon } from './neon'

export interface AuthenticatedUser {
  id: string
  email?: string
}

export function createSupabaseServerClient(event: H3Event) {
  const config = useRuntimeConfig(event)
  const environment = (globalThis as { process?: { env?: Record<string, string | undefined> } }).process?.env ?? {}

  if (usingNeon(event)) {
    // Transitional PostgREST adapter: preserve all current query builders
    // while using Neon's Data API and a JWT verified by Managed Neon Auth.
    // Supabase Auth is intentionally disabled in this mode; auth endpoints
    // use requestNeonAuth(), not this client's .auth property.
    const dataApiUrl = String(config.neonDataApiUrl || '')
    if (!dataApiUrl.endsWith('/rest/v1')) {
      throw createError({ statusCode: 503, statusMessage: 'Configure NEON_DATA_API_URL com /rest/v1.' })
    }
    const base = dataApiUrl.slice(0, -'/rest/v1'.length)
    return createServerClient(base, 'neon-postgrest-compat', {
      auth: { autoRefreshToken: false, persistSession: false, detectSessionInUrl: false },
      global: { fetch: (input, init) => fetchNeonData(event, input, init) },
      cookies: { getAll: () => [], setAll: () => {} },
    })
  }

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
      setAll(cookiesToSet) {
        for (const { name, value, options } of cookiesToSet) {
          setCookie(event, name, value, options)
        }
      },
    },
  })
}

export async function getAuthenticatedUser(event: H3Event): Promise<AuthenticatedUser | null> {
  if (usingNeon(event)) {
    return await ensureNeonAccount(event)
  }

  const supabase = createSupabaseServerClient(event)
  const { data, error } = await supabase.auth.getUser()
  if (error || !data.user) return null
  return { id: data.user.id, email: data.user.email }
}
