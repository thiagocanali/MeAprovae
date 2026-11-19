import { beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  readBody: vi.fn(),
  getAuthenticatedUser: vi.fn(),
  createSupabaseServerClient: vi.fn(),
}))
vi.mock('h3', () => ({
  readBody: mocks.readBody,
  createError: ({ statusCode, statusMessage }: { statusCode: number; statusMessage: string }) =>
    Object.assign(new Error(statusMessage), { statusCode }),
}))
vi.mock('../../server/utils/supabase', () => ({
  createSupabaseServerClient: mocks.createSupabaseServerClient,
  getAuthenticatedUser: mocks.getAuthenticatedUser,
}))
vi.stubGlobal('defineEventHandler', (handler: unknown) => handler)

const { default: submitAttempt } = await import('../../server/api/study/attempts.post')
const { default: getCatalog } = await import('../../server/api/study/catalog.get')
const event = {} as Parameters<typeof submitAttempt>[0]
const userId = '550e8400-e29b-41d4-a716-446655440000'
const questionId = '550e8400-e29b-41d4-a716-446655440001'
const optionId = '550e8400-e29b-41d4-a716-446655440002'
const key = '550e8400-e29b-41d4-a716-446655440003'

beforeEach(() => {
  vi.clearAllMocks()
  mocks.getAuthenticatedUser.mockResolvedValue({ id: userId, email: 'student@example.com' })
})

describe('Study API contracts after Neon migration', () => {
  it('requires an authenticated identity before querying the catalog', async () => {
    mocks.getAuthenticatedUser.mockResolvedValue(null)
    await expect(getCatalog(event)).rejects.toMatchObject({ statusCode: 401 })
    expect(mocks.createSupabaseServerClient).not.toHaveBeenCalled()
  })

  it('returns empty subject and topic lists without treating them as failures', async () => {
    const from = vi.fn(() => ({
      select: () => ({ order: () => ({ limit: async () => ({ data: [], error: null }) }) }),
    }))
    mocks.createSupabaseServerClient.mockReturnValue({ from })
    await expect(getCatalog(event)).resolves.toEqual({ subjects: [], topics: [] })
    expect(from).toHaveBeenCalledWith('study_subjects')
    expect(from).toHaveBeenCalledWith('study_topics')
  })

  it('keeps catalog provider errors unavailable instead of returning empty data', async () => {
    mocks.createSupabaseServerClient.mockReturnValue({
      from: () => ({ select: () => ({ order: () => ({ limit: async () => ({
        data: null, error: { code: 'PGRST000' },
      }) }) }) }),
    })
    await expect(getCatalog(event)).rejects.toMatchObject({ statusCode: 503 })
  })

  it('requires identity before writing attempts', async () => {
    mocks.getAuthenticatedUser.mockResolvedValue(null)
    await expect(submitAttempt(event)).rejects.toMatchObject({ statusCode: 401 })
    expect(mocks.createSupabaseServerClient).not.toHaveBeenCalled()
  })

  it('rejects malformed attempt payload before invoking the RPC', async () => {
    mocks.readBody.mockResolvedValue({ questionId: 'invalid', optionId, idempotencyKey: key })
    await expect(submitAttempt(event)).rejects.toMatchObject({ statusCode: 400 })
    expect(mocks.createSupabaseServerClient).not.toHaveBeenCalled()
  })

  it('submits a valid answer using an idempotency key and no client-supplied user ID', async () => {
    mocks.readBody.mockResolvedValue({ questionId, optionId, idempotencyKey: key, userId: 'attacker' })
    const rpc = vi.fn(async () => ({ data: { isCorrect: true }, error: null }))
    mocks.createSupabaseServerClient.mockReturnValue({ rpc })
    await expect(submitAttempt(event)).resolves.toEqual({ result: { isCorrect: true } })
    expect(rpc).toHaveBeenCalledWith('submit_question_attempt', {
      p_question_id: questionId,
      p_option_id: optionId,
      p_idempotency_key: key,
    })
  })

  it.each([
    ['P0002', 404],
    ['22023', 409],
    ['42501', 401],
    ['28000', 401],
    ['PGRST000', 503],
  ])('maps RPC error %s to HTTP %d', async (errorCode, statusCode) => {
    mocks.readBody.mockResolvedValue({ questionId, optionId, idempotencyKey: key })
    mocks.createSupabaseServerClient.mockReturnValue({
      rpc: vi.fn(async () => ({ data: null, error: { code: errorCode } })),
    })
    await expect(submitAttempt(event)).rejects.toMatchObject({ statusCode })
  })
})
