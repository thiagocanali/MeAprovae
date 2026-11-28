# Famílias, estimativas e procedência — Fase 11, 28/11/2026

Complemento da PR #71, sempre **draft**, após os commits `9b55e70` e `24f8705`. Nenhuma alteração de Auth, sessão privada, produção, publicação ou #66.

## Lote de seis tarefas

1. Reutilizar a proveniência existente: `question_content_release_items` liga questão/externalId ao lote, e `question_content_releases.manifest.checks` declara a família. Não criar tabela ou taxonomia paralela nem inferir família do título do simulado.
2. Mostrar cobertura conhecida/desconhecida e grupos de famílias declaradas, com nome do lote e SHA-256 de origem. Classificação de origem não prova qualidade pedagógica, direitos ou revisão humana.
3. Comparar famílias entre as últimas versões dos outros modelos, inclusive quando nenhum UUID coincide. Mesma paginação para as duas listas, contagens separadas e ordenação estável. A porcentagem de famílias cobre as questões da composição atual que têm ao menos uma família correspondente no outro modelo; não é similaridade semântica.
4. Alertar sobre composições quase idênticas por IDs: pelo menos 80% das questões de **ambos** os modelos coincidem. Não usar só a porcentagem do menor modelo, que classificaria subconjuntos como idênticos. Aviso consultivo, sem bloquear reutilização legítima.
5. Distinguir na interface IDs comprovadamente iguais, famílias declaradas e variantes numéricas estimadas. Objetivos de aprendizagem não são inferidos: o schema atual não fornece evidência suficiente para essa comparação. Alertas não aprovam nem publicam conteúdo.
6. Testar diferenças entre IDs/famílias, fonte ambígua/editada, paginação, privacidade, histórico e integração real. Atualizar contrato de publicação e reconciliar documentação histórica com os 20 modelos locais ainda em draft.

## Confiança e limites

Somente um `externalId` com exatamente uma classificação válida no manifesto é aproveitado. O manifesto precisa identificar o lote e seu hash armazenado. Família é delimitada pelo lote e pela matéria: nomes iguais em lotes diferentes não são unidos automaticamente. Isso evita supor equivalência entre taxonomias sem mapeamento revisado.

Qualquer UPDATE/DELETE auditado da questão, alternativas, gabarito ou explicação torna a classificação atual desconhecida. O comportamento é conservador: uma correção legítima também pode exigir reclassificação. Ausência de família não prova diversidade. O mecanismo reaproveita a auditoria conhecida e não certifica intervenções de administradores com poder de alterar DDL/auditoria ou importações fora desse fluxo. Manifestos são declarações de procedência, não assinaturas humanas ou laudos jurídicos.

O agrupamento textual `numeric-stem-v1` continua separado. Ele normaliza caixa, acentos, números e pontuação em enunciados longos da mesma matéria; pode produzir falsos positivos/negativos. Duas questões podem ter o mesmo formato textual e famílias declaradas diferentes, ou a mesma família declarada e textos distintos. A interface e os testes cobrem ambos os casos.

A análise é uma leitura editorial atual, não um novo parecer persistido. Não modifica versões, metas, ledger ou snapshots históricos. Direitos continuam não verificados nas fixtures; os ensaios nunca equivalem a revisão humana do acervo. [Publicação futura](EXAM_CATALOG_PUBLICATION_CONTRACT.md) mantém gates próprios.

## Validação

Executar `pnpm typecheck`, `pnpm test`, `NITRO_PRESET=vercel pnpm build`, `node tests/integration/catalog/run.mjs` e Chromium. O runner inclui `bash scripts/test-database.sh`, com as novas regressões de famílias e as anteriores. Fixtures adicionais são exclusivamente sintéticas, com manifesto identificado como teste e sem aprovação humana.

Resultado local: **276 testes/32 arquivos**, typecheck, build Vercel, suíte SQL completa e fluxo integrado com PostgREST/Chromium aprovados. Famílias sem IDs comuns, quase duplicação, origem ambígua/editada, paginação, RLS e preservação histórica conferidas. Capturas claro/escuro em 320/1440 px sem overflow/pageerrors, artefatos em `/workspace/work/catalog-phase11-2026-11-28`.

Advisors CLI foi tentado apenas no PostgreSQL descartável; a verificação não concluiu por exigência de TLS indisponível nesse servidor bruto. Não equivale a aprovação do scanner. Requer execução em Supabase completo de homologação autorizado, preservando o bloqueio de schema/RLS.

A CI #455 aprovou o lote anterior nos jobs validate, database e catalog-integration. Resultados deste complemento e o HEAD exato são registrados no PROGRESS e na mesma PR. Não usar a CI anterior como aprovação de código novo.

## Próximo checkpoint

Homologação humana controlada, avaliação dos alertas com editores reais, mapeamento revisado entre taxonomias/objetivos e medição em catálogo com volume representativo. Antes disso, nenhuma alegação de diversidade pedagógica comprovada ou liberação ao estudante. Schema/RLS e retenção precisam de aprovação específica; #66 continua bloqueada pela homologação de autenticação.
