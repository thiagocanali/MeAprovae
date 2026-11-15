# Migração limpa para Neon PostgreSQL

**Status (2026-11-15): desenvolvimento isolado na PR #51. Ainda não aprovado para produção.**

## Decisão e preservação

O proprietário confirmou que **nenhuma conta de teste nem dado legado do Supabase precisa ser migrado**. O destino Neon recebe somente a estrutura e começa vazio. O projeto original Supabase fica integralmente preservado e não é pausado ou excluído. A produção continua usando Supabase; `DATABASE_PROVIDER` tem padrão `supabase`.

## Destino e ambientes

- Neon: organização independente Free `org-bold-mountain-42921987`, projeto `flat-frog-80262320` (`meaprovae`), PostgreSQL 17, São Paulo.
- `main` Neon: `br-round-cell-b6guly16` — **não alterada pela migração da aplicação**.
- `migration-staging` (`br-dry-frost-b64e6265`): experimento inicial do modelo SQL; **não usar** na aplicação porque o `auth.uid()` experimental lê variável de sessão em vez do componente JWT nativo.
- **`migration-app-staging` (`br-dry-recipe-b607zy7m`)**: destino funcional de homologação. Provisionados **Neon Managed Better Auth** e **Neon Data API**, que instala `auth.uid()` nativo e valida JWT. Aplicadas todas as migrations SQL existentes, adaptando FKs de `auth.users` para `public.auth_users`. Nenhuma questão ou conta do Supabase foi copiada.
- Estrutura atual em `migration-app-staging`: 25 tabelas de domínio + 1 tabela de vínculo `public.auth_users`, 45 políticas RLS, 34 triggers (incluindo vínculo), funções RPC, índices e constraints. A configuração é de **staging**, não de produção.

## Autenticação e isolamento

- `neon_auth."user"` é a fonte de identidade e sessão (Managed Better Auth). **Nunca** recriar senhas nem tokens em `public`.
- `public.auth_users` é ponte de UUIDs, com FK para `neon_auth."user"`, RLS habilitado e nenhuma permissão de escrita direta para usuários da API.
- `ensure_neon_student_account` valida o UUID de `auth.uid()` **nativo**, confirma a identidade em `neon_auth."user"` e cria perfil de estudante idempotentemente. Somente papel `authenticated` pode executar.
- O backend Nuxt valida cookies por Neon Auth e solicita um token de curta duração por `/token`, a ser verificado pela Neon Data API. A identidade nunca é recebida como parâmetro fornecido pelo cliente; o JWT do usuário deve determinar todas as políticas.
- Os endpoints de login, cadastro, logout, recuperação e redefinição de senha possuem roteamento por `DATABASE_PROVIDER`. Ainda são necessários testes funcionais reais (navegador, cookies e e-mails) e auditoria da autorização administrativa.
- Os endpoints atuais de banco preservam temporariamente o cliente PostgREST `supabase-js` como **construtor de requisições**, mas a camada `server/utils/neon.ts` substitui o transporte pelo Neon Data API, com URL conferida e Bearer JWT. **Não** ligar para Supabase Auth quando `DATABASE_PROVIDER=neon`.

## Migrations reproduzíveis

1. No Neon, criar branch a partir de `main` e provisionar Managed Neon Auth + Neon Data API (JWT com `auth.uid()` nativo). Não utilizar as migrations experimentais de autenticação.
2. Aplicar `neon/migrations/0000_managed_auth_bridge.sql` (roles e FK `public.auth_users`).
3. Gerar o SQL das migrations existentes sem alterar a origem: `python3 scripts/neon/render-clean-schema.py --output /tmp/meaprovae-neon-schema.sql`.
4. Aplicar esse SQL na branch isolada com conexão PostgreSQL **direta**; não executar na branch principal sem autorização.
5. Aplicar `neon/migrations/0001_ensure_neon_student_account.sql`.
6. Executar testes de RLS, permissões, catálogo, RPCs, endpoints, Auth e navegação antes de qualquer promoção.

O script `scripts/neon/test-clean-schema.sh` recria e valida o schema em PostgreSQL 17 **descartável e localhost**, incluindo as fixtures de Auth **somente para CI**. O CI possui jobs `database` (legado), `neon-database` (nova arquitetura) e `validate` (typecheck, unitários, builds).

## Variáveis de ambiente

**Somente servidor** — não incluir credenciais em `NUXT_PUBLIC_*`, commits, logs ou artefatos:

```dotenv
DATABASE_PROVIDER=supabase
SUPABASE_URL=
SUPABASE_ANON_KEY=
NEON_AUTH_BASE_URL=
NEON_DATA_API_URL=
```

Somente na homologação Neon usar `DATABASE_PROVIDER=neon`, URL de Auth da **mesma branch** e URL de Data API terminando em `/rest/v1`. Para backup/migrations administrativas usar conexão TLS **direta** em local protegido; não adicionar `DATABASE_URL` ou senha de Postgres à aplicação enquanto ela usar exclusivamente a Data API.

## Inicialização segura da primeira conta editorial

O banco novo começa sem usuários nem administradores. Após cadastrar a conta real pelo Neon Auth no ambiente de homologação, verificar o **e-mail e o UUID** da identidade no console Neon e executar apenas na branch de homologação:

```bash
psql -X -v ON_ERROR_STOP=1 -v confirm_staging=on \
  -v owner_email='conta@example.com' -v owner_id='<UUID_DA_CONTA>' \
  -f scripts/neon/bootstrap-owner.sql
```

A conexão `psql` deve ser **direta, TLS e protegida**, nunca colocada em linha de comando, commits ou logs. O script usa um bloqueio de escrita e só insere um proprietário quando não existe nenhum administrador; exige a identidade simultaneamente por e-mail e UUID e não cria login nem senha. Nenhuma conta editorial foi criada nesta migração. Verificar a identidade manualmente antes de conceder autorização.

Em `migration-app-staging` o Neon Data API foi confirmado ativo com `auth_provider=neon_auth` e schema `public`. O cache do schema foi atualizado após aplicar as migrations. A inspeção de privilégios confirmou que `authenticated` pode executar `ensure_neon_student_account`, `anonymous` não pode, e a tabela `auth_users` não concede leitura direta a `authenticated`.

## Validação e pendências obrigatórias

- [x] Projeto Neon isolado e branch de homologação funcional
- [x] Managed Auth + Data API habilitados na `migration-app-staging`
- [x] Schema limpo aplicado sem dados legados; identidade vinculada ao Neon Auth
- [x] Migrations e teste PostgreSQL 17 reproduzíveis no GitHub Actions (CI #321)
- [ ] Conferir CI do último commit da integração Nuxt
- [ ] Fluxos de cadastro, login, logout, recuperação, sessão após recarregar, cookies `HttpOnly` e E2E autenticado em homologação
- [ ] Verificar isolamento real com dois usuários, tentativas de leitura indevida, autoria, privilégios editoriais e RLS no Data API
- [ ] Garantir funcionamento de todas as APIs de catálogo, questões, respostas, simulados e administração
- [ ] Publicação inicial do banco de questões revisado (o Neon começa vazio intencionalmente)
- [ ] Testes de regressão e validação hospedada única quando a cota Vercel permitir
- [ ] Revisão de segurança, configuração SMTP de produção e plano de rollback

Não inferir funcionalidade aprovada apenas porque build ou SQL passaram. **Nenhuma alteração na produção e nenhum merge sem autorização.**

## Rollback

O backend padrão continua usando Supabase. Desfazer a opção `DATABASE_PROVIDER=neon` em ambiente de teste retorna ao backend anterior sem tocar no banco original. Ao migrar produção futuramente, verificar dados escritos no Neon e evitar duas origens aceitando gravações simultaneamente; preparar plano de reconciliação antes de qualquer reversão.
