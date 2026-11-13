const publicMessages = new Set([
  'Informe e-mail e senha válidos.',
  'E-mail ou senha inválidos.',
  'Informe um e-mail válido.',
  'A senha deve ter entre 8 e 72 caracteres.',
  'Informe um nome entre 2 e 60 caracteres.',
  'Não foi possível criar a conta. Confira os dados e tente novamente.',
  'Não foi possível solicitar a recuperação. Tente novamente mais tarde.',
  'Sua sessão expirou. Solicite um novo link de recuperação.',
  'Não foi possível atualizar a senha. Solicite um novo link.',
])

/** Exibe somente mensagens públicas conhecidas; nunca o texto técnico do fetch. */
export function getAuthErrorMessage(error: unknown, fallback: string): string {
  if (!error || typeof error !== 'object' || !('data' in error)) return fallback
  const data: unknown = error.data
  if (!data || typeof data !== 'object' || !('statusMessage' in data)) return fallback
  const message: unknown = data.statusMessage
  return typeof message === 'string' && publicMessages.has(message) ? message : fallback
}
