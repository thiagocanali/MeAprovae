import { createError, getRouterParam } from 'h3'
import { isUuid } from '../../../../shared/domain/common/uuid'
import { relatedRow } from '../../../utils/related-row'
import { requirePlatformEditor } from '../../../utils/admin'
export default defineEventHandler(async event => {
  const { supabase } = await requirePlatformEditor(event)
  const id = getRouterParam(event, 'id')
  if (!isUuid(id)) throw createError({ statusCode: 400, statusMessage: 'Lote inválido.' })
  const { data, error } = await supabase.from('question_content_release_items')
    .select('external_id, question_id, rights_evidence, study_questions(statement, status, difficulty_reviewed, study_topics(name))')
    .eq('release_id', id).order('external_id').limit(100)
  if (error) throw createError({ statusCode: 503, statusMessage: 'Não foi possível carregar as questões do lote.' })
  return { questions: (data ?? []).map(item => {
    const question = relatedRow(item.study_questions)
    return {
    id: item.question_id, externalId: item.external_id, rightsEvidence: item.rights_evidence,
    statement: question?.statement ?? '', status: question?.status ?? 'unavailable',
    difficultyReviewed: question?.difficulty_reviewed ?? false, topic: relatedRow(question?.study_topics)?.name ?? '',
    }
  }) }
})
