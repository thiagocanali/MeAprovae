import { createError, getRouterParam } from 'h3'
import {
  catalogEditor,
  catalogError,
  catalogParams,
} from '../../../../../../../utils/exam-catalog-editorial'
import { isUuid } from '../../../../../../../../shared/domain/common/uuid'
export default defineEventHandler(async (event) => {
  const { supabase } = await catalogEditor(event)
  const { id, version } = catalogParams(event, true)
  const reviewId = getRouterParam(event, 'reviewId')
  if (!isUuid(reviewId))
    throw createError({ statusCode: 400, statusMessage: 'Parecer inválido.' })
  const { data, error } = await supabase
    .from('exam_catalog_reviews')
    .select(
      'id,model_id,version,edit_revision,fingerprint,reviewer_id,reviewer_role,decision,notes,rights,attestations,created_at,content_snapshot',
    )
    .eq('model_id', id)
    .eq('version', version)
    .eq('id', reviewId)
    .single()
  if (error || !data) throw catalogError(error)
  return { review: data, publicationEnabled: false }
})
