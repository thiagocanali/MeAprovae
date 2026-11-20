# Simulados por matéria e assunto

Primeira entrega da #55: uma matéria e um assunto opcional, combinados com concurso. O acervo de questões já oferece filtros próprios e permanece independente.

- A tela consulta a quantidade elegível antes de iniciar. Apenas questões, editais e concursos publicados com gabarito entram na consulta e no sorteio.
- Quantidade inteira de 1 a 20; duração de seis minutos por questão. O aluno pode reduzir explicitamente a quantidade quando o filtro tiver menos questões. O servidor nunca completa com outras matérias.
- Filtros e quantidade ficam na URL; os IDs são validados no servidor e o assunto deve pertencer à matéria. Erros na consulta bloqueiam o início, sem apresentar zero como resultado fictício.
- A sessão persiste concurso, matéria e assunto, composição, ordem e prazo. Repetir a requisição não sorteia novamente. Reutilizar o identificador com filtros diferentes é rejeitado.
- O contrato legado de três argumentos continua aceitando 10 ou 20 questões. Sessões anteriores mantêm filtros novos nulos e o prazo original.
- As novas RPCs públicas são SECURITY INVOKER, disponíveis apenas para authenticated; a implementação privada verifica auth.uid(), usa search_path vazio e preserva RLS e as permissões somente de leitura das tabelas.
- Nenhum conteúdo editorial é inserido ou publicado nesta entrega. A expansão do banco está na #54; modelos de simulados curados estão na #56.

## Verificação

`tests/integration/exam-filters.sql` roda em PostgreSQL 17 descartável via CI, após todas as migrações, com rollback dos dados de teste. Cobre disponibilidade, assunto incompatível, filtros persistidos, insuficiência, repetição, prazo, correção com denominador variável, isolamento entre usuários e privilégios. A suíte legada de sessões continua executando.

`tests/unit/exam-config.test.ts` cobre limites e tipos de quantidade e filtros. O CI também executa typecheck, testes unitários e duas compilações consecutivas para Vercel.

## Implantação

Aplicar somente `20261120203551_exam_subject_filters.sql` após o CI de banco passar e antes de publicar a interface/API dependente. Não usar db push/reset/repair: o ledger remoto tem versões históricas diferentes dos arquivos locais, registradas na documentação anterior. Registrar a versão gerada pelo MCP na revisão.

## Continuação da #55

Seleção de várias matérias com distribuição explícita, revisão conjunta dos filtros de questões e dificuldade revisada, paginação e testes com dois usuários reais permanecem no backlog. Esta entrega não encerra a issue inteira.
