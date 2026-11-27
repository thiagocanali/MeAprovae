import { describe, expect, it } from 'vitest'
import { isCurrentExamAvailability, parseExamQueryCount, parseExamQueryId, topicBelongsToSubject } from '../../shared/domain/questions/exam-filter-ui'

const subjectId = '11111111-1111-4111-8111-111111111111'
const topicId = '22222222-2222-4222-8222-222222222222'
const contestId = '33333333-3333-4333-8333-333333333333'

describe('exam filter UI boundaries', () => {
  it('keeps suspicious IDs invalid instead of widening the search', () => {
    expect(parseExamQueryId(undefined)).toBe('')
    expect(parseExamQueryId(subjectId)).toBe(subjectId)
    for (const value of [null, [subjectId], {}, 12]) expect(parseExamQueryId(value)).toBe('invalid')
  })

  it('parses only unambiguous integer URL counts', () => {
    expect(parseExamQueryCount(undefined)).toBe(10)
    expect(parseExamQueryCount('8')).toBe(8)
    for (const value of ['', null, [], ['10'], '1.5', '0x10', ' 10 ', 'NaN', '-1']) {
      expect(Number.isNaN(parseExamQueryCount(value))).toBe(true)
    }
  })

  it('rejects stale availability associated with another filter selection', () => {
    const selection = { contestId, subjectId, topicId }
    const result = { available: 8, maxQuestions: 8, filters: selection }
    expect(isCurrentExamAvailability(result, selection)).toBe(true)
    expect(isCurrentExamAvailability(result, { ...selection, subjectId: null })).toBe(false)
    expect(isCurrentExamAvailability(result, { ...selection, topicId: null })).toBe(false)
    expect(isCurrentExamAvailability(result, { ...selection, contestId: null })).toBe(false)
    expect(isCurrentExamAvailability({ ...result, maxQuestions: 20 }, selection)).toBe(false)
  })

  it('does not allow a topic from a different subject in the URL', () => {
    const topics = [{ id: topicId, subject_id: subjectId }]
    expect(topicBelongsToSubject(subjectId, topicId, topics)).toBe(true)
    expect(topicBelongsToSubject(null, topicId, topics)).toBe(false)
    expect(topicBelongsToSubject(contestId, topicId, topics)).toBe(false)
    expect(topicBelongsToSubject(subjectId, null, topics)).toBe(true)
  })
})
