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

A aplicação está sendo evoluída em **Nuxt 4 + Vue 3 + TypeScript**, com CSS próprio. A `main` contém a fundação de autenticação Supabase SSR, catálogo e motor de questões, progresso, favoritos, revisão, área administrativa e suporte de código à dificuldade revisada (PR #33 integrada). A funcionalidade ainda não está operacional em produção: a migration 0016 não consta no ledger do Supabase e a coluna `difficulty_reviewed` não existe no banco auditado em 08/11/2026.

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
| [Auditoria editorial (07/11/2026)](docs/CONTENT_AUDIT_2026-11-07.md) | Diagnóstico estrutural corrigido do banco publicado |
| [Revisão inicial das 60 questões](docs/CONTENT_REVIEW_2026-11-07.md) | Triagem item a item, problemas prioritários e fontes de referência |
| [Tutor IA](docs/AI_TUTOR.md) | Escopo, limites e segurança da IA |
| [Segurança e LGPD](docs/SECURITY_AND_PRIVACY.md) | Proteção de dados e controles |
| [Monetização](docs/MONETIZATION.md) | Planos e preparação para assinaturas |
| [Contribuição](CONTRIBUTING.md) | Padrões de trabalho e colaboração |
| [Decisões técnicas](docs/decisions/README.md) | Registro de decisões arquiteturais |

## Status atual

**Fase:** núcleo de estudos em validação integrada. A aplicação contém autenticação Supabase SSR, catálogo, resolução e histórico de tentativas, favoritos, revisão, painel de desempenho e administração editorial com importação em lote. A divergência da coluna `difficulty_reviewed` foi corrigida em 11/11/2026; a migration 0016 foi aplicada e verificada no Supabase.

Os simulados em modo estudo passam a ter sessão persistida, retomada sem renovar o prazo, histórico e resultado privado. Prazo e correção são controlados no banco. A verificação local percorreu navegador, cookies, APIs, PostgREST/JWT e PostgreSQL reais, com um adaptador apenas para o serviço Auth. Isso não substitui validação com o Supabase Auth hospedado. Veja [simulados persistidos](docs/EXAM_SESSIONS.md) e [evidências da entrega](docs/EXAM_SESSION_DELIVERY_2026-11-11.md).

O [painel de desempenho](docs/PERFORMANCE_OVERVIEW.md) oferece 7/30/90 dias, fusos São Paulo/UTC, agregações exatas de tentativas e gráficos de resultados dos simulados.

O acervo de origem tem **60 questões publicadas**. O [lote original de matemática 001](docs/ORIGINAL_MATH_RELEASE_001.md) acrescenta 100 questões em rascunho, com 20 famílias de problemas, assistência de IA declarada e gabaritos conferidos automaticamente. A revisão humana e a publicação dessas novas questões continuam pendentes. A página `/admin/acervo` acompanha seus estados e abre cada item no editor. A auditoria anterior encontrou 32 sem URL de fonte e dificuldades ainda sem revisão individual. A triagem em [CONTENT_REVIEW_2026-11-07.md](docs/CONTENT_REVIEW_2026-11-07.md) permanece pendente: precisão de itens, fontes, direitos e classificação pedagógica devem ser revisados antes da expansão. Gabaritos e explicações associados não comprovam qualidade editorial. O [importador](docs/CONTENT_IMPORT.md) recebe conteúdo como rascunho e não publica automaticamente.

Consulte [PROGRESS.md](PROGRESS.md) para o registro atual, [auditoria técnica](docs/AUDIT_2026-11-11.md) e [ENVIRONMENT.md](ENVIRONMENT.md) para ambiente e limites de validação.

## Princípio sobre dados demonstrativos

Dados fictícios devem ser identificados como demonstração. Questões criadas para exemplo nunca devem ser atribuídas a bancas ou concursos reais. Integrações indisponíveis devem ser sinalizadas como pendentes.

## Próximos passos

1. Corrigir os itens prioritários da triagem por fluxo editorial versionado, sem sobrescrever questões que já tenham tentativas.
2. Completar referências verificáveis para os 32 registros sem URL e validar as 28 URLs existentes.
3. Revisar direitos de uso, autoria, explicações e dificuldade item a item.
4. Expandir o banco em lotes revisados, sem copiar questões protegidas.
5. Completar validação ponta a ponta autenticada de cadastro, estudo, tentativas e indicadores.
6. Manter CI, migrations, RLS e deployments sincronizados antes de cada publicação.

---

Projeto em construção.
