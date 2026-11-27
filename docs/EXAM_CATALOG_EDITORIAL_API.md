# API editorial de modelos — lote C, 27/11/2026

## Estado de liberação

**Implementação de rascunhos na PR #71, em draft; não implantada.** Depende das migrations experimentais de 24/11 e de `20261127100440_exam_catalog_editorial_drafts.sql`, criada pelo CLI Supabase. A produção não recebeu DDL nem modelos. Publicação e arquivamento de versões continuam proibidos. Não há catálogo de modelos para estudantes nem início de sessão por versão nesta entrega. A interface administrativa e os pareceres foram acrescentados na evolução C2/D, ainda em homologação.

O lote C cobre contratos, consulta/validação estrutural, criação/edição/clonagem, solicitação/retorno de revisão e consulta de auditoria. A evolução **C2/D implementa o registro atribuído à conta, evidências de direitos e interface administrativa**, descritos em [revisão e interface](EXAM_CATALOG_REVIEW_AND_UI.md). Isso não representa revisão humana real do acervo nem publicação.

## Contratos HTTP

Todas as rotas exigem usuário validado e `has_platform_role('editor')` no banco; owner também atende a esse papel. Metadados editáveis de usuário não são autorização. Respostas usam private/no-store, inclusive erros. Mutações aceitam somente JSON, no máximo 16 KiB, e rejeitam Origin diferente do origin da requisição quando o header existe. SSR/ferramentas autenticadas sem Origin continuam possíveis; a autorização não depende desse header.

| Método e caminho sob `/api/admin/exam-models` | Contrato |
| --- | --- |
| GET `/` | Lista versões com página, até 50 itens, status draft/in_review/all, tipo e busca literal de título. Ordenação estável e count/hasMore. |
| POST `/` | `{ modelId, title, description, kind, questionCount }`: UUID estável de requisição/modelo, versão 1 em draft com composição inicialmente vazia. |
| GET `/[id]` | Modelo e até 100 versões em ordem decrescente; informa versionsTruncated. |
| POST `/[id]/versions` | `{ version, sourceVersion, sourceRevision }`: cria o próximo número de versão copiando metadados/composição, sem aprovação/direitos herdados. |
| GET `/[id]/versions/[version]` | Snapshot editorial, revisão e itens ordenados. Não contém gabaritos ou explicações. |
| PUT `/[id]/versions/[version]` | `{ expectedRevision, title, description, kind, questionCount, questionIds }`: substituição transacional do rascunho. Lista de UUIDs únicos de 0 a 20 e não maior que a quantidade declarada; pode estar incompleta. |
| GET `/[id]/versions/[version]/validation` | Prévia estrutural, distribuição explícita e motivos incomplete/duplicate/positions/distribution/source. Verifica existência, matérias atuais e referências não arquivadas. Não publica nem comprova revisão humana. |
| POST `/[id]/versions/[version]/transition` | `{ action: request_review ou return_to_draft, expectedRevision }`: transição explícita. Banco repete validações de composição para entrar em revisão. |
| GET `/[id]/audit` | Eventos paginados por chave de modelo, inclusive versões/itens cujo record_id legado é nulo e cujo modelo já foi removido. |

`kind` aceita subject-foundations, subject-application ou multidisciplinary. Título de 3–120 caracteres; descrição de 3–800; 1–20 questões declaradas; duração derivada no banco em seis minutos por questão. Revisões e números são inteiros positivos limitados a integer PostgreSQL. Campos desconhecidos, inclusive status, autor, direitos e aprovação, são rejeitados. Os IDs são validados/normalizados; não há fallback para outra matéria.

## Escrita, concorrência e auditoria

A RPC pública `write_exam_catalog_draft` é invoker e delega a `exam_catalog_private.write_draft`, uma função definer com search_path vazio que **repete** autenticação, consulta do papel e validação de campos. O schema privado não é exposto pelo Data API. A execução autenticada necessária à wrapper não elimina essas checagens na função privada; o teste tenta acessá-la diretamente como estudante. Anon não pode executar nenhuma das duas. Helpers de snapshot/trigger não são RPCs concedidas ao navegador.

A identidade do editor é auth.uid(), nunca um campo do corpo. Nenhum INSERT/UPDATE/DELETE/TRUNCATE direto nas tabelas é concedido ao navegador. Um editor autorizado pode editar o catálogo editorial compartilhado, independentemente do criador; isso não concede acesso a dados pessoais de estudantes. Operações protegidas usam a identidade do usuário, sem service_role no cliente ou no servidor Nuxt.

Um lock na raiz do modelo ordena as operações, seguido pelo lock da versão. expectedRevision protege contra edição perdida; edit_revision é incrementada por trigger. Uma composição inválida desfaz remoções, updates, inserts e suas linhas de auditoria na mesma transação. Em revisão, a composição permanece congelada; voltar a draft exige outra chamada explícita antes de editar.

Repetir uma criação compatível com mesmo modelId/criador e versão inicial intacta retorna replayed sem novas linhas/eventos. Clonagem usa um número alvo explícito, origem/revisão e ator para reconhecer reenvio; não cria outra versão a cada clique. Save/transição com revisão antiga retornam conflito: atualizar a tela e reconciliar alterações; não reenviar automaticamente sobrescrevendo o trabalho alheio. Clonar/editar a nova versão não altera a anterior. Revisão humana e direitos não são herdados pela clonagem.

Eventos registram ator real, ação e antes/depois pelo mecanismo existente. Os filtros de chaves compostas usam os caminhos model_id do JSON, com índices parciais específicos. Ator nulo em SQL administrativo não pode ser apresentado como revisor humano. As snapshots atuais preservam metadados/matérias/IDs, **não enunciados/gabaritos completos**; publicação futura deve revalidar elegibilidade e congelar esses dados sem alterar sessões históricas.

## Erros públicos

400: entrada/referência inválida; 401: sem sessão; 403: sem papel ou origem de envio inválida; 404: modelo/versão ausente; 409: revisão obsoleta, identidade em conflito ou composição incompatível/congelada; 413/415: tamanho/tipo do corpo; 503: catálogo não instalado/disponível. Textos de SQL/provedor e credenciais não são retornados. Conferir disponibilidade real do schema em homologação, não tratar 503 como coleção vazia.

## Evidências e limites

- Vitest: normalização, limites, UUIDs duplicados por caixa, campos editoriais forjados, publicação proibida, paginação e prévia estrutural; HTTP H3 real cobre autorização antes de query/escrita, cache, corpo, origem, conflito e sanitização de erros. Transporte Auth/banco desses testes HTTP é sintético.
- PostgreSQL 17 descartável: estudante/metadados forjados/identidade ausente negados; editor/owner permitidos; acesso direto privado não contorna autorização; replay e auditoria; rollback de questão inexistente; revisão congelada; versão anterior preservada; ator correto; nenhuma aprovação/direito/publicação inventados. Teste de duas conexões confirma lock e revisão obsoleta sem sobrescrita.
- PostgREST 12.2.3 local, JWTs exclusivamente sintéticos: projeção aninhada da validação e filtro JSON por chave composta retornaram 200; estudante não viu eventos. Não é Auth hospedado. Scripts/artefatos de máquina em `/workspace/work/master-plan-2026-11-27`; resultados de CI/SHAs finais na PR.
- Typecheck/build Vercel e suíte SQL completa devem passar antes de push. Mudanças não encerram #56/#57 nem as pendências de aprovação humana.

## Rollout, reversão e continuidade

Manter #71 draft até revisão adicional de schema, RPC definer, grants, direitos e auditoria, homologação e aprovação específica. Não executar migrations produtivas nem criar modelos públicos. Para rollback de aplicação, reverter código; para schema, manter inativo e avaliar referências/backup em vez de DROP automático. A remoção de usuários com referências de revisão/versões também requer política de retenção, sem deleções automáticas como teste.

C2/D já implementados na proposta: registro de pareceres/evidências e telas editoriais, conforme [novo checkpoint](EXAM_CATALOG_REVIEW_AND_UI.md), ainda sem publicação. Só depois de homologação e aprovação, desenhar a liberação dos modelos aos estudantes e a fixação de snapshots completos na sessão. As sessões privadas atuais permanecem como estão.

Resultado local final deste recorte: **236 testes / 30 arquivos**, typecheck e build Vercel aprovados; suíte SQL completa desde bootstrap em PostgreSQL 17 novo aprovada, incluindo os três testes de concorrência (editorial legado, composição/revisão e RPC com revisão obsoleta). Nenhum frontend foi alterado neste lote; a manutenção Nuxt herdada já havia validado as 22 páginas/176 combinações. Não contar esses testes como aprovação humana ou Auth hospedado.
