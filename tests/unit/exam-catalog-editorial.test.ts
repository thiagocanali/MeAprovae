import { describe, expect, it } from 'vitest'
import {
  catalogVersion,
  parseCatalogCreate,
  parseCatalogSave,
  parseCatalogClone,
  parseCatalogTransition,
  parseCatalogQuery,
} from '../../shared/domain/questions/exam-catalog-editorial'
const modelId = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa'
const questionId = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb'
const fields = {
  title: '  Fundamentos  ',
  description: 'Composição editorial em rascunho.',
  kind: 'subject-foundations',
  questionCount: 2,
}
describe('editorial catalog command boundary', () => {
  it('normalizes stable IDs/text and creates an incomplete draft without claiming review', () => {
    expect(
      parseCatalogCreate({ ...fields, modelId: modelId.toUpperCase() }),
    ).toEqual({ ...fields, title: 'Fundamentos', modelId })
    expect(
      parseCatalogSave({ ...fields, expectedRevision: 1, questionIds: [] }),
    ).toMatchObject({ questionIds: [], expectedRevision: 1 })
  })
  it.each([
    'status',
    'reviewed_by',
    'reviewedBy',
    'rightsChecked',
    'publishedAt',
    'created_by',
    'durationMinutes',
  ])('rejects client-owned editorial privilege field %s', (key) => {
    expect(parseCatalogCreate({ ...fields, modelId, [key]: true })).toBeNull()
    expect(
      parseCatalogSave({
        ...fields,
        expectedRevision: 1,
        questionIds: [questionId],
        [key]: true,
      }),
    ).toBeNull()
  })
  it.each([
    null,
    [],
    {},
    true,
    { ...fields, modelId: 'not-uuid' },
    { ...fields, modelId, questionCount: 21 },
    { ...fields, modelId, questionCount: 1.5 },
    { ...fields, modelId, title: 'ab' },
    { ...fields, modelId, kind: 'official' },
    { ...fields, modelId, description: 'x'.repeat(801) },
  ])('rejects invalid draft payload %j', (value) =>
    expect(parseCatalogCreate(value)).toBeNull(),
  )
  it('rejects duplicate questions even when UUID casing differs, and never fills from another subject', () => {
    expect(
      parseCatalogSave({
        ...fields,
        expectedRevision: 1,
        questionIds: [questionId, questionId.toUpperCase()],
      }),
    ).toBeNull()
    expect(
      parseCatalogSave({
        ...fields,
        questionCount: 1,
        expectedRevision: 1,
        questionIds: [questionId, modelId],
      }),
    ).toBeNull()
    expect(
      parseCatalogSave({
        ...fields,
        expectedRevision: 1,
        questionIds: [questionId],
      }),
    ).toMatchObject({ questionIds: [questionId], questionCount: 2 })
  })
  it.each([undefined, 0, -1, '1', 1.5, 2147483648])(
    'requires explicit integer revision %s',
    (expectedRevision) =>
      expect(
        parseCatalogSave({ ...fields, expectedRevision, questionIds: [] }),
      ).toBeNull(),
  )
  it('requires explicit target and source revision for clone/replay', () => {
    expect(
      parseCatalogClone({ version: 2, sourceVersion: 1, sourceRevision: 3 }),
    ).toEqual({ version: 2, sourceVersion: 1, sourceRevision: 3 })
    expect(
      parseCatalogClone({ version: 1, sourceVersion: 1, sourceRevision: 3 }),
    ).toBeNull()
    expect(
      parseCatalogClone({
        version: 2,
        sourceVersion: 1,
        sourceRevision: 3,
        rightsChecked: true,
      }),
    ).toBeNull()
  })
  it('supports only review request and explicit return to draft', () => {
    expect(
      parseCatalogTransition({ action: 'request_review', expectedRevision: 2 }),
    ).toEqual({ action: 'request_review', expectedRevision: 2 })
    expect(
      parseCatalogTransition({
        action: 'return_to_draft',
        expectedRevision: 3,
      }),
    ).toBeTruthy()
    expect(
      parseCatalogTransition({ action: 'publish', expectedRevision: 1 }),
    ).toBeNull()
    expect(
      parseCatalogTransition({ action: 'approve', expectedRevision: 1 }),
    ).toBeNull()
  })
  it.each(['0', '-1', '1.5', '01', '2147483648', [], null])(
    'rejects invalid URL version %j',
    (value) => expect(catalogVersion(value)).toBeNull(),
  )
  it('bounds list filters and rejects ambiguous/unknown query parameters', () => {
    expect(parseCatalogQuery({})).toMatchObject({
      page: 1,
      pageSize: 20,
      status: 'all',
      kind: 'all',
      search: '',
    })
    expect(
      parseCatalogQuery({
        status: 'in_review',
        search: '  direito  ',
        page: '2',
        pageSize: '50',
      }),
    ).toMatchObject({ offset: 50, search: 'direito' })
    for (const query of [
      { pageSize: '51' },
      { status: 'published' },
      { status: ['draft', 'in_review'] },
      { kind: 'official' },
      { search: 'x'.repeat(121) },
      { owner: 'forged' },
    ])
      expect(parseCatalogQuery(query)).toBeNull()
  })
})

describe('composition preview does not fabricate eligibility', () => {
  it('counts explicit subjects, detects incomplete/archived/stale compositions and requires diversity', async () => {
    const { inspectCatalogComposition: inspect } = await import(
      '../../shared/domain/questions/exam-catalog-editorial'
    )
    const a = {
      position: 1,
      questionId,
      subjectId: modelId,
      sourceSubjectId: modelId,
      sourceAvailable: true,
    }
    expect(inspect('subject-foundations', 1, [a])).toMatchObject({
      readyForReview: true,
      issues: [],
      distribution: [{ subjectId: modelId, questionCount: 1 }],
    })
    expect(inspect('subject-foundations', 2, [a]).issues).toContain(
      'incomplete',
    )
    expect(inspect('multidisciplinary', 1, [a]).issues).toContain(
      'distribution',
    )
    expect(
      inspect('subject-foundations', 1, [{ ...a, sourceAvailable: false }])
        .issues,
    ).toContain('source')
    expect(
      inspect('subject-foundations', 1, [{ ...a, sourceSubjectId: questionId }])
        .issues,
    ).toContain('source')
    expect(
      inspect('subject-foundations', 2, [a, { ...a, position: 3 }]).issues,
    ).toEqual(expect.arrayContaining(['duplicate', 'positions']))
  })
})
