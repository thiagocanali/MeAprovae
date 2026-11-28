# Catálogo editorial versionado de simulados — fundação

## Atualização de 25/11/2026

O manifesto agora contém 20 cadernos temáticos autorais em rascunho, com cinco questões e UUIDs reais por versão, provenientes do release matemática 002. Nenhum foi publicado ou persistido no schema experimental da PR #71; essa frente continua sujeita à homologação separada. As seções abaixo descrevem a fundação original. Evidências atuais em [ampliação do acervo](CONTENT_EXPANSION_2026-11-25.md).

## Limite desta entrega

Esta etapa introduz **tipos, regras de validação, testes e um manifesto editorial vazio** para modelos de simulados. **Não cria tabelas nem rotas públicas, não altera a geração de simulados atual e não publica modelos.** As sessões reais dos estudantes continuam nas tabelas `exam_sessions` e `exam_session_items`, sujeitas às políticas de isolamento existentes.

A estrutura inicial fica em `shared/domain/questions/exam-model.ts`, testada em `tests/unit/versioned-exam-model.test.ts`, e o manifesto `content/exam-models/catalog.json` contém atualmente 20 modelos temáticos em rascunho (conferência local de 28/11/2026). Isso não representa versões instaladas ou publicadas por este lote. Nenhum modelo editorial foi declarado pronto sem questões aprovadas.

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

## Atualização da Fase 11 — 28/11/2026

A PR #71 já propõe persistência de rascunhos, API editorial, interface, pareceres/snapshots e integração real descartável. Metas por matéria, sobreposição por IDs e famílias de origem e alertas de estimativa estão implementados na proposta; publicação continua proibida no banco. O contrato de domínio para estados futuros não habilita esses estados em produção. Evidências, limites e próximos gates em [integração e qualidade](EXAM_CATALOG_INTEGRATION_QUALITY.md), [famílias e procedência](EXAM_CATALOG_FAMILY_QUALITY.md) e [contrato de publicação](EXAM_CATALOG_PUBLICATION_CONTRACT.md).
