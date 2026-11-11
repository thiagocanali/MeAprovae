/** Supabase inference without generated database types may model a to-one
 * embed as an array. Normalize its runtime shape at the API boundary. */
export function relatedRow<T>(value: T | T[] | null | undefined): T | null {
  return Array.isArray(value) ? value[0] ?? null : value ?? null
}
