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
- [ ] Disciplinas, assuntos e subassuntos associados à versão de edital/cargo.
- [ ] Pesquisa, filtros e favoritos.
- [ ] Aplicar migração e validar isolamento de concursos acompanhados.
**Saída:** objetivo de estudo selecionável e edital navegável.

## Fase 4 — banco de questões
- [x] Criar schema de questões, alternativas, gabarito privado, explicação e fonte.
- [x] Criar listagem autenticada de questões e interface de resolução.
- [x] Criar RPC server-side transacional para tentativa idempotente.
- [x] Criar histórico privado e painel inicial de acertos.
- [ ] Aplicar migração e validar RPC/RLS com duas contas.
- [ ] Criar CRUD editorial, importação e curadoria/licenças do conteúdo.
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
- [ ] Montagem, cronômetro, salvamento e retomada.
- [ ] Finalização transacional, correção e relatório.
- [ ] Histórico e comparação.

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
- [ ] CRUD de editais, cargos, disciplinas, assuntos, questões, alternativas e gabaritos com validação e publicação controlada.
- [ ] CRUD editorial completo com formulários, validação, fluxo de rascunho/publicação e gestão de fontes/licenças (questões, cargos e vínculos de disciplinas ainda pendentes).
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
