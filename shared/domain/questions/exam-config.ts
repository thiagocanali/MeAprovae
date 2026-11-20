import { isUuid } from '../common/uuid'

export interface ExamFilters { contestId?: unknown; subjectId?: unknown; topicId?: unknown }
export function validExamFilters(filters: ExamFilters): boolean {
  return [filters.contestId, filters.subjectId, filters.topicId].every(id => id == null || isUuid(id))
    && (filters.topicId == null || filters.subjectId != null)
}
export function isExamQuestionCount(value: unknown): value is number {
  return typeof value === 'number' && Number.isInteger(value) && value >= 1 && value <= 20
}
export interface ExamAvailability { available: number; maxQuestions: number }
