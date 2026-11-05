# ENVIRONMENT.md — configuração de ambientes

Este documento lista nomes e finalidades. **Não inclua valores secretos aqui nem no Git.**

## Estado observado em 04/11/2026

- Projeto Vercel: `meaprovae`.
- A listagem de variáveis retornou zero variáveis cadastradas e zero variáveis ocultas.
- `.env.example` atualmente contém apenas `DATABASE_URL` e `NODE_ENV`.
- Não há credenciais de banco, auth, e-mail ou IA configuradas na Vercel.

## Variáveis previstas

| Variável | Obrigatória quando | Exposição | Ambientes |
|---|---|---|---|
| `DATABASE_URL` | Banco PostgreSQL habilitado | Apenas servidor; segredo | Development, Preview, Production |
| `NODE_ENV` | Gerenciada pelo runtime | Não é segredo | Gerenciada pela plataforma |
| `SUPABASE_URL` | Se Supabase for aprovado | Pode ser pública, mas validada | Todos |
| `SUPABASE_ANON_KEY` | Se Supabase Auth/cliente for aprovado | Chave pública com RLS obrigatório | Todos |
| `SUPABASE_SERVICE_ROLE_KEY` | Somente operações administrativas server-side que realmente precisem | **Segredo crítico; nunca usar no cliente** | Apenas ambientes necessários |
| `RESEND_API_KEY` | Se Resend for escolhido para e-mail transacional | Segredo server-side | Todos os ambientes usados |
| `AI_GATEWAY_API_KEY` | Quando tutor IA for implementado | Segredo server-side | Preview/Production |
| `AI_MODEL` | Quando tutor IA for implementado | Configuração não secreta | Todos |

As variáveis Supabase, Resend e AI Gateway são candidatas condicionais, não integrações já contratadas ou implementadas. Não adicionar chaves até a decisão técnica e o provisionamento.

## Configuração local

1. Copie `.env.example` para `.env`.
2. Preencha apenas com credenciais de desenvolvimento próprias.
3. Não compartilhe valores secretos no chat ou em commits.
4. Execute `npm install` após o lockfile ser criado.
5. Execute os scripts documentados no `package.json`.

## Vercel

Configure os valores em Project → Settings → Environment Variables, separando Development, Preview e Production. Não reutilize banco de produção em testes destrutivos ou dados de demonstração.

## Rotação e incidentes

- Se um segredo for exposto, revogue/rotacione no provedor antes de remover o valor do código.
- Não registrar tokens, senhas, URLs de conexão completas ou payloads pessoais nos logs.
- Use variáveis server-only para credenciais privilegiadas.

## Supabase Auth — implementação preparada

O código usa `@supabase/ssr` com cookies no servidor. Configure:
- `NUXT_SUPABASE_URL`: Project URL do projeto Supabase do Me Aprovaê.
- `NUXT_SUPABASE_ANON_KEY`: chave publicável/anon do projeto (nunca service role).

O valor deve ser adicionado em Development, Preview e Production conforme cada ambiente. A chave privilegiada `service_role` não é necessária para o fluxo de autenticação e não deve ser colocada nesta aplicação.

No Supabase, configure a URL de redirecionamento permitida para `https://meaprovae.vercel.app/auth/callback` e a URL equivalente de Preview/local. A confirmação de e-mail depende da configuração de Auth/SMTP do projeto.

Antes de considerar o fluxo pronto: aplicar `supabase/migrations/0001_student_profiles.sql`, criar duas contas de teste e validar cadastro, confirmação, login, logout e bloqueio cruzado. A migração SQL ainda não foi aplicada nem testada contra banco real.

## Situação da validação
A integração de código Supabase está preparada, mas ainda não validada em runtime. O CI que passou anteriormente cobria apenas a base de testes e regra de questão; a autenticação foi adicionada depois. A Vercel reportou build-rate-limit no commit mais recente. Não considerar o fluxo autenticado disponível até uma execução CI e testes reais com duas contas.


Para recuperação de senha, o Supabase Auth precisa estar configurado com envio de e-mail funcional e URLs permitidas para `/auth/callback` no domínio de produção e nos domínios de Preview usados. O redirect de recuperação usa `/auth/callback?next=%2Fredefinir-senha`; a aplicação restringe o destino final a uma rota local conhecida. Sem SMTP/serviço de e-mail validado, o fluxo não estará operacional.


## Migração do catálogo e tentativas
Antes de ativar as páginas de estudo, aplique na ordem:
1. `supabase/migrations/0001_student_profiles.sql`
2. `supabase/migrations/0002_study_catalog_and_question_attempts.sql`

A segunda migração cria conteúdo editorial, RLS e a função RPC `submit_question_attempt`. Cadastre concursos, editeis, disciplinas e questões por um processo administrativo confiável; publique na ordem concurso → edital → vínculo das disciplinas → questão com ao menos duas alternativas → gabarito → publicação da questão. O trigger bloqueia publicação incompleta.

Não conceda a estudantes permissões para inserir/alterar gabaritos. Não crie questões com fonte/banca fictícia. Antes de produção, teste leitura anônima/autenticada do catálogo, tentativa sem sessão, tentativa com opção de outra questão, repetição da mesma chave e isolamento entre duas contas.


## Situação atual do deploy e typecheck
A Vercel registrou falha de typecheck no deployment da integração inicial por `middleware: 'auth'` como string em `definePageMeta`. O PR #5 troca por import da função de middleware tipada. A tentativa de Preview do PR #5 está bloqueada por `build-rate-limit`; aguardar quota/limite ser liberado e validar o build antes de mesclar.


## Hotfix de typecheck
O PR #6 foi mesclado em `main` após CI verde (typecheck, testes e build). A Vercel ainda não apresentou deployment novo após o merge; o último deployment consultado continua em estado ERROR. Validar deployment READY e HTTP antes de declarar o domínio de produção saudável.


## Migração de objetivos e dashboard
A terceira migração é `supabase/migrations/0003_student_goals_and_dashboard.sql`. Ela depende das migrações 0001 e 0002. Aplicar na ordem 0001 → 0002 → 0003. A migração 0003 cria cargos, objetivos, RLS e RPCs para objetivo ativo e dashboard. Testar com duas contas se cada uma só lê/edita seu objetivo e seus próprios indicadores. O dashboard agrega as tentativas persistidas; não requer variáveis adicionais além do Supabase já documentado.


## Migração de favoritos
A quarta migração é `supabase/migrations/0004_question_favorites.sql`. Aplicar depois das migrações 0001–0003. Validar que uma conta não consegue ler, adicionar ou remover favoritos de outra conta e que questões não publicadas não podem ser favoritadas.


## CI do módulo de estudo
O GitHub Actions run #143 passou: instalação, typecheck, 28 testes unitários e build. Essa validação não executa as migrações SQL nem testa políticas RLS e RPCs contra um banco. Esses testes permanecem bloqueados até provisionar Supabase e aplicar 0001–0004.


## Migração de desempenho e revisão
A quinta migração é `supabase/migrations/0005_subject_performance_and_wrong_questions.sql`. Aplicar depois de 0001–0004. As RPCs são invoker e dependem de `auth.uid()` e das permissões/RLS já criadas. Testar que o desempenho por disciplina e a fila de questões erradas mostram apenas tentativas do usuário autenticado e que a questão sai da fila quando a tentativa mais recente passa a correta.


## CI da migração 0005
GitHub Actions run #155 passou com instalação, typecheck, 28 testes e build. Isso não executa SQL contra o banco; aplicar a migração e testar RLS/RPCs em ambiente Supabase antes de produção.


## Migração 0006 — administração editorial e auditoria

Aplique supabase/migrations/0006_editorial_admin_and_audit.sql somente depois das migrações 0001–0005. Ela cria:
- platform_admins com papéis owner e editor;
- has_platform_role('editor') para autorização no banco;
- políticas RLS de CRUD editorial nas tabelas de concursos, editais, cargos, disciplinas, assuntos, questões, alternativas e gabaritos;
- editorial_audit_log e triggers para registrar alterações editoriais;
- leitura administrativa do histórico e gestão de papéis restrita ao owner.

### Atribuição inicial do owner

Não existe bootstrap automático. Depois de criar e confirmar a conta no Supabase Auth, execute no SQL Editor, substituindo pelo e-mail exato da conta confiável:

```sql
insert into public.platform_admins (user_id, role, granted_by)
select id, 'owner', id
from auth.users
where lower(email) = lower('EMAIL_DA_CONTA_CONFIRMADA')
  and email_confirmed_at is not null;
```

Confirme que uma linha foi inserida e valide a conta em /api/admin/overview. Se nenhuma linha for inserida, confira o e-mail e a confirmação; não relaxe RLS nem crie uma rota pública de promoção. O gerenciamento de papéis pela interface não está implementado.

O painel /admin e a API /api/admin/overview dependem da migração 0006 e de um usuário com papel owner ou editor. Sem isso, o comportamento esperado é negar acesso. O código usa a sessão Supabase SSR do usuário e políticas RLS; não requer a chave service_role.


## Migração 0007 — integridade editorial e concorrência

Aplique supabase/migrations/0007_editorial_lifecycle_and_goal_lock.sql depois da migração 0006. Ela:
- impede despublicar concurso enquanto houver editais publicados;
- impede despublicar/mover edital enquanto houver questões publicadas;
- revalida publicação de questão quando status, edital ou disciplina mudam;
- exige despublicar questão antes de alterar alternativas/gabarito e despublicar edital antes de alterar seus vínculos de disciplinas;
- exige arquivar registros publicados antes de excluí-los;
- serializa alterações concorrentes de objetivo por estudante, bloqueando a linha correspondente em auth.users.

O procedimento de aplicação passa a ser 0001 → 0002 → 0003 → 0004 → 0005 → 0006 → 0007. Execute em ambiente de teste primeiro e valide os fluxos de publicar, arquivar, editar e excluir com papéis de editor/owner e com uma conta de estudante sem papel administrativo.


## CI da migração 0007
O GitHub Actions run #169 passou no commit f93026925213fe47015ecb2dcdea9963515f9b6e (instalação, typecheck, 28 testes unitários e build). O PR #7 está em draft e ainda não foi mesclado. Esse resultado valida compilação e testes unitários, não a execução da migração 0007 nem as políticas/triggers no PostgreSQL/Supabase.

## Estado verificado — 2026-11-05

- O deployment de produção do commit `cd1f6393394c8b8875660daf765bb66c8e82904b` está em estado `READY`; isso confirma o build/publicação, não a operação autenticada com banco.
- A consulta atual de variáveis da Vercel retornou zero variáveis configuradas e zero variáveis ocultas.
- Não há conexão Supabase disponível nesta sessão para confirmar projeto, aplicar SQL ou testar RLS/RPCs.
- As migrações versionadas chegam a `0011_preserve_question_answer_key_on_option_replace.sql`. A aplicação real depende de provisionar/configurar Supabase, cadastrar `NUXT_SUPABASE_URL` e `NUXT_SUPABASE_ANON_KEY` em cada ambiente e aplicar 0001–0011 na ordem.
- Até essa configuração e validação real, não considerar cadastro, login, painel administrativo, catálogo ou tentativas como funcionais em produção.

## Atualização após PR #11 — 2026-11-05

- PR #11 foi mesclado à `main` no commit `1fd30bf049c547213f528edbb5153ce11f194ae1`.
- CI da branch `fix/question-editor-integrity` (run `42034208681`) passou em instalação, typecheck, testes unitários e build de produção.
- A migração 0011 agora preserva o gabarito durante a substituição de alternativas. Ela está versionada no repositório, mas ainda não foi aplicada/validada em Supabase.
- A Vercel recusou o deployment Preview do PR #11 por limite diário de deployments do plano (`api-deployments-free-per-day`); aguardar a janela de 24 horas ou resolver o limite antes de tentar novo deployment.
- A consulta anterior de variáveis Vercel retornou zero variáveis configuradas. Não há conexão Supabase disponível nesta sessão. Configuração do backend e testes reais permanecem bloqueadores P0.
