import {
  catalogEditor,
  catalogError,
  catalogParams,
} from '../../../../../../utils/exam-catalog-editorial'
import type { ReviewContext } from '../../../../../../../shared/domain/questions/exam-catalog-review'
export default defineEventHandler(async (event): Promise<ReviewContext> => {
  const { supabase } = await catalogEditor(event)
  const { id, version } = catalogParams(event, true)
  const { data, error } = await supabase.rpc(
    'get_exam_catalog_review_context',
    { p_model_id: id, p_version: version },
  )
  if (error || !data) throw catalogError(error)
  return data as ReviewContext
})
