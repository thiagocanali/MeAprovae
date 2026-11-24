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
