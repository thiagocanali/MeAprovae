import { createError } from 'h3'
import { requirePlatformEditor } from '../../utils/admin'

export default defineEventHandler(async (event) => {
  const { supabase, user } = await requirePlatformEditor(event)

  const count = async (table: string, status?: string) => {
    let query = supabase.from(table).select('id', { count: 'exact', head: true })
    if (status) query = query.eq('status', status)
    const result = await query
    if (result.error) throw createError({ statusCode: 503, statusMessage: 'Não foi possível carregar os indicadores editoriais.' })
    return result.count ?? 0
  }

  const [
    contests, contestDrafts, notices, noticeDrafts, positions, positionDrafts,
    questions, questionDrafts, publishedQuestions, subjects, topics, audit,
    adminRole,
  ] = await Promise.all([
    count('study_contests'), count('study_contests', 'draft'),
    count('study_notices'), count('study_notices', 'draft'),
    count('study_positions'), count('study_positions', 'draft'),
    count('study_questions'), count('study_questions', 'draft'),
    count('study_questions', 'published'), count('study_subjects'), count('study_topics'),
    supabase.from('editorial_audit_log')
      .select('id, actor_id, action, table_name, record_id, occurred_at')
      .order('occurred_at', { ascending: false }).limit(10),
    supabase.from('platform_admins').select('role').eq('user_id', user.id).maybeSingle(),
  ])

  if (audit.error || adminRole.error) {
    throw createError({ statusCode: 503, statusMessage: 'Não foi possível carregar o histórico editorial.' })
  }

  return {
    role: adminRole.data?.role ?? 'editor',
    metrics: {
      contests, contestDrafts, notices, noticeDrafts, positions, positionDrafts,
      questions, questionDrafts, publishedQuestions, subjects, topics,
    },
    recentChanges: audit.data ?? [],
  }
})
