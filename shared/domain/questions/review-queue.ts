import { isUuid } from '../common/uuid'
import { parseQuestionPagination } from './pagination'
import type { QuestionDifficulty } from './difficulty'

export interface ReviewQueueFilters {
  page: number; pageSize: number; offset: number
  status: 'all' | 'draft' | 'published' | 'archived'
  pending: 'all' | 'difficulty'
  subjectId: string; releaseId: string; search: string
}
export interface ReviewQueueQuestion {
  id: string; statementPreview: string; status: string
  subjectName: string; topicName: string; sourceLabel: string | null
  difficulty: QuestionDifficulty | null; difficultyReviewed: boolean
}
export interface ReviewQueueResponse {
  questions: ReviewQueueQuestion[]; total: number; page: number; pageSize: number; hasMore: boolean
}
export function parseReviewQueueQuery(query: Record<string, unknown>): ReviewQueueFilters | null {
  const pagination = parseQuestionPagination(query.page, query.pageSize)
  if (!pagination || pagination.pageSize > 50) return null
  const status = query.status === undefined ? 'draft' : query.status
  const pending = query.pending === undefined ? 'all' : query.pending
  if (!['all', 'draft', 'published', 'archived'].includes(status as string) || typeof status !== 'string') return null
  if (pending !== 'all' && pending !== 'difficulty') return null
  const identifiers: Record<'subjectId' | 'releaseId', string> = { subjectId: '', releaseId: '' }
  for (const field of ['subjectId', 'releaseId'] as const) {
    const value = query[field]
    if (value !== undefined && (typeof value !== 'string' || !isUuid(value))) return null
    identifiers[field] = typeof value === 'string' ? value : ''
  }
  if (query.search !== undefined && typeof query.search !== 'string') return null
  const search = typeof query.search === 'string' ? query.search.trim() : ''
  if (search.length > 200) return null
  return { ...pagination, ...identifiers, status: status as ReviewQueueFilters['status'], pending, search }
}
/** User input is a literal substring, never a LIKE wildcard expression. */
export function reviewSearchPattern(search: string) {
  return `%${search.replace(/[\\%_]/g, character => `\\${character}`)}%`
}
