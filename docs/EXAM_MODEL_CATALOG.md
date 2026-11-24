# Catálogo editorial versionado de simulados — fundação

## Limite desta entrega

Esta etapa introduz **tipos, regras de validação, testes e um manifesto editorial vazio** para modelos de simulados. **Não cria tabelas nem rotas públicas, não altera a geração de simulados atual e não publica modelos.** As sessões reais dos estudantes continuam nas tabelas `exam_sessions` e `exam_session_items`, sujeitas às políticas de isolamento existentes.

A estrutura inicial fica em `shared/domain/questions/exam-model.ts`, testada em `tests/unit/versioned-exam-model.test.ts`, e o manifesto `content/exam-models/catalog.json` começa com `models: []`. Nenhum modelo editorial foi declarado pronto sem questões aprovadas.

## Contrato da versão editorial

Cada modelo tem `modelId` UUID estável, `version` positiva, título, descrição, tipo, estado (`draft`, `in_review`, `published`, `archived`), duração, IDs explícitos das questões e distribuição por matéria, além de evidências de revisão e direitos.

A composição é **fixa por versão**; não deve ser sorteada novamente ao reabrir uma sessão. Os IDs precisam ser distintos, 1–20 por modelo, e todos precisam aparecer exatamente uma vez na distribuição por matéria. Para o modo estudo vigente, a duração é de seis minutos por questão. Modelos de matéria única exigem exatamente uma matéria; multidisciplinares, pelo menos duas. Alterações em uma composição publicada exigem nova versão, preservando o histórico.

### Invariantes adicionais antes de uma publicação real

O validador exige marcação de revisão humana, checagem de direitos e data de publicação para um modelo marcado como publicado. **Esses campos não provam, sozinhos, que a revisão ocorreu.** O backend futuro deverá verificar identidades autorizadas e evidências auditáveis. Também precisará checar no banco que cada ID pertence a questão realmente publicada, revisada, licenciada e à matéria declarada; o validador estrutural não faz consultas ao banco.

A função `calculateModelOverlap` mede repetição de IDs entre modelos. A aprovação editorial deverá considerar também sobreposição de objetivos pedagógicos, não apenas de IDs.

## Próximos passos para funcionamento completo

1. Definir esquema PostgreSQL versionado para modelos, revisões, composição e histórico, com RLS mínima e testes em PostgreSQL descartável.
2. Criar endpoints de leitura pública **somente** para versões publicadas e interfaces editoriais protegidas por papel/autorizações existentes.
3. Validar referências, fontes, direitos, composição e revisão humana; não permitir transição de rascunho para publicado por campos enviados diretamente pelo cliente.
4. Fixar a identidade e versão do modelo na sessão criada, com snapshot de questões; preservar tentativas e resultados anteriores.
5. Elaborar e testar os 20 primeiros modelos planejados com cobertura real suficiente. A meta de 50 depende da expansão do acervo, sem simular diversidade por simples sorteio.

Mudanças de schema, RLS e autenticação exigem homologação adicional e autorização específica de integração. Não aplicar migrations ou cutover em produção neste lote.
