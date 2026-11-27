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

// Local HTTP is a development exception, never a hosted-runtime fallback.
describe('runtime boundary', () => {
  it.each(['http://localhost:3000', 'http://127.0.0.1:3012'])('rejects %s outside development', origin => {
    expect(() => resolveAuthRedirectOrigin(origin, 'https://ignored.test/')).toThrow()
    expect(resolveAuthRedirectOrigin(origin, 'https://ignored.test/', true)).toBe(origin)
  })
  it.each(['not a URL', '//attacker.test', 'https://example.test/path', 'ftp://localhost'])('rejects malformed origins: %s', origin => {
    expect(() => resolveAuthRedirectOrigin(origin, 'http://localhost:3000/', true)).toThrow()
  })
  it('ignores request URL completely when canonical configuration exists', () => {
    expect(resolveAuthRedirectOrigin('  https://meaprovae.vercel.app  ', 'not a URL')).toBe('https://meaprovae.vercel.app')
  })
})
