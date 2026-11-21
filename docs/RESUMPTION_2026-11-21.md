# Retomada verificada — 21/11/2026

## Fontes e ponto de partida

Revisão do histórico disponível nesta conversa, código, documentação, commits remotos, estado da Vercel e contagens agregadas do Supabase. Não houve acesso a conversas independentes deste fio. Os desenvolvimentos posteriores foram reconstruídos pelos arquivos e pelo Git, sem tratar descrições de commits como prova de conclusão.

A cópia local estava em `b6104a4` (#45), na branch `feat/question-filters-url`, com alterações não commitadas apenas em `app/pages/app/questoes.vue`. A consulta ao remoto revelou `c0449783b3639383e90966d47725df52cc0b3233`, com entregas adicionais até 21/11. O diff local foi preservado em patch e stash antes da atualização; sua reaplicação manteve a orientação de dificuldade revisada e os estados vazios acrescentados na #47.

## Arquitetura preservada

Monólito Nuxt 4.6.3/Vue 3/TypeScript com APIs Nitro, Supabase SSR/PostgreSQL, migrations SQL, Vitest e Vercel. A ADR antiga cita Drizzle como proposta; ele não é dependência da aplicação atual. Não introduzir ORM ou migrar de framework para executar essa proposta histórica.

## Últimas entregas conferidas

| Commit / PR | Evidência no código | Limite |
| --- | --- | --- |
| c044978 / #61 | Inventário, propostas de 300 distratores, gerador e checker | Não publica nem aprova os 100 rascunhos |
| 5c7ba08 / #60 | API de disponibilidade, filtros de simulados, quantidade 1–20, migration e testes | Modelos editoriais de provas continuam planejados |
| 8a03e84 / #59 | RPCs editoriais atômicas, APIs, testes de rollback e concorrência | Não equivale a revisão do conteúdo |
| 853caef / #52 | Registro de sondagens de isolamento | Escopo e limites descritos no próprio relatório |
| 139c961 / #53 | Link da favorita para questionId | Não recriar o fluxo |
| 627cbd7 / #50 | Propostas técnicas de Informática | Sem aprovação humana ou alteração remota |
| 7c82369 / #49 | Primeiro acesso orientado para prática | Acervo piloto continua pequeno |
| 13ff8db / #48 | nuxt prepare antes do build, repetição de build no CI | Preservar ao validar esta entrega |
| c6963eb / #47 | Explicação de dificuldade e recuperação de resultado vazio | Preservada na reaplicação do rascunho |
| 04c7f96 / #46 | Mensagens de autenticação e diagnóstico de visitantes | Não confirma jornada autenticada completa |
| b6104a4 / #45 | Revisões de contexto e regressão de operações atrasadas | Reexecutada ao alterar filtros |

Também estão presentes resolução/histórico/favoritos, objetivos e catálogo, importação editorial em rascunho, simulados privados com prazo no servidor, desempenho por período e comparação voluntária agregada. Essas implementações foram lidas; não se assume que toda jornada hospedada foi exercitada nesta retomada.

## Estado externo observado

- Vercel: produção READY em `c044978`, deploy `dpl_CHpxTEC7Hx1pgGKhzT8QvadBqNgm`, antes desta entrega.
- Supabase: consulta somente leitura confirmou 60 questões publicadas e 100 rascunhos. Nenhuma questão, preferência, tentativa ou conta foi alterada nesta revisão.
- O acervo grande ainda não está concluído. Metas de 1.000 questões e modelos editoriais são planejamento; gabaritos conferidos automaticamente não substituem curadoria humana.

## Pendências e continuidade

1. Concluir o rascunho de filtros da prática na URL: fonte de estado única, voltar/avançar, reabrir links e limpeza atômica de disciplina/assunto/dificuldade.
2. Revisar e publicar conteúdo pelo fluxo editorial existente, com autoria, direitos, fontes, dificuldade e explicações verificadas. Não sobrescrever releases nem questões com histórico.
3. Construir modelos editoriais de simulados com composições distintas após haver conteúdo revisado suficiente.
4. Completar a validação integral com Supabase Auth hospedado. Testes locais com adaptadores/fixtures não comprovam essa jornada.
5. Revisão espaçada, calendário, flashcards, comunidade e tutor permanecem funcionalidades futuras; não existem apenas por constarem do roadmap.
6. README, roadmap e ADRs têm trechos históricos desatualizados. Este registro diferencia implementação observada de propostas, sem reescrever decisões históricas como se já tivessem sido aprovadas.

## Filtros da prática

A URL passa a definir os três controles. Cada escolha cria uma entrada de histórico. Trocar disciplina remove o assunto na mesma navegação; limpar filtros remove os três juntos, preservando concurso, questão específica, outros parâmetros e fragmento. O botão de todas as dificuldades remove apenas a dificuldade.

O link guarda filtros, não posição na lista, alternativa marcada, resultado ou tentativa. Voltar a um filtro inicia a lista novamente e não recupera uma resposta antiga. O servidor mantém a validação dos filtros e suas permissões anteriores.

Validação local: typecheck, 140 testes unitários, os dois checkers de matemática e build com preset Vercel aprovados. Oito cenários Chromium móvel passaram, incluindo os sete de concorrência anteriores e o fluxo de filtros/histórico/link. Sem erros de página ou overflow horizontal. Referências de CI/deploy são registradas no PR. O teste Chromium usa APIs simuladas, sem contas ou tentativas remotas; reabertura por nova montagem da página não é teste independente de recarga SSR autenticada.
