# Plano de implementação — Me Aprovaê

Este plano é vivo. Os itens marcados como concluídos possuem evidência em [PROGRESS.md](../PROGRESS.md); requisitos planejados não são funcionalidades implementadas.

## Fase 0 — auditoria e preparação
- [x] Confirmar repositório, branch padrão e permissão de escrita.
- [x] Confirmar integração GitHub/Vercel e último deployment READY.
- [x] Identificar o estado real da aplicação e documentar lacunas.
- [ ] Obter árvore completa do repositório e executar checkout local para `git status` e comandos npm.
- [ ] Gerar lockfile e pipeline CI.

## Fase 1 — infraestrutura e identidade (P0)
- [ ] Decidir/provisionar PostgreSQL gerenciado e configurar `DATABASE_URL`.
- [x] Escolher Supabase Auth como integração inicial, condicionada a provisionamento e teste.
- [x] Preparar cliente SSR com cookies e verificação server-side.
- [x] Implementar endpoints e telas iniciais de cadastro/login/logout.
- [x] Preparar solicitação de recuperação e redefinição de senha.
- [x] Criar migração de perfil com RLS e trigger de criação.
- [x] Extrair e testar validação compartilhada de entradas de cadastro/login.
- [ ] Provisionar projeto Supabase e configurar variáveis nos ambientes.
- [ ] Aplicar/testar migração em banco real.
- [ ] Validar confirmação de e-mail, recuperação de senha e renovação de sessão.
- [ ] Testar isolamento entre duas contas distintas.
- [ ] Adicionar perfil editável e preferências.
- [x] Configurar Vitest, testes unitários e workflow CI.
- [x] Obter CI verde para typecheck, 28 testes unitários e build no motor de questões.
- [ ] Adicionar testes de integração/RLS/idempotência com Supabase provisionado.
**Saída:** estudante autenticado com dados privados persistidos e isolados.

## Fase 2 — dashboard mínimo
- [ ] Criar dashboard após existirem registros reais.
- [ ] Calcular tentativas, acertos, tempo e progresso por consultas persistidas.
- [ ] Implementar estados de carregamento, vazio e erro.
**Saída:** painel sem números artificiais.

## Fase 3 — concursos e editais
- [x] Criar schema de concursos, editais, disciplinas e tópicos com RLS.
- [x] Criar APIs de catálogo/detalhe e acompanhar/deixar de acompanhar.
- [x] CRUD inicial de concursos (PR #5 integrado) e editais (PR #8 em draft; validação de banco pendente).
- [x] Cadastro inicial de disciplinas e associação transacional a editais (PR #8 em draft; migração 0008 ainda não aplicada em Supabase).\n- [ ] Assuntos e subassuntos associados à disciplina/edital/cargo.
- [ ] Pesquisa, filtros e favoritos.
- [ ] Aplicar migração e validar isolamento de concursos acompanhados.
**Saída:** objetivo de estudo selecionável e edital navegável.

## Fase 4 — banco de questões
- [x] Criar schema de questões, alternativas, gabarito privado, explicação e fonte.
- [x] Criar listagem autenticada de questões e interface de resolução.
- [x] Criar RPC server-side transacional para tentativa idempotente.
- [x] Criar histórico privado e painel inicial de acertos.
- [ ] Aplicar migração e validar RPC/RLS com duas contas.
- [x] Criar CRUD editorial inicial de concursos, editais, disciplinas, cargos, questões, alternativas e gabaritos; importação e curadoria/licenças seguem pendentes.
- [ ] Adicionar filtros, busca, favoritas, cadernos e questões erradas.
**Saída:** ciclo de questão completo e auditável.

## Fase 5 — progresso e aprendizagem
- [x] Criar RPC de dashboard com questões respondidas, acertos, taxa, objetivo ativo e últimas tentativas.
- [x] Criar agregação de desempenho por disciplina baseada em tentativas reais.
- [x] Criar fila de revisão com última tentativa incorreta por questão.
- [ ] Mapa de domínio do edital.
- [ ] Histórico e recomendações explicáveis.
- [x] Validar typecheck, testes unitários e build do módulo de desempenho/revisão no CI.
- [ ] Validar agregações/RPCs com dados reais no Supabase.
- [ ] Validar consultas e RLS em banco Supabase real.
**Saída:** evolução derivada de tentativas/sessões reais.

## Fase 6 — gamificação
- [ ] Regras de XP no servidor.
- [ ] Eventos de XP idempotentes e auditáveis.
- [ ] Níveis, conquistas, metas e sequência.
- [ ] Rankings após controles antifraude.
**Saída:** recompensa íntegra, sem XP controlado pelo cliente.

## Fase 7 — simulados
- [x] PR #21 implementa seleção de concurso, 10/20 questões publicadas, embaralhamento, timer, modo estudo, correção, resultado e revisão local da sessão.
- [x] Corrigir localmente idempotência de retry, nota com questões não respondidas e apresentação da resposta escolhida/correta; typecheck, testes e build passaram.
- [x] Validar timer com testes de contagem, finalização em zero, reinício sem intervalo duplicado e cancelamento no teardown.
- [ ] Obter CI atualizado e integrar o PR; Vercel permanece bloqueada por rate limit.
- [ ] Validar quantidade, filtro, timer e fluxo de resposta com conteúdo real no Supabase.
- [x] Persistir sessões/retomada, prazo no servidor e resultados privados; testes SQL e fluxo local navegador → PostgREST → PostgreSQL aprovados em 11/11/2026. Ver docs/EXAM_SESSIONS.md.
- [ ] Implementar modo prova separado, com gabarito e explicação ocultos até a finalização.
- [ ] Validar histórico, dashboard e fila de erros após tentativas do simulado em banco real.

## Fase 8 — flashcards e cronograma
- [ ] Flashcards e revisões espaçadas.
- [ ] Agenda, metas e planejamento semanal.
- [ ] Sessões e histórico de estudo.

## Fase 9 — comunidade e administração
- [ ] Perfis públicos/privados, seguidores, feed, grupos e comentários.
- [ ] Denúncias, bloqueios e moderação.
- [x] Fundação RBAC (owner/editor), RLS para operações editoriais e trilha de auditoria por trigger (migração 0006; aplicação/teste real pendentes).
- [x] Verificação server-side de papel e painel administrativo (/admin, /api/admin/overview).
- [x] CRUD inicial de concursos: criar em rascunho, listar, publicar, arquivar e reabrir.
- [x] CRUD inicial de editais e disciplinas/vínculos (PR #8 em draft).\n- [x] CRUD inicial de cargos, questões, alternativas e gabaritos com validação e publicação controlada.\n- [ ] Associar assuntos/subassuntos às disciplinas e questões.
- [x] Formulários administrativos iniciais para concursos, editais, disciplinas, cargos e questões, com validação e ciclo editorial.\n- [ ] Completar gestão editorial de assuntos/subassuntos, importação e curadoria/licenças.
- [ ] Bootstrap manual e seguro do primeiro owner após provisionar Supabase.
- [ ] Validar todas as políticas, triggers e operações com contas estudante/editor/owner no Supabase real.

## Fase 10 — tutor IA
- [ ] Provedor e limites/custos definidos.
- [ ] Chaves server-side.
- [ ] Contexto de edital e histórico com controles de privacidade.
- [ ] Testes de segurança, citações e limites de conteúdo.

## Fase 11 — prontidão de lançamento
- [ ] Testes e2e de fluxos críticos.
- [ ] Testes de segurança, acessibilidade e responsividade.
- [ ] Backup/restauração e retenção de dados.
- [ ] Monitoramento, suporte e política de privacidade.
- [ ] Revisão de custos e operação.

## Prioridades
- **P0:** credenciais/provisionamento, banco, autenticação, autorização, isolamento e integridade.
- **P1:** catálogo, questões, tentativas e progresso.
- **P2:** dashboard, gamificação, simulados, revisão e administração.
- **P3:** comunidade, IA avançada e monetização.

## Dependências que bloqueiam execução real
A configuração atual da Vercel não possui variáveis de ambiente cadastradas. O fluxo real com banco e autenticação exige provisionar o serviço e adicionar as credenciais em ambientes apropriados. O desenvolvimento de código não deve fingir que essa integração está ativa enquanto essa dependência estiver ausente.


### Atualização de 2026-11-05 — estrutura editorial de cargos

Na Fase 3, o cadastro e a associação de cargos agora estão preparados:
- [x] CRUD inicial de cargos: criar como rascunho, listar e alterar status.
- [x] Associar múltiplos cargos a um edital com RPC transacional.
- [x] Validar no banco que cargo e edital pertencem ao mesmo concurso.
- [ ] Associar assuntos/subassuntos às disciplinas e questões.
- [ ] CRUD editorial de questões, alternativas e gabaritos.
- [ ] Aplicar migrações 0001–0010 e validar RLS/transações no Supabase real.

A hierarquia editorial planejada fica: **Concurso → Edital → Cargo + Disciplina → Assunto/Subassunto → Questão → Alternativas → Gabarito**. A estrutura de assuntos/subassuntos ainda precisa ser implementada; o editor atual cobre questões vinculadas diretamente à disciplina.


### Atualização de 2026-11-05 — editor de questões
- [x] API editorial de questões.
- [x] API de alternativas com substituição atômica.
- [x] API de gabarito com validação da alternativa.
- [x] Interface administrativa dedicada para criação/edição de questões.
- [ ] Testes de integração das regras editoriais em Supabase real.

### Atualização de 2026-11-05 — interface do editor
- [x] Interface administrativa para criação e edição de questões.
- [x] Interface de alternativas e gabarito.
- [x] Listagem e ciclo editorial de questões.
- [x] Checklist visual de integridade para publicação.

- [x] Checklist visual de publicação com validação de concurso, edital, disciplina, alternativas e gabarito.
- [x] Contrato de retorno da RPC alinhado com a API editorial.

## Atualização de estado — 2026-11-05 (após PR #10)

- [x] PR #10 integrado à `main`: editor administrativo de questões, alternativas, gabarito e checklist de publicação.
- [x] CI da branch do PR #10: typecheck, testes unitários e build de produção concluídos com sucesso.
- [x] Deployment de produção do merge commit `cd1f6393394c8b8875660daf765bb66c8e82904b`: `READY`.
- [ ] Provisionar/configurar Supabase e variáveis de ambiente; a Vercel retornou zero variáveis configuradas na verificação de 2026-11-05.
- [ ] Aplicar migrações 0001–0011 e validar RLS, triggers e RPCs com contas de estudante/editor.
- [x] Corrigir a substituição atômica de alternativas preservando o gabarito pela migração 0011 (correção versionada; aplicação no banco ainda pendente).
- [ ] Validar fluxo autenticado completo em produção/preview após configuração do backend.

O estado `READY` da Vercel confirma somente que o artefato foi construído e publicado. Não é evidência de autenticação ou persistência operacional sem variáveis e banco configurados.

## Atualização após PR #11 — 2026-11-05

- [x] PR #11 integrado à `main` no commit `1fd30bf049c547213f528edbb5153ce11f194ae1`.
- [x] CI run `42034208681`: instalação, typecheck, testes unitários e build de produção aprovados.
- [x] Correção da RPC para preservar o gabarito ao substituir alternativas, versionada na migração 0011.
- [ ] Aplicar e validar migração 0011 em Supabase real (e confirmar previamente a aplicação das 0001–0010).
- [ ] Configurar variáveis de ambiente Vercel; a consulta anterior retornou zero variáveis configuradas.
- [ ] Revalidar deployment após a liberação da cota diária; o Preview do PR #11 foi recusado por `api-deployments-free-per-day`.
- [ ] Testar RLS, RPCs e fluxos com contas de estudante e editor.

O CI aprovado comprova typecheck/testes/build. Não comprova a execução das migrações nem o funcionamento do Supabase. O deployment Preview do PR #11 não foi criado devido ao limite da Vercel.


## Atualização — integridade histórica de questões (2026-11-05)

- [x] Identificar conflito entre a FK de tentativas e a substituição integral de alternativas na migração 0011.
- [x] Preparar migração 0012 para bloquear alterações de conteúdo, alternativas e gabarito após a primeira tentativa.
- [ ] Revisar a migração 0012 e obter CI aprovado.
- [ ] Aplicar migrações 0001–0012 em projeto Supabase de desenvolvimento.
- [ ] Testar edição antes/depois de tentativas, preservação do histórico, publicação/despublicação e permissões estudante/editor.
- [ ] Definir fluxo editorial de versionamento para corrigir questões já respondidas.

A migração 0012 está na branch `fix/lock-question-history`; ainda não foi integrada à `main` nem aplicada a banco real.


## Atualização pós PR #12 — 2026-11-05

- [x] Integrar proteção do histórico de questões pela migração 0012; PR #12 mesclado no commit `c83d8657df1225acb43dcbbd692c341ec462cacc`.
- [x] CI do PR #12 aprovado em typecheck, testes unitários e build de produção.
- [x] Check `Supabase Preview` associado ao commit integrado concluído com sucesso.
- [ ] Confirmar no dashboard Supabase a branch/ambiente alvo e a aplicação efetiva das migrações 0001–0012.
- [ ] Configurar `NUXT_SUPABASE_URL` e `NUXT_SUPABASE_ANON_KEY` em Development, Preview e Production na Vercel.
- [ ] Validar RLS, RPCs, idempotência, concorrência e fluxos de estudante/editor em banco real.
- [ ] Revalidar deployment Vercel após liberação do limite diário; o deploy do commit integrado foi recusado por `api-deployments-free-per-day`.

O check Supabase Preview verde não deve ser interpretado como teste completo do runtime de produção. A Vercel ainda não possui variáveis configuradas na consulta realizada em 2026-11-05.
