import { describe, expect, it } from 'vitest'
import { calculateExamScore } from '../../shared/domain/questions/exam-results'

describe('exam score', () => {
  it('calculates the score against all questions, including unanswered ones', () => {
    expect(calculateExamScore(1, 10)).toBe(10)
  })

  it('returns zero when there are no questions', () => {
    expect(calculateExamScore(0, 0)).toBe(0)
  })
})