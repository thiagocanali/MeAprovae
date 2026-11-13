# Reformulação 2026 — registro de execução

## Objetivo
Unificar a experiência visual e funcional do Me Aprovaê sem perder dados, sessões, contratos de API ou progresso existente. A reformulação será entregue em PRs verificáveis, com preview e CI antes de integrar à produção.

## Entregue na PR #51
- Tokens globais de espaçamento, raios, foco e movimento reduzido em `app/assets/css/main.css`.
- Navegação compartilhada em `app/components/StudentNavigation.vue`, aplicada a 11 páginas: início, questões, simulados, desempenho, concursos, detalhe de concurso, favoritos, erros, histórico, onboarding e comparação.
- Camada visual posterior aos estilos legados em `app/assets/css/design-system.css` para contêineres, cards, indicadores, formulários, tabelas, botões e menu responsivo.
- Ordem explícita das folhas de estilo em `nuxt.config.ts`.

## Limites de validação
- Alterações feitas por integração GitHub, sem checkout local e sem execução local de testes ou navegador nesta etapa.
- O status de CI/preview deve ser reavaliado para o último commit, não para commits anteriores.
- Não houve migrations, importação de conteúdo ou alteração de dados.
- A inspeção visual em dispositivos reais e o fluxo autenticado ponta a ponta permanecem pendentes.

## Próximas tarefas, em ordem
1. Validar preview da PR #51 em desktop/tablet/celular; corrigir eventuais regressões de CSS e de roteamento.
2. Inventariar e padronizar páginas ainda fora do componente de navegação, especialmente simulados individuais e área editorial, mantendo permissões.
3. Criar componentes reutilizáveis de cabeçalho, estado vazio, indicador e filtro com testes.
4. Reformular questões e desempenho com pesquisa e filtros reais, preservando idempotência e agregações.
5. Validar login, cadastro, respostas, favoritos, sessões de simulados, resultados e histórico em ambiente integrado.
6. Tratar issue #37 com transação PostgreSQL segura e testes de rollback/RLS.
7. Expandir acervo com lotes originais/licenciados, revisão humana e procedência verificável; nunca publicar rascunhos automaticamente.

## Critério de conclusão
A PR de fundação não equivale à conclusão da reformulação. Exigir CI, preview e inspeção visual antes de merge; para as fases posteriores, validar fluxos autenticados e dados reais.

## Continuação — navegação de simulados e editorial
- Simulado individual `app/pages/app/simulados/[id].vue` agora usa `StudentNavigation` sem alterar cronômetro, respostas ou persistência.
- Componente `app/components/AdminNavigation.vue` criado para a área editorial, mantendo seus links de gestão, fila, acervo, importação e retorno à área do estudante.
- Migradas as páginas `app/pages/admin/index.vue`, `acervo.vue`, `revisao.vue` e `importar.vue`.
- Melhorado o estado ativo e a rolagem móvel dos botões de navegação entre questões do simulado.
- Total desta PR: 12 telas do estudante e 4 páginas editoriais com cabeçalhos compartilhados.
- Validação visual e testes de integração ainda necessários antes de merge.

## Correções e validação — continuação
- GitHub Actions run **43447579476** (commit `deaefaee`): jobs `validate` e `database` concluídos com sucesso. O job `validate` passou typecheck, Vitest, verificação de cálculos, build Vercel e repetição do build com cache.
- O status de deploy Vercel desse commit falhou por `build-rate-limit` da conta, **não** por erro de compilação comprovado. Novos commits exigem nova validação de CI.
- Corrigida a atualização dependente dos filtros de prática: alterar a disciplina limpa o assunto imediatamente via `watch(..., { flush: 'sync' })`, evitando consultas com disciplina e assunto incompatíveis.
- Falha no carregamento do catálogo de filtros agora oferece ação de nova tentativa (`refreshCatalog`).
- Mantida a PR sem merge até os checks mais recentes passarem e existir evidência suficiente da experiência visual.

## Continuação — acessibilidade de desempenho
- Resumo textual dos indicadores de desempenho disponibilizado para tecnologias assistivas.
- Mensagem de carregamento com região de status e erro de consulta com botão de nova tentativa padronizado.
- Filtros de período e fuso horário receberam estilos e áreas de interação consistentes.
- GitHub Actions run **43448301944** (CI #270) iniciado para `684dbfe`; verificação de banco concluída com sucesso, validação de aplicação ainda em andamento no momento da consulta.
- Commits posteriores exigem nova execução completa do CI.

## Correção de recuperação de favoritos
- CI **#273**, run `43448599623`, concluiu com sucesso para `b8dfc15`, antes desta correção.
- Corrigido bloqueio sem recuperação na prática: se a leitura de favoritos falhar, o botão de favoritar continua indisponível para evitar decisão baseada em estado desconhecido, mas a tela oferece **Tentar novamente** para atualizar o estado.
- A ação de atualização evita chamadas repetidas enquanto a tentativa está em andamento.
- A Vercel permanece bloqueada por limite de builds; não foi feito merge nem alteração no ambiente de produção.

## Encerramento seguro de simulados
- CI #275, run `43507177266`, concluído com sucesso no commit `2224fb9`.
- Encerrar um simulado com respostas pendentes agora exige uma confirmação explícita, com quantidade de questões sem resposta e ação para voltar à resolução.
- A confirmação é descartada quando o estudante muda de questão ou quando o total de respostas pendentes muda.
- Simulados totalmente respondidos continuam com finalização direta.
- Os commits desta seção exigem nova validação automatizada e visual antes do merge.

## Robustez da retomada de simulados
- CI #278 (run `43507618885`) concluído com sucesso no commit `c7a2d8a`.
- Sincronização manual de respostas/resultado agora tem estado de carregamento e bloqueia solicitações concorrentes.
- Navegação entre questões valida limites do índice e normaliza o índice atual se uma sessão sincronizada retornar menos questões.
- Mudanças posteriores ao CI #278 ainda precisam de validação.
