export interface PerformanceAttempt { is_correct: boolean; submitted_at: string }

/** Calendar days in UTC, so server and browser produce the same series. */
export function dailyPerformance(attempts: PerformanceAttempt[], now = new Date(), days = 30) {
  const end = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate())
  const buckets = Array.from({ length: days }, (_, index) => ({
    date: new Date(end - (days - index - 1) * 86400000).toISOString().slice(0, 10),
    attempts: 0, correct: 0, accuracy: 0,
  }))
  const byDate = new Map(buckets.map(day => [day.date, day]))
  for (const attempt of attempts) {
    const timestamp = Date.parse(attempt.submitted_at)
    if (!Number.isFinite(timestamp) || timestamp > now.getTime()) continue
    const day = byDate.get(new Date(timestamp).toISOString().slice(0, 10))
    if (!day) continue
    day.attempts++
    if (attempt.is_correct) day.correct++
    day.accuracy = Math.round(day.correct / day.attempts * 100)
  }
  return buckets
}
