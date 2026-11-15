import { createError } from 'h3'
import { createSupabaseServerClient } from '../../utils/supabase'
import { requestNeonAuth, usingNeon } from '../../utils/neon'

export default defineEventHandler(async (event) => {
  if (usingNeon(event)) {
    const result = await requestNeonAuth(event, 'sign-out', { body: {}, forwardCookies: true })
    if (!result.ok) throw createError({ statusCode: 500, statusMessage: 'Não foi possível encerrar a sessão.' })
    return { success: true }
  }

  const supabase = createSupabaseServerClient(event)
  const { error } = await supabase.auth.signOut({ scope: 'local' })
  if (error) throw createError({ statusCode: 500, statusMessage: 'Não foi possível encerrar a sessão.' })
  return { success: true }
})
