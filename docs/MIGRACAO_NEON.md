# Migração Supabase → Neon — preparação segura

Status: **em preparação; nenhuma migração de dados ou cutover executado** (2026-11-15).

## Inventário verificado (somente leitura)

- Origem: Supabase PostgreSQL 17.11, projeto atual do Me Aprovaê.
- Schema `public`: 25 tabelas, 31 funções, 45 políticas RLS, 33 triggers próprios e nenhuma view.
- Extensões: `pgcrypto`, `uuid-ossp`, `pg_stat_statements`, `supabase_vault` (além de `plpgsql`).
- `auth` e `storage` são schemas gerenciados pelo Supabase e **não devem ser restaurados cegamente** no Neon.
- A inspeção SQL confirmou **11 chaves estrangeiras** de `public` para `auth.users`, **12 funções** com uso de `auth.uid()` e **15 políticas RLS** com referência a `auth.uid()`. Essas relações exigem solução explícita de identidade/roles antes da migração.
- O storage do projeto consultado possui **0 buckets e 0 objetos** no momento do diagnóstico; isso não prova ausência de uso futuro.
- Existem dados reais de questões, respostas, histórico editorial e usuários. `pg_stat_user_tables.n_live_tup` é apenas uma estimativa; use `scripts/neon/inventory.sql` em origem e destino para contagens exatas.
- Backend: `@supabase/ssr`, `@supabase/supabase-js`, cookies de sessão, `auth.getUser()`, RPCs, `auth.uid()` e RLS. Não basta substituir a URL de conexão.
- `supabase/migrations` contém objetos com dependências de funções/roles do Supabase; requer análise de compatibilidade e nova camada de identidade/autorização antes da migração.

## Sequência obrigatória

1. Conectar uma organização Neon com permissão de criação de projetos; criar projeto independente `meaprovae` em região apropriada, PostgreSQL compatível, plano gratuito, credenciais isoladas.
2. Inspecionar extensões, FKs com `auth.users`, policies, funções SECURITY DEFINER, storage buckets/objects e integrações Realtime/Edge; classificar dependências que precisam ser substituídas.
3. Definir e testar o provedor de identidade substituto (por exemplo Better Auth) e o mapeamento de IDs, sessões, funções `auth.uid()`, roles e RLS. Preservar autenticação Supabase até uma alternativa comprovadamente funcional.
4. Preparar banco Neon vazio de homologação, conexão TLS, **URL direta** para dump/restore/migrations e URL pooled somente para acesso de aplicação compatível.
5. Realizar backup completo verificável da origem com `pg_dump -Fc` usando conexão **não pooled**; proteger o arquivo fora do Git. Inspecionar `pg_restore --list` e testar restauração em banco descartável. Não importar os schemas gerenciados `auth` e `storage` como se fossem independentes.
6. Adaptar esquema e funções, importar dados, comparar inventário exato, integridade, índices, constraints, triggers, sequences, permissões e testes de integração.
7. Validar login, autorização, isolamento de usuários, APIs, CRUD, RPCs, histórico e rollback em homologação. CI e builds no GitHub Actions; preview Vercel somente após lote consolidado.
8. Planejar sincronização final ou janela de escrita congelada; **nunca manter duas origens com gravações independentes**. Só executar cutover de produção mediante autorização explícita.
9. Manter Supabase intacto e backup preservado; plano de retorno: interromper gravações, reconciliar escritas realizadas após o corte e apontar novamente para origem validada.

## Variáveis (nomes, nunca valores)

- `DATABASE_URL`: conexão TLS pooled, **somente servidor**, quando a camada SQL estiver implementada.
- `DIRECT_DATABASE_URL`: conexão TLS direta, apenas migração/backup/administração.
- `SUPABASE_URL` e `SUPABASE_ANON_KEY`: manter até substituir Auth e chamadas REST/RPC.
- Não expor strings PostgreSQL em `NUXT_PUBLIC_*`, código, logs ou artefatos de CI.

## Bloqueio atual

A integração Neon está **conectada** e permite listar organizações/projetos, mas a única organização acessível, `Vercel: thiagocanali's projects`, usa plano gratuito **gerenciado pela Vercel**. A operação de criar o projeto `meaprovae` (PostgreSQL 17, região São Paulo) foi recusada com `action restricted; organization is managed by Vercel`. Seu único projeto existente acessível, `neon-lime-apple` (PostgreSQL 18, região US East 1), não será reutilizado: a exigência é projeto isolado. Para continuar o provisionamento, é necessário vincular uma organização Neon independente com permissão de criação, ou criar o projeto `meaprovae` no console Neon e disponibilizar o projeto pela conexão. Nenhuma cópia de dados, mudança em Vercel ou alteração de produção foi realizada.

Documentação de referência: https://neon.com/docs/import/migrate-from-supabase

## Verificação automatizada da preparação

O CI executa o inventário SQL sobre o PostgreSQL descartável da suíte de integração. Isso valida sintaxe e execução sem consultar a origem de produção. O arquivo pode ser executado com conexão TLS direta **em modo somente leitura** na origem e no destino, quando o destino estiver disponível. Não conectar o CI a dados de produção.
