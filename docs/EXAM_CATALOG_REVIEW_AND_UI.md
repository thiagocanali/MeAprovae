# Pareceres rastreáveis e interface editorial — 27/11/2026

## Estado e limite

Lotes C2/D na branch `feat/exam-catalog-postgres-staging`, PR #71 **draft**. Base inicial conferida `eaff534`, main `887c8d5`. A #75 não foi refeita. A #66 não foi integrada nem alterada neste recorte. Nenhuma migration, conta, permissão ou conteúdo produtivo foi modificado; publicação permanece indisponível.

O software registra uma **declaração atribuída à conta autenticada**, não demonstra que o usuário é biologicamente humano nem certifica legalmente direitos autorais. Os testes usam identidades, direitos e declarações exclusivamente sintéticos. Não representam revisão humana real de qualquer questão do acervo.

## Lote C2 — 8 tarefas

1. Ledger append-only `exam_catalog_reviews`, RLS de leitura editorial e ausência de writes diretos. UPDATE/DELETE/TRUNCATE bloqueados; referências impedem remover versões/revisores com evidência. Administradores com controle de DDL continuam fora dessa garantia operacional.
2. Identidade/role do revisor obtidos no banco por auth.uid e atribuição editorial atual. Campos de ator, data, publicação e snapshot enviados pelo cliente são rejeitados.
3. Independência em relação ao criador da versão e aos editores identificados na auditoria da composição e de suas questões. Um owner também não pode aprovar seu próprio conteúdo. Versões administrativas sem autoria identificada precisam de uma nova versão autenticada antes de um parecer independente.
4. Snapshot integral dos metadados, enunciados, alternativas, gabaritos, explicações e referências consultadas. SHA-256 do JSONB canônico vincula o parecer ao conteúdo; constraint confere hash e identidade/revisão do snapshot armazenado. Mudanças na fonte tornam a declaração desatualizada enquanto o conteúdo divergir.
5. Direitos declarados por questão, cobertura exata sem duplicações, justificativa de 20–1200 caracteres, URL HTTP(S) sem credenciais para licença/domínio público. Evidência não é automaticamente validada na internet. Nenhuma licença é inferida do simples fato de existir uma URL.
6. Declarações explícitas e versionadas (`catalog-human-review-v1`): conferência de conteúdo, alternativas/gabaritos, explicações, direitos e revisão pessoal independente. Aprovar exige todas, fontes válidas e campos de resposta/explicação completos. Solicitar ajustes pode deixar direitos explicitamente não verificados. Nenhuma declaração é pré-marcada.
7. Locks no modelo/versão, atribuição do revisor e fontes, fingerprint esperado e revisão esperada. Mesmo requestId/payload/revisor retorna replay sem nova evidência; colisão divergente retorna conflito. Edições posteriores não reescrevem o snapshot. Revisão antiga, reabertura de rascunho, revogação de papel ou perda de independência não produzem um parecer atual. Clonagem não herda pareceres.
8. Contratos HTTP, erros públicos, limites de corpo, testes de autorização/imutabilidade/replay/cobertura/conteúdo alterado e concorrência real em PostgreSQL 17 descartável. Um editor de questões espera o lock de uma revisão; depois de editar, o parecer anterior deixa de corresponder à fonte.

A migration `20261127110715_exam_catalog_review_evidence.sql` foi criada pelo CLI Supabase e exercitada apenas localmente/CI. Helpers de leitura não são RPCs de navegador. Wrappers públicos invoker delegam a funções privadas definer com search_path vazio e checagens próprias; chamá-las diretamente como estudante não contorna autorização. `user_metadata` não autoriza nada. Snapshot/gabaritos são acessíveis somente a editores/owners, como no editor de questões já existente.

## API adicional, compatível com os endpoints anteriores

Base: `/api/admin/exam-models/[id]/versions/[version]`.

| Método/caminho | Resultado |
| --- | --- |
| GET `/review-context` | Conteúdo para conferência, fingerprint, revisão, impedimentos, independência e último parecer com isCurrent calculado no servidor. |
| POST `/reviews` | Registra declaração com requestId, expectedRevision, expectedFingerprint, decision, notes, rights por questão, attestations e attestationVersion. Limite de 64 KiB; JSON e origem de envio conferidos. |
| GET `/reviews` | Histórico paginado, no máximo 50, sem snapshots integrais na coleção. |
| GET `/reviews/[reviewId]` | Evidência e snapshot histórico daquela versão, com autorização editorial. |

A API anterior conserva seus contratos. O leitor de corpo continua com 16 KiB por padrão; apenas o registro de parecer usa 64 KiB. Deadlock detectado é tratado como conflito de edição, sem devolver texto técnico. Respostas são private/no-store. Student/anon não obtêm contexto, gabaritos ou evidências. Parecer `approved` não altera `status`, `reviewed_by`, `rights_checked` ou publicação: a fonte de evidência é o ledger, e publicação tem gates independentes.

## Lote D — 8 tarefas

1. `/admin/simulados`: lista versões com filtros/paginação na URL, estados de acesso/serviço/coleção vazia e criação idempotente de rascunho.
2. `/admin/simulados/[id]/[version]`: edição explícita de título, descrição, tipo e quantidade; seleção paginada de questões existentes por matéria/busca; prevenção de duplicatas e de seleção de itens arquivados.
3. Composição ordenável com botões acessíveis de subir/descer/remover; salvamento transacional com revisão esperada. Sem seleção de outra matéria como fallback.
4. Validação estrutural da composição salva, distribuição e solicitação de revisão; devolução explícita a rascunho e campos congelados em revisão.
5. Conferência editorial de cada questão/gabarito/explicação e formulário de direitos/declarações. Autores recebem explicação e controles bloqueados. Aprovação não é opção quando faltam respostas/explicações ou a fonte não é elegível para conferência.
6. Histórico de versões, clonagem sem aprovação herdada, pareceres e conteúdo histórico preservado; auditoria paginada. Horários de Brasília explícitos, estáveis entre SSR/cliente.
7. Proteção de alterações locais ao navegar/recarregar, bloqueio de navegação durante escrita e preservação do formulário em conflito. Trocar seções não desmonta nem apaga o parecer não enviado. Uma mudança de fingerprint exige novas declarações. Estados de carregamento/erro não oferecem resultados antigos como opções da busca.
8. Design existente claro/escuro, sidebar comum, links externos sanitizados, teclado/foco e testes Chromium com estados sintéticos. Matriz ampliada para **24 páginas × 2 temas × 4 larguras = 192 combinações**. Sem redesign ou nova biblioteca.

## Validação e artefatos

```sh
pnpm test
pnpm typecheck
NITRO_PRESET=vercel pnpm build
bash scripts/test-database.sh # somente PostgreSQL descartável/loopback
TEST_BASE_URL=http://localhost:3012 node tests/browser/editorial-catalog.cjs
TEST_BASE_URL=http://localhost:3012 node tests/browser/unified-interface.cjs
```

Chromium também usa os overrides PLAYWRIGHT_MODULE/CHROMIUM_PATH já documentados. Artefatos locais em `/workspace/work/catalog-review-2026-11-27`, sem tokens/cookies. Testes de navegador interceptam APIs: não gravam conteúdo ou pareceres reais. Testes SQL exercitam privilégios e transações reais com auth.uid sintético; não homologam Supabase Auth hospedado. Regressões anteriores de concursos, biblioteca oficial e prática devem continuar passando. Resultados finais, comandos e CI ficam no PROGRESS e na PR.

Resultados finais locais: **263 testes em 31 arquivos**, typecheck, build Vercel, verificadores matemáticos, suíte SQL completa e concorrência aprovados. Chromium: fluxo editorial completo (incluindo navegação cancelada com parecer pendente), **192 combinações**, concursos, provas oficiais e oito regressões de prática aprovados; nenhum pageerror. Capturas claro/escuro em desktop e 320 px conferidas.

PostgREST 12.2.3 isolado também confirmou contexto/registro HTTP 200, replay sem duplicação, snapshot protegido, contexto negado ao estudante (403), ledger vazio por RLS e escrita direta negada (403). Declarações sintéticas somente no banco descartável; não são homologação hospedada nem aprovação humana. O próximo recorte deve automatizar esse ensaio completo pela API Nuxt e pela UI, com identidades reais controladas quando autorizadas.

A validação local encontrou inicialmente um erro de nome duplicado em fixture de navegador, corrigido antes da aprovação do fluxo. Uma tentativa de criação durante recarregamento do servidor foi repetida em servidor estabilizado. A suíte SQL também foi interrompida por falta de espaço; caches/dependências temporárias desta execução foram removidos e o banco foi recriado em tmpfs com espera de prontidão TCP. Não utilizar essas execuções interrompidas como teste aprovado.

## Gates, reversão e checkpoint seguinte

Manter #71 draft e não aplicar schema em produção até revisão de RLS/RPCs, homologação de identidades/pareceres reais e aprovação específica. Não promover #66 por conta desta entrega. O status do estudante, perguntas publicadas, sessões, notas e fontes oficiais não são alterados. A aprovação de um modelo em homologação não publica questões, não valida automaticamente dificuldade e não libera uso de conteúdo externo.

Reverter UI/API por commit é independente do schema. Em schema de homologação, preservar ledger/snapshots; não executar DROP automático nem remover identidades referenciadas como rollback. Evidências com declaração incorreta são corrigidas por outro registro, nunca por sobrescrita. Definir política de retenção/privacidade antes da implantação.

O recorte seguinte de integração descartável, sobreposição, diversidade e metas por matéria foi implementado na proposta, conforme [novo checkpoint](EXAM_CATALOG_INTEGRATION_QUALITY.md). A homologação real com revisores permanece pendente. A liberação ao estudante depende de questões publicadas/revisadas e dos gates de direitos, além de snapshot completo na sessão; continua fora deste lote. A homologação real de Auth permanece na #57/#66.
