import { describe, expect, it } from 'vitest'
import { editorialQuestionError } from '../../server/utils/editorial-question-error'

describe('editorial question RPC errors', () => {
  it.each([
    ['28000', 401], ['42501', 403], ['P0002', 404], ['23514', 409],
    ['22023', 400], ['22P02', 400], ['23502', 400], ['23503', 400], ['23522', 400],
  ])('maps SQLSTATE %s to HTTP %i', (code, status) => {
    expect(editorialQuestionError({ code: String(code) }).statusCode).toBe(status)
  })
  it('does not expose unexpected database details', () => {
    const result = editorialQuestionError({ code: 'XX000' })
    expect(result.statusCode).toBe(503)
    expect(result.statusMessage).toBe('Não foi possível salvar a questão. Tente novamente.')
  })
})
