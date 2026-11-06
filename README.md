# Me Aprovaê

> Um ecossistema de aprendizagem, organização e evolução para quem se prepara para concursos públicos no Brasil.

O **Me Aprovaê** é uma plataforma EdTech que reúne organização de editais, trilhas de estudo, banco de questões, simulados, revisão inteligente, acompanhamento de desempenho e gamificação em uma experiência integrada.

## Objetivo

Ajudar cada estudante a entender **o que estudar, o que revisar, onde está errando e como está evoluindo** até estar preparado para sua prova.

## Princípios do produto

- Aprendizagem real acima de métricas de vaidade.
- Progresso transparente, mensurável e persistente.
- Experiência acessível, responsiva e consistente.
- Gamificação que recompensa consistência e domínio, não cliques.
- Conteúdo com origem, qualidade e direitos de uso verificáveis.
- Privacidade, segurança e conformidade com a LGPD desde a concepção.
- Nenhuma funcionalidade deve ser apresentada como operacional se ainda for demonstrativa ou estiver pendente.

## Aplicação

A aplicação está sendo evoluída em **Nuxt 4 + Vue 3 + TypeScript**, com CSS próprio. A branch de trabalho contém identidade Supabase SSR, catálogo e motor de questões, progresso, favoritos, revisão e fundação administrativa. Esses módulos ainda dependem de provisionamento e validação do Supabase; não devem ser considerados operacionais antes dos testes de integração e publicação.

- Site: https://meaprovae.vercel.app
- Repositório: https://github.com/thiagocanali/MeAprovae
- Guia de deploy: [DEPLOYMENT.md](docs/DEPLOYMENT.md)

## Documentação

| Documento | Finalidade |
|---|---|
| [Visão do produto](docs/PRODUCT_VISION.md) | Problema, público, proposta de valor e princípios |
| [Requisitos](docs/PRODUCT_REQUIREMENTS.md) | Escopo funcional e não funcional |
| [MVP](docs/MVP.md) | Primeira versão utilizável e critérios de aceite |
| [Roadmap](docs/ROADMAP.md) | Evolução planejada por etapas |
| [Arquitetura](docs/ARCHITECTURE.md) | Diretrizes e decisões técnicas |
| [Modelo de dados](docs/DATA_MODEL.md) | Entidades e relacionamentos conceituais |
| [Plano de implementação](docs/IMPLEMENTATION_PLAN.md) | Ordem sugerida de construção do MVP |
| [Deploy](docs/DEPLOYMENT.md) | Ambientes, Vercel e variáveis |
| [UX/UI](docs/UX_UI.md) | Navegação, experiência e identidade |
| [Aprendizagem](docs/LEARNING_EXPERIENCE.md) | Princípios pedagógicos e revisão |
| [Gamificação](docs/GAMIFICATION.md) | XP, níveis, conquistas e rankings |
| [Conteúdo e questões](docs/CONTENT_GOVERNANCE.md) | Curadoria, procedência e qualidade |
| [Tutor IA](docs/AI_TUTOR.md) | Escopo, limites e segurança da IA |
| [Segurança e LGPD](docs/SECURITY_AND_PRIVACY.md) | Proteção de dados e controles |
| [Monetização](docs/MONETIZATION.md) | Planos e preparação para assinaturas |
| [Contribuição](CONTRIBUTING.md) | Padrões de trabalho e colaboração |
| [Decisões técnicas](docs/decisions/README.md) | Registro de decisões arquiteturais |

## Status atual

**Fase:** núcleo de estudo em validação. `main` inclui o PR #20, com a migração 0013 para proteger explicações e corrigir grants editoriais. O PR #21 adiciona simulados na branch `feat/user-exam-simulado`; a auditoria local identificou e corrigiu idempotência de retries e inconsistências na nota/revisão. Typecheck, 32 testes unitários e build passaram localmente após essas correções. Isso não valida migrations, RLS ou RPCs no Supabase: não houve conexão ao banco. Em produção, `/api/health` respondeu HTTP 200 e a API de questões respondeu HTTP 401 sem sessão, como esperado; login e fluxo do estudante seguem sem validação real. O deployment do PR está bloqueado por rate limit da Vercel. Consulte [PROJECT_AUDIT.md](PROJECT_AUDIT.md), [ENVIRONMENT.md](ENVIRONMENT.md) e [PROGRESS.md](PROGRESS.md).

## Princípio sobre dados demonstrativos

Dados fictícios devem ser identificados como demonstração. Questões criadas para exemplo nunca devem ser atribuídas a bancas ou concursos reais. Integrações indisponíveis devem ser sinalizadas como pendentes.

## Próximos passos

1. Confirmar o ledger e aplicar, em ambiente controlado, as migrações 0001–0013.
2. Executar os testes de vazamento e isolamento com perfis de estudante e editor.
3. Validar conteúdo publicado e o fluxo ponta a ponta de questões/simulado.
4. Aguardar CI do HEAD atualizado e liberação do deployment Vercel antes de atualizar produção.

---

Projeto em construção.
