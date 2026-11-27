# Governança de conteúdo e banco de questões

## Objetivo

Garantir que concursos, editais, disciplinas, questões, gabaritos e explicações sejam rastreáveis, confiáveis e utilizados de forma legítima.

## Tipos de conteúdo

Todo conteúdo deve ser classificado como:
- Oficial: publicado por órgão ou fonte oficial, com referência verificável.
- Curado: revisado pela equipe, com origem registrada.
- Enviado por usuário: submetido à validação e moderação.
- Gerado por IA: produzido com assistência automatizada e sujeito a revisão.
- Demonstrativo: fictício, usado apenas para demonstração.

## Metadados mínimos de uma questão

- Identificador.
- Enunciado e tipo.
- Alternativas, quando aplicável.
- Gabarito e versão.
- Explicação/resolução.
- Banca, concurso e ano, somente quando comprovados.
- Disciplina, assunto e subassunto.
- Fonte e referência.
- Situação de revisão.
- Direitos/licença e restrições de uso.
- Histórico de alterações.

## Fluxo editorial sugerido

1. Cadastro/importação com origem.
2. Verificação de permissão e direitos de uso.
3. Classificação pedagógica.
4. Revisão do enunciado e formatação.
5. Conferência independente do gabarito.
6. Revisão de explicação e referências.
7. Publicação.
8. Monitoramento de denúncias e correções.

## Correções

- Não sobrescrever silenciosamente gabaritos publicados.
- Registrar motivo, autor e data.
- Preservar histórico de versões.
- Reavaliar tentativas afetadas quando necessário.
- Informar usuários quando a correção alterar resultados relevantes.

## Direitos autorais e fontes

Não presumir que uma questão disponível na internet pode ser republicada. Antes de importar ou distribuir conteúdo, verificar titularidade, licença, termos de uso e base legal. Registrar a fonte não substitui autorização de uso.

## Editais e dados de concursos

Priorizar documentos e informações de fontes oficiais. Registrar URL, data de consulta, versão e status. Dados sujeitos a mudança devem exibir data de atualização.

## Conteúdo demonstrativo

- Identificar de forma visível como demonstração.
- Não usar nome de banca real para atribuir questão inventada.
- Não misturar estatísticas fictícias com indicadores reais.
- Manter dados demonstrativos separados dos dados de produção.

## Denúncias e qualidade

Permitir reportar erro, duplicidade, conteúdo inadequado ou problema de direitos. Definir fila de revisão, prioridade, responsável e resolução.

## Validação de lotes JSONL — pré-publicação

Executar `node scripts/validate-question-bank.mjs caminho/do/lote.jsonl` para verificar arquivos editoriais, **sem acessar bancos nem publicar itens**. O comando retorna código 1 para registros inválidos e imprime uma linha JSON com `accepted`, `invalid`, `lines` e `published: 0`. A suíte automatizada cobre regressões deste contrato.

Cada linha precisa conter um objeto JSON com `externalId`, `statement`, `explanation`, `subject`, `sourceLabel`, `rights`, `difficulty`, `difficultyReviewed`, `options` (2–5 alternativas) e `correctOption` (índice baseado em zero). `rights` aceita `original`, `licensed` ou `public-domain`. Para conteúdo externo, `sourceUrl` é obrigatório. Licença exige `rightsEvidence` descritiva. `difficultyReviewed: true` exige justificativa explícita em `difficultyRationale`, **mas o validador não comprova quem fez a revisão**. A aprovação humana deve ser registrada e auditada no fluxo editorial separado.

Validações adicionais: `externalId` único no lote, enunciados duplicados após normalização de Unicode e espaços, alternativas distintas, gabarito dentro do intervalo, URL HTTP(S) sem credenciais e dificuldade válida. A validação não prova verdade do gabarito, originalidade, titularidade, autorização legal nem qualidade da explicação. Não utilizar `published: 0` como indicador de elegibilidade automática.

**Compatibilidade:** arquivos de lotes antigos que não fornecem `difficultyReviewed` explicitamente passarão a falhar nessa checagem manual; isso não altera os releases imutáveis nem publica/edita qualquer questão existente. Adaptar metadados de propostas futuras após revisão do esquema; não criar evidências ou responsáveis artificiais.
