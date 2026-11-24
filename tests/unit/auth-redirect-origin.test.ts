import { describe, expect, it } from 'vitest'
import { resolveAuthRedirectOrigin } from '../../server/utils/auth-origin'

describe('trusted authentication redirect origin', () => {
  it('uses configured HTTPS origin instead of a forged request Host', () => {
    expect(resolveAuthRedirectOrigin('https://meaprovae.vercel.app', 'https://attacker.example/sign-up'))
      .toBe('https://meaprovae.vercel.app')
  })

  it('does not accept request Host as a fallback outside local development', () => {
    expect(() => resolveAuthRedirectOrigin('', 'https://attacker.example/', false)).toThrow()
  })

  it.each([
    'http://meaprovae.vercel.app',
    'https://user:pass@meaprovae.vercel.app',
    'https://meaprovae.vercel.app/auth/callback',
    'https://meaprovae.vercel.app/?next=/redirect',
    'https://meaprovae.vercel.app/#fragment',
  ])('rejects non-canonical or unsafe configured origin %s', (origin) => {
    expect(() => resolveAuthRedirectOrigin(origin, 'https://meaprovae.vercel.app/')).toThrow()
  })

  it('permits localhost fallback only in development and never accepts remote host', () => {
    expect(resolveAuthRedirectOrigin('', 'http://localhost:3000/cadastro', true)).toBe('http://localhost:3000')
    expect(() => resolveAuthRedirectOrigin('', 'https://attacker.example/', true)).toThrow()
  })
})
