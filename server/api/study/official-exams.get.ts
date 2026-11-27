import { createError, setHeader } from 'h3'
import catalog from '../../../content/sources/official-exams.json'
import { getAuthenticatedUser } from '../../utils/supabase'
export default defineEventHandler(async (event) => {
  setHeader(event, 'Cache-Control', 'private, no-store')
  if (!(await getAuthenticatedUser(event)))
    throw createError({
      statusCode: 401,
      statusMessage: 'Entre para consultar as provas oficiais.',
    })
  return catalog
})
