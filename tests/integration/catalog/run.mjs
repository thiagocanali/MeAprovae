// Real Nuxt endpoints + PostgREST + PostgreSQL; only the identity provider is a local fixture.
// No application bypass, real accounts, remote DB, real rights or human approval.
import { createServer } from 'node:http'
import { createHmac, timingSafeEqual, randomUUID } from 'node:crypto'
import { execFileSync, spawn } from 'node:child_process'
import {
  mkdtempSync,
  writeFileSync,
  readFileSync,
  mkdirSync,
  chmodSync,
  openSync,
} from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { createServerClient } from '@supabase/ssr'
import { runFlow } from './flow.mjs'
const artifact = mkdtempSync(join(tmpdir(), 'meaprovae-catalog-integration-'))
const reserve = createServer()
await new Promise((r) => reserve.listen(0, '127.0.0.1', r))
const appPort = reserve.address().port
await new Promise((r) => reserve.close(r))
const base = 'http://127.0.0.1:' + appPort
const suffix = randomUUID().slice(0, 8),
  db = 'catalog-test-db-' + suffix,
  rest = 'catalog-test-rest-' + suffix
const secret = randomUUID() + randomUUID(),
  password = randomUUID(),
  users = [1, 2, 3].map(
    (n) => 'ee710000-0000-4000-8000-' + String(n).padStart(12, '0'),
  )
const dockerEnv = { ...process.env }
for (const key of [
  'DOCKER_HOST',
  'DOCKER_CONTEXT',
  'DOCKER_TLS',
  'DOCKER_TLS_VERIFY',
  'DOCKER_CERT_PATH',
])
  delete dockerEnv[key]
const docker = (args, input) =>
  execFileSync('docker', ['--host=unix:///var/run/docker.sock', ...args], {
    env: dockerEnv,
    input,
    encoding: 'utf8',
    stdio: ['pipe', 'pipe', 'pipe'],
  })
const delay = (ms) => new Promise((r) => setTimeout(r, ms))
let gateway,
  app,
  browser,
  dbStarted = false,
  restStarted = false
function jwt(sub) {
  const header = Buffer.from(
      JSON.stringify({ alg: 'HS256', typ: 'JWT' }),
    ).toString('base64url'),
    body = Buffer.from(
      JSON.stringify({
        role: 'authenticated',
        sub,
        exp: Math.floor(Date.now() / 1000) + 3600,
      }),
    ).toString('base64url')
  return (
    header +
    '.' +
    body +
    '.' +
    createHmac('sha256', secret)
      .update(header + '.' + body)
      .digest('base64url')
  )
}
function identity(token) {
  try {
    const [h, p, s] = token.split('.'),
      expected = createHmac('sha256', secret)
        .update(h + '.' + p)
        .digest(),
      actual = Buffer.from(s, 'base64url'),
      data = JSON.parse(Buffer.from(p, 'base64url'))
    return actual.length === expected.length &&
      timingSafeEqual(actual, expected) &&
      data.exp > Date.now() / 1000 &&
      users.includes(data.sub)
      ? {
          id: data.sub,
          aud: 'authenticated',
          role: 'authenticated',
          email: 'fixture-' + users.indexOf(data.sub) + '@example.invalid',
          app_metadata: { provider: 'email' },
          user_metadata: {},
          created_at: '2026-01-01T00:00:00Z',
        }
      : null
  } catch {
    return null
  }
}
try {
  docker([
    'run',
    '-d',
    '--name',
    db,
    '--tmpfs',
    '/var/lib/postgresql/data:rw,size=256m',
    '-p',
    '127.0.0.1::3021',
    '-e',
    'POSTGRES_PASSWORD=' + password,
    'postgres:17',
  ])
  dbStarted = true
  let ready = false
  for (let i = 0; i < 60; i++) {
    try {
      docker(['exec', db, 'pg_isready', '-h', '127.0.0.1', '-U', 'postgres'])
      ready = true
      break
    } catch {
      await delay(250)
    }
  }
  if (!ready) throw Error('Disposable PostgreSQL not ready')
  const sql = (text) =>
    docker(
      [
        'exec',
        '-i',
        db,
        'psql',
        '-X',
        '-U',
        'postgres',
        '-v',
        'ON_ERROR_STOP=1',
      ],
      text,
    )
  const bin = join(artifact, 'bin')
  mkdirSync(bin)
  const adapter = `#!/usr/bin/env node
const {readFileSync}=require('node:fs'),{resolve,dirname}=require('node:path'),{spawnSync}=require('node:child_process');let args=process.argv.slice(2),input;const index=args.indexOf('-f');if(index>=0){const file=args[index+1];input=readFileSync(file,'utf8').replace(/^\\\\ir (.+)$/gm,(_,name)=>readFileSync(resolve(dirname(file),name),'utf8'));args[index+1]='-'}const result=spawnSync('docker',['--host=unix:///var/run/docker.sock','exec','-i','-e','PGHOST=127.0.0.1','-e','PGUSER=postgres','-e','PGDATABASE=postgres','-e','PGAPPNAME='+(process.env.PGAPPNAME||'catalog-suite'),${JSON.stringify(db)},'psql',...args],{env:Object.fromEntries(Object.entries(process.env).filter(([key])=>!['DOCKER_HOST','DOCKER_CONTEXT','DOCKER_TLS','DOCKER_TLS_VERIFY','DOCKER_CERT_PATH'].includes(key))),input,stdio:[input?'pipe':'inherit','inherit','inherit']});process.exit(result.status??1)
`
  writeFileSync(join(bin, 'psql'), adapter)
  chmodSync(join(bin, 'psql'), 0o700)
  const dbLog = openSync(join(artifact, 'database.log'), 'w')
  execFileSync('bash', ['scripts/test-database.sh'], {
    env: {
      ...process.env,
      PATH: bin + ':' + process.env.PATH,
      PGHOST: '127.0.0.1',
      PGHOSTADDR: '127.0.0.1',
      PGDATABASE: 'postgres',
      PGUSER: 'postgres',
      PGSERVICE: '',
      PGSERVICEFILE: '',
    },
    stdio: ['ignore', dbLog, dbLog],
  })
  console.log('PASS: complete disposable PostgreSQL regression suite')

  sql(readFileSync('tests/integration/catalog/fixtures.sql'))
  sql("alter role postgres set statement_timeout='15s'")
  docker([
    'run',
    '-d',
    '--name',
    rest,
    '--network',
    'container:' + db,
    '-e',
    `PGRST_DB_URI=postgres://postgres:${password}@127.0.0.1:5432/postgres`,
    '-e',
    'PGRST_DB_ANON_ROLE=anon',
    '-e',
    'PGRST_JWT_SECRET=' + secret,
    '-e',
    'PGRST_SERVER_PORT=3021',
    'postgrest/postgrest:v12.2.3',
  ])
  restStarted = true
  const port = Number(
      docker(['port', db, '3021/tcp']).trim().split(':').at(-1),
    ),
    restBase = 'http://127.0.0.1:' + port
  for (let i = 0; i < 60; i++) {
    try {
      if ((await fetch(restBase)).ok) break
    } catch {}
    if (i === 59) throw Error('PostgREST not ready')
    await delay(250)
  }
  gateway = createServer(async (req, res) => {
    try {
      if (req.url === '/auth/v1/user' && req.method === 'GET') {
        const user = identity(
          (req.headers.authorization || '').replace(/^Bearer /, ''),
        )
        res.writeHead(user ? 200 : 401, { 'content-type': 'application/json' })
        return res.end(
          JSON.stringify(user || { msg: 'Invalid synthetic identity' }),
        )
      }
      if (!req.url.startsWith('/rest/v1/')) {
        res.writeHead(404)
        return res.end()
      }
      const target = new URL(req.url.slice('/rest/v1'.length), restBase),
        headers = { ...req.headers }
      delete headers.host
      delete headers.connection
      const chunks = []
      for await (const chunk of req) chunks.push(chunk)
      const upstream = await fetch(target, {
        method: req.method,
        headers,
        body: ['GET', 'HEAD'].includes(req.method)
          ? undefined
          : Buffer.concat(chunks),
        redirect: 'error',
      })
      const outgoing = Object.fromEntries(upstream.headers)
      delete outgoing['transfer-encoding']
      delete outgoing['content-encoding']
      delete outgoing['content-length']
      res.writeHead(upstream.status, outgoing)
      res.end(Buffer.from(await upstream.arrayBuffer()))
    } catch {
      res.writeHead(502)
      res.end('Isolated gateway error')
    }
  })
  await new Promise((r) => gateway.listen(0, '127.0.0.1', r))
  const gatewayUrl = 'http://127.0.0.1:' + gateway.address().port
  // Cookie creation uses the actual SSR library, not hand-written app auth shortcuts.
  const cookies = []
  for (const sub of users) {
    let jar = []
    const client = createServerClient(gatewayUrl, 'fixture-anon-key', {
      cookies: {
        getAll: () => jar,
        setAll: (values) => {
          jar = values
        },
      },
    })
    const result = await client.auth.setSession({
      access_token: jwt(sub),
      refresh_token: 'fixture-no-refresh',
    })
    if (result.error) throw Error('Synthetic session rejected')
    cookies.push(jar.map((c) => ({ name: c.name, value: c.value, url: base })))
  }
  const appLog = openSync(join(artifact, 'nuxt.log'), 'w')
  app = spawn(
    process.execPath,
    [
      'node_modules/nuxt/bin/nuxt.mjs',
      'dev',
      '--host',
      '127.0.0.1',
      '--port',
      String(appPort),
    ],
    {
      env: {
        ...process.env,
        SUPABASE_URL: gatewayUrl,
        SUPABASE_ANON_KEY: 'fixture-anon-key',
        NUXT_SUPABASE_URL: gatewayUrl,
        NUXT_SUPABASE_ANON_KEY: 'fixture-anon-key',
      },
      stdio: ['ignore', appLog, appLog],
    },
  )
  let started = false
  for (let i = 0; i < 180; i++) {
    if (app.exitCode !== null) throw Error('Nuxt exited; inspect ' + artifact)
    try {
      if ((await fetch(base + '/api/health')).ok) {
        started = true
        break
      }
    } catch {}
    await delay(500)
  }
  if (!started) throw Error('Nuxt readiness timed out')
  const { chromium } = await import(
    process.env.PLAYWRIGHT_MODULE || 'playwright-core'
  )
  browser = await chromium.launch({
    headless: true,
    ...(process.env.CHROMIUM_PATH
      ? { executablePath: process.env.CHROMIUM_PATH }
      : {}),
  })
  const result = await runFlow({
    browser,
    base,
    cookies,
    users,
    sql,
    restBase,
    jwt,
    artifact,
  })
  writeFileSync(join(artifact, 'result.json'), JSON.stringify(result, null, 2))
  console.log(JSON.stringify({ ...result, artifact }))
} catch (error) {
  if (browser)
    for (const c of browser.contexts())
      for (const p of c.pages())
        await p
          .screenshot({
            path: join(
              artifact,
              'failure-' + browser.contexts().indexOf(c) + '.png',
            ),
            fullPage: true,
            timeout: 5000,
          })
          .catch(() => {})
  console.error(
    error.message
      .split('\n')[0]
      .replaceAll(secret, '[fixture-secret]')
      .replaceAll(password, '[fixture-password]'),
  )
  console.error('Artifacts: ' + artifact)
  process.exitCode = 1
} finally {
  if (browser) await browser.close()
  if (app) {
    app.kill('SIGTERM')
    await Promise.race([new Promise((r) => app.once('exit', r)), delay(3000)])
    if (app.exitCode === null) app.kill('SIGKILL')
  }
  if (gateway) await new Promise((r) => gateway.close(r))
  if (restStarted) docker(['rm', '-f', rest])
  if (dbStarted) docker(['rm', '-f', '-v', db])
}
