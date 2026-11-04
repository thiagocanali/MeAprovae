import { createError } from 'h3'
import { createSupabaseServerClient } from '../../utils/supabase'

export default defineEventHandler(async (event) => {
  const supabase = createSupabaseServerClient(event)
  const { error } = await supabase.auth.signOut({ scope: 'local' })

  if (error) {
    throw createError({ statusCode: 500, statusMessage: 'Não foi possível encerrar a sessão.' })
  }

  return { success: true }
})
