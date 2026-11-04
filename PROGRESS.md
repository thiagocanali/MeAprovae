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
