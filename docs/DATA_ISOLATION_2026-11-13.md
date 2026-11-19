# Isolamento de dados — verificação somente leitura, 13/11/2026

## Escopo e método

Inspeção de RLS, privilégios efetivos, políticas e definições SECURITY DEFINER no Supabase de produção. Três sondagens de acesso executadas em transações BEGIN READ ONLY, com SET LOCAL ROLE e contexto de identidade local, terminadas em ROLLBACK. Nenhuma conta, tabela, função, política, permissão ou dado de estudo foi criado ou alterado.

As duas identidades sintéticas usadas foram previamente verificadas como inexistentes em auth.users. Foram usados apenas UUIDs de teste, sem coletar IDs, e-mails ou conteúdo de registros pessoais existentes.

Este método testa o comportamento do PostgreSQL com papéis e contexto de identidade escolhidos pelo operador autorizado. Não emite JWT, não testa assinatura de tokens, cookies, PostgREST, sessão hospedada nem substitui o teste com duas contas reais.

## Evidências

| Verificação | Resultado |
| --- | --- |
| Tabelas públicas | 25 tabelas comuns, todas com RLS ativa |
| Histórico, sessões, objetivos e favoritos | Políticas de leitura vinculam o usuário a auth.uid(); itens de simulado verificam a sessão proprietária |
| Perfil | Políticas INSERT/UPDATE restringem o ID à identidade; UPDATE possui USING e WITH CHECK |
| Gabaritos e explicações | Políticas exigem papel editorial consultado no banco |
| SECURITY DEFINER no schema public | 11 funções; nenhuma executável por anon |
| Triggers internos | Cinco funções sem execução por authenticated |
| RPCs autenticadas privilegiadas | Seis, com search_path vazio; definição lida individualmente |
| Sondagem A (authenticated sem papel editorial) | Zero linhas visíveis nas dez tabelas privadas listadas abaixo; has_platform_role('editor') = false |
| Sondagem B (authenticated, user_metadata.role = owner) | Mesmo resultado: zero linhas e papel editorial false |
| Sondagem anônima | auth.uid() nulo; zero perfis; sem SELECT de tentativas e sem EXECUTE em has_platform_role |
| Baseline | Há registros em tentativas, sessões e perfis; o resultado zero não decorre de essas três tabelas estarem vazias |
| Limpeza de contexto | Consulta posterior confirmou papel postgres; identidades e papéis foram locais às transações |

As dez tabelas privadas contadas foram: question_attempts, student_profiles, exam_sessions, exam_session_items, student_question_favorites, study_goals, study_question_answer_keys, study_question_editorial_details, platform_admins, editorial_audit_log. A sondagem também retornou a condição do papel editorial, separada das contagens.

## RPCs revisadas estaticamente

- has_platform_role: consulta platform_admins pelo auth.uid(), sem confiar em user_metadata.
- set_notice_positions, set_notice_subjects, set_question_options: exigem identidade e papel editorial antes das operações.
- set_student_study_goal: deriva a identidade do contexto e opera objetivos desse usuário.
- submit_question_attempt: deriva a identidade, valida questão/alternativa, calcula correção no servidor e aplica chave de idempotência por usuário.

A inspeção não executou funções de escrita e não valida todos os caminhos de concorrência. A existência de SECURITY DEFINER é relevante para revisão, mas não justifica revogar em lote funções que sustentam os fluxos legítimos.

## Nuances importantes

SELECT concedido ao papel não significa acesso a todas as linhas: RLS restringe o resultado. O catálogo tem grants anônimos; isso não equivale a vazamento de histórico. Em study_questions há grants por coluna, portanto has_table_privilege(..., 'SELECT') = false isoladamente não prova ausência de leitura das colunas públicas.

## Limites e próximos passos

- Validar duas contas reais separadas pelo navegador/API: cada uma vê seus dados e não os da outra, inclusive ao trocar IDs de recursos.
- Testar estudante/editor/owner reais para fluxos de escrita em ambiente isolado.
- Testar expiração/revogação de sessão e novo ciclo de login.
- A configuração de proteção contra senhas vazadas, já sinalizada anteriormente, não foi alterada nem reavaliada nesta inspeção.
- Este resultado não é uma auditoria integral de segurança nem prova de ausência de vulnerabilidades.

## Referências

- [RLS e limites de identidade](https://supabase.com/docs/guides/database/postgres/row-level-security)
- [Funções e contexto de segurança](https://supabase.com/docs/guides/database/functions)
