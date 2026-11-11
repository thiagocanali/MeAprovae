import { createError } from 'h3'
import { examClient } from '../../../utils/exams'

export default defineEventHandler(async event => {
  const client = await examClient(event)
  const { data, error } = await client.from('exam_sessions')
    .select('id, question_count, answered_count, correct_count, status, started_at, expires_at, finished_at')
    .order('started_at', { ascending: false }).limit(50)
  if (error) throw createError({ statusCode: 503, statusMessage: 'Não foi possível carregar seus simulados.' })
  const now = Date.now()
  return { sessions: (data ?? []).map(session => ({ ...session,
    status: session.status === 'active' && Date.parse(session.expires_at) <= now ? 'expired' : session.status,
    score: Math.round(session.correct_count / session.question_count * 1000) / 10,
  })) }
})
