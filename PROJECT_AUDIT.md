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
