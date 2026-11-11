import { createError } from 'h3'
import { relatedRow } from '../../../utils/related-row'
import { requirePlatformEditor } from '../../../utils/admin'
export default defineEventHandler(async event => {
  const { supabase } = await requirePlatformEditor(event)
  const { data, error } = await supabase.from('question_content_releases')
    .select('id, release_name, question_count, content_sha256, git_commit, installed_at, question_content_release_items(study_questions(status, difficulty_reviewed))')
    .order('installed_at', { ascending: false }).limit(50)
  if (error) throw createError({ statusCode: 503, statusMessage: 'Não foi possível carregar os lotes do acervo.' })
  return { releases: (data ?? []).map(release => {
    const items = (release.question_content_release_items ?? []).map(item => relatedRow(item.study_questions))
    return { id: release.id, name: release.release_name, questionCount: release.question_count,
      contentHash: release.content_sha256, gitCommit: release.git_commit, installedAt: release.installed_at,
      drafts: items.filter(item => item?.status === 'draft').length,
      published: items.filter(item => item?.status === 'published').length,
      archived: items.filter(item => item?.status === 'archived').length,
      difficultyPending: items.filter(item => item && !item.difficulty_reviewed).length,
    }
  }) }
})
