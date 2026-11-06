type SupabaseDiagnosticError = {
  code?: string
  message?: string
  details?: string
  hint?: string
}

/**
 * Registra metadados técnicos do PostgREST apenas nos logs do servidor.
 * Não registra tokens, cookies, cabeçalhos ou dados retornados pelas consultas.
 */
export function logSupabaseError(context: string, error: SupabaseDiagnosticError) {
  console.error('[supabase]', {
    context,
    code: error.code ?? null,
    message: error.message ?? null,
    details: error.details ?? null,
    hint: error.hint ?? null,
  })
}
