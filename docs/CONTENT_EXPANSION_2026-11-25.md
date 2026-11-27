# Ampliação do acervo — 25/11/2026

## Escopo autorizado e fontes

O pedido do proprietário nesta conversa foi conferir o projeto e ampliar questões, concursos e simulados com provas/gabaritos da internet e conteúdo autoral. Este lote acrescenta conteúdo rastreável usando o schema e as permissões existentes. Não incorpora as PRs draft #66 (Auth) ou #71 (persistência de modelos), não muda grants/RLS e não executa cutover ou deploy manual.

A frente anterior de frontend foi reconciliada com as alterações atuais de tema e integrada separadamente na #72. Os dados de produção anteriores à ampliação foram consultados: um concurso de treino geral, 60 questões publicadas e 100 rascunhos do release 001.

## Biblioteca de provas oficiais

`content/sources/official-exams.json` seleciona 36 cadernos, não 36 conjuntos necessariamente independentes de objetivos:

- CNU 2, 2025: nove blocos, tipo 1, com gabarito consolidado definitivo retificado em 21/11/2025. Fonte: https://conhecimento.fgv.br/cpnu2
- TRF1 Servidores, 2024: oito cargos, tipo 1, com gabarito definitivo retificado. Fonte: https://conhecimento.fgv.br/concursos/trf1servidor24
- CNU 1, 2024: dois cadernos da manhã e sete da tarde, gabarito 1. Fontes de provas: https://www.gov.br/gestao/pt-br/concursonacional/caderno-de-provas/manha e https://www.gov.br/gestao/pt-br/concursonacional/caderno-de-provas/tarde ; gabaritos finais: https://www.gov.br/gestao/pt-br/concursonacional/gabaritos-finais
- Enem 2021–2025: dois cadernos por ano, aplicação regular, primeiro dia/azul e segundo dia/amarelo. São avaliações educacionais, não concursos públicos. Índice: https://www.gov.br/inep/pt-br/areas-de-atuacao/avaliacao-e-exames-educacionais/enem/provas-e-gabaritos

A verificação fez GET dos 50 arquivos distintos, conferiu assinatura PDF, tamanho máximo de 32 MiB, leitura de páginas e SHA-256. O relatório versionado conserva data, URL e resultado. Foram confirmados 25 arquivos, formando 21 pares completos. Quinze referências não têm ambos os downloads confirmados: 20 arquivos do Inep e cinco cadernos do CNU retornaram 503; uma sondagem adicional identificou falha de conexão upstream. Não assumir indisponibilidade universal nem sucesso desses downloads.

A interface oferece prova/gabarito somente para os pares confirmados; os demais registros levam à página oficial, com indicação de consulta na fonte. O documento consolidado exige localizar o bloco/cargo e tipo corretos. Gabaritos não foram convertidos em correção automática; questões anuladas continuam representadas no PDF oficial.

Somente metadados e links foram versionados. PDFs e textos integrais de questões externas não foram copiados para o repositório nem importados como conteúdo licenciado. `reproductionRights: not-assessed` não é declaração de domínio público. O acesso em PDF não registra tentativas, XP ou desempenho.

## Autorais — matemática 002

100 enunciados novos, quatro alternativas, gabarito e explicação por item. São 20 famílias com cinco variantes cada; não contar variantes como novos objetivos pedagógicos. O lote anterior e as propostas de revisão dos seus distratores permanecem intactos.

Objetivos: mediana, moda, amplitude, desconto inverso, juros compostos, trapézio, triângulo, Pitágoras, circunferência, cilindro, capacidade em litros, escala, duração entre horários, senhas com repetição, cargos distintos, complemento de probabilidade, contagem de múltiplos, lucro, variação absoluta e potências.

O gerador determinístico e o oráculo independente usam procedimentos diferentes onde possível, incluindo enumeração, contagem, estatística, áreas por coordenadas e cálculos racionais. Os 100 gabaritos passaram e cada posição correta aparece 25 vezes. O validador editorial atual aprovou 100 linhas, sem erros. Cada item registra autoria assistida, direitos originais, difficultyReviewed=false e justificativas dos três distratores no arquivo de origem.

A importação usa `install_original_question_release`, existente, administrativa, transacional e idempotente, com hash e commit de origem. Não assume identidade de editor e não marca revisão humana. Todas as questões entram em rascunho, com dificuldade sugerida, fora da prática pública. Os testes confirmam 100 itens, 400 alternativas, 100 gabaritos/explicações e nenhuma duplicação no replay. A revisão humana do checklist continua necessária antes de publicação.

## Concursos históricos

`content/sources/contest-seed.json` define IDs estáveis para CNU 2024, CNU 2025 e TRF1 Servidores 2024, nomeados explicitamente como provas anteriores. São metadados factuais e fontes oficiais, sem inventar cargo, edital, data de inscrição ou vaga. Não se criam editais fictícios só para vincular PDFs. Os detalhes desses slugs recebem atalho para o acervo filtrado; suas questões externas não são anunciadas como disponíveis no modo interativo.

O gerador SQL é somente cliente, não conecta ao banco e não contém DDL. A instalação conserva registros existentes: replay exato não duplica; colisão ou edição anterior causa erro em vez de sobrescrita. O teste de colisão confirmou preservação da mudança editorial local.

## Modelos de simulados

Foram preparados 20 cadernos temáticos em rascunho, um por família, com cinco questões e 30 minutos cada. build_math_models_002.py usa os UUIDs reais retornados pela instalação do release. A composição cobre os 100 itens, sem sobreposição de IDs entre cadernos; as cinco variantes dentro de um caderno repetem seu objetivo pedagógico. O manifesto e a proveniência foram versionados sem declarar publicação ou revisão humana. Não substituem a geração dinâmica, não criam sessões de alunos e não entram no schema de staging da #71. Não equivalem a modelos publicados e não completam a meta de diversidade por todas as matérias.

## Homologação, instalação e reversão

- Local: PostgreSQL 17 descartável com migrations desde o início; instalação e replay do release e dos três metadados; contagens, flags e proteção contra colisão aprovadas. As fixtures são revertidas por ROLLBACK e não vão à produção.
- Produção: somente conteúdo solicitado, em transação com timeout e conferência de contagens, após validação local e commit do payload. Preservar as 60 publicadas e o release 001; nenhuma migration ou mudança de autenticação.
- Reversão de interface: reverter o commit de aplicação. Novos rascunhos não ficam visíveis a estudantes. Para reverter dados, revisar referências e trilha de auditoria; arquivar os três concursos quando permitido pelo ciclo de vida e não apagar conteúdo com histórico. Não executar DROP ou deleção em cascata como rollback automático.
- CI, commit de origem, recibo agregado de instalação e deploy ficam registrados no PR. Validação local de navegador usa API/Auth simulados; não representa jornada autenticada com Supabase hospedado.

## Comandos de conferência

```sh
python3 scripts/content/generate_math_release_002.py --check
python3 scripts/content/check_math_release_002.py
node scripts/validate-question-bank.mjs content/releases/matematica-original-002.jsonl
npm run typecheck
npm test
bash scripts/test-database.sh
```

A verificação de rede é opt-in e não roda no CI: `python3 scripts/content/verify_official_sources.py --output /tmp/novo-relatorio.json` requer pypdf. Ela limita hosts/redirects, tamanho, tempo e concorrência, não instala dados e não altera o manifesto automaticamente. Revalidar links e retificações antes de usar o acervo em novas importações.

## Recibo de instalação observado

Instalação administrativa autorizada pela solicitação de ampliação nesta conversa, após homologação descartável. Payload de origem: commit `4af8f8aa1c49b3dabab4c2f5460b8fbbfe539760`, release SHA-256 `c2250d104930e6406957ea4782976b918ff255956699c876d6e0b03ae4b20560`. A transação do Supabase confirmou 100 itens vinculados, 400 alternativas, 100 gabaritos, 100 explicações, status draft e difficulty_reviewed=false. Contagens agregadas após instalação: 60 publicadas, 200 rascunhos, quatro concursos publicados. Não se usou conta humana, claims forjadas ou nova credencial.

Os modelos estão somente no manifesto editorial: não foram inseridos no schema experimental da #71 nem habilitados para sessões públicas. A validação estrutural e a ausência de sobreposição não equivalem a aprovação pedagógica. Os limites de publicação continuam em content/reviews/REVIEW_CHECKLIST.md.
