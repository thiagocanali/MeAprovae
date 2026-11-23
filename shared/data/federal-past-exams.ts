const fgvContestFilesBase = 'https://conhecimento.fgv.br/sites/default/files/concursos/'
const cebraspeCdnBase = 'https://cdn.cebraspe.org.br/concursos/'

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

interface CebraspeDocumentInput extends Omit<PastExamDocument, 'url'> {
  filename: string
}

function cebraspeDocuments(eventId: string, documents: CebraspeDocumentInput[]): PastExamDocument[] {
  return documents.map(({ filename, ...document }) => ({
    ...document,
    url: `${cebraspeCdnBase}${eventId}/arquivos/${filename}`,
  }))
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
    documents: cebraspeDocuments('INSS_22', [
      {
        title: 'Prova objetiva — conhecimentos básicos (exceto GEX Guarulhos)',
        kind: 'Prova',
        filename: '760_INSS_CB1_01.PDF',
      },
      {
        title: 'Prova objetiva — conhecimentos específicos (exceto GEX Guarulhos)',
        kind: 'Prova',
        filename: '760_INSS_001_01.PDF',
      },
      {
        title: 'Prova objetiva — conhecimentos básicos (GEX Guarulhos)',
        kind: 'Prova',
        filename: '787_INSS_CB1_01.PDF',
      },
      {
        title: 'Prova objetiva — conhecimentos específicos (GEX Guarulhos)',
        kind: 'Prova',
        filename: '787_INSS_001_01.PDF',
      },
      {
        title: 'Gabarito definitivo — conhecimentos básicos (exceto GEX Guarulhos)',
        kind: 'Gabarito',
        filename: 'GAB_DEFINITIVO_760_INSS_CB1_01.PDF',
      },
      {
        title: 'Gabarito definitivo — conhecimentos específicos (exceto GEX Guarulhos)',
        kind: 'Gabarito',
        filename: 'GAB_DEFINITIVO_760_INSS_001_01.PDF',
      },
      {
        title: 'Gabarito definitivo — conhecimentos básicos (GEX Guarulhos)',
        kind: 'Gabarito',
        filename: 'GAB_DEFINITIVO_787_INSS_CB1_01.PDF',
      },
      {
        title: 'Gabarito definitivo — conhecimentos específicos (GEX Guarulhos)',
        kind: 'Gabarito',
        filename: 'GAB_DEFINITIVO_787_INSS_001_01.PDF',
      },
    ]),
  },
  {
    title: 'IBAMA',
    year: 2025,
    notes: 'Provas objetivas e gabaritos definitivos para os cargos 1, 2 e 3.',
    board: 'Cebraspe',
    sourcePageUrl: 'https://www.cebraspe.org.br/concursos/ibama_25',
    sourcePageLabel: 'Página oficial do concurso e arquivos',
    checkedAt: '2026-11-23',
    documents: cebraspeDocuments('IBAMA_25', [
      { title: 'Prova objetiva — conhecimentos básicos — cargo 1', kind: 'Prova', filename: '057_IBAMA_CB1_01.pdf' },
      { title: 'Prova objetiva — conhecimentos básicos — cargos 2 e 3', kind: 'Prova', filename: '057_IBAMA_CB2_01.pdf' },
      { title: 'Prova objetiva — conhecimentos específicos — cargo 1', kind: 'Prova', filename: '057_IBAMA_001_01.pdf' },
      { title: 'Prova objetiva — conhecimentos específicos — cargo 2', kind: 'Prova', filename: '057_IBAMA_002_01.pdf' },
      { title: 'Prova objetiva — conhecimentos específicos — cargo 3', kind: 'Prova', filename: '057_IBAMA_003_01.pdf' },
      { title: 'Gabarito definitivo — conhecimentos básicos — cargo 1', kind: 'Gabarito', filename: 'Gab_Definitivo_057_IBAMA_CB1_01.PDF' },
      { title: 'Gabarito definitivo — conhecimentos básicos — cargos 2 e 3', kind: 'Gabarito', filename: 'Gab_Definitivo_057_IBAMA_CB2_01.PDF' },
      { title: 'Gabarito definitivo — conhecimentos específicos — cargo 1', kind: 'Gabarito', filename: 'Gab_Definitivo_057_IBAMA_001_01.PDF' },
      { title: 'Gabarito definitivo — conhecimentos específicos — cargo 2', kind: 'Gabarito', filename: 'Gab_Definitivo_057_IBAMA_002_01.PDF' },
      { title: 'Gabarito definitivo — conhecimentos específicos — cargo 3', kind: 'Gabarito', filename: 'Gab_Definitivo_057_IBAMA_003_01.PDF' },
    ]),
  },
  {
    title: 'IBAMA',
    year: 2021,
    notes: 'Provas objetivas e gabaritos definitivos para cargos de nível superior e médio.',
    board: 'Cebraspe',
    sourcePageUrl: 'https://www.cebraspe.org.br/concursos/ibama_21',
    sourcePageLabel: 'Página oficial do concurso e arquivos',
    checkedAt: '2026-11-23',
    documents: cebraspeDocuments('IBAMA_21', [
      { title: 'Prova objetiva — conhecimentos básicos — nível superior', kind: 'Prova', filename: '651_IBAMA_CB1_01.PDF' },
      { title: 'Prova objetiva — conhecimentos básicos — nível médio', kind: 'Prova', filename: '651_IBAMA_CB2_01.PDF' },
      { title: 'Prova objetiva — conhecimentos específicos — cargo 1', kind: 'Prova', filename: '651_IBAMA_001_01.PDF' },
      { title: 'Prova objetiva — conhecimentos específicos — cargo 2', kind: 'Prova', filename: '651_IBAMA_002_01.PDF' },
      { title: 'Prova objetiva — conhecimentos específicos — cargo 3', kind: 'Prova', filename: '651_IBAMA_003_01.PDF' },
      { title: 'Prova objetiva — conhecimentos específicos — cargo 4', kind: 'Prova', filename: '651_IBAMA_004_01.PDF' },
      { title: 'Prova objetiva — conhecimentos específicos — cargo 5', kind: 'Prova', filename: '651_IBAMA_005_01.PDF' },
      { title: 'Gabarito definitivo — conhecimentos básicos — nível superior', kind: 'Gabarito', filename: 'GAB_DEFINITIVO_651_IBAMA_CB1_01.PDF' },
      { title: 'Gabarito definitivo — conhecimentos básicos — nível médio', kind: 'Gabarito', filename: 'GAB_DEFINITIVO_651_IBAMA_CB2_01.PDF' },
      { title: 'Gabarito definitivo — conhecimentos específicos — cargo 1', kind: 'Gabarito', filename: 'GAB_DEFINITIVO_651_IBAMA_001_01.PDF' },
      { title: 'Gabarito definitivo — conhecimentos específicos — cargo 2', kind: 'Gabarito', filename: 'GAB_DEFINITIVO_651_IBAMA_002_01.PDF' },
      { title: 'Gabarito definitivo — conhecimentos específicos — cargo 3', kind: 'Gabarito', filename: 'GAB_DEFINITIVO_651_IBAMA_003_01.PDF' },
      { title: 'Gabarito definitivo — conhecimentos específicos — cargo 4', kind: 'Gabarito', filename: 'GAB_DEFINITIVO_651_IBAMA_004_01.PDF' },
      { title: 'Gabarito definitivo — conhecimentos específicos — cargo 5', kind: 'Gabarito', filename: 'GAB_DEFINITIVO_651_IBAMA_005_01.PDF' },
    ]),
  },
  {
    title: 'ANATEL',
    year: 2024,
    notes: 'Prova comum de conhecimentos básicos e provas de conhecimentos específicos com gabaritos definitivos por cargo; consulte o edital para identificar a especialidade.',
    board: 'Cebraspe',
    sourcePageUrl: 'https://www.cebraspe.org.br/concursos/anatel_24',
    sourcePageLabel: 'Página oficial do concurso e arquivos',
    checkedAt: '2026-11-23',
    documents: cebraspeDocuments('ANATEL_24', [
      { title: 'Prova objetiva — conhecimentos básicos — todos os cargos', kind: 'Prova', filename: '961_ANATEL_CB1_01.PDF' },
      { title: 'Prova objetiva — conhecimentos específicos — cargo 1', kind: 'Prova', filename: '961_ANATEL_001_01.PDF' },
      { title: 'Prova objetiva — conhecimentos específicos — cargo 2', kind: 'Prova', filename: '961_ANATEL_002_01.PDF' },
      { title: 'Prova objetiva — conhecimentos específicos — cargo 3', kind: 'Prova', filename: '961_ANATEL_003_01.PDF' },
      { title: 'Prova objetiva — conhecimentos específicos — cargo 4', kind: 'Prova', filename: '961_ANATEL_004_01.PDF' },
      { title: 'Prova objetiva — conhecimentos específicos — cargo 5', kind: 'Prova', filename: '961_ANATEL_005_01.PDF' },
      { title: 'Prova objetiva — conhecimentos específicos — cargo 6', kind: 'Prova', filename: '961_ANATEL_006_01.PDF' },
      { title: 'Gabarito definitivo — conhecimentos básicos — todos os cargos', kind: 'Gabarito', filename: 'GAB_DEFINITIVO_961_ANATEL_CB1_01.PDF' },
      { title: 'Gabarito definitivo — conhecimentos específicos — cargo 1', kind: 'Gabarito', filename: 'GAB_DEFINITIVO_961_ANATEL_001_01.PDF' },
      { title: 'Gabarito definitivo — conhecimentos específicos — cargo 2', kind: 'Gabarito', filename: 'GAB_DEFINITIVO_961_ANATEL_002_01.PDF' },
      { title: 'Gabarito definitivo — conhecimentos específicos — cargo 3', kind: 'Gabarito', filename: 'GAB_DEFINITIVO_961_ANATEL_003_01.PDF' },
      { title: 'Gabarito definitivo — conhecimentos específicos — cargo 4', kind: 'Gabarito', filename: 'GAB_DEFINITIVO_961_ANATEL_004_01.PDF' },
      { title: 'Gabarito definitivo — conhecimentos específicos — cargo 5', kind: 'Gabarito', filename: 'GAB_DEFINITIVO_961_ANATEL_005_01.PDF' },
      { title: 'Gabarito definitivo — conhecimentos específicos — cargo 6', kind: 'Gabarito', filename: 'GAB_DEFINITIVO_961_ANATEL_006_01.PDF' },
    ]),
  },
  {
    title: 'Polícia Rodoviária Federal — Policial Rodoviário Federal',
    year: 2021,
    notes: 'Prova objetiva comum e cadernos de língua inglesa ou espanhola, com gabaritos definitivos correspondentes.',
    board: 'Cebraspe',
    sourcePageUrl: 'https://www.cebraspe.org.br/concursos/prf_21',
    sourcePageLabel: 'Página oficial do concurso e arquivos',
    checkedAt: '2026-11-23',
    documents: cebraspeDocuments('PRF_21', [
      { title: 'Prova objetiva — itens 9 a 120', kind: 'Prova', filename: '578_PRF_001_01.PDF' },
      { title: 'Prova objetiva — itens 1 a 8 — Língua Inglesa', kind: 'Prova', filename: '578_PRF_ING_01.PDF' },
      { title: 'Prova objetiva — itens 1 a 8 — Língua Espanhola', kind: 'Prova', filename: '578_PRF_ESP_02.PDF' },
      { title: 'Gabarito definitivo — itens 9 a 120', kind: 'Gabarito', filename: 'GAB_DEFINITIVO_578_PRF_001_01.PDF' },
      { title: 'Gabarito definitivo — itens 1 a 8 — Língua Inglesa', kind: 'Gabarito', filename: 'GAB_DEFINITIVO_578_PRF_ING_01.PDF' },
      { title: 'Gabarito definitivo — itens 1 a 8 — Língua Espanhola', kind: 'Gabarito', filename: 'GAB_DEFINITIVO_578_PRF_ESP_02.PDF' },
    ]),
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
