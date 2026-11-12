import { createError, setHeader, type H3Event } from 'h3'
import { createSupabaseServerClient, getAuthenticatedUser } from './supabase'
export async function comparisonClient(event: H3Event) {
  setHeader(event, 'cache-control', 'private, no-store')
  if (!await getAuthenticatedUser(event)) throw createError({ statusCode: 401, statusMessage: 'Entre para acessar a comparação de prática.' })
  return createSupabaseServerClient(event)
}
