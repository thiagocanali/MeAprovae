# Revisão técnica assistida — Informática, 13/11/2026

## Escopo e conclusão

Leitura das oito questões publicadas de Informática, com quatro alternativas, gabarito associado, explicação protegida e contagem agregada de tentativas. Consulta somente leitura no Supabase. Nenhum dado pessoal foi coletado.

Os oito gabaritos são coerentes com os conceitos das referências primárias abaixo. Esta conclusão é uma revisão técnica assistida por IA; não é certificação independente, confirmação de autoria/licença ou aprovação humana para publicação.

Todas as oito questões estão sem URL. Quatro já têm tentativas. Nenhum registro publicado, alternativa, gabarito, explicação ou dificuldade foi alterado.

## Propostas concretas

| Tema | ID atual | Gabarito atual | Tentativas observadas | Ajuste preparado |
| --- | --- | --- | --- | --- |
| Autenticação multifator | 44719196-a657-438a-be84-c4b173a1f9ec | B | 0 | Explicitar que duas credenciais do mesmo tipo não formam MFA. |
| Phishing | a5a11f1e-66a1-4ee8-9394-4599531ebbb7 | A | 0 | Manter cenário; ampliar distinção entre fraude e operações legítimas. |
| TLS no HTTPS | a9dbb13d-857f-4491-ac9e-88b498845701 | B | 0 | Incluir integridade e evitar sugerir garantia de legitimidade do conteúdo do site. |
| DNS | b5ed7227-6867-42c4-ad16-e772bc428f6c | A | 0 | Precisar que resolução nome/endereço é uma função do DNS, não a totalidade dele. |
| Hash criptográfico | c591b138-ae1f-48e0-9241-aad976e09f9e | B | 1 | Precisar pré-imagem e colisão sem afirmar que é matematicamente impossível descobrir entradas. Nova versão obrigatória para mudança material. |
| SQL WHERE | ceebeab7-e91a-4a6c-b85b-2090d490744e | C | 1 | Delimitar o enunciado para evitar confusão com HAVING e JOIN ON. Nova versão se materialmente reformulado. |
| Menor privilégio | f2fac4eb-ab32-4679-8322-e7dc1d81dc3b | C | 1 | Explicação pode incluir processos e concessões temporárias sem mudar a alternativa correta. |
| Backup 3-2-1 | fd48edbf-2a6f-412e-8367-40236c8c12a2 | A | 1 | Três cópias incluem o original; esclarecer armazenamento externo e testes. Nova versão para mudanças materiais. |

As propostas de explicação e URLs estão em `content/reviews/informatica-2026-11-13.proposals.json`. Não é um lote importável: os campos de revisão humana, direitos e dificuldade continuam explicitamente pendentes.

### Precisão pedagógica

- MFA: senha e PIN são conhecimento; duas etapas não implicam fatores distintos.
- Hash: pré-imagem e colisão são propriedades diferentes. Entradas previsíveis podem ser testadas; “unidirecional” não significa impossibilidade matemática.
- Backup: três cópias incluem a original. Separação física e restauração testada não são substituídas por pastas no mesmo equipamento.
- TLS: canal protegido não comprova honestidade do conteúdo.
- DNS: resolução de endereço é uma das funções, sem reduzir todo o sistema a isso.
- SQL: o novo comando delimita WHERE antes de agrupamento; ON e HAVING atuam em contextos diferentes.
- Menor privilégio e phishing: manter gabaritos e acrescentar fundamentação e contraste com os distratores.

## Fontes verificadas em 13/11/2026

- Autenticação multifator: [referência primária](https://pages.nist.gov/800-63-4/sp800-63/model/).
- Phishing: [referência primária](https://www.fbi.gov/how-we-can-help-you/common-frauds-and-scams/spoofing-and-phishing).
- TLS no HTTPS: [referência primária](https://www.rfc-editor.org/rfc/rfc8446.html#section-1).
- DNS: [referência primária](https://www.rfc-editor.org/rfc/rfc1034.html#section-3.6).
- Hash criptográfico: [referência primária](https://csrc.nist.gov/Projects/hash-functions); [referência primária](https://pages.nist.gov/800-63-4/sp800-63b.html#passwordver).
- SQL WHERE: [referência primária](https://www.postgresql.org/docs/18/queries-table-expressions.html#QUERIES-WHERE).
- Menor privilégio: [referência primária](https://csrc.nist.gov/glossary/term/least_privilege).
- Backup 3-2-1: [referência primária](https://www.cyber.gc.ca/en/guidance/tips-backing-your-information-itsap40002).

Referências normativas/técnicas sustentam conceitos, não a titularidade das questões. Não foi copiado texto integral de nenhuma referência.

## Caminho até publicar

1. Editor humano valida autoria, direitos e os textos propostos.
2. Reconferir tentativas e uso em simulados; contagens acima são um retrato, não autorização de edição.
3. Mudança material em item com histórico exige novo item/versão, mantendo o original e seus resultados.
4. Aprovar dificuldade com rubrica e registrar responsável; a sugestão “fácil” no arquivo é provisória e não muda difficulty_reviewed.
5. Conferir a nova versão em rascunho e então decidir publicação e eventual arquivamento do item substituído.

A versão original com histórico não deve receber UPDATE de enunciado, alternativas ou explicação por causa desta proposta.
