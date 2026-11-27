# Checklist editorial — revisão humana controlada

Este documento orienta revisão; **não representa aprovação ou publicação**. Nenhuma questão é alterada ao preencher a ficha.

## Prioridade 1 — 60 questões publicadas
- [ ] Revisar enunciado, alternativas e gabarito independentemente.
- [ ] Conferir explicação e atualização normativa ou técnica quando aplicável.
- [ ] Identificar referência verificável ou justificar conteúdo genuinamente original.
- [ ] Registrar direitos/licença e evidências de autoria (URL não substitui autorização).
- [ ] Aplicar rubrica de dificuldade por questão, sem herdar um valor padrão.
- [ ] Registrar responsável humano, data e versão da revisão fora de dados sensíveis.
- [ ] Avaliar se correção altera tentativas anteriores; nesses casos, criar nova versão rastreável.

Começar pelos grupos com maiores lacunas no inventário de 21/11/2026: Português (8 sem URL), Informática (8), Matemática (8), Administração Pública (5) e Direito Administrativo (3). Esses números são **históricos**, não recontados nesta entrega.

## Prioridade 2 — 100 questões de Matemática em rascunho
- [ ] Revisar primeiro um representante de cada uma das 20 famílias no dossiê de propostas.
- [ ] Validar objetivo pedagógico, clareza de unidades, resolução e plausibilidade de erros dos distratores.
- [ ] Revisar individualmente as outras quatro variantes de cada família.
- [ ] Confirmar domínio numérico, fórmula/oráculo e singularidade do gabarito sem confiar apenas na verificação automática.
- [ ] Confirmar direitos, dificuldade, responsável e versão para cada item.
- [ ] Decidir individualmente publicar, devolver para correção ou descartar.

## Registro mínimo sugerido por item

| Campo | Como preencher |
| --- | --- |
| `externalId` | ID estável do item sob revisão |
| `status` | `pending`, `changes_requested`, `approved`, `rejected` |
| `reviewer` | Identidade de pessoa autorizada; não preencher automaticamente |
| `reviewedAt` | Data real da revisão concluída |
| `sourceVersion` | Hash/versão do item analisado |
| `rightsEvidence` | Origem e licença quando aplicáveis |
| `answerCheck` | Evidência de conferência independente |
| `difficultyRationale` | Rubrica pedagógica explícita |
| `editorialNotes` | Correções e justificativa |
| `publicationDecision` | Decisão separada de revisão e validação automática |

## Condição de saída

A aprovação humana individual, a validação estruturada, a revisão de direitos e a atualização versionada são requisitos complementares; não habilitar publicação a partir de `status` local ou de `difficultyReviewed` sozinho. A importação e publicação exigem autorização editorial apropriada e testes de banco em ambiente isolado.
