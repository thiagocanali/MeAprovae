# Auditoria editorial do banco de questões — 07/11/2026

## Escopo e método

Auditoria somente de leitura executada no projeto Supabase de produção em 07/11/2026. Foram consultadas as questões com `status = 'published'`, incluindo a tabela pública `study_questions`, a tabela editorial protegida `study_question_editorial_details`, gabaritos, alternativas, URLs de fonte e dificuldade.

**Correção da primeira versão deste documento:** a consulta inicial considerou apenas `study_questions.explanation` e não incluiu a tabela protegida `study_question_editorial_details`. A primeira versão concluiu incorretamente que as 60 questões estavam sem explicação. A consulta corrigida incluiu as duas estruturas e confirmou 60 explicações na tabela editorial protegida. A coluna legada `study_questions.explanation` está vazia nos 60 registros, conforme esperado após a separação de dados editoriais pela migration 0013.

Esta auditoria verifica metadados e completude estrutural. Ela **não** atesta correção pedagógica, correção do gabarito, autorização de republicação ou qualidade da fonte. Esses itens exigem revisão individual.

## Resultado geral corrigido

| Indicador | Resultado |
|---|---:|
| Questões publicadas | 60 |
| Disciplinas | 9 |
| Explicações na tabela editorial protegida | 60 |
| Questões sem explicação nas duas estruturas | 0 |
| Coluna legada de explicação vazia | 60 |
| Questões sem URL de fonte | 32 |
| Questões com URL de fonte | 28 |
| Dificuldade `medium` | 60 |
| Dificuldade `easy` / `hard` | 0 |
| Questões sem gabarito associado | 0 |
| Gabaritos apontando para alternativa inexistente/externa à questão | 0 |
| Questões com quantidade diferente de quatro alternativas | 0 |

A explicação é armazenada em `study_question_editorial_details`, tabela protegida por RLS para acesso editorial. A RPC `submit_question_attempt` retorna a explicação após uma submissão válida; estudantes não devem receber acesso direto à tabela editorial. A coluna legada `study_questions.explanation` vazia não representa ausência de explicação.

A classificação `medium` foi aplicada como valor padrão pela migration 0015. Portanto, não representa avaliação pedagógica individual e não deve ser exibida como classificação validada até revisão.

A ausência de `source_url` não prova ausência de qualquer procedência: os registros têm `source_label`. Ainda assim, um rótulo textual sem URL verificável é insuficiente para confirmar a fonte. A equipe deve localizar o documento oficial aplicável ou marcar explicitamente a referência como pendente. Registrar uma URL também não substitui a verificação de licença/direitos de uso.

## Distribuição por disciplina

| Disciplina | Questões | Assuntos distintos | Sem URL |
|---|---:|---:|---:|
| Administração Financeira e Orçamentária | 5 | 2 | 0 |
| Administração Pública | 5 | 5 | 5 |
| Arquivologia | 5 | 4 | 0 |
| Direito Administrativo | 8 | 8 | 3 |
| Direito Constitucional | 8 | 8 | 0 |
| Ética no Serviço Público | 5 | 5 | 0 |
| Informática | 8 | 8 | 8 |
| Língua Portuguesa | 8 | 7 | 8 |
| Raciocínio Lógico e Matemática | 8 | 8 | 8 |
| **Total** | **60** | — | **32** |

## Decisão editorial

Não preencher explicações vazias com texto genérico produzido apenas a partir da alternativa correta. As 60 explicações já estão presentes na tabela protegida, mas ainda precisam de revisão pedagógica individual: demonstrar o raciocínio, justificar a alternativa correta e, quando pertinente, apontar por que os distratores estão incorretos. Cada explicação deve ser confrontada com o enunciado, as alternativas e a referência aplicável.

O PR #28 foi fechado sem merge porque sua primeira proposta gerava explicações genéricas que não atendiam a esse padrão. Nenhuma alteração foi aplicada ao banco por aquele PR.

## Plano de saneamento

1. Revisar individualmente cada questão, incluindo enunciado, alternativas, gabarito e explicação protegida.
2. Identificar a fonte primária e registrar URL, título/documento, órgão, data/versão e data de consulta quando aplicável.
3. Confirmar direitos/licença antes de manter conteúdo para distribuição; fonte registrada não equivale a autorização.
4. Corrigir ou aprimorar explicações com raciocínio pedagógico específico e revisão de precisão.
5. Classificar dificuldade com critérios documentados (operações cognitivas, profundidade, número de etapas e pré-requisitos), não por distribuição artificial.
6. Manter histórico e justificativa de toda alteração de conteúdo publicado.
7. Só então ampliar o banco em lotes revisados, sem copiar questões protegidas de bancas.

## Critério mínimo para novas questões

Nenhuma questão deve ser publicada como conteúdo curado sem: assunto consistente, enunciado claro, alternativas plausíveis, gabarito conferido, explicação revisada e armazenada na tabela editorial protegida, procedência e direitos de uso avaliados, dificuldade justificada e histórico editorial. Conteúdo gerado com IA precisa ser identificado no fluxo interno e passar por revisão humana antes da publicação.

## Limitações

- Consulta de metadados e integridade referencial; não é auditoria jurídica nem revisão pedagógica dos 60 itens.
- Os 32 registros sem URL precisam de investigação individual; não inferir fonte pela disciplina ou pelo texto do enunciado.
- A existência de explicação e de gabarito associado não comprova que o conteúdo esteja pedagogicamente correto.
- Não foram feitas mutações no banco durante esta auditoria nem durante a correção deste documento.
