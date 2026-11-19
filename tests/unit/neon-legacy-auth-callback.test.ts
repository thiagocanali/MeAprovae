import { beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  usingNeon: vi.fn(() => true),
  createSupabaseServerClient: vi.fn(),
  getQuery: vi.fn(() => ({ code: 'fake-pkce-code', next: '/app' })),
  sendRedirect: vi.fn(),
}))
vi.mock('h3', () => ({
  getQuery: mocks.getQuery,
  sendRedirect: mocks.sendRedirect,
  createError: ({ statusCode, statusMessage }: { statusCode: number, statusMessage: string }) =>
    Object.assign(new Error(statusMessage), { statusCode }),
}))
vi.mock('../../server/utils/neon', () => ({ usingNeon: mocks.usingNeon }))
vi.mock('../../server/utils/supabase', () => ({
  createSupabaseServerClient: mocks.createSupabaseServerClient,
}))
vi.stubGlobal('defineEventHandler', (handler: unknown) => handler)

const { default: callback } = await import('../../server/routes/auth/callback.get')
const event = {} as Parameters<typeof callback>[0]

beforeEach(() => {
  vi.clearAllMocks()
  mocks.usingNeon.mockReturnValue(true)
})

describe('Legacy Supabase callback must not run in Neon mode', () => {
  it('rejects Supabase PKCE codes in Neon without querying Supabase', async () => {
    await expect(callback(event)).rejects.toMatchObject({ statusCode: 404 })
    expect(mocks.createSupabaseServerClient).not.toHaveBeenCalled()
    expect(mocks.sendRedirect).not.toHaveBeenCalled()
  })

  it('preserves the original PKCE exchange when Supabase is selected', async () => {
    mocks.usingNeon.mockReturnValue(false)
    const exchangeCodeForSession = vi.fn(async () => ({ error: null }))
    mocks.createSupabaseServerClient.mockReturnValue({
      auth: { exchangeCodeForSession },
    })
    mocks.sendRedirect.mockResolvedValue('redirected')
    await expect(callback(event)).resolves.toEqual('redirected')
    expect(exchangeCodeForSession).toHaveBeenCalledWith('fake-pkce-code')
    expect(mocks.sendRedirect).toHaveBeenCalledWith(event, '/app', 303)
  })
})
