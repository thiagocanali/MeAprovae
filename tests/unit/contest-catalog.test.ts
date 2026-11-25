import { describe, expect, it } from 'vitest'
import {
  contestDate,
  filterContests,
  noticeSource,
  type StudyContest,
} from '../../shared/domain/contests/catalog'
const make = (id: string, fields: Partial<StudyContest>): StudyContest => ({
  id,
  slug: id,
  title: id,
  organization: null,
  exam_board: null,
  published_at: null,
  study_positions: [],
  study_notices: [],
  ...fields,
})
const contests = [
  make('a', {
    title: 'Administração Federal',
    organization: 'Órgão Alfa',
    exam_board: 'Banca A',
    published_at: '2026-11-20',
    study_positions: [
      { id: 'p', title: 'Técnico', education_level: 'Médio', area: null },
    ],
  }),
  make('b', {
    title: 'Tribunal Estadual',
    exam_board: 'Banca B',
    published_at: '2026-11-21',
    study_positions: [
      { id: 'q', title: 'Analista', education_level: 'Superior', area: null },
    ],
  }),
  make('c', { title: 'Arquivo', published_at: null }),
]
const filters = {
  search: '',
  board: '',
  education: '',
  followedOnly: false,
  sort: 'recent',
}
describe('contest discovery', () => {
  it('finds accent-insensitive tokens across title, organization and position', () => {
    expect(
      filterContests(contests, [], {
        ...filters,
        search: '  ORGAO tecnico administracao ',
      }).map((c) => c.id),
    ).toEqual(['a'])
  })
  it('combines board, education and own followed contests', () => {
    expect(
      filterContests(contests, ['b'], {
        ...filters,
        board: 'Banca B',
        education: 'Superior',
        followedOnly: true,
      }).map((c) => c.id),
    ).toEqual(['b'])
    expect(
      filterContests(contests, [], { ...filters, followedOnly: true }),
    ).toEqual([])
    expect(
      filterContests(contests, ['b'], {
        ...filters,
        education: 'Médio',
        followedOnly: true,
      }),
    ).toEqual([])
  })
  it('sorts dated records first without mutating the source; supports alphabetical order', () => {
    expect(filterContests(contests, [], filters).map((c) => c.id)).toEqual([
      'b',
      'a',
      'c',
    ])
    expect(
      filterContests(contests, [], { ...filters, sort: 'title' }).map(
        (c) => c.id,
      ),
    ).toEqual(['a', 'c', 'b'])
    expect(contests.map((c) => c.id)).toEqual(['a', 'b', 'c'])
  })
  it('treats user search literally instead of as an expression', () => {
    expect(filterContests(contests, [], { ...filters, search: '.*' })).toEqual(
      [],
    )
  })
  it('handles missing catalog information without inventing values', () => {
    expect(filterContests([make('x', {})], [], filters)).toHaveLength(1)
    expect(contestDate(null)).toBe('Data não informada')
    expect(contestDate('invalid')).toBe('Data não informada')
  })
  it('keeps a date-only publication on the same day', () => {
    expect(contestDate('2026-11-21')).toBe('21/11/2026')
  })
  it('allows HTTP sources and rejects executable or relative URLs', () => {
    expect(noticeSource('https://example.org/edital.pdf')).toBe(
      'https://example.org/edital.pdf',
    )
    expect(noticeSource('http://example.org/edital')).toBe(
      'http://example.org/edital',
    )
    for (const value of [
      'javascript:alert(1)',
      'data:text/html,hello',
      '/edital',
      null,
      '',
    ])
      expect(noticeSource(value)).toBeNull()
  })
})
