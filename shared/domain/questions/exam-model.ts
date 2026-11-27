import { isUuid } from '../common/uuid'

export type ExamModelKind = 'subject-foundations' | 'subject-application' | 'multidisciplinary'
export type ExamModelStatus = 'draft' | 'in_review' | 'published' | 'archived'

/**
 * A model is an editorial definition, NOT a student's private exam session.
 * Versions fix exact question IDs; publication is a separate manual decision.
 */
export interface VersionedExamModel {
  modelId: string
  version: number
  title: string
  description: string
  kind: ExamModelKind
  status: ExamModelStatus
  durationMinutes: number
  questionIds: string[]
  allocation: Array<{ subjectId: string; questionIds: string[] }>
  reviewedBy: string | null
  reviewedAt: string | null
  rightsChecked: boolean
  publishedAt: string | null
}

export type ExamModelValidation = { valid: boolean; errors: string[] }

/** Enforce exact, auditable composition without looking up or mutating a live database. */
export function validateExamModel(model: VersionedExamModel): ExamModelValidation {
  const errors: string[] = []
  if (!isUuid(model.modelId)) errors.push('Identificador do modelo inválido')
  if (!Number.isSafeInteger(model.version) || model.version < 1) errors.push('Versão inválida')
  if (!model.title?.trim() || model.title.trim().length > 120) errors.push('Título obrigatório (até 120 caracteres)')
  if (!model.description?.trim() || model.description.trim().length > 800) errors.push('Descrição obrigatória (até 800 caracteres)')
  if (!(['subject-foundations', 'subject-application', 'multidisciplinary'] as string[]).includes(model.kind)) errors.push('Tipo de modelo inválido')
  if (!(['draft', 'in_review', 'published', 'archived'] as string[]).includes(model.status)) errors.push('Estado editorial inválido')
  if (!Array.isArray(model.questionIds) || model.questionIds.length < 1 || model.questionIds.length > 20 ||
    model.questionIds.some(id => !isUuid(id)) || new Set(model.questionIds).size !== model.questionIds.length) {
    errors.push('Composição exige 1 a 20 questões UUID distintas')
  }
  if (!Number.isSafeInteger(model.durationMinutes) || model.durationMinutes !== model.questionIds?.length * 6) {
    errors.push('Duração deve corresponder a seis minutos por questão')
  }
  if (!Array.isArray(model.allocation) || !model.allocation.length || model.allocation.some(item =>
    !isUuid(item.subjectId) || !Array.isArray(item.questionIds) || !item.questionIds.length ||
    item.questionIds.some(id => !isUuid(id)))) {
    errors.push('Distribuição por matéria inválida')
  } else {
    const all = model.allocation.flatMap(item => item.questionIds)
    if (new Set(model.allocation.map(item => item.subjectId)).size !== model.allocation.length) errors.push('Matéria repetida na distribuição')
    if (new Set(all).size !== all.length || all.length !== model.questionIds?.length ||
      all.some(id => !model.questionIds.includes(id))) errors.push('Distribuição não coincide com a composição fixa')
    if (model.kind !== 'multidisciplinary' && model.allocation.length !== 1) errors.push('Modelo de matéria única exige exatamente uma matéria')
    if (model.kind === 'multidisciplinary' && model.allocation.length < 2) errors.push('Modelo multidisciplinar exige duas ou mais matérias')
  }
  if (typeof model.rightsChecked !== 'boolean') errors.push('Verificação de direitos precisa ser explícita')
  if (model.status === 'published') {
    if (!model.reviewedBy?.trim() || !model.reviewedAt || !Number.isFinite(Date.parse(model.reviewedAt))) {
      errors.push('Publicação exige revisão humana registrada')
    }
    if (model.rightsChecked !== true) errors.push('Publicação exige direitos conferidos')
    if (!model.publishedAt || !Number.isFinite(Date.parse(model.publishedAt))) errors.push('Publicação exige data registrada')
  } else if (model.publishedAt) errors.push('Modelo não publicado não deve indicar publicação')
  return { valid: errors.length === 0, errors }
}

/** Check a complete catalog for version collisions and accidental replacement of published snapshots. */
export function validateExamCatalog(models: VersionedExamModel[]): ExamModelValidation {
  const errors: string[] = []
  if (!Array.isArray(models)) return { valid: false, errors: ['Catálogo precisa ser uma lista'] }
  const versions = new Set<string>()
  for (const [index, model] of models.entries()) {
    const result = validateExamModel(model)
    errors.push(...result.errors.map(error => `Modelo ${index + 1}: ${error}`))
    const key = `${model.modelId}:${model.version}`
    if (versions.has(key)) errors.push(`Versão duplicada: ${key}`)
    versions.add(key)
  }
  return { valid: errors.length === 0, errors }
}

/** An editorial overlap indicator, not a substitute for verifying distinct learning objectives. */
export function calculateModelOverlap(left: VersionedExamModel, right: VersionedExamModel): number {
  if (!left.questionIds?.length || !right.questionIds?.length) return 0
  const a = new Set(left.questionIds)
  const b = new Set(right.questionIds)
  const shared = [...a].filter(id => b.has(id)).length
  return shared / Math.min(a.size, b.size)
}

/** Existing published model versions may be supplemented, never overwritten in place. */
export function changesPublishedSnapshot(previous: VersionedExamModel, next: VersionedExamModel): boolean {
  if (previous.modelId !== next.modelId || previous.version !== next.version || previous.status !== 'published') return false
  const snapshot = (model: VersionedExamModel) => JSON.stringify({
    title: model.title, description: model.description, kind: model.kind,
    durationMinutes: model.durationMinutes, questionIds: model.questionIds,
    allocation: model.allocation,
  })
  return snapshot(previous) !== snapshot(next)
}
