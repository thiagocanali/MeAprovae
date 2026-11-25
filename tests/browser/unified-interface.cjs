const assert = require('node:assert/strict')
const fs = require('node:fs')
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'playwright')
const { payload, id, question } = require('./support/ui-fixtures.cjs')
const base = process.env.TEST_BASE_URL || 'http://localhost:3000'
const artifact = process.env.UI_ARTIFACT_DIR || '/tmp/meaprovae-ui'
const routes = [
  '/',
  '/login',
  '/cadastro',
  '/esqueci-senha',
  '/redefinir-senha',
  '/app',
  '/app/concursos',
  '/app/concursos/concurso-teste',
  '/app/questoes',
  '/app/provas',
  '/app/provas-oficiais',
  `/app/simulados/${id(60)}`,
  '/app/desempenho',
  '/app/comparar',
  '/app/favoritas',
  '/app/erros',
  '/app/historico',
  '/app/onboarding',
  '/admin',
  '/admin/revisao',
  '/admin/acervo',
  '/admin/importar',
]
const routeFiles = fs
  .readdirSync('app/pages', { recursive: true })
  .filter((file) => file.endsWith('.vue'))
  .map(
    (file) =>
      '/' +
      file
        .replace(/\\/g, '/')
        .replace(/\.vue$/, '')
        .replace(/(^|\/)index$/, '')
        .replace('[slug]', 'concurso-teste')
        .replace('[id]', id(60)),
  )
assert.deepEqual(
  [...routes].sort(),
  routeFiles.sort(),
  'Every page must be covered by the visual matrix',
)
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
    })
    const p = await context.newPage()
    const errors = []
    p.on('pageerror', (e) => errors.push(e.message))
    const state = {
      comparisonReady: false,
      examCompleted: false,
      fail: false,
      loginGate: null,
    }
    const mutations = []
    await context.route('**/api/**', async (route) => {
      const request = route.request()
      const url = new URL(request.url())
      const path = url.pathname
      if (request.method() !== 'GET') {
        mutations.push(path)
        if (path === '/api/auth/login') {
          await state.loginGate?.promise
          return route.fulfill({ json: {} })
        }
        if (path === '/api/auth/register')
          return route.fulfill({ json: { requiresEmailConfirmation: true } })
        if (
          [
            '/api/auth/recover',
            '/api/auth/update-password',
            '/api/auth/logout',
          ].includes(path)
        )
          return route.fulfill({ json: {} })
        if (path === '/api/study/attempts') {
          const body = request.postDataJSON()
          return route.fulfill({
            json: {
              result: {
                attemptId: id(20),
                selectedOptionId: body.optionId,
                isCorrect: true,
                correctOptionId: question.options[0].id,
                explanation: '15 de 20 correspondem a 75%.',
                wasDuplicate: false,
              },
            },
          })
        }
        throw new Error('Unexpected UI mutation ' + path)
      }
      if (state.fail && path !== '/api/auth/me')
        return route.fulfill({
          status: 400,
          json: { message: 'Falha sintética de serviço' },
        })
      return route.fulfill({ json: payload(path, url, state) })
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
      await p.waitForFunction(
        () => document.querySelectorAll('main').length === 1,
      )
      await p.locator('h1').first().waitFor()
    }
    async function theme(name) {
      const current = await p
        .locator('.app-shell')
        .first()
        .getAttribute('data-theme')
      if (current !== name)
        await p
          .getByRole('button', {
            name: name === 'dark' ? 'Ativar tema escuro' : 'Ativar tema claro',
            exact: true,
          })
          .click()
      await p.waitForFunction(
        (value) =>
          document.querySelector('.app-shell')?.getAttribute('data-theme') ===
          value,
        name,
      )
    }
    const checks = []
    for (const path of routes) {
      await push(path)
      assert.equal(await p.locator('main').count(), 1, 'duplicate main ' + path)
      assert.equal(
        await p.getByRole('heading', { level: 1 }).count(),
        1,
        'missing/duplicate h1 ' + path,
      )
      assert.equal(
        await p.locator('.theme-toggle').count(),
        1,
        'theme control duplication ' + path,
      )
      assert.equal(
        await p.locator('[data-ui=workspace]').count(),
        path.startsWith('/app') || path.startsWith('/admin') ? 1 : 0,
        path,
      )
      assert.equal(
        await p.locator('.study-header,.student-header').count(),
        0,
        'old header ' + path,
      )
      for (const name of ['light', 'dark']) {
        await theme(name)
        for (const width of [320, 390, 768, 1440]) {
          await p.setViewportSize({ width, height: 1000 })
          const overflow = await p.evaluate(
            () => document.documentElement.scrollWidth > innerWidth,
          )
          assert.equal(overflow, false, `${path} ${name} ${width}px`)
          checks.push({ path, theme: name, width })
        }
        if (
          [
            '/login',
            '/app',
            '/app/questoes',
            '/app/desempenho',
            '/app/concursos',
            '/admin',
            '/',
          ].includes(path)
        ) {
          await p.evaluate(() => {
            document.activeElement?.blur()
            scrollTo(0, 0)
          })
          await p.screenshot({
            path: `${artifact}/${path.replace(/\//g, '-') || 'home'}-${name}.png`,
            fullPage: true,
          })
        }
      }
    }
    // Mobile menu, keyboard skip link, and active routes use the shared shell.
    await push('/app/questoes')
    await p.setViewportSize({ width: 390, height: 844 })
    const menu = p.locator('.workspace-menu-button')
    await menu.click()
    assert.equal(await menu.getAttribute('aria-expanded'), 'true')
    await p
      .getByRole('navigation', { name: 'Navegação principal', exact: true })
      .getByRole('link', { name: 'Meu histórico', exact: true })
      .click()
    await p
      .getByRole('heading', { name: 'Histórico de questões', exact: true })
      .waitFor()
    assert.equal(
      await p
        .getByRole('button', { name: /Abrir menu/ })
        .getAttribute('aria-expanded'),
      'false',
    )
    await p.locator('.contest-skip').focus()
    await p.keyboard.press('Enter')
    assert.equal(
      await p.evaluate(() => document.activeElement?.id),
      'workspace-main',
    )
    await push('/app/questoes')
    await p.getByRole('radio').first().check()
    await p
      .getByRole('button', { name: 'Confirmar resposta', exact: true })
      .click()
    await p
      .getByRole('heading', { name: 'Resposta correta!', exact: true })
      .waitFor()
    state.examCompleted = true
    await push('/app')
    await push(`/app/simulados/${id(60)}`)
    await p
      .getByRole('heading', { name: 'Simulado concluído', exact: true })
      .waitFor()
    state.comparisonReady = true
    await push('/app')
    await push('/app/comparar')
    await p
      .getByRole('heading', {
        name: 'Você e o grupo de referência',
        exact: true,
      })
      .waitFor()
    // A service failure keeps the same layout and a recovery action.
    state.fail = true
    await push('/app')
    await push('/app/favoritas')
    await p.getByRole('alert').waitFor()
    assert.equal(await p.locator('[data-ui=workspace]').count(), 1)
    state.fail = false
    await p
      .getByRole('button', { name: 'Tentar novamente', exact: true })
      .click()
    await p.getByRole('alert').waitFor({ state: 'hidden' })
    // Auth forms retain their endpoints and their pending/success behavior.
    await push('/login')
    await p.locator('#email').fill('student@example.test')
    await p.locator('#password').fill('Local-test-123!')
    await p.getByRole('button', { name: 'Mostrar senha', exact: true }).click()
    assert.equal(await p.locator('#password').getAttribute('type'), 'text')
    let release
    state.loginGate = {
      promise: new Promise((resolve) => {
        release = resolve
      }),
    }
    await p.getByRole('button', { name: 'Entrar', exact: true }).click()
    await p.getByRole('button', { name: 'Entrando…', exact: true }).waitFor()
    assert.equal(
      await p
        .getByRole('button', { name: 'Entrando…', exact: true })
        .isDisabled(),
      true,
    )
    release()
    await p.waitForURL('**/app')
    await push('/cadastro')
    await p.locator('#displayName').fill('Estudante de teste')
    await p.locator('#email').fill('student@example.test')
    await p.locator('#password').fill('Local-test-123!')
    await p
      .getByRole('button', { name: 'Criar minha conta', exact: true })
      .click()
    await p.getByRole('status').filter({ hasText: 'Conta criada.' }).waitFor()
    await push('/esqueci-senha')
    await p.locator('#email').fill('student@example.test')
    await p
      .getByRole('button', { name: 'Enviar instruções', exact: true })
      .click()
    await p
      .getByRole('status')
      .filter({ hasText: 'Se houver uma conta' })
      .waitFor()
    await push('/redefinir-senha')
    await p.locator('#password').fill('Local-test-123!')
    await p.locator('#confirmPassword').fill('Local-test-123!')
    await p
      .getByRole('button', { name: 'Atualizar senha', exact: true })
      .click()
    await p
      .getByRole('status')
      .filter({ hasText: 'Senha atualizada.' })
      .waitFor()
    await push('/app')
    await p.getByRole('button', { name: 'Sair', exact: true }).click()
    await p.waitForURL('**/login')
    // Unknown URLs share the public design and recover to the home page.
    await p.goto(base + '/rota-inexistente-teste')
    await p.waitForFunction(
      () =>
        document.querySelector('#__nuxt')?.__vue_app__?.$nuxt?.isHydrating ===
        false,
    )
    await p
      .getByRole('heading', {
        name: 'Esse caminho ainda não existe.',
        exact: true,
      })
      .waitFor()
    // Nuxt adds its own development error overlay outside our application.
    assert.equal(await p.locator('[data-ui=public] main').count(), 1)
    await p
      .getByRole('button', { name: 'Voltar ao início →', exact: true })
      .click()
    await p.waitForURL(base + '/')
    assert.deepEqual(errors, [])
    fs.writeFileSync(
      `${artifact}/coverage.json`,
      JSON.stringify(
        {
          routes: routes.length,
          checks,
          global404: true,
          mutations,
          pageErrors: errors,
        },
        null,
        2,
      ),
    )
    console.log(
      JSON.stringify({
        routes: routes.length,
        viewportThemeChecks: checks.length,
        global404: true,
        oneMain: true,
        oneThemeControl: true,
        authForms: true,
        questionSubmission: true,
        examResult: true,
        comparisonResult: true,
        errorRecovery: true,
        mobileMenu: true,
        keyboardSkip: true,
        pageErrors: errors,
      }),
    )
  } finally {
    await browser.close()
  }
})().catch((error) => {
  console.error(error)
  process.exitCode = 1
})
