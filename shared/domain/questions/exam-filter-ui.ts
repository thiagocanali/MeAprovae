import { isUuid } from '../common/uuid'
import type { ExamAvailability } from './exam-config'

export interface ExamSelection {
  contestId: string | null
  subjectId: string | null
  topicId: string | null
}

/** Retain invalid values so the form can report them rather than silently broadening a filter. */
export function parseExamQueryId(value: unknown): string {
  if (value === undefined) return ''
  return typeof value === 'string' ? value : 'invalid'
}

/** A URL count is valid only when expressed as an integer, not an empty or coerced value. */
export function parseExamQueryCount(value: unknown): number {
  if (value === undefined) return 10
  if (typeof value !== 'string' || !/^[0-9]+$/.test(value)) return Number.NaN
  return Number(value)
}

/** Prevent a stale availability response from enabling a different selection. */
export function isCurrentExamAvailability(
  response: (ExamAvailability & { filters: ExamSelection }) | null | undefined,
  selection: ExamSelection,
): response is ExamAvailability & { filters: ExamSelection } {
  if (!response) return false
  const matches = (a: string | null, b: string | null) => a === b
  return matches(response.filters?.contestId, selection.contestId)
    && matches(response.filters?.subjectId, selection.subjectId)
    && matches(response.filters?.topicId, selection.topicId)
    && Number.isInteger(response.available) && response.available >= 0
    && Number.isInteger(response.maxQuestions)
    && response.maxQuestions === Math.min(20, response.available)
}

/** A topic in the URL must belong to the selected subject once the catalog is loaded. */
export function topicBelongsToSubject(
  subjectId: string | null,
  topicId: string | null,
  topics: Array<{ id: string; subject_id: string }>,
): boolean {
  if (!topicId) return true
  return Boolean(subjectId && isUuid(subjectId) && topics.some(topic => topic.id === topicId && topic.subject_id === subjectId))
}
