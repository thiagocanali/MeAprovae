import { describe, expect, it } from 'vitest'
import { getAuthErrorMessage } from '../../shared/domain/auth/error-message'

describe('mensagens de autenticação', () => {
  const fallback = 'Não foi possível entrar. Tente novamente.'

  it('recupera a mensagem pública do payload do erro HTTP', () => {
    const error = Object.assign(new Error('[POST] "/api/auth/login": 401'), {
      data: { statusCode: 401, statusMessage: 'E-mail ou senha inválidos.' },
    })
    expect(getAuthErrorMessage(error, fallback)).toBe('E-mail ou senha inválidos.')
  })

  it.each([
    'Informe um e-mail válido.',
    'A senha deve ter entre 8 e 72 caracteres.',
    'Sua sessão expirou. Solicite um novo link de recuperação.',
  ])('preserva orientação acionável: %s', (statusMessage) => {
    expect(getAuthErrorMessage({ data: { statusMessage } }, fallback)).toBe(statusMessage)
  })

  it.each([
    null, undefined, 'falha', {}, new Error('Failed to fetch'),
    { data: null }, { data: 'HTML de proxy' }, { data: { statusMessage: 401 } },
    { data: { statusMessage: 'database connection failed: secret' } },
    { data: { message: 'detalhe interno' } },
  ])('usa fallback sem expor erros inesperados: %j', (error) => {
    expect(getAuthErrorMessage(error, fallback)).toBe(fallback)
  })
})
