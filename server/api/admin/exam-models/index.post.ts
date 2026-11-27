import { createError } from 'h3'
import {
  catalogEditor,
  catalogBody,
  catalogError,
} from '../../../utils/exam-catalog-editorial'
import { parseCatalogCreate } from '../../../../shared/domain/questions/exam-catalog-editorial'

export default defineEventHandler(async (event) => {
  const { supabase } = await catalogEditor(event)
  const body = parseCatalogCreate(await catalogBody(event))
  if (!body)
    throw createError({
      statusCode: 400,
      statusMessage: 'Dados de modelo inválidos.',
    })
  const { modelId, ...fields } = body
  const { data, error } = await supabase.rpc('write_exam_catalog_draft', {
    p_action: 'create',
    p_model_id: modelId,
    p_version: 1,
    p_expected_revision: null,
    p_fields: fields,
  })
  if (error || !data) throw catalogError(error)
  return { ...data, publicationEnabled: false }
})
