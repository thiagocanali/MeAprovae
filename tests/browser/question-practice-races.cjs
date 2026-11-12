// Run against a local Nuxt server. All API requests below use synthetic fixtures.
const assert = require('node:assert/strict')
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'playwright')
const baseURL = process.env.TEST_BASE_URL || 'http://localhost:3000'
const subjectA = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa'
const subjectB = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb'
const question = id => ({ id, statement: `Enunciado ${id}`, difficulty: null, options: [
  { id: `${id}-a`, option_label: 'A', content: 'Alternativa A', position: 1 },
  { id: `${id}-b`, option_label: 'B', content: 'Alternativa B', position: 2 },
] })
const gate = () => { let release; const promise = new Promise(resolve => { release = resolve }); return { promise, release } }
const tick = page => page.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))))

;(async () => {
  const browser = await chromium.launch({ headless: true, ...(process.env.CHROMIUM_PATH ? { executablePath: process.env.CHROMIUM_PATH } : {}) })
  const errors = []
  async function scenario(run) {
    const context = await browser.newContext({ viewport: { width: 390, height: 844 } })
    const page = await context.newPage()
    page.on('pageerror', error => errors.push(error.message))
    const state = { attempt: null, more: null, favorite: null, failAttempt: false, failMore: false, failFavorite: false, attempts: [], moreCalls: 0 }
    await context.route('**/api/**', async route => {
      const url = new URL(route.request().url())
      let body
      let status = 200
      if (url.pathname === '/api/auth/me') body = { user: { id: 'local-fixture' } }
      else if (url.pathname === '/api/study/catalog') body = { subjects: [{ id: subjectA, name: 'Disciplina A' }, { id: subjectB, name: 'Disciplina B' }], topics: [] }
      else if (url.pathname === '/api/study/favorites') body = { favorites: [] }
      else if (url.pathname === '/api/study/questions') {
        const filtered = url.searchParams.get('subjectId') === subjectB
        const more = url.searchParams.get('page') === '2'
        if (more) { state.moreCalls++; await state.more?.promise; if (state.failMore) status = 400 }
        body = { questions: [question(filtered ? 'B' : more ? 'A2' : 'A')], page: more ? 2 : 1, pageSize: 20, total: filtered ? 1 : 2, hasMore: !filtered && !more }
      } else if (url.pathname === '/api/study/attempts') {
        const request = route.request().postDataJSON()
        const failure = state.failAttempt
        state.attempts.push(request)
        await state.attempt?.promise
        if (failure) status = 400 // Avoid automatic HTTP retries in this failure scenario.
        body = { result: { attemptId: 'fixture-attempt', selectedOptionId: request.optionId, isCorrect: true, correctOptionId: `${request.questionId}-a`, explanation: 'Explicação da questão anterior', wasDuplicate: false } }
      } else if (url.pathname.endsWith('/favorite')) {
        await state.favorite?.promise
        if (state.failFavorite) status = 400
        body = {}
      } else throw new Error(`Unexpected fixture request: ${url.pathname}`)
      await route.fulfill({ status, contentType: 'application/json', body: JSON.stringify(body) })
    })
    try {
      await page.goto(`${baseURL}/login`)
      await page.waitForFunction(() => document.querySelector('#__nuxt')?.__vue_app__?.$nuxt?.isHydrating === false)
      await page.evaluate(() => document.querySelector('#__nuxt').__vue_app__.config.globalProperties.$router.push('/app/questoes'))
      await page.getByRole('heading', { name: 'Enunciado A', exact: true }).waitFor()
      await run(page, state)
      assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false, 'mobile overflow')
    } finally { state.attempt?.release(); state.more?.release(); state.favorite?.release(); await context.close() }
  }
  const answer = async page => { await page.getByRole('radio').first().check(); await page.getByRole('button', { name: 'Confirmar resposta', exact: true }).click() }
  const changeFilter = async page => { await page.getByRole('combobox').first().selectOption(subjectB); await page.getByRole('heading', { name: 'Enunciado B', exact: true }).waitFor() }
  const finish = async (page, pending, path) => { const response = page.waitForResponse(r => new URL(r.url()).pathname === path); pending.release(); await (await response).finished(); await tick(page) }
  try {
    for (const failure of [false, true]) await scenario(async (page, state) => {
      state.attempt = gate(); state.failAttempt = failure
      await answer(page); await page.waitForFunction(() => document.body.textContent.includes('Registrando resposta…'))
      await changeFilter(page)
      await finish(page, state.attempt, '/api/study/attempts')
      assert.equal(await page.locator('.study-result').count(), 0, 'old answer appeared on new question')
      assert.equal(await page.getByRole('alert').count(), 0, 'old answer error appeared on new question')
      await page.getByRole('radio').first().check()
      assert.equal(await page.getByRole('button', { name: 'Confirmar resposta', exact: true }).isEnabled(), true)
    })
    await scenario(async (page, state) => {
      const oldAttempt = gate(); state.attempt = oldAttempt
      await answer(page); await page.waitForFunction(() => document.body.textContent.includes('Registrando resposta…'))
      await changeFilter(page)
      await page.getByRole('combobox').first().selectOption('')
      await page.getByRole('heading', { name: 'Enunciado A', exact: true }).waitFor()
      const currentAttempt = gate(); state.attempt = currentAttempt; state.failAttempt = true
      await answer(page); await page.waitForFunction(() => document.body.textContent.includes('Registrando resposta…'))
      await finish(page, oldAttempt, '/api/study/attempts')
      assert.equal(await page.locator('.study-result').count(), 0, 'A → B → A accepted the original answer')
      assert.equal(await page.getByRole('button', { name: 'Registrando resposta…', exact: true }).isDisabled(), true, 'old finally unlocked a newer submission')
      await finish(page, currentAttempt, '/api/study/attempts')
      await page.getByRole('alert').waitFor()
      state.failAttempt = false
      await page.getByRole('button', { name: 'Confirmar resposta', exact: true }).click()
      await page.getByRole('heading', { name: 'Resposta correta!', exact: true }).waitFor()
      assert.equal(state.attempts[0].idempotencyKey, state.attempts[1].idempotencyKey, 'uncertain retry after returning to question lost its key')
      assert.equal(state.attempts[0].idempotencyKey, state.attempts[2].idempotencyKey, 'stale success cleared the active retry key')
    })
    for (const failure of [false, true]) await scenario(async (page, state) => {
      await answer(page); await page.getByRole('heading', { name: 'Resposta correta!', exact: true }).waitFor()
      state.more = gate(); state.failMore = failure
      await page.getByRole('button', { name: 'Carregar próxima página', exact: true }).click()
      await changeFilter(page)
      await finish(page, state.more, '/api/study/questions')
      assert.equal(await page.getByRole('heading', { name: 'Enunciado B', exact: true }).count(), 1, 'old next action moved the new list')
      assert.equal(await page.getByRole('alert').count(), 0, 'old pagination error appeared in new list')
      assert.match(await page.locator('.study-progress-line').innerText(), /Questão 1 de 1/)
    })
    await scenario(async (page, state) => {
      state.favorite = gate(); state.failFavorite = true
      await page.getByRole('button', { name: /Salvar nos favoritos/ }).click()
      await changeFilter(page)
      await finish(page, state.favorite, '/api/study/questions/A/favorite')
      assert.equal(await page.getByRole('alert').count(), 0, 'old favorite error appeared on new question')
      assert.equal(await page.getByRole('button', { name: /Salvar nos favoritos/ }).isEnabled(), true)
    })
    await scenario(async (page, state) => {
      state.failAttempt = true
      await answer(page); await page.getByRole('alert').waitFor()
      state.failAttempt = false
      await page.getByRole('button', { name: 'Confirmar resposta', exact: true }).click()
      await page.getByRole('heading', { name: 'Resposta correta!', exact: true }).waitFor()
      assert.equal(state.attempts[0].idempotencyKey, state.attempts[1].idempotencyKey, 'retry duplicated an uncertain attempt')
      await page.getByRole('button', { name: 'Carregar próxima página', exact: true }).click()
      await page.getByRole('heading', { name: 'Enunciado A2', exact: true }).waitFor()
      assert.equal(state.moreCalls, 1)
    })
    assert.deepEqual(errors, [])
    console.log(JSON.stringify({ scenarios: 7, staleAnswerAndError: 'blocked', returnToSameQuestion: 'guarded', currentSubmission: 'remains locked until its own response', stalePaginationAndError: 'blocked', staleFavoriteError: 'blocked', retryIdempotency: 'preserved', mobileOverflow: false, pageErrors: errors }))
  } finally { await browser.close() }
})().catch(error => { console.error(error); process.exitCode = 1 })
