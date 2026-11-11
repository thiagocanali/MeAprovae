# Expansão do acervo

O banco auditado em 11/11/2026 tem 60 questões publicadas. O volume não substitui revisão: não publicar automaticamente conteúdo coletado ou gerado.

## Lotes JSONL

Execute `pnpm content:validate caminho/lote.jsonl`. O validador lê uma questão por linha, sinaliza linhas inválidas e retorna código 1 se houver erros. Não acessa banco nem publica. A detecção de duplicidade vale para enunciados normalizados dentro do lote; comparação com o acervo e equivalência semântica continuam pendentes.

Contrato:

```json
{"externalId":"original-portugues-001","statement":"Enunciado revisado","explanation":"Justificativa pedagógica de cada alternativa","subject":"Língua Portuguesa","sourceLabel":"Equipe editorial","rights":"original","difficulty":"medium","options":["Alternativa A","Alternativa B"],"correctOption":0}
```

Campos obrigatórios: externalId, statement, explanation, subject, sourceLabel, rights, difficulty, options e correctOption (índice a partir de zero). Direitos: original, licensed ou public-domain. Conteúdo externo exige sourceUrl HTTP(S). A licença deve ser comprovada separadamente; um campo preenchido não comprova direito de reprodução.

## Próximas etapas de operação

1. Selecionar fontes com autorização de reprodução e mapear editais, disciplinas e assuntos.
2. Validar lotes, conferir duplicatas contra o banco e revisar gabarito, explicação e classificação individualmente.
3. Implementar importação transacional em rascunho com identificação da fonte, versão e registro do lote; usar papéis editoriais existentes e não chaves privilegiadas no navegador.
4. Publicar só após revisão. Correções de questões com tentativas exigem nova versão.
5. Medir cobertura por edital, questões revisadas, taxa de erro editorial e custo por questão antes de aumentar os lotes.

## Comparação entre estudantes

Antes de disponibilizar rankings, implementar adesão voluntária, pseudônimo, tamanho mínimo de grupo e possibilidade de sair. Comparar primeira tentativa por questão, período e cobertura equivalentes; separar prática repetida de avaliações. Não expor histórico, e-mail ou identificadores pessoais. O painel atual mostra apenas dados do próprio estudante e não calcula ranking fictício.

## Importação editorial disponível

A página `/admin/importar` aceita arquivos JSONL de até 2 MB e até 100 questões por requisição. O acesso exige papel editor/owner, validado novamente na API e no PostgreSQL. Selecione um edital ativo e mantenha um identificador estável para a coleção (`sourceName`, por exemplo `original-matematica-2026`). Os nomes das disciplinas devem coincidir exatamente com o cadastro e estar vinculados ao edital.

Além dos campos anteriores, o importador exige `rightsEvidence`: declaração de autoria para conteúdo original ou referência documental da licença/domínio público para conteúdo externo. Exemplo: `"rightsEvidence":"Conteúdo original elaborado pela equipe editorial."`. Esse texto registra a declaração; não substitui a verificação jurídica/editorial. A URL deve usar HTTP(S), sem credenciais.

O validador CLI anterior continua sendo uma pré-validação estrutural. A tela e a API compartilham uma validação mais estrita: limites de texto, evidência de direitos, identificadores externos, opções repetidas e fonte. Publicação e classificação revisada continuam dependendo do editor.

A RPC `import_question_batch` é SECURITY INVOKER, respeita RLS e cria, numa transação, lote, questões em rascunho, alternativas, gabaritos, explicações e procedência. Qualquer falha desfaz o lote inteiro. `difficulty_reviewed` é sempre false na importação. A fonte e o identificador externo têm unicidade; os enunciados são comparados com o acervo por caixa/espaços normalizados. Isso não detecta paráfrases nem equivalência semântica.

Tentativas da mesma requisição mantêm o UUID e o payload. A repetição retorna o lote existente; reutilizar o UUID com outro payload é rejeitado. As importações são serializadas no banco para evitar corrida de duplicatas entre lotes. Edições editoriais por outras rotas não participam desse bloqueio e continuam exigindo revisão de duplicidade.

As últimas 50 importações aparecem na tela. A procedência e os lotes são visíveis apenas a editores; gabaritos e explicações permanecem nas tabelas protegidas já existentes. Importações não publicam nem alteram questões existentes.

## Verificação do banco

O job `database` do CI sobe PostgreSQL 17 descartável, cria um substituto mínimo de Supabase Auth (`auth.users` e `auth.uid()`), aplica todas as migrations e executa `tests/integration/question-import.sql`. Ele valida RLS e transações reais; não substitui teste de cookies, JWT, PostgREST ou Auth do Supabase.

Para repetir em PostgreSQL local vazio: defina `PGHOST=127.0.0.1`, `PGUSER`, `PGDATABASE` e `PGPASSWORD`, então execute `bash scripts/test-database.sh`. O script recusa hosts externos e só deve ser usado em banco descartável: cria roles, tabelas e fixtures. A suite de fixtures termina com rollback.

As migrations legadas 0001–0016 têm versões remotas diferentes dos nomes locais; consulte o ledger antes de qualquer aplicação automática. Não executar `supabase db push` cegamente nesse projeto. A nova migration foi criada pelo CLI como `20261111123409_question_batch_import.sql` e aplicada remotamente pelo MCP com o nome `question_batch_import`; confira a versão remota pelo nome.
