// All writes and declarations below are synthetic UI fixtures; no human review is claimed.
const assert = require('node:assert/strict'),
  fs = require('node:fs')
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'playwright')
const catalog = require('./support/catalog-fixtures.cjs'),
  { payload } = require('./support/ui-fixtures.cjs')
const base = process.env.TEST_BASE_URL || 'http://localhost:3012',
  artifact = process.env.UI_ARTIFACT_DIR || '/tmp/catalog-ui'
;(async () => {
  fs.mkdirSync(artifact, { recursive: true })
  const browser = await chromium.launch({
    headless: true,
    ...(process.env.CHROMIUM_PATH
      ? { executablePath: process.env.CHROMIUM_PATH }
      : {}),
  })
  try {
    const context = await browser.newContext({
        viewport: { width: 1440, height: 1000 },
      }),
      p = await context.newPage(),
      state = catalog.createState(),
      errors = [],
      mutations = []
    p.setDefaultTimeout(15000)
    p.on('pageerror', (e) => errors.push(e.message))
    let dismissNextDialog = false
    p.on('dialog', (d) => {
      if (dismissNextDialog) {
        dismissNextDialog = false
        return d.dismiss()
      }
      return d.accept()
    })
    await context.route('**/api/**', async (route) => {
      const request = route.request(),
        url = new URL(request.url()),
        path = url.pathname
      if (path.startsWith('/api/admin/exam-models') && state.fail)
        return route.fulfill({
          status: 503,
          json: { statusMessage: 'Catálogo indisponível no teste' },
        })
      if (request.method() !== 'GET') {
        const body = request.postDataJSON()
        mutations.push({ path, body })
        const response = catalog.mutate(path, body, state)
        if (!response) throw Error('Unexpected mutation ' + path)
        return route.fulfill(response)
      }
      if (path === '/api/admin/review-queue')
        return route.fulfill({
          json: {
            questions: [
              {
                id: catalog.questionId,
                statementPreview: 'Questão de matemática para compor o modelo.',
                status: 'draft',
                subjectName: 'Raciocínio Lógico e Matemática',
                topicName: 'Porcentagem',
                difficulty: null,
                difficultyReviewed: false,
                sourceLabel: 'Fixture original',
              },
            ],
            total: 1,
            page: 1,
            pageSize: 10,
            hasMore: false,
          },
        })
      const value = catalog.read(path, url, state)
      return route.fulfill({
        json:
          value !== undefined
            ? value
            : payload(path, url, {
                comparisonReady: false,
                examCompleted: false,
              }),
      })
    })
    await p.goto(base + '/login')
    await p.waitForFunction(
      () =>
        document.querySelector('#__nuxt')?.__vue_app__?.$nuxt?.isHydrating ===
        false,
    )
    async function push(path) {
      await p.evaluate(
        (value) =>
          document
            .querySelector('#__nuxt')
            .__vue_app__.config.globalProperties.$router.push(value),
        path,
      )
    }
    await push('/admin/simulados')
    await p
      .getByRole('heading', { name: 'Modelos de simulados', exact: true })
      .waitFor()
    await p
      .getByRole('searchbox', { name: 'Buscar título', exact: true })
      .fill('nada')
    await p
      .getByRole('button', { name: 'Aplicar filtros', exact: true })
      .click()
    await p
      .getByText('Nenhum modelo corresponde aos filtros.', { exact: false })
      .waitFor()
    assert(new URL(p.url()).searchParams.get('search') === 'nada')
    await p
      .getByRole('searchbox', { name: 'Buscar título', exact: true })
      .fill('')
    await p
      .getByRole('button', { name: 'Aplicar filtros', exact: true })
      .click()
    await p.locator('#model-title').fill('Modelo de composição verificada')
    await p
      .locator('#model-description')
      .fill('Rascunho sintético para validar operações na interface.')
    await p.locator('#model-count').fill('1')
    await p.getByRole('button', { name: 'Criar rascunho', exact: true }).click()
    try {
      await p
        .getByRole('heading', {
          name: 'Composição e revisão de simulado',
          exact: true,
        })
        .waitFor()
    } catch (error) {
      console.error(
        JSON.stringify({
          url: p.url(),
          errors,
          mutations,
          headings: await p.locator('h1').allTextContents(),
          alerts: await p.getByRole('alert').allTextContents(),
          validations: await p.locator('input,textarea').evaluateAll((es) =>
            es.map((e) => ({
              id: e.id,
              value: e.value,
              validation: e.validationMessage,
            })),
          ),
        }),
      )
      await p.screenshot({
        path: artifact + '/failure-create.png',
        fullPage: true,
      })
      throw error
    }
    await p
      .getByRole('button', { name: /Adicionar questão Questão de matemática/ })
      .click()
    await p
      .getByRole('button', { name: 'Salvar rascunho', exact: true })
      .click()
    await p.getByRole('status').filter({ hasText: 'Rascunho salvo.' }).waitFor()
    await p.locator('#edit-title').fill('Texto local preservado no conflito')
    state.conflict = true
    await p
      .getByRole('button', { name: 'Salvar rascunho', exact: true })
      .click()
    await p
      .getByRole('alert')
      .filter({ hasText: 'Suas alterações foram preservadas' })
      .waitFor()
    assert.equal(
      await p.locator('#edit-title').inputValue(),
      'Texto local preservado no conflito',
    )
    state.conflict = false
    await p
      .getByRole('button', { name: 'Salvar rascunho', exact: true })
      .click()
    await p.getByRole('status').filter({ hasText: 'Rascunho salvo.' }).waitFor()
    await p
      .getByRole('button', { name: 'Solicitar revisão', exact: true })
      .click()
    await p
      .getByRole('status')
      .filter({ hasText: 'Revisão solicitada.' })
      .waitFor()
    assert(await p.locator('#edit-title').isDisabled())
    await p
      .getByRole('button', { name: 'Revisão humana e direitos', exact: true })
      .click()
    state.independent = false
    await p
      .getByRole('button', { name: 'Recarregar versão', exact: true })
      .click()
    await p
      .getByText('O parecer exige um revisor independente', { exact: false })
      .waitFor()
    assert(
      await p
        .getByRole('button', { name: 'Registrar parecer', exact: true })
        .isDisabled(),
    )
    state.independent = true
    await p
      .getByRole('button', { name: 'Recarregar versão', exact: true })
      .click()
    await p.waitForFunction(() =>
      document.querySelector('#rights-basis-0')?.matches(':enabled'),
    )
    async function fillReview() {
      await p.locator('#rights-basis-0').selectOption('original')
      await p
        .locator('#rights-evidence-0')
        .fill('Evidência exclusivamente sintética para o teste visual.')
      for (const check of await p
        .getByRole('form', { name: 'Parecer humano e direitos' })
        .getByRole('checkbox')
        .all())
        await check.check()
      await p.locator('#review-decision').selectOption('approved')
      await p
        .locator('#review-notes')
        .fill('Parecer sintético de validação; não é aprovação humana real.')
    }
    await fillReview()
    const beforeLeave = p.url()
    dismissNextDialog = true
    await push('/admin/simulados')
    assert.equal(p.url(), beforeLeave)
    assert.equal(
      await p.locator('#review-notes').inputValue(),
      'Parecer sintético de validação; não é aprovação humana real.',
    )
    // Switching sections must preserve the unsubmitted declaration.
    await p
      .getByRole('button', { name: 'Histórico e auditoria', exact: true })
      .click()
    await p
      .getByRole('button', { name: 'Revisão humana e direitos', exact: true })
      .click()
    assert.equal(
      await p.locator('#review-notes').inputValue(),
      'Parecer sintético de validação; não é aprovação humana real.',
    )
    state.sourceChanged = true
    await p
      .getByRole('button', { name: 'Registrar parecer', exact: true })
      .click()
    await p
      .getByRole('alert')
      .filter({ hasText: 'Suas alterações foram preservadas' })
      .waitFor()
    assert.equal(state.reviews.length, 0)
    await p
      .getByRole('button', { name: 'Recarregar versão', exact: true })
      .click()
    await p.waitForFunction(
      () => document.querySelector('#review-notes')?.value === '',
    )
    assert.equal(
      await p
        .getByRole('form', { name: 'Parecer humano e direitos' })
        .locator('input[type=checkbox]:checked')
        .count(),
      0,
    )
    await fillReview()
    await p
      .getByRole('button', { name: 'Registrar parecer', exact: true })
      .click()
    await p
      .getByRole('status')
      .filter({ hasText: 'Parecer registrado.' })
      .waitFor()
    assert.equal(state.reviews.length, 1)
    for (const theme of ['light', 'dark']) {
      const current = await p.locator('.app-shell').getAttribute('data-theme')
      if (current !== theme)
        await p
          .getByRole('button', {
            name: theme === 'dark' ? 'Ativar tema escuro' : 'Ativar tema claro',
            exact: true,
          })
          .click()
      for (const width of [320, 390, 768, 1440]) {
        await p.setViewportSize({ width, height: 1000 })
        assert.equal(
          await p.evaluate(
            () => document.documentElement.scrollWidth > innerWidth,
          ),
          false,
          `${theme} ${width}`,
        )
        if (width === 320) {
          await p.evaluate(() => {
            document.activeElement?.blur()
            scrollTo(0, 0)
          })
          await p.screenshot({
            path: `${artifact}/review-${theme}-mobile.png`,
            fullPage: true,
          })
        }
      }
      await p.evaluate(() => {
        document.activeElement?.blur()
        scrollTo(0, 0)
      })
      await p.screenshot({
        path: `${artifact}/review-${theme}.png`,
        fullPage: true,
      })
    }
    await p
      .getByRole('button', { name: 'Histórico e auditoria', exact: true })
      .click()
    await p
      .getByRole('button', { name: 'Ver conteúdo do parecer', exact: true })
      .click()
    await p
      .getByRole('heading', {
        name: 'Conteúdo preservado do parecer',
        exact: true,
      })
      .waitFor()
    await p
      .getByRole('button', { name: 'Criar nova versão', exact: true })
      .click()
    await p.waitForURL('**/2')
    await p
      .getByRole('button', { name: 'Revisão humana e direitos', exact: true })
      .click()
    await p
      .getByText('Salve a composição e solicite revisão', { exact: false })
      .waitFor()
    assert.equal(state.versions.length, 2)
    assert.equal(state.versions[1].status, 'draft')
    await p
      .getByRole('button', { name: 'Histórico e auditoria', exact: true })
      .click()
    await p.getByRole('link', { name: /Versão 1 ·/ }).click()
    await p
      .getByRole('button', { name: 'Devolver a rascunho', exact: true })
      .click()
    await p
      .getByRole('status')
      .filter({ hasText: 'Versão devolvida a rascunho' })
      .waitFor()
    await p
      .getByRole('button', { name: 'Revisão humana e direitos', exact: true })
      .click()
    await p.getByText('Parecer histórico:', { exact: false }).waitFor()
    state.fail = true
    await push('/admin/simulados')
    await p.getByRole('alert').waitFor()
    assert.equal(
      await p
        .getByRole('button', { name: 'Criar rascunho', exact: true })
        .count(),
      0,
    )
    state.fail = false
    await p
      .getByRole('button', { name: 'Tentar novamente', exact: true })
      .click()
    await p
      .getByRole('button', { name: 'Criar rascunho', exact: true })
      .waitFor()
    const reviewWrites = mutations.filter((m) => m.path.endsWith('/reviews'))
    assert(
      reviewWrites.every(
        (m) =>
          !('reviewerId' in m.body) &&
          m.body.attestationVersion === 'catalog-human-review-v1',
      ),
    )
    assert.deepEqual(errors, [])
    const result = {
      create: true,
      compose: true,
      save: true,
      conflictPreservesForm: true,
      independentReviewer: true,
      staleFingerprint: true,
      reviewTabPreservesForm: true,
      unsavedNavigationGuard: true,
      explicitDeclarations: true,
      historySnapshot: true,
      cloneWithoutApproval: true,
      returnToDraft: true,
      unavailableRecovery: true,
      themes: 2,
      widths: [320, 390, 768, 1440],
      pageErrors: errors,
      hostedAuth: false,
      realHumanReview: false,
    }
    fs.writeFileSync(
      `${artifact}/editorial-coverage.json`,
      JSON.stringify(result, null, 2),
    )
    console.log(JSON.stringify(result))
  } finally {
    await browser.close()
  }
})().catch((error) => {
  console.error(error)
  process.exitCode = 1
})
