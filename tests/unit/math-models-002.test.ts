import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import {
  calculateModelOverlap,
  validateExamCatalog,
  type VersionedExamModel,
} from '../../shared/domain/questions/exam-model'
const catalog = JSON.parse(
  readFileSync('content/exam-models/catalog.json', 'utf8'),
) as { models: VersionedExamModel[] }
const provenance = JSON.parse(
  readFileSync('content/exam-models/math-002-provenance.json', 'utf8'),
) as {
  release: string
  contentSha256: string
  subjectId: string
  models: Array<{
    modelId: string
    family: string
    externalIds: string[]
    questionIds: string[]
  }>
}
const release = JSON.parse(
  readFileSync(
    'content/releases/matematica-original-002.manifest.json',
    'utf8',
  ),
) as { contentSha256: string; checks: Array<{ externalId: string }> }
describe('new thematic study booklets', () => {
  it('has 20 valid draft definitions with no claimed human approval', () => {
    expect(catalog.models).toHaveLength(20)
    expect(validateExamCatalog(catalog.models)).toEqual({
      valid: true,
      errors: [],
    })
    for (const model of catalog.models) {
      expect(model.status).toBe('draft')
      expect(model.reviewedBy).toBeNull()
      expect(model.reviewedAt).toBeNull()
      expect(model.rightsChecked).toBe(false)
      expect(model.publishedAt).toBeNull()
      expect(model.questionIds).toHaveLength(5)
      expect(model.durationMinutes).toBe(30)
    }
  })
  it('fixes 100 distinct question IDs with zero overlap between booklets', () => {
    expect(
      new Set(catalog.models.flatMap((model) => model.questionIds)).size,
    ).toBe(100)
    for (let i = 0; i < catalog.models.length; i++)
      for (let j = i + 1; j < catalog.models.length; j++)
        expect(
          calculateModelOverlap(catalog.models[i]!, catalog.models[j]!),
        ).toBe(0)
  })
  it('retains the installed source identity without inventing extra objectives', () => {
    expect(provenance.release).toBe('matematica-original-002')
    expect(provenance.contentSha256).toBe(release.contentSha256)
    expect(new Set(provenance.models.map((model) => model.family)).size).toBe(
      20,
    )
    expect(
      provenance.models.flatMap((model) => model.externalIds).sort(),
    ).toEqual(release.checks.map((item) => item.externalId).sort())
    for (const entry of provenance.models) {
      const model = catalog.models.find(
        (model) => model.modelId === entry.modelId,
      )
      expect(model?.questionIds).toEqual(entry.questionIds)
      expect(model?.allocation[0]?.subjectId).toBe(provenance.subjectId)
    }
  })
})
