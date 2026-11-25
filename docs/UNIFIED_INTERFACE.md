# Interface unificada — 25/11/2026

A identidade aprovada em Concursos passa a todas as páginas existentes. Ciclo: tokens de tema; navegação compartilhada; área de estudo; editorial; acesso/página inicial; estados de erro; regressões e documentação.

## Inventário conferido no código

| Layout | Rotas |
| --- | --- |
| Público | `/` |
| Acesso | `/login`, `/cadastro`, `/esqueci-senha`, `/redefinir-senha` |
| Estudante | `/app`, `/app/concursos`, `/app/concursos/[slug]`, `/app/questoes`, `/app/provas`, `/app/provas-oficiais`, `/app/simulados/[id]`, `/app/desempenho`, `/app/comparar`, `/app/favoritas`, `/app/erros`, `/app/historico`, `/app/onboarding` |
| Editorial | `/admin`, `/admin/revisao`, `/admin/acervo`, `/admin/importar` |
| Erro global | `app/error.vue`: 404 e falhas gerais com retorno ao início |

São 22 páginas e o tratamento global de erro. O teste compara seu inventário com os arquivos reais em `app/pages`, evitando deixar uma rota de fora.

## Contrato visual

- `WorkspaceShell` generaliza a antiga estrutura de Concursos; mantém sidebar, barra superior, rodapé e link de pular conteúdo. Menu móvel expansível, fechamento por rota/Escape, foco e indicação da rota ativa.
- `PublicShell` atende página inicial, formulários e erro global. Layout `auth` acrescenta introdução em desktop e mantém formulário compacto no celular.
- Os layouts Nuxt são selecionados por `definePageMeta`; cada página fornece apenas seu conteúdo, sem cabeçalho/main duplicado. Um controle de tema por tela e preferência persistente existente.
- `design-system.css` centraliza cores, superfícies, botões, formulários, cartões, alertas e gráficos. Adaptadores das classes legadas preservam conteúdo e comportamentos, sem reescrever páginas inteiras. Claro em fundo neutro com verde-lima; escuro em azul profundo com verde-menta.
- Comparação, favoritas, revisão de erros, histórico e objetivo permanecem acessíveis no menu comum. O espaço editorial aparece na navegação das próprias rotas editoriais; sua apresentação não concede permissões.

## Preservação e limites

Não há alteração de endpoints, lógica de sessão, middleware, autorização, RLS, schema, dados, publicação de conteúdo ou dependências. Formulários conservam handlers e validações. O botão de sair continua no painel inicial. A mudança é visual/estrutural e não encerra as pendências funcionais/editoriais dos ciclos anteriores.

As verificações de navegador usam APIs sintéticas: não enviam respostas, não criam usuários e não alteram conteúdo real. Cobrem estados preenchidos, erro/recuperação, login pendente, confirmação de cadastro, recuperação/redefinição de senha, saída, resposta de questão, resultado de simulado e comparação. Não constituem homologação do provedor Auth hospedado. O overlay de desenvolvimento do Nuxt é excluído da contagem de landmarks na página de erro.

## Validação reproduzível

```sh
pnpm typecheck
pnpm test
NITRO_PRESET=vercel pnpm build
TEST_BASE_URL=http://localhost:3012 node tests/browser/unified-interface.cjs
TEST_BASE_URL=http://localhost:3012 node tests/browser/contests.cjs
TEST_BASE_URL=http://localhost:3012 node tests/browser/official-exams.cjs
TEST_BASE_URL=http://localhost:3012 node tests/browser/question-practice-races.cjs
```

Os scripts Chromium aceitam `PLAYWRIGHT_MODULE` e `CHROMIUM_PATH` quando as ferramentas estão instaladas fora do projeto. `UI_ARTIFACT_DIR` define o destino das capturas e de `coverage.json` da matriz: 22 rotas × dois temas × quatro larguras (320/390/768/1440), total de 176 combinações. Evidências de execução local em `/workspace/work/visual-unification`, sem versionar artefatos de máquina. Execução local: 179 testes unitários e 27 arquivos aprovados; matriz de 176 combinações sem overflow nem erros JavaScript; regressões de concursos, biblioteca oficial e oito cenários de prática aprovadas. Typecheck e build Vercel também verificados. CI/deploy são registrados na PR.

Reversão: reverter o commit da interface e aguardar o deploy Git habitual. Não há migração ou reversão de dados.
