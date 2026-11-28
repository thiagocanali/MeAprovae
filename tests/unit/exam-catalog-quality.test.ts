import { describe, expect, it } from 'vitest'
import {
  analyzeCatalogQuality,
  parseSubjectDistribution,
  pedagogicalStem,
  inspectSubjectTargets,
  type QualityQuestion,
} from '../../shared/domain/questions/exam-catalog-quality'
import { parseCatalogSave } from '../../shared/domain/questions/exam-catalog-editorial'
const id = (n: number) =>
  `ee710000-0000-4000-8000-${String(n).padStart(12, '0')}`
const question = (n: number): QualityQuestion => ({
  id: id(n),
  statement: `Calcule o desconto de ${n}% no valor de 500 reais.`,
  subjectId: id(20),
  subjectName: 'Matemática',
  topicId: id(30),
  topicName: 'Porcentagem',
})
describe('catalog quality and explicit subject targets', () => {
  it('accepts normalized distinct targets without accepting duplicate subjects or invented fields', () => {
    expect(
      parseSubjectDistribution([
        { subjectId: id(20).toUpperCase(), questionCount: 2 },
      ]),
    ).toEqual([{ subjectId: id(20), questionCount: 2 }])
    expect(
      parseSubjectDistribution([
        { subjectId: id(20), questionCount: 1 },
        { subjectId: id(20), questionCount: 1 },
      ]),
    ).toBeNull()
    expect(
      parseSubjectDistribution([
        { subjectId: id(20), questionCount: 1, actor: 'forged' },
      ]),
    ).toBeNull()
    expect(
      parseSubjectDistribution([{ subjectId: id(20), questionCount: 1.5 }]),
    ).toBeNull()
  })
  it('preserves old save contracts and retains new targets only when explicitly provided', () => {
    const fields = {
      title: 'Modelo de teste',
      description: 'Descrição do modelo.',
      kind: 'multidisciplinary',
      questionCount: 2,
      questionIds: [id(101), id(103)],
      expectedRevision: 1,
    }
    expect(parseCatalogSave(fields)).not.toHaveProperty('subjectDistribution')
    expect(
      parseCatalogSave({
        ...fields,
        subjectDistribution: [{ subjectId: id(20), questionCount: 1 }],
      }),
    ).toHaveProperty('subjectDistribution')
    expect(
      parseCatalogSave({ ...fields, subjectDistribution: 'invalid' }),
    ).toBeNull()
  })
  it('detects missing and extra subjects, not just matching totals', () => {
    const actual = [{ subjectId: id(20), questionCount: 2 }]
    expect(inspectSubjectTargets(actual, [])).toBe(true)
    expect(
      inspectSubjectTargets(actual, [{ subjectId: id(21), questionCount: 2 }]),
    ).toBe(false)
    expect(
      inspectSubjectTargets(actual, [
        ...actual,
        { subjectId: id(21), questionCount: 1 },
      ]),
    ).toBe(false)
  })
  it('groups numeric variants without treating unrelated subjects as the same family', () => {
    expect(pedagogicalStem('Cálculo: 10,5% de 200.')).toBe(
      pedagogicalStem('calculo: 32.9% de 400.'),
    )
    expect(
      analyzeCatalogQuality([question(1), question(2)], []).repeatedFamilies,
    ).toEqual([[id(1), id(2)]])
    expect(
      analyzeCatalogQuality(
        [question(1), { ...question(2), subjectId: id(21) }],
        [],
      ).repeatedFamilies,
    ).toEqual([])
  })
  it('reports topic concentration and unknown topics without inventing coverage', () => {
    const result = analyzeCatalogQuality(
      [
        question(1),
        question(2),
        question(3),
        { ...question(4), topicId: null, topicName: null },
      ],
      [],
    )
    expect(result.missingTopics).toBe(1)
    expect(result.alerts).toContain('topic-concentration')
    expect(result.diversity[0]?.topics).toContainEqual({
      topicId: null,
      name: 'Assunto não informado',
      questionCount: 1,
    })
  })
  it('does not mislabel unknown topics as known concentration', () => {
    expect(
      analyzeCatalogQuality(
        [1, 2, 3, 4].map((n) => ({
          ...question(n),
          topicId: null,
          topicName: null,
        })),
        [],
      ).alerts,
    ).not.toContain('topic-concentration')
  })
  it('keeps empty compositions finite and declares the heuristic limits', () => {
    const result = analyzeCatalogQuality([], [])
    expect(result.questionCount).toBe(0)
    expect(result.alerts).toEqual([])
    expect(result.heuristicVersion).toBe('numeric-stem-v1')
  })
  it('flags mismatched saved targets and honors exact multidiscipline targets', () => {
    const qs = [
      question(1),
      { ...question(2), subjectId: id(21), subjectName: 'Português' },
    ]
    expect(
      analyzeCatalogQuality(qs, [{ subjectId: id(20), questionCount: 2 }])
        .alerts,
    ).toContain('target-mismatch')
    expect(
      analyzeCatalogQuality(qs, [
        { subjectId: id(20), questionCount: 1 },
        { subjectId: id(21), questionCount: 1 },
      ]).targetsMatch,
    ).toBe(true)
  })
})
