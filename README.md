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

A aplicação está sendo evoluída em **Nuxt 4 + Vue 3 + TypeScript**, com CSS próprio. A `main` contém a fundação de autenticação Supabase SSR, catálogo e motor de questões, progresso, favoritos, revisão e área administrativa. A classificação de dificuldade revisada está em integração na PR #33 e ainda não deve ser considerada parte operacional da `main` até a correção e validação da migration pendente.

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

**Fase:** núcleo de estudos em validação integrada. A `main` contém autenticação Supabase SSR, catálogo, motor de questões e tentativas, progresso, favoritos, revisão e área administrativa. Os filtros de disciplina/assunto já integrados permanecem disponíveis; o suporte à dificuldade revisada está em integração na PR #33. O banco Supabase possui 60 questões publicadas em 9 disciplinas. A auditoria estrutural confirmou explicações para as 60 questões na tabela editorial protegida, 32 questões sem URL de fonte e dificuldade `medium` em todos os registros (valor padrão, ainda não revisado individualmente); consulte [CONTENT_AUDIT_2026-11-07.md](docs/CONTENT_AUDIT_2026-11-07.md). A triagem individual está registrada em [CONTENT_REVIEW_2026-11-07.md](docs/CONTENT_REVIEW_2026-11-07.md): foram identificados ajustes de precisão em itens de LOA/LDO, conflito de interesses e formulação de sequência numérica, além de lacunas de fontes e dificuldade. Nenhuma questão foi alterada no banco. A existência de explicações e gabaritos associados não substitui revisão pedagógica individual nem verificação de direitos de uso. CI e deployments READY comprovam build, mas não substituem validação ponta a ponta autenticada. Consulte também [PROJECT_AUDIT.md](PROJECT_AUDIT.md), [ENVIRONMENT.md](ENVIRONMENT.md) e [PROGRESS.md](PROGRESS.md).

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
