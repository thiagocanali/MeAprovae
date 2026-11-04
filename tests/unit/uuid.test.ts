import { describe, expect, it } from 'vitest'
import { isUuid } from '../../shared/domain/common/uuid'

describe('isUuid', () => {
  it('accepts canonical UUID values, including RFC 9562 version 7', () => {
    expect(isUuid('550e8400-e29b-41d4-a716-446655440000')).toBe(true)
    expect(isUuid('550e8400-e29b-71d4-a716-446655440000')).toBe(true)
  })

  it.each([null, 123, '', 'not-a-uuid', '550e8400e29b41d4a716446655440000'])('rejects invalid UUID values: %s', (value) => {
    expect(isUuid(value)).toBe(false)
  })
})
