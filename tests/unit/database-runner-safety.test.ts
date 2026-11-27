import { execFileSync } from 'node:child_process'
import {
  mkdtempSync,
  writeFileSync,
  chmodSync,
  existsSync,
  rmSync,
} from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'

describe('disposable database runner safeguards', () => {
  it.each([
    { PGHOST: 'db.remote.test' },
    { PGHOSTADDR: '203.0.113.10' },
    { PGSERVICE: 'production' },
    { PGSERVICEFILE: '/tmp/production-service.conf' },
    { PGDATABASE: 'postgresql://remote.test/database' },
    { PGDATABASE: 'host=remote.test dbname=postgres' },
  ])('rejects libpq remote overrides before invoking psql: %j', (override) => {
    const dir = mkdtempSync(join(tmpdir(), 'local-db-guard-'))
    const marker = join(dir, 'called')
    writeFileSync(
      join(dir, 'psql'),
      '#!/bin/sh\ntouch "$TEST_CALL_MARKER"\nexit 88\n',
    )
    chmodSync(join(dir, 'psql'), 0o700)
    try {
      const env = {
        ...process.env,
        PATH: `${dir}:${process.env.PATH}`,
        PGHOST: '127.0.0.1',
        PGHOSTADDR: '',
        PGSERVICE: '',
        PGSERVICEFILE: '',
        PGDATABASE: 'postgres',
        TEST_CALL_MARKER: marker,
        ...override,
      }
      expect(() =>
        execFileSync('bash', ['scripts/test-database.sh'], {
          env,
          stdio: 'pipe',
        }),
      ).toThrow()
      expect(existsSync(marker)).toBe(false)
    } finally {
      rmSync(dir, { recursive: true, force: true })
    }
  })
})
