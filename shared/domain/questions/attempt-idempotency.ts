type CreateIdempotencyKey = () => string

export function createAttemptIdempotencyKeys(
  createKey: CreateIdempotencyKey = () => globalThis.crypto.randomUUID(),
) {
  const pendingKeys = new Map<string, string>()

  function submissionId(questionId: string, optionId: string) {
    return JSON.stringify([questionId, optionId])
  }

  return {
    forSubmission(questionId: string, optionId: string) {
      const id = submissionId(questionId, optionId)
      let key = pendingKeys.get(id)

      if (!key) {
        key = createKey()
        pendingKeys.set(id, key)
      }

      return key
    },
    clear(questionId: string, optionId: string) {
      pendingKeys.delete(submissionId(questionId, optionId))
    },
  }
}