import { createError } from 'h3'
import {
  catalogBody,
  catalogEditor,
  catalogError,
  catalogParams,
} from '../../../../../../../utils/exam-catalog-editorial'
import { parseCatalogReview } from '../../../../../../../../shared/domain/questions/exam-catalog-review'
export default defineEventHandler(async (event) => {
  const { supabase } = await catalogEditor(event)
  const { id, version } = catalogParams(event, true)
  const body = parseCatalogReview(await catalogBody(event, 64 * 1024))
  if (!body)
    throw createError({
      statusCode: 400,
      statusMessage:
        'Parecer, declarações ou evidências de direitos inválidos.',
    })
  const { data, error } = await supabase.rpc('record_exam_catalog_review', {
    p_model_id: id,
    p_version: version,
    p_fields: body,
  })
  if (error || !data) throw catalogError(error)
  return data
})
