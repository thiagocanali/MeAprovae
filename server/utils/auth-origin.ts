import { createError, getRequestURL, type H3Event } from 'h3'

/** Authentication links must never inherit an untrusted Host header. */
export function resolveAuthRedirectOrigin(configured: string, requestUrl: string, development = false): string {
  const value = configured.trim()
  if (!value && development) {
    const local = new URL(requestUrl)
    if ((local.hostname === 'localhost' || local.hostname === '127.0.0.1') &&
      (local.protocol === 'http:' || local.protocol === 'https:') && !local.username && !local.password) {
      return local.origin
    }
  }
  if (!value) throw new Error('AUTH_REDIRECT_ORIGIN is required outside local development')
  let url: URL
  try { url = new URL(value) }
  catch { throw new Error('AUTH_REDIRECT_ORIGIN must be a valid origin') }
  const local = url.hostname === 'localhost' || url.hostname === '127.0.0.1'
  if ((!local && url.protocol !== 'https:') ||
    (local && (url.protocol !== 'https:' && !(development && url.protocol === 'http:'))) ||
    url.username || url.password || url.pathname !== '/' || url.search || url.hash) {
    throw new Error('AUTH_REDIRECT_ORIGIN must be a trusted HTTPS origin')
  }
  return url.origin
}

export function getAuthRedirectOrigin(event: H3Event): string {
  try {
    const config = useRuntimeConfig(event)
    return resolveAuthRedirectOrigin(
      String(config.authRedirectOrigin || ''),
      getRequestURL(event).toString(),
      import.meta.dev,
    )
  } catch {
    throw createError({ statusCode: 503, statusMessage: 'Origem de autenticação não configurada.' })
  }
}
