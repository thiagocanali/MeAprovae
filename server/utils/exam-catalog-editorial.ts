import {
  createError,
  getHeader,
  getRouterParam,
  getRequestURL,
  setHeader,
  type H3Event,
} from 'h3'
import { requirePlatformEditor } from './admin'
import { readImportBody } from './import-body'
import { catalogVersion } from '../../shared/domain/questions/exam-catalog-editorial'
import { isUuid } from '../../shared/domain/common/uuid'

export async function catalogEditor(event: H3Event) {
  setHeader(event, 'Cache-Control', 'private, no-store')
  return requirePlatformEditor(event)
}
export function catalogParams(event: H3Event, versionRequired = false) {
  const id = getRouterParam(event, 'id')
  const version = catalogVersion(getRouterParam(event, 'version'))
  if (!isUuid(id) || (versionRequired && !version))
    throw createError({
      statusCode: 400,
      statusMessage: 'Modelo ou versão inválidos.',
    })
  return { id: id.toLowerCase(), version: version ?? 1 }
}
export function catalogBody(event: H3Event, maxBytes = 16 * 1024) {
  if (
    getHeader(event, 'content-type')?.split(';')[0]?.trim().toLowerCase() !==
    'application/json'
  ) {
    throw createError({
      statusCode: 415,
      statusMessage: 'Envie um corpo JSON.',
    })
  }
  const origin = getHeader(event, 'origin')
  if (origin && origin !== getRequestURL(event).origin) {
    throw createError({
      statusCode: 403,
      statusMessage: 'Origem de envio inválida.',
    })
  }
  return readImportBody(event, maxBytes)
}
export function catalogError(error: { code?: string } | null | undefined) {
  const code = error?.code
  if (code === 'P0002' || code === 'PGRST116')
    return createError({
      statusCode: 404,
      statusMessage: 'Modelo ou versão não encontrados.',
    })
  if (
    code === 'PT409' ||
    code === '40001' ||
    code === '40P01' ||
    code === '23505'
  )
    return createError({
      statusCode: 409,
      statusMessage: 'O modelo mudou. Atualize os dados antes de continuar.',
    })
  if (code === '23514')
    return createError({
      statusCode: 409,
      statusMessage:
        'A composição está incompleta, incompatível ou em revisão. Confira os itens e o estado.',
    })
  if (code === '42501')
    return createError({
      statusCode: 403,
      statusMessage: 'Sua conta não pode editar modelos.',
    })
  if (code === '22023' || code === '22P02' || code === '23503')
    return createError({
      statusCode: 400,
      statusMessage: 'Dados ou referências inválidos para o rascunho.',
    })
  return createError({
    statusCode: 503,
    statusMessage: 'O catálogo editorial está indisponível neste ambiente.',
  })
}
