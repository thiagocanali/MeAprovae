import { describe, expect, it } from 'vitest'
import { isQuestionDifficulty } from '../../shared/domain/questions/difficulty'

describe('isQuestionDifficulty', () => {
  it.each(['easy', 'medium', 'hard'])('accepts %s', (value) => {
    expect(isQuestionDifficulty(value)).toBe(true)
  })

  it.each(['', 'EASY', 'advanced', null, undefined, 1, [], {}])('rejects invalid value %s', (value) => {
    expect(isQuestionDifficulty(value)).toBe(false)
  })
})
