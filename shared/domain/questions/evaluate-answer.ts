export interface EvaluateAnswerInput {
  correctOptionId: string
  selectedOptionId: string | null
}

export interface AnswerEvaluation {
  isCorrect: boolean
  selectedOptionId: string | null
}

/**
 * Pure domain rule for evaluating a single-choice answer.
 * The caller must load the answer key from trusted server-side data.
 */
export function evaluateAnswer({
  correctOptionId,
  selectedOptionId,
}: EvaluateAnswerInput): AnswerEvaluation {
  if (!correctOptionId.trim()) {
    throw new TypeError('A questão precisa ter uma alternativa correta configurada.')
  }

  if (selectedOptionId !== null && !selectedOptionId.trim()) {
    throw new TypeError('A alternativa selecionada é inválida.')
  }

  return {
    isCorrect: selectedOptionId !== null && selectedOptionId === correctOptionId,
    selectedOptionId,
  }
}
