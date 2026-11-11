import { isUuid } from '../common/uuid'

export interface ImportQuestion {
  externalId: string
  statement: string
  explanation: string
  subject: string
  sourceLabel: string
  sourceUrl: string | null
  rights: 'original' | 'licensed' | 'public-domain'
  rightsEvidence: string
  difficulty: 'easy' | 'medium' | 'hard'
  options: string[]
  correctOption: number
}
export interface ImportIssue { line: number; message: string }
export const IMPORT_MAX_BYTES = 2 * 1024 * 1024
export const IMPORT_MAX_QUESTIONS = 100
const text = (value: unknown) => typeof value === 'string' ? value.trim() : ''

/** Pure preflight shared by the editor UI and the authenticated API. */
export function parseQuestionImport(jsonl: string): { questions: ImportQuestion[]; issues: ImportIssue[] } {
  const questions: ImportQuestion[] = []
  const issues: ImportIssue[] = []
  if (new TextEncoder().encode(jsonl).length > IMPORT_MAX_BYTES) return { questions, issues: [{ line: 0, message: 'O lote excede 2 MB.' }] }
  const ids = new Set<string>()
  const statements = new Set<string>()
  const rows = jsonl.split(/\r?\n/)
  let entries = 0
  for (let index = 0; index < rows.length; index++) {
    const row = rows[index]!
    if (!row.trim()) continue
    entries++
    if (entries > IMPORT_MAX_QUESTIONS) { issues.push({ line: index + 1, message: 'O lote deve ter no máximo 100 questões.' }); break }
    const fail = (message: string) => issues.push({ line: index + 1, message })
    let item: Record<string, unknown>
    try {
      const parsed: unknown = JSON.parse(row)
      if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) throw new Error()
      item = parsed as Record<string, unknown>
    } catch { fail('JSON inválido: informe um objeto por linha.'); continue }
    const issueCount = issues.length
    const externalId = text(item.externalId)
    const statement = text(item.statement)
    const explanation = text(item.explanation)
    const subject = text(item.subject)
    const sourceLabel = text(item.sourceLabel)
    const sourceUrl = text(item.sourceUrl) || null
    const rightsEvidence = text(item.rightsEvidence)
    if (!/^[a-zA-Z0-9._:-]{1,120}$/.test(externalId)) fail('externalId deve ter até 120 caracteres: letras, números, ponto, dois-pontos, hífen ou sublinhado.')
    if (statement.length < 10 || statement.length > 20000) fail('Enunciado deve ter entre 10 e 20000 caracteres.')
    if (!explanation || explanation.length > 12000) fail('Explicação obrigatória, com até 12000 caracteres.')
    if (!subject || subject.length > 100) fail('Disciplina obrigatória, com até 100 caracteres.')
    if (!sourceLabel || sourceLabel.length > 180) fail('Fonte obrigatória, com até 180 caracteres.')
    if (!['original', 'licensed', 'public-domain'].includes(String(item.rights))) fail('Direitos inválidos.')
    if (!rightsEvidence || rightsEvidence.length > 2000) fail('Informe a declaração de autoria ou evidência dos direitos, com até 2000 caracteres.')
    if (item.rights !== 'original' && !sourceUrl) fail('Conteúdo externo exige sourceUrl.')
    if (sourceUrl) {
      try { const url = new URL(sourceUrl); if (!['http:', 'https:'].includes(url.protocol) || url.username || url.password || sourceUrl.length > 2000) throw new Error() }
      catch { fail('URL de fonte inválida; use HTTP(S) sem credenciais.') }
    }
    if (!['easy', 'medium', 'hard'].includes(String(item.difficulty))) fail('Dificuldade inválida.')
    const options = Array.isArray(item.options) ? item.options.map(text) : []
    if (options.length < 2 || options.length > 5 || options.some(option => !option || option.length > 5000) || !Array.isArray(item.options) || item.options.some(option => typeof option !== 'string')) fail('Informe entre 2 e 5 alternativas de até 5000 caracteres.')
    if (new Set(options.map(option => option.toLocaleLowerCase('pt-BR'))).size !== options.length) fail('Alternativas duplicadas.')
    if (typeof item.correctOption !== 'number' || !Number.isInteger(item.correctOption) || item.correctOption < 0 || item.correctOption >= options.length) fail('correctOption deve ser o índice da resposta correta, começando em zero.')
    const fingerprint = statement.normalize('NFKC').replace(/\s+/g, ' ').toLocaleLowerCase('pt-BR')
    if (ids.has(externalId)) fail('externalId duplicado no lote.')
    if (statements.has(fingerprint)) fail('Enunciado duplicado no lote.')
    ids.add(externalId); statements.add(fingerprint)
    if (issues.length === issueCount) questions.push({ externalId, statement, explanation, subject, sourceLabel, sourceUrl,
      rights: item.rights as ImportQuestion['rights'], rightsEvidence,
      difficulty: item.difficulty as ImportQuestion['difficulty'], options, correctOption: item.correctOption as number })
  }
  if (!entries) issues.push({ line: 0, message: 'O lote está vazio.' })
  return { questions, issues }
}

export function isImportRequest(value: unknown): value is { requestId: string; noticeId: string; sourceName: string; jsonl: string } {
  if (!value || typeof value !== 'object') return false
  const body = value as Record<string, unknown>
  return typeof body.requestId === 'string' && isUuid(body.requestId) && typeof body.noticeId === 'string' && isUuid(body.noticeId)
    && typeof body.sourceName === 'string' && /^[a-z0-9][a-z0-9._-]{2,79}$/.test(body.sourceName)
    && typeof body.jsonl === 'string'
}
