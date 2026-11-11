# Fila de revisão editorial

A página `/admin/revisao` oferece uma lista paginada para trabalhar o acervo sem depender das primeiras 200 questões do painel geral. O acervo de releases também tem um atalho que abre a fila já filtrada pelo lote e por rascunhos.

## Filtros e navegação

- Status: rascunho (padrão), publicado, arquivado ou todos.
- Disciplina e lote original de repositório, combináveis.
- Pendência de dificuldade: mostra apenas difficulty_reviewed=false. Isso não significa aprovação/reprovação pedagógica de enunciado, gabarito ou direitos.
- Busca por trecho do enunciado, sem diferenciar maiúsculas/minúsculas. Percentual, sublinhado e barra invertida são tratados como texto literal, sem expandir wildcards LIKE.
- 20 itens por página, com opção de 50. Alterar filtros volta à página 1. Os filtros ficam na URL e são restaurados ao recarregar ou navegar pelo histórico do navegador.

A ordenação usa created_at e id decrescentes, evitando empate entre questões instaladas na mesma transação. Mudanças simultâneas no acervo ainda podem alterar a composição das páginas: a lista não é um snapshot transacional entre navegações. Páginas fora do resultado atual oferecem retorno à primeira página.

Os resultados mostram resumo do enunciado, disciplina, assunto, fonte, status e dificuldade apenas quando revisada. Não carregam gabaritos nem explicações na listagem. O link abre a questão completa no editor existente; revisão, edição e publicação continuam usando suas regras e autorizações. Não há aprovação ou publicação em lote.

## API e segurança

GET `/api/admin/review-queue` exige sessão e papel editorial via requirePlatformEditor, além das políticas RLS existentes. Não usa chave privilegiada nem altera dados, schema ou grants.

Parâmetros: page (1–10000), pageSize (1–50), status (draft/published/archived/all), pending (all/difficulty), subjectId e releaseId (UUIDs), search (até 200 caracteres, espaços externos removidos). Parâmetros repetidos/arrays nos campos aceitos são rejeitados com 400. IDs de lote válidos sem itens resultam em lista vazia.

O filtro por release segue o contrato atual de até 100 questões por lote de repositório. A API lê no máximo 101 vínculos e sinaliza erro se esse limite for excedido, em vez de truncar silenciosamente. A contagem exata corresponde a todos os filtros combinados; não é a contagem dos itens da página.

Limites de escala: busca por substring e count exato exigem medição de planos antes de milhões de questões. Esta entrega remove o corte silencioso de navegação e limita o payload, mas não implementa busca textual indexada nem paginação por cursor.

## Validação

Testes de domínio cobrem defaults, composição, limites, arrays/IDs inválidos e escape de busca. A verificação local usa o banco descartável com os 100 rascunhos do lote, PostgREST/JWT e a aplicação Nuxt reais; apenas Auth é um adaptador de identidades de teste. Resultados da execução e de CI/implantação são registrados na descrição do PR.

Não houve publicação, reclassificação de dificuldade, revisão humana atribuída automaticamente ou alteração do acervo nesta entrega.

Execução local concluída: 100 resultados com páginas de 20 sem sobreposição, filtros de disciplina/lote/dificuldade combinados, cinco resultados para busca sem distinção de caixa por JUROS SIMPLES, dez resultados literais para %, zero para %_, consultas inválidas com 400, filtro restaurado após reload e abertura no editor. Estudante recebeu 403. Nenhum erro de página foi observado. Typecheck e 96 testes unitários aprovados.

Build local com preset Vercel aprovado. O reset limpa também campos ainda não aplicados, mesmo quando a URL já está nos filtros padrão.
