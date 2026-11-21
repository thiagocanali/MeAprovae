import { createError } from 'h3'

export function editorialQuestionError(error: { code?: string }) {
  switch (error.code) {
    case '28000': return createError({ statusCode: 401, statusMessage: 'Sua sessão expirou. Entre novamente.' })
    case '42501': return createError({ statusCode: 403, statusMessage: 'Sua conta não permite editar questões.' })
    case 'P0002': return createError({ statusCode: 404, statusMessage: 'Questão não encontrada.' })
    case '23514': return createError({ statusCode: 409, statusMessage: 'A regra de publicação ou o histórico de respostas impede esta alteração.' })
    case '22023':
    case '22P02':
    case '23502':
    case '23503':
    case '23522':
      return createError({ statusCode: 400, statusMessage: 'Confira os campos, a disciplina e o assunto da questão.' })
    default: return createError({ statusCode: 503, statusMessage: 'Não foi possível salvar a questão. Tente novamente.' })
  }
}
