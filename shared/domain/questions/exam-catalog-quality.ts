import { isUuid } from '../common/uuid'
export interface SubjectTarget {
  subjectId: string
  questionCount: number
}
export interface QualityQuestion {
  id: string
  statement: string
  subjectId: string
  subjectName: string
  topicId: string | null
  topicName: string | null
}
export function parseSubjectDistribution(
  value: unknown,
): SubjectTarget[] | null {
  if (!Array.isArray(value) || value.length > 20) return null
  const result: SubjectTarget[] = []
  for (const item of value) {
    if (
      !item ||
      typeof item !== 'object' ||
      Array.isArray(item) ||
      Object.keys(item).length !== 2 ||
      !isUuid(item.subjectId) ||
      !Number.isInteger(item.questionCount) ||
      item.questionCount < 1 ||
      item.questionCount > 20
    )
      return null
    result.push({
      subjectId: item.subjectId.toLowerCase(),
      questionCount: item.questionCount,
    })
  }
  return new Set(result.map((t) => t.subjectId)).size === result.length
    ? result.sort((a, b) => a.subjectId.localeCompare(b.subjectId))
    : null
}
export function inspectSubjectTargets(
  actual: SubjectTarget[],
  targets: SubjectTarget[],
) {
  return (
    targets.length === 0 ||
    (actual.length === targets.length &&
      targets.every((t) =>
        actual.some(
          (a) =>
            a.subjectId === t.subjectId && a.questionCount === t.questionCount,
        ),
      ))
  )
}
/** Conservative, explainable alert: numeric variants of a long statement, within one subject.
 * Not semantic equivalence, difficulty assessment or a publication gate. */
export function pedagogicalStem(statement: string) {
  return statement
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/\d+(?:[.,]\d+)?/g, '#')
    .replace(/[^a-z#]+/g, ' ')
    .trim()
}
export function analyzeCatalogQuality(
  questions: QualityQuestion[],
  targets: SubjectTarget[],
) {
  const subjects = new Map<
      string,
      {
        subjectId: string
        name: string
        questionCount: number
        topics: Map<
          string,
          { topicId: string | null; name: string; questionCount: number }
        >
      }
    >(),
    families = new Map<string, string[]>()
  for (const q of questions) {
    let subject = subjects.get(q.subjectId)
    if (!subject) {
      subject = {
        subjectId: q.subjectId,
        name: q.subjectName,
        questionCount: 0,
        topics: new Map(),
      }
      subjects.set(q.subjectId, subject)
    }
    subject.questionCount++
    const key = q.topicId ?? 'missing',
      topic = subject.topics.get(key) ?? {
        topicId: q.topicId,
        name: q.topicName ?? 'Assunto não informado',
        questionCount: 0,
      }
    topic.questionCount++
    subject.topics.set(key, topic)
    const stem = pedagogicalStem(q.statement)
    if (stem.length >= 20) {
      const familyKey = q.subjectId + ':' + stem
      families.set(familyKey, [...(families.get(familyKey) ?? []), q.id])
    }
  }
  const diversity = [...subjects.values()]
    .sort((a, b) => a.subjectId.localeCompare(b.subjectId))
    .map((s) => ({
      ...s,
      topics: [...s.topics.values()].sort((a, b) =>
        (a.topicId ?? '').localeCompare(b.topicId ?? ''),
      ),
    }))
  const repeatedFamilies = [...families.values()].filter(
      (ids) => ids.length > 1,
    ),
    missingTopics = questions.filter((q) => !q.topicId).length
  return {
    diversity,
    repeatedFamilies,
    missingTopics,
    targetsMatch: inspectSubjectTargets(diversity, targets),
    hasExplicitTargets: targets.length > 0,
    alerts: [
      ...(repeatedFamilies.length ? ['numeric-variants'] : []),
      ...(missingTopics ? ['missing-topics'] : []),
      ...(questions.length >= 4 &&
      diversity.some((s) =>
        s.topics.some(
          (t) =>
            t.topicId !== null && t.questionCount / questions.length >= 0.75,
        ),
      )
        ? ['topic-concentration']
        : []),
      ...(!inspectSubjectTargets(diversity, targets)
        ? ['target-mismatch']
        : []),
    ],
    heuristicVersion: 'numeric-stem-v1',
    questionCount: questions.length,
  }
}
export interface CatalogQualityResponse
  extends ReturnType<typeof analyzeCatalogQuality> {
  editRevision: number
  overlaps: Array<{
    modelId: string
    version: number
    title: string
    sharedCount: number
    questionIds: string[]
    currentCoveragePercent: number
  }>
  comparedModels: number
  totalMatches: number
  page: number
  hasMore: boolean
  comparisonScope: string
}
