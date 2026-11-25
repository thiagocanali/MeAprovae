# Plano de consolidação — 24/11/2026

## Estado e evidências
- Base de trabalho: `main` em `1dbad5b`; PRs #59, #60, #62, #63 e #64 integradas. Revalidar HEAD antes do merge.
- O fluxo de estudo, filtros e simulados possui implementação, mas não equivale a um catálogo editorial versionado de simulados.
- A migração Neon permanece experimental na branch histórica `feat/reformulacao-design-foundation` e **não** deve ser incorporada automaticamente.
- A segurança E2E de cadastro, recuperação e isolamento de duas contas reais permanece aberta na issue #57. Testes com mocks ou banco descartável não substituem homologação.
- O inventário editorial da issue #54 registrou 60 questões publicadas e 100 rascunhos (em 21/11); contagens exigem nova consulta antes de divulgação.
- A antiga PR #51 foi encerrada sem incorporar à main as políticas de governança; esta frente recupera somente mudanças independentes.

## Sequência de lotes

1. **Governança e CI (esta frente):** AGENTS.md, template de PR, instalação congelada por pnpm, checks em PR/main e ajustes pequenos de acessibilidade. Validar três jobs; não alterar regras de proteção da main.
2. **Segurança e isolamento (#57):** testes controlados com duas contas e sessão real, cadastro, recuperação, limites de API, autorização editorial, mobile e matriz de evidências. Sem credenciais em logs.
3. **Filtros e simulados (#55):** combinação de matérias, dificuldade revisada e testes de URL inválida, estados vazios, concorrência, paginação e responsividade.
4. **Acervo (#54):** curadoria humana de fontes, direitos, distratores, explicações e gabaritos; publicar somente lotes aprovados, versionados e rastreáveis.
5. **Catálogo (#56):** modelos editoriais versionados distintos de sessões privadas; publicar apenas composições com cobertura real.
6. **Polimento visual:** preservar novo tema claro/escuro e revisar cada jornada de landing, login, cadastro, dashboard, questões, favoritos, simulados e administração em desktop e mobile.

## Condições para integração
- Para cada lote: revisão do diff, comandos/testes, CI concluída e riscos documentados.
- Em mudança sensível (auth/RLS/migrations/produção): homologação adicional, plano de rollback e aprovação específica para integração.
- Não reabrir a antiga PR #51 nem mesclar sua branch gigante como atalho. Separar alterações independentes.
- Evitar previews Vercel não essenciais e não executar deploy manual de produção.
