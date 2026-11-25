// Local UI regression suite. All API data and mutations are synthetic fixtures.
const assert = require('node:assert/strict')
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'playwright')
const base = process.env.TEST_BASE_URL || 'http://localhost:3000'
const id = (n) => `00000000-0000-4000-8000-${String(n).padStart(12, '0')}`
const contests = Array.from({ length: 14 }, (_, i) => ({
  id: id(i + 1),
  slug: `concurso-${i + 1}`,
  title:
    i === 0
      ? 'Concurso de Administração Federal'
      : `Concurso Regional ${String(i + 1).padStart(2, '0')}`,
  organization: i === 0 ? 'Órgão Alfa' : 'Órgão Regional',
  exam_board: i === 0 ? 'Banca Alfa' : 'Banca Beta',
  published_at: '2026-11-21',
  study_positions:
    i === 13
      ? []
      : [
          {
            id: id(100 + i),
            title: i === 0 ? 'Técnico Administrativo' : 'Analista',
            education_level: i === 0 ? 'Médio' : 'Superior',
            area: 'Administrativa',
          },
        ],
  study_notices:
    i === 13
      ? []
      : [
          {
            id: id(200 + i),
            title: 'Edital de abertura',
            version: '1.0',
            publication_date: '2026-11-21',
            source_url: 'https://example.org/edital.pdf',
            study_notice_subjects: [
              {
                position: 1,
                study_subjects: { id: id(300), name: 'Língua Portuguesa' },
              },
            ],
          },
        ],
}))
;(async () => {
  const browser = await chromium.launch({
    headless: true,
    ...(process.env.CHROMIUM_PATH
      ? { executablePath: process.env.CHROMIUM_PATH }
      : {}),
  })
  try {
    const context = await browser.newContext({
      viewport: { width: 1440, height: 1000 },
    })
    const p = await context.newPage()
    const pageErrors = []
    p.on('pageerror', (error) => pageErrors.push(error.message))
    let followed = []
    let goal = null
    let failList = false
    let failGoal = false
    let failFollow = false
    let missing = false
    let empty = false
    const writes = []
    await context.route('**/api/**', async (route) => {
      const request = route.request()
      const path = new URL(request.url()).pathname
      let body
      let status = 200
      if (path === '/api/auth/me') body = { user: { id: 'local-student' } }
      else if (path === '/api/study/contests') {
        status = failList ? 400 : 200
        body = { contests: empty ? [] : contests, followedContestIds: followed }
      } else if (path === '/api/study/goals') {
        if (request.method() === 'POST') {
          const value = request.postDataJSON()
          writes.push(value)
          if (failGoal) status = 400
          else
            goal = {
              contest_id: value.contestId,
              notice_id: value.noticeId,
              position_id: value.positionId,
            }
        }
        body = { goal }
      } else if (path.endsWith('/follow')) {
        if (failFollow) status = 400
        else followed = request.method() === 'POST' ? [id(1)] : []
        body = { followed: followed.length > 0 }
      } else if (path.startsWith('/api/study/contests/')) {
        const contest = contests.find((c) => c.slug === path.split('/').at(-1))
        status = missing || !contest ? 404 : 200
        body = { contest, isFollowed: followed.includes(contest?.id) }
      } else throw new Error(`Unexpected API: ${path}`)
      await route.fulfill({
        status,
        contentType: 'application/json',
        body: JSON.stringify(body),
      })
    })
    const push = (path) =>
      p.evaluate(
        (value) =>
          document
            .querySelector('#__nuxt')
            .__vue_app__.config.globalProperties.$router.push(value),
        path,
      )
    await p.goto(base + '/login')
    await p.waitForFunction(
      () =>
        document.querySelector('#__nuxt')?.__vue_app__?.$nuxt?.isHydrating ===
        false,
    )
    await push('/app/concursos')
    await p.getByText('14 concursos encontrados', { exact: true }).waitFor()
    assert.equal(await p.locator('.contest-card').count(), 12)
    await p.getByRole('button', { name: 'Próxima →', exact: true }).click()
    await p.waitForURL((url) => url.searchParams.get('page') === '2')
    await p.waitForFunction(
      () => document.querySelectorAll('.contest-card').length === 2,
    )
    await p.getByRole('button', { name: '← Anterior', exact: true }).click()
    await p.waitForURL((url) => !url.searchParams.has('page'))
    await p.waitForFunction(
      () => document.querySelectorAll('.contest-card').length === 12,
    )
    await p.locator('#contest-search').fill('orgao tecnico administracao')
    await p
      .getByRole('button', { name: 'Buscar concursos', exact: false })
      .click()
    await p.getByText('1 concurso encontrado', { exact: true }).waitFor()
    assert.equal(
      new URL(p.url()).searchParams.get('q'),
      'orgao tecnico administracao',
    )
    await p.getByRole('button', { name: 'Limpar filtros', exact: true }).click()
    await p.getByText('14 concursos encontrados', { exact: true }).waitFor()
    await p.locator('#contest-board').selectOption('Banca Alfa')
    await p.locator('#contest-education').selectOption('Médio')
    await p
      .getByRole('button', { name: 'Buscar concursos', exact: false })
      .click()
    await p.getByText('1 concurso encontrado', { exact: true }).waitFor()
    await p
      .getByRole('link', {
        name: 'Ver detalhes de Concurso de Administração Federal',
        exact: true,
      })
      .click()
    await p
      .getByRole('heading', {
        name: 'Concurso de Administração Federal',
        exact: true,
        level: 1,
      })
      .waitFor()
    assert.equal(
      await p
        .getByRole('heading', { name: 'Técnico Administrativo', exact: true })
        .count(),
      1,
    )
    assert.ok(
      (
        await p
          .getByRole('link', { name: /Consultar fonte do edital/ })
          .getAttribute('href')
      ).startsWith('https://'),
    )
    assert.ok(
      (
        await p
          .getByRole('link', { name: 'Língua Portuguesa →', exact: true })
          .getAttribute('href')
      ).includes('subjectId=' + id(300)),
    )
    assert.ok(
      (
        await p
          .getByRole('link', { name: 'Resolver questões →', exact: true })
          .getAttribute('href')
      ).includes('contestId=' + id(1)),
    )
    assert.ok(
      (
        await p
          .getByRole('link', { name: 'Montar simulado →', exact: true })
          .getAttribute('href')
      ).includes('contestId=' + id(1)),
    )
    failFollow = true
    await p
      .getByRole('button', { name: '+ Acompanhar concurso', exact: true })
      .click()
    await p
      .getByRole('alert')
      .filter({ hasText: 'Não foi possível atualizar' })
      .waitFor()
    failFollow = false
    await p
      .getByRole('button', { name: '+ Acompanhar concurso', exact: true })
      .click()
    await p
      .getByText('Você está acompanhando este concurso.', { exact: true })
      .waitFor()
    await p.locator('#goal-notice').selectOption(id(200))
    await p.locator('#goal-position').selectOption(id(100))
    failGoal = true
    await p
      .getByRole('button', { name: 'Salvar como meu objetivo', exact: true })
      .click()
    await p
      .getByRole('alert')
      .filter({ hasText: 'Não foi possível salvar' })
      .waitFor()
    assert.equal(await p.locator('#goal-position').inputValue(), id(100))
    failGoal = false
    await p
      .getByRole('button', { name: 'Salvar como meu objetivo', exact: true })
      .click()
    await p
      .getByText('Objetivo salvo. Você já pode começar a estudar.', {
        exact: true,
      })
      .waitFor()
    assert.deepEqual(writes.at(-1), {
      contestId: id(1),
      noticeId: id(200),
      positionId: id(100),
    })
    assert.equal(
      await p
        .getByRole('button', { name: '✓ Objetivo definido', exact: true })
        .isDisabled(),
      true,
    )
    await p
      .getByRole('button', { name: '✓ Deixar de acompanhar', exact: true })
      .click()
    await p
      .getByText(
        'Você deixou de acompanhar este concurso. Seu objetivo de estudo foi mantido.',
        { exact: true },
      )
      .waitFor()
    assert.equal(goal.contest_id, id(1))
    // Re-mount catalogue to verify persisted goal, empty following filter and history.
    await push('/app/concursos?view=following')
    await p
      .getByRole('heading', {
        name: 'Nenhum concurso acompanhado nesta seleção.',
        exact: true,
      })
      .waitFor()
    assert.equal(
      await p
        .getByRole('heading', {
          name: 'Concurso de Administração Federal',
          exact: true,
        })
        .count(),
      1,
    )
    await p
      .getByRole('button', { name: 'Ver todos os concursos', exact: true })
      .click()
    await p.getByText('14 concursos encontrados', { exact: true }).waitFor()
    await p.goBack()
    await p
      .getByRole('heading', {
        name: 'Nenhum concurso acompanhado nesta seleção.',
        exact: true,
      })
      .waitFor()
    await p.goForward()
    await p.getByText('14 concursos encontrados', { exact: true }).waitFor()
    await p.locator('.contest-skip').focus()
    await p.keyboard.press('Enter')
    assert.equal(
      await p.evaluate(() => document.activeElement?.id),
      'contest-main',
      'keyboard skip link must focus main content',
    )
    for (const width of [320, 390, 768, 1440]) {
      await p.setViewportSize({ width, height: 1000 })
      assert.equal(
        await p.evaluate(
          () => document.documentElement.scrollWidth > innerWidth,
        ),
        false,
        `overflow at ${width}px`,
      )
    }
    await p.evaluate(() => {
      document.activeElement?.blur()
      window.scrollTo(0, 0)
    })
    assert.ok(
      await p
        .locator('.contest-skip')
        .evaluate((el) => el.getBoundingClientRect().bottom <= 0),
      'skip link should be hidden when unfocused',
    )
    await p.screenshot({
      path: '/workspace/work/validation/contests-desktop.png',
      fullPage: true,
    })
    await p.getByRole('button', { name: 'Ativar tema escuro', exact: true }).click()
    await p.waitForFunction(() => document.querySelector('.app-shell')?.getAttribute('data-theme') === 'dark')
    await p.screenshot({ path: '/workspace/work/validation/contests-desktop-dark.png', fullPage: true })
    await p.getByRole('button', { name: 'Ativar tema claro', exact: true }).click()
    await p.setViewportSize({ width: 390, height: 844 })
    assert.equal(
      await p.evaluate(() => document.documentElement.scrollWidth > innerWidth),
      false,
    )
    await p.evaluate(() => {
      document.activeElement?.blur()
      window.scrollTo(0, 0)
    })
    assert.ok(
      await p
        .locator('.contest-skip')
        .evaluate((el) => el.getBoundingClientRect().bottom <= 0),
      'skip link should be hidden when unfocused',
    )
    await p.screenshot({
      path: '/workspace/work/validation/contests-mobile.png',
      fullPage: true,
    })
    await push('/app/concursos/concurso-1')
    await p
      .getByRole('heading', {
        name: 'Concurso de Administração Federal',
        exact: true,
        level: 1,
      })
      .waitFor()
    assert.equal(await p.locator('#goal-position').inputValue(), id(100))
    assert.equal(
      await p.evaluate(() => document.documentElement.scrollWidth > innerWidth),
      false,
    )
    await p.evaluate(() => {
      document.activeElement?.blur()
      window.scrollTo(0, 0)
    })
    assert.ok(
      await p
        .locator('.contest-skip')
        .evaluate((el) => el.getBoundingClientRect().bottom <= 0),
      'skip link should be hidden when unfocused',
    )
    await p.screenshot({
      path: '/workspace/work/validation/contest-detail-mobile.png',
      fullPage: true,
    })
    await push('/app/concursos/concurso-14')
    await p
      .getByText('Ainda não há cargos informados para este concurso.', {
        exact: true,
      })
      .waitFor()
    await p
      .getByText('Ainda não há edital disponível para este concurso.', {
        exact: false,
      })
      .waitFor()
    await p
      .getByText('Salvar substituirá seu objetivo atual.', { exact: false })
      .waitFor()
    await p
      .getByRole('button', { name: 'Salvar como meu objetivo', exact: true })
      .click()
    await p
      .getByText('Objetivo salvo. Você já pode começar a estudar.', {
        exact: true,
      })
      .waitFor()
    assert.deepEqual(writes.at(-1), {
      contestId: id(14),
      noticeId: null,
      positionId: null,
    })
    missing = true
    await push('/app/concursos/inexistente')
    await p
      .getByRole('heading', { name: 'Concurso não encontrado.', exact: true })
      .waitFor()
    missing = false
    failList = true
    await p
      .getByRole('link', { name: 'Voltar ao catálogo', exact: true })
      .click()
    await p
      .getByRole('heading', {
        name: 'Não conseguimos carregar o catálogo.',
        exact: true,
      })
      .waitFor()
    failList = false
    empty = true
    await p
      .getByRole('button', { name: 'Tentar carregar novamente', exact: true })
      .click()
    await p
      .getByRole('heading', {
        name: 'Novos objetivos estão a caminho.',
        exact: true,
      })
      .waitFor()
    assert.deepEqual(pageErrors, [])
    console.log(
      JSON.stringify({
        fixtureCatalog: 14,
        pagination: true,
        accentSearch: true,
        combinedFilters: true,
        followAndUnfollow: true,
        saveAndReplaceGoal: true,
        failureAndRetry: true,
        deepStudyLinks: true,
        emptyCatalog: true,
        emptyDetails: true,
        notFound: true,
        mobileOverflow: false,
        pageErrors,
      }),
    )
    await context.close()
  } finally {
    await browser.close()
  }
})().catch((error) => {
  console.error(error)
  process.exitCode = 1
})
