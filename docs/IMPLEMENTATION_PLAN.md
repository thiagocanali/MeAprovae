# Plano de implementação do MVP

## Objetivo

Construir o primeiro fluxo completo do Me Aprovaê em entregas pequenas, verificáveis e úteis. O plano organiza o trabalho; não significa que qualquer item já esteja implementado.

## Marco 0 — decisões e preparação

- [ ] Aprovar ou ajustar a stack proposta na ADR-0002.
- [ ] Confirmar provedor e região do PostgreSQL.
- [ ] Confirmar autenticação e estratégia SSR.
- [ ] Revisar ERD e regras de acesso.
- [ ] Definir identidade visual mínima e tokens CSS.
- [ ] Definir ambientes e gestão de segredos.
- [ ] Criar pipeline de CI.

**Saída:** decisões fundamentais registradas e projeto pronto para receber código.

## Marco 1 — fundação da aplicação

- [ ] Criar aplicação Nuxt com TypeScript.
- [ ] Configurar lint, formatação e typecheck.
- [ ] Configurar testes unitários e e2e.
- [ ] Configurar variáveis de ambiente e validação no startup.
- [ ] Criar layout público e layout autenticado.
- [ ] Criar tratamento global de erros e estados vazios.
- [ ] Configurar integração com banco e migrações.
- [ ] Criar seed de desenvolvimento com dados fictícios identificados.

**Saída:** aplicação executa localmente, builda e possui estrutura mínima de qualidade.

## Marco 2 — identidade e objetivo de estudo

- [ ] Implementar cadastro e login.
- [ ] Implementar logout e recuperação de acesso.
- [ ] Criar perfil básico.
- [ ] Implementar onboarding.
- [ ] Criar seleção de concurso/cargo como objetivo.
- [ ] Validar isolamento de dados entre contas.
- [ ] Criar testes de autorização.

**Saída:** estudante entra na plataforma e define o que está estudando.

## Marco 3 — catálogo e edital

- [ ] Criar entidades de organização, banca, concurso e cargo.
- [ ] Criar cadastro e versionamento de edital.
- [ ] Criar disciplinas e tópicos.
- [ ] Mapear o conteúdo programático por edital/cargo.
- [ ] Criar interface para visualizar o edital.
- [ ] Criar fluxo administrativo mínimo para cadastrar e revisar catálogo.
- [ ] Exibir origem e data de atualização.

**Saída:** estudante consegue navegar pelo conteúdo programático do seu objetivo.

## Marco 4 — questões e tentativas

- [ ] Criar questões, alternativas, gabaritos, explicações e fontes.
- [ ] Criar fluxo de revisão/publicação de questão.
- [ ] Criar filtros básicos.
- [ ] Implementar tela de resolução.
- [ ] Calcular resultado no servidor.
- [ ] Persistir tentativas com idempotência.
- [ ] Implementar favoritos.
- [ ] Testar gabarito, reenvio, concorrência e permissões.

**Saída:** estudante consegue responder questões e consultar histórico confiável.

## Marco 5 — progresso e dashboard

- [ ] Definir regra de progresso por tópico.
- [ ] Registrar sessões ou atividades relevantes.
- [ ] Criar visão de progresso por edital.
- [ ] Calcular questões respondidas e taxa de acerto.
- [ ] Criar dashboard com dados reais.
- [ ] Adicionar recomendações simples e explicáveis.
- [ ] Validar métricas com cenários de teste.

**Saída:** estudante entende o que já fez e quais assuntos precisam de atenção.

## Marco 6 — validação do MVP 1.0

- [ ] Testar em celular e desktop.
- [ ] Executar testes de acessibilidade essenciais.
- [ ] Executar testes e revisão de segurança.
- [ ] Testar backup e restauração do banco.
- [ ] Validar onboarding e ciclo de estudo com usuários.
- [ ] Corrigir problemas críticos.
- [ ] Atualizar documentação e changelog.

**Saída:** MVP 1.0 apto para piloto controlado.

## Marco 7 — complementos 1.1

Somente após validação do núcleo:
- [ ] Caderno de questões.
- [ ] Meta diária.
- [ ] Sessões de estudo com duração.
- [ ] XP básico e eventos auditáveis.
- [ ] Conquistas iniciais.

## Ordem de prioridade

P0 — segurança, autenticação, integridade de dados e fluxo central.

P1 — experiência de estudo, catálogo, questões, tentativas e progresso.

P2 — dashboard, acessibilidade, refinamento visual e administração mínima.

P3 — gamificação complementar e recursos sociais.

## Regra de execução

Trabalhar em fatias verticais: cada entrega deve atravessar interface, regra de negócio, persistência, autorização e testes. Evitar criar várias telas desconectadas ou schemas sem fluxo real de uso.

## Critério de conclusão

Uma tarefa só deve ser marcada como concluída quando:
- Código está no repositório.
- Testes relevantes passam.
- Permissões foram verificadas.
- Estados de erro e vazio existem.
- Documentação foi atualizada.
- A funcionalidade foi conferida em execução.
