import { describe, expect, it } from 'vitest'
import { remainingExamSeconds } from '../../shared/domain/questions/exam-session'
describe('server-based exam deadline', () => {
  const now = '2026-11-11T13:00:00Z'
  it('uses the saved deadline and elapsed monotonic time', () => {
    expect(remainingExamSeconds('2026-11-11T13:01:00Z', now, 15000)).toBe(45)
  })
  it('expires after a throttled tab resumes, without granting extra time', () => {
    expect(remainingExamSeconds('2026-11-11T13:01:00Z', now, 90000)).toBe(0)
  })
  it('rounds a positive fraction up and clamps expired or invalid times', () => {
    expect(remainingExamSeconds('2026-11-11T13:00:00.001Z', now)).toBe(1)
    expect(remainingExamSeconds(now, now)).toBe(0)
    expect(remainingExamSeconds('invalid', now)).toBe(0)
    expect(remainingExamSeconds('2026-11-11T13:01:00Z', now, -1000)).toBe(60)
  })
})
