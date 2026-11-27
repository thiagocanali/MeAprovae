import type { ExamModelKind } from './exam-model'
export interface CatalogVersionRecord {
  model_id: string
  version: number
  title: string
  description: string
  kind: ExamModelKind
  status: 'draft' | 'in_review'
  question_count: number
  duration_minutes: number
  edit_revision: number
  created_at: string
  items?: Array<{ position: number; question_id: string; subject_id: string }>
}
export interface CatalogListResponse {
  versions: CatalogVersionRecord[]
  total: number
  page: number
  pageSize: number
  hasMore: boolean
  publicationEnabled: false
}
export interface CatalogModelResponse {
  model: { id: string; title: string }
  versions: CatalogVersionRecord[]
  versionsTruncated: boolean
}
export interface CatalogValidation {
  readyForReview: boolean
  canRequestReview: boolean
  issues: string[]
  distribution: Array<{ subjectId: string; questionCount: number }>
  status: string
  editRevision: number
}
export interface CatalogAuditResponse {
  events: Array<{
    id: number
    actor_id: string | null
    action: string
    table_name: string
    occurred_at: string
    new_data: Record<string, unknown> | null
    old_data: Record<string, unknown> | null
  }>
  total: number
  page: number
  hasMore: boolean
}
export const catalogKinds = [
  { value: 'subject-foundations', label: 'Fundamentos de uma matéria' },
  { value: 'subject-application', label: 'Aplicação de uma matéria' },
  { value: 'multidisciplinary', label: 'Multidisciplinar' },
] as const
export function catalogKindLabel(value: string) {
  return (
    catalogKinds.find((kind) => kind.value === value)?.label ??
    'Modelo editorial'
  )
}
export function catalogStatusLabel(value: string) {
  return value === 'in_review' ? 'Em revisão' : 'Rascunho'
}
export const catalogIssueLabels: Record<string, string> = {
  incomplete: 'A quantidade de questões não corresponde à declarada.',
  duplicate: 'Há questões repetidas.',
  positions: 'A ordem das questões está incompleta.',
  distribution: 'A distribuição não corresponde ao tipo de modelo.',
  source: 'Uma fonte está arquivada ou a matéria foi alterada.',
  answers: 'Há gabaritos ou alternativas incompletos.',
  explanations: 'Há explicações pendentes.',
}
export function catalogUiError(error: unknown) {
  const value = error as {
    statusCode?: number
    status?: number
    data?: { statusCode?: number }
  } | null
  const code = value?.data?.statusCode ?? value?.statusCode ?? value?.status
  if (code === 409)
    return 'Os dados mudaram ou a composição está em revisão. Suas alterações foram preservadas; recarregue para conciliá-las.'
  if (code === 401 || code === 403)
    return 'A ação exige acesso editorial e, para pareceres, um revisor independente.'
  if (code === 404) return 'Modelo ou versão não encontrados.'
  if (code === 400 || code === 413 || code === 415)
    return 'Confira os campos, a quantidade e as evidências antes de enviar.'
  return 'O catálogo editorial está indisponível neste ambiente. Tente novamente.'
}

export function catalogDate(value: string) {
  const date = new Date(value)
  return Number.isNaN(date.getTime())
    ? 'Data indisponível'
    : new Intl.DateTimeFormat('pt-BR', {
        dateStyle: 'short',
        timeStyle: 'short',
        timeZone: 'America/Sao_Paulo',
      }).format(date)
}
