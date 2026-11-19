import { beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  fetchNeonData: vi.fn(),
  usingNeon: vi.fn(() => true),
  ensureNeonAccount: vi.fn(),
}))
vi.mock('h3', () => ({
  createError: ({ statusCode, statusMessage }: { statusCode: number, statusMessage: string }) =>
    Object.assign(new Error(statusMessage), { statusCode }),
  parseCookies: vi.fn(() => ({})),
  setCookie: vi.fn(),
}))
vi.mock('../../server/utils/neon', () => ({
  usingNeon: mocks.usingNeon,
  fetchNeonData: mocks.fetchNeonData,
  ensureNeonAccount: mocks.ensureNeonAccount,
}))
import { createSupabaseServerClient, getAuthenticatedUser } from '../../server/utils/supabase'

const neonApi = 'https://ep-staging.apirest.c-2.sa-east-1.aws.neon.tech/meaprovae/rest/v1'
const event = {} as Parameters<typeof createSupabaseServerClient>[0]

beforeEach(() => {
  vi.clearAllMocks()
  mocks.usingNeon.mockReturnValue(true)
  vi.stubGlobal('useRuntimeConfig', () => ({
    backendProvider: 'neon',
    neonDataApiUrl: neonApi,
    supabaseUrl: 'https://supabase.example.test',
    supabaseAnonKey: 'not-a-real-key',
  }))
})

describe('Legacy query builders over Neon Data API', () => {
  it('routes PostgREST queries to Neon rather than the Supabase project', async () => {
    mocks.fetchNeonData.mockImplementation(async (_event, input: RequestInfo | URL) => {
      expect(String(input)).toContain('/meaprovae/rest/v1/study_subjects')
      expect(String(input)).not.toContain('supabase.example.test')
      return new Response(JSON.stringify([{ id: 'study-1', name: 'Matemática' }]), {
        status: 200, headers: { 'content-type': 'application/json' },
      })
    })
    const client = createSupabaseServerClient(event)
    const { data, error } = await client.from('study_subjects').select('id, name').limit(2)
    expect(error).toBeNull()
    expect(data).toEqual([{ id: 'study-1', name: 'Matemática' }])
    expect(mocks.fetchNeonData).toHaveBeenCalledTimes(1)
  })

  it('routes editorial RPCs to Neon using the same adapter', async () => {
    mocks.fetchNeonData.mockImplementation(async (_event, input: RequestInfo | URL, init?: RequestInit) => {
      expect(String(input)).toContain('/meaprovae/rest/v1/rpc/has_platform_role')
      expect(init?.method).toBe('POST')
      return new Response('true', {
        status: 200, headers: { 'content-type': 'application/json' },
      })
    })
    const client = createSupabaseServerClient(event)
    const { data, error } = await client.rpc('has_platform_role', { p_required_role: 'editor' })
    expect(error).toBeNull()
    expect(data).toBe(true)
  })

  it('resolves user identity exclusively through the Neon account boundary', async () => {
    mocks.ensureNeonAccount.mockResolvedValue({ id: '550e8400-e29b-41d4-a716-446655440000' })
    expect(await getAuthenticatedUser(event)).toEqual({ id: '550e8400-e29b-41d4-a716-446655440000' })
    expect(mocks.ensureNeonAccount).toHaveBeenCalledWith(event)
  })
})
