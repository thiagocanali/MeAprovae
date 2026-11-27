import { createError, getQuery } from 'h3'
import {
  catalogEditor,
  catalogError,
} from '../../../utils/exam-catalog-editorial'
import { parseCatalogQuery } from '../../../../shared/domain/questions/exam-catalog-editorial'
import { reviewSearchPattern } from '../../../../shared/domain/questions/review-queue'

export default defineEventHandler(async (event) => {
  const { supabase } = await catalogEditor(event)
  const filters = parseCatalogQuery(getQuery(event))
  if (!filters)
    throw createError({
      statusCode: 400,
      statusMessage: 'Filtros de modelos inválidos.',
    })
  let request = supabase
    .from('exam_catalog_versions')
    .select(
      'model_id,version,title,description,kind,status,question_count,duration_minutes,edit_revision,created_at',
      { count: 'exact' },
    )
    .order('created_at', { ascending: false })
    .order('model_id')
    .order('version', { ascending: false })
    .range(filters.offset, filters.offset + filters.pageSize - 1)
  if (filters.status !== 'all') request = request.eq('status', filters.status)
  if (filters.kind !== 'all') request = request.eq('kind', filters.kind)
  if (filters.search)
    request = request.ilike('title', reviewSearchPattern(filters.search))
  const { data, count, error } = await request
  if (error) throw catalogError(error)
  return {
    versions: data ?? [],
    total: count ?? 0,
    page: filters.page,
    pageSize: filters.pageSize,
    hasMore: filters.offset + (data?.length ?? 0) < (count ?? 0),
    publicationEnabled: false,
  }
})
