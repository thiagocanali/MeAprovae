import { describe, expect, it } from 'vitest'
import { getReviewedQuestionDifficulty, isQuestionDifficulty } from '../../shared/domain/questions/difficulty'

describe('isQuestionDifficulty', () => {
  it.each(['easy', 'medium', 'hard'])('accepts %s', (value) => {
    expect(isQuestionDifficulty(value)).toBe(true)
  })

  it.each(['', 'EASY', 'advanced', null, undefined, 1, [], {}])('rejects invalid value %s', (value) => {
    expect(isQuestionDifficulty(value)).toBe(false)
  })
})

describe('getReviewedQuestionDifficulty', () => {
  it('returns the difficulty only when it was explicitly reviewed', () => {
    expect(getReviewedQuestionDifficulty('easy', true)).toBe('easy')
    expect(getReviewedQuestionDifficulty('medium', false)).toBeNull()
    expect(getReviewedQuestionDifficulty('hard', null)).toBeNull()
    expect(getReviewedQuestionDifficulty('unknown', true)).toBeNull()
  })
})
