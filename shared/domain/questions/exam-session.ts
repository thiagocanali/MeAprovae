export interface ExamQuestion {
  id: string
  statement: string
  source_label: string | null
  source_url: string | null
  source_year: number | null
  options: Array<{ id: string; option_label: string; content: string; position: number }>
}
export interface ExamResult {
  attemptId: string; selectedOptionId: string; isCorrect: boolean
  correctOptionId: string; explanation: string; submittedAt: string
}
export interface ExamSession {
  id: string; status: 'active' | 'completed' | 'expired'; questionCount: number
  startedAt: string; expiresAt: string; finishedAt: string | null; serverNow: string
  answeredCount: number; correctCount: number; score: number
  questions: Array<{ position: number; question: ExamQuestion; result: ExamResult | null }>
}
/** elapsedMs comes from a monotonic browser clock, independent of device time. */
export function remainingExamSeconds(expiresAt: string, serverNow: string, elapsedMs = 0) {
  const delta = Date.parse(expiresAt) - Date.parse(serverNow) - Math.max(0, elapsedMs)
  return Number.isFinite(delta) ? Math.max(0, Math.ceil(delta / 1000)) : 0
}
