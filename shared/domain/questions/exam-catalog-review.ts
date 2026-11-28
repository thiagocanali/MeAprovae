import { isUuid } from '../common/uuid'
export const REVIEW_ATTESTATION_VERSION = 'catalog-human-review-v1'
export type RightsBasis =
  | 'original'
  | 'licensed'
  | 'public-domain'
  | 'unverified'
export interface ReviewRights {
  questionId: string
  basis: RightsBasis
  evidence: string
  sourceUrl: string | null
}
export interface ReviewAttestations {
  content: boolean
  answers: boolean
  explanations: boolean
  rights: boolean
  independent: boolean
}
export interface ReviewInput {
  requestId: string
  expectedRevision: number
  expectedFingerprint: string
  decision: 'approved' | 'changes_requested'
  notes: string
  rights: ReviewRights[]
  attestations: ReviewAttestations
  attestationVersion: typeof REVIEW_ATTESTATION_VERSION
}
export interface ReviewQuestion {
  position: number
  questionId: string
  subjectId: string
  subjectName: string
  statement: string
  status: string
  sourceLabel: string | null
  sourceUrl: string | null
  sourceYear: number | null
  difficulty: string
  difficultyReviewed: boolean
  correctOptionId: string | null
  explanation: string
  options: Array<{
    id: string
    label: string
    content: string
    position: number
  }>
}
export interface ReviewSnapshot {
  subjectDistribution?: import('./exam-catalog-quality').SubjectTarget[]
  modelId: string
  version: number
  editRevision: number
  status: 'draft' | 'in_review'
  title: string
  description: string
  kind: string
  questionCount: number
  durationMinutes: number
  questions: ReviewQuestion[]
}
export interface ReviewRecord {
  id: string
  model_id: string
  version: number
  edit_revision: number
  fingerprint: string
  reviewer_id: string
  reviewer_role: string
  decision: ReviewInput['decision']
  notes: string
  rights: ReviewRights[]
  attestations: ReviewAttestations
  created_at: string
  isCurrent?: boolean
}
export interface ReviewContext {
  snapshot: ReviewSnapshot
  fingerprint: string
  independentReviewer: boolean
  issues: string[]
  latestReview: ReviewRecord | null
  publicationEnabled: false
  attestationVersion: typeof REVIEW_ATTESTATION_VERSION
}
const record = (value: unknown): value is Record<string, unknown> =>
  !!value && typeof value === 'object' && !Array.isArray(value)
const exact = (value: Record<string, unknown>, keys: string[]) =>
  Object.keys(value).length === keys.length &&
  keys.every((key) => Object.hasOwn(value, key))
export function evidenceUrl(value: unknown): string | null | undefined {
  if (value === null || value === undefined || value === '') return null
  if (typeof value !== 'string' || value.length > 1200 || /[\s\\]/.test(value))
    return undefined
  try {
    const url = new URL(value)
    return ['https:', 'http:'].includes(url.protocol) &&
      !url.username &&
      !url.password
      ? url.toString()
      : undefined
  } catch {
    return undefined
  }
}
export function parseCatalogReview(value: unknown): ReviewInput | null {
  if (
    !record(value) ||
    !exact(value, [
      'requestId',
      'expectedRevision',
      'expectedFingerprint',
      'decision',
      'notes',
      'rights',
      'attestations',
      'attestationVersion',
    ])
  )
    return null
  if (
    !isUuid(value.requestId) ||
    typeof value.expectedRevision !== 'number' ||
    !Number.isSafeInteger(value.expectedRevision) ||
    value.expectedRevision < 1 ||
    value.expectedRevision > 2147483647 ||
    typeof value.expectedFingerprint !== 'string' ||
    !/^[a-f0-9]{64}$/.test(value.expectedFingerprint) ||
    !['approved', 'changes_requested'].includes(value.decision as string) ||
    typeof value.notes !== 'string' ||
    value.notes.trim().length < 20 ||
    value.notes.trim().length > 4000 ||
    value.attestationVersion !== REVIEW_ATTESTATION_VERSION
  )
    return null
  const checks = value.attestations
  const keys = ['content', 'answers', 'explanations', 'rights', 'independent']
  if (
    !record(checks) ||
    !exact(checks, keys) ||
    keys.some((key) => typeof checks[key] !== 'boolean') ||
    checks.independent !== true
  )
    return null
  if (
    !Array.isArray(value.rights) ||
    value.rights.length < 1 ||
    value.rights.length > 20
  )
    return null
  const rights: ReviewRights[] = []
  for (const item of value.rights) {
    if (
      !record(item) ||
      !exact(item, ['questionId', 'basis', 'evidence', 'sourceUrl']) ||
      !isUuid(item.questionId) ||
      !['original', 'licensed', 'public-domain', 'unverified'].includes(
        item.basis as string,
      ) ||
      typeof item.evidence !== 'string' ||
      item.evidence.trim().length < 20 ||
      item.evidence.trim().length > 1200
    )
      return null
    const sourceUrl = evidenceUrl(item.sourceUrl)
    if (
      sourceUrl === undefined ||
      (['licensed', 'public-domain'].includes(item.basis as string) &&
        !sourceUrl)
    )
      return null
    rights.push({
      questionId: item.questionId.toLowerCase(),
      basis: item.basis as RightsBasis,
      evidence: item.evidence.trim(),
      sourceUrl,
    })
  }
  if (new Set(rights.map((item) => item.questionId)).size !== rights.length)
    return null
  if (
    value.decision === 'approved' &&
    (keys.some((key) => checks[key] !== true) ||
      rights.some((item) => item.basis === 'unverified'))
  )
    return null
  return {
    requestId: value.requestId.toLowerCase(),
    expectedRevision: value.expectedRevision,
    expectedFingerprint: value.expectedFingerprint,
    decision: value.decision as ReviewInput['decision'],
    notes: value.notes.trim(),
    rights,
    attestations: checks as unknown as ReviewAttestations,
    attestationVersion: REVIEW_ATTESTATION_VERSION,
  }
}
