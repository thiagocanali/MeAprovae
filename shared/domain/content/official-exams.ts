export interface OfficialExam {
  id: string
  event: string
  year: number
  title: string
  board: string
  category: string
  sourcePage: string
  proofUrl: string
  answerKeyUrl: string
  answerKeyStatus: string
  answerKeyScope: string
  variant: string
  checkedAt: string
  access: string
  reproductionRights: string
  comparisonNote: string
  downloadVerified: boolean
}
const hosts = new Set([
  'www.gov.br',
  'conhecimento.fgv.br',
  'download.inep.gov.br',
])
export function isOfficialExamUrl(value: unknown): value is string {
  if (typeof value !== 'string') return false
  try {
    const url = new URL(value)
    return (
      url.protocol === 'https:' &&
      hosts.has(url.hostname) &&
      !url.username &&
      !url.password &&
      !url.port
    )
  } catch {
    return false
  }
}
export function filterOfficialExams(
  exams: OfficialExam[],
  search: string,
  event: string,
  year: string,
) {
  const normalize = (value: string) =>
    value
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLocaleLowerCase('pt-BR')
  const terms = normalize(search).trim().split(/\s+/).filter(Boolean)
  return exams.filter(
    (exam) =>
      (!event || exam.event === event) &&
      (!year || String(exam.year) === year) &&
      terms.every((term) =>
        normalize(
          [exam.title, exam.event, exam.board, exam.variant].join(' '),
        ).includes(term),
      ),
  )
}
export function officialArchiveForContest(slug: string) {
  const entries: Record<string, { event: string; year: string }> = {
    'acervo-cnu-2024': { event: 'CNU 1', year: '2024' },
    'acervo-cnu-2025': { event: 'CNU 2', year: '2025' },
    'acervo-trf1-servidores-2024': { event: 'TRF1 — Servidores', year: '2024' },
  }
  return entries[slug]
    ? { path: '/app/provas-oficiais', query: entries[slug] }
    : null
}
