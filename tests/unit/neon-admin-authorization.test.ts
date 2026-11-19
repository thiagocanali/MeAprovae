import { beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  createSupabaseServerClient: vi.fn(),
  getAuthenticatedUser: vi.fn(),
}))
vi.mock('h3', () => ({
  createError: ({ statusCode, statusMessage }: { statusCode: number, statusMessage: string }) =>
    Object.assign(new Error(statusMessage), { statusCode }),
}))
vi.mock('../../server/utils/supabase', () => ({
  createSupabaseServerClient: mocks.createSupabaseServerClient,
  getAuthenticatedUser: mocks.getAuthenticatedUser,
}))

import { requirePlatformEditor } from '../../server/utils/admin'

const event = {} as Parameters<typeof requirePlatformEditor>[0]
const user = { id: '550e8400-e29b-41d4-a716-446655440000', email: 'editor@example.test' }

beforeEach(() => {
  vi.clearAllMocks()
  mocks.getAuthenticatedUser.mockResolvedValue(user)
})

describe('Neon editorial authorization boundary', () => {
  it('rejects unauthenticated users before opening a database client', async () => {
    mocks.getAuthenticatedUser.mockResolvedValue(null)
    await expect(requirePlatformEditor(event)).rejects.toMatchObject({ statusCode: 401 })
    expect(mocks.createSupabaseServerClient).not.toHaveBeenCalled()
  })

  it('checks editorial privileges using the database RPC without caller-controlled role', async () => {
    const rpc = vi.fn(async () => ({ data: true, error: null }))
    const client = { rpc }
    mocks.createSupabaseServerClient.mockReturnValue(client)
    await expect(requirePlatformEditor(event)).resolves.toEqual({ user, supabase: client })
    expect(rpc).toHaveBeenCalledTimes(1)
    expect(rpc).toHaveBeenCalledWith('has_platform_role', {
      p_required_role: 'editor',
    })
  })

  it('rejects false or unexpected role responses, not just database errors', async () => {
    for (const allowed of [false, null, 'true', 1]) {
      mocks.createSupabaseServerClient.mockReturnValue({
        rpc: vi.fn(async () => ({ data: allowed, error: null })),
      })
      await expect(requirePlatformEditor(event)).rejects.toMatchObject({ statusCode: 403 })
    }
  })

  it('fails closed when the privilege RPC cannot be checked', async () => {
    mocks.createSupabaseServerClient.mockReturnValue({
      rpc: vi.fn(async () => ({ data: null, error: { code: 'PGRST000' } })),
    })
    await expect(requirePlatformEditor(event)).rejects.toMatchObject({ statusCode: 503 })
  })
})
