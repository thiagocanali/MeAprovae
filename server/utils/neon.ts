import { appendResponseHeader, createError, getHeader, getRequestURL, type H3Event } from 'h3'
import { isUuid } from '../../shared/domain/common/uuid'

interface ManagedUser {
  id: string
  email?: string
  name?: string
}
interface ManagedSession {
  user: ManagedUser
  jwt: string
}
interface ManagedAuthResponse {
  ok: boolean
  status: number
  data: Record<string, any> | null
  jwt: string | null
}


/**
 * Neon Auth issues cookies for its own host/path. When the Nuxt server relays
 * them, the browser needs host-only cookies scoped to the entire application.
 * Never expose a provider cookie without HttpOnly or retain its Domain.
 */
export function normalizeNeonSetCookie(raw: string): string | null {
  if (!raw || /[\r\n]/.test(raw) || !/^[^=;\s]+=[^;]*/.test(raw)) return null
  const parts = raw.split(';').map((part) => part.trim()).filter(Boolean)
  const attributes = parts.slice(1).filter((part) => !/^(?:domain|path|httponly)(?:=|$)/i.test(part))
  return [parts[0], 'Path=/', ...attributes, 'HttpOnly'].join('; ')
}

const sessions = new WeakMap<H3Event, Promise<ManagedSession | null>>()
const synchronized = new WeakMap<H3Event, Promise<void>>()

export function usingNeon(event: H3Event): boolean {
  return useRuntimeConfig(event).backendProvider === 'neon'
}


/** Reject mixing JWTs from one Neon branch with the Data API of another. */
export function neonServicesMatch(authBaseUrl: string, dataApiUrl: string): boolean {
  try {
    const auth = new URL(authBaseUrl)
    const api = new URL(dataApiUrl)
    const authHost = auth.hostname.split('.')
    const apiHost = api.hostname.split('.')
    if (auth.protocol !== 'https:' || api.protocol !== 'https:' ||
      auth.username || auth.password || api.username || api.password ||
      auth.search || auth.hash || api.search || api.hash ||
      authHost.length < 4 || authHost[1] !== 'neonauth' ||
      apiHost[1] !== 'apirest' || authHost[0] !== apiHost[0] ||
      authHost.slice(2).join('.') !== apiHost.slice(2).join('.')) return false
    const authDatabase = auth.pathname.match(/^\/([^/]+)\/auth\/?$/)?.[1]
    const apiDatabase = api.pathname.match(/^\/([^/]+)\/rest\/v1\/?$/)?.[1]
    return !!authDatabase && authDatabase === apiDatabase
  } catch {
    return false
  }
}

function neonAuthUrl(event: H3Event) {
  const config = useRuntimeConfig(event)
  const value = config.neonAuthBaseUrl
  if (value && !neonServicesMatch(String(value), String(config.neonDataApiUrl || ''))) {
    throw createError({ statusCode: 503, statusMessage: 'Neon Auth e Data API devem pertencer à mesma branch.' })
  }
  if (!value) throw createError({ statusCode: 503, statusMessage: 'Neon Auth não configurado.' })
  let url: URL
  try { url = new URL(value) }
  catch { throw createError({ statusCode: 503, statusMessage: 'Configuração do Neon Auth inválida.' }) }
  if (url.protocol !== 'https:' || url.username || url.password || url.search || url.hash) {
    throw createError({ statusCode: 503, statusMessage: 'Configuração do Neon Auth inválida.' })
  }
  return url.toString().replace(/\/$/, '')
}

export async function requestNeonAuth(
  event: H3Event,
  endpoint: 'get-session' | 'token' | 'sign-in/email' | 'sign-up/email' | 'sign-out' | 'request-password-reset' | 'reset-password',
  options: { body?: Record<string, unknown>, forwardCookies?: boolean } = {},
): Promise<ManagedAuthResponse> {
  const base = neonAuthUrl(event)
  const headers = new Headers({ 'content-type': 'application/json', origin: getRequestURL(event).origin })
  const cookie = getHeader(event, 'cookie')
  if (cookie) headers.set('cookie', cookie)
  let response: Response
  try {
    response = await fetch(`${base}/${endpoint}`, {
      method: options.body === undefined ? 'GET' : 'POST',
      headers,
      body: options.body === undefined ? undefined : JSON.stringify(options.body),
      redirect: 'manual',
      cache: 'no-store',
    })
  } catch {
    throw createError({ statusCode: 503, statusMessage: 'Serviço de autenticação temporariamente indisponível.' })
  }

  // Neon Auth cookies are relayed as first-party HttpOnly cookies. Strip a
  // provider Domain attribute; no cookie value is ever logged or returned in JSON.
  if (options.forwardCookies) {
    for (const cookieValue of response.headers.getSetCookie()) {
      const firstParty = normalizeNeonSetCookie(cookieValue)
      if (firstParty) appendResponseHeader(event, 'set-cookie', firstParty)
    }
  }
  const data = await response.json().catch(() => null)
  return {
    ok: response.ok,
    status: response.status,
    data: data && typeof data === 'object' ? data as Record<string, any> : null,
    jwt: response.headers.get('set-auth-jwt'),
  }
}

async function readNeonSession(event: H3Event): Promise<ManagedSession | null> {
  const response = await requestNeonAuth(event, 'get-session', { forwardCookies: true })
  if (response.status === 401 || response.status === 403) return null
  if (!response.ok) throw createError({ statusCode: 503, statusMessage: 'Não foi possível verificar sua sessão.' })
  if (!response.data?.user) return null
  const user = response.data.user as ManagedUser
  if (!isUuid(user?.id)) return null
  // Managed Better Auth exposes short-lived Data API JWTs through its token
  // endpoint. The get-session response is not guaranteed to include a JWT.
  const jwtResponse = await requestNeonAuth(event, 'token')
  const jwt = typeof jwtResponse.data?.token === 'string' ? jwtResponse.data.token.trim() : ''
  if (!jwtResponse.ok || jwt.split('.').length !== 3) {
    throw createError({ statusCode: 503, statusMessage: 'Neon Auth não retornou um token de sessão válido.' })
  }
  return { user: { id: user.id, email: user.email, name: user.name }, jwt }
}

export function getNeonSession(event: H3Event): Promise<ManagedSession | null> {
  let session = sessions.get(event)
  if (!session) {
    session = readNeonSession(event)
    sessions.set(event, session)
  }
  return session
}

export async function ensureNeonAccount(event: H3Event): Promise<ManagedUser | null> {
  const session = await getNeonSession(event)
  if (!session) return null

  // RLS user_id comes from a Neon Auth signed JWT; never accept an ID
  // supplied in request body, query string, or an arbitrary client header.
  let pending = synchronized.get(event)
  if (!pending) {
    pending = (async () => {
      const config = useRuntimeConfig(event)
      const base = String(config.neonDataApiUrl || '')
      if (!base) throw createError({ statusCode: 503, statusMessage: 'Neon Data API não configurado.' })
      const response = await fetchNeonData(event, `${base.replace(/\/$/, '')}/rpc/ensure_neon_student_account`, {
        method: 'POST',
        headers: { authorization: `Bearer ${session.jwt}`, 'content-type': 'application/json' },
        body: JSON.stringify({ p_display_name: session.user.name || null }),
        cache: 'no-store',
      }).catch(() => null)
      if (!response?.ok) {
        throw createError({ statusCode: 503, statusMessage: 'Não foi possível preparar seu perfil.' })
      }
    })()
    synchronized.set(event, pending)
  }
  await pending
  return session.user
}

export async function fetchNeonData(event: H3Event, input: RequestInfo | URL, init?: RequestInit): Promise<Response> {
  const configured = String(useRuntimeConfig(event).neonDataApiUrl || '')
  let endpoint: URL
  let target: URL
  try {
    endpoint = new URL(configured)
    target = new URL(typeof input === 'string' ? input : input instanceof URL ? input.href : input.url)
  } catch {
    throw createError({ statusCode: 503, statusMessage: 'Neon Data API não configurado.' })
  }
  if (endpoint.protocol !== 'https:' || endpoint.username || endpoint.password || endpoint.search || endpoint.hash ||
      target.origin !== endpoint.origin ||
      !(target.pathname === endpoint.pathname || target.pathname.startsWith(`${endpoint.pathname.replace(/\/$/, '')}/`))) {
    throw createError({ statusCode: 503, statusMessage: 'Consulta encaminhada para destino inesperado.' })
  }
  const session = await getNeonSession(event)
  const headers = new Headers(init?.headers)
  headers.delete('authorization')
  headers.delete('apikey')
  if (session) headers.set('authorization', `Bearer ${session.jwt}`)
  // Never follow a Data API redirect while holding an authenticated JWT.
  return fetch(input, { ...init, headers, cache: 'no-store', redirect: 'error' })
}
