import { Readable } from 'node:stream'
import type { H3Event } from 'h3'
import { describe, expect, it } from 'vitest'
import { readImportBody } from '../../server/utils/import-body'
function event(chunks: string[], length?: string) {
  const req = Object.assign(Readable.from(chunks), { headers: length ? { 'content-length': length } : {} })
  return { node: { req } } as unknown as H3Event
}
describe('bounded import body', () => {
  it('parses JSON across chunks', async () => {
    await expect(readImportBody(event(['{"x":', '1}']), 20)).resolves.toEqual({ x: 1 })
  })
  it('rejects oversized declared bodies', async () => {
    await expect(readImportBody(event([], '21'), 20)).rejects.toMatchObject({ statusCode: 413 })
  })
  it('rejects oversized chunked bodies without Content-Length', async () => {
    await expect(readImportBody(event(['{"value":"', 'x'.repeat(30), '"}']), 20)).rejects.toMatchObject({ statusCode: 413 })
  })
  it('rejects invalid JSON', async () => {
    await expect(readImportBody(event(['{oops']), 20)).rejects.toMatchObject({ statusCode: 400 })
  })
})
