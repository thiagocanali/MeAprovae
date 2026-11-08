export const QUESTION_DIFFICULTIES = ['easy', 'medium', 'hard'] as const

export type QuestionDifficulty = typeof QUESTION_DIFFICULTIES[number]

export function isQuestionDifficulty(value: unknown): value is QuestionDifficulty {
  return typeof value === 'string' && QUESTION_DIFFICULTIES.includes(value as QuestionDifficulty)
}

export function getReviewedQuestionDifficulty(value: unknown, reviewed: unknown): QuestionDifficulty | null {
  return reviewed === true && isQuestionDifficulty(value) ? value : null
}
