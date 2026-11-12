export const COMPARISON_CONSENT_VERSION = '2026-11-v1'
export type ComparisonStatus = 'disabled' | 'missing_goal' | 'insufficient_questions' | 'reference_unavailable' | 'incomplete_reference' | 'insufficient_group' | 'ready'
export interface StudyComparison {
  enabled: boolean; status: ComparisonStatus; consentVersion: string; monthStart: string; timezone: string
  requiredQuestions: number; minimumPeers: number; yourAnswered: number; yourAccuracy: number | null
  peerAverage: number | null; contestTitle: string | null
  questions: Array<{ id: string; position: number; statementPreview: string; answered: boolean }>
}
export function parseComparisonParticipation(value: unknown): { enabled: boolean; consentVersion: string | null } | null {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null
  const body = value as Record<string, unknown>
  if (Object.keys(body).some(key => !['enabled', 'consentVersion'].includes(key)) || typeof body.enabled !== 'boolean') return null
  if (body.enabled && body.consentVersion !== COMPARISON_CONSENT_VERSION) return null
  return { enabled: body.enabled, consentVersion: body.enabled ? COMPARISON_CONSENT_VERSION : null }
}
