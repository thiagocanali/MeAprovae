import { createError } from 'h3'
import {
  catalogEditor,
  catalogError,
  catalogParams,
  catalogBody,
} from '../../../../../utils/exam-catalog-editorial'
import { parseCatalogClone } from '../../../../../../shared/domain/questions/exam-catalog-editorial'
export default defineEventHandler(async (event) => {
  const { supabase } = await catalogEditor(event)
  const { id } = catalogParams(event)
  const body = parseCatalogClone(await catalogBody(event))
  if (!body)
    throw createError({
      statusCode: 400,
      statusMessage: 'Origem ou número de versão inválidos.',
    })
  const { data, error } = await supabase.rpc('write_exam_catalog_draft', {
    p_action: 'clone',
    p_model_id: id,
    p_version: body.version,
    p_expected_revision: body.sourceRevision,
    p_fields: { sourceVersion: body.sourceVersion },
  })
  if (error || !data) throw catalogError(error)
  return { ...data, publicationEnabled: false }
})
