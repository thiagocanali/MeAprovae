# AGENTS.md — Me Aprovaê

## Modelo obrigatório: Desenvolvimento Autônomo com Proteção

Este arquivo orienta agentes que atuam neste repositório. As políticas de segurança e as configurações reais do GitHub prevalecem sobre instruções de automação. Não assumir permissões ou disponibilidade de auto-merge.

### Ciclos de execução
- Agrupar de 5 a 10 tarefas relacionadas e executáveis por ciclo; corrigir erros e executar testes pertinentes antes de apresentar o resultado.
- Antes de abrir uma PR, listar as PRs abertas e procurar uma da **mesma frente**. Atualizar a branch dessa PR em vez de criar uma PR por tarefa.
- Manter no máximo uma PR ativa por frente, salvo incompatibilidade técnica documentada. Não misturar alterações independentes em uma PR de alto risco só para reduzir contagem.
- Registrar commits pequenos e coerentes, fazer push apenas após validação local quando possível e observar a CI após o push.
- Se um trabalho depender de segredos, ambiente indisponível ou aprovação de risco, registrar o bloqueio e avançar em tarefas independentes.
- Nunca sobrescrever o trabalho de outro agente, forçar push ou reescrever histórico sem avaliação explícita.

### Critérios de integração
- Nunca contornar branch protection, regras de revisão, checks, CODEOWNERS ou políticas de segurança.
- Preferir **squash merge** e **auto-merge** somente se configurados e autorizados, com checks obrigatórios e revisões concluídas.
- Não integrar PR em draft, com CI pendente/falha, conversas obrigatórias não resolvidas, conflito ou alteração de segurança não homologada.
- Antes de merge, verificar se a branch está atualizada em relação à base, revisar o diff e a situação real do GitHub.
- Não alterar configurações de proteção da `main` automaticamente.

### Alterações sensíveis
- Autenticação, autorização, RLS, schemas, migrations, gerenciamento de sessões, secrets, integrações externas e produção exigem testes adicionais, análise de impacto e plano de reversão.
- Mudanças sensíveis não recebem merge ou auto-merge até a homologação exigida e autorização específica de integração.
- Preservar a produção Supabase original. A migração Neon permanece experimental e isolada na branch histórica; não fazer cutover, importar dados legados nem escrever na branch principal Neon.
- Nunca publicar credenciais, tokens, cookies, dados pessoais ou dumps em commits, logs ou comentários.

### Qualidade
- Utilizar o gerenciador de pacotes e lockfile adotados pelo repositório.
- Validar typecheck, testes unitários, testes de banco descartável e builds quando aplicáveis.
- Não declarar testes aprovados sem evidência da execução. Corrigir falhas de CI e repetir a verificação.
- Revisar questões e conteúdos para garantir procedência, qualidade e direitos de uso.

### Vercel e deploy
- Evitar pushs/PRs intermediárias que gerem previews desnecessários. Preferir validações locais e GitHub Actions.
- Não alterar configurações de produção, disparar deploys manuais ou repetir deploys após limite de cota sem autorização específica.
- Deploy e merge são decisões separadas: checks verdes não autorizam publicação de uma migração sensível.

### Design e experiência
- Preservar a identidade visual atual (claro/escuro) e priorizar correções pequenas de responsividade, contraste, foco, legibilidade e estados vazios.
- Testar as rotas afetadas em desktop e celular; não assumir que typecheck ou build validam a aparência.

### Relatório ao concluir ciclo
Informar tarefas implementadas, commits, PR atualizada, comandos/testes executados, estado da CI e bloqueios. Não usar um relatório como substituto da implementação.
