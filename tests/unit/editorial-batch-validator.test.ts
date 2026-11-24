import { afterEach, describe, expect, it } from 'vitest'
import { execFileSync, spawnSync } from 'node:child_process'
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

const directories: string[] = []
const original = {
  externalId: 'QUESTAO-001',
  statement: 'Uma pergunta original sobre lógica e interpretação?',
  explanation: 'A alternativa correta é sustentada pela dedução apresentada.',
  subject: 'Raciocínio lógico',
  sourceLabel: 'Questão autoral',
  rights: 'original',
  difficulty: 'medium',
  difficultyReviewed: false,
  options: ['Primeira opção', 'Segunda opção', 'Terceira opção'],
  correctOption: 1,
}
function runBatch(lines: unknown[]) {
  const dir = mkdtempSync(join(tmpdir(), 'meaprovae-editorial-'))
  directories.push(dir)
  const file = join(dir, 'batch.jsonl')
  writeFileSync(file, lines.map(line => typeof line === 'string' ? line : JSON.stringify(line)).join('\n') + '\n')
  return spawnSync(process.execPath, ['scripts/validate-question-bank.mjs', file], { encoding: 'utf8' })
}
afterEach(() => { for (const dir of directories.splice(0)) rmSync(dir, { recursive: true, force: true }) })

describe('question bank editorial batch validator', () => {
  it('accepts an explicitly unreviewed original without implying publication', () => {
    const result = runBatch([original])
    expect(result.status).toBe(0)
    expect(JSON.parse(result.stdout)).toMatchObject({ accepted: 1, invalid: 0, published: 0 })
  })

  it('rejects duplicate identifiers and equivalent statement formatting', () => {
    const result = runBatch([original, { ...original, externalId: '  questao-001  ', statement: 'Uma   pergunta original sobre lógica e interpretação?' }])
    expect(result.status).toBe(1)
    expect(result.stderr).toContain('externalId duplicado no lote')
    expect(result.stderr).toContain('Enunciado duplicado no lote')
  })

  it('requires evidence for licensed content and rejects unsafe URLs', () => {
    const result = runBatch([{ ...original, rights: 'licensed', sourceUrl: 'https://user:password@example.org/file' }])
    expect(result.status).toBe(1)
    expect(result.stderr).toContain('Evidência de licença obrigatória')
    expect(result.stderr).toContain('URL da fonte inválida')
  })

  it('does not allow unreviewed difficulty to masquerade as reviewed', () => {
    const missingFlag = runBatch([{ ...original, difficultyReviewed: undefined }])
    expect(missingFlag.stderr).toContain('difficultyReviewed')
    const noRationale = runBatch([{ ...original, difficultyReviewed: true }])
    expect(noRationale.stderr).toContain('Justificativa de dificuldade')
  })

  it('rejects duplicate options and incorrect keys', () => {
    const result = runBatch([{ ...original, options: ['A', ' a ', 'B'], correctOption: 10 }])
    expect(result.status).toBe(1)
    expect(result.stderr).toContain('Alternativas duplicadas')
    expect(result.stderr).toContain('Índice do gabarito inválido')
  })

  it('rejects broken JSON and keeps processing remaining questions', () => {
    const result = runBatch(['{broken-json', original])
    expect(result.status).toBe(1)
    expect(JSON.parse(result.stdout)).toMatchObject({ accepted: 1, invalid: 1, published: 0 })
  })
})
