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
