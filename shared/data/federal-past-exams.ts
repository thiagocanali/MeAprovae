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

interface CebraspeExamPair {
  title: string
  examFilename: string
  answerFilename: string
}

function cebraspeDocuments(eventId: string, documents: CebraspeDocumentInput[]): PastExamDocument[] {
  return documents.map(({ filename, ...document }) => ({
    ...document,
    url: `${cebraspeCdnBase}${eventId}/arquivos/${filename}`,
  }))
}

function cebraspeExamPairs(eventId: string, exams: CebraspeExamPair[]): PastExamDocument[] {
  return cebraspeDocuments(
    eventId,
    exams.flatMap(({ title, examFilename, answerFilename }) => [
      { title: `Prova objetiva — ${title}`, kind: 'Prova', filename: examFilename },
      { title: `Gabarito definitivo — ${title}`, kind: 'Gabarito', filename: answerFilename },
    ]),
  )
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
  {
    title: 'Polícia Federal — Perito Criminal Federal',
    year: 2025,
    notes: 'Provas objetivas e gabaritos definitivos de conhecimentos básicos e específicos para os cargos de Perito Criminal Federal.',
    board: 'Cebraspe',
    sourcePageUrl: 'https://www.cebraspe.org.br/concursos/pf_25',
    sourcePageLabel: 'Página oficial do concurso e arquivos',
    checkedAt: '2026-11-23',
    documents: cebraspeExamPairs('PF_25', [
      { title: 'conhecimentos básicos — todos os cargos de Perito Criminal Federal', examFilename: '106_PF_CB1_01.pdf', answerFilename: '5A49198A6084706823226C79C28FFDBB1129FD5D938C9919AD9C1FC97E54701A.pdf' },
      { title: 'conhecimentos básicos — bloco I — cargos 15, 16 e 17', examFilename: '106_PF_CB2_01.pdf', answerFilename: 'D0F881898A969B6733B878291FC1201E6CFE079281391E04B7EE322628BC888C.pdf' },
      { title: 'conhecimentos básicos — bloco II — cargos 15, 16 e 17', examFilename: '106_PF_CG1_01.pdf', answerFilename: 'A78F5BA07173AF0B8A5E611A1D7AAB166B7BD473E5D7AC2220F0F1B7DDB641E9.pdf' },
      { title: 'conhecimentos específicos — cargo 1', examFilename: '106_PF_001_01.pdf', answerFilename: 'D202E48A0B1EBF5039E398F0B49D0186DD625DFF53498E36EE4D88DE4501E3A8.pdf' },
      { title: 'conhecimentos específicos — cargo 2', examFilename: '106_PF_002_01.pdf', answerFilename: 'B918D6A805194D299F15922339CA17D2C3921BF015DFD2B258EEFFE487A53F22.pdf' },
      { title: 'conhecimentos específicos — cargo 3', examFilename: '106_PF_003_01.pdf', answerFilename: '2957F96327337126177C0FC57B9996A02B966EAE7A1419F7CEE9D4C686F77B6E.pdf' },
      { title: 'conhecimentos específicos — cargo 4', examFilename: '106_PF_004_01.pdf', answerFilename: 'C3612023C0E2243979FBA27DE2DD60A80FA5FCD9054B4D9664D9E51356E599EE.pdf' },
      { title: 'conhecimentos específicos — cargo 5', examFilename: '106_PF_005_01.pdf', answerFilename: '9E550CE72E70B14514C5A47A7A0F3CD30B56607FF45010612931D046BBA96D23.pdf' },
      { title: 'conhecimentos específicos — cargo 6', examFilename: '106_PF_006_01.pdf', answerFilename: '69579E7D6152E8A1DDCEFA1B6C4A6DCBDAAB69B934E5C17D04FC88BA150BED2B.pdf' },
      { title: 'conhecimentos específicos — cargo 7', examFilename: '106_PF_007_01.pdf', answerFilename: '69E40522AFDEB12F65A8F018C256D678CAF9787CB383C19E8AD49838B87DDE32.pdf' },
      { title: 'conhecimentos específicos — cargo 8', examFilename: '106_PF_008_01.pdf', answerFilename: 'A4317E37ECE8E8AA749DB4D62EEEE09EE11BBEFE4CAD3F6DCA02B0B5B85050EB.pdf' },
      { title: 'conhecimentos específicos — cargo 9', examFilename: '106_PF_009_01.pdf', answerFilename: 'DAC7F9CA42277AEBFF4D7B97F7A953DBAEE67FAF37C5FBD06493B01E7E4148B4.pdf' },
      { title: 'conhecimentos específicos — cargo 10', examFilename: '106_PF_010_01.pdf', answerFilename: 'A20B3AA111033AF8554D1FD0FAC6456DB5C0B7B9D86783FB9896D4603D5C2524.pdf' },
      { title: 'conhecimentos específicos — cargo 11', examFilename: '106_PF_011_01.pdf', answerFilename: '8C568F1F09BC80CF9149D2DFC247EC5784C5E01825928048D37A80F3F7A60D77.pdf' },
      { title: 'conhecimentos específicos — cargo 12', examFilename: '106_PF_012_01.pdf', answerFilename: '643F5923E964CA1EFCA681AAED5B653BA0136E288E0BF3E23DB9F3F053D1F77E.pdf' },
      { title: 'conhecimentos específicos — cargo 13', examFilename: '106_PF_013_01.pdf', answerFilename: '2B1B28107AE0168F6AF795DF71CF83536A1AD39CBC1B405DA6BF3D261A1867CF.pdf' },
      { title: 'conhecimentos específicos — cargo 14', examFilename: '106_PF_014_01.pdf', answerFilename: '281353E4B98F8BC1C8109000C6D0BC06D2C00D30E8523F484883219764A65855.pdf' },
      { title: 'conhecimentos específicos — cargo 15', examFilename: '106_PF_015_01.pdf', answerFilename: '570C8865F7DDA1651ED10E330A6297A95466A2393EEEC633290FE754912D6143.pdf' },
      { title: 'conhecimentos específicos — cargo 16', examFilename: '106_PF_016_01.pdf', answerFilename: 'CDC24D454696C9FE260E6C50FE758707F322649AEE24B6FB664FDDA10E307BCF.pdf' },
      { title: 'conhecimentos específicos — cargo 17', examFilename: '106_PF_017_01.pdf', answerFilename: '448F54940D877880045A494008870FC0B25C57C9D7233ECD0CDC29B942A683AD.pdf' },
    ]),
  },
  {
    title: 'Polícia Federal — área administrativa',
    year: 2025,
    notes: 'Provas objetivas e gabaritos definitivos para os cargos administrativos 1 a 15.',
    board: 'Cebraspe',
    sourcePageUrl: 'https://www.cebraspe.org.br/concursos/pf_25_adm',
    sourcePageLabel: 'Página oficial do concurso e arquivos',
    checkedAt: '2026-11-23',
    documents: cebraspeExamPairs('PF_25_ADM', [
      { title: 'conhecimentos básicos — cargos 1 a 14', examFilename: '094_PF_CB1_01.pdf', answerFilename: 'Gab_Definitivo_094_PF_CB1_01.pdf' },
      { title: 'conhecimentos básicos — cargo 15', examFilename: '094_PF_CB2_01.pdf', answerFilename: 'Gab_Definitivo_094_PF_CB2_01.pdf' },
      { title: 'conhecimentos específicos — cargo 1', examFilename: '094_PF_001_01.pdf', answerFilename: 'Gab_Definitivo_094_PF_001_01.pdf' },
      { title: 'conhecimentos específicos — cargo 2', examFilename: '094_PF_002_01.pdf', answerFilename: 'Gab_Definitivo_094_PF_002_01.pdf' },
      { title: 'conhecimentos específicos — cargo 3', examFilename: '094_PF_003_01.pdf', answerFilename: 'Gab_Definitivo_094_PF_003_01.pdf' },
      { title: 'conhecimentos específicos — cargo 4', examFilename: '094_PF_004_01.pdf', answerFilename: 'Gab_Definitivo_094_PF_004_01.pdf' },
      { title: 'conhecimentos específicos — cargo 5', examFilename: '094_PF_005_01.pdf', answerFilename: 'Gab_Definitivo_094_PF_005_01.pdf' },
      { title: 'conhecimentos específicos — cargo 6', examFilename: '094_PF_006_01.pdf', answerFilename: 'Gab_Definitivo_094_PF_006_01.pdf' },
      { title: 'conhecimentos específicos — cargo 7', examFilename: '094_PF_007_01.pdf', answerFilename: 'Gab_Definitivo_094_PF_007_01.pdf' },
      { title: 'conhecimentos específicos — cargo 8', examFilename: '094_PF_008_01.pdf', answerFilename: 'Gab_Definitivo_094_PF_008_01.pdf' },
      { title: 'conhecimentos específicos — cargo 9', examFilename: '094_PF_009_01.pdf', answerFilename: 'Gab_Definitivo_094_PF_009_01.pdf' },
      { title: 'conhecimentos específicos — cargo 10', examFilename: '094_PF_010_01.pdf', answerFilename: 'Gab_Definitivo_094_PF_010_01.pdf' },
      { title: 'conhecimentos específicos — cargo 11', examFilename: '094_PF_011_01.pdf', answerFilename: 'Gab_Definitivo_094_PF_011_01.pdf' },
      { title: 'conhecimentos específicos — cargo 12', examFilename: '094_PF_012_01.pdf', answerFilename: 'Gab_Definitivo_094_PF_012_01.pdf' },
      { title: 'conhecimentos específicos — cargo 13', examFilename: '094_PF_013_01.pdf', answerFilename: 'Gab_Definitivo_094_PF_013_01.pdf' },
      { title: 'conhecimentos específicos — cargo 14', examFilename: '094_PF_014_01.pdf', answerFilename: 'Gab_Definitivo_094_PF_014_01.pdf' },
      { title: 'conhecimentos específicos — cargo 15', examFilename: '094_PF_015_01.pdf', answerFilename: 'Gab_Definitivo_094_PF_015_01.pdf' },
    ]),
  },
  {
    title: 'Tribunal de Contas da União — Técnico Federal de Controle Externo',
    year: 2025,
    notes: 'Provas objetivas de conhecimentos básicos e específicos, com gabaritos definitivos.',
    board: 'Cebraspe',
    sourcePageUrl: 'https://www.cebraspe.org.br/concursos/tcu_25_tefc',
    sourcePageLabel: 'Página oficial do concurso e arquivos',
    checkedAt: '2026-11-23',
    documents: cebraspeExamPairs('TCU_25_TEFC', [
      { title: 'conhecimentos básicos', examFilename: '108_TCUTEFC_CB1_01.pdf', answerFilename: '03531F6DDD1179877F8BB0D4D4BCA28516CFFFFBC414219B25C23B6CB12E2102.pdf' },
      { title: 'conhecimentos específicos', examFilename: '108_TCUTEFC_001_01.pdf', answerFilename: 'E53AB5C65454510E881F7667E620F44B6DDD1C083D5175412CF8725A3C9B9C9F.pdf' },
    ]),
  },
  {
    title: 'Agência Nacional de Transportes Terrestres — Especialista em Regulação',
    year: 2023,
    notes: 'Prova comum de conhecimentos básicos e cadernos específicos dos cargos 1 a 4, com gabaritos definitivos.',
    board: 'Cebraspe',
    sourcePageUrl: 'https://www.cebraspe.org.br/concursos/antt_23',
    sourcePageLabel: 'Página oficial do concurso e arquivos',
    checkedAt: '2026-11-23',
    documents: cebraspeExamPairs('ANTT_23', [
      { title: 'conhecimentos básicos — todos os cargos', examFilename: '951_ANTT_CB1_01.PDF', answerFilename: 'GAB_DEFINITIVO_951_ANTT_CB1_01.PDF' },
      { title: 'conhecimentos específicos — cargo 1', examFilename: '951_ANTT_001_01.PDF', answerFilename: 'GAB_DEFINITIVO_951_ANTT_001_01.PDF' },
      { title: 'conhecimentos específicos — cargo 2', examFilename: '951_ANTT_002_01.PDF', answerFilename: 'GAB_DEFINITIVO_951_ANTT_002_01.PDF' },
      { title: 'conhecimentos específicos — cargo 3', examFilename: '951_ANTT_003_01.PDF', answerFilename: 'GAB_DEFINITIVO_951_ANTT_003_01.PDF' },
      { title: 'conhecimentos específicos — cargo 4', examFilename: '951_ANTT_004_01.PDF', answerFilename: 'GAB_DEFINITIVO_951_ANTT_004_01.PDF' },
    ]),
  },
  {
    title: 'Ministério do Meio Ambiente e Mudança do Clima — Analista Ambiental',
    year: 2023,
    notes: 'Provas objetivas de conhecimentos básicos e específicos, com gabaritos definitivos.',
    board: 'Cebraspe',
    sourcePageUrl: 'https://www.cebraspe.org.br/concursos/mma_23',
    sourcePageLabel: 'Página oficial do concurso e arquivos',
    checkedAt: '2026-11-23',
    documents: cebraspeExamPairs('MMA_23', [
      { title: 'conhecimentos básicos — prova P1', examFilename: '929_MMA_CB1_01.PDF', answerFilename: 'GAB_DEFINITIVO_929_MMA_CB1_01.PDF' },
      { title: 'conhecimentos específicos — prova P2', examFilename: '929_MMA_001_01.PDF', answerFilename: 'GAB_DEFINITIVO_929_MMA_001_01.PDF' },
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
