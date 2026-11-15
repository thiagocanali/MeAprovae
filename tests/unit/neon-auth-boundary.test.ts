import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('h3', () => ({
  appendResponseHeader: vi.fn(),
  createError: ({ statusCode, statusMessage }: { statusCode: number, statusMessage: string }) =>
    Object.assign(new Error(statusMessage), { statusCode }),
  getHeader: () => 'session=trusted-cookie',
  getRequestURL: () => new URL('http://localhost:3000/'),
}))

import { ensureNeonAccount, fetchNeonData, getNeonSession, normalizeNeonSetCookie, requestNeonAuth } from '../../server/utils/neon'
import { appendResponseHeader } from 'h3'

const authUrl = 'https://auth.example.test/meaprovae/auth'
const apiUrl = 'https://api.example.test/meaprovae/rest/v1'
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
  }))
})

afterEach(() => {
  vi.unstubAllGlobals()
  vi.restoreAllMocks()
})

describe('Neon Auth -> Data API authentication boundary', () => {
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

  it('rejects an unexpected database host before forwarding a JWT', async () => {
    const fetchMock = vi.fn()
    vi.stubGlobal('fetch', fetchMock)
    await expect(fetchNeonData({} as Parameters<typeof fetchNeonData>[0],
      'https://attacker.example.test/meaprovae/rest/v1/study_questions',
      { headers: { authorization: 'Bearer injected' } }))
      .rejects.toMatchObject({ statusCode: 503 })
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
    expect(normalizeNeonSetCookie('session=abc; Domain=.neon.tech; Path=/meaprovae/auth; Secure; SameSite=Lax'))
      .toBe('session=abc; Path=/; Secure; SameSite=Lax; HttpOnly')
    expect(normalizeNeonSetCookie('__Host-session=abc; Secure; Path=/; HttpOnly'))
      .toBe('__Host-session=abc; Path=/; Secure; HttpOnly')
    expect(normalizeNeonSetCookie('session=abc\\r\\nSet-Cookie: other=unsafe')).toBeNull()
  })

  it('relays only valid first-party HttpOnly cookies from Neon Auth', async () => {
    const upstream = new Response(JSON.stringify({ user: { id: userId } }), {
      status: 200,
      headers: { 'content-type': 'application/json', 'set-cookie': 'session=safe; Domain=neon.tech; Path=/meaprovae/auth; Secure' },
    })
    vi.stubGlobal('fetch', vi.fn(async () => upstream))
    await requestNeonAuth({} as Parameters<typeof requestNeonAuth>[0], 'sign-in/email', {
      body: { email: 'student@example.test', password: 'not-a-real-password' },
      forwardCookies: true,
    })
    expect(vi.mocked(appendResponseHeader)).toHaveBeenCalledWith(
      expect.anything(), 'set-cookie', 'session=safe; Path=/; Secure; HttpOnly',
    )
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

})
