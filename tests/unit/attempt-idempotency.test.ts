import { describe, expect, it } from 'vitest'
import { createAttemptIdempotencyKeys } from '../../shared/domain/questions/attempt-idempotency'

describe('attempt idempotency keys', () => {
  it('reuses a key when retrying the same answer', () => {
    let sequence = 0
    const keys = createAttemptIdempotencyKeys(() => `key-${++sequence}`)

    expect(keys.forSubmission('question-1', 'option-a')).toBe('key-1')
    expect(keys.forSubmission('question-1', 'option-a')).toBe('key-1')
    expect(sequence).toBe(1)
  })

  it('creates a different key when the question or option changes', () => {
    let sequence = 0
    const keys = createAttemptIdempotencyKeys(() => `key-${++sequence}`)

    expect(keys.forSubmission('question-1', 'option-a')).toBe('key-1')
    expect(keys.forSubmission('question-1', 'option-b')).toBe('key-2')
    expect(keys.forSubmission('question-2', 'option-a')).toBe('key-3')
  })

  it('creates a fresh key after the server confirms the submission', () => {
    let sequence = 0
    const keys = createAttemptIdempotencyKeys(() => `key-${++sequence}`)

    keys.forSubmission('question-1', 'option-a')
    keys.clear('question-1', 'option-a')

    expect(keys.forSubmission('question-1', 'option-a')).toBe('key-2')
  })
})