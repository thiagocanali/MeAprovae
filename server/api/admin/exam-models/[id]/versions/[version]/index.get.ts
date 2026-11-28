import {
  catalogEditor,
  catalogError,
  catalogParams,
} from '../../../../../../utils/exam-catalog-editorial'
export default defineEventHandler(async (event) => {
  const { supabase } = await catalogEditor(event)
  const { id, version } = catalogParams(event, true)
  const { data, error } = await supabase
    .from('exam_catalog_versions')
    .select(
      'model_id,version,title,description,kind,status,question_count,duration_minutes,edit_revision,based_on_version,based_on_revision,created_at,exam_catalog_items(position,question_id,subject_id),subjectDistribution:exam_catalog_subject_targets(subjectId:subject_id,questionCount:question_count)',
    )
    .eq('model_id', id)
    .eq('version', version)
    .single()
  if (error || !data) throw catalogError(error)
  const { exam_catalog_items, ...fields } = data
  return {
    version: {
      ...fields,
      items: [...(exam_catalog_items ?? [])].sort(
        (a, b) => a.position - b.position,
      ),
    },
    publicationEnabled: false,
  }
})
