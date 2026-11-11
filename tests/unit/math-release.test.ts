import { readFileSync } from 'node:fs'
import { createHash } from 'node:crypto'
import { describe, expect, it } from 'vitest'
import { parseQuestionImport } from '../../shared/domain/questions/import'

const content = readFileSync(new URL('../../content/releases/matematica-original-001.jsonl', import.meta.url), 'utf8')
const manifest = JSON.parse(readFileSync(new URL('../../content/releases/matematica-original-001.manifest.json', import.meta.url), 'utf8'))
describe('original math release', () => {
  it('passes the same full preflight used by the import API and editor UI', () => {
    const result = parseQuestionImport(content)
    expect(result.issues).toEqual([])
    expect(result.questions).toHaveLength(100)
  })
  it('preserves its content hash and pending human review declaration', () => {
    expect(createHash('sha256').update(content).digest('hex')).toBe(manifest.contentSha256)
    expect(manifest.reviewStatus).toBe('pending_human_review')
    expect(manifest.reviewer).toBeNull()
  })
})
