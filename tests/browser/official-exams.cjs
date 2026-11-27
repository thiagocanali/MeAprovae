// Uses the versioned source metadata with mocked API/auth; never submits real answers.
const assert = require('node:assert/strict')
const fs = require('node:fs')
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'playwright')
const base = process.env.TEST_BASE_URL || 'http://localhost:3000'
const catalog = JSON.parse(
  fs.readFileSync('content/sources/official-exams.json', 'utf8'),
)
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
    const page = await context.newPage()
    const errors = []
    page.on('pageerror', (error) => errors.push(error.message))
    let fail = false
    await context.route('**/api/**', async (route) => {
      const path = new URL(route.request().url()).pathname
      if (path === '/api/auth/me')
        return route.fulfill({ json: { user: { id: 'local-fixture' } } })
      if (path === '/api/study/official-exams')
        return route.fulfill({ status: fail ? 400 : 200, json: catalog })
      throw new Error('Unexpected request ' + path)
    })
    const push = (path) =>
      page.evaluate(
        (value) =>
          document
            .querySelector('#__nuxt')
            .__vue_app__.config.globalProperties.$router.push(value),
        path,
      )
    await page.goto(base + '/login')
    await page.waitForFunction(
      () =>
        document.querySelector('#__nuxt')?.__vue_app__?.$nuxt?.isHydrating ===
        false,
    )
    await push('/app/provas-oficiais')
    await page
      .getByText('36 referências encontradas', { exact: true })
      .waitFor()
    assert.equal(await page.locator('.contest-card').count(), 12)
    await page.locator('#official-event').selectOption('CNU 2')
    await page.locator('#official-year').selectOption('2025')
    await page
      .getByRole('button', { name: 'Buscar provas', exact: true })
      .click()
    await page.getByText('9 referências encontradas', { exact: true }).waitFor()
    assert.equal(
      await page.getByRole('link', { name: /Abrir prova/ }).count(),
      9,
    )
    assert.equal(
      await page.getByRole('link', { name: /Gabarito final/ }).count(),
      9,
    )
    const href = await page
      .getByRole('link', { name: /Gabarito final/ })
      .first()
      .getAttribute('href')
    assert.ok(href.endsWith('retificado_21.11.2025.pdf'))
    await page.locator('#official-search').fill('ciencia dados')
    await page
      .getByRole('button', { name: 'Buscar provas', exact: true })
      .click()
    await page.getByText('1 referência encontrada', { exact: true }).waitFor()
    await page
      .getByRole('heading', {
        name: 'Bloco 3 — Ciência, Dados e Tecnologia',
        exact: true,
      })
      .waitFor()
    await page.goBack()
    await page.getByText('9 referências encontradas', { exact: true }).waitFor()
    await page
      .getByRole('button', { name: 'Limpar filtros', exact: true })
      .click()
    await page
      .getByText('36 referências encontradas', { exact: true })
      .waitFor()
    await page.locator('#official-event').selectOption('Enem')
    await page.locator('#official-year').selectOption('2024')
    await page
      .getByRole('button', { name: 'Buscar provas', exact: true })
      .click()
    await page.getByText('2 referências encontradas', { exact: true }).waitFor()
    assert.equal(
      await page.getByRole('link', { name: /Abrir prova/ }).count(),
      0,
      'unconfirmed downloads must not be advertised as verified PDFs',
    )
    assert.equal(
      await page.getByRole('link', { name: /Página oficial/ }).count(),
      2,
    )
    await page.locator('#official-search').fill('not-found-fixture')
    await page
      .getByRole('button', { name: 'Buscar provas', exact: true })
      .click()
    await page
      .getByRole('heading', { name: 'Nenhuma prova encontrada.', exact: true })
      .waitFor()
    await page
      .getByRole('button', { name: 'Ver todas as provas', exact: true })
      .click()
    await page
      .getByText('36 referências encontradas', { exact: true })
      .waitFor()
    await page.getByRole('button', { name: 'Próxima →', exact: true }).click()
    await page.waitForURL((url) => url.searchParams.get('page') === '2')
    await page.waitForFunction(
      () =>
        document
          .querySelector('.contest-pagination span')
          ?.textContent?.trim() === '2 de 3',
    )
    for (const width of [320, 390, 768, 1440]) {
      await page.setViewportSize({ width, height: 1000 })
      assert.equal(
        await page.evaluate(
          () => document.documentElement.scrollWidth > innerWidth,
        ),
        false,
        `overflow at ${width}`,
      )
    }
    await page
      .getByRole('button', { name: 'Ativar tema escuro', exact: true })
      .click()
    await page.waitForFunction(
      () =>
        document.querySelector('.app-shell')?.getAttribute('data-theme') ===
        'dark',
    )
    await page.screenshot({
      path: '/workspace/work/sources-2026-11-25/official-library-desktop.png',
      fullPage: true,
    })
    await page.setViewportSize({ width: 390, height: 844 })
    assert.equal(
      await page.evaluate(
        () => document.documentElement.scrollWidth > innerWidth,
      ),
      false,
    )
    await page.screenshot({
      path: '/workspace/work/sources-2026-11-25/official-library-mobile.png',
      fullPage: true,
    })
    const saved = new URL(page.url())
    await push('/login')
    await page
      .getByRole('heading', {
        name: 'Pratique com provas oficiais.',
        exact: true,
      })
      .waitFor({ state: 'hidden' })
    await push(saved.pathname + saved.search)
    await page
      .getByText('36 referências encontradas', { exact: true })
      .waitFor()
    fail = true
    await push('/login')
    await page
      .getByRole('heading', {
        name: 'Pratique com provas oficiais.',
        exact: true,
      })
      .waitFor({ state: 'hidden' })
    await push('/app/provas-oficiais')
    await page
      .getByRole('heading', {
        name: 'Não foi possível carregar as provas.',
        exact: true,
      })
      .waitFor()
    fail = false
    await page
      .getByRole('button', { name: 'Tentar novamente', exact: true })
      .click()
    await page
      .getByText('36 referências encontradas', { exact: true })
      .waitFor()
    assert.deepEqual(errors, [])
    console.log(
      JSON.stringify({
        references: 36,
        verifiedPairs: 21,
        pendingDownloads: 15,
        retifiedKey: true,
        filtersAndHistory: true,
        unverifiedSourceOnly: true,
        pagination: true,
        errorRecovery: true,
        themes: true,
        viewports: [320, 390, 768, 1440],
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
