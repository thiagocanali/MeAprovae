# ENVIRONMENT.md — configuração de ambientes

Este documento lista nomes e finalidades. **Não inclua valores secretos aqui nem no Git.**

## Estado observado em 06/11/2026

- Projeto Vercel: `meaprovae` (`prj_aNTfVXzzPf8g0ONlkEVhMp709aAz`).
- A listagem atual da Vercel encontrou variáveis Supabase/PostgreSQL nos ambientes Development, Preview e Production. Os valores não foram descriptografados nem copiados.
- O runtime Nuxt lê `SUPABASE_URL` e `SUPABASE_ANON_KEY` em `nuxt.config.ts` e `server/utils/supabase.ts`; esses nomes estão presentes na configuração da Vercel e agora também no `.env.example`.
- Também existem variáveis de integração PostgreSQL e chaves privilegiadas Supabase. O código da aplicação não referencia `SUPABASE_SERVICE_ROLE_KEY` nem `SUPABASE_SECRET_KEY`; revisar sua necessidade e manter qualquer credencial privilegiada exclusivamente server-side.
- Não há conexão SQL/Supabase disponível nesta sessão para confirmar o histórico de migrações, aplicar SQL ou testar RLS/RPCs.
- O PR #20 está integrado em `main`; sua migração 0013 está versionada, mas aplicação e validação no banco continuam não confirmadas.
- No PR #21, CI e Preview Vercel passaram para `b5ffc9e`; o check Supabase Preview está neutro. O HEAD local posterior com Fisher–Yates ainda precisa ser enviado e validado.
- Uma requisição GET a `/api/health` respondeu HTTP 200 em 06/11/2026. Isso valida apenas a disponibilidade desse endpoint, não Auth, banco, RLS ou fluxos autenticados.
- Uma requisição GET sem sessão a `/api/study/questions` respondeu HTTP 401 com a mensagem de autenticação esperada, em vez de falhar na configuração do cliente. Isso não valida login, dados, policies RLS ou submissão autenticada.
- A branch do PR #21 contém a migração 0013 por partir do `main` atual. CI e Vercel Preview passaram para `1a2f790`; o check Supabase Preview está neutro e não comprova aplicação de migrations.

## Variáveis previstas

| Variável | Obrigatória quando | Exposição | Ambientes |
|---|---|---|---|
| `DATABASE_URL` | Banco PostgreSQL habilitado | Apenas servidor; segredo | Development, Preview, Production |
| `NODE_ENV` | Gerenciada pelo runtime | Não é segredo | Gerenciada pela plataforma |
| `SUPABASE_URL` | Supabase Auth e acesso ao backend habilitados | Runtime config server-side; URL não é segredo | Development, Preview, Production |
| `SUPABASE_ANON_KEY` | Supabase Auth e acesso ao backend habilitados | Chave publicável; RLS obrigatório | Development, Preview, Production |
| `RESEND_API_KEY` | Se Resend for escolhido para e-mail transacional | Segredo server-side | Todos os ambientes usados |
| `AI_GATEWAY_API_KEY` | Quando tutor IA for implementado | Segredo server-side | Preview/Production |
| `AI_MODEL` | Quando tutor IA for implementado | Configuração não secreta | Todos |

As variáveis Supabase são necessárias para ativar o código de autenticação já implementado. Resend e AI Gateway continuam candidatos condicionais, não integrações contratadas ou implementadas. `DATABASE_URL` ainda não é consumida pelo runtime atual; só deve ser configurada quando houver uma integração PostgreSQL direta que a utilize.

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
- `SUPABASE_URL`: Project URL do projeto Supabase do Me Aprovaê.
- `SUPABASE_ANON_KEY`: chave publicável/anon do projeto (nunca service role).

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


## Situação atual do deploy e validação
O endpoint público `/api/health` respondeu HTTP 200 em 06/11/2026. O status Vercel dos PRs #20 e #21, consultado nesta auditoria, informa rate limit de deployments; não há deployment novo do HEAD atualizado para validar. O CI do PR #21 estava verde antes das correções locais, que passaram localmente em typecheck, testes e build, mas ainda aguardam push/CI remoto.


## PR #20 — proteção editorial
O PR #20 foi integrado ao `main`. A migração 0013 separa explicações em `study_question_editorial_details`, restringe acesso editorial por RLS, remove grants amplos em `study_questions` e retorna explicação apenas pela RPC de submissão válida. Esta é uma revisão estática do SQL versionado: não confirma que a migração foi executada, que a tabela está protegida no projeto ativo ou que o vazamento foi testado via Supabase.


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
- As migrações versionadas chegam a `0011_preserve_question_answer_key_on_option_replace.sql`. A aplicação real depende de provisionar/configurar Supabase, cadastrar `SUPABASE_URL` e `SUPABASE_ANON_KEY` em cada ambiente e aplicar 0001–0011 na ordem.
- Até essa configuração e validação real, não considerar cadastro, login, painel administrativo, catálogo ou tentativas como funcionais em produção.

## Atualização — 2026-11-06

- A configuração Vercel descrita no início deste documento agora registra `SUPABASE_URL` e `SUPABASE_ANON_KEY` nos ambientes Development, Preview e Production. A presença das variáveis não comprova conectividade ou schema compatível.
- As migrations versionadas chegam a 0013. Nenhuma execução foi confirmada nesta sessão; conferir o ledger antes de aplicar qualquer sequência, pois o estado do banco permanece desconhecido.
- PR #20 foi integrado; PR #21 contém o simulador e deriva de `main`. Typecheck, 34 testes e build passaram localmente após mudanças ainda não enviadas ao remoto.
- O health check público retornou HTTP 200. Login, submissão real, RLS, idempotência no PostgreSQL e conteúdo não foram validados.
- A API de questões, chamada sem sessão, retornou HTTP 401. O teste confirma somente a negação anônima observada; não houve login nem acesso a dados do Supabase.
- O Preview Vercel do PR #21 concluiu para `1a2f790`; isso não é produção. Não afirmar publicação ou validação de dados em produção.

## Atualização após PR #11 — 2026-11-05

- PR #11 foi mesclado à `main` no commit `1fd30bf049c547213f528edbb5153ce11f194ae1`.
- CI da branch `fix/question-editor-integrity` (run `42034208681`) passou em instalação, typecheck, testes unitários e build de produção.
- A migração 0011 agora preserva o gabarito durante a substituição de alternativas. Ela está versionada no repositório, mas ainda não foi aplicada/validada em Supabase.
- A Vercel recusou o deployment Preview do PR #11 por limite diário de deployments do plano (`api-deployments-free-per-day`); aguardar a janela de 24 horas ou resolver o limite antes de tentar novo deployment.
- A consulta anterior de variáveis Vercel retornou zero variáveis configuradas. Não há conexão Supabase disponível nesta sessão. Configuração do backend e testes reais permanecem bloqueadores P0.


## Migração 0012 — proteção do histórico de questões

Aplique `supabase/migrations/0012_lock_question_history.sql` depois da 0011. Quando uma questão já possui tentativas, a migração bloqueia alterações em enunciado, explicação, fonte, vínculos, alternativas e gabarito. Mudanças apenas de status editorial continuam permitidas. Para corrigir conteúdo que já recebeu respostas, crie uma nova questão/versão em vez de reescrever o histórico.

A migração foi preparada após auditoria estática: a FK de `question_attempts` referencia as alternativas, portanto a substituição integral das alternativas pode falhar quando já há tentativas. A proteção é uma regra conservadora de integridade; ainda precisa ser aplicada e testada em Supabase real.

A sequência de banco passa a ser 0001 → 0002 → 0003 → 0004 → 0005 → 0006 → 0007 → 0008 → 0009 → 0010 → 0011 → 0012.


## Atualização pós PR #12 — 2026-11-05

- PR #12 integrado à `main` no commit `c83d8657df1225acb43dcbbd692c341ec462cacc`.
- O check `Supabase Preview` associado ao commit integrado foi **ignorado (`skipped`)** porque a criação de branches Preview está desabilitada. Portanto, ele não validou a conexão, o projeto nem a aplicação de migrações. O projeto de referência identificado anteriormente é `htukocebmvczejxexsab`, mas o estado real do banco ainda precisa ser confirmado diretamente no Supabase.
- A consulta de variáveis da Vercel retornou zero variáveis cadastradas e zero ocultas. Cadastrar `NUXT_SUPABASE_URL` e `NUXT_SUPABASE_ANON_KEY` em cada ambiente Nuxt necessário.
- O deployment Vercel do commit integrado foi recusado por limite diário de deployments. O último deployment READY observado é anterior às alterações dos PRs #11 e #12.
- A sequência de migrações versionadas chega a 0012. Aplicação/validação real, testes de RLS/RPC e teste autenticado continuam pendentes.

## Auditoria de segurança editorial — 2026-11-06

- A revisão estática identificou que a migração 0006 concedeu privilégio de SELECT em nível de tabela para authenticated em study_questions. Esse grant ampliou o acesso além do grant seguro por coluna da migração 0002 e poderia expor explanation de questões publicadas antes da resposta.
- A migração 0013 move a explicação para study_question_editorial_details, protegida por RLS para editores, preserva os dados existentes, retira o SELECT amplo e mantém somente as colunas públicas da questão disponíveis aos estudantes.
- A RPC submit_question_attempt passa a devolver a explicação protegida somente após uma tentativa válida. O bloqueio de alterações após respostas também se aplica à explicação.
- A migração 0013 concede INSERT, UPDATE e DELETE em platform_admins à role authenticated; as políticas RLS de 0006 continuam restringindo essas operações a owners.
- Os endpoints editoriais foram adaptados para ler/gravar explicações na tabela protegida.
- Foi adicionado supabase/diagnostics/phase-2-read-only-audit.sql, que consulta catálogo, RLS, políticas, funções, grants, triggers e histórico de migrações sem alterar dados.
- Importante: essas mudanças estão em revisão no PR da branch fix/admin-role-table-grants. Não aplicar a migração 0013 em produção antes da aprovação do CI e da conferência do estado real das migrações 0001–0012.
