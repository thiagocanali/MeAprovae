import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import { validateExamCatalog, type VersionedExamModel } from '../../shared/domain/questions/exam-model'

describe('versioned exam catalog manifest', () => {
  it('has a supported schema and does not silently publish unreviewed editorial proposals', () => {
    const catalog = JSON.parse(readFileSync('content/exam-models/catalog.json', 'utf8')) as {
      schemaVersion: number
      models: VersionedExamModel[]
    }
    expect(catalog.schemaVersion).toBe(1)
    expect(validateExamCatalog(catalog.models)).toEqual({ valid: true, errors: [] })
    expect(catalog.models.every(model => model.status !== 'published')).toBe(true)
  })
})
