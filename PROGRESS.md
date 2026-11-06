# PROGRESS.md — execução e entregas

## Estado geral

**Status em 04/11/2026:** núcleo de estudo e painel do estudante preparados em branch; execução real continua bloqueada pelo provisionamento/aplicação do Supabase e pela validação de deploy. Não considerar os fluxos operacionais antes desses testes.

### Entregas verificadas
- [x] Repositório GitHub público e branch principal `main` identificados.
- [x] Nuxt 4.6.3 + Vue 3 + TypeScript configurados.
- [x] Landing page publicada.
- [x] Endpoint `GET /api/health` implementado.
- [x] Build de produção Vercel READY no commit `8167a400be57eaa6bf0d5d69b772364a0ac5e5b1`.
- [x] Integração Vercel ↔ GitHub confirmada pelos metadados do deployment.
- [x] Auditoria inicial registrada em [PROJECT_AUDIT.md](PROJECT_AUDIT.md).

### Base de qualidade adicionada na branch de trabalho
- [x] Adicionar Vitest e scripts `test` / `test:watch`.
- [x] Criar regra de domínio isolada para avaliar uma resposta de alternativa.
- [x] Criar cinco testes unitários para a regra de avaliação.
- [x] Criar workflow GitHub Actions para typecheck, testes e build.
- [ ] Aguardar e revisar execução do GitHub Actions; os testes ainda não foram executados nesta sessão.
- [ ] Conectar a regra ao fluxo de resolução persistido; ainda não é funcionalidade disponível ao estudante.

### Não implementado
- [ ] PostgreSQL, ORM e migrações.
- [ ] Autenticação, sessão, recuperação de senha e RBAC.
- [ ] Perfil, onboarding e objetivo de estudo.
- [ ] Concursos, editais, disciplinas e assuntos.
- [ ] Questões, tentativas, favoritos e cadernos.
- [ ] Dashboard e progresso reais.
- [ ] Gamificação, simulados, flashcards e cronograma.
- [ ] Comunidade, IA e painel administrativo.
- [ ] Testes automatizados e CI.

## Registro de entregas

### 2026-11-04 — Base inicial de qualidade e regra de domínio
- **Arquivos:** `package.json`, `vitest.config.ts`, `shared/domain/questions/evaluate-answer.ts`, `tests/unit/evaluate-answer.test.ts`, `.github/workflows/ci.yml`.
- **Commits:** `90e9a4f`, `7668682`, `d80c201`, `d269543`, `14021ec` (na branch `feat/project-audit-foundation`).
- **Testes:** cinco casos escritos; execução pendente do Actions.
- **Push:** commits publicados no GitHub pela API de conteúdo.
- **Deploy:** preview aguardando atualização/validação.


### 2026-11-04 — Auditoria técnica inicial
- **Alterações:** criação de `PROJECT_AUDIT.md`, atualização do plano, registro do progresso e documentação de ambiente.
- **Testes:** auditoria remota do GitHub e consulta de deployment/variáveis Vercel. Sem execução local de comandos.
- **Commit:** será registrado após o push.
- **Push:** pendente até a confirmação do commit GitHub.
- **Deploy:** documentação; alterações apenas documentais não alteram comportamento da aplicação.

## Dependências externas pendentes
- Provisionar PostgreSQL e fornecer `DATABASE_URL` em Vercel Preview/Production e ambiente local.
- Escolher/configurar provedor de autenticação e suas chaves públicas/servidor.
- Configurar e-mail transacional para recuperação de senha quando necessário.
- Credencial de IA somente quando a fase do tutor for iniciada.

## Regra de atualização
Uma tarefa só será marcada como concluída quando código, persistência, autorização, testes pertinentes, documentação e deploy (quando aplicável) forem verificados. Commits e pushes devem ser registrados com SHA e link.


### 2026-11-04 — Implementação inicial de identidade Supabase
- **Código adicionado:** cliente SSR server-only, endpoints de registro/login/logout/sessão, callback PKCE, middleware de proteção, telas de cadastro/login/área do estudante e estilos responsivos.
- **Banco:** migração SQL inicial para `student_profiles`, trigger de criação e RLS por usuário.
- **Dependências:** `@supabase/ssr` e `@supabase/supabase-js` adicionados.
- **Credenciais:** ausentes na Vercel; o fluxo não pode autenticar até configurar `NUXT_SUPABASE_URL` e `NUXT_SUPABASE_ANON_KEY`.
- **Migração:** criada no GitHub; ainda não aplicada a um projeto Supabase.
- **Testes:** build/CI pós-alteração pendentes; cadastro/login não testados contra serviço real.
- **Commit/push:** commits individuais publicados na branch; ver histórico da branch para SHAs.
- **Deploy:** previews em andamento/pendentes; produção não foi alterada.


### 2026-11-04 — Validação isolada de entradas de autenticação
- **Arquivos:** `shared/domain/auth/validation.ts`, `tests/unit/auth-validation.test.ts`, endpoints de registro e login.
- **Alteração:** normalização e validação de e-mail, nome e senha extraídas para funções puras e reutilizadas nos endpoints.
- **Testes:** 16 casos novos; total de 21 casos unitários escritos entre avaliação de questão e autenticação.
- **Branch:** `feat/auth-validation`, PR #4 para `feat/project-audit-foundation`.
- **CI:** não foi possível confirmar um run para o HEAD mais recente pela integração; o run anterior passou antes do código Supabase. Não declarar typecheck/build do código de autenticação aprovados.
- **Vercel:** status Vercel no commit atual falhou por limite de builds do plano (build-rate-limit). Nenhuma alteração em produção.


### 2026-11-04 — Recuperação e redefinição de senha
- **Código:** endpoint de solicitação de recuperação com resposta genérica, callback PKCE com destino local permitido, endpoint autenticado de atualização de senha e telas de recuperação/redefinição.
- **Segurança:** o destino de callback é allowlist fixa (`/redefinir-senha` ou `/app`), a redefinição exige usuário validado no servidor e a resposta de solicitação não revela se o e-mail possui conta.
- **Dependência:** configuração de Auth/SMTP e allowlist de redirects no Supabase ainda ausentes.
- **Testes:** implementação não validada em runtime; CI do HEAD atual não confirmado.


### 2026-11-04 — Catálogo e motor de questões (código preparado)
- **Branch:** `feat/study-question-engine`, baseada em `feat/auth-validation`.
- **Migração:** `supabase/migrations/0002_study_catalog_and_question_attempts.sql` — concursos, editais, disciplinas, tópicos, questões, alternativas, gabaritos privados, concursos acompanhados, tentativas, índices, RLS, grants mínimos, triggers de publicação e RPC idempotente.
- **APIs:** catálogo/detalhe de concursos, follow/unfollow, listagem de questões, submissão via RPC e histórico privado.
- **Interface:** páginas de concursos, detalhe, prática de questões e histórico; dashboard com navegação para os módulos.
- **Testes adicionados:** sete casos unitários de UUID; total de 28 casos escritos (5 de avaliação, 16 de auth, 7 de UUID).
- **Persistência real:** não validada; migração ainda não aplicada e projeto/credenciais Supabase ausentes.
- **Conteúdo:** nenhuma questão de demonstração foi inserida. O catálogo vazio é um estado real esperado até cadastro editorial.
- **Build/CI:** pendente. Vercel reporta `build-rate-limit`; não há evidência de CI aprovado para este HEAD.
- **Deploy:** nenhuma alteração na produção.


### Atualização de integração na branch principal
- PR #3 e PR #4 foram mesclados em `main`; documentação, CI, autenticação Supabase SSR e migração de perfil estão agora na branch principal.
- O deploy de produção posterior à integração falhou no typecheck devido ao uso de middleware nomeado como string em `definePageMeta`.
- Correção implementada no PR #5: importar o guard como função tipada nas páginas protegidas.
- Estado de produção observado: último deployment associado ao commit `acb07c340059accb672932336fb0c1b9eca3b2a7` está **ERROR**.
- O Preview do PR #5 está bloqueado por `build-rate-limit`; não há build atualizado para validar a correção.


### 2026-11-04 — CI e hotfix de produção
- **CI do motor de questões:** GitHub Actions run #117 — `npm install`, `nuxt typecheck`, Vitest (28/28) e `nuxt build` concluídos com sucesso.
- **Ajuste encontrado pelo teste:** um UUID v7 estava incorretamente listado como inválido; o teste foi corrigido porque o validador já aceitava corretamente UUID v7.
- **Hotfix:** PR #6 mesclado em `main`; commit `a1d696df01a180823365cfb1363d39ef4fca23ea`; CI run #118 também verde.
- **Deploy:** nenhum deployment Vercel novo confirmado após o merge; o último deployment observado ainda é o erro anterior. Não declarar produção corrigida até deployment READY e teste HTTP.
- **PR #5:** permanece aberto; CI verde para o código atual do módulo, porém sem banco real e sem Preview.


### 2026-11-04 — Objetivo de estudo e dashboard conectado ao histórico (código preparado)
- **Migração:** `0003_student_goals_and_dashboard.sql` cria cargos, objetivos ativos/arquivados, índice de um objetivo ativo por usuário e RLS.
- **RPCs:** `set_student_study_goal` valida concurso/edital/cargo e substitui objetivo ativo; `get_student_dashboard` agrega tentativas reais, acertos, taxa de acerto, objetivo e atividades recentes.
- **APIs:** GET/POST de objetivo e GET de dashboard.
- **Interface:** onboarding para selecionar concurso/edital/cargo; dashboard com indicadores e atividade recente; detalhes de concurso exibem cargos.
- **Persistência real:** ainda não validada; migração 0003 não aplicada e sem projeto Supabase/credenciais.
- **Conteúdo:** não há concursos/cargos publicados; estados vazios são intencionais.
- **Testes:** CI run #117 passou no motor de questões antes desta nova entrega; a alteração de objetivos/dashboard precisa de nova execução de typecheck/testes/build.


### 2026-11-04 — Favoritos de questões (código preparado)
- **Migração:** `0004_question_favorites.sql`, com RLS por usuário, unicidade por questão/estudante e validação de questão publicada.
- **APIs:** listagem, inclusão idempotente e remoção de favoritos.
- **Interface:** botão de salvar/remover na prática e página `/app/favoritas`; link no dashboard.
- **Persistência:** ainda não testada; aplicar migração 0004 após as anteriores.
- **CI:** executar novamente no HEAD atual; o run #133 validou o módulo de objetivos/dashboard antes desta entrega.


### 2026-11-04 — CI verde após favoritos
- **GitHub Actions run #143:** instalação, typecheck, 28 testes unitários e build de produção passaram no commit `ad6121be0a058d006ef9607a4fb928b68dfc6704`.
- **Escopo coberto:** autenticação preparada, catálogo, motor de questões, objetivos, dashboard e favoritos.
- **Ainda pendente:** aplicar migrações 0001–0004 e validar RLS, RPCs, idempotência e isolamento entre contas em Supabase real.
- **Deploy:** Preview Vercel indisponível por `build-rate-limit`; produção ainda sem deployment READY posterior ao hotfix #6.


### 2026-11-04 — Desempenho por disciplina e fila de revisão (código preparado)
- **Migração:** `0005_subject_performance_and_wrong_questions.sql`, com RPCs de agregação por disciplina e seleção da tentativa mais recente incorreta.
- **APIs:** dashboard inclui desempenho por disciplina; endpoint de questões erradas/revisão.
- **Interface:** dashboard mostra acertos/taxa por disciplina; página `/app/erros` lista questões cuja tentativa mais recente foi incorreta e permite reabri-las para nova tentativa.
- **Persistência:** migração 0005 não aplicada; teste real depende do Supabase.
- **CI:** executar no HEAD atual para validar typecheck, testes e build.


### 2026-11-04 — CI verde para desempenho e revisão de erros
- **GitHub Actions run #155:** instalação, typecheck, 28 testes e build passaram no commit `bda023fc61232e60133cf4ecfe57eca858835145`.
- **Escopo:** migração 0005, agregação por disciplina, fila da tentativa mais recente incorreta, dashboard e página de revisão.
- **Banco:** migração 0005 não aplicada; integração Supabase real e testes RLS continuam pendentes.


### 2026-11-04 — Fundação de administração editorial e RBAC (código preparado)
- Migração: supabase/migrations/0006_editorial_admin_and_audit.sql cria papéis owner/editor, função has_platform_role, políticas RLS para operações editoriais e tabela de auditoria.
- Segurança: autorização administrativa é verificada no banco; a interface não é a barreira de autorização. Gabaritos permanecem privados para estudantes e acessíveis apenas a editores via RLS.
- Auditoria: alterações em concursos, editais, cargos, disciplinas, assuntos, vínculos, questões, alternativas e gabaritos geram registros com ator, operação, tabela, ID e dados anterior/novo.
- Servidor: requirePlatformEditor valida sessão e papel por RPC; GET /api/admin/overview devolve contagens e últimas alterações apenas para editores.
- Interface: /admin apresenta indicadores editoriais e histórico recente. Formulários CRUD/publicação ainda não foram entregues.
- Bootstrap: primeiro owner deve ser atribuído manualmente no SQL Editor do Supabase após a conta Auth confirmada existir; não há autoelevação ou usuário presumido.
- Validação: migração 0006 ainda não aplicada; RLS, triggers e permissões precisam ser testados no Supabase real. CI do novo HEAD ainda precisa ser consultado.
- Branch: feat/study-question-engine; PR #5 foi integrado à main no commit db37823eb855db865d0adc8419f7d4e942e25d5a. A migração 0007 e sua documentação seguem no PR #7, em draft.


### 2026-11-04 — Integridade do ciclo editorial e concorrência de objetivos (código preparado)
- Migração 0007: revalida vínculos de publicação ao alterar concurso/edital/questão; impede alterar alternativas, gabaritos ou disciplinas de edital enquanto publicados; exige arquivamento antes de excluir registros publicados.
- Concorrência: RPC set_student_study_goal passa a bloquear a linha do usuário durante a substituição do objetivo, serializando mudanças concorrentes.
- Dependência: aplicar 0007 após 0006. Nenhuma migração foi executada em Supabase real.
- CI: run #168 passou em instalação, typecheck, 28 testes e build para o HEAD anterior (antes da migração 0007); o novo HEAD ainda precisa de CI.


### 2026-11-04 — CI verde da proteção de ciclo editorial (PR #7)
- GitHub Actions run #169 passou integralmente no HEAD f93026925213fe47015ecb2dcdea9963515f9b6e: instalação, typecheck, 28 testes unitários e build de produção.
- PR #7 aberto em modo draft para integrar a migração 0007 e a documentação complementar; não mesclado.
- O CI não executa migrações nem substitui os testes de integração/RLS no Supabase real.


### 2026-11-04 — Gestão inicial de editais (PR #8)
- **APIs:** GET /api/admin/notices (com filtro por concurso), POST para criar edital em rascunho e PATCH para editar metadados, publicar, arquivar ou reabrir.
- **Validação:** UUID, título, versão, data de publicação e URL HTTP/HTTPS da fonte oficial; conflitos de versão retornam 409.
- **Interface:** formulário de edital no painel /admin, associação obrigatória a concurso, fonte oficial e controles de status; estados vazios e mensagens de erro/sucesso.
- **Segurança:** todas as rotas exigem papel editorial no servidor; RLS e triggers do banco continuam como fronteira final.
- **PR:** #8 em draft; CI run #173 iniciado, aguardando conclusão.
- **Persistência:** não testada contra Supabase real; não há banco provisionado confirmado nem dados editoriais reais inseridos.


### 2026-11-04 — Disciplinas e vínculo com edital
- APIs administrativas protegidas por `requirePlatformEditor` para listar e cadastrar disciplinas.
- API para consultar disciplinas vinculadas a um edital e sincronizar a seleção em uma única RPC transacional.
- Migração `0008_notice_subject_assignment.sql`: bloqueio de alteração quando o edital está publicado, validação de papel editorial, lock da linha do edital e substituição atômica dos vínculos.
- Painel `/admin` com cadastro de disciplinas e associação múltipla a editais.
- Código preparado na branch do PR #8; CI e validação SQL em Supabase real ainda pendentes.


### 2026-11-05 — Cargos e vínculo cargo-edital
- Criada a migração `0009_notice_position_assignment.sql` para associar cargos reutilizáveis do concurso a editais específicos, preservando o vínculo de concurso por FK composta.
- Criadas APIs editoriais para listar/cadastrar cargos, alterar metadados/status e listar/sincronizar cargos de um edital.
- A sincronização usa RPC `set_notice_positions`, com papel editorial, lock do edital, validação de pertencimento ao concurso e substituição atômica.
- O painel `/admin` agora cadastra cargos e permite associá-los a editais; editais publicados continuam bloqueados para alterações estruturais.
- Nenhum cargo, concurso ou edital fictício foi inserido.
- A migração e as políticas ainda não foram executadas contra Supabase real; CI/deploy do novo branch precisam ser verificados antes de considerar a entrega validada.


### 2026-11-05 — Editor inicial de questões
- Criadas APIs editoriais para listar/criar/editar questões.
- Criada API para substituir alternativas e definir o gabarito.
- A edição de alternativas usa RPC transacional `set_question_options`, com lock da questão e bloqueio para questões publicadas.
- A estrutura existente de banco continua exigindo edital/disciplina válidos e, para publicação, alternativas suficientes e gabarito.

### 2026-11-05 — Interface do editor de questões
- O painel `/admin` agora cria e edita questões, alternativas e gabarito usando as APIs editoriais.
- O editor filtra assuntos/subassuntos pela disciplina selecionada e permite até 10 alternativas.
- Questões existentes podem ser abertas para revisão e passar pelo ciclo rascunho → publicado → arquivado.

- Checklist visual de publicação adicionado: concurso e edital publicados, disciplina vinculada, alternativas preenchidas e gabarito definido. O banco continua como validação final.
- Corrigido o retorno da RPC de alternativas para usar nomes de campos consistentes com a API (`question_id`, `option_label`).
- Corrigido bloco CSS que fazia o build de produção falhar.

## 2026-11-05 — PR #10 integrado e validação de produção

- PR #10 (`feat: iniciar editor editorial de questões`) foi mesclado à `main` no commit `cd1f6393394c8b8875660daf765bb66c8e82904b`.
- CI da branch: typecheck, testes unitários e build de produção concluídos com sucesso.
- Deployment de produção associado ao merge commit está `READY` e aponta para `https://meaprovae.vercel.app`.
- A verificação atual da Vercel retornou zero variáveis de ambiente e zero variáveis ocultas. Portanto, o deploy não comprova autenticação nem persistência Supabase funcionais.
- Próximo bloqueio P0: provisionar/configurar Supabase, adicionar as variáveis públicas SSR necessárias, aplicar migrações 0001–0011 e validar RLS/RPCs com duas contas.

## 2026-11-05 — PR #11 integrado

- PR #11 (`fix: preservar gabarito ao substituir alternativas`) foi mesclado à `main` no commit `1fd30bf049c547213f528edbb5153ce11f194ae1`.
- CI run `42034208681`: instalação, typecheck, testes unitários e build de produção passaram.
- Migração 0011, correção do PATCH de edital e ação de despublicação segura foram integradas.
- Deployment Preview recusado pela Vercel por limite diário de deployments do plano (`api-deployments-free-per-day`); não houve Preview novo para validar.
- A migração 0011 ainda não foi aplicada em banco real. Supabase/variáveis continuam sendo o bloqueio P0.


## 2026-11-05 — proteção do histórico de questões (em revisão)

- Auditoria estática das migrações identificou que `question_attempts` mantém FK para as alternativas respondidas; substituir alternativas apagando as antigas pode falhar após existirem tentativas.
- Criada a migração `0012_lock_question_history.sql`: bloqueia mudanças no conteúdo estrutural de questões com tentativas e bloqueia inserção/edição/exclusão de alternativas e gabaritos após o primeiro registro de resposta.
- Transições de status editorial continuam permitidas. Para corrigir questão respondida, a regra passa a ser criar uma nova questão/versão.
- Branch: `fix/lock-question-history`. Migração ainda não aplicada nem testada em PostgreSQL/Supabase real.
- CI e revisão SQL ainda pendentes; não considerar a proteção operacional até aplicar a migração 0012.


## 2026-11-05 — PR #12 integrado e estado de validação

- PR #12 (`fix: proteger histórico de questões respondidas`) foi mesclado à `main` via squash no commit `c83d8657df1225acb43dcbbd692c341ec462cacc`.
- O CI do HEAD do PR passou em instalação, typecheck, testes unitários e build de produção antes do merge.
- O check `Supabase Preview` associado ao commit integrado foi **ignorado (`skipped`)** porque a criação de branches Preview está desabilitada. Ele não confirma conexão nem execução de migrações; aplicação do schema e testes reais continuam pendentes.
- A migração 0012 agora está na `main`; sua aplicação e validação funcional continuam pendentes.
- A Vercel recusou o deployment do commit integrado por limite diário do plano (`api-deployments-free-per-day`). O deployment de produção READY ainda observado corresponde ao commit anterior `cd1f6393394c8b8875660daf765bb66c8e82904b`.
- A consulta de variáveis Vercel retornou zero variáveis configuradas e zero variáveis ocultas. Configurar `NUXT_SUPABASE_URL` e `NUXT_SUPABASE_ANON_KEY` continua necessário para a aplicação Nuxt usar o Supabase em cada ambiente.
- Próximos passos: confirmar no dashboard Supabase o estado do projeto/branch preview e das migrações; configurar variáveis Vercel; aplicar/validar 0001–0012 no ambiente correto; testar RLS/RPCs com contas estudante e editor.

### 2026-11-06 — auditoria de privilégios e proteção de gabarito
- Encontrada falha de privilégio na migração 0006: authenticated recebeu SELECT em nível de tabela em study_questions, tornando ineficaz a intenção de expor apenas colunas públicas definida em 0002. Isso poderia revelar explicações antes da resposta.
- Preparada migração 0013 para separar explicações em study_question_editorial_details, aplicar RLS exclusiva de editores, preservar explicações existentes e retornar feedback via RPC de submissão.
- Endpoints de administração de questões adaptados para a nova tabela protegida.
- Corrigida também a falta de grants DML em platform_admins; as policies de owner de 0006 permanecem como barreira.
- Criado script SQL de diagnóstico somente leitura em supabase/diagnostics/phase-2-read-only-audit.sql.
- Alterações em revisão na branch fix/admin-role-table-grants; ainda não aplicadas ao Supabase real.

### 2026-11-06 — auditoria do PR #20 e simulados no PR #21
- **PR #20:** integrado em `main` no merge commit `821a9f5`. A migração 0013 e as alterações de isolamento de explicação estão no branch principal. Auditoria desta sessão foi estática; aplicação da migration e teste de vazamento no Supabase continuam não validados.
- **PR #21:** branch `feat/user-exam-simulado` parte do `main` atual e inclui a migração 0013. A auditoria identificou que retries no simulado geravam uma nova chave de idempotência e que a nota ignorava questões não respondidas após o timer; a revisão também não mostrava a resposta escolhida nem a correta.
- **Correções locais:** chave de idempotência estável por questão/alternativa nos fluxos de questões e simulados; nota calculada sobre o total; resumo de questões não respondidas; revisão com resposta marcada e gabarito; interface identifica explicitamente o simulador como modo estudo.
- **Embaralhamento:** substituído `sort(() => Math.random() - 0.5)` por Fisher–Yates para questões e alternativas; teste determinístico cobre preservação dos itens e da lista de entrada.
- **Timer:** extraído para lógica testável; cobertura de contagem, expiração em zero, reinício sem intervalos duplicados e cancelamento no teardown.
- **Validação local:** `nuxt typecheck` passou; Vitest passou com 37 testes em 7 arquivos; `nuxt build` passou. Foram observados avisos de import dinâmico e tempo de callbacks Vite, sem falha.
- **Produção/Preview:** GET `/api/health` respondeu HTTP 200. O Preview do PR #21 em `b5ffc9e` concluiu; não é produção e não valida autenticação, Supabase, RLS, conteúdo ou fluxo de estudo. O HEAD local posterior ainda não tem deploy.
- **API protegida em produção:** GET sem sessão a `/api/study/questions` respondeu HTTP 401 com a mensagem esperada. Login, sessão autenticada, leitura de dados e submissão não foram testados.
- **Banco/segurança:** migrations 0001–0013 estão versionadas, mas aplicação/ledger, grants efetivos, RLS, RPC e isolamento entre estudante/editor não foram validados em banco real. Nenhum conteúdo real foi confirmado.
- **Git/CI:** commits `b5ffc9e`, `4297646` e `aee125a` foram enviados ao PR #21; CI passou em `aee125a`. O patch atual do timer ainda precisa de push e checks próprios. O `package-lock.json` preexistente não foi incluído.
- **Próximo bloqueio:** obter CI/deploy do HEAD final e executar auditoria SQL/testes de perfis quando houver acesso não privilegiado apropriado ao Supabase; não solicitar service role.
