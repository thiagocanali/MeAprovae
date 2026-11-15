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

const sessions = new WeakMap<H3Event, Promise<ManagedSession | null>>()
const synchronized = new WeakMap<H3Event, Promise<void>>()

export function usingNeon(event: H3Event): boolean {
  return useRuntimeConfig(event).backendProvider === 'neon'
}

function neonAuthUrl(event: H3Event) {
  const value = useRuntimeConfig(event).neonAuthBaseUrl
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
  endpoint: 'get-session' | 'sign-in/email' | 'sign-up/email' | 'sign-out' | 'request-password-reset' | 'reset-password',
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
      appendResponseHeader(event, 'set-cookie', cookieValue.replace(/;\s*domain=[^;]*/gi, ''))
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
  if (response.status === 401 || response.status === 403 || !response.data?.user) return null
  if (!response.ok) throw createError({ statusCode: 503, statusMessage: 'Não foi possível verificar sua sessão.' })
  const user = response.data.user as ManagedUser
  if (!isUuid(user?.id)) return null
  const jwt = response.jwt?.replace(/^Bearer\s+/i, '').trim()
  if (!jwt || jwt.split('.').length !== 3) {
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
      const response = await fetch(`${base.replace(/\/$/, '')}/rpc/ensure_neon_student_account`, {
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
  if (endpoint.protocol !== 'https:' || endpoint.username || endpoint.password ||
      target.origin !== endpoint.origin ||
      !(target.pathname === endpoint.pathname || target.pathname.startsWith(`${endpoint.pathname.replace(/\/$/, '')}/`))) {
    throw createError({ statusCode: 503, statusMessage: 'Consulta encaminhada para destino inesperado.' })
  }
  const session = await getNeonSession(event)
  const headers = new Headers(init?.headers)
  headers.delete('authorization')
  headers.delete('apikey')
  if (session) headers.set('authorization', `Bearer ${session.jwt}`)
  return fetch(input, { ...init, headers, cache: 'no-store' })
}
