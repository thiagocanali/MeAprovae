# Resiliência dos filtros de simulados — 24/11/2026

## Contexto
O gerador de simulados já permite concurso, matéria e assunto. Esta entrega não altera o SQL, não cria modelos de catálogo e não adiciona conteúdo ao acervo.

## Regras de interface
- IDs ausentes significam filtro amplo. IDs inválidos/arrays na URL **não** podem ser transformados silenciosamente em filtros amplos.
- O número de questões de URL é interpretado somente como inteiro decimal explícito; entradas ambíguas são inválidas e impedem início da sessão.
- A disponibilidade retornada pela API só habilita o botão quando os filtros retornados **coincidem exatamente** com a seleção atual; também exige contagens consistentes.
- Quando o catálogo é carregado, um assunto que não pertence à matéria selecionada deve bloquear o início e exibir mensagem compreensível.
- A quantidade de questões nunca pode superar o acervo real elegível; nenhuma matéria adicional deve ser incluída silenciosamente.
- Estado pendente e mensagens de validação são anunciados de forma acessível.

## Evidências e limites
- Testes unitários em `tests/unit/exam-filter-ui.test.ts` cobrem URLs malformadas, respostas antigas e relação matéria/assunto.
- Os contratos de API e as migrations de banco existentes permanecem inalterados.
- CI da PR deve validar typecheck, testes, builds e PostgreSQL descartável antes do merge.
- Testes de navegador com sessões reais, múltiplas matérias e regressões mobile mais amplas permanecem na issue #55.
