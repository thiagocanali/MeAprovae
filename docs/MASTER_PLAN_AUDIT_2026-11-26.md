# Retomada do plano mestre — 26/11/2026 (São Paulo)

## Estado inicial conferido

- `main` e `origin/main`: `1751c05ea76f3cab42ed0a3e6d5b69db2840c2b5`; checkout limpo. PRs #72–#74 integradas; 22 telas e erro global já padronizados, sem necessidade de redesign.
- Produção Vercel `dpl_2fwASWep881K1YjZYhjnGxNK9sBJ`: READY, mesmo SHA. A consulta de workflows por SHA filtra eventos de PR e não retornou o push de main; a CI #445 da #74 é evidência anterior, não uma nova execução.
- PR #66: `702f09b`, draft, base histórica `d47dfce`, origem canônica de e-mails. PR #71: `0446a20`, draft, base histórica `67e880a`, catálogo somente rascunhos. Ambas atrás da main; diffs revisados antes da reconciliação. Nenhuma outra PR aberta nesta fotografia.
- Issues #54–#58 continuam abertas. #58 contém descrição histórica de filtros/edição que já foram implementados; não usar esse texto como diagnóstico atual. #55 já tem seleção única, disponibilidade e filtros na URL; múltiplas matérias/dificuldade em simulados continuam pendentes. #56 ainda não é um catálogo público.

## Banco e segurança — consultas somente leitura

Projeto Supabase Me Aprovaê ACTIVE_HEALTHY, PostgreSQL 17.11. Contagem atual: **60 publicadas e 200 rascunhos**, quatro concursos, zero questões com dificuldade marcada como revisada. Entre publicadas, 32 sem URL. Os 200 rascunhos autorais sem URL não constituem por si só ausência de autoria: avaliar manifests e direitos. Nenhuma tabela pública encontrada com RLS desativada. `exam_catalog_models` não existe em produção; nenhum modelo foi instalado nesta auditoria.

Ledger remoto possui 24 migrations, até `exam_subject_filters`; timestamps históricos locais/remotos diferem, conforme entregas anteriores. A migration experimental da #71 não está aplicada. Não executar `db push` para tentar igualar nomes ou timestamps.

Onze funções públicas SECURITY DEFINER reavaliadas: cinco internas de trigger, seis RPCs autenticadas. Todas fixam search_path vazio e nenhuma concede execução a anon. As RPCs de edital/alternativas checam identidade e papel editorial; objetivo/tentativa derivam o usuário de auth.uid(); has_platform_role consulta atribuição no banco. Os seis avisos do advisor precisam de análise por função, não de revogação em bloco. Testes descartáveis acrescentam negativos de metadados editáveis, chaves de recursos, consentimento e dados pessoais.

Continua o aviso de [proteção de senhas vazadas desabilitada](https://supabase.com/docs/guides/auth/password-security#password-strength-and-leaked-password-protection). Configuração não alterada. [Aviso das RPCs privilegiadas](https://supabase.com/docs/guides/database/database-linter?lint=0029_authenticated_security_definer_function_executable).

## Ambientes e limites comprovados

Consulta Vercel com `decrypt=false`, conservando apenas nomes/escopos/tipo: SUPABASE_URL e SUPABASE_ANON_KEY presentes em production/preview/development; **AUTH_REDIRECT_ORIGIN ausente nos três**. Isso não prova equivalência ou correção dos valores. Existem nomes legados NEXT_PUBLIC_* e credenciais administrativas provisionadas; não foram lidos, utilizados ou removidos. O runtime Nuxt usa apenas configuração privada URL/anon; não usa service_role para APIs pessoais.

Nenhuma branch Supabase de homologação listada. A allowlist de redirecionamento e configuração de e-mail Auth não são expostas pelos métodos de leitura disponíveis neste conector; permanecem não verificadas. Não criar uma branch com custo, extrair tokens ou configurar produção como atalho.

Não há duas credenciais de teste nem caixas de e-mail controladas fornecidas neste ambiente. Cadastro/confirmação, recuperação real, links expirados/reutilizados, revogação e isolamento de **duas contas hospedadas** permanecem bloqueados na #57. Testes HTTP com adaptador sintético e PostgreSQL descartável não encerram essa issue.

## Lote A — correções na PR #66, ainda draft

1. Reconciliação por merge de origin/main, sem reescrever histórico nem sobrescrever #72–#74.
2. Origem HTTP de localhost/127.0.0.1 aceita somente em desenvolvimento; configuração ausente/inválida falha antes de enviar e-mail.
3. Política private/no-store para APIs pessoais, Auth, administração, callback e páginas SSR privadas, incluindo erros e redirects. Bridge de cookies aplica os headers de proteção enviados pelo SDK SSR 0.12.7 e mantém chunks/remoções.
4. Contratos HTTP reais H3 com Auth sintético: validação, minimização de dados, confirmação, Host forjado, erros genéricos, sessão expirada, logout local, callback inválido/expirado e allowlist de next. Papel editorial consultado no banco, ignorando user_metadata.
5. Testes do bridge SSR: cookies de entrada/rotação/remoção, SameSite/Secure fornecidos pelo SDK, cliente por requisição e getUser; não confiar em getSession para autorização.
6. PostgreSQL descartável: leitura/escrita entre A/B de perfil, favoritos, acompanhamento, objetivos, tentativas, sessões/itens e preferências; RPCs por ID alheio, gabarito e conteúdo editorial protegidos; consentimento de A preservado após ação de B.
7. Executor de banco rejeita PGHOSTADDR remoto, PGSERVICE/PGSERVICEFILE e PGDATABASE com connection string antes de qualquer psql. Evita bypass da proteção de loopback por opções libpq.
8. Documentação de implantação atualizada e gates de homologação explícitos. Nenhuma variável, segredo, conta ou dado produtivo alterado.

## Dependências e varredura limitada

`pnpm audit --prod --json` apontou **9 moderados e 2 baixos, sem alto/crítico**. Inclui Nuxt 4.6.3 (correções em 4.6.4), glob e minimatch transitivos. O advisory [GHSA-r99w-jh2x-3mg9](https://github.com/advisories/GHSA-r99w-jh2x-3mg9) é relevante à normalização de caminhos/middleware; [GHSA-96x6-fvhx-49hg](https://github.com/advisories/GHSA-96x6-fvhx-49hg) envolve erros SSR. Preparar atualização e regressão em frente separada; não incorporar atualização ampla e Auth na mesma alteração sensível.

Varredura limitada de arquivos versionados para marcadores de chave privada e tokens GitHub/Supabase secret: zero correspondências. Não é uma certificação de ausência de segredos nem varredura de histórico completo. Nenhum valor de configuração foi impresso.

## Backlog por dependência

| Ordem | Frente | Situação e próximo passo |
| --- | --- | --- |
| P0 | #57 / #66 | Código/testes avançados; faltam origem por ambiente, allowlist e duas contas/caixas controladas. Manter draft até homologação e aprovação específica. |
| P0 transversal | Dependências | Atualizar Nuxt para patch corrigido e revisar transitivos em PR própria; congelar lock e repetir navegação/build. |
| P1 | #56 / #71 | Reconciliar main; reforçar integridade da composição, grants, RLS e testes descartáveis; não aplicar em produção. |
| P1 | API/interface editorial | Depende de contrato persistente; publicação bloqueada. Construir operações de rascunho auditadas e testes antes da liberação. |
| P1 | #54 | Revisar 60 + 200 por família e individualmente; não marcar revisão humana nem publicar IA automaticamente. |
| P1 | #55 | Várias matérias, distribuição e dificuldade revisada, preservando disponibilidade real/prazos. |
| P1/P2 | Fontes e estudante | Revalidar 36 referências, corrigir UX pontual e dashboard com dados reais, depois acessibilidade/performance. |

## Validação e retomada

Artefatos locais em `/workspace/work/master-plan-2026-11-26`. Instalação congelada, typecheck, testes, build Vercel e suíte SQL descartável executados; resultados finais de CI e SHAs registrados na PR. Banco local usa postgres:17, isolado de redes de produção; identidades sintéticas e transações de teste revertidas.

Lote A não autoriza integração: `AUTH_REDIRECT_ORIGIN` ausente causa 503 no código proposto em ambientes hospedados. Homologar configuração e jornadas com e-mails controlados, registrar ambiente/deployment/commit sem tokens e obter aprovação específica antes de remover draft. Avançar para as tarefas independentes da #71 e manutenção de dependências enquanto isso. Não alterar produção Supabase/Neon, permissões ou Vercel manualmente.

## Checkpoint dos lotes A e B

- #66: `0e12e6991769c55dd999ffde847835563934f0fa`, CI #447 (45922649039) verde; **draft, não integrada** pelos gates de Auth acima.
- #71: `3516dd4604f0c2024c61f616483f83b70fb9804c`, CI #448 (45923198074) verde; **draft, não integrada**, schema somente descartável. Integridade, snapshots editoriais, auditoria e concorrência reforçados. Ver documentação na branch/PR #71.
- A proteção do executor libpq e o teste SQL de isolamento são independentes da mudança de Auth e podem seguir com manutenção de segurança. Essa promoção não integra o restante da #66 nem aplica DDL da #71.
- Continuidade: concluir patch de dependências; depois lote C de API de rascunhos auditada na frente #71. Publicação, revisão humana e Auth hospedado permanecem condicionados às suas evidências/aprovações, sem atalhos.

## Manutenção independente — segurança de dependências e testes

Nuxt passa a **4.6.4**, com lock regenerado por pnpm **9.15.9**, agora declarado em packageManager. Vite permanece na versão previamente testada **8.3.5** por override e o peer opcional Rolldown fica explicitamente em **1.2.15** no desenvolvimento, compatível com a faixa do Nuxt. A resolução automática inicial escolheu Rolldown 1.3.4 fora da faixa; a pinagem elimina o aviso de peer sem ignorá-lo. Supabase SSR e supabase-js conservam as mesmas versões.

O único override de segurança adicional é `readdir-glob@3.0.0>minimatch: 11.0.9`, limitado à cadeia archiver/Nitro. O major corrigido tem engine compatível com Node 22. Smoke de ZIP via archive.glob confirmou inclusão de arquivos aninhados, exclusão por padrão ignore e saída ZIP válida. Reavaliar a remoção desse override quando readdir-glob adotar a versão corrigida; não substituir todos os consumidores indiscriminadamente.

Após atualização: `pnpm audit --prod --json` retornou **zero alertas em todas as severidades**, contra nove moderados/dois baixos anteriores. Esse resultado depende do feed consultado e não cobre configuração Auth, RLS ou segurança editorial.

A primeira tentativa local de testes simultânea à preparação do Nuxt falhou em dois arquivos por `.nuxt/tsconfig.json` ausente; nenhum teste de negócio indicou regressão. Corrigidos os scripts `test` e `test:watch` para executar `nuxt prepare` antes de Vitest. Reexecução final: 185 testes/28 arquivos aprovados; o resultado parcial inicial não foi contado como aprovação.

A manutenção inclui apenas as proteções independentes de executor SQL e testes de isolamento antes propostas na #66. **Não inclui** auth-origin, runtimeConfig novo, alterações em handlers Auth/cookies/cache, migrations de catálogo, publicações ou dados. O design e as 22 rotas permanecem preservados. Matriz Chromium pós-patch: 176 combinações, sem overflow/erros JavaScript, incluindo 404, formulários simulados, menus, resposta, resultado e comparação; não é homologação do Auth hospedado.

Validação final da manutenção: instalação congelada com pnpm 9.15.9, typecheck, 185 testes, suíte SQL completa com novo isolamento, dois builds Vercel consecutivos, quatro suites Chromium (matriz de 176 combinações, concursos, provas oficiais e oito cenários de prática) aprovados. Audit completo e de produção retornaram zero alertas. Evidências locais sob master-plan-2026-11-26 e resultados remotos na PR de manutenção.
