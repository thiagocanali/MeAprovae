import { describe, expect, it } from 'vitest'
import {
  parseCatalogReview,
  evidenceUrl,
  REVIEW_ATTESTATION_VERSION,
} from '../../shared/domain/questions/exam-catalog-review'
const id = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa'
const input = {
  requestId: id,
  expectedRevision: 3,
  expectedFingerprint: 'a'.repeat(64),
  decision: 'approved',
  notes: 'Parecer sintético para contrato de teste.',
  rights: [
    {
      questionId: id,
      basis: 'original',
      evidence: 'Evidência sintética original para teste.',
      sourceUrl: null,
    },
  ],
  attestations: {
    content: true,
    answers: true,
    explanations: true,
    rights: true,
    independent: true,
  },
  attestationVersion: REVIEW_ATTESTATION_VERSION,
}
describe('human review declarations are explicit and cannot choose an actor', () => {
  it('normalizes identifiers and notes without inventing an identity or approval', () => {
    const result = parseCatalogReview({
      ...input,
      requestId: id.toUpperCase(),
      notes: '  ' + input.notes + '  ',
    })
    expect(result).toEqual(input)
    expect(result).not.toHaveProperty('reviewerId')
  })
  it.each([
    'reviewerId',
    'reviewer_role',
    'createdAt',
    'rightsChecked',
    'publishedAt',
    'content_snapshot',
  ])('rejects forged field %s', (key) =>
    expect(parseCatalogReview({ ...input, [key]: 'forged' })).toBeNull(),
  )
  it.each([0, -1, 1.5, '3', 2147483648])(
    'rejects invalid revision %s',
    (expectedRevision) =>
      expect(parseCatalogReview({ ...input, expectedRevision })).toBeNull(),
  )
  it.each(['', 'a'.repeat(63), 'A'.repeat(64), 'not-a-fingerprint'])(
    'requires the precise fingerprint %s',
    (expectedFingerprint) =>
      expect(parseCatalogReview({ ...input, expectedFingerprint })).toBeNull(),
  )
  it('requires every declaration for approval, including independence', () => {
    for (const key of Object.keys(input.attestations))
      expect(
        parseCatalogReview({
          ...input,
          attestations: { ...input.attestations, [key]: false },
        }),
      ).toBeNull()
    expect(
      parseCatalogReview({
        ...input,
        attestations: { ...input.attestations, extra: true },
      }),
    ).toBeNull()
    expect(
      parseCatalogReview({ ...input, attestationVersion: 'unknown' }),
    ).toBeNull()
  })
  it('can request changes while explicitly leaving rights unverified', () => {
    expect(
      parseCatalogReview({
        ...input,
        decision: 'changes_requested',
        attestations: { ...input.attestations, rights: false },
        rights: [{ ...input.rights[0], basis: 'unverified' }],
      }),
    ).toBeTruthy()
    expect(
      parseCatalogReview({
        ...input,
        rights: [{ ...input.rights[0], basis: 'unverified' }],
      }),
    ).toBeNull()
  })
  it('requires useful evidence and reference URLs for licensed/external rights', () => {
    expect(
      parseCatalogReview({
        ...input,
        rights: [{ ...input.rights[0], evidence: 'curta' }],
      }),
    ).toBeNull()
    expect(
      parseCatalogReview({
        ...input,
        rights: [{ ...input.rights[0], basis: 'licensed' }],
      }),
    ).toBeNull()
    expect(
      parseCatalogReview({
        ...input,
        rights: [
          {
            ...input.rights[0],
            basis: 'licensed',
            sourceUrl: 'https://example.org/license',
          },
        ],
      }),
    ).toBeTruthy()
  })
  it('rejects duplicate question IDs across different letter casing', () =>
    expect(
      parseCatalogReview({
        ...input,
        rights: [
          input.rights[0],
          { ...input.rights[0], questionId: id.toUpperCase() },
        ],
      }),
    ).toBeNull())
  it.each([
    'javascript:alert(1)',
    'https://user:pass@example.org',
    'https://exam ple.org',
    'https://example.org/\\unsafe',
    'http://example.org:99999',
  ])('rejects unsafe evidence link %s', (value) =>
    expect(evidenceUrl(value)).toBeUndefined(),
  )
  it('does not accept empty payloads, overlong notes or implicit checklists', () => {
    for (const value of [
      null,
      [],
      {},
      { ...input, notes: 'x'.repeat(4001) },
      { ...input, attestations: {} },
      { ...input, rights: [] },
    ])
      expect(parseCatalogReview(value)).toBeNull()
  })
})
