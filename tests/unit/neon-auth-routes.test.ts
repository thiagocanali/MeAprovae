import { beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  readBody: vi.fn(),
  requestNeonAuth: vi.fn(),
  usingNeon: vi.fn(() => true),
  createSupabaseServerClient: vi.fn(),
}))

vi.mock('h3', () => ({
  readBody: mocks.readBody,
  getRequestURL: () => new URL('http://localhost:3000'),
  createError: ({ statusCode, statusMessage }: { statusCode: number; statusMessage: string }) =>
    Object.assign(new Error(statusMessage), { statusCode }),
}))

vi.mock('../../server/utils/supabase', () => ({
  createSupabaseServerClient: mocks.createSupabaseServerClient,
  getAuthenticatedUser: vi.fn(),
}))
vi.mock('../../server/utils/neon', () => ({
  requestNeonAuth: mocks.requestNeonAuth,
  usingNeon: mocks.usingNeon,
  ensureNeonAuthAvailability: (result: { status: number }) => {
    if (result.status === 429 || result.status >= 500) {
      throw Object.assign(new Error('Provider unavailable'), { statusCode: result.status === 429 ? 429 : 503 })
    }
  },
}))

vi.stubGlobal('defineEventHandler', (handler: unknown) => handler)

const { default: login } = await import('../../server/api/auth/login.post')
const { default: register } = await import('../../server/api/auth/register.post')
const { default: logout } = await import('../../server/api/auth/logout.post')
const { default: recover } = await import('../../server/api/auth/recover.post')
const { default: resetPassword } = await import('../../server/api/auth/update-password.post')

const event = {} as Parameters<typeof login>[0]
beforeEach(() => {
  vi.clearAllMocks()
  mocks.usingNeon.mockReturnValue(true)
})

describe('Neon Auth API endpoints', () => {
  it('signs in and returns the identity without contacting Supabase', async () => {
    mocks.readBody.mockResolvedValue({ email: '  STUDENT@EXAMPLE.COM ', password: 'test-password' })
    mocks.requestNeonAuth.mockResolvedValue({
      ok: true, status: 200, data: { user: { id: '550e8400-e29b-41d4-a716-446655440000', email: 'student@example.com' } },
    })
    await expect(login(event)).resolves.toEqual({
      user: { id: '550e8400-e29b-41d4-a716-446655440000', email: 'student@example.com' },
    })
    expect(mocks.requestNeonAuth).toHaveBeenCalledWith(event, 'sign-in/email', {
      body: { email: 'student@example.com', password: 'test-password' }, forwardCookies: true,
    })
    expect(mocks.createSupabaseServerClient).not.toHaveBeenCalled()
  })

  it('does not disguise a Neon outage as invalid credentials', async () => {
    mocks.readBody.mockResolvedValue({ email: 'student@example.com', password: 'test-password' })
    mocks.requestNeonAuth.mockResolvedValue({ ok: false, status: 503, data: null })
    await expect(login(event)).rejects.toMatchObject({ statusCode: 503 })
    expect(mocks.createSupabaseServerClient).not.toHaveBeenCalled()
  })

  it('rejects invalid registration before contacting the provider', async () => {
    mocks.readBody.mockResolvedValue({ email: 'invalid', password: 'short', displayName: 'X' })
    await expect(register(event)).rejects.toMatchObject({ statusCode: 400 })
    expect(mocks.requestNeonAuth).not.toHaveBeenCalled()
  })

  it('registers through Neon without using the legacy Supabase Auth', async () => {
    mocks.readBody.mockResolvedValue({ email: 'student@example.com', password: 'test-password', displayName: ' Estudante A ' })
    mocks.requestNeonAuth.mockResolvedValue({
      ok: true, status: 200, data: { user: { id: '550e8400-e29b-41d4-a716-446655440000', email: 'student@example.com' }, token: 'not-a-real-token' },
    })
    await expect(register(event)).resolves.toMatchObject({ requiresEmailConfirmation: false })
    expect(mocks.requestNeonAuth).toHaveBeenCalledWith(event, 'sign-up/email', {
      body: { email: 'student@example.com', password: 'test-password', name: 'Estudante A' },
      forwardCookies: true,
    })
    expect(mocks.createSupabaseServerClient).not.toHaveBeenCalled()
  })

  it('signs out through Managed Auth without contacting Supabase', async () => {
    mocks.requestNeonAuth.mockResolvedValue({ ok: true, status: 200, data: {} })
    await expect(logout(event)).resolves.toEqual({ success: true })
    expect(mocks.requestNeonAuth).toHaveBeenCalledWith(event, 'sign-out', { body: {}, forwardCookies: true })
    expect(mocks.createSupabaseServerClient).not.toHaveBeenCalled()
  })
  it('requests password recovery only through Neon Managed Auth', async () => {
    mocks.readBody.mockResolvedValue({ email: 'Student@Example.com' })
    mocks.requestNeonAuth.mockResolvedValue({ ok: true, status: 200, data: {} })
    await expect(recover(event)).resolves.toEqual({ success: true })
    expect(mocks.requestNeonAuth).toHaveBeenCalledWith(event, 'request-password-reset', {
      body: { email: 'student@example.com', redirectTo: 'http://localhost:3000/redefinir-senha' },
    })
    expect(mocks.createSupabaseServerClient).not.toHaveBeenCalled()
  })

  it('rejects resetting a Neon password without a one-time token', async () => {
    mocks.readBody.mockResolvedValue({ password: 'a-new-password' })
    await expect(resetPassword(event)).rejects.toMatchObject({ statusCode: 400 })
    expect(mocks.requestNeonAuth).not.toHaveBeenCalled()
  })

  it('resets passwords through Neon and never through legacy Supabase Auth', async () => {
    mocks.readBody.mockResolvedValue({ password: 'a-new-password', token: 'one-time-token' })
    mocks.requestNeonAuth.mockResolvedValue({ ok: true, status: 200, data: {} })
    await expect(resetPassword(event)).resolves.toEqual({ success: true })
    expect(mocks.requestNeonAuth).toHaveBeenCalledWith(event, 'reset-password', {
      body: { token: 'one-time-token', newPassword: 'a-new-password' },
      forwardCookies: true,
    })
    expect(mocks.createSupabaseServerClient).not.toHaveBeenCalled()
  })

})
