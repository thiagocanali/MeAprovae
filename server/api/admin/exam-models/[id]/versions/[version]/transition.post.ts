import { createError } from 'h3'
import {
  catalogEditor,
  catalogError,
  catalogParams,
  catalogBody,
} from '../../../../../../utils/exam-catalog-editorial'
import { parseCatalogTransition } from '../../../../../../../shared/domain/questions/exam-catalog-editorial'
export default defineEventHandler(async (event) => {
  const { supabase } = await catalogEditor(event)
  const { id, version } = catalogParams(event, true)
  const body = parseCatalogTransition(await catalogBody(event))
  if (!body)
    throw createError({
      statusCode: 400,
      statusMessage: 'Transição de rascunho inválida.',
    })
  const { data, error } = await supabase.rpc('write_exam_catalog_draft', {
    p_action: body.action,
    p_model_id: id,
    p_version: version,
    p_expected_revision: body.expectedRevision,
    p_fields: {},
  })
  if (error || !data) throw catalogError(error)
  return { ...data, publicationEnabled: false }
})
