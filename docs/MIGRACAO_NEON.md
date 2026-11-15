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

## Provisionamento Neon confirmado — 15/11/2026

A organização independente `org-bold-mountain-42921987` (plano **Free**, gerenciada pelo próprio console Neon) foi disponibilizada e confirmada.

- **Projeto:** `meaprovae` — ID `flat-frog-80262320`; PostgreSQL **17**, região `aws-sa-east-1` (São Paulo).
- **Banco:** `meaprovae` (UTF8); branch principal `main` — `br-round-cell-b6guly16`.
- **Branch isolada de homologação:** `migration-staging` — `br-dry-frost-b64e6265`; consultas de leitura confirmaram PostgreSQL **17.12** e zero tabelas `public`.
- **Conexão:** consulta SQL executada com sucesso via integração Neon. Nenhuma URL de conexão, senha ou chave foi publicada no Git.
- **Preflight automatizado:** `scripts/neon/compatibility.sql` executado com sucesso em `migration-staging` (6 verificações somente leitura). O mesmo arquivo foi adicionado ao runner de integração PostgreSQL do CI. Detectou ausência de `auth.users`/`storage.objects` no destino e ausência de dependências Supabase até o momento.
- **Extensões verificadas no destino:** `pgcrypto`, `uuid-ossp` e `pg_stat_statements` disponíveis para instalação; `supabase_vault` **não disponível**. Não instalar nem omitir objetos dependentes dessa extensão sem análise. Nenhuma extensão foi instalada neste passo.
- **Origem:** PostgreSQL 17.11; aproximadamente 15 MB no banco, 2.7 MB em tabelas da aplicação. SQL confirmou 160 questões, 640 alternativas, 160 respostas corretas, 160 explicações, 7 tentativas, 1 sessão de prova, 1 perfil, 1 usuário Auth e 1498 eventos de auditoria no momento da inspeção.
- **Identidade:** existem 11 FKs da aplicação para `auth.users`, 12 funções dependentes de `auth.uid()` e 15 políticas dependentes dessa identidade. Não restaurar o schema `auth` indiscriminadamente: a alternativa de autenticação ainda precisa de compatibilidade de UUID, sessão e autorização.
- **Recursos da origem:** Storage com 0 buckets / 0 objetos; nenhuma Edge Function implantada. Realtime e todos os recursos não SQL ainda exigem auditoria funcional.

## Etapa ainda bloqueada — transferência dos dados

Para executar `pg_dump` / `pg_restore` ou o Import Data Assistant **sem expor segredos**, precisamos disponibilizar a conexão PostgreSQL **direta** da origem em um ambiente seguro de execução (não em texto do chat, commit ou log), ou executar a importação pelo console com a credencial mantida exclusivamente nele. Os conectores SQL atuais não fornecem uma transferência binária de backup verificável. Não copiar linhas de dados pessoais por respostas de ferramentas.

A restauração deve ocorrer primeiro na branch `migration-staging`, não na principal. Como parte da origem depende de `auth.users` e `supabase_vault`, qualquer importação requer um plano explícito de compatibilidade antes de se tornar utilizável.

Nenhum dado foi copiado; nenhuma migração foi aplicada; Supabase Auth e produção permanecem inalterados. A branch Neon `migration-staging` está isolada da branch principal, pronta para testes de compatibilidade antes da restauração de um backup protegido.

Documentação de referência: https://neon.com/docs/import/migrate-from-supabase

## Verificação automatizada da preparação

O CI executa o inventário SQL sobre o PostgreSQL descartável da suíte de integração. Isso valida sintaxe e execução sem consultar a origem de produção. O arquivo pode ser executado com conexão TLS direta **em modo somente leitura** na origem e no destino, quando o destino estiver disponível. Não conectar o CI a dados de produção.
