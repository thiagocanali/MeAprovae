import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('h3', () => ({
  appendResponseHeader: vi.fn(),
  setResponseHeader: vi.fn(),
  createError: ({ statusCode, statusMessage }: { statusCode: number, statusMessage: string }) =>
    Object.assign(new Error(statusMessage), { statusCode }),
  getHeader: (_event: { fetchSite?: string }, name: string) => name === 'origin' ? 'http://localhost:3000' : name === 'sec-fetch-site' ? _event?.fetchSite : 'session=trusted-cookie',
  getRequestURL: () => new URL('http://localhost:3000/'),
}))

import { ensureNeonAccount, fetchNeonData, getNeonSession, neonServicesMatch, normalizeNeonSetCookie, filterNeonRequestCookies, ensureNeonAuthAvailability, getNeonAppOrigin, requestNeonAuth, usingNeon } from '../../server/utils/neon'
import { appendResponseHeader, setResponseHeader } from 'h3'

const authUrl = 'https://ep-staging.neonauth.c-2.sa-east-1.aws.neon.tech/meaprovae/auth'
const apiUrl = 'https://ep-staging.apirest.c-2.sa-east-1.aws.neon.tech/meaprovae/rest/v1'
const userId = '550e8400-e29b-41d4-a716-446655440000'
const jwt = 'header.payload.signature'
const data = (body: unknown, status = 200) => new Response(JSON.stringify(body), {
  status,
  headers: { 'content-type': 'application/json' },
})

beforeEach(() => {
  vi.stubGlobal('useRuntimeConfig', () => ({
    backendProvider: 'neon',
    neonAuthBaseUrl: authUrl,
    neonDataApiUrl: apiUrl,
    neonAppOrigin: 'http://localhost:3000',
  }))
})

afterEach(() => {
  vi.unstubAllGlobals()
  vi.restoreAllMocks()
})

describe('Neon Auth -> Data API authentication boundary', () => {
  it('rejects unknown DATABASE_PROVIDER values rather than silently using Supabase', () => {
    vi.stubGlobal('useRuntimeConfig', () => ({
      backendProvider: 'neonn',
      neonAuthBaseUrl: authUrl,
      neonDataApiUrl: apiUrl,
      neonAppOrigin: 'http://localhost:3000',
    }))
    expect(() => usingNeon({} as Parameters<typeof usingNeon>[0]))
      .toThrowError()
  })

  it('does not provision users or attach bearer tokens without a verified session', async () => {
    const fetchMock = vi.fn(async (_input: RequestInfo | URL, _options?: RequestInit) => data({ user: null }))
    vi.stubGlobal('fetch', fetchMock)
    const event = {} as Parameters<typeof ensureNeonAccount>[0]

    expect(await ensureNeonAccount(event)).toBeNull()
    expect(fetchMock).toHaveBeenCalledTimes(1)

    await fetchNeonData(event, `${apiUrl}/study_contests`, {
      headers: { authorization: 'Bearer attacker', apikey: 'fake-public-key' },
    })
    const headers = new Headers(fetchMock.mock.calls[1]?.[1]?.headers)
    expect(headers.has('authorization')).toBe(false)
    expect(headers.has('apikey')).toBe(false)
  })

  it('obtains a token from managed Auth and passes it only to the configured Data API', async () => {
    const fetchMock = vi.fn(async (input: RequestInfo | URL, options?: RequestInit) => {
      const url = String(input)
      if (url.endsWith('/get-session')) return data({ user: { id: userId, email: 'student@example.test', name: 'Test Student' } })
      if (url.endsWith('/token')) return data({ token: jwt })
      if (url.endsWith('/rpc/ensure_neon_student_account')) {
        const auth = new Headers(options?.headers).get('authorization')
        expect(auth).toBe(`Bearer ${jwt}`)
        return data({ id: userId })
      }
      if (url.endsWith('/study_contests')) {
        expect(new Headers(options?.headers).get('authorization')).toBe(`Bearer ${jwt}`)
        return data([])
      }
      return data({}, 404)
    })
    vi.stubGlobal('fetch', fetchMock)
    const event = {} as Parameters<typeof ensureNeonAccount>[0]

    expect((await getNeonSession(event))?.user.id).toBe(userId)
    expect((await ensureNeonAccount(event))?.id).toBe(userId)
    expect((await ensureNeonAccount(event))?.id).toBe(userId)
    await fetchNeonData(event, `${apiUrl}/study_contests`)
    expect(fetchMock).toHaveBeenCalledTimes(4)
  })

  it('reports a revoked token session as unauthorized, not a service outage', async () => {
    const fetchMock = vi.fn(async (input: RequestInfo | URL) =>
      String(input).endsWith('/get-session') ? data({ user: { id: userId } }) : data({ error: 'expired' }, 401))
    vi.stubGlobal('fetch', fetchMock)
    await expect(getNeonSession({} as Parameters<typeof getNeonSession>[0]))
      .rejects.toMatchObject({ statusCode: 401 })
    expect(fetchMock).toHaveBeenCalledTimes(2)
  })

  it('rejects an unexpected database host before forwarding a JWT', async () => {
    const fetchMock = vi.fn()
    vi.stubGlobal('fetch', fetchMock)
    await expect(fetchNeonData({} as Parameters<typeof fetchNeonData>[0],
      'https://attacker.example.test/meaprovae/rest/v1/study_questions',
      { headers: { authorization: 'Bearer injected' } }))
      .rejects.toMatchObject({ statusCode: 503 })
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it('blocks URLs with embedded credentials or fragments before calling Data API', async () => {
    const fetchMock = vi.fn()
    vi.stubGlobal('fetch', fetchMock)
    const event = {} as Parameters<typeof fetchNeonData>[0]
    const credentialUrl = apiUrl.replace('https://', 'https://user:pass@') + '/study_questions'
    await expect(fetchNeonData(event, credentialUrl)).rejects.toMatchObject({ statusCode: 503 })
    await expect(fetchNeonData(event, apiUrl + '/study_questions#unexpected')).rejects.toMatchObject({ statusCode: 503 })
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it('does not trust a malformed or missing token returned by upstream', async () => {
    const fetchMock = vi.fn(async (input: RequestInfo | URL) =>
      String(input).endsWith('/get-session') ? data({ user: { id: userId } }) : data({ token: 'invalid' }))
    vi.stubGlobal('fetch', fetchMock)
    await expect(getNeonSession({} as Parameters<typeof getNeonSession>[0]))
      .rejects.toMatchObject({ statusCode: 503 })
    expect(fetchMock).toHaveBeenCalledTimes(2)
  })
  it('scopes upstream cookies to the app root and removes remote domains', () => {
    expect(normalizeNeonSetCookie('__Secure-neon-auth.session_token=abc; Domain=.neon.tech; Path=/meaprovae/auth; Secure; SameSite=None; Partitioned'))
      .toBe('__Secure-neon-auth.session_token=abc; Path=/; Secure; SameSite=Lax; HttpOnly')
    expect(normalizeNeonSetCookie('__Host-neon-auth.session_token=abc; Secure; Path=/; HttpOnly'))
      .toBe('__Host-neon-auth.session_token=abc; Path=/; Secure; SameSite=Lax; HttpOnly')
    expect(normalizeNeonSetCookie('__Secure-neon-auth.session_token=abc; SameSite=None')).toBeNull()
    expect(normalizeNeonSetCookie('__Host-neon-auth.session_token=abc; Path=/')).toBeNull()
    expect(normalizeNeonSetCookie('better-auth.session_token=abc; Path=/; SameSite=None', true))
      .toBe('better-auth.session_token=abc; Path=/; SameSite=Lax; HttpOnly; Secure')
    expect(normalizeNeonSetCookie('neon-auth.session_token=abc\r\nSet-Cookie: other=unsafe')).toBeNull()
  })

  it('prevents browser and proxy caching of authentication responses', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => data({ user: null })))
    await requestNeonAuth({} as Parameters<typeof requestNeonAuth>[0], 'get-session')
    expect(vi.mocked(setResponseHeader)).toHaveBeenCalledWith(expect.anything(), 'cache-control', 'private, no-store')
    expect(vi.mocked(setResponseHeader)).toHaveBeenCalledWith(expect.anything(), 'pragma', 'no-cache')
  })

  it('relays only valid first-party HttpOnly cookies from Neon Auth', async () => {
    const upstream = new Response(JSON.stringify({ user: { id: userId } }), {
      status: 200,
      headers: { 'content-type': 'application/json', 'set-cookie': '__Secure-neon-auth.session_token=safe; Domain=neon.tech; Path=/meaprovae/auth; Secure; SameSite=None; Partitioned' },
    })
    vi.stubGlobal('fetch', vi.fn(async () => upstream))
    await requestNeonAuth({} as Parameters<typeof requestNeonAuth>[0], 'sign-in/email', {
      body: { email: 'student@example.test', password: 'not-a-real-password' },
      forwardCookies: true,
    })
    expect(vi.mocked(appendResponseHeader)).toHaveBeenCalledWith(
      expect.anything(), 'set-cookie', '__Secure-neon-auth.session_token=safe; Path=/; Secure; SameSite=Lax; HttpOnly',
    )
  })

  it('deduplicates incoming session cookie names and rejects oversized input', () => {
    const cookies = 'better-auth.session_token=first; better-auth.session_token=second; neon-auth.session_data=third'
    expect(filterNeonRequestCookies(cookies)).toBe('better-auth.session_token=first; neon-auth.session_data=third')
    expect(filterNeonRequestCookies('neon-auth.session_token=' + 'a'.repeat(9000))).toBe('')
  })

  it('forwards only Neon Auth session cookies upstream, not unrelated app cookies', async () => {
    const raw = 'session=other-service; theme=dark; __Secure-neon-auth.session_token=valid; better-auth.session_data=cached'
    expect(filterNeonRequestCookies(raw)).toBe('__Secure-neon-auth.session_token=valid; better-auth.session_data=cached')
    const fetchMock = vi.fn(async (_input: RequestInfo | URL, _options?: RequestInit) => data({ user: null }))
    vi.stubGlobal('fetch', fetchMock)
    await requestNeonAuth({} as Parameters<typeof requestNeonAuth>[0], 'get-session')
    expect(new Headers(fetchMock.mock.calls[0]?.[1]?.headers).get('cookie')).toBeNull()
    expect(normalizeNeonSetCookie('unrelated_session=sensitive; Path=/')).toBeNull()
  })

  it('maps upstream outages and throttling without disguising them as wrong passwords', () => {
    expect(() => ensureNeonAuthAvailability({ status: 502 })).toThrowError()
    expect(() => ensureNeonAuthAvailability({ status: 429 })).toThrowError()
    try {
      ensureNeonAuthAvailability({ status: 503 })
    } catch (error) {
      expect(error).toMatchObject({ statusCode: 503 })
    }
    try {
      ensureNeonAuthAvailability({ status: 429 })
    } catch (error) {
      expect(error).toMatchObject({ statusCode: 429 })
    }
    expect(() => ensureNeonAuthAvailability({ status: 401 })).not.toThrow()
  })

  it('does not treat an upstream Auth outage as a signed-out user', async () => {
    const fetchMock = vi.fn(async () => data({ error: 'upstream unavailable' }, 503))
    vi.stubGlobal('fetch', fetchMock)
    await expect(getNeonSession({} as Parameters<typeof getNeonSession>[0]))
      .rejects.toMatchObject({ statusCode: 503 })
    expect(fetchMock).toHaveBeenCalledTimes(1)
  })

  it('never follows an authenticated Data API redirect', async () => {
    const fetchMock = vi.fn(async (input: RequestInfo | URL, options?: RequestInit) => {
      if (String(input).endsWith('/get-session')) return data({ user: { id: userId } })
      if (String(input).endsWith('/token')) return data({ token: jwt })
      expect(options?.redirect).toBe('error')
      return data([])
    })
    vi.stubGlobal('fetch', fetchMock)
    const event = {} as Parameters<typeof getNeonSession>[0]
    await fetchNeonData(event, `${apiUrl}/study_questions`)
    expect(fetchMock).toHaveBeenCalledTimes(3)
  })

  it('accepts only Auth and Data API endpoints from the same Neon branch and database', () => {
    expect(neonServicesMatch(authUrl, apiUrl)).toBe(true)
    expect(neonServicesMatch(authUrl, apiUrl.replace('ep-staging', 'ep-production'))).toBe(false)
    expect(neonServicesMatch(authUrl, apiUrl.replace('/meaprovae/', '/another-db/'))).toBe(false)
    expect(neonServicesMatch(authUrl, apiUrl.replace('https:', 'http:'))).toBe(false)
  })

  it('fails before authenticating if Auth and Data API use different branches', async () => {
    const fetchMock = vi.fn()
    vi.stubGlobal('fetch', fetchMock)
    vi.stubGlobal('useRuntimeConfig', () => ({
      backendProvider: 'neon',
      neonAuthBaseUrl: authUrl,
      neonDataApiUrl: apiUrl.replace('ep-staging', 'ep-production'),
      neonAppOrigin: 'http://localhost:3000',
    }))
    await expect(requestNeonAuth({} as Parameters<typeof requestNeonAuth>[0], 'get-session'))
      .rejects.toMatchObject({ statusCode: 503 })
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it('rejects redirects from Managed Auth without forwarding cookies', async () => {
    const upstream = new Response(null, {
      status: 302,
      headers: {
        location: 'https://evil.example.test',
        'set-cookie': 'better-auth.session_token=stolen; Secure; Path=/',
      },
    })
    const fetchMock = vi.fn(async () => upstream)
    vi.stubGlobal('fetch', fetchMock)
    await expect(requestNeonAuth({} as Parameters<typeof requestNeonAuth>[0], 'get-session', { forwardCookies: true }))
      .rejects.toMatchObject({ statusCode: 503 })
    expect(vi.mocked(appendResponseHeader)).not.toHaveBeenCalled()
    expect(fetchMock).toHaveBeenCalledTimes(1)
  })

  it('fails closed if Data API request cannot be completed and never follows redirects', async () => {
    const fetchMock = vi.fn(async (input: RequestInfo | URL, options?: RequestInit) => {
      if (String(input).endsWith('/get-session')) return data({ user: { id: userId } })
      if (String(input).endsWith('/token')) return data({ token: jwt })
      expect(options?.redirect).toBe('error')
      expect(options?.signal).toBeDefined()
      throw new Error('network unreachable')
    })
    vi.stubGlobal('fetch', fetchMock)
    await expect(fetchNeonData({} as Parameters<typeof fetchNeonData>[0], `${apiUrl}/study_questions`))
      .rejects.toMatchObject({ statusCode: 503 })
    expect(fetchMock).toHaveBeenCalledTimes(3)
  })

  it('rejects a session whose verified Data API JWT resolves to a different user', async () => {
    const fetchMock = vi.fn(async (input: RequestInfo | URL) => {
      if (String(input).endsWith('/get-session')) return data({ user: { id: userId } })
      if (String(input).endsWith('/token')) return data({ token: jwt })
      if (String(input).endsWith('/rpc/ensure_neon_student_account')) {
        return data({ id: '550e8400-e29b-41d4-a716-446655440099' })
      }
      return data({}, 404)
    })
    vi.stubGlobal('fetch', fetchMock)
    await expect(ensureNeonAccount({} as Parameters<typeof ensureNeonAccount>[0]))
      .rejects.toMatchObject({ statusCode: 401 })
    expect(fetchMock).toHaveBeenCalledTimes(3)
  })

  it('rejects an unusable provisioning response rather than guessing user identity', async () => {
    const fetchMock = vi.fn(async (input: RequestInfo | URL) => {
      if (String(input).endsWith('/get-session')) return data({ user: { id: userId } })
      if (String(input).endsWith('/token')) return data({ token: jwt })
      return new Response('not JSON', { status: 200, headers: { 'content-type': 'text/plain' } })
    })
    vi.stubGlobal('fetch', fetchMock)
    await expect(ensureNeonAccount({} as Parameters<typeof ensureNeonAccount>[0]))
      .rejects.toMatchObject({ statusCode: 401 })
  })

  it('rejects cross-site Fetch Metadata even if Origin looks trustworthy', async () => {
    const event = { fetchSite: 'cross-site' } as Parameters<typeof requestNeonAuth>[0]
    const fetchMock = vi.fn()
    vi.stubGlobal('fetch', fetchMock)
    await expect(requestNeonAuth(event, 'sign-out', { body: {}, forwardCookies: true }))
      .rejects.toMatchObject({ statusCode: 403 })
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it('rejects cross-origin mutations before making any upstream Auth request', async () => {
    const event = {} as Parameters<typeof requestNeonAuth>[0]
    const fetchMock = vi.fn()
    vi.stubGlobal('fetch', fetchMock)
    vi.stubGlobal('useRuntimeConfig', () => ({
      backendProvider: 'neon',
      neonAuthBaseUrl: authUrl,
      neonDataApiUrl: apiUrl,
      neonAppOrigin: 'https://trusted.example.test',
    }))
    await expect(requestNeonAuth(event, 'sign-out', { body: {}, forwardCookies: true }))
      .rejects.toMatchObject({ statusCode: 403 })
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it('uses a configured canonical origin, never the untrusted request Host', async () => {
    const event = {} as Parameters<typeof getNeonAppOrigin>[0]
    expect(getNeonAppOrigin(event)).toBe('http://localhost:3000')
    vi.stubGlobal('useRuntimeConfig', () => ({
      backendProvider: 'neon',
      neonAuthBaseUrl: authUrl,
      neonDataApiUrl: apiUrl,
      neonAppOrigin: 'https://staging.example.test',
    }))
    expect(getNeonAppOrigin(event)).toBe('https://staging.example.test')
    const fetchMock = vi.fn(async () => data({ user: null }))
    vi.stubGlobal('fetch', fetchMock)
    await requestNeonAuth(event, 'get-session')
    expect(new Headers(fetchMock.mock.calls[0]?.[1]?.headers).get('origin'))
      .toBe('https://staging.example.test')
  })

  it.each(['', 'http://remote.example.test', 'https://staging.example.test/extra',
    'https://staging.example.test/?a=1', 'https://staging.example.test#fragment',
    'https://evil@staging.example.test'])(
    'rejects unsafe Neon redirect origin %s', (candidate) => {
      vi.stubGlobal('useRuntimeConfig', () => ({
        backendProvider: 'neon',
        neonAuthBaseUrl: authUrl,
        neonDataApiUrl: apiUrl,
        neonAppOrigin: candidate,
      }))
      expect(() => getNeonAppOrigin({} as Parameters<typeof getNeonAppOrigin>[0]))
        .toThrowError()
    },
  )

})
