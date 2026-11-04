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
- Branch: feat/study-question-engine; PR #5 permanece aberto e não mesclado.
