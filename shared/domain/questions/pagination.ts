export interface QuestionPagination {
  page: number
  pageSize: number
  offset: number
}

function positiveInteger(value: unknown, fallback: number): number | null {
  if (value === undefined) return fallback
  if (typeof value !== 'string' && typeof value !== 'number') return null
  if (typeof value === 'string' && !/^\d+$/.test(value)) return null

  const parsed = Number(value)
  return Number.isSafeInteger(parsed) && parsed > 0 ? parsed : null
}

export function parseQuestionPagination(
  pageValue: unknown,
  pageSizeValue: unknown,
): QuestionPagination | null {
  const page = positiveInteger(pageValue, 1)
  const pageSize = positiveInteger(pageSizeValue, 20)

  if (page === null || page > 10_000 || pageSize === null || pageSize > 100) {
    return null
  }

  const offset = (page - 1) * pageSize
  if (!Number.isSafeInteger(offset)) return null

  return { page, pageSize, offset }
}
