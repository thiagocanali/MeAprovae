import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import {
  filterOfficialExams,
  isOfficialExamUrl,
  officialArchiveForContest,
  type OfficialExam,
} from '../../shared/domain/content/official-exams'
const catalog = JSON.parse(
  readFileSync('content/sources/official-exams.json', 'utf8'),
) as { exams: OfficialExam[] }
const verification = JSON.parse(
  readFileSync('content/sources/official-exams-verification.json', 'utf8'),
) as {
  files: Array<{
    url: string
    status?: number
    error?: string
    sha256?: string
    pages?: number
  }>
}
describe('official exam source catalog', () => {
  it('connects only historical seed contests to verified archive material', () => {
    const seed = JSON.parse(
      readFileSync('content/sources/contest-seed.json', 'utf8'),
    )
    expect(seed.contests).toHaveLength(3)
    for (const item of seed.contests) {
      const route = officialArchiveForContest(item.slug)
      expect(route?.path).toBe('/app/provas-oficiais')
      expect(
        catalog.exams.some(
          (exam) =>
            exam.downloadVerified &&
            exam.event === route?.query?.event &&
            String(exam.year) === route?.query?.year,
        ),
      ).toBe(true)
      expect(item.title).toContain('provas anteriores')
    }
    expect(officialArchiveForContest('banco-autoral-geral')).toBeNull()
  })
  it('keeps unique proofs and explicit historical source context', () => {
    expect(catalog.exams).toHaveLength(36)
    expect(new Set(catalog.exams.map((exam) => exam.id)).size).toBe(36)
    expect(new Set(catalog.exams.map((exam) => exam.proofUrl)).size).toBe(36)
    for (const exam of catalog.exams) {
      expect(
        [exam.sourcePage, exam.proofUrl, exam.answerKeyUrl].every(
          isOfficialExamUrl,
        ),
      ).toBe(true)
      expect(exam.answerKeyStatus).toBe('definitive')
      expect(exam.reproductionRights).toBe('not-assessed')
      expect(exam.checkedAt).toBe('2026-11-25')
      expect(exam.comparisonNote.length).toBeGreaterThan(15)
    }
  })
  it('does not mark a pair verified when either download failed', () => {
    const files = new Map(verification.files.map((file) => [file.url, file]))
    for (const exam of catalog.exams) {
      const downloads = [files.get(exam.proofUrl), files.get(exam.answerKeyUrl)]
      expect(downloads.every(Boolean)).toBe(true)
      expect(exam.downloadVerified).toBe(
        downloads.every((file) => file && !file.error && file.status === 200),
      )
      if (exam.downloadVerified)
        for (const file of downloads) {
          expect(file?.sha256).toMatch(/^[a-f0-9]{64}$/)
          expect(file?.pages).toBeGreaterThan(0)
        }
    }
    expect(catalog.exams.filter((exam) => exam.downloadVerified)).toHaveLength(
      21,
    )
    expect(catalog.exams.filter((exam) => !exam.downloadVerified)).toHaveLength(
      15,
    )
  })
  it('keeps consolidated keys tied to block/cargo and booklet guidance', () => {
    for (const exam of catalog.exams.filter(
      (exam) => exam.answerKeyScope === 'combined-booklets',
    )) {
      expect(exam.comparisonNote).toContain('tipo de caderno')
      expect(exam.variant.length).toBeGreaterThan(3)
    }
  })
  it('filters literal accented search with event and year', () => {
    const result = filterOfficialExams(
      catalog.exams,
      'ciencia dados',
      'CNU 2',
      '2025',
    )
    expect(result).toHaveLength(1)
    expect(result[0]?.id).toBe('cnu2-2025-b3-t1')
    expect(filterOfficialExams(catalog.exams, '.*', '', '')).toEqual([])
    expect(filterOfficialExams(catalog.exams, '', 'Enem', '2024')).toHaveLength(
      2,
    )
  })
  it('rejects external, executable, credential and port URLs', () => {
    for (const url of [
      'https://example.org/exam.pdf',
      'https://www.gov.br.evil.test/a',
      'javascript:alert(1)',
      'https://user:password@www.gov.br/a',
      'https://www.gov.br:8443/a',
      'http://www.gov.br/a',
    ])
      expect(isOfficialExamUrl(url)).toBe(false)
  })
})
