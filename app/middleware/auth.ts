export default defineNuxtRouteMiddleware(async (to) => {
  if (!to.path.startsWith('/app') && !to.path.startsWith('/admin') && to.path !== '/redefinir-senha') return

  // Reset links carry a one-time token and must be accessible without a session.
  if (to.path === '/redefinir-senha' && typeof to.query.token === 'string' && to.query.token.length > 0) return

  try {
    const requestFetch = useRequestFetch()
    const result = await requestFetch<{ user: { id: string } | null }>('/api/auth/me')

    if (!result.user) return navigateTo('/login')
  } catch {
    return navigateTo('/login')
  }
})
