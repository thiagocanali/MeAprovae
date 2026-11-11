import { createReadStream } from 'node:fs'
import { createInterface } from 'node:readline'
import { createHash } from 'node:crypto'

// JSONL streaming: validates large editorial batches without loading the whole file.
const filename = process.argv[2]
if (!filename) { console.error('Uso: node scripts/validate-question-bank.mjs lote.jsonl'); process.exit(1) }
const fingerprints = new Set()
let line = 0
let invalid = 0
let accepted = 0
const required = ['externalId', 'statement', 'explanation', 'subject', 'sourceLabel', 'rights']
try {
  for await (const raw of createInterface({ input: createReadStream(filename), crlfDelay: Infinity })) {
    line++
    if (!raw.trim()) continue
    const errors = []
    try {
      const question = JSON.parse(raw)
      if (!question || typeof question !== 'object' || Array.isArray(question)) throw new Error('Objeto esperado')
      for (const key of required) if (typeof question[key] !== 'string' || !question[key].trim()) errors.push(`Campo obrigatório: ${key}`)
      if (!['original', 'licensed', 'public-domain'].includes(question.rights)) errors.push('Direitos inválidos')
      if (question.rights !== 'original' && !question.sourceUrl) errors.push('Fonte obrigatória para conteúdo externo')
      if (question.sourceUrl) {
        try { if (!['https:', 'http:'].includes(new URL(question.sourceUrl).protocol)) throw new Error() }
        catch { errors.push('URL da fonte inválida') }
      }
      if (!['easy', 'medium', 'hard'].includes(question.difficulty)) errors.push('Dificuldade inválida')
      if (!Array.isArray(question.options) || question.options.length < 2 || question.options.length > 5 || question.options.some(option => typeof option !== 'string' || !option.trim())) errors.push('Forneça entre 2 e 5 alternativas não vazias')
      else {
        if (new Set(question.options.map(option => option.trim().toLocaleLowerCase('pt-BR'))).size !== question.options.length) errors.push('Alternativas duplicadas')
        if (!Number.isInteger(question.correctOption) || question.correctOption < 0 || question.correctOption >= question.options.length) errors.push('Índice do gabarito inválido')
      }
      const fingerprint = createHash('sha256').update(String(question.statement ?? '').normalize('NFKC').trim().replace(/\s+/g, ' ').toLocaleLowerCase('pt-BR')).digest('hex')
      if (fingerprints.has(fingerprint)) errors.push('Enunciado duplicado no lote')
      fingerprints.add(fingerprint)
    } catch { errors.push('JSON ou formato inválido') }
    if (errors.length) { invalid++; console.error(JSON.stringify({ line, errors })) }
    else accepted++
  }
  console.log(JSON.stringify({ accepted, invalid, lines: line, published: 0 }))
  if (invalid) process.exitCode = 1
} catch (error) {
  console.error(`Não foi possível validar o arquivo: ${error.code ?? 'erro de leitura'}`)
  process.exitCode = 1
}
