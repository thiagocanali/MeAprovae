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

## Endurecimento de segurança do ciclo (15/11/2026)

- A ponte Nuxt → Neon Auth reescreve cookies recebidos da origem remota como cookies da própria aplicação, com `Path=/`, `HttpOnly` e sem `Domain` externo, preservando os atributos de segurança emitidos pelo provedor. Testes rejeitam cookies com injeção de quebras de linha.
- Falhas de infraestrutura da sessão retornam erro de serviço, sem serem confundidas com ausência voluntária de sessão.
- O transporte autenticado para Data API rejeita redirecionamentos HTTP, validando previamente o destino HTTPS; JWTs de outros clientes não são reutilizados.
- URLs de Neon Auth e Data API devem apontar para a **mesma branch e o mesmo banco**. Configuração cruzada é rejeitada antes de fazer a chamada.
- Os testes PostgreSQL também conferem que usuários anônimos não podem executar RPCs editoriais e que um estudante novo não obtém privilégios de editor.
- A validação real com duas sessões, cookie round-trip em navegador, recuperação por e-mail e visual das páginas ainda requer um ambiente de homologação executando a aplicação; os testes unitários e de banco isolados não substituem essa etapa.

## Ciclo de integração adicional — novembro de 2026

- No proxy Nuxt, somente cookies `neon-auth.*` ou `better-auth.*` (incluindo prefixos seguros) são aceitos e encaminhados ao serviço Managed Auth. Isso evita encaminhar cookies não relacionados do domínio da aplicação.
- O provedor emite cookies com `SameSite=None; Partitioned` para operações entre sites. Ao retransmiti-los como cookies **first-party**, a aplicação remove `Partitioned` e normaliza `SameSite=Lax`, `Path=/` e `HttpOnly`, mantendo `Secure` quando presente.
- Respostas HTTP `429` mantêm a informação de excesso de tentativas; falhas `5xx` e timeout de 15 segundos retornam indisponibilidade, sem simular erro de credenciais.
- Os testes SQL do banco descartável passaram a exercitar o RPC `set_student_study_goal` com duas identidades distintas e verificar que cada usuário só enxerga sua própria meta ativa.
- A verificação funcional de autenticação no **navegador com cookies reais** continua pendente, assim como a confirmação de compatibilidade de todos os recursos com os endpoints Managed Auth. Não expor credenciais, desabilitar proteções, iniciar preview automático nem promover migração antes dessa etapa.

## Novo lote — autenticação e APIs (16/11/2026)

Este lote tratou cinco frentes de implementação sem modificar a produção:

1. **Respostas do Neon Auth:** redirects inesperados (3xx) são rejeitados sem retransmitir cookies; respostas que não sejam JSON não são interpretadas como sessões válidas.
2. **Neon Data API:** timeout de 15 segundos, sem seguir redirecionamentos nem expor JWT a outros destinos.
3. **Criação de perfis:** o nome exibido é lido no próprio banco Neon Auth pelo RPC, evitando inconsistências e limites de tamanho entre a sessão e o banco.
4. **Rotas da aplicação:** testes unitários simulados para login, cadastro, logout, recuperação e redefinição de senha, verificando que o modo Neon não recorre ao Supabase.
5. **Identidade consistente:** após o RPC de criação do perfil, o backend compara o UUID validado pelo JWT da Data API com o UUID da sessão Neon Auth; discrepâncias são rejeitadas.

Atenção: testes com mocks e PostgreSQL descartável **não** substituem uma verificação real no navegador. O banco `migration-app-staging` não recebeu contas pessoais nem importação de dados. Qualquer aprovação para produção ainda depende de E2E com contas de homologação, SMTP, segurança e rollback.


## Ciclo adicional — origem confiável, sessão e contratos de API (16/11/2026)

- O backend Neon **não utiliza mais o cabeçalho Host para definir links de recuperação nem Origin para autenticação**. Exige `NEON_APP_ORIGIN` configurada com a origem pública canônica da aplicação (HTTPS, ou HTTP somente para localhost) e rejeita caminho, credenciais, query e fragmentos.
- A configuração `NEON_APP_ORIGIN` é privada; não habilitar `DATABASE_PROVIDER=neon` em homologação ou produção sem definir essa variável e registrar a mesma origem nas configurações de Neon Auth.
- Cadastro e login rejeitam UUIDs inválidos ou respostas incompletas do serviço de autenticação, em vez de retornar sucesso aparente.
- Os testes de contrato das APIs cobrem catálogo vazio, falhas do provedor, autenticação obrigatória, idempotência de respostas e mapeamento de erros SQL.
- A inspeção SQL **somente leitura** na `migration-app-staging` confirmou: 0 usuários Auth, 0 perfis, 0 questões, 45 políticas RLS e 69 índices.
- Essas verificações unitárias/SQL não demonstram o fluxo de navegador com cookies reais, entrega de e-mail e funcionamento de todas as funcionalidades em hospedagem. Validar esses pontos antes de qualquer alteração na produção.

## Ciclo de segurança e testes de integração — 19/11/2026

### Alterações implementadas na branch de desenvolvimento

1. **CSRF na autenticação:** os endpoints mutáveis enviados ao Neon Auth rejeitam cabeçalhos `Origin` diferentes da origem canônica configurada em `NEON_APP_ORIGIN`. Requisições de backend sem `Origin` continuam permitidas; o servidor não confia no `Host` encaminhado pelo navegador.
2. **Cookies de sessão:** rejeição de cookies com prefixos `__Host-` ou `__Secure-` que não tenham atributo `Secure`, além da filtragem de domínio, caminho, HttpOnly, SameSite e Partitioned já implementada.
3. **Compatibilidade PostgREST:** teste de integração do adaptador `@supabase/ssr` em modo Neon, comprovando a construção de consultas e chamadas RPC para a Data API sem utilizar a URL original do Supabase (requisições interceptadas por mock; não equivale a teste com JWT real).
4. **Verificação CI:** `validate`, `database` e `neon-database` aprovados no CI #374 para o commit `91c0164`.
5. **Divergência da PR:** `main` recebeu dois commits que ainda não constam da branch desta PR. Arquivos envolvidos: `app/pages/app/favoritas.vue` e documentação de favoritos/isolamento. A API do GitHub reportou `mergeable=false`; não executar merge, rebase ou force push automaticamente sem reconciliar a evolução do frontend.

### Bloqueio para teste ponta a ponta

- A branch `migration-app-staging` possui Managed Better Auth e Data API ativos, mas a configuração Neon Auth consultada retornou **`trusted_origins: []`** e `allow_localhost=true`. Configurar a origem HTTPS de um ambiente de homologação **real** antes de testar autenticação hospedada. Não utilizar domínio de produção.
- Não foram criadas contas, importados registros ou implantadas alterações na Vercel.
- Requer validação de cadastro/login/logout, cookies, JWT, RLS e recuperação de senha usando ambiente isolado e contas temporárias reais antes de declarar a migração concluída.

## Ciclo — 19/11/2026: reconciliação de favoritas e testes

- A PR #51 foi comparada com `main`. Dois commits da base introduziram correções na página de favoritas e documentos de isolamento. A navegação padronizada `StudentNavigation` da PR foi mantida e o fluxo de **Resolver questão** (`/app/questoes?questionId=UUID`) foi incorporado, junto do estado de questão indisponível e mensagem de erro orientada ao estudante.
- Os documentos `docs/DATA_ISOLATION_2026-11-13.md` e `docs/FAVORITE_PRACTICE.md` foram copiados integralmente de `main` para a branch da PR, sem alterar a base ou executar merge.
- Novo `tests/unit/neon-favorites-routes.test.ts` cobre login obrigatório, listagem limitada à identidade validada, upsert idempotente, remoção apenas da própria favorita, UUIDs inválidos e falhas do provedor.
- O job `neon-database` agora exige RLS habilitada para **todas** as tabelas públicas e políticas de SELECT/INSERT/DELETE de favoritas vinculadas a `auth.uid()`.
- A compatibilidade dos testes em PostgreSQL descartável não substitui navegador com JWT real. A homologação Neon continua sem dados antigos; nenhuma alteração de produção ou deploy de preview foi feita.

### Condição para encerramento da migração

Antes de alterar `DATABASE_PROVIDER` fora da homologação, validar duas identidades temporárias reais, cadastro, sessão, favoritos, simulados, recuperação de senha e administração editorial com URLs de autenticação e Data API correspondentes à mesma branch. Confirmar que a origem de homologação está na lista confiável Neon Auth, sem reutilizar o domínio de produção. Não mesclar a PR sem reconciliar a base e revisar CI.

## Ciclo de endurecimento do gateway — 19/11/2026

- Endpoints de autenticação que modificam sessão ou credenciais rejeitam `Sec-Fetch-Site: cross-site` mesmo quando o navegador não envia um cabeçalho `Origin`. A validação canônica de origem continua habilitada.
- A Data API não recebe solicitações com URLs contendo credenciais embutidas ou fragmentos, além das restrições de esquema, host e prefixo de caminho previamente implementadas.
- Cookies entrantes de Neon Auth / Better Auth são limitados a 8 KiB e têm nomes duplicados eliminados, preservando o primeiro valor para reduzir ambiguidade de sessão entre intermediários.
- Quando a consulta ao endpoint de token do Neon responde `401` ou `403`, a aplicação identifica a sessão como expirada, em vez de relatar uma indisponibilidade geral da infraestrutura.
- Os testes automatizados foram ampliados para cobrir CSRF via Fetch Metadata, URLs inválidas, cookies duplicados/excessivos e JWT expirado.
- O sistema original Supabase segue como padrão; nenhum deploy, dado real, conta pessoal ou alteração de produção foi realizado.

A branch `migration-app-staging` permanece o único ambiente Neon destinado a testes da aplicação. A aprovação do CI comprova os testes existentes, mas **não substitui** a validação E2E com duas contas e cookies reais em uma origem de homologação autorizada.

## Ciclo: configuração estrita e sessão segura (19/11/2026)

1. A proxy de autenticação define `Cache-Control: private, no-store` e `Pragma: no-cache` em respostas do Neon Auth, evitando armazenamento intermediário de respostas de sessão. Cookies recebidos em uma origem HTTPS recebem o atributo `Secure`, mesmo quando o upstream não o informou para um nome sem prefixo.
2. O seletor privado `DATABASE_PROVIDER` aceita apenas `supabase` e `neon`. Um erro de digitação agora falha fechado (503) em vez de redirecionar silenciosamente chamadas para o Supabase original.
3. A rota `/auth/callback`, exclusiva de troca de código PKCE do Supabase, é desabilitada no modo Neon para evitar a execução da autenticação legada com um backend incompatível. O fluxo Supabase permanece preservado.
4. Testes unitários adicionais verificam atributos seguros dos cookies, cabeçalhos anti-cache, rejeição de provider inválido, bloqueio de callback antigo em Neon e compatibilidade do callback Supabase.
5. Auditoria somente leitura da branch `migration-app-staging`: funções `SECURITY DEFINER` identificadas; `anonymous` não executa `ensure_neon_student_account`, `authenticated` pode executá-la, e a tabela `auth_users` não expõe leitura direta a esses papéis.

**Limitação atual:** ainda não foi realizado um teste de login/cadastro em navegador com as duas sessões reais necessárias. Uma origem HTTPS de homologação separada da produção e o respectivo cadastro em Neon Auth continuam pendentes.

## Validação e pendências obrigatórias

- [x] Projeto Neon isolado e branch de homologação funcional
- [x] Managed Auth + Data API habilitados na `migration-app-staging`
- [x] Schema limpo aplicado sem dados legados; identidade vinculada ao Neon Auth
- [x] Migrations e teste PostgreSQL 17 reproduzíveis no GitHub Actions (CI #321)
- [x] Conferir CI do último commit da integração Nuxt (CI #374, commit `91c0164`; verificar novamente após novos commits)
- [ ] Fluxos de cadastro, login, logout, recuperação, sessão após recarregar, cookies `HttpOnly` e E2E autenticado em homologação
- [ ] Verificar isolamento real com dois usuários, tentativas de leitura indevida, autoria, privilégios editoriais e RLS no Data API
- [ ] Garantir funcionamento de todas as APIs de catálogo, questões, respostas, simulados e administração
- [ ] Publicação inicial do banco de questões revisado (o Neon começa vazio intencionalmente)
- [ ] Testes de regressão e validação hospedada única quando a cota Vercel permitir
- [ ] Revisão de segurança, configuração SMTP de produção e plano de rollback

Não inferir funcionalidade aprovada apenas porque build ou SQL passaram. **Nenhuma alteração na produção e nenhum merge sem autorização.**

## Rollback

O backend padrão continua usando Supabase. Desfazer a opção `DATABASE_PROVIDER=neon` em ambiente de teste retorna ao backend anterior sem tocar no banco original. Ao migrar produção futuramente, verificar dados escritos no Neon e evitar duas origens aceitando gravações simultaneamente; preparar plano de reconciliação antes de qualquer reversão.
