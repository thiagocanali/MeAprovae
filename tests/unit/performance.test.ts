import { describe, expect, it } from 'vitest'
import { dailyPerformance } from '../../shared/domain/questions/performance'

describe('dailyPerformance', () => {
  const now = new Date('2026-11-11T12:00:00Z')
  it('fills all 30 days without inventing activity', () => {
    const days = dailyPerformance([], now)
    expect(days).toHaveLength(30)
    expect(days[0]?.date).toBe('2026-10-13')
    expect(days.at(-1)).toEqual({ date: '2026-11-11', attempts: 0, correct: 0, accuracy: 0 })
  })
  it('uses UTC boundaries and excludes invalid, future and old attempts', () => {
    const days = dailyPerformance([
      { submitted_at: '2026-11-10T23:30:00-03:00', is_correct: true },
      { submitted_at: '2026-11-11T03:00:00Z', is_correct: false },
      { submitted_at: 'invalid', is_correct: true },
      { submitted_at: '2026-10-12T23:59:59Z', is_correct: true },
      { submitted_at: '2026-11-11T13:00:00Z', is_correct: true },
    ], now)
    expect(days.at(-1)).toEqual({ date: '2026-11-11', attempts: 2, correct: 1, accuracy: 50 })
    expect(days.reduce((sum, day) => sum + day.attempts, 0)).toBe(2)
  })
})
