# Como contribuir

Este documento define as regras iniciais de colaboração no Me Aprovaê.

## Antes de começar

- Leia o [README](README.md), a [visão do produto](docs/PRODUCT_VISION.md) e o [MVP](docs/MVP.md).
- Verifique se a tarefa já existe ou se há uma decisão registrada em [decisions](docs/decisions/README.md).
- Não amplie o escopo sem explicar o impacto no produto, prazo, segurança e manutenção.

## Princípios de desenvolvimento

1. Priorize código simples, legível e testável.
2. Mantenha responsabilidades bem separadas.
3. Não duplique regras de negócio.
4. Valide entradas no servidor, mesmo quando também houver validação no cliente.
5. Não exponha segredos, tokens ou dados pessoais em código, logs ou commits.
6. Não introduza dependências sem justificar necessidade e manutenção.
7. Não apresente mocks ou dados demonstrativos como integrações reais.
8. Preserve acessibilidade, responsividade e consistência visual.

## Commits

Utilize mensagens curtas e descritivas, preferencialmente no padrão:

- `docs: define product foundation`
- `feat: add edital progress tracking`
- `fix: prevent duplicate xp awards`
- `refactor: isolate question scoring rules`
- `test: cover answer submission`

## Pull requests

Uma contribuição deve explicar:

- Problema ou necessidade.
- Solução implementada.
- Escopo e arquivos afetados.
- Como foi testada.
- Limitações conhecidas.
- Evidências visuais quando houver alteração de interface.

## Qualidade mínima

- Testes para regras de negócio relevantes.
- Tratamento explícito de erros e estados vazios.
- Estados de carregamento e feedback de ações.
- Verificação de permissões no backend.
- Atualização da documentação quando contratos ou comportamentos mudarem.

## Conteúdo educacional

Só publique questões e materiais quando a origem e os direitos de uso estiverem claros. Correções devem manter histórico e justificativa.