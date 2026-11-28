// HTTP parsing, authorization order, no-store and public error contracts.
// Provider/database transport is synthetic; SQL behavior is tested separately.
import { createServer, type Server } from 'node:http'
import {
  afterAll,
  beforeAll,
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from 'vitest'
import { createApp, createRouter, defineEventHandler, toNodeListener } from 'h3'
const fixture = vi.hoisted(() => ({
  user: null as { id: string; user_metadata?: Record<string, unknown> } | null,
  editor: false,
  rpcResult: {
    data: null as unknown,
    error: null as null | { code: string; message: string },
  },
  queryResult: {
    data: null as unknown,
    count: 0,
    error: null as null | { code: string; message: string },
  },
  rpc: vi.fn(),
  from: vi.fn(),
}))
vi.mock('../../server/utils/supabase', () => ({
  createSupabaseServerClient: () => ({ rpc: fixture.rpc, from: fixture.from }),
  getAuthenticatedUser: async () => fixture.user,
}))
const id = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa'
const fields = {
  modelId: id,
  title: 'Modelo de estudo',
  description: 'Composição em rascunho.',
  kind: 'subject-foundations',
  questionCount: 2,
}
let server: Server, base: string
beforeAll(async () => {
  vi.stubGlobal('defineEventHandler', defineEventHandler)
  const router = createRouter()
  router.get(
    '/api/admin/exam-models',
    (await import('../../server/api/admin/exam-models/index.get')).default,
  )
  router.post(
    '/api/admin/exam-models',
    (await import('../../server/api/admin/exam-models/index.post')).default,
  )
  router.get(
    '/api/admin/exam-models/:id',
    (await import('../../server/api/admin/exam-models/[id]/index.get')).default,
  )
  router.get(
    '/api/admin/exam-models/:id/audit',
    (await import('../../server/api/admin/exam-models/[id]/audit.get')).default,
  )
  router.post(
    '/api/admin/exam-models/:id/versions',
    (
      await import(
        '../../server/api/admin/exam-models/[id]/versions/index.post'
      )
    ).default,
  )
  router.get(
    '/api/admin/exam-models/:id/versions/:version',
    (
      await import(
        '../../server/api/admin/exam-models/[id]/versions/[version]/index.get'
      )
    ).default,
  )
  router.get(
    '/api/admin/exam-models/:id/versions/:version/validation',
    (
      await import(
        '../../server/api/admin/exam-models/[id]/versions/[version]/validation.get'
      )
    ).default,
  )
  router.put(
    '/api/admin/exam-models/:id/versions/:version',
    (
      await import(
        '../../server/api/admin/exam-models/[id]/versions/[version]/index.put'
      )
    ).default,
  )
  router.post(
    '/api/admin/exam-models/:id/versions/:version/transition',
    (
      await import(
        '../../server/api/admin/exam-models/[id]/versions/[version]/transition.post'
      )
    ).default,
  )
  router.get(
    '/api/admin/exam-models/:id/versions/:version/review-context',
    (
      await import(
        '../../server/api/admin/exam-models/[id]/versions/[version]/review-context.get'
      )
    ).default,
  )
  router.get(
    '/api/admin/exam-models/:id/versions/:version/reviews',
    (
      await import(
        '../../server/api/admin/exam-models/[id]/versions/[version]/reviews/index.get'
      )
    ).default,
  )
  router.post(
    '/api/admin/exam-models/:id/versions/:version/reviews',
    (
      await import(
        '../../server/api/admin/exam-models/[id]/versions/[version]/reviews/index.post'
      )
    ).default,
  )
  router.get(
    '/api/admin/exam-models/:id/versions/:version/reviews/:reviewId',
    (
      await import(
        '../../server/api/admin/exam-models/[id]/versions/[version]/reviews/[reviewId].get'
      )
    ).default,
  )
  router.get(
    '/api/admin/exam-models/:id/versions/:version/quality',
    (
      await import(
        '../../server/api/admin/exam-models/[id]/versions/[version]/quality.get'
      )
    ).default,
  )
  server = createServer(
    toNodeListener(createApp({ debug: false, onError: () => {} }).use(router)),
  )
  await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve))
  const addr = server.address()
  if (!addr || typeof addr === 'string') throw Error('No test address')
  base = `http://127.0.0.1:${addr.port}`
})
afterAll(async () => {
  await new Promise<void>((resolve, reject) =>
    server.close((error) => (error ? reject(error) : resolve())),
  )
  vi.unstubAllGlobals()
})
beforeEach(() => {
  vi.clearAllMocks()
  fixture.user = { id: 'synthetic-editor' }
  fixture.editor = true
  fixture.rpcResult = {
    data: {
      version: { model_id: id, version: 1, status: 'draft' },
      replayed: false,
    },
    error: null,
  }
  fixture.queryResult = { data: [], count: 0, error: null }
  fixture.rpc.mockImplementation(async (name: string) =>
    name === 'has_platform_role'
      ? { data: fixture.editor, error: null }
      : fixture.rpcResult,
  )
  fixture.from.mockImplementation(() => {
    const query: Record<string, unknown> = {}
    for (const method of [
      'select',
      'order',
      'range',
      'eq',
      'ilike',
      'in',
      'or',
      'limit',
      'single',
    ])
      query[method] = vi.fn(() => query)
    query.then = (resolve: (value: typeof fixture.queryResult) => unknown) =>
      Promise.resolve(fixture.queryResult).then(resolve)
    return query
  })
})
const request = (path = '', method = 'GET', body?: unknown) =>
  fetch(base + '/api/admin/exam-models' + path, {
    method,
    headers: { 'content-type': 'application/json' },
    ...(body === undefined ? {} : { body: JSON.stringify(body) }),
  })
const writes = () =>
  fixture.rpc.mock.calls.filter(
    (call) => call[0] === 'write_exam_catalog_draft',
  )
describe('editorial catalog HTTP', () => {
  it.each(['anonymous', 'student'])(
    'denies %s before any catalog query or write',
    async (role) => {
      fixture.user =
        role === 'anonymous'
          ? null
          : { id: 'synthetic-student', user_metadata: { role: 'owner' } }
      fixture.editor = false
      for (const [path, method, body] of [
        ['', 'GET', undefined],
        ['', 'POST', fields],
        [`/${id}/audit`, 'GET', undefined],
        [`/${id}/versions/1/review-context`, 'GET', undefined],
        [`/${id}/versions/1/reviews`, 'GET', undefined],
        [`/${id}/versions/1/reviews`, 'POST', {}],
        [`/${id}/versions/1/reviews/${id}`, 'GET', undefined],
        [`/${id}`, 'GET', undefined],
        [`/${id}/versions/1`, 'GET', undefined],
        [`/${id}/versions/1/validation`, 'GET', undefined],
        [
          `/${id}/versions`,
          'POST',
          { version: 2, sourceVersion: 1, sourceRevision: 1 },
        ],
        [`/${id}/versions/1`, 'PUT', {}],
        [
          `/${id}/versions/1/transition`,
          'POST',
          { action: 'request_review', expectedRevision: 1 },
        ],
      ] as const) {
        const response = await request(path, method, body)
        expect(response.status).toBe(role === 'anonymous' ? 401 : 403)
        expect(response.headers.get('cache-control')).toContain('no-store')
      }
      expect(writes()).toEqual([])
      expect(fixture.from).not.toHaveBeenCalled()
    },
  )
  it('protects quality metadata and applies pagination before invoking PostgREST', async () => {
    fixture.user = null
    expect((await request(`/${id}/versions/1/quality`)).status).toBe(401)
    fixture.user = { id: 'student' }
    fixture.editor = false
    expect((await request(`/${id}/versions/1/quality`)).status).toBe(403)
    fixture.editor = true
    expect(
      (await request(`/${id}/versions/1/quality?pageSize=21`)).status,
    ).toBe(400)
    fixture.rpcResult = {
      data: {
        questions: [],
        subjectDistribution: [],
        overlaps: [],
        totalMatches: 0,
      },
      error: null,
    }
    expect(
      (await request(`/${id}/versions/1/quality?page=1&pageSize=10`)).status,
    ).toBe(200)
    expect(fixture.rpc).toHaveBeenCalledWith('get_exam_catalog_quality', {
      p_model_id: id,
      p_version: 1,
      p_page: 1,
      p_page_size: 10,
    })
  })
  it('normalizes create input and routes only safe fields to the atomic writer', async () => {
    const response = await request('', 'POST', {
      ...fields,
      title: '  Modelo de estudo  ',
    })
    expect(response.status).toBe(200)
    expect(response.headers.get('cache-control')).toBe('private, no-store')
    expect(writes()[0]).toEqual([
      'write_exam_catalog_draft',
      {
        p_action: 'create',
        p_model_id: id,
        p_version: 1,
        p_expected_revision: null,
        p_fields: {
          title: fields.title,
          description: fields.description,
          kind: fields.kind,
          questionCount: 2,
        },
      },
    ])
  })
  it('rejects client publication/review claims and oversized real HTTP bodies', async () => {
    expect(
      (await request('', 'POST', { ...fields, rightsChecked: true })).status,
    ).toBe(400)
    expect(
      (
        await request(`/${id}/versions/1/transition`, 'POST', {
          action: 'publish',
          expectedRevision: 1,
        })
      ).status,
    ).toBe(400)
    expect(
      (await request('', 'POST', { ...fields, description: 'x'.repeat(17000) }))
        .status,
    ).toBe(413)
    expect(writes()).toEqual([])
  })
  it('requires JSON and rejects cross-origin cookie mutations', async () => {
    expect(
      (
        await fetch(base + '/api/admin/exam-models', {
          method: 'POST',
          headers: { 'content-type': 'text/plain' },
          body: JSON.stringify(fields),
        })
      ).status,
    ).toBe(415)
    expect(
      (
        await fetch(base + '/api/admin/exam-models', {
          method: 'POST',
          headers: {
            'content-type': 'application/json',
            origin: 'https://external.example',
          },
          body: JSON.stringify(fields),
        })
      ).status,
    ).toBe(403)
    expect(writes()).toEqual([])
  })
  it('validates resource IDs, versions and expected revisions before mutation', async () => {
    const body = {
      ...fields,
      modelId: undefined,
      expectedRevision: 1,
      questionIds: [],
    }
    expect((await request('/invalid/versions/1', 'PUT', body)).status).toBe(400)
    expect((await request(`/${id}/versions/0`, 'PUT', body)).status).toBe(400)
    expect(
      (
        await request(`/${id}/versions/1`, 'PUT', {
          ...body,
          expectedRevision: 0,
        })
      ).status,
    ).toBe(400)
    expect(writes()).toEqual([])
  })
  it('sends optimistic revision, fixed composition and explicit clone identity', async () => {
    const { modelId, ...draft } = fields
    expect(
      (
        await request(`/${id}/versions/1`, 'PUT', {
          ...draft,
          expectedRevision: 3,
          questionIds: [id],
        })
      ).status,
    ).toBe(200)
    expect(writes()[0]?.[1]).toMatchObject({
      p_action: 'save',
      p_model_id: id,
      p_version: 1,
      p_expected_revision: 3,
      p_fields: { questionIds: [id] },
    })
    expect(
      (
        await request(`/${id}/versions`, 'POST', {
          version: 2,
          sourceVersion: 1,
          sourceRevision: 3,
        })
      ).status,
    ).toBe(200)
    expect(writes()[1]?.[1]).toMatchObject({
      p_action: 'clone',
      p_version: 2,
      p_expected_revision: 3,
      p_fields: { sourceVersion: 1 },
    })
  })
  it.each([
    ['40001', 409],
    ['PT409', 409],
    ['23514', 409],
    ['23503', 400],
    ['P0002', 404],
    ['42501', 403],
    ['42P01', 503],
  ])('maps database code %s without exposing details', async (code, status) => {
    fixture.rpcResult = {
      data: null,
      error: { code: code as string, message: 'internal-SQL-diagnostic' },
    }
    const response = await request('', 'POST', fields)
    expect(response.status).toBe(status)
    expect(await response.text()).not.toContain('internal-SQL-diagnostic')
  })
  it('bounds list queries and disallows ambiguous filters', async () => {
    expect((await request('?pageSize=51')).status).toBe(400)
    expect((await request('?status=draft&status=in_review')).status).toBe(400)
    expect(fixture.from).not.toHaveBeenCalled()
    fixture.queryResult = {
      data: [{ model_id: id, version: 1 }],
      count: 51,
      error: null,
    }
    const response = await request('?page=2&pageSize=20&status=draft')
    expect(response.status).toBe(200)
    expect(await response.json()).toMatchObject({
      total: 51,
      page: 2,
      pageSize: 20,
      hasMore: true,
      publicationEnabled: false,
    })
  })
  it('uses the same editor boundary for detail and compound-key audit', async () => {
    const detail = await request(`/${id}/versions/1`)
    expect(detail.status).toBe(200)
    const audit = await request(`/${id}/audit?pageSize=50`)
    expect(audit.status).toBe(200)
    expect(fixture.from).toHaveBeenCalledWith('exam_catalog_versions')
    expect(fixture.from).toHaveBeenCalledWith('editorial_audit_log')
  })
})

describe('review HTTP binding', () => {
  it('binds the signed-in identity through RPC and preserves explicit declarations', async () => {
    const payload = {
      requestId: id,
      expectedRevision: 3,
      expectedFingerprint: 'a'.repeat(64),
      decision: 'approved',
      notes: 'Declaração de teste de contrato HTTP.',
      rights: [
        {
          questionId: id,
          basis: 'original',
          evidence: 'Evidência sintética de contrato HTTP.',
          sourceUrl: null,
        },
      ],
      attestations: {
        content: true,
        answers: true,
        explanations: true,
        rights: true,
        independent: true,
      },
      attestationVersion: 'catalog-human-review-v1',
    }
    expect(
      (
        await request(`/${id}/versions/1/reviews`, 'POST', {
          ...payload,
          reviewerId: 'forged',
        })
      ).status,
    ).toBe(400)
    expect(
      (await request(`/${id}/versions/1/reviews`, 'POST', payload)).status,
    ).toBe(200)
    expect(fixture.rpc).toHaveBeenCalledWith('record_exam_catalog_review', {
      p_model_id: id,
      p_version: 1,
      p_fields: payload,
    })
    expect(
      (
        await request(`/${id}/versions/1/reviews`, 'POST', {
          ...payload,
          notes: 'x'.repeat(66000),
        })
      ).status,
    ).toBe(413)
  })
})
