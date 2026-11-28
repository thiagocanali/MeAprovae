import assert from 'node:assert/strict'
export async function runFlow({
  browser,
  base,
  cookies,
  users,
  sql,
  restBase,
  jwt,
  artifact,
}) {
  const contexts = await Promise.all(
      cookies.map(async (cookie) => {
        const c = await browser.newContext()
        await c.addCookies(cookie)
        return c
      }),
    ),
    [author, reviewer, student] = contexts
  const pages = await Promise.all(contexts.map((c) => c.newPage())),
    [p, r] = pages,
    errors = []
  pages.forEach((page) => {
    page.setDefaultTimeout(20000)
    page.on('pageerror', (e) => errors.push(e.message))
    page.on('dialog', (d) => d.accept())
  })
  const hydrated = (page) =>
    page.waitForFunction(
      () =>
        document.querySelector('#__nuxt')?.__vue_app__?.$nuxt?.isHydrating ===
        false,
    )
  const request = async (ctx, path, method = 'GET', data) => {
    console.log('HTTP ' + method + ' ' + path)
    const res = await ctx.request.fetch(base + path, {
      method,
      data,
      headers: method === 'GET' ? {} : { 'content-type': 'application/json' },
    })
    return {
      status: res.status(),
      body: await res.json(),
      cache: res.headers()['cache-control'],
    }
  }
  const expect = async (ctx, path, method, status, data) => {
    const res = await request(ctx, path, method, data)
    assert.equal(
      res.status,
      status,
      JSON.stringify({ path, status: res.status, body: res.body }),
    )
    assert.match(res.cache, /no-store/)
    return res.body
  }
  await p.goto(base + '/admin/simulados')
  await hydrated(p)
  await p.locator('#model-title').fill('Integração real do catálogo')
  await p
    .locator('#model-description')
    .fill('Somente fixture descartável, sem conteúdo real.')
  await p.locator('#model-count').fill('2')
  await p.locator('#model-kind').selectOption('multidisciplinary')
  await p.getByRole('button', { name: 'Criar rascunho', exact: true }).click()
  try {
    await p.waitForURL('**/1')
  } catch (e) {
    console.error(
      JSON.stringify({
        phase: 'create',
        alerts: await p.getByRole('alert').allTextContents(),
        title: await p.locator('#model-title').inputValue(),
        errors,
      }),
    )
    await p.screenshot({
      path: artifact + '/failure-create.png',
      fullPage: true,
    })
    throw e
  }
  await hydrated(p)
  const model = p.url().split('/').at(-2),
    root = '/api/admin/exam-models/' + model,
    endpoint = root + '/versions/1'
  await p
    .getByRole('button', {
      name: /Adicionar questão Questão sintética de integração: calcule 101%/,
    })
    .click()
  await p
    .getByRole('button', {
      name: /Adicionar questão Questão sintética de integração: leia o texto 103/,
    })
    .click()
  for (const subjectId of [
    'ee710000-0000-4000-8000-000000000020',
    'ee710000-0000-4000-8000-000000000021',
  ]) {
    await p.locator('#target-subject').selectOption(subjectId)
    await p
      .getByRole('button', { name: 'Adicionar meta por matéria', exact: true })
      .click()
  }
  await p.getByRole('button', { name: 'Salvar rascunho', exact: true }).click()
  await p.getByRole('status').filter({ hasText: 'Rascunho salvo.' }).waitFor()
  let saved = (await expect(author, endpoint, 'GET', 200)).version
  // Pick two actual distinct subjects through the API if the queue ordering first selected one subject.
  const q = (n) => 'ee710000-0000-4000-8000-' + String(n).padStart(12, '0'),
    fields = {
      title: saved.title,
      description: saved.description,
      kind: 'multidisciplinary',
      questionCount: 2,
      questionIds: [q(101), q(103)],
      subjectDistribution: [
        { subjectId: q(20), questionCount: 1 },
        { subjectId: q(21), questionCount: 1 },
      ],
    }
  saved = (
    await expect(author, endpoint, 'PUT', 200, {
      ...fields,
      expectedRevision: saved.edit_revision,
    })
  ).version
  saved = (
    await expect(author, endpoint, 'PUT', 200, {
      ...fields,
      subjectDistribution: [{ subjectId: q(20), questionCount: 2 }],
      expectedRevision: saved.edit_revision,
    })
  ).version
  assert.equal(
    (await expect(author, endpoint + '/validation', 'GET', 200))
      .canRequestReview,
    false,
  )
  await expect(author, endpoint + '/transition', 'POST', 409, {
    action: 'request_review',
    expectedRevision: saved.edit_revision,
  })
  saved = (
    await expect(author, endpoint, 'PUT', 200, {
      ...fields,
      expectedRevision: saved.edit_revision,
    })
  ).version
  const peer = q(902),
    peerRoot = '/api/admin/exam-models/' + peer
  await expect(author, '/api/admin/exam-models', 'POST', 200, {
    modelId: peer,
    title: 'Modelo de repetição sintética',
    description: 'Somente teste de sobreposição.',
    kind: 'subject-foundations',
    questionCount: 2,
  })
  await expect(author, peerRoot + '/versions/1', 'PUT', 200, {
    title: 'Modelo de repetição sintética',
    description: 'Somente teste de sobreposição.',
    kind: 'subject-foundations',
    questionCount: 2,
    expectedRevision: 1,
    questionIds: [q(101), q(102)],
  })
  const familyPeer = q(903),
    familyRoot = '/api/admin/exam-models/' + familyPeer
  await expect(author, '/api/admin/exam-models', 'POST', 200, {
    modelId: familyPeer,
    title: 'Outro modelo com família de origem',
    description: 'Fixture sem IDs compartilhados.',
    kind: 'subject-foundations',
    questionCount: 2,
  })
  await expect(author, familyRoot + '/versions/1', 'PUT', 200, {
    title: 'Outro modelo com família de origem',
    description: 'Fixture sem IDs compartilhados.',
    kind: 'subject-foundations',
    questionCount: 2,
    expectedRevision: 1,
    questionIds: [q(105), q(102)],
  })
  const quality = await expect(author, endpoint + '/quality', 'GET', 200)
  assert.equal(quality.overlaps[0].sharedCount, 1)
  assert.equal(quality.overlaps[0].currentCoveragePercent, 50)
  assert.equal(quality.diversity.length, 2)
  assert.equal(quality.totalMatches, 1)
  assert.equal(quality.totalFamilyMatches, 2)
  assert(
    quality.familyOverlaps.some(
      (o) => o.modelId === familyPeer && o.coveragePercent === 50,
    ),
  )
  assert(!quality.overlaps.some((o) => o.modelId === familyPeer))
  assert.equal(quality.knownFamilyQuestions, 1)
  assert.equal(quality.unknownFamilyQuestions, 1)
  assert.equal(quality.learningObjectivesAvailable, false)

  assert(
    (
      await expect(author, peerRoot + '/versions/1/quality', 'GET', 200)
    ).alerts.includes('numeric-variants'),
  )
  let validation = await expect(author, endpoint + '/validation', 'GET', 200)
  assert.equal(validation.canRequestReview, true)
  assert.equal(validation.distribution.length, 2)
  // Two real concurrent HTTP writes with the same CAS revision: exactly one commits.
  const races = await Promise.all([
    request(author, endpoint, 'PUT', {
      ...fields,
      title: 'Concorrência A',
      expectedRevision: saved.edit_revision,
    }),
    request(author, endpoint, 'PUT', {
      ...fields,
      title: 'Concorrência B',
      expectedRevision: saved.edit_revision,
    }),
  ])
  assert.deepEqual(races.map((x) => x.status).sort(), [200, 409])
  saved = races.find((x) => x.status === 200).body.version
  await expect(author, endpoint, 'PUT', 400, {
    ...fields,
    questionIds: [q(101), q(101)],
    expectedRevision: saved.edit_revision,
  })
  await expect(author, endpoint, 'PUT', 400, {
    ...fields,
    questionIds: [q(101), q(999)],
    expectedRevision: saved.edit_revision,
  })
  assert.equal(
    (await expect(author, endpoint, 'GET', 200)).version.edit_revision,
    saved.edit_revision,
  )
  await p.reload()
  await hydrated(p)
  await p.locator('#edit-title').fill('Alteração local a preservar')
  saved = (
    await expect(author, endpoint, 'PUT', 200, {
      ...fields,
      title: 'Alteração externa confirmada',
      expectedRevision: saved.edit_revision,
    })
  ).version
  await p.getByRole('button', { name: 'Salvar rascunho', exact: true }).click()
  await p
    .getByRole('alert')
    .filter({ hasText: 'Suas alterações foram preservadas' })
    .waitFor()
  assert.equal(
    await p.locator('#edit-title').inputValue(),
    'Alteração local a preservar',
  )
  await p
    .getByRole('button', { name: 'Recarregar versão', exact: true })
    .click()
  await p
    .getByRole('button', { name: 'Solicitar revisão', exact: true })
    .click()
  await p
    .getByRole('status')
    .filter({ hasText: 'Revisão solicitada.' })
    .waitFor()
  assert(await p.locator('#edit-title').isDisabled())
  const context = await expect(
    reviewer,
    endpoint + '/review-context',
    'GET',
    200,
  )
  assert.equal(context.independentReviewer, true)
  assert.equal(
    (await expect(author, endpoint + '/review-context', 'GET', 200))
      .independentReviewer,
    false,
  )
  const body = {
    requestId: 'ee710000-0000-4000-8000-000000000500',
    expectedRevision: context.snapshot.editRevision,
    expectedFingerprint: context.fingerprint,
    decision: 'changes_requested',
    notes:
      'Fixture de integração: não é revisão humana; solicitar conferência real.',
    rights: context.snapshot.questions.map((q) => ({
      questionId: q.questionId,
      basis: 'unverified',
      evidence: 'Fixture descartável: direitos e autoria não verificados.',
      sourceUrl: null,
    })),
    attestations: {
      content: false,
      answers: false,
      explanations: false,
      rights: false,
      independent: true,
    },
    attestationVersion: 'catalog-human-review-v1',
  }
  await expect(author, endpoint + '/reviews', 'POST', 403, body)
  await expect(student, endpoint + '/reviews', 'POST', 403, body)
  await expect(reviewer, endpoint + '/reviews', 'POST', 400, {
    ...body,
    reviewerId: users[0],
  })
  await expect(reviewer, endpoint + '/reviews', 'POST', 409, {
    ...body,
    expectedFingerprint: '0'.repeat(64),
  })
  // The real form submits an explicitly synthetic changes_requested declaration, never a fabricated human approval.
  await r.goto(p.url())
  await hydrated(r)
  await r
    .getByRole('button', { name: 'Revisão humana e direitos', exact: true })
    .click()
  for (let i = 0; i < 2; i++)
    await r.locator('#rights-evidence-' + i).fill(body.rights[i].evidence)
  await r.getByRole('checkbox', { name: /Realizei pessoalmente/ }).check()
  await r.locator('#review-notes').fill(body.notes)
  await r
    .getByRole('button', { name: 'Registrar parecer', exact: true })
    .click()
  await r
    .getByRole('status')
    .filter({ hasText: 'Parecer registrado.' })
    .waitFor()
  const ledger = await expect(reviewer, endpoint + '/reviews', 'GET', 200)
  assert.equal(ledger.total, 1)
  const record = ledger.reviews[0],
    snapshot = await expect(
      reviewer,
      endpoint + '/reviews/' + record.id,
      'GET',
      200,
    )
  assert.equal(snapshot.review.content_snapshot.questions.length, 2)
  assert.equal(record.decision, 'changes_requested')
  // Verify replay using exactly the stored fixture request id and payload.
  assert.equal(
    (
      await expect(reviewer, endpoint + '/reviews', 'POST', 200, {
        ...body,
        requestId: record.id,
      })
    ).replayed,
    true,
  )
  await r
    .getByRole('button', { name: 'Histórico e auditoria', exact: true })
    .click()
  await r
    .getByRole('button', { name: 'Ver conteúdo do parecer', exact: true })
    .click()
  await r
    .getByRole('heading', {
      name: 'Conteúdo preservado do parecer',
      exact: true,
    })
    .waitFor()
  await p
    .getByRole('button', { name: 'Criar nova versão', exact: true })
    .click()
  await p.waitForURL('**/2')
  const clone = (await expect(author, root + '/versions/2', 'GET', 200)).version
  assert.equal(clone.status, 'draft')
  assert.deepEqual(clone.subjectDistribution, fields.subjectDistribution)
  assert.equal(
    (await expect(author, root + '/versions/2/reviews', 'GET', 200)).total,
    0,
  )
  assert.equal(clone.based_on_revision, context.snapshot.editRevision)
  await expect(author, root + '/versions/2', 'PUT', 200, {
    ...fields,
    kind: 'subject-foundations',
    questionIds: [q(101), q(102)],
    subjectDistribution: [{ subjectId: q(20), questionCount: 2 }],
    expectedRevision: clone.edit_revision,
  })
  assert.deepEqual(
    (await expect(author, endpoint, 'GET', 200)).version.subjectDistribution,
    fields.subjectDistribution,
  )
  await p.reload()
  await hydrated(p)
  await p
    .getByRole('heading', {
      name: 'Famílias declaradas e estimativas',
      exact: true,
    })
    .waitFor()
  assert(
    (
      await expect(author, root + '/versions/2/quality', 'GET', 200)
    ).overlaps.some((o) => o.modelId === peer && o.nearDuplicate),
  )
  assert.deepEqual(
    (await expect(reviewer, endpoint + '/reviews/' + record.id, 'GET', 200))
      .review.content_snapshot,
    snapshot.review.content_snapshot,
  )
  assert.equal(
    (await expect(author, root + '/audit', 'GET', 200)).events.length > 0,
    true,
  )
  for (const path of [
    endpoint,
    endpoint + '/validation',
    endpoint + '/review-context',
    endpoint + '/reviews',
    root + '/audit',
    endpoint + '/quality',
  ])
    await expect(student, path, 'GET', 403)
  for (const table of [
    'exam_catalog_models',
    'exam_catalog_versions',
    'exam_catalog_items',
    'exam_catalog_reviews',
    'exam_catalog_subject_targets',
  ]) {
    const response = await fetch(restBase + '/' + table, {
      headers: { authorization: 'Bearer ' + jwt(users[2]) },
    })
    assert.equal(response.status, 200)
    assert.deepEqual(await response.json(), [])
  }
  const anonymous = await browser.newContext()
  await expect(anonymous, endpoint + '/quality', 'GET', 401)
  await anonymous.close()
  sql(`delete from public.platform_admins where user_id='${users[1]}'`)
  await expect(reviewer, endpoint + '/review-context', 'GET', 403)
  const hidden = await fetch(restBase + '/exam_catalog_reviews', {
    headers: { authorization: 'Bearer ' + jwt(users[1]) },
  })
  assert.deepEqual(await hidden.json(), [])
  sql(
    `insert into public.platform_admins(user_id,role) values('${users[1]}','editor')`,
  )
  const direct = await fetch(
    restBase + '/exam_catalog_reviews?id=eq.' + record.id,
    {
      method: 'PATCH',
      headers: {
        authorization: 'Bearer ' + jwt(users[1]),
        'content-type': 'application/json',
      },
      body: JSON.stringify({ notes: 'overwrite' }),
    },
  )
  assert.equal(direct.status, 403)
  for (const sub of users.slice(0, 2)) {
    const response = await fetch(restBase + '/exam_catalog_subject_targets', {
      method: 'POST',
      headers: {
        authorization: 'Bearer ' + jwt(sub),
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        model_id: model,
        version: 2,
        subject_id: q(20),
        question_count: 1,
      }),
    })
    assert.equal(response.status, 403)
  }
  // Referential restriction and immutable proof are tested with real SQL inside the disposable container.
  sql(
    `do $$ begin begin delete from public.study_questions where id='${q(101)}';raise exception 'missing FK restriction';exception when foreign_key_violation then null;end;begin update public.exam_catalog_reviews set notes='overwrite' where id='${record.id}';raise exception 'missing immutable trigger';exception when check_violation then null;end;end $$;`,
  )
  for (const theme of ['light', 'dark']) {
    if ((await p.locator('.app-shell').getAttribute('data-theme')) !== theme)
      await p
        .getByRole('button', {
          name: theme === 'dark' ? 'Ativar tema escuro' : 'Ativar tema claro',
          exact: true,
        })
        .click()
    for (const width of [320, 1440]) {
      await p.setViewportSize({ width, height: 900 })
      assert.equal(
        await p.evaluate(
          () => document.documentElement.scrollWidth > innerWidth,
        ),
        false,
      )
      await p.evaluate(async () => {
        document.activeElement?.blur()
        scrollTo(0, 0)
        await new Promise((r) =>
          requestAnimationFrame(() => requestAnimationFrame(r)),
        )
      })
      await p.screenshot({
        path: artifact + '/integration-' + theme + '-' + width + '.png',
        fullPage: true,
      })
    }
  }
  assert.deepEqual(errors, [])
  for (const c of contexts) await c.close()
  return {
    flow: 'Nuxt endpoints → PostgREST 12.2.3 → PostgreSQL 17 → administrative UI',
    apiMocks: false,
    fullSqlSuite: true,
    create: true,
    composition: true,
    validation: true,
    transition: true,
    syntheticChangesRequested: true,
    clone: true,
    historyPreserved: true,
    cloneEditsIsolated: true,
    themes: 2,
    concurrentCAS: [200, 409],
    rollback: true,
    studentRLS: true,
    revocationWithSameJWT: true,
    anonymousDenied: true,
    directWriteDenied: true,
    referentialIntegrity: true,
    immutableSnapshot: true,
    uiConflictPreservesForm: true,
    explicitSubjectTargets: true,
    overlapPercent: 50,
    numericVariantAlert: true,
    declaredFamilyOverlapWithoutSharedIds: true,
    nearDuplicateWarning: true,
    pageErrors: errors,
    hostedAuth: false,
    realHumanReview: false,
  }
}
