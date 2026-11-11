import { createError, getHeader, type H3Event } from 'h3'
import { Buffer } from 'node:buffer'

/** Bound chunked requests too; Content-Length alone is not a trustworthy limit. */
export async function readImportBody(event: H3Event, maxBytes: number): Promise<unknown> {
  const declaredLength = Number(getHeader(event, 'content-length'))
  if (Number.isFinite(declaredLength) && declaredLength > maxBytes) throw createError({ statusCode: 413, statusMessage: 'O lote excede o limite de envio.' })
  const chunks: Buffer[] = []
  let size = 0
  for await (const chunk of event.node.req.iterator({ destroyOnReturn: false })) {
    const buffer = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk)
    size += buffer.length
    if (size > maxBytes) {
      event.node.req.resume()
      throw createError({ statusCode: 413, statusMessage: 'O lote excede o limite de envio.' })
    }
    chunks.push(buffer)
  }
  try { return JSON.parse(Buffer.concat(chunks).toString('utf8')) as unknown }
  catch { throw createError({ statusCode: 400, statusMessage: 'Corpo JSON inválido.' }) }
}
