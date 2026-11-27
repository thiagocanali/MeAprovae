export interface ContestPosition {
  id: string
  title: string
  education_level: string | null
  area: string | null
}
export interface ContestNotice {
  id: string
  title: string
  version: string
  publication_date: string | null
  source_url?: string | null
  study_notice_subjects?: Array<{
    position: number
    study_subjects: { id: string; name: string } | null
  }>
}
export interface StudyContest {
  id: string
  slug: string
  title: string
  organization: string | null
  exam_board: string | null
  published_at: string | null
  study_positions: ContestPosition[]
  study_notices: ContestNotice[]
}
export interface ContestFilters {
  search: string
  board: string
  education: string
  followedOnly: boolean
  sort: string
}
export function normalizeContestSearch(value: string) {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLocaleLowerCase('pt-BR')
    .trim()
}
export function filterContests(
  contests: StudyContest[],
  followedIds: string[],
  filters: ContestFilters,
) {
  const terms = normalizeContestSearch(filters.search)
    .split(/\s+/)
    .filter(Boolean)
  return contests
    .filter((contest) => {
      const text = normalizeContestSearch(
        [
          contest.title,
          contest.organization,
          contest.exam_board,
          ...contest.study_positions.map((p) => p.title),
        ].join(' '),
      )
      return (
        terms.every((term) => text.includes(term)) &&
        (!filters.board || contest.exam_board === filters.board) &&
        (!filters.education ||
          contest.study_positions.some(
            (p) => p.education_level === filters.education,
          )) &&
        (!filters.followedOnly || followedIds.includes(contest.id))
      )
    })
    .sort((a, b) =>
      filters.sort === 'title'
        ? a.title.localeCompare(b.title, 'pt-BR') || a.id.localeCompare(b.id)
        : (Date.parse(b.published_at ?? '') || 0) -
            (Date.parse(a.published_at ?? '') || 0) ||
          a.title.localeCompare(b.title, 'pt-BR') ||
          a.id.localeCompare(b.id),
    )
}
// Date-only editorial fields must not shift to the previous day in Brazil.
export function contestDate(value: string | null) {
  if (!value || !Number.isFinite(Date.parse(value))) return 'Data não informada'
  return new Intl.DateTimeFormat('pt-BR', { timeZone: 'UTC' }).format(
    new Date(value),
  )
}
export function noticeSource(value: string | null | undefined) {
  try {
    const url = new URL(value ?? '')
    return ['https:', 'http:'].includes(url.protocol) ? url.href : null
  } catch {
    return null
  }
}
