import { describe, expect, it } from 'vitest'
import { parseReviewQueueQuery, reviewSearchPattern } from '../../shared/domain/questions/review-queue'
const uuid = '11111111-1111-4111-8111-111111111111'
describe('editorial review query', () => {
  it('defaults to the first 20 drafts without implying a completed review', () => {
    expect(parseReviewQueueQuery({})).toEqual({ page: 1, pageSize: 20, offset: 0, status: 'draft', pending: 'all', subjectId: '', releaseId: '', search: '' })
  })
  it('combines filters and computes a bounded page offset', () => {
    expect(parseReviewQueueQuery({ page: '3', pageSize: '50', status: 'all', pending: 'difficulty', subjectId: uuid, releaseId: uuid, search: '  juros  ' }))
      .toEqual({ page: 3, pageSize: 50, offset: 100, status: 'all', pending: 'difficulty', subjectId: uuid, releaseId: uuid, search: 'juros' })
  })
  it.each([{ page: '0' }, { page: ['1', '2'] }, { pageSize: '51' }, { status: ['draft'] }, { status: 'deleted' }, { pending: 'approved' }, { subjectId: 'bad' }, { releaseId: ['bad'] }, { search: ['juros'] }, { search: 'x'.repeat(201) }])('rejects ambiguous or oversized input %j', input => {
    expect(parseReviewQueueQuery(input)).toBeNull()
  })
  it('treats wildcard characters and backslashes as literal search text', () => {
    expect(reviewSearchPattern('20%_\\')).toBe('%20\\%\\_\\\\%')
    expect(reviewSearchPattern('juros')).toBe('%juros%')
  })
})
