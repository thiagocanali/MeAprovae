export default defineNuxtRouteMiddleware(async (to) => {
  if (!to.path.startsWith('/app')) return

  try {
    const requestFetch = useRequestFetch()
    const result = await requestFetch<{ user: { id: string } | null }>('/api/auth/me')

    if (!result.user) return navigateTo('/login')
  } catch {
    return navigateTo('/login')
  }
})
