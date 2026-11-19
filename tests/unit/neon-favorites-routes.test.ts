import { beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  getAuthenticatedUser: vi.fn(),
  createSupabaseServerClient: vi.fn(),
  getRouterParam: vi.fn(),
  logSupabaseError: vi.fn(),
}))
vi.mock('h3', () => ({
  createError: ({ statusCode, statusMessage }: { statusCode: number, statusMessage: string }) =>
    Object.assign(new Error(statusMessage), { statusCode }),
  getRouterParam: mocks.getRouterParam,
}))
vi.mock('../../server/utils/supabase', () => ({
  createSupabaseServerClient: mocks.createSupabaseServerClient,
  getAuthenticatedUser: mocks.getAuthenticatedUser,
}))
vi.mock('../../server/utils/supabase-diagnostics', () => ({
  logSupabaseError: mocks.logSupabaseError,
}))
vi.stubGlobal('defineEventHandler', (handler: unknown) => handler)

const { default: listFavorites } = await import('../../server/api/study/favorites.get')
const { default: saveFavorite } = await import('../../server/api/study/questions/[id]/favorite.post')
const { default: deleteFavorite } = await import('../../server/api/study/questions/[id]/favorite.delete')

const userId = '11111111-1111-4111-8111-111111111111'
const questionId = '22222222-2222-4222-8222-222222222222'
const event = {} as Parameters<typeof listFavorites>[0]

beforeEach(() => {
  vi.clearAllMocks()
  mocks.getAuthenticatedUser.mockResolvedValue({ id: userId })
  mocks.getRouterParam.mockReturnValue(questionId)
})

describe('Favorites API — authenticated identity and isolation', () => {
  it('requires authentication for list, save and delete', async () => {
    mocks.getAuthenticatedUser.mockResolvedValue(null)
    await expect(listFavorites(event)).rejects.toMatchObject({ statusCode: 401 })
    await expect(saveFavorite(event)).rejects.toMatchObject({ statusCode: 401 })
    await expect(deleteFavorite(event)).rejects.toMatchObject({ statusCode: 401 })
    expect(mocks.createSupabaseServerClient).not.toHaveBeenCalled()
  })

  it('filters favorites by the verified identity', async () => {
    const eq = vi.fn(() => ({ order: vi.fn(async () => ({ data: [], error: null })) }))
    mocks.createSupabaseServerClient.mockReturnValue({
      from: vi.fn(() => ({ select: vi.fn(() => ({ eq })) })),
    })
    await expect(listFavorites(event)).resolves.toEqual({ favorites: [] })
    expect(eq).toHaveBeenCalledWith('user_id', userId)
  })

  it('never accepts a caller-selected user when saving favorites', async () => {
    const upsert = vi.fn(async () => ({ error: null }))
    mocks.createSupabaseServerClient.mockReturnValue({
      from: vi.fn(() => ({ upsert })),
    })
    await expect(saveFavorite(event)).resolves.toEqual({ favorited: true })
    expect(upsert).toHaveBeenCalledWith({ user_id: userId, question_id: questionId }, {
      onConflict: 'user_id,question_id', ignoreDuplicates: true,
    })
  })

  it('deletes only the current user favorite for the selected question', async () => {
    const eqQuestion = vi.fn(async () => ({ error: null }))
    const eqUser = vi.fn(() => ({ eq: eqQuestion }))
    mocks.createSupabaseServerClient.mockReturnValue({
      from: vi.fn(() => ({ delete: vi.fn(() => ({ eq: eqUser })) })),
    })
    await expect(deleteFavorite(event)).resolves.toEqual({ favorited: false })
    expect(eqUser).toHaveBeenCalledWith('user_id', userId)
    expect(eqQuestion).toHaveBeenCalledWith('question_id', questionId)
  })

  it('rejects invalid question IDs before contacting the database', async () => {
    mocks.getRouterParam.mockReturnValue('not-a-uuid')
    await expect(saveFavorite(event)).rejects.toMatchObject({ statusCode: 400 })
    await expect(deleteFavorite(event)).rejects.toMatchObject({ statusCode: 400 })
    expect(mocks.createSupabaseServerClient).not.toHaveBeenCalled()
  })

  it('does not silently convert database errors to empty favorites', async () => {
    const eq = vi.fn(() => ({ order: vi.fn(async () => ({ data: null, error: { code: 'PGRST000' } })) }))
    mocks.createSupabaseServerClient.mockReturnValue({
      from: vi.fn(() => ({ select: vi.fn(() => ({ eq })) })),
    })
    await expect(listFavorites(event)).rejects.toMatchObject({ statusCode: 503 })
  })
})
