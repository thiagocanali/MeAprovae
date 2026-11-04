# ADR-0002 — Recomendação de stack para o MVP

- **Status:** Proposta para aprovação
- **Data:** 2026-11-04
- **Escopo:** aplicação web do MVP

## Contexto

O Me Aprovaê precisa de uma aplicação web responsiva, autenticação, APIs, banco relacional, catálogo editorial e fluxos de estudo com regras de negócio no servidor.

A especificação inicial cita React/Next.js, TypeScript e PostgreSQL. O mantenedor também possui experiência prática com Vue e Node.js e busca manter os custos iniciais baixos.

## Opções consideradas

### Opção A — Next.js + TypeScript + PostgreSQL

Vantagens:
- Ecossistema React amplo.
- Framework full-stack maduro.
- Server Components e Server Actions.
- Boa documentação e opções de hospedagem.

Desvantagens:
- Curva de aprendizado maior em relação à experiência atual do mantenedor com Vue.
- Ecossistema React exige decisões adicionais de estado, formulários e padrões de interface.

### Opção B — Nuxt 4 + Vue 3 + TypeScript + Nitro + PostgreSQL

Vantagens:
- Aproveita experiência já existente com Vue e Node.js.
- Permite frontend e endpoints de servidor no mesmo projeto.
- Estrutura full-stack e suporte a deploy em diferentes ambientes.
- Mantém uma base TypeScript consistente.

Desvantagens:
- Alguns exemplos e integrações de terceiros são mais centrados em Next.js.
- É necessário validar a compatibilidade das bibliotecas de autenticação SSR escolhidas.
- Nuxt 5 ainda está em desenvolvimento na data desta ADR; não deve ser adotado como base do MVP.

### Opção C — frontend separado e API independente

Vantagens:
- Separação explícita entre cliente e backend.
- Pode facilitar clientes adicionais no futuro.

Desvantagens:
- Mais repositórios, deploys, contratos e configuração desde o primeiro dia.
- Custo operacional e cognitivo maior para o MVP.
- Não há necessidade atual comprovada de separar os serviços.

## Recomendação

Adotar como base proposta:

- Nuxt 4.6.x (última linha estável verificada nesta revisão).
- Vue 3.
- TypeScript.
- Nitro para endpoints e lógica de servidor.
- PostgreSQL como banco principal.
- Drizzle ORM para schema tipado e migrações SQL versionadas.
- CSS próprio com tokens e componentes reutilizáveis.
- Vitest para testes unitários/integração.
- Playwright para testes ponta a ponta.
- GitHub Actions para CI.

A proposta escolhe um monólito modular. Não criar microserviços no MVP.

## Banco gerenciado e autenticação

Supabase é candidato para hospedar PostgreSQL e, potencialmente, autenticação e armazenamento. O plano Free permite prototipagem, mas possui limites de recursos e pode pausar projetos com baixa atividade. Portanto:
- Usar Free apenas para desenvolvimento, protótipo e piloto inicial.
- Não assumir disponibilidade contínua ou backups automáticos no plano gratuito.
- Definir estratégia de backup e restauração antes de produção.
- Monitorar limites e custo antes de abrir o serviço ao público.

Supabase Auth é candidato, mas a integração SSR e os pacotes disponíveis precisam de um pequeno spike técnico em Nuxt antes da decisão final. Se a integração depender de pacote beta ou API instável, comparar alternativa de autenticação antes de construir o fluxo completo.

## Segurança obrigatória

- Credenciais privilegiadas apenas no servidor.
- Validar identidade em rotas protegidas.
- Nunca confiar em sessão apenas decodificada sem verificação.
- Políticas de acesso por usuário no banco quando suportadas.
- Validar autorização no backend mesmo com RLS.
- Aplicar migrações versionadas e revisadas.
- Não incluir segredos em commits, logs ou variáveis públicas.

## Consequências

Positivas:
- Menor curva de aprendizado para o mantenedor.
- Stack full-stack simples para equipe pequena.
- Tipagem de ponta a ponta e banco relacional.
- Baixo custo para iniciar desenvolvimento e validar o produto.

Negativas:
- Dependência de decisões e integrações do ecossistema Nuxt.
- Necessidade de validar autenticação SSR e deploy antes de produção.
- Plano gratuito do banco não é adequado como compromisso de disponibilidade para produto comercial.

## Critérios para aceitar esta ADR

1. Executar spike Nuxt + PostgreSQL + Drizzle.
2. Validar autenticação SSR com cookies e renovação de sessão.
3. Demonstrar uma rota protegida e isolamento entre dois usuários.
4. Executar uma migração e teste de integração.
5. Fazer build e deploy de preview.
6. Estimar custos e política de backup.

Se algum critério falhar, revisar a escolha antes de criar módulos de negócio.

## Referências consultadas

- Nuxt releases: https://github.com/nuxt/nuxt/releases
- Nuxt server routes: https://nuxt.com/docs/4.x/directory-structure/server
- Drizzle PostgreSQL: https://orm.drizzle.team/docs/get-started/postgresql-new
- Drizzle migrations: https://orm.drizzle.team/docs/migrations
- Supabase pricing: https://supabase.com/pricing
- Supabase SSR Auth: https://supabase.com/docs/guides/auth/server-side

## Próxima ação

Executar o spike técnico descrito nos critérios de aceite. Não iniciar funcionalidades de produto até validar a fundação.
