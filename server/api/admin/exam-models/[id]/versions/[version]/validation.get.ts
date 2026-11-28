import { inspectSubjectTargets } from '../../../../../../../shared/domain/questions/exam-catalog-quality'
import {
  catalogEditor,
  catalogError,
  catalogParams,
} from '../../../../../../utils/exam-catalog-editorial'
import { relatedRow } from '../../../../../../utils/related-row'
import { inspectCatalogComposition } from '../../../../../../../shared/domain/questions/exam-catalog-editorial'
export default defineEventHandler(async (event) => {
  const { supabase } = await catalogEditor(event)
  const { id, version } = catalogParams(event, true)
  const { data, error } = await supabase
    .from('exam_catalog_versions')
    .select(
      'status,kind,question_count,edit_revision,subjectDistribution:exam_catalog_subject_targets(subjectId:subject_id,questionCount:question_count),exam_catalog_items(position,question_id,subject_id,study_questions(subject_id,status,study_notices(status,study_contests(status))))',
    )
    .eq('model_id', id)
    .eq('version', version)
    .single()
  if (error || !data) throw catalogError(error)
  const result = inspectCatalogComposition(
    data.kind,
    data.question_count,
    (data.exam_catalog_items ?? []).map((item) => {
      const question = relatedRow(item.study_questions),
        notice = relatedRow(question?.study_notices),
        contest = relatedRow(notice?.study_contests)
      return {
        position: item.position,
        questionId: item.question_id,
        subjectId: item.subject_id,
        sourceSubjectId: question?.subject_id ?? null,
        sourceAvailable:
          !!question &&
          !!notice &&
          !!contest &&
          ![question.status, notice.status, contest.status].includes(
            'archived',
          ),
      }
    }),
  )
  if (
    !inspectSubjectTargets(result.distribution, data.subjectDistribution ?? [])
  ) {
    result.issues.push('targets')
    result.readyForReview = false
  }
  return {
    ...result,
    subjectDistribution: data.subjectDistribution ?? [],
    status: data.status,
    editRevision: data.edit_revision,
    canRequestReview: data.status === 'draft' && result.readyForReview,
    publicationEnabled: false,
  }
})
