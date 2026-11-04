import { getAuthenticatedUser } from '../../utils/supabase'

export default defineEventHandler(async (event) => {
  const user = await getAuthenticatedUser(event)
  return {
    user: user ? { id: user.id, email: user.email } : null,
  }
})
