# PROGRESS.md — execução e entregas

## Estado geral

**Status:** fundação publicada; produto ainda não possui fluxos de estudante operacionais.

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
