export function calculateExamScore(correctAnswers: number, totalQuestions: number) {
  return totalQuestions > 0
    ? Math.round((correctAnswers / totalQuestions) * 100)
    : 0
}