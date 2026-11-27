import { defineEventHandler, getRequestURL, setHeader } from 'h3'

/** Never cache personal responses or auth errors, including SSR and redirects. */
export default defineEventHandler((event) => {
  const path = getRequestURL(event).pathname
  const privateRoots = [
    '/api/auth',
    '/api/study',
    '/api/admin',
    '/app',
    '/admin',
  ]
  if (
    privateRoots.some((root) => path === root || path.startsWith(`${root}/`)) ||
    path === '/auth/callback' ||
    path === '/redefinir-senha'
  ) {
    setHeader(event, 'Cache-Control', 'private, no-store')
    setHeader(event, 'Pragma', 'no-cache')
    setHeader(event, 'Expires', '0')
  }
})
