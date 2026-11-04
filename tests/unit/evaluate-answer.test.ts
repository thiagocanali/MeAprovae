import { describe, expect, it } from 'vitest'
import { evaluateAnswer } from '../../shared/domain/questions/evaluate-answer'

describe('evaluateAnswer', () => {
  it('marks the selected correct option as correct', () => {
    expect(evaluateAnswer({ correctOptionId: 'option-a', selectedOptionId: 'option-a' }))
      .toEqual({ isCorrect: true, selectedOptionId: 'option-a' })
  })

  it('marks a different option as incorrect', () => {
    expect(evaluateAnswer({ correctOptionId: 'option-a', selectedOptionId: 'option-b' }))
      .toEqual({ isCorrect: false, selectedOptionId: 'option-b' })
  })

  it('treats an unanswered question as incorrect without inventing a selection', () => {
    expect(evaluateAnswer({ correctOptionId: 'option-a', selectedOptionId: null }))
      .toEqual({ isCorrect: false, selectedOptionId: null })
  })

  it('rejects a missing answer key', () => {
    expect(() => evaluateAnswer({ correctOptionId: ' ', selectedOptionId: 'option-a' }))
      .toThrow(TypeError)
  })

  it('rejects an empty selected option', () => {
    expect(() => evaluateAnswer({ correctOptionId: 'option-a', selectedOptionId: ' ' }))
      .toThrow(TypeError)
  })
})
