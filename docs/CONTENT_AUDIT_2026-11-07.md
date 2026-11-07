# Auditoria editorial do banco de questões — 07/11/2026

## Escopo e método

Auditoria somente de leitura executada no projeto Supabase de produção em 07/11/2026. Foram consultadas as questões com `status = 'published'`, agrupadas por disciplina, além dos campos de explicação, URL de fonte e dificuldade.

Esta auditoria verifica metadados e completude estrutural. Ela **não** atesta correção pedagógica, correção do gabarito, autorização de republicação ou qualidade da fonte. Esses itens exigem revisão individual.

## Resultado geral

| Indicador | Resultado |
|---|---:|
| Questões publicadas | 60 |
| Disciplinas | 9 |
| Questões sem explicação | 60 |
| Questões sem URL de fonte | 32 |
| Questões com URL de fonte | 28 |
| Dificuldade `medium` | 60 |
| Dificuldade `easy` / `hard` | 0 |

A classificação `medium` foi aplicada como valor padrão pela migration 0015. Portanto, não representa avaliação pedagógica individual e não deve ser exibida como classificação validada até revisão.

A ausência de `source_url` não prova ausência de qualquer procedência: todas as 60 questões têm `source_label`. Ainda assim, um rótulo textual sem URL verificável é insuficiente para confirmar a fonte. A equipe deve localizar o documento oficial aplicável ou marcar explicitamente a referência como pendente. Registrar uma URL também não substitui a verificação de licença/direitos de uso.

## Distribuição por disciplina

| Disciplina | Questões | Assuntos distintos | Sem URL | Sem explicação |
|---|---:|---:|---:|---:|
| Administração Financeira e Orçamentária | 5 | 2 | 0 | 5 |
| Administração Pública | 5 | 5 | 5 | 5 |
| Arquivologia | 5 | 4 | 0 | 5 |
| Direito Administrativo | 8 | 8 | 3 | 8 |
| Direito Constitucional | 8 | 8 | 0 | 8 |
| Ética no Serviço Público | 5 | 5 | 0 | 5 |
| Informática | 8 | 8 | 8 | 8 |
| Língua Portuguesa | 8 | 7 | 8 | 8 |
| Raciocínio Lógico e Matemática | 8 | 8 | 8 | 8 |
| **Total** | **60** | — | **32** | **60** |

## Decisão editorial

Não preencher explicações vazias com texto genérico produzido apenas a partir da alternativa correta. Uma explicação deve demonstrar o raciocínio, justificar a alternativa correta e, quando pertinente, apontar por que os distratores estão incorretos. Deve ser revisada contra o enunciado, as alternativas e a referência aplicável.

O PR #28 foi fechado sem merge porque sua primeira proposta gerava explicações genéricas que não atendiam a esse padrão. Nenhuma alteração foi aplicada ao banco por aquele PR.

## Plano de saneamento

1. Revisar individualmente cada questão, incluindo enunciado, alternativas e gabarito.
2. Identificar a fonte primária e registrar URL, título/documento, órgão, data/versão e data de consulta quando aplicável.
3. Confirmar direitos/licença antes de manter conteúdo para distribuição; fonte registrada não equivale a autorização.
4. Escrever explicação pedagógica específica e revisar sua precisão.
5. Classificar dificuldade com critérios documentados (operações cognitivas, profundidade, número de etapas e pré-requisitos), não por distribuição artificial.
6. Manter histórico e justificativa de toda alteração de conteúdo publicado.
7. Só então ampliar o banco em lotes revisados, sem copiar questões protegidas de bancas.

## Critério mínimo para novas questões

Nenhuma questão deve ser publicada como conteúdo curado sem: assunto consistente, enunciado claro, alternativas plausíveis, gabarito conferido, explicação revisada, procedência e direitos de uso avaliados, dificuldade justificada e histórico editorial. Conteúdo gerado com IA precisa ser identificado no fluxo interno e passar por revisão humana antes da publicação.

## Limitações

- Consulta de metadados e contagens; não é auditoria jurídica nem revisão pedagógica dos 60 itens.
- Os 32 registros sem URL precisam de investigação individual; não inferir fonte pela disciplina ou pelo texto do enunciado.
- Não foram feitas mutações no banco durante esta auditoria.
