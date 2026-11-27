# Catálogo versionado — persistência PostgreSQL em rascunho

## Escopo de homologação

A migration `20261124121500_exam_catalog_drafts.sql` prepara três tabelas aditivas:
- `exam_catalog_models`: identidade estável, tipo, título, descrição e autoria editorial.
- `exam_catalog_versions`: número de versão, quantidade, duração e estado de revisão.
- `exam_catalog_items`: ordem fixa dos IDs de questões para cada versão.

São dados **editoriais**, distintos de `exam_sessions` e `exam_session_items`, que seguem privados ao estudante e não são modificados nesta entrega.

## Restrição intencional de publicação

**Nenhum modelo pode ter status `published` ou `archived` nesta migration**: somente `draft` e `in_review` são aceitos. Mesmo SQL administrativo que tente publicar uma versão falha pela constraint. Publicar exigirá uma migration posterior, revisada, que valide elegibilidade real das questões, direitos/licenças, distribuição por matéria, snapshots imutáveis, autorização editorial e histórico de revisões. Isso evita anunciar conteúdo que ainda não foi homologado.

A duração é exatamente seis minutos por questão; contagens permitidas são de 1 a 20. Chaves estrangeiras preservam identidade de modelo/versão e questões existentes, enquanto índices dão suporte à consulta editorial. O conteúdo do catálogo permanece vazio até uma futura carga autorizada.

## Segurança e RLS

Todas as tabelas têm RLS ativada e privilégios explícitos: `anon` não pode consultar; `authenticated` tem apenas `SELECT`, condicionado ao papel editorial consultado no banco via `has_platform_role('editor')`. Usuários comuns não veem rascunhos. **Nenhum papel de navegador tem INSERT, UPDATE ou DELETE**. A escrita editorial ainda requer uma futura API/RPC com autorização reforçada e auditoria; não usar diretamente `service_role` no cliente.

O teste `tests/integration/exam-catalog-drafts.sql` usa uma transação que termina em rollback para conferir: catálogo inicialmente vazio, privilégios, políticas RLS, restrição de publicação, duração, FK, leitura editorial e bloqueio de estudantes/anônimos. O script é executado apenas com PostgreSQL descartável local na CI.

## Implantação e reversão

Esta PR é **sensível e deve permanecer draft** até validação adicional: revisão de schema e RLS, CI em PostgreSQL descartável, avaliação de dependências e plano de reversão. Não disparar Supabase migrations nem deploy de produção por conta do merge; inclusive, se o ambiente aplicar migrations automaticamente, **não integrar antes de reconfigurar esse fluxo**. Nenhum backfill, importação de questões, exclusão ou migração Neon é necessário.

Rollback operacional preferencial: manter as três tabelas inativas até homologação. Reverter DDL somente com avaliação de registros existentes e backup; não publicar comando destrutivo de drop automático.

## Próxima etapa
Criar API editorial autorizada e fluxo de preparação de modelos, preservando snapshots de questões, revisão humana e a separação das sessões existentes. A publicação real fica bloqueada até validação e aprovação específicas.

## Lote B — reconciliação e integridade, 26/11/2026

Branch reconciliada por merge com `main` `1751c05`, preservando conteúdo e design. A migration ainda não aplicada foi evoluída na própria PR draft; não editar uma migration já instalada para reproduzir esse procedimento em produção.

### Contrato persistente reforçado

- Título, descrição e tipo são copiados para cada versão ao criar o rascunho. Alterar os valores padrão do modelo não altera uma versão anterior. Número/modelo de uma versão existente não podem ser trocados.
- Itens guardam matéria explícita conferida contra a questão. A distribuição é agregável por matéria sem depender de alterações futuras da classificação da questão. Posição não excede a quantidade declarada; questões e posições duplicadas continuam proibidas.
- Rascunho pode ficar incompleto enquanto é editado. Para entrar em `in_review`, precisa ter exatamente a quantidade declarada, posições contíguas 1..N e uma matéria nos temáticos ou pelo menos duas no multidisciplinar. Referências arquivadas e matérias divergentes da origem são rejeitadas.
- `in_review` congela metadados e composição. Voltar a `draft` é uma operação explícita antes de editar ou excluir. Excluir o modelo não contorna o congelamento por cascade.
- Escritas dos itens bloqueiam a linha da versão; a transição para revisão serializa com essas escritas. Teste concorrente verifica lock, rollback da tentativa concorrente e posterior transição válida.
- As três tabelas usam o mecanismo existente `capture_editorial_change`, registrando ator, antes/depois e ação. SQL administrativo sem identidade Auth gera ator nulo, sem inventar revisão humana. Para versões/itens com chave composta, `record_id` do mecanismo legado é nulo; consultar as chaves presentes em old_data/new_data. Um índice/contrato de consulta específico deve ser definido junto à API de auditoria, sem anunciar essa API como pronta.
- Helpers de integridade são invoker em schema privado e não criam RPC privilegiada. Índices das FKs de matéria/autoria/revisor evitam varreduras em referências. Revisor usa FK restritiva: apagar o usuário não deve deixar reviewed_at sem identidade nem remover evidência silenciosamente.

### Matriz de acesso e limites

Anon sem SELECT; estudantes sem linhas; editor e owner podem ler rascunhos. Nenhum desses papéis de navegador pode INSERT, UPDATE, DELETE, TRUNCATE, REFERENCES ou TRIGGER nas tabelas. Testes conferem todos esses privilégios, além de DELETE/TRUNCATE reais negados. Grants e políticas não foram instalados em produção.

`in_review` significa **solicitação em revisão**, não aprovação. Pode conter questões em rascunho; isso nunca concede disponibilidade ao estudante. As snapshots de matéria/metadados não são snapshots de enunciado/gabarito. Questões podem mudar em seu próprio fluxo editorial: uma futura publicação deve revalidar elegibilidade sob locks e fixar snapshots completos. Publicação e arquivamento de versões continuam proibidos por constraint; não existe endpoint de escrita, catálogo público ou início de sessão por modelo nesta etapa. As sessões privadas existentes não são alteradas.

### Homologação e próxima etapa

Executados testes de integridade/RLS e concorrência em postgres:17 descartável; suíte completa/CI e SHAs finais registrados na PR #71. Nenhum registro real ou migration remota alterado. Rollout depende de revisão de schema/RLS, aprovação específica e avaliação das futuras RPCs auditadas. Rollback preferencial mantém tabelas inativas; não executar DROP automático. O build atual não aplica migrations na Vercel; o runner SQL pertence ao job descartável da CI.

Próximo passo do lote C: contratos e RPC transacional de rascunho/revisão com editor validado no banco, distribuição e consulta de auditoria por chave composta; validar concorrência, autoria e rollback antes da interface. Não abrir writes diretos ao navegador nem disponibilizar publicação como atalho.

## Evolução C de 27/11/2026 — operações de rascunho

A proposta agora inclui uma segunda migration, gerada pelo CLI, e uma [API editorial](EXAM_CATALOG_EDITORIAL_API.md). Ao contrário do estágio B somente leitura, C propõe RPC transacional de rascunhos para editores/owners, com identidade/papel checados novamente no banco, CAS de revisão, replay de criação/clonagem e auditoria. **Não concede escrita direta nas tabelas** nem publicação. O novo writer definer é privado, explícito e testado; helpers de integridade continuam invoker. Schema e RPCs permanecem na mesma PR #71 draft, sem aplicação remota.
