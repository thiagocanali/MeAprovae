import { describe, expect, it } from 'vitest'
import { calculateModelOverlap, changesPublishedSnapshot, validateExamCatalog, validateExamModel, type VersionedExamModel } from '../../shared/domain/questions/exam-model'

const modelId = '11111111-1111-4111-8111-111111111111'
const subjectA = '22222222-2222-4222-8222-222222222222'
const subjectB = '33333333-3333-4333-8333-333333333333'
const questionA = '44444444-4444-4444-8444-444444444444'
const questionB = '55555555-5555-4555-8555-555555555555'
function base(): VersionedExamModel {
  return {
    modelId, version: 1, title: 'Fundamentos de Matemática',
    description: 'Exercício editorial com composição fixa.',
    kind: 'subject-foundations', status: 'draft', durationMinutes: 12,
    questionIds: [questionA, questionB],
    allocation: [{ subjectId: subjectA, questionIds: [questionA, questionB] }],
    reviewedBy: null, reviewedAt: null, rightsChecked: false, publishedAt: null,
  }
}
describe('versioned exam model editorial boundaries', () => {
  it('accepts structurally valid drafts without claiming they are published', () => {
    expect(validateExamModel(base())).toEqual({ valid: true, errors: [] })
  })
  it('rejects duplicate or malformed question IDs', () => {
    expect(validateExamModel({ ...base(), questionIds: [questionA, questionA] }).valid).toBe(false)
    expect(validateExamModel({ ...base(), questionIds: ['invalid', questionB] }).valid).toBe(false)
  })
  it('enforces duration and exact subject distribution', () => {
    expect(validateExamModel({ ...base(), durationMinutes: 60 }).errors).toContain('Duração deve corresponder a seis minutos por questão')
    expect(validateExamModel({ ...base(), allocation: [{ subjectId: subjectA, questionIds: [questionA] }] }).valid).toBe(false)
    expect(validateExamModel({ ...base(), allocation: [{ subjectId: subjectA, questionIds: [questionA, questionA] }] }).valid).toBe(false)
  })
  it('requires multiple subjects for multidisciplinary models and one for single-subject models', () => {
    expect(validateExamModel({ ...base(), kind: 'multidisciplinary' }).valid).toBe(false)
    expect(validateExamModel({ ...base(), kind: 'multidisciplinary', allocation: [
      { subjectId: subjectA, questionIds: [questionA] },
      { subjectId: subjectB, questionIds: [questionB] },
    ] }).valid).toBe(true)
    expect(validateExamModel({ ...base(), allocation: [
      { subjectId: subjectA, questionIds: [questionA] },
      { subjectId: subjectB, questionIds: [questionB] },
    ] }).valid).toBe(false)
  })
  it('blocks publication without reviewer, rights check and publication date', () => {
    expect(validateExamModel({ ...base(), status: 'published' }).valid).toBe(false)
    expect(validateExamModel({ ...base(), status: 'published', reviewedBy: 'Revisor editorial autorizado',
      reviewedAt: '2026-11-24T12:00:00Z', rightsChecked: true, publishedAt: '2026-11-24T14:00:00Z' }).valid).toBe(true)
  })
  it('rejects publication date for a draft', () => {
    expect(validateExamModel({ ...base(), publishedAt: '2026-11-24T14:00:00Z' }).valid).toBe(false)
  })
  it('does not allow two entries with the same model and version', () => {
    expect(validateExamCatalog([base(), { ...base() }]).errors.some(error => error.includes('Versão duplicada'))).toBe(true)
    expect(validateExamCatalog([base(), { ...base(), version: 2 }]).valid).toBe(true)
  })
  it('measures repeat use of question IDs across proposed models', () => {
    expect(calculateModelOverlap(base(), { ...base(), questionIds: [questionA], allocation: [{ subjectId: subjectA, questionIds: [questionA] }] })).toBe(1)
    expect(calculateModelOverlap(base(), { ...base(), questionIds: ['66666666-6666-4666-8666-666666666666'] })).toBe(0)
  })
  it('detects attempts to rewrite a published version instead of incrementing it', () => {
    const published = { ...base(), status: 'published' as const }
    expect(changesPublishedSnapshot(published, { ...published, questionIds: [questionA] })).toBe(true)
    expect(changesPublishedSnapshot(published, { ...published, version: 2, questionIds: [questionA] })).toBe(false)
    expect(changesPublishedSnapshot(base(), { ...base(), questionIds: [questionA] })).toBe(false)
  })
})
