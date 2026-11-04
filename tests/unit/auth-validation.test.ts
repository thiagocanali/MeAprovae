import { describe, expect, it } from 'vitest'
import { isValidPassword, normalizeDisplayName, normalizeEmail } from '../../shared/domain/auth/validation'

describe('normalizeEmail', () => {
  it('trims whitespace and normalizes casing', () => {
    expect(normalizeEmail('  STUDENT@EXAMPLE.COM ')).toBe('student@example.com')
  })

  it.each(['', 'not-an-email', 'student@', '@example.com', null, 42])('rejects invalid email input: %s', (value) => {
    expect(normalizeEmail(value)).toBeNull()
  })
})

describe('normalizeDisplayName', () => {
  it('trims a valid display name', () => {
    expect(normalizeDisplayName('  Ana Silva  ')).toBe('Ana Silva')
  })

  it.each(['A', '', ' '.repeat(3), 'x'.repeat(61), null, 10])('rejects invalid display names: %s', (value) => {
    expect(normalizeDisplayName(value)).toBeNull()
  })
})

describe('isValidPassword', () => {
  it('accepts passwords within the supported length', () => {
    expect(isValidPassword('12345678')).toBe(true)
    expect(isValidPassword('x'.repeat(72))).toBe(true)
  })

  it('rejects short, long and non-string values', () => {
    expect(isValidPassword('short')).toBe(false)
    expect(isValidPassword('x'.repeat(73))).toBe(false)
    expect(isValidPassword(null)).toBe(false)
  })
})
