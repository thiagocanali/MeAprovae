import { describe, expect, it } from 'vitest'
import { examChartPoints, parsePerformanceQuery } from '../../shared/domain/questions/performance'

describe('performance filters', () => {
  it('defaults to 30 calendar days in São Paulo', () => {
    expect(parsePerformanceQuery({})).toEqual({ days: 30, timezone: 'America/Sao_Paulo' })
  })
  it.each(['7', '30', '90'])('accepts the supported period %s', days => {
    expect(parsePerformanceQuery({ days, timezone: 'UTC' })).toEqual({ days: Number(days), timezone: 'UTC' })
  })
  it.each([{ days: '0' }, { days: '365' }, { days: ['7', '30'] }, { days: '7.0' }, { timezone: 'Europe/Unknown' }, { timezone: ['UTC'] }])('rejects invalid or ambiguous query %j', query => {
    expect(parsePerformanceQuery(query)).toBeNull()
  })
})
describe('exam chart on a fixed percentage axis', () => {
  it('has no points for no exams and centers one result', () => {
    expect(examChartPoints([])).toEqual([])
    expect(examChartPoints([{ id: 'one', score: 50 }])).toEqual([{ id: 'one', score: 50, x: 300, y: 100 }])
  })
  it('keeps chronological order and positions 0 and 100 on the axis', () => {
    expect(examChartPoints([{ id: 'first', score: 0 }, { id: 'last', score: 100 }])).toEqual([
      { id: 'first', score: 0, x: 40, y: 180 }, { id: 'last', score: 100, x: 580, y: 20 },
    ])
  })
})
