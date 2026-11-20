import { describe, expect, it } from 'vitest'
import { isExamQuestionCount, validExamFilters } from '../../shared/domain/questions/exam-config'

describe('exam configuration', () => {
  it('accepts a small or full exam and rejects coercion, fractions and oversized counts', () => {
    for (const count of [1, 5, 8, 10, 20]) expect(isExamQuestionCount(count)).toBe(true)
    for (const count of [0, -1, 21, 1.5, NaN, Infinity, '10', null, undefined]) expect(isExamQuestionCount(count)).toBe(false)
  })
  it('accepts optional UUID filters but requires a subject for a topic', () => {
    const id = '11111111-1111-4111-8111-111111111111'
    expect(validExamFilters({})).toBe(true)
    expect(validExamFilters({ contestId: null, subjectId: id, topicId: id })).toBe(true)
    expect(validExamFilters({ topicId: id })).toBe(false)
    for (const value of ['', 'invalid', [id], 1, {}]) expect(validExamFilters({ subjectId: value })).toBe(false)
  })
})
