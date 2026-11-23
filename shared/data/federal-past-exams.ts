const fgvContestFilesBase = 'https://conhecimento.fgv.br/sites/default/files/concursos/'
const cebraspeInssFilesBase = 'https://cdn.cebraspe.org.br/concursos/INSS_22/arquivos/'

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

function senateAnalystVariants(
  code: string,
  position: string,
  fileSlug: string,
  versions: number[],
): PastExamDocument[] {
  return versions.map((version) => ({
    title: `Prova objetiva — Analista Legislativo (${position}), tipo ${version}`,
    kind: 'Prova',
    url: `${fgvContestFilesBase}e1cns${code}_-_analista_legislativo_-_${fileSlug}e1cns${code}_tipo_${version}.pdf`,
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
    title: 'Senado Federal — edital nº 1 (Analista Legislativo)',
    year: 2022,
    notes: 'Cadernos de dez especialidades, conforme os arquivos oficiais do edital.',
    board: 'FGV',
    sourcePageUrl: 'https://conhecimento.fgv.br/concursos/senado22/1',
    sourcePageLabel: 'Página oficial do edital e arquivos',
    checkedAt: '2026-11-23',
    documents: [
      ...senateAnalystVariants('01', 'Administração', 'administracao', [1, 2, 3, 4]),
      ...senateAnalystVariants('02', 'Arquivologia', 'arquivologia', [1]),
      ...senateAnalystVariants('03', 'Assistência Social', 'assistencia_social', [1, 2]),
      ...senateAnalystVariants('04', 'Contabilidade', 'contabilidade', [1, 2, 3, 4]),
      ...senateAnalystVariants('05', 'Enfermagem', 'enfermagem', [1, 2, 3, 4]),
      ...senateAnalystVariants(
        '06',
        'Engenharia Eletrônica e Telecomunicações',
        'engenharia_eletronica_e_telecomunicacoes',
        [1],
      ),
      ...senateAnalystVariants('07', 'Engenharia do Trabalho', 'engenharia_do_trabalho', [1]),
      ...senateAnalystVariants('08', 'Processo Legislativo', 'processo_legislativo', [1, 2, 3, 4]),
      ...senateAnalystVariants(
        '09',
        'Informática Legislativa — Análise de Sistemas',
        'informatica_legislativa_analise_de_sistemas',
        [1, 2, 3, 4],
      ),
      ...senateAnalystVariants(
        '10',
        'Informática Legislativa — Análise de Suporte de Sistemas',
        'informatica_legislativa_analise_de_suporte_de_sistemas',
        [1, 2],
      ),
      {
        title: 'Gabarito oficial definitivo da prova objetiva — edital nº 1',
        kind: 'Gabarito',
        url: `${fgvContestFilesBase}senado2022_gabarito_definitivo_edital01.pdf`,
      },
    ],
  },
  {
    title: 'INSS — Técnico do Seguro Social',
    year: 2022,
    notes: 'Provas objetivas e gabaritos definitivos, com cadernos específicos para a GEX Guarulhos.',
    board: 'Cebraspe',
    sourcePageUrl: 'https://www.cebraspe.org.br/concursos/inss_22',
    sourcePageLabel: 'Página oficial do concurso e arquivos',
    checkedAt: '2026-11-23',
    documents: [
      {
        title: 'Prova objetiva — conhecimentos básicos (exceto GEX Guarulhos)',
        kind: 'Prova',
        url: `${cebraspeInssFilesBase}760_INSS_CB1_01.PDF`,
      },
      {
        title: 'Prova objetiva — conhecimentos específicos (exceto GEX Guarulhos)',
        kind: 'Prova',
        url: `${cebraspeInssFilesBase}760_INSS_001_01.PDF`,
      },
      {
        title: 'Prova objetiva — conhecimentos básicos (GEX Guarulhos)',
        kind: 'Prova',
        url: `${cebraspeInssFilesBase}787_INSS_CB1_01.PDF`,
      },
      {
        title: 'Prova objetiva — conhecimentos específicos (GEX Guarulhos)',
        kind: 'Prova',
        url: `${cebraspeInssFilesBase}787_INSS_001_01.PDF`,
      },
      {
        title: 'Gabarito definitivo — conhecimentos básicos (exceto GEX Guarulhos)',
        kind: 'Gabarito',
        url: `${cebraspeInssFilesBase}GAB_DEFINITIVO_760_INSS_CB1_01.PDF`,
      },
      {
        title: 'Gabarito definitivo — conhecimentos específicos (exceto GEX Guarulhos)',
        kind: 'Gabarito',
        url: `${cebraspeInssFilesBase}GAB_DEFINITIVO_760_INSS_001_01.PDF`,
      },
      {
        title: 'Gabarito definitivo — conhecimentos básicos (GEX Guarulhos)',
        kind: 'Gabarito',
        url: `${cebraspeInssFilesBase}GAB_DEFINITIVO_787_INSS_CB1_01.PDF`,
      },
      {
        title: 'Gabarito definitivo — conhecimentos específicos (GEX Guarulhos)',
        kind: 'Gabarito',
        url: `${cebraspeInssFilesBase}GAB_DEFINITIVO_787_INSS_001_01.PDF`,
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
