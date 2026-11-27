# Deploy e ambientes

## Implementação e produção atuais

Nuxt 4, Vue 3, TypeScript e Supabase SSR/PostgreSQL. Produção: https://meaprovae.vercel.app; repositório: https://github.com/thiagocanali/MeAprovae. O vínculo Git/Vercel foi confirmado por metadados do deployment. A `main` em `1751c05` estava READY na auditoria de 26/11/2026; consultar [diagnóstico atual](MASTER_PLAN_AUDIT_2026-11-26.md) e PRs para resultados posteriores.

Cadastro, login, questões, histórico, desempenho, simulados persistidos e editorial já têm implementação. A homologação integral de Auth com e-mail e duas contas permanece na #57. O antigo spike Drizzle/Neon não descreve o runtime atual e não autoriza migração.

## Build e CI

CI usa Node 22, pnpm 9.15.9 com `pnpm install --frozen-lockfile`, typecheck, Vitest, verificadores editoriais, dois builds com `NITRO_PRESET=vercel` e PostgreSQL 17 descartável. O preset gera `.vercel/output`; não substituir por `.output/public`. Preservar a configuração existente do projeto na Vercel; não disparar deploy manual nem alterar install/build settings neste ciclo.

O Git dispara o deploy após integração autorizada. CI verde não libera Auth, grants ou migrations sem homologação. Confirmar estado READY e SHA correto; verificar health 200, acesso público e 401 sem sessão em API protegida, sem imprimir headers/tokens ou interpretar isso como teste autenticado.

## Configuração privada

| Nome | Uso real |
| --- | --- |
| `SUPABASE_URL` | URL do projeto Supabase, configuração do servidor |
| `SUPABASE_ANON_KEY` | Cliente SSR em nome do usuário; RLS continua obrigatória |
| `AUTH_REDIRECT_ORIGIN` | **Proposta da PR #66**, origem canônica para links; gate abaixo |
| `NODE_ENV` | Gerenciado pela plataforma |

Referências: [template sem valores](../.env.example) e [ambiente](../ENVIRONMENT.md). O app não usa DATABASE_URL/Drizzle nem service_role nas APIs pessoais. Credenciais provisionadas pela integração não são autorização para usá-las. Nunca versionar segredos ou URLs com tokens. A consulta de presença/escopo deve usar metadados sem descriptografar valores.

## Gate obrigatório da PR #66 — manter draft

- `AUTH_REDIRECT_ORIGIN` estava ausente em production/preview/development na auditoria. Não integrar esta PR nessa condição: cadastro/recuperação falham com 503 no código proposto.
- Definir a origem HTTPS controlada de cada ambiente autorizado e conferir callbacks exatos na allowlist Supabase. Não inferir origem de Host/x-forwarded-host; não compartilhar credenciais produtivas para testar previews.
- Apenas no desenvolvimento local, HTTP localhost/127.0.0.1 é permitido. Configurações com credenciais, caminhos, query ou fragmento são rejeitadas.
- Validar cadastro/confirmação e recuperação/redefinição com duas contas e caixas de e-mail controladas em homologação apropriada. Incluir links expirados/reutilizados, atualização de página, logout, expiração, API/IDs alheios e estudante/editor. Não criar contas de terceiros nem fixtures em produção.
- Identificar commit e deployment nos resultados, conservar tokens/cookies/links e dados pessoais fora de logs/capturas. Testes H3 com Auth sintético e banco descartável não substituem esse gate.
- Mudanças sensíveis requerem revisão, homologação e aprovação específica de integração. PR #71 tem seu próprio gate de schema/RLS e não é liberada por esta validação.

## Cache, sessão e reversão proposta

Respostas pessoais/Auth/SSR recebem private/no-store; o bridge aplica headers de cache junto aos cookies emitidos pelo SDK. Não habilitar ISR/cache compartilhado nessas rotas. `getUser()` valida identidade no servidor, autorização editorial consulta atribuições no banco. Logout pede scope local; a revogação efetiva de tokens deve ser comprovada na homologação, não presumida pelo retorno 200.

Para reverter o código, reverter o commit de aplicação e aguardar deploy Git normal. Não fazer DROP nem revogar grants em lote. Se a versão anterior à origem canônica for usada, reabre o risco de Host: tratar rollback como contingência, registrar impacto e restringir envios de e-mail até correção. Não remover ou trocar secrets automaticamente.
