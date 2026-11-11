import { describe, expect, it } from 'vitest'
import { isImportRequest, parseQuestionImport } from '../../shared/domain/questions/import'

const question = {
  externalId: 'q-1', statement: 'Qual é o resultado de 2 + 3?', explanation: 'O resultado da soma é cinco.', subject: 'Matemática',
  sourceLabel: 'Equipe', rights: 'original', rightsEvidence: 'Autoria própria.', difficulty: 'easy', options: ['4', '5'], correctOption: 1,
}
const parse = (item: unknown) => parseQuestionImport(JSON.stringify(item))
describe('editorial import preflight', () => {
  it('accepts complete original questions and trims text', () => {
    const result = parse({ ...question, statement: ` ${question.statement} ` })
    expect(result.issues).toEqual([])
    expect(result.questions[0]?.statement).toBe(question.statement)
    expect(result.questions[0]?.sourceUrl).toBeNull()
  })
  it.each([null, [], false, 'text'])('rejects non-object input %j', item => {
    expect(parse(item).issues.length).toBeGreaterThan(0)
  })
  it('reports physical line numbers including blanks', () => {
    expect(parseQuestionImport('\n{}\n\n{broken').issues.at(-1)?.line).toBe(4)
  })
  it('rejects empty content and bounds batch size', () => {
    expect(parseQuestionImport('  \n').issues[0]?.message).toContain('vazio')
    expect(parseQuestionImport('x'.repeat(2 * 1024 * 1024 + 1)).issues[0]?.message).toContain('2 MB')
    expect(parseQuestionImport(Array.from({ length: 101 }, (_, i) => JSON.stringify({ ...question, externalId: `q-${i}`, statement: `Enunciado original número ${i}` })).join('\n')).issues.at(-1)?.message).toContain('100')
  })
  it('rejects external content without source and evidence', () => {
    const result = parse({ ...question, rights: 'licensed', rightsEvidence: '' })
    expect(result.issues).toHaveLength(2)
    expect(parse({ ...question, rights: 'licensed', sourceUrl: 'https://example.org/license' }).issues).toEqual([])
  })
  it.each(['javascript:alert(1)', 'ftp://example.org/file', 'https://user:password@example.org'])('rejects unsafe source URL %s', sourceUrl => {
    expect(parse({ ...question, sourceUrl }).issues.length).toBeGreaterThan(0)
  })
  it.each([-1, 2, 0.5, '1', null])('rejects invalid answer index %j', correctOption => {
    expect(parse({ ...question, correctOption }).issues.length).toBeGreaterThan(0)
  })
  it('rejects duplicate options, non-string options and oversized explanation', () => {
    expect(parse({ ...question, options: [' A ', 'a'] }).issues.length).toBeGreaterThan(0)
    expect(parse({ ...question, options: [12, '5'] }).issues.length).toBeGreaterThan(0)
    expect(parse({ ...question, explanation: 'x'.repeat(12001) }).issues.length).toBeGreaterThan(0)
  })
  it('detects duplicated external IDs and normalized statements', () => {
    const result = parseQuestionImport([question, { ...question, statement: '  QUAL É O RESULTADO DE 2 + 3?  ' }].map(item => JSON.stringify(item)).join('\r\n'))
    expect(result.issues.map(issue => issue.message)).toEqual(['externalId duplicado no lote.', 'Enunciado duplicado no lote.'])
  })
  it('checks request identity and collection namespace', () => {
    const valid = { requestId: '11111111-1111-4111-8111-111111111111', noticeId: '22222222-2222-4222-8222-222222222222', sourceName: 'original-2026', jsonl: '' }
    expect(isImportRequest(valid)).toBe(true)
    expect(isImportRequest({ ...valid, requestId: 'bad' })).toBe(false)
    expect(isImportRequest({ ...valid, sourceName: 'Fonte com espaços' })).toBe(false)
  })
})
