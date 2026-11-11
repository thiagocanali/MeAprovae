export const PERFORMANCE_PERIODS = [7, 30, 90] as const
export const PERFORMANCE_TIMEZONES = ['America/Sao_Paulo', 'UTC'] as const
export interface PerformanceFilters { days: 7 | 30 | 90; timezone: 'America/Sao_Paulo' | 'UTC' }
export interface ExamPerformance {
  id: string; status: 'completed' | 'expired'; questionCount: number; answeredCount: number; score: number; finishedAt: string
}
export interface PerformanceOverview {
  periodDays: number; timezone: PerformanceFilters['timezone']; periodStart: string; generatedAt: string
  days: Array<{ date: string; attempts: number; correct: number; accuracy: number }>
  totals: { attempts: number; correct: number; accuracy: number; activeDays: number }
  performanceBySubject: Array<{ subjectId: string | null; subjectName: string; attempts: number; correctAnswers: number; accuracy: number }>
  examSummary: { count: number; averageScore: number | null; bestScore: number | null }
  recentExams: ExamPerformance[]
}
export function parsePerformanceQuery(query: Record<string, unknown>): PerformanceFilters | null {
  const days = query.days === undefined ? '30' : query.days
  const timezone = query.timezone === undefined ? 'America/Sao_Paulo' : query.timezone
  if (typeof days !== 'string' || !['7', '30', '90'].includes(days)) return null
  if (typeof timezone !== 'string' || !PERFORMANCE_TIMEZONES.includes(timezone as PerformanceFilters['timezone'])) return null
  return { days: Number(days) as PerformanceFilters['days'], timezone: timezone as PerformanceFilters['timezone'] }
}
/** Fixed 0–100 axis; incoming exam order is chronological, supplied by the DB. */
export function examChartPoints(exams: Array<{ id: string; score: number }>) {
  return exams.map((exam, index) => ({ ...exam,
    x: exams.length === 1 ? 300 : 40 + index / (exams.length - 1) * 540,
    y: 180 - exam.score * 1.6,
  }))
}
