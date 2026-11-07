import { describe, expect, it } from 'vitest'
import { parseQuestionPagination } from '../../shared/domain/questions/pagination'

describe('question pagination', () => {
  it('uses safe defaults when parameters are omitted', () => {
    expect(parseQuestionPagination(undefined, undefined)).toEqual({
      page: 1,
      pageSize: 20,
      offset: 0,
    })
  })

  it('calculates offsets for valid page parameters', () => {
    expect(parseQuestionPagination('3', '50')).toEqual({
      page: 3,
      pageSize: 50,
      offset: 100,
    })
  })

  it('rejects non-integer and non-positive values', () => {
    expect(parseQuestionPagination('1.5', '20')).toBeNull()
    expect(parseQuestionPagination('0', '20')).toBeNull()
    expect(parseQuestionPagination('2', '-1')).toBeNull()
    expect(parseQuestionPagination(['1'], '20')).toBeNull()
  })

  it('caps page size and page number to protect database queries', () => {
    expect(parseQuestionPagination('10001', '20')).toBeNull()
    expect(parseQuestionPagination('1', '101')).toBeNull()
  })
})
