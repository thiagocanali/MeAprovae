import { createError, getQuery } from 'h3'
import {
  catalogEditor,
  catalogError,
  catalogParams,
} from '../../../../../../../utils/exam-catalog-editorial'
import { parseQuestionPagination } from '../../../../../../../../shared/domain/questions/pagination'
export default defineEventHandler(async (event) => {
  const { supabase } = await catalogEditor(event)
  const { id, version } = catalogParams(event, true)
  const query = getQuery(event)
  const page = parseQuestionPagination(query.page, query.pageSize)
  if (
    !page ||
    page.pageSize > 50 ||
    Object.keys(query).some((key) => !['page', 'pageSize'].includes(key))
  )
    throw createError({ statusCode: 400, statusMessage: 'Paginação inválida.' })
  const { data, count, error } = await supabase
    .from('exam_catalog_reviews')
    .select(
      'id,model_id,version,edit_revision,fingerprint,reviewer_id,reviewer_role,decision,notes,rights,attestations,created_at',
      { count: 'exact' },
    )
    .eq('model_id', id)
    .eq('version', version)
    .order('created_at', { ascending: false })
    .order('id', { ascending: false })
    .range(page.offset, page.offset + page.pageSize - 1)
  if (error) throw catalogError(error)
  return {
    reviews: data ?? [],
    total: count ?? 0,
    page: page.page,
    pageSize: page.pageSize,
    hasMore: page.offset + (data?.length ?? 0) < (count ?? 0),
  }
})
