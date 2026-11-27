// Real H3 request parsing/status/redirects, with a synthetic Auth adapter.
// This does not claim hosted Supabase Auth or mailbox homologation.
import {
  afterEach,
  beforeAll,
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from 'vitest'
import {
  createApp,
  defineEventHandler,
  toWebHandler,
  type EventHandler,
} from 'h3'
import privateResponses from '../../server/middleware/private-responses'
const fixture = vi.hoisted(() => ({
  client: {
    rpc: vi.fn(),
    auth: {
      signUp: vi.fn(),
      signInWithPassword: vi.fn(),
      resetPasswordForEmail: vi.fn(),
      updateUser: vi.fn(),
      signOut: vi.fn(),
      exchangeCodeForSession: vi.fn(),
    },
  },
  user: vi.fn(),
}))
vi.mock('../../server/utils/supabase', () => ({
  createSupabaseServerClient: () => fixture.client,
  getAuthenticatedUser: fixture.user,
}))
let handlers: Record<string, EventHandler>
beforeAll(async () => {
  vi.stubGlobal('defineEventHandler', defineEventHandler)
  handlers = {
    register: (await import('../../server/api/auth/register.post')).default,
    login: (await import('../../server/api/auth/login.post')).default,
    recover: (await import('../../server/api/auth/recover.post')).default,
    update: (await import('../../server/api/auth/update-password.post'))
      .default,
    logout: (await import('../../server/api/auth/logout.post')).default,
    me: (await import('../../server/api/auth/me.get')).default,
    callback: (await import('../../server/routes/auth/callback.get')).default,
    editor: defineEventHandler(async (event) => {
      const { requirePlatformEditor } = await import('../../server/utils/admin')
      const { user } = await requirePlatformEditor(event)
      return { id: user.id }
    }),
  }
})
beforeEach(() => {
  vi.resetAllMocks()
  vi.stubGlobal('useRuntimeConfig', () => ({
    authRedirectOrigin: 'https://meaprovae.vercel.app',
  }))
  fixture.user.mockResolvedValue(null)
  for (const fn of Object.values(fixture.client.auth))
    fn.mockResolvedValue({ data: {}, error: null })
})
afterEach(() => {
  vi.unstubAllGlobals()
})
async function request(
  name: string,
  body?: unknown,
  query = '',
  headers: Record<string, string> = {},
) {
  const app = createApp({ debug: false, onError: () => {} })
    .use(privateResponses)
    .use(handlers[name]!)
  return toWebHandler(app)(
    new Request(
      `https://app.test/${name === 'callback' ? 'auth/callback' : 'api/auth/' + name}${query}`,
      {
        method: body === undefined ? 'GET' : 'POST',
        headers: { 'content-type': 'application/json', ...headers },
        ...(body === undefined ? {} : { body: JSON.stringify(body) }),
      },
    ),
  )
}
const valid = {
  email: '  STUDENT@example.test ',
  password: 'Synthetic-password',
  displayName: 'Estudante teste',
}
const user = {
  id: 'synthetic-user',
  email: 'student@example.test',
  app_metadata: { secret: 'never-expose' },
}

describe('Auth HTTP boundary', () => {
  it('builds confirmation URL from canonical origin, minimizes user data and awaits confirmation', async () => {
    fixture.client.auth.signUp.mockResolvedValue({
      data: { user, session: null },
      error: null,
    })
    const response = await request('register', valid, '', {
      host: 'attacker.test',
      'x-forwarded-host': 'attacker.test',
      'x-forwarded-proto': 'http',
    })
    expect(response.status).toBe(200)
    expect(await response.json()).toEqual({
      user: { id: user.id, email: user.email },
      requiresEmailConfirmation: true,
    })
    expect(fixture.client.auth.signUp).toHaveBeenCalledWith({
      email: 'student@example.test',
      password: valid.password,
      options: {
        data: { display_name: valid.displayName },
        emailRedirectTo: 'https://meaprovae.vercel.app/auth/callback',
      },
    })
    expect(response.headers.get('cache-control')).toContain('no-store')
  })
  it('builds recovery URL without accepting forwarded Host', async () => {
    const response = await request('recover', { email: valid.email }, '', {
      host: 'evil.test',
      'x-forwarded-host': 'evil.test',
    })
    expect(response.status).toBe(200)
    expect(fixture.client.auth.resetPasswordForEmail).toHaveBeenCalledWith(
      'student@example.test',
      {
        redirectTo:
          'https://meaprovae.vercel.app/auth/callback?next=%2Fredefinir-senha',
      },
    )
  })
  it.each(['register', 'recover'])(
    'fails closed before sending %s email when canonical origin is absent',
    async (name) => {
      vi.stubGlobal('useRuntimeConfig', () => ({ authRedirectOrigin: '' }))
      const response = await request(name, valid)
      expect(response.status).toBe(503)
      expect(fixture.client.auth.signUp).not.toHaveBeenCalled()
      expect(fixture.client.auth.resetPasswordForEmail).not.toHaveBeenCalled()
      expect(response.headers.get('cache-control')).toContain('no-store')
    },
  )
  it.each([
    ['register', { ...valid, displayName: '' }],
    ['login', { email: 'bad', password: valid.password }],
    ['recover', { email: 'bad' }],
  ])('validates %s before calling provider', async (name, body) => {
    expect((await request(name as string, body)).status).toBe(400)
    expect(
      Object.values(fixture.client.auth).every(
        (fn) => fn.mock.calls.length === 0,
      ),
    ).toBe(true)
  })
  it('returns only public user fields on login and generic failure for invalid credentials', async () => {
    fixture.client.auth.signInWithPassword
      .mockResolvedValueOnce({ data: { user }, error: null })
      .mockResolvedValueOnce({
        data: { user: null },
        error: { message: 'Internal-provider-diagnostic' },
      })
    expect(await (await request('login', valid)).json()).toEqual({
      user: { id: user.id, email: user.email },
    })
    const denied = await request('login', valid)
    expect(denied.status).toBe(401)
    expect(await denied.text()).not.toContain('Internal-provider-diagnostic')
  })
  it('requires a verified user for password change, including expired sessions', async () => {
    expect((await request('update', { password: valid.password })).status).toBe(
      401,
    )
    expect(fixture.client.auth.updateUser).not.toHaveBeenCalled()
    fixture.user.mockResolvedValue(user)
    expect((await request('update', { password: 'short' })).status).toBe(400)
    expect((await request('update', { password: valid.password })).status).toBe(
      200,
    )
    expect(fixture.client.auth.updateUser).toHaveBeenCalledExactlyOnceWith({
      password: valid.password,
    })
  })
  it('logs out only the current session and propagates provider failure safely', async () => {
    expect((await request('logout', {})).status).toBe(200)
    expect(fixture.client.auth.signOut).toHaveBeenCalledExactlyOnceWith({
      scope: 'local',
    })
    fixture.client.auth.signOut.mockResolvedValue({
      error: { message: 'Internal-provider-diagnostic' },
    })
    const failed = await request('logout', {})
    expect(failed.status).toBe(500)
    expect(await failed.text()).not.toContain('Internal-provider-diagnostic')
  })
  it('does not expose session tokens or metadata through me', async () => {
    fixture.user.mockResolvedValueOnce(user).mockResolvedValueOnce(null)
    expect(await (await request('me')).json()).toEqual({
      user: { id: user.id, email: user.email },
    })
    expect(await (await request('me')).json()).toEqual({ user: null })
  })
  it('checks editorial access in the database; ignores editable role metadata', async () => {
    expect((await request('editor')).status).toBe(401)
    expect(fixture.client.rpc).not.toHaveBeenCalled()
    fixture.user.mockResolvedValue({
      ...user,
      user_metadata: { role: 'owner' },
    })
    fixture.client.rpc
      .mockResolvedValueOnce({ data: false, error: null })
      .mockResolvedValueOnce({ data: true, error: null })
      .mockResolvedValueOnce({
        data: null,
        error: { message: 'Internal-provider-diagnostic' },
      })
    expect((await request('editor')).status).toBe(403)
    expect((await request('editor')).status).toBe(200)
    expect((await request('editor')).status).toBe(503)
    expect(fixture.client.rpc).toHaveBeenCalledWith('has_platform_role', {
      p_required_role: 'editor',
    })
  })
  it.each(['', '?code=a&code=b'])(
    'rejects absent or ambiguous callback code (%s)',
    async (query) => {
      expect((await request('callback', undefined, query)).status).toBe(400)
      expect(fixture.client.auth.exchangeCodeForSession).not.toHaveBeenCalled()
    },
  )
  it('rejects expired or reused codes without exposing the provider response', async () => {
    fixture.client.auth.exchangeCodeForSession.mockResolvedValue({
      error: { message: 'Internal-provider-diagnostic' },
    })
    const response = await request(
      'callback',
      undefined,
      '?code=synthetic-expired',
    )
    expect(response.status).toBe(400)
    expect(await response.text()).not.toContain('Internal-provider-diagnostic')
  })
  it.each([
    ['%2Fredefinir-senha', '/redefinir-senha'],
    ['https://evil.test', '/app'],
    ['%2F%2Fevil.test', '/app'],
    ['%2Fadmin', '/app'],
  ])(
    'limits callback next=%s to the explicit allowlist',
    async (next, target) => {
      const response = await request(
        'callback',
        undefined,
        `?code=synthetic-code&next=${next}`,
      )
      expect(response.status).toBe(303)
      expect(response.headers.get('location')).toBe(target)
      expect(response.headers.get('cache-control')).toContain('no-store')
    },
  )
})
