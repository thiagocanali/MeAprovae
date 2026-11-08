# Auditoria de funções privilegiadas — 08/11/2026

## Escopo e método

Auditoria somente leitura do projeto Supabase de produção em 08/11/2026. Foram consultadas as definições de funções no schema `public`, privilégios efetivos de execução e triggers associados às tabelas de questões. Nenhuma DDL, alteração de grant ou escrita de dados foi executada.

Esta análise é estática: não substitui testes de autorização com sessões reais (anon, estudante, editor e owner), testes concorrentes ou revisão completa de todas as políticas RLS.

## Inventário de SECURITY DEFINER

Foram encontradas 11 funções `SECURITY DEFINER` no schema `public`:

| Função | anon | authenticated | PUBLIC | Papel |
|---|---:|---:|---:|---|
| `capture_editorial_change()` | não | não | não | Trigger de auditoria |
| `guard_attempted_question_components()` | não | não | não | Trigger de imutabilidade de alternativas/gabarito |
| `guard_attempted_question_content()` | não | não | não | Trigger de imutabilidade de questões respondidas |
| `guard_attempted_question_editorial_details()` | não | não | não | Trigger de proteção de detalhes editoriais |
| `handle_new_student()` | não | não | não | Trigger de criação de perfil |
| `has_platform_role(text)` | não | sim | não | Consulta de papel do usuário autenticado |
| `set_notice_positions(uuid, uuid[])` | não | sim | não | RPC editorial |
| `set_notice_subjects(uuid, uuid[])` | não | sim | não | RPC editorial |
| `set_question_options(uuid, jsonb)` | não | sim | não | RPC editorial |
| `set_student_study_goal(uuid, uuid, uuid)` | não | sim | não | RPC do estudante |
| `submit_question_attempt(uuid, uuid, uuid)` | não | sim | não | RPC de submissão de resposta |

Resultado: nenhuma dessas funções tem execução efetiva por `anon` ou `PUBLIC`. As cinco funções acionadas exclusivamente por triggers não são expostas como RPCs aos clientes. As seis funções acessíveis a `authenticated` foram revisadas individualmente abaixo.

## Revisão das seis RPCs acessíveis a authenticated

- **`has_platform_role`**: consulta `platform_admins` usando `auth.uid()`; não aceita identidade de usuário fornecida pelo cliente. Owner satisfaz a consulta de editor; editor satisfaz apenas a consulta de editor.
- **`set_notice_positions`**: exige `auth.uid()` e papel editorial; valida edital, status, lista de UUIDs, duplicidades e pertencimento dos cargos ao concurso do edital; bloqueia o edital durante a substituição.
- **`set_notice_subjects`**: exige `auth.uid()` e papel editorial; valida edital, status, existência e duplicidade das disciplinas; bloqueia o edital e realiza a substituição na mesma transação.
- **`set_question_options`**: exige `auth.uid()` e papel editorial; valida a questão, estado não publicado, formato e quantidade de alternativas, rótulos e posições. Os triggers de ciclo editorial e histórico impedem alterações incompatíveis com questões publicadas ou já respondidas.
- **`set_student_study_goal`**: deriva o usuário de `auth.uid()`, bloqueia a linha do usuário, valida concurso/edital/cargo publicados e pertencentes entre si; arquiva e cria objetivos apenas para esse usuário.
- **`submit_question_attempt`**: deriva o usuário de `auth.uid()`; valida questão e alternativa, lê o gabarito no servidor, registra a tentativa sob o próprio usuário e verifica que uma chave de idempotência repetida não seja reutilizada para outra resposta.

As seis definições usam `SET search_path = ''`. Não foi encontrado motivo, nesta inspeção, para revogar em lote os grants de `authenticated`: as RPCs são parte dos fluxos legítimos do produto e incluem verificações internas de autenticação/autorização.

## Proteções de histórico confirmadas no banco

Triggers ativos observados:

- `study_questions_attempt_history_guard` em `study_questions`;
- `study_question_options_attempt_history_guard` em `study_question_options`;
- `study_question_answer_keys_attempt_history_guard` em `study_question_answer_keys`;
- triggers de ciclo editorial em alternativas e gabaritos;
- triggers de auditoria editorial nas tabelas correspondentes.

A função de proteção dos componentes bloqueia alterações em alternativas e gabaritos quando existe tentativa, e serializa alterações com submissões usando lock da linha da questão. A função de proteção da questão bloqueia alterações de conteúdo quando existe histórico. O estado de publicação também é protegido por triggers.

## Limitações e próximos passos

1. Executar testes negativos com sessão `anon`, estudante comum, editor e owner para cada RPC.
2. Testar concorrência entre submissão e edição de alternativas/gabarito.
3. Revisar separadamente RLS e grants das tabelas, views e endpoints Nuxt; esta auditoria não equivale a uma auditoria completa de toda a superfície do banco.
4. A configuração Leaked Password Protection continua sendo uma pendência de Auth a ser tratada pelo owner no painel Supabase.
5. A divergência da migration de dificuldade revisada permanece pendente: a coluna `difficulty_reviewed` não existia no banco durante a auditoria. Esta documentação não altera nem sincroniza schema.

## Conclusão

Na fotografia consultada em 08/11/2026, os privilégios das 11 funções `SECURITY DEFINER` estão mais restritos do que uma leitura isolada do advisor poderia sugerir: cinco são internas a triggers e seis são executáveis apenas por usuários autenticados, com checagens de identidade e, quando necessário, papel editorial. Não foram feitas alterações de segurança sem evidência de vulnerabilidade concreta.
