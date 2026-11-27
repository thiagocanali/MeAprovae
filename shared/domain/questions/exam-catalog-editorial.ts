import { isUuid } from '../common/uuid'
import { parseQuestionPagination } from './pagination'
import type { ExamModelKind } from './exam-model'

const kinds = [
  'subject-foundations',
  'subject-application',
  'multidisciplinary',
] as const
const object = (value: unknown): value is Record<string, unknown> =>
  !!value && typeof value === 'object' && !Array.isArray(value)
const integer = (value: unknown): value is number =>
  typeof value === 'number' &&
  Number.isSafeInteger(value) &&
  value > 0 &&
  value <= 2147483647
const only = (value: Record<string, unknown>, keys: string[]) =>
  Object.keys(value).every((key) => keys.includes(key))
export function catalogVersion(value: unknown): number | null {
  if (typeof value !== 'string' || !/^[1-9]\d{0,9}$/.test(value)) return null
  const n = Number(value)
  return integer(n) ? n : null
}
export interface CatalogDraftFields {
  title: string
  description: string
  kind: ExamModelKind
  questionCount: number
}
function fields(value: Record<string, unknown>): CatalogDraftFields | null {
  if (
    typeof value.title !== 'string' ||
    typeof value.description !== 'string' ||
    !kinds.includes(value.kind as ExamModelKind) ||
    !integer(value.questionCount) ||
    value.questionCount > 20
  )
    return null
  const title = value.title.trim(),
    description = value.description.trim()
  return title.length >= 3 &&
    title.length <= 120 &&
    description.length >= 3 &&
    description.length <= 800
    ? {
        title,
        description,
        kind: value.kind as ExamModelKind,
        questionCount: value.questionCount,
      }
    : null
}
export function parseCatalogCreate(
  value: unknown,
): (CatalogDraftFields & { modelId: string }) | null {
  if (
    !object(value) ||
    !only(value, [
      'modelId',
      'title',
      'description',
      'kind',
      'questionCount',
    ]) ||
    !isUuid(value.modelId)
  )
    return null
  const draft = fields(value)
  return draft ? { ...draft, modelId: value.modelId.toLowerCase() } : null
}
export function parseCatalogSave(
  value: unknown,
):
  | (CatalogDraftFields & { expectedRevision: number; questionIds: string[] })
  | null {
  if (
    !object(value) ||
    !only(value, [
      'title',
      'description',
      'kind',
      'questionCount',
      'expectedRevision',
      'questionIds',
    ]) ||
    !integer(value.expectedRevision) ||
    !Array.isArray(value.questionIds) ||
    value.questionIds.length > 20 ||
    !value.questionIds.every(isUuid)
  )
    return null
  const draft = fields(value)
  const questionIds = value.questionIds.map((id) => id.toLowerCase())
  return draft &&
    questionIds.length <= draft.questionCount &&
    new Set(questionIds).size === questionIds.length
    ? { ...draft, expectedRevision: value.expectedRevision, questionIds }
    : null
}
export function parseCatalogClone(
  value: unknown,
): { version: number; sourceVersion: number; sourceRevision: number } | null {
  if (
    !object(value) ||
    !only(value, ['version', 'sourceVersion', 'sourceRevision']) ||
    !integer(value.version) ||
    !integer(value.sourceVersion) ||
    !integer(value.sourceRevision) ||
    value.version <= value.sourceVersion
  )
    return null
  return {
    version: value.version,
    sourceVersion: value.sourceVersion,
    sourceRevision: value.sourceRevision,
  }
}
export function parseCatalogTransition(value: unknown): {
  action: 'request_review' | 'return_to_draft'
  expectedRevision: number
} | null {
  if (
    !object(value) ||
    !only(value, ['action', 'expectedRevision']) ||
    !integer(value.expectedRevision) ||
    !['request_review', 'return_to_draft'].includes(value.action as string)
  )
    return null
  return {
    action: value.action as 'request_review' | 'return_to_draft',
    expectedRevision: value.expectedRevision,
  }
}
export function parseCatalogQuery(query: Record<string, unknown>) {
  if (!only(query, ['page', 'pageSize', 'status', 'kind', 'search']))
    return null
  const page = parseQuestionPagination(query.page, query.pageSize)
  const status = query.status ?? 'all',
    kind = query.kind ?? 'all',
    search = query.search ?? ''
  if (
    !page ||
    page.pageSize > 50 ||
    !['all', 'draft', 'in_review'].includes(status as string) ||
    typeof status !== 'string' ||
    typeof kind !== 'string' ||
    (kind !== 'all' && !kinds.includes(kind as ExamModelKind)) ||
    typeof search !== 'string' ||
    search.trim().length > 120
  )
    return null
  return { ...page, status, kind, search: search.trim() }
}

export interface CatalogCompositionItem {
  position: number
  questionId: string
  subjectId: string
  sourceSubjectId: string | null
  sourceAvailable: boolean
}
/** Structural preview only. Database transition repeats its own authoritative checks. */
export function inspectCatalogComposition(
  kind: string,
  count: number,
  items: CatalogCompositionItem[],
) {
  const issues: string[] = []
  const positions = items.map((item) => item.position).sort((a, b) => a - b)
  if (items.length !== count) issues.push('incomplete')
  if (new Set(items.map((item) => item.questionId)).size !== items.length)
    issues.push('duplicate')
  if (positions.some((position, index) => position !== index + 1))
    issues.push('positions')
  const subjects = new Map<string, number>()
  for (const item of items)
    subjects.set(item.subjectId, (subjects.get(item.subjectId) ?? 0) + 1)
  if (
    (kind === 'multidisciplinary' && subjects.size < 2) ||
    (kind !== 'multidisciplinary' && subjects.size !== 1)
  )
    issues.push('distribution')
  if (
    items.some(
      (item) =>
        !item.sourceAvailable || item.sourceSubjectId !== item.subjectId,
    )
  )
    issues.push('source')
  return {
    readyForReview: issues.length === 0,
    issues,
    distribution: [...subjects]
      .map(([subjectId, questionCount]) => ({ subjectId, questionCount }))
      .sort((a, b) => a.subjectId.localeCompare(b.subjectId)),
  }
}
