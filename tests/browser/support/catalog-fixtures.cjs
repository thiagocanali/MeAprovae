// Synthetic editorial data: no real review, identity, source right or publication.
const id = (n) => `00000000-0000-4000-8000-${String(n).padStart(12, '0')}`
const { createHash } = require('node:crypto')
const modelId = id(60),
  questionId = id(3),
  subjectId = id(2)
function createState() {
  return {
    versions: [
      {
        model_id: modelId,
        version: 1,
        title: 'Fundamentos de matemática',
        description: 'Modelo editorial sintético para validar o fluxo.',
        kind: 'subject-foundations',
        status: 'draft',
        question_count: 1,
        duration_minutes: 6,
        edit_revision: 1,
        created_at: '2026-11-27T12:00:00Z',
        items: [
          { position: 1, question_id: questionId, subject_id: subjectId },
        ],
      },
    ],
    reviews: [],
    independent: true,
    fail: false,
    conflict: false,
    sourceChanged: false,
    historyFail: false,
  }
}
function snapshot(version, state) {
  return {
    modelId: version.model_id,
    version: version.version,
    editRevision: version.edit_revision,
    status: version.status,
    title: version.title,
    description: version.description,
    kind: version.kind,
    questionCount: version.question_count,
    durationMinutes: version.duration_minutes,
    questions: version.items.map((item, index) => ({
      position: index + 1,
      questionId: item.question_id,
      subjectId: subjectId,
      sourceSubjectId: subjectId,
      subjectName: 'Raciocínio Lógico e Matemática',
      statement: state.sourceChanged
        ? 'Enunciado modificado durante a conferência.'
        : 'Uma equipe acertou 15 de 20 questões. Qual é a taxa de acerto?',
      status: 'draft',
      sourceLabel: 'Fixture original, sem revisão humana real',
      sourceUrl: null,
      sourceYear: 2026,
      difficulty: 'easy',
      difficultyReviewed: false,
      correctOptionId: id(4),
      explanation: '15 dividido por 20 corresponde a 75%.',
      options: [
        { id: id(4), label: 'A', content: '75%', position: 1 },
        { id: id(5), label: 'B', content: '25%', position: 2 },
      ],
    })),
  }
}
function fingerprint(version, state) {
  return createHash('sha256')
    .update(JSON.stringify(snapshot(version, state)))
    .digest('hex')
}
function read(path, url, state) {
  if (path.endsWith('/quality'))
    return {
      editRevision: 1,
      questionCount: 1,
      diversity: [],
      alerts: [],
      hasExplicitTargets: false,
      overlaps: [],
      comparedModels: 0,
      totalMatches: 0,
      page: 1,
      hasMore: false,
    }

  if (!path.startsWith('/api/admin/exam-models')) return undefined
  if (path === '/api/admin/exam-models') {
    let versions = state.versions
    if (url.searchParams.get('search') === 'nada') versions = []
    if (
      url.searchParams.get('status') &&
      url.searchParams.get('status') !== 'all'
    )
      versions = versions.filter(
        (v) => v.status === url.searchParams.get('status'),
      )
    return {
      versions,
      total: versions.length,
      page: Number(url.searchParams.get('page') || 1),
      pageSize: 20,
      hasMore: false,
      publicationEnabled: false,
    }
  }
  const model = path.match(/^\/api\/admin\/exam-models\/([^/]+)(.*)$/)
  if (!model) return undefined
  if (!model[2])
    return {
      model: { id: model[1], title: state.versions[0].title },
      versions: [...state.versions].reverse(),
      versionsTruncated: false,
    }
  if (model[2] === '/audit')
    return {
      events: [
        {
          id: 1,
          actor_id: id(70),
          action: 'INSERT',
          table_name: 'exam_catalog_versions',
          new_data: { model_id: model[1], version: 1 },
          old_data: null,
          occurred_at: '2026-11-27T12:00:00Z',
        },
      ],
      total: 1,
      page: 1,
      hasMore: false,
    }
  const match = model[2].match(/^\/versions\/(\d+)(.*)$/)
  if (!match) return undefined
  const version = state.versions.find((v) => v.version === Number(match[1]))
  if (!version) return null
  if (!match[2]) return { version, publicationEnabled: false }
  if (match[2] === '/validation')
    return {
      readyForReview: version.items.length === version.question_count,
      canRequestReview:
        version.status === 'draft' &&
        version.items.length === version.question_count,
      issues:
        version.items.length === version.question_count ? [] : ['incomplete'],
      distribution: version.items.length
        ? [{ subjectId, questionCount: version.items.length }]
        : [],
      status: version.status,
      editRevision: version.edit_revision,
      publicationEnabled: false,
    }
  if (match[2] === '/review-context') {
    const latest = state.reviews
      .filter((r) => r.version === version.version)
      .at(-1)
    return {
      snapshot: snapshot(version, state),
      fingerprint: fingerprint(version, state),
      independentReviewer: state.independent,
      issues: [],
      latestReview: latest
        ? {
            ...latest,
            isCurrent:
              latest.edit_revision === version.edit_revision &&
              version.status === 'in_review' &&
              latest.fingerprint === fingerprint(version, state),
          }
        : null,
      publicationEnabled: false,
      attestationVersion: 'catalog-human-review-v1',
    }
  }
  if (match[2] === '/reviews')
    return {
      reviews: state.reviews
        .filter((r) => r.version === version.version)
        .map(({ content_snapshot, ...metadata }) => metadata),
      total: state.reviews.length,
      page: 1,
      hasMore: false,
    }
  if (match[2].startsWith('/reviews/'))
    return {
      review: {
        ...state.reviews.find((r) => r.id === match[2].split('/').at(-1)),
        content_snapshot: state.reviews.find(
          (r) => r.id === match[2].split('/').at(-1),
        )?.content_snapshot,
      },
      publicationEnabled: false,
    }
  return undefined
}
function mutate(path, body, state) {
  if (!path.startsWith('/api/admin/exam-models')) return undefined
  if (state.conflict)
    return { status: 409, json: { statusMessage: 'O modelo mudou.' } }
  if (path === '/api/admin/exam-models') {
    state.versions[0] = {
      ...state.versions[0],
      model_id: body.modelId,
      title: body.title,
      description: body.description,
      kind: body.kind,
      question_count: body.questionCount,
      duration_minutes: 6 * body.questionCount,
      items: [],
    }
    return { json: { version: state.versions[0] } }
  }
  const match = path.match(/\/versions(?:\/(\d+))?(.*)$/)
  if (!match) return undefined
  if (!match[1]) {
    const source = state.versions.find((v) => v.version === body.sourceVersion)
    const version = {
      ...structuredClone(source),
      version: body.version,
      status: 'draft',
      edit_revision: 1,
    }
    state.versions.push(version)
    return { json: { version } }
  }
  const version = state.versions.find((v) => v.version === Number(match[1]))
  if (!version)
    return { status: 404, json: { statusMessage: 'Versão ausente' } }
  if (match[2] === '/reviews') {
    if (!state.independent)
      return {
        status: 403,
        json: { statusMessage: 'Revisor independente necessário' },
      }
    if (body.expectedFingerprint !== fingerprint(version, state))
      return { status: 409, json: { statusMessage: 'Conteúdo alterado' } }
    const review = {
      id: body.requestId,
      model_id: version.model_id,
      version: version.version,
      edit_revision: version.edit_revision,
      fingerprint: body.expectedFingerprint,
      reviewer_id: id(71),
      reviewer_role: 'editor',
      decision: body.decision,
      notes: body.notes,
      rights: body.rights,
      attestations: body.attestations,
      content_snapshot: snapshot(version, state),
      created_at: '2026-11-27T13:00:00Z',
    }
    state.reviews.push(review)
    return { json: { review, replayed: false, publicationEnabled: false } }
  }
  if (body.expectedRevision !== version.edit_revision)
    return { status: 409, json: { statusMessage: 'Revisão obsoleta' } }
  if (match[2] === '/transition') {
    version.status = body.action === 'request_review' ? 'in_review' : 'draft'
    version.edit_revision++
    return { json: { version } }
  }
  Object.assign(version, {
    title: body.title,
    description: body.description,
    kind: body.kind,
    question_count: body.questionCount,
    duration_minutes: body.questionCount * 6,
    edit_revision: version.edit_revision + 1,
    items: body.questionIds.map((question_id, index) => ({
      position: index + 1,
      question_id,
      subject_id: subjectId,
    })),
  })
  return { json: { version } }
}
module.exports = {
  createState,
  read,
  mutate,
  id,
  modelId,
  questionId,
  subjectId,
}
