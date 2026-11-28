import { createError } from 'h3'
import {
  catalogEditor,
  catalogError,
  catalogParams,
  catalogBody,
} from '../../../../../../utils/exam-catalog-editorial'
import { parseCatalogSave } from '../../../../../../../shared/domain/questions/exam-catalog-editorial'
export default defineEventHandler(async (event) => {
  const { supabase } = await catalogEditor(event)
  const { id, version } = catalogParams(event, true)
  const body = parseCatalogSave(await catalogBody(event))
  if (!body)
    throw createError({
      statusCode: 400,
      statusMessage: 'Composição ou revisão esperada inválidas.',
    })
  const { expectedRevision, ...fields } = body
  const { data, error } = await supabase.rpc('write_exam_catalog_draft', {
    p_action: 'save',
    p_model_id: id,
    p_version: version,
    p_expected_revision: expectedRevision,
    p_fields: fields,
  })
  if (error || !data) throw catalogError(error)
  return { ...data, publicationEnabled: false }
})
