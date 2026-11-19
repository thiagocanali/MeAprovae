# Edição editorial atômica — issue #37

## Contrato

POST e PATCH mantêm validação de entrada e autorização de sessão no servidor, mas cada um faz uma única chamada RPC. A questão pública, a explicação protegida e os efeitos dos triggers de auditoria participam da mesma transação PostgreSQL. Qualquer falha reverte todos esses efeitos.

- `create_editorial_question(jsonb, text)` aceita campos públicos normalizados e explicação; cria somente rascunho.
- `update_editorial_question(uuid, jsonb, text, boolean)` distingue campos omitidos de JSON null. `p_set_explanation=false` preserva a explicação; true permite limpá-la com string vazia.
- O retorno mantém os campos públicos do contrato anterior. PATCH só inclui explanation quando ela foi enviada.
- Ambas são SECURITY INVOKER, search_path vazio, execução revogada de PUBLIC/anon, com auth.uid e papel editorial conferidos no banco. RLS e grants por coluna não foram ampliados.
- PATCH bloqueia a questão com FOR UPDATE antes de qualquer alteração, serializando editores e submissões que usam SHARE. Triggers de publicação, tentativas e sessões continuam sendo a fonte das regras de imutabilidade.
- Dificuldade alterada sem confirmação explícita de revisão volta a não revisada.
- Erros SQL são mapeados para respostas públicas 400/401/403/404/409/503; detalhes internos não são enviados.

## Migration e ordem de publicação

Arquivo criado por `supabase migration new atomic_editorial_questions` com CLI 2.81.3: `20261119144638_atomic_editorial_questions.sql`.

O ledger remoto inicial tem 22 entradas, com as 16 migrations históricas e seis incrementais. Nomes/versões remotas antigos diferem dos prefixos dos arquivos, como já documentado no projeto. A migration nova é aditiva; nenhuma entrada histórica é renomeada, reaplicada ou reparada automaticamente. Não executar db push ou reset --linked para reconciliar esses prefixos.

Antes de integrar as rotas: aprovar o CI de banco isolado, aplicar somente esta migration no projeto correto, conferir as duas funções/grants e a entrada nova do ledger, comparar advisors e só então publicar o código. O arquivo é idempotente quanto à definição das funções/grants, mas isso não é autorização para reaplicar migrations antigas.

Configuração local gerada via CLI init e reduzida aos serviços usados. Sem vínculo remoto, seeds desabilitados e e-mails locais no Inbucket. O ambiente Windows desta entrega não dispõe de Docker/PostgreSQL local; a suíte SQL roda em PostgreSQL 17 real no CI, com host restrito a loopback.

## Verificação

- Testes SQL de criação e PATCH completo, só campos, só explicação, campos nulos, omissão, limpeza explícita e dificuldade.
- Falha de CHECK na segunda gravação verifica rollback da questão e das linhas de auditoria.
- Anônimo, estudante, editor e owner; criação só em rascunho; bloqueio de publicação incompleta e de conteúdo com histórico.
- Teste com duas conexões PostgreSQL: primeiro editor mantém o lock após a RPC, segundo recebe 55P03; questão e explicação ficam consistentes.
- Unitários do mapeamento de erros e suíte existente; typecheck e dois builds Vercel no CI.

Fixtures e testes de escrita são exclusivos de banco descartável. Nenhuma questão real deve ser alterada para testar rollback em produção.
