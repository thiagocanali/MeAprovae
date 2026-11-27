import { afterEach, describe, expect, it, vi } from 'vitest'
import {
  createApp,
  defineEventHandler,
  getHeader,
  setHeader,
  toWebHandler,
} from 'h3'
const { createServerClient } = vi.hoisted(() => ({
  createServerClient: vi.fn(),
}))
vi.mock('@supabase/ssr', () => ({ createServerClient }))
import {
  createSupabaseServerClient,
  getAuthenticatedUser,
} from '../../server/utils/supabase'
import privateResponses from '../../server/middleware/private-responses'

afterEach(() => {
  vi.unstubAllGlobals()
  vi.resetAllMocks()
})
function config() {
  vi.stubGlobal('useRuntimeConfig', () => ({
    supabaseUrl: 'https://fixture.supabase.co',
    supabaseAnonKey: 'synthetic-public-key',
  }))
}

describe('SSR cookie bridge and personal response cache', () => {
  it('forwards request cookies and every rotated/chunked cookie plus cache headers', async () => {
    config()
    createServerClient.mockImplementation((_url, _key, options) => {
      expect(options.cookies.getAll()).toEqual([
        { name: 'sb-fixture-auth-token.0', value: 'synthetic-incoming' },
      ])
      options.cookies.setAll(
        [
          {
            name: 'sb-fixture-auth-token.0',
            value: 'synthetic-rotated',
            options: { path: '/', sameSite: 'lax', secure: true },
          },
          {
            name: 'sb-fixture-auth-token.1',
            value: '',
            options: { path: '/', maxAge: 0 },
          },
        ],
        {
          'Cache-Control':
            'private, no-cache, no-store, must-revalidate, max-age=0',
          Expires: '0',
          Pragma: 'no-cache',
        },
      )
      return { auth: {} }
    })
    const app = createApp().use(
      defineEventHandler((event) => {
        createSupabaseServerClient(event)
        return { ok: true }
      }),
    )
    const response = await toWebHandler(app)(
      new Request('https://app.test/app', {
        headers: { cookie: 'sb-fixture-auth-token.0=synthetic-incoming' },
      }),
    )
    expect(response.headers.get('cache-control')).toContain('no-store')
    expect(response.headers.get('expires')).toBe('0')
    expect(response.headers.get('pragma')).toBe('no-cache')
    const cookies = response.headers.get('set-cookie')!
    expect(cookies).toContain('synthetic-rotated')
    expect(cookies).toContain('SameSite=Lax')
    expect(cookies).toContain('Secure')
    expect(cookies).toContain('Max-Age=0')
    expect(cookies).toContain('sb-fixture-auth-token.1=')
  })

  it('creates a separate client for each request; never trusts a stored session user', async () => {
    config()
    const getUser = vi
      .fn()
      .mockResolvedValueOnce({ data: { user: { id: 'A' } }, error: null })
      .mockResolvedValueOnce({
        data: { user: null },
        error: { message: 'expired' },
      })
    createServerClient.mockReturnValue({
      auth: {
        getUser,
        getSession: vi.fn(() => {
          throw Error('Must not trust getSession')
        }),
      },
    })
    const app = createApp().use(
      defineEventHandler(async (event) => ({
        user: await getAuthenticatedUser(event),
      })),
    )
    const fetch = toWebHandler(app)
    const first = await fetch(new Request('https://app.test/api/auth/me'))
    const second = await fetch(new Request('https://app.test/api/auth/me'))
    expect(await first.json()).toEqual({ user: { id: 'A' } })
    expect(await second.json()).toEqual({ user: null })
    expect(createServerClient).toHaveBeenCalledTimes(2)
    expect(second.headers.get('cache-control')).toContain('no-store')
  })

  it.each([
    '/api/auth/me',
    '/api/study/favorites',
    '/api/admin/questions',
    '/app',
    '/app/questoes',
    '/admin',
    '/auth/callback',
    '/redefinir-senha',
  ])('blocks caching before handling %s, including failures', async (path) => {
    const app = createApp()
      .use(privateResponses)
      .use(
        defineEventHandler((event) => {
          setHeader(
            event,
            'x-fixture-header',
            getHeader(event, 'host') || 'test',
          )
          return { ok: true }
        }),
      )
    const response = await toWebHandler(app)(
      new Request(`https://app.test${path}`),
    )
    expect(response.headers.get('cache-control')).toBe('private, no-store')
    expect(response.headers.get('pragma')).toBe('no-cache')
    expect(response.headers.get('expires')).toBe('0')
  })
  it('does not apply private API rules to unrelated public resources', async () => {
    const app = createApp()
      .use(privateResponses)
      .use(defineEventHandler(() => 'public'))
    const response = await toWebHandler(app)(
      new Request('https://app.test/api/health'),
    )
    expect(response.headers.get('cache-control')).toBeNull()
  })
})
