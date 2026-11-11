# Expansão do acervo

O banco auditado em 11/11/2026 tem 60 questões publicadas. O volume não substitui revisão: não publicar automaticamente conteúdo coletado ou gerado.

## Lotes JSONL

Execute `pnpm content:validate caminho/lote.jsonl`. O validador lê uma questão por linha, sinaliza linhas inválidas e retorna código 1 se houver erros. Não acessa banco nem publica. A detecção de duplicidade vale para enunciados normalizados dentro do lote; comparação com o acervo e equivalência semântica continuam pendentes.

Contrato:

```json
{"externalId":"original-portugues-001","statement":"Enunciado revisado","explanation":"Justificativa pedagógica de cada alternativa","subject":"Língua Portuguesa","sourceLabel":"Equipe editorial","rights":"original","difficulty":"medium","options":["Alternativa A","Alternativa B"],"correctOption":0}
```

Campos obrigatórios: externalId, statement, explanation, subject, sourceLabel, rights, difficulty, options e correctOption (índice a partir de zero). Direitos: original, licensed ou public-domain. Conteúdo externo exige sourceUrl HTTP(S). A licença deve ser comprovada separadamente; um campo preenchido não comprova direito de reprodução.

## Próximas etapas de operação

1. Selecionar fontes com autorização de reprodução e mapear editais, disciplinas e assuntos.
2. Validar lotes, conferir duplicatas contra o banco e revisar gabarito, explicação e classificação individualmente.
3. Implementar importação transacional em rascunho com identificação da fonte, versão e registro do lote; usar papéis editoriais existentes e não chaves privilegiadas no navegador.
4. Publicar só após revisão. Correções de questões com tentativas exigem nova versão.
5. Medir cobertura por edital, questões revisadas, taxa de erro editorial e custo por questão antes de aumentar os lotes.

## Comparação entre estudantes

Antes de disponibilizar rankings, implementar adesão voluntária, pseudônimo, tamanho mínimo de grupo e possibilidade de sair. Comparar primeira tentativa por questão, período e cobertura equivalentes; separar prática repetida de avaliações. Não expor histórico, e-mail ou identificadores pessoais. O painel atual mostra apenas dados do próprio estudante e não calcula ranking fictício.
