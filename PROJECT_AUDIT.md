# PROJECT_AUDIT.md — auditoria técnica inicial

- **Data:** 04/11/2026
- **Repositório:** https://github.com/thiagocanali/MeAprovae
- **Branch principal:** `main`
- **Branch desta auditoria:** `feat/project-audit-foundation`
- **Último commit observado em main:** `8167a400be57eaa6bf0d5d69b772364a0ac5e5b1`
- **Deployment de produção observado:** READY, associado ao commit acima.

## 1. Diagnóstico executivo

O repositório contém documentação extensa de produto, arquitetura, modelo conceitual e roadmap, além de uma fundação Nuxt mínima. A aplicação executável ainda não é uma plataforma de estudos: há uma landing page de apresentação e uma rota de saúde. Não há fluxo de estudante, autenticação, banco de dados, conteúdo de concursos, questões ou métricas.

A auditoria confirma o estado do código e dos arquivos consultados no GitHub e os metadados do projeto/deploy Vercel. Não foi possível executar `git status`, instalar dependências ou rodar comandos localmente nesta sessão porque não há checkout local do repositório disponível. A inspeção de arquivos foi feita pelo GitHub; portanto, não alego ter executado uma varredura local de todos os arquivos ou testes.

**Conclusão:** a fundação publicada compila na Vercel, mas o produto ainda está em estágio pré-MVP. Não deve ser anunciado como pronto para estudantes.

## 2. Repositório, Git e deploy

| Item | Resultado |
|---|---|
| Repositório | Público: `thiagocanali/MeAprovae` |
| Permissão de escrita | Confirmada para a integração GitHub |
| Branch padrão | `main` |
| Branches observadas | `main`, `spike/nuxt-foundation` |
| Commit de produção | `8167a400be57eaa6bf0d5d69b772364a0ac5e5b1` |
| Estado do último deploy | `READY` |
| Vínculo Vercel/GitHub | Confirmado pelos metadados do deployment: repo `thiagocanali/MeAprovae`, ref `main` |
| Alterações locais / `git status` | Não verificável sem checkout local; nenhuma alteração local foi feita por esta sessão |
| Lockfile | Não encontrado: `package-lock.json`, `pnpm-lock.yaml` e `yarn.lock` retornaram 404 |
| CI no GitHub Actions | Nenhum workflow foi identificado nos caminhos consultados; confirmar inventário completo ao obter árvore do repositório |

O deployment de produção mais recente está READY. A tentativa de fazer fetch HTTP pela integração Vercel falhou com mensagem de deployment inacessível/autorização; portanto, a página e `/api/health` ainda não foram validadas por resposta HTTP nesta auditoria.

## 3. Tecnologias identificadas

| Camada | Identificação | Estado |
|---|---|---|
| Framework | Nuxt `4.6.3` | Configurado e build READY na Vercel |
| UI | Vue `^3.5.22` | Uma página de apresentação |
| Linguagem | TypeScript `^5.9.3` | Configuração strict |
| Servidor | Nitro / Nuxt server routes | Uma rota de health |
| Estilos | CSS próprio | Landing page responsiva |
| Runtime | Node `>=22.12.0` declarado | Build Vercel concluído |
| ORM | Drizzle | Apenas recomendado em documentação; não instalado |
| Banco | PostgreSQL | Não conectado |
| Autenticação | Nenhum provedor | Não implementada |
| Testes | Vitest / Playwright recomendados | Não configurados |
| Deploy | Vercel | Deployment de produção READY |
| Versionamento | GitHub | Branch principal `main` |

Dependências atualmente declaradas: `nuxt`, `vue`, `typescript` e `vue-tsc`. Não há scripts de lint ou teste no `package.json`; há apenas `dev`, `build`, `preview` e `typecheck`.

## 4. Estrutura de aplicação confirmada

Arquivos de aplicação verificados:
- `app/app.vue`: renderiza `NuxtPage`.
- `app/pages/index.vue`: landing page única.
- `app/assets/css/main.css`: tokens CSS, layout, cartões e breakpoint mobile.
- `server/api/health.get.ts`: endpoint público GET de saúde.
- `nuxt.config.ts`: metadados, CSS global, TypeScript strict.
- `tsconfig.json`: estende configuração gerada pelo Nuxt.
- `.env.example`: contém apenas `DATABASE_URL` e `NODE_ENV`.
- `.gitignore`: ignora builds, dependências e arquivos de ambiente.

Documentação existente inclui visão, requisitos, MVP, roadmap, arquitetura, modelo de dados, UX/UI, aprendizagem, gamificação, governança de conteúdo, IA, segurança/privacidade, monetização, deploy, contribuição e ADRs.

Não foram encontrados, nos caminhos consultados, diretórios/módulos de autenticação, banco, concursos, questões, simulados, progresso, gamificação, comunidade ou administração. Também não foram encontrados lockfiles, configurações de testes ou Drizzle.

## 5. Inventário funcional e classificação

Legenda:
- **Implementada e funcional:** comportamento real verificado.
- **Parcialmente implementada:** parte real existe, mas o fluxo está incompleto.
- **Apenas visual:** interface sem operação de negócio.
- **Não implementada:** não há implementação identificada.

| Funcionalidade | Classificação | Evidência / observação |
|---|---|---|
| Landing page | Apenas visual | Conteúdo de apresentação; sem cadastro ou ações de estudo |
| Layout e identidade visual | Parcialmente implementada | CSS e responsividade básica existem; sem validação automatizada em dispositivos |
| Endpoint `GET /api/health` | Parcialmente implementada | Handler real responde status e timestamp; não verifica banco nem dependências |
| Nuxt build/deploy | Implementada e funcional | Vercel reportou deployment READY para o commit de produção |
| Cadastro e login | Não implementada | Sem provedor, telas ou endpoints |
| Logout e recuperação de senha | Não implementada | Sem sessão ou fluxo de identidade |
| Perfil e onboarding | Não implementada | Sem persistência ou rotas |
| PostgreSQL e migrações | Não implementada | Sem driver, ORM, schema ou variável configurada |
| Concursos e cargos | Não implementada | Somente requisitos/documentação |
| Editais e conteúdo programático | Não implementada | Modelo conceitual, sem dados ou CRUD |
| Disciplinas e assuntos | Não implementada | Sem catálogo funcional |
| Banco e filtros de questões | Não implementada | Sem entidades, conteúdo ou APIs |
| Resolução e histórico de questões | Não implementada | Sem fluxo de submissão |
| Favoritos e cadernos | Não implementada | Sem persistência |
| Dashboard e desempenho | Não implementada | Cards da landing são ilustração, não indicadores |
| XP, níveis e conquistas | Não implementada | Apenas especificação |
| Simulados | Não implementada | Apenas requisitos |
| Flashcards e revisão espaçada | Não implementada | Apenas requisitos |
| Cronograma e sessões | Não implementada | Apenas requisitos |
| Comunidade e moderação | Não implementada | Apenas requisitos |
| Tutor IA | Não implementada | Sem provedor, chave ou endpoint |
| Painel administrativo | Não implementada | Sem papéis, permissões ou telas |
| Pagamentos/assinaturas | Não implementada | Apenas documentação |

## 6. Configuração de ambiente e integrações

A listagem de variáveis da Vercel para o projeto retornou zero variáveis cadastradas e zero variáveis ocultas de produção. O arquivo `.env.example` só documenta `DATABASE_URL`; não há URL de banco, credenciais de auth, chave de IA ou e-mail transacional configurados.

Nenhuma integração Supabase, PostgreSQL, IA, pagamentos, storage ou e-mail foi identificada como ativa. Supabase e Drizzle aparecem apenas como opções/recomendações nos documentos.

Não foram solicitados nem lidos valores secretos.

## 7. Segurança

### Pontos positivos
- `.env` e arquivos `.env.*` são ignorados pelo Git, com exceção explícita de `.env.example`.
- Não há credenciais expostas nos arquivos consultados.
- A rota de saúde não recebe dados do usuário nem executa mutações.
- A documentação já exige autorização no servidor, idempotência e cuidado com dados pessoais.

### Riscos e lacunas atuais
- Não existe autenticação, sessão ou autorização; não é possível oferecer contas de estudantes.
- Não existe banco ou isolamento entre usuários.
- Não há validação de payloads para APIs de domínio porque elas ainda não existem.
- Não há rate limiting, proteção contra abuso, trilha de auditoria ou política de retenção implementados.
- Não há configuração explícita identificada de headers de segurança/CSP.
- A rota de health informa apenas disponibilidade do handler, não a saúde de banco ou serviços.
- Não há testes automatizados para provar controles de acesso.
- A política de privacidade e os fluxos LGPD ainda são documentação, não funcionalidades operacionais.

Não há evidência de vazamento de segredo no conjunto de arquivos consultado; isso não equivale a uma auditoria de segurança completa de todo o histórico Git.

## 8. Arquitetura e qualidade

A direção documentada — monólito modular Nuxt/Nitro, PostgreSQL e regras críticas no servidor — é adequada ao tamanho atual. Não há motivo para migrar de framework.

Problemas objetivos:
1. Stack de banco/auth ainda não aprovada e não executada.
2. Sem lockfile, instalações não são determinísticas.
3. Sem lint, testes unitários, integração ou e2e.
4. Sem pipeline CI identificado.
5. Sem validação central de variáveis de ambiente.
6. Health check não testa dependências.
7. Landing page contém um cartão de progresso ilustrativo; embora a página avise que o produto está em construção, o visual não deve ser confundido com dados reais.
8. Documentação de deploy tem itens pendentes que precisam ser reconciliados com o vínculo Vercel/GitHub já confirmado.

## 9. Problemas priorizados

| Prioridade | Problema | Ação |
|---|---|---|
| P0 | Banco e autenticação inexistentes | Definir provedor, configurar credenciais e validar SSR |
| P0 | Ausência de isolamento de dados | Projetar políticas e testes entre usuários |
| P0 | Sem lockfile e CI | Gerar lockfile e pipeline com typecheck/build/test |
| P1 | Sem schema/migrações | Criar modelo relacional mínimo e migrações versionadas |
| P1 | Sem fluxo de objetivo de estudo | Implementar perfil, concurso/cargo e acompanhamento |
| P1 | Sem banco de questões | Implementar questões, gabaritos, tentativas idempotentes |
| P1 | Sem progresso real | Derivar métricas de tentativas e sessões persistidas |
| P2 | Sem painel administrativo | Criar operações editoriais e RBAC após base segura |
| P2 | Sem simulados, flashcards e cronograma | Construir após o ciclo de questões |
| P3 | Sem comunidade e IA | Integrar após privacidade, moderação e credenciais |

## 10. Plano de execução

1. **Fundação:** fechar PostgreSQL/Auth; instalar Drizzle; schema e migrações; validação de ambiente; CI; testes.
2. **Identidade:** cadastro, login, logout, recuperação, perfil, proteção de rotas e isolamento entre contas.
3. **Objetivo e catálogo:** concursos, cargos, editais, disciplinas, assuntos, favoritos e acompanhamento.
4. **Questões:** curadoria e procedência, filtros, resolução, explicações, tentativas idempotentes e favoritos.
5. **Progresso:** métricas reais, dashboard e recomendações explicáveis.
6. **Gamificação:** XP transacional e auditável, níveis, metas e conquistas.
7. **Simulados e aprendizagem:** simulados, flashcards, revisão espaçada e cronograma.
8. **Administração:** RBAC, gestão editorial e moderação.
9. **Comunidade e IA:** privacidade, denúncias, limites, custos e credenciais.
10. **Pré-lançamento:** e2e, acessibilidade, segurança, backups/restauração, observabilidade e validação de produção.

## 11. Limitações desta auditoria

- GitHub foi consultado por integração remota. Não houve checkout local e, portanto, não foi possível executar `git status`, `npm install`, `npm run typecheck`, lint, testes ou build local.
- A consulta de arquivos foi dirigida aos caminhos da fundação e documentação; não foi possível obter a árvore Git recursiva por esta integração. Os achados acima são evidências verificadas, não uma afirmação falsa de inspeção byte a byte de todos os arquivos/histórico.
- Vercel confirmou o deployment READY e a associação ao repositório/branch; a requisição HTTP direta via integração não foi autorizada/concluída.
- Não há credenciais de banco ou auth na configuração da Vercel. A integração real com banco exige provisionamento e credenciais fornecidas pelo usuário ou por uma integração autorizada.

---
Esta auditoria descreve o estado encontrado em 04/11/2026 e deve ser atualizada a cada entrega funcional.


## 12. Atualização após a primeira entrega de engenharia

Na branch `feat/project-audit-foundation` foram adicionados:
- Vitest como runner de testes unitários.
- Regra pura `evaluateAnswer` para avaliação de alternativa, preparada para ser chamada por lógica confiável no servidor.
- Cinco cenários unitários: correta, incorreta, não respondida e duas entradas inválidas.
- Workflow GitHub Actions para instalar dependências, executar typecheck, testes e build.

**Status de validação:** os arquivos foram enviados ao GitHub; execução automatizada ainda pendente de um run do Actions. A regra de domínio ainda não está conectada a uma API, banco ou interface de resolução; portanto, o módulo de questões permanece **não implementado** em termos de produto. O setup de CI não resolve a ausência de lockfile.


## 13. Atualização — identidade preparada, integração externa pendente

Foi iniciada uma implementação de autenticação Supabase SSR na branch `feat/project-audit-foundation`: cliente server-side com cookies, cadastro, login, logout, consulta de usuário verificado, callback PKCE, middleware de rota, telas de autenticação e área inicial. Também foi criada a migração `supabase/migrations/0001_student_profiles.sql` com RLS para que cada estudante leia/edite somente seu próprio perfil.

Isso muda a classificação de **não implementada** para **parcialmente implementada (código preparado, serviço externo não configurado)** em cadastro/login/sessão e perfil. Ainda não existe validação de ponta a ponta porque a listagem Vercel não encontrou variáveis de ambiente e não há projeto Supabase vinculado/configurado. A migração não foi aplicada. Não declarar cadastro/login operacional até executar os testes com duas contas distintas.

A dependência de auth usa `@supabase/ssr`, atualmente em versão beta conforme a documentação oficial; manter atenção a alterações de API e validar o comportamento de cookies/renovação no preview antes de produção. Referência: https://supabase.com/docs/guides/auth/server-side


## 14. Atualização — validação de entradas

Foi extraído um módulo compartilhado para normalizar e validar e-mail, nome de exibição e senha; cadastro e login agora reutilizam as mesmas regras. Foram adicionados 16 casos unitários. A branch está em PR separado (#4) para validar o conjunto completo da autenticação sobre a base auditada. Até o momento, o CI aprovado anteriormente não incluiu as alterações Supabase; o run do HEAD mais recente não foi confirmado. A implementação de autenticação continua parcial até validar build, ambiente e serviço Supabase real.


## 15. Atualização — recuperação de acesso preparada

Foram adicionados os fluxos de solicitação de recuperação, callback PKCE com destino local restrito, redefinição de senha para sessão validada e páginas correspondentes. A classificação de recuperação de senha passa a **parcialmente implementada (código preparado; SMTP/redirects e runtime não testados)**. Não marcar como funcional até testar entrega de e-mail, expiração do link, atualização da senha e login com a nova senha.


## 16. Atualização — catálogo e motor de questões preparados

Na branch `feat/study-question-engine` foi criada a migração `0002_study_catalog_and_question_attempts.sql` e as rotas/páginas de concursos, acompanhamento, questões e histórico.

### Componentes adicionados
- Catálogo de concursos e editais publicados.
- Disciplinas, tópicos/subtópicos e vínculo com edital.
- Questões de múltipla escolha com alternativas, origem e ano.
- Gabarito e explicação separados do conteúdo público; a chave correta não possui grant de leitura direta para estudantes.
- Tentativas por usuário, com chave de idempotência única.
- RPC transacional `submit_question_attempt`, que valida usuário, publicação, pertencimento da alternativa, grava a tentativa e retorna correção/explicação.
- RLS para catálogo publicado, concursos acompanhados e histórico privado.
- Rotas server-side para listar concursos, consultar detalhe, seguir/deixar de seguir, listar questões, submeter respostas e consultar histórico.
- Páginas para concursos, detalhe do edital, resolução e histórico.

### Classificação atualizada
- Cadastro/login: **parcialmente implementado**, aguardando Supabase real e CI.
- Catálogo de concursos: **parcialmente implementado** — código/schema prontos; não há registros editoriais publicados.
- Acompanhamento de concurso: **parcialmente implementado** — endpoints e RLS criados; sem teste no banco real.
- Banco de questões: **parcialmente implementado** — listagem e UI preparadas; conteúdo publicado ainda inexistente.
- Resolução/histórico: **parcialmente implementado** — RPC idempotente e APIs criadas; migração e transação ainda não executadas contra banco real.
- XP, dashboard analítico e recomendações: **não implementados**. A submissão ainda não concede XP, intencionalmente.

### Segurança e limites
- A resposta correta e a explicação não são selecionáveis diretamente por estudantes; só são devolvidas após submissão autorizada.
- A função SQL usa `SECURITY DEFINER` com `search_path` vazio e nomes de schema qualificados.
- RLS restringe tentativas ao próprio usuário e o banco impede escrita direta de tentativas.
- A chave de idempotência impede duplicação por repetição de uma mesma submissão. Reutilizar a chave para outra resposta retorna conflito.
- Triggers impedem publicar edital sem concurso publicado e questão sem edital/assunto, duas alternativas e gabarito.
- Não há conteúdo de questões fictícias ou atribuído indevidamente a bancas.
- A migração ainda não foi aplicada. Sem credenciais Supabase, nenhum fluxo persistente pode ser declarado funcional.

### Validação pendente
Não foi possível executar npm/build local nesta sessão. A Vercel segue retornando `build-rate-limit`; o CI do GitHub Actions precisa confirmar typecheck, testes e build para o HEAD deste módulo. Testes de RLS/idempotência exigem projeto Supabase real e duas contas.


## 17. Atualização — integração da autenticação em main e correção do build

Os PRs #3 e #4 foram mesclados em `main`. A fundação Supabase SSR e as páginas de autenticação agora fazem parte da branch principal, mas seguem **não operacionais até provisionar o Supabase e configurar variáveis/SMTP**.

O deployment de produção gerado após a integração da auditoria falhou no typecheck com:
`app/pages/app/index.vue(2,18): error TS2322: Type 'string' is not assignable to type 'NavigationGuard | NavigationGuard[] | undefined'.`

A origem foi o uso de `middleware: 'auth'` como string. Na branch `feat/study-question-engine`, as páginas agora importam explicitamente o guard tipado `~/middleware/auth` e passam a função para `definePageMeta`. A correção está no PR #5 junto ao motor de questões. O Preview Vercel deste PR não foi criado porque o provedor retornou `build-rate-limit`; portanto, a correção ainda precisa de build confirmado.

A última implantação de produção observada para o commit de auditoria está em estado **ERROR**. Não declarar produção saudável até um deployment READY e teste HTTP da landing, páginas e health endpoint.


## 18. Atualização — CI verde e hotfix de produção mesclado

- GitHub Actions run #117 para o código do motor de questões: instalação, typecheck, 28 testes unitários e build concluídos com sucesso.
- A primeira execução de testes encontrou um caso de teste incorreto: UUID versão 7 é válida segundo RFC 9562; o validador já aceitava corretamente versões 1–8. O teste foi corrigido para aceitar v7, e a execução #117 passou.
- PR #6 (`fix/typed-auth-middleware`) foi validado pelo GitHub Actions run #118 (typecheck, testes e build: sucesso) e mesclado em `main` via squash, commit `a1d696df01a180823365cfb1363d39ef4fca23ea`.
- O hotfix remove a falha de typecheck em `app/pages/app/index.vue`. Ainda não há deployment Vercel novo visível após o merge; o último deployment observado permanece ERROR no commit anterior. O limite de builds da Vercel continua impedindo Preview.
- PR #5 permanece aberto e não mesclado; o código do motor de questões passou CI, mas ainda depende de Supabase real, migrações aplicadas, conteúdo editorial e testes de integração/RLS.


## 19. Atualização — objetivo de estudo e dashboard real

A migração `0003_student_goals_and_dashboard.sql` acrescenta cargos publicados e objetivos de preparação individuais. Um estudante pode manter apenas um objetivo ativo, ligado ao concurso e opcionalmente ao edital/cargo; a alteração é feita por RPC autenticada e arquiva o objetivo anterior. A função de dashboard calcula questões respondidas, acertos, taxa de acerto, objetivo ativo e até cinco tentativas recentes diretamente das tabelas persistidas.

Foram adicionados:
- API para ler/salvar objetivo do estudante.
- RPC `set_student_study_goal` com validação de vínculo entre concurso, edital e cargo.
- RPC `get_student_dashboard` com métricas reais sob `auth.uid()`.
- Onboarding para selecionar concurso, edital e cargo.
- Dashboard com indicadores reais, objetivo ativo e atividades recentes.
- Catálogo e detalhe do concurso agora incluem cargos publicados.

Classificação: **parcialmente implementado** até aplicar migração 0003 e testar em Supabase real. O catálogo continuará vazio enquanto não houver concursos, editais e cargos publicados. Não existe CRUD administrativo/editorial ainda. A taxa de acerto usa todas as tentativas registradas; deve ser exibida com o volume da amostra, como está no dashboard.


## 20. Atualização — favoritos de questões

A migração `0004_question_favorites.sql` cria favoritos privados por estudante com chave primária `(user_id, question_id)`, RLS de leitura/inclusão/remoção e verificação de que a questão está publicada. Foram adicionadas APIs autenticadas para listar, favoritar e remover favoritos, botão de favorito no fluxo de resolução e página `/app/favoritas`.

Classificação: **parcialmente implementado (código e CI; migração e operação real pendentes)**. O botão fica indisponível quando a API de favoritos retorna erro, evitando uma falsa indicação de que o salvamento funcionou. Ainda não há cadernos pessoais nem filtro de questões erradas.


## 21. Atualização — favoritos validados pelo CI

O GitHub Actions run #143, no commit `ad6121be0a058d006ef9607a4fb928b68dfc6704`, concluiu com sucesso: instalação de dependências, `nuxt typecheck`, 28 testes unitários e `nuxt build`. Isso valida compilação e testes unitários do código de favoritos, onboarding, objetivos e dashboard. Não substitui testes de banco/RLS; as migrações 0001–0004 continuam sem aplicação no Supabase.


## 22. Atualização — desempenho por disciplina e fila de erros

A migração `0005_subject_performance_and_wrong_questions.sql` cria duas RPCs server-side:
- `get_student_subject_performance`: agrupa tentativas do estudante por disciplina e calcula volume, acertos e taxa.
- `get_student_wrong_questions`: seleciona a tentativa mais recente por questão e retorna apenas as que continuam incorretas, com enunciado, disciplina, fonte e alternativas.

Foram adicionadas a API da fila de revisão, a página `/app/erros`, suporte a abrir uma questão específica pela query `questionId` e desempenho por disciplina no dashboard. Os resultados são derivados de tentativas persistidas e protegidos por RLS.

Classificação: **parcialmente implementado (código preparado; migração 0005 e validação de dados reais pendentes)**. A fila de erros considera a tentativa mais recente, então uma questão respondida corretamente deixa a fila após nova submissão. Nenhuma métrica de disciplina é inventada quando não há tentativas.


## 23. Atualização — desempenho e revisão aprovados pelo CI

GitHub Actions run #155, no commit `bda023fc61232e60133cf4ecfe57eca858835145`, concluiu com sucesso: instalação, typecheck, 28 testes unitários e build. O escopo inclui a migração 0005, APIs de desempenho/revisão e páginas de revisão de erros. A execução confirma compilação e testes unitários, não execução SQL nem isolamento RLS real.


## Atualização de estado — 04/11/2026

A auditoria inicial acima descreve o ponto de partida da fundação e não representa mais o estado do branch de trabalho. Na branch feat/study-question-engine foram adicionados, como código preparado:
- Supabase SSR Auth, rotas de identidade e middleware;
- schema/RLS de concursos, editais, questões, tentativas e favoritos;
- objetivo de estudo, dashboard, desempenho por disciplina e fila de revisão;
- CI com typecheck, 28 testes unitários e build verde até o commit validado no run #155;
- migração 0006 de RBAC editorial e auditoria, helper server-side, endpoint de resumo e página /admin.

Limitações atuais: as migrações 0001–0006 não foram aplicadas em um projeto Supabase provisionado; nenhuma conta administrativa foi atribuída; não há conteúdo editorial real; os formulários CRUD ainda não foram implementados; o CI do novo módulo administrativo ainda precisa ser confirmado; e a Vercel ainda não tem deployment atualizado e saudável confirmado após o hotfix de typecheck. Portanto, as telas administrativas e de estudo são código em branch, não funcionalidades operacionais publicadas.

Consulte PROGRESS.md, ENVIRONMENT.md e docs/IMPLEMENTATION_PLAN.md para o registro atualizado das entregas e dependências.


## Administração editorial — atualização após integração

- PR #5 foi integrado à main no commit db37823eb855db865d0adc8419f7d4e942e25d5a; inclui migração 0006, RBAC, auditoria, painel administrativo e CRUD inicial de concursos.
- PR #7 está em draft e contém migração 0007 para reforçar integridade de publicação e serializar alterações concorrentes de objetivos.
- GitHub Actions run #169 passou (instalação, typecheck, 28 testes e build) no commit de código f93026925213fe47015ecb2dcdea9963515f9b6e. A validação posterior das atualizações documentais está em execução no run #170.
- O banco Supabase continua sem provisionamento confirmado; migrações e políticas ainda não foram executadas em ambiente real.
