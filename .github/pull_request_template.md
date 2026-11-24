## Escopo do lote
<!-- Descreva de 5 a 10 tarefas relacionadas, ou justifique um lote menor. Linke issues relevantes. -->

## Alterações e evidências
<!-- Resuma os arquivos/funções alterados e forneça testes executados/resultados verificáveis. -->

## Checklist de proteção
- [ ] Procurei PR existente da mesma frente e justifiquei esta PR, se for nova.
- [ ] O diff foi revisado e não inclui segredos ou dados pessoais.
- [ ] Typecheck, testes pertinentes, checks de banco e build foram executados ou suas limitações foram registradas.
- [ ] A CI está concluída e os checks exigidos passaram.
- [ ] A branch está reconciliada com a base, sem descartar mudanças de outros agentes.
- [ ] Esta PR não está em draft e não contém bloqueios de segurança.
- [ ] Não há deploy de produção ou preview desnecessário associado à alteração.

## Classificação de risco
- [ ] Baixo — documentação, estilo, UX sem alteração sensível.
- [ ] Médio — API, regras de negócio ou refatoração com risco de regressão.
- [ ] Alto — autenticação, permissões, RLS, migrations, dados, secrets ou produção.

**Para risco alto:** evidências de homologação, análise de impactos, plano de rollback e aprovação específica de integração:

## Integração
- [ ] Squash merge/auto-merge está permitido pelas regras atuais e foi autorizado.
- [ ] Todas as aprovações e verificações obrigatórias foram respeitadas.

<!-- Não marque itens sem comprovação. Nunca habilite auto-merge em alterações sensíveis incompletas. -->
