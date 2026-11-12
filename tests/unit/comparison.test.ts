import { describe, expect, it } from 'vitest'
import { COMPARISON_CONSENT_VERSION, parseComparisonParticipation } from '../../shared/domain/questions/comparison'
describe('voluntary comparison consent', () => {
  it('requires explicit current consent before enabling', () => {
    expect(parseComparisonParticipation({ enabled: true, consentVersion: COMPARISON_CONSENT_VERSION })).toEqual({ enabled: true, consentVersion: COMPARISON_CONSENT_VERSION })
    expect(parseComparisonParticipation({ enabled: true })).toBeNull()
    expect(parseComparisonParticipation({ enabled: true, consentVersion: 'old' })).toBeNull()
  })
  it('permits withdrawal without accepting a newer text', () => {
    expect(parseComparisonParticipation({ enabled: false })).toEqual({ enabled: false, consentVersion: null })
    expect(parseComparisonParticipation({ enabled: false, consentVersion: 'old' })).toEqual({ enabled: false, consentVersion: null })
  })
  it.each([null, [], {}, { enabled: 'true' }, { enabled: 1 }, { enabled: false, userId: 'someone-else' }])('rejects ambiguous or targeted input %j', value => {
    expect(parseComparisonParticipation(value)).toBeNull()
  })
})
