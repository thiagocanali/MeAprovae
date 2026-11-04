export function normalizeEmail(value: unknown): string | null {
  if (typeof value !== 'string') return null
  const email = value.trim().toLowerCase()
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) ? email : null
}

export function normalizeDisplayName(value: unknown): string | null {
  if (typeof value !== 'string') return null
  const displayName = value.trim()
  return displayName.length >= 2 && displayName.length <= 60 ? displayName : null
}

export function isValidPassword(value: unknown): value is string {
  return typeof value === 'string' && value.length >= 8 && value.length <= 72
}
