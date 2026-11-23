const fgvContestFilesBase = 'https://conhecimento.fgv.br/sites/default/files/concursos/'

interface PastExamDocument {
  title: string
  kind: 'Prova' | 'Gabarito'
  url: string
}

interface PastExamCollection {
  title: string
  year: number
  notes: string
  board: string
  sourcePageUrl: string
  sourcePageLabel: string
  checkedAt: string
  documents: PastExamDocument[]
}

function examVariants(
  code: string,
  position: string,
  jobCode: string,
  period: string,
): PastExamDocument[] {
  return [1, 2, 3, 4].map((version) => ({
    title: `Prova objetiva — ${position} (${period}), tipo ${version}`,
    kind: 'Prova',
    url: `${fgvContestFilesBase}${code}-${jobCode}-tipo-${version}.pdf`,
  }))
}

export const federalPastExamCollections: PastExamCollection[] = [
  {
    title: 'Receita Federal do Brasil',
    year: 2023,
    notes: 'Edital de 2022; provas aplicadas em março de 2023.',
    board: 'FGV',
    sourcePageUrl: 'https://conhecimento.fgv.br/concursos/rfb22',
    sourcePageLabel: 'Página oficial do concurso e arquivos',
    checkedAt: '2026-11-23',
    documents: [
      ...examVariants(
        'cns101',
        'Auditor-Fiscal',
        'auditor-fiscal-da-receita-federal-do-brasil-afrfbcns101',
        'manhã',
      ),
      ...examVariants(
        'cns201',
        'Auditor-Fiscal',
        'auditor-fiscal-da-receita-federal-do-brasil-afrfbcns201',
        'tarde',
      ),
      ...examVariants(
        'cns102',
        'Analista-Tributário',
        'analista-tributario-da-receita-federal-do-brasil-atrfbcns102',
        'manhã',
      ),
      ...examVariants(
        'cns202',
        'Analista-Tributário',
        'analista-tributario-da-receita-federal-do-brasil-atrfbcns202',
        'tarde',
      ),
      {
        title: 'Gabarito oficial definitivo — Auditor-Fiscal',
        kind: 'Gabarito',
        url: `${fgvContestFilesBase}serfb-gabarito-defintivo-auditor-_0.pdf`,
      },
      {
        title: 'Gabarito oficial definitivo — Analista-Tributário',
        kind: 'Gabarito',
        url: `${fgvContestFilesBase}gabarito-definitivo-rfb_analista-_0.pdf`,
      },
    ],
  },
  {
    title: 'Senado Federal — Analista Legislativo (Administração)',
    year: 2022,
    notes: 'Edital nº 1.',
    board: 'FGV',
    sourcePageUrl: 'https://conhecimento.fgv.br/concursos/senado22/1',
    sourcePageLabel: 'Página oficial do edital e arquivos',
    checkedAt: '2026-11-23',
    documents: [
      ...[1, 2, 3, 4].map((version) => ({
        title: `Prova objetiva — Analista Legislativo (Administração), tipo ${version}`,
        kind: 'Prova' as const,
        url: `${fgvContestFilesBase}e1cns01_-_analista_legislativo_-_administracaoe1cns01_tipo_${version}.pdf`,
      })),
      {
        title: 'Gabarito oficial definitivo da prova objetiva — edital nº 1',
        kind: 'Gabarito',
        url: `${fgvContestFilesBase}senado2022_gabarito_definitivo_edital01.pdf`,
      },
    ],
  },
]

export const federalExamArchives = [
  {
    title: 'Arquivo de concursos do Cebraspe',
    url: 'https://www.cebraspe.org.br/concursos',
  },
  {
    title: 'Arquivo de concursos realizados da FGV',
    url: 'https://conhecimento.fgv.br/concursos',
  },
]
