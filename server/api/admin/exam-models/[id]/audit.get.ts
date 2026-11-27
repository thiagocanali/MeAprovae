import { createError, getQuery } from 'h3'
import {
  catalogEditor,
  catalogError,
  catalogParams,
} from '../../../../utils/exam-catalog-editorial'
import { parseQuestionPagination } from '../../../../../shared/domain/questions/pagination'
export default defineEventHandler(async (event) => {
  const { supabase } = await catalogEditor(event)
  const { id } = catalogParams(event)
  const query = getQuery(event)
  const page = parseQuestionPagination(query.page, query.pageSize)
  if (
    !page ||
    page.pageSize > 50 ||
    Object.keys(query).some((key) => !['page', 'pageSize'].includes(key))
  )
    throw createError({ statusCode: 400, statusMessage: 'Paginação inválida.' })
  const { data, count, error } = await supabase
    .from('editorial_audit_log')
    .select(
      'id,actor_id,action,table_name,record_id,old_data,new_data,occurred_at',
      { count: 'exact' },
    )
    .in('table_name', [
      'exam_catalog_models',
      'exam_catalog_versions',
      'exam_catalog_items',
    ])
    .or(
      `record_id.eq.${id},new_data->>model_id.eq.${id},old_data->>model_id.eq.${id}`,
    )
    .order('occurred_at', { ascending: false })
    .order('id', { ascending: false })
    .range(page.offset, page.offset + page.pageSize - 1)
  if (error) throw catalogError(error)
  return {
    events: data ?? [],
    total: count ?? 0,
    page: page.page,
    pageSize: page.pageSize,
    hasMore: page.offset + (data?.length ?? 0) < (count ?? 0),
  }
})
