import {
  catalogEditor,
  catalogError,
  catalogParams,
} from '../../../../utils/exam-catalog-editorial'
export default defineEventHandler(async (event) => {
  const { supabase } = await catalogEditor(event)
  const { id } = catalogParams(event)
  const { data: model, error } = await supabase
    .from('exam_catalog_models')
    .select('id,title,description,kind,created_at')
    .eq('id', id)
    .single()
  if (error || !model) throw catalogError(error)
  const { data: versions, error: versionsError } = await supabase
    .from('exam_catalog_versions')
    .select(
      'version,title,description,kind,status,question_count,duration_minutes,edit_revision,based_on_version,based_on_revision,created_at',
    )
    .eq('model_id', id)
    .order('version', { ascending: false })
    .limit(101)
  if (versionsError) throw catalogError(versionsError)
  return {
    model,
    versions: (versions ?? []).slice(0, 100),
    publicationEnabled: false,
    versionsTruncated: (versions?.length ?? 0) > 100,
    versionLimit: 100,
  }
})
