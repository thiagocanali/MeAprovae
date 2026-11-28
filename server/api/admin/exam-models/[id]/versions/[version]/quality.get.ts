import { createError, getQuery } from 'h3'
import {
  catalogEditor,
  catalogError,
  catalogParams,
} from '../../../../../../utils/exam-catalog-editorial'
import { parseQuestionPagination } from '../../../../../../../shared/domain/questions/pagination'
import { analyzeCatalogQuality } from '../../../../../../../shared/domain/questions/exam-catalog-quality'
export default defineEventHandler(async (event) => {
  const { supabase } = await catalogEditor(event),
    { id, version } = catalogParams(event, true),
    query = getQuery(event),
    pagination = parseQuestionPagination(query.page, query.pageSize)
  if (
    !pagination ||
    pagination.page > 1000000 ||
    pagination.pageSize > 20 ||
    Object.keys(query).some((k) => !['page', 'pageSize'].includes(k))
  )
    throw createError({ statusCode: 400, statusMessage: 'Paginação inválida.' })
  const { data, error } = await supabase.rpc('get_exam_catalog_quality', {
    p_model_id: id,
    p_version: version,
    p_page: pagination.page,
    p_page_size: pagination.pageSize,
  })
  if (error || !data) throw catalogError(error)
  const { questions, ...metadata } = data
  return {
    ...metadata,
    ...analyzeCatalogQuality(questions, data.subjectDistribution),
  }
})
