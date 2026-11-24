import { createReadStream } from 'node:fs'
import { createInterface } from 'node:readline'
import { createHash } from 'node:crypto'

// Validation is read-only; this script never imports or publishes a batch.
const filename = process.argv[2]
if (!filename) { console.error('Uso: node scripts/validate-question-bank.mjs lote.jsonl'); process.exit(1) }

const fingerprints = new Set()
const externalIds = new Set()
let line = 0
let invalid = 0
let accepted = 0

const required = ['externalId', 'statement', 'explanation', 'subject', 'sourceLabel', 'rights']
const normalized = value => value.normalize('NFKC').trim().replace(/\s+/g, ' ').toLocaleLowerCase('pt-BR')
const nonempty = value => typeof value === 'string' && Boolean(value.trim())

function validateQuestion(question) {
  const errors = []
  if (!question || typeof question !== 'object' || Array.isArray(question)) return ['Objeto esperado']

  for (const key of required) {
    if (!nonempty(question[key])) errors.push(`Campo obrigatório: ${key}`)
  }
  if (!['original', 'licensed', 'public-domain'].includes(question.rights)) errors.push('Direitos inválidos')
  if (question.rights !== 'original' && !nonempty(question.sourceUrl)) errors.push('Fonte obrigatória para conteúdo externo')
  if (question.rights === 'licensed' && !nonempty(question.rightsEvidence)) errors.push('Evidência de licença obrigatória')

  if (question.sourceUrl !== undefined && question.sourceUrl !== null && question.sourceUrl !== '') {
    try {
      if (typeof question.sourceUrl !== 'string') throw new Error()
      const url = new URL(question.sourceUrl)
      if (!['https:', 'http:'].includes(url.protocol) || !url.hostname || url.username || url.password) throw new Error()
    } catch { errors.push('URL da fonte inválida') }
  }

  if (!['easy', 'medium', 'hard'].includes(question.difficulty)) errors.push('Dificuldade inválida')
  if (typeof question.difficultyReviewed !== 'boolean') errors.push('Informe difficultyReviewed como booleano explícito')
  if (question.difficultyReviewed === true && !nonempty(question.difficultyRationale)) errors.push('Justificativa de dificuldade revisada obrigatória')

  if (!Array.isArray(question.options) || question.options.length < 2 || question.options.length > 5
    || question.options.some(option => !nonempty(option))) {
    errors.push('Forneça entre 2 e 5 alternativas não vazias')
  } else {
    if (new Set(question.options.map(normalized)).size !== question.options.length) errors.push('Alternativas duplicadas')
    if (!Number.isInteger(question.correctOption) || question.correctOption < 0 || question.correctOption >= question.options.length) errors.push('Índice do gabarito inválido')
  }

  if (nonempty(question.externalId)) {
    const id = normalized(question.externalId)
    if (externalIds.has(id)) errors.push('externalId duplicado no lote')
    externalIds.add(id)
  }
  if (nonempty(question.statement)) {
    const fingerprint = createHash('sha256').update(normalized(question.statement)).digest('hex')
    if (fingerprints.has(fingerprint)) errors.push('Enunciado duplicado no lote')
    fingerprints.add(fingerprint)
  }
  return errors
}

try {
  for await (const raw of createInterface({ input: createReadStream(filename), crlfDelay: Infinity })) {
    line++
    if (!raw.trim()) continue
    let errors
    try { errors = validateQuestion(JSON.parse(raw)) }
    catch { errors = ['JSON ou formato inválido'] }
    if (errors.length) { invalid++; console.error(JSON.stringify({ line, errors })) }
    else accepted++
  }
  console.log(JSON.stringify({ accepted, invalid, lines: line, published: 0 }))
  if (invalid) process.exitCode = 1
} catch (error) {
  console.error(`Não foi possível validar o arquivo: ${error.code ?? 'erro de leitura'}`)
  process.exitCode = 1
}
