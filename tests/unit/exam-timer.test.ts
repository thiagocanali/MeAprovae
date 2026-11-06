import { afterEach, describe, expect, it, vi } from 'vitest'
import { createExamTimer } from '../../shared/domain/questions/exam-timer'

describe('exam timer', () => {
  afterEach(() => {
    vi.useRealTimers()
  })

  it('counts down to zero and completes once', () => {
    vi.useFakeTimers()
    const ticks: number[] = []
    const onComplete = vi.fn()
    const timer = createExamTimer((seconds) => ticks.push(seconds), onComplete)

    timer.start(2)
    vi.advanceTimersByTime(2000)

    expect(ticks).toEqual([2, 1, 0])
    expect(onComplete).toHaveBeenCalledOnce()
    expect(vi.getTimerCount()).toBe(0)
  })

  it('restarts with one interval and cancels the previous countdown', () => {
    vi.useFakeTimers()
    const onComplete = vi.fn()
    const timer = createExamTimer(() => {}, onComplete)

    timer.start(60)
    timer.start(1)

    expect(vi.getTimerCount()).toBe(1)
    vi.advanceTimersByTime(1000)
    expect(onComplete).toHaveBeenCalledOnce()
    expect(vi.getTimerCount()).toBe(0)
  })

  it('stops ticking when the page is torn down', () => {
    vi.useFakeTimers()
    const ticks: number[] = []
    const onComplete = vi.fn()
    const timer = createExamTimer((seconds) => ticks.push(seconds), onComplete)

    timer.start(3)
    timer.stop()
    vi.advanceTimersByTime(3000)

    expect(ticks).toEqual([3])
    expect(onComplete).not.toHaveBeenCalled()
    expect(vi.getTimerCount()).toBe(0)
  })
})