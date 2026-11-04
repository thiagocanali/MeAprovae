# Arquitetura — diretrizes iniciais

## Status

Documento de direcionamento. A stack definitiva ainda precisa ser aprovada após avaliar requisitos, custos, experiência da equipe e ambiente de implantação.

## 1. Princípios arquiteturais

- Começar com arquitetura simples e modular.
- Separar interface, regras de negócio e persistência.
- Manter regras críticas no servidor.
- Usar PostgreSQL como referência relacional sugerida nas especificações.
- Projetar autorização desde o início.
- Evitar microserviços prematuros.
- Manter contratos explícitos entre módulos.
- Automatizar testes, lint, formatação e build.
- Permitir evolução sem reescrita desnecessária.

## 2. Stack candidata

As especificações originais sugerem React/Next.js, TypeScript, PostgreSQL, backend seguro, autenticação, armazenamento de arquivos e biblioteca de gráficos.

Candidata para avaliação:
- Aplicação web: Next.js + React + TypeScript.
- Estilização: Tailwind CSS ou CSS modular, a decidir.
- Banco: PostgreSQL.
- Camada de dados: ORM/query builder tipado, a decidir.
- Autenticação: solução mantida e compatível com o provedor escolhido.
- Arquivos: armazenamento privado com URLs temporárias quando necessário.
- Testes: unitários, integração e ponta a ponta.
- Deploy: provedor com ambientes separados e backups.

Nenhuma tecnologia está confirmada apenas por constar nesta lista.

## 3. Domínios funcionais

- Identidade e acesso.
- Perfil e preferências.
- Concursos e editais.
- Catálogo pedagógico.
- Questões e tentativas.
- Trilhas e progresso.
- Simulados.
- Revisões e flashcards.
- Métricas e recomendações.
- Gamificação.
- Comunidade e moderação.
- Tutor IA.
- Administração e monetização.

## 4. Organização lógica sugerida

A aplicação deve agrupar funcionalidades por domínio, evitando componentes gigantes e dependências circulares. A estrutura de pastas definitiva será definida após a escolha da stack.

## 5. Fluxo de uma resposta de questão

1. Cliente solicita uma questão autorizada.
2. Servidor valida acesso e disponibilidade.
3. Cliente envia resposta e identificador/idempotency key.
4. Servidor valida a tentativa e calcula resultado usando gabarito confiável.
5. Servidor persiste tentativa.
6. Servidor registra eventos elegíveis de progresso/XP sem duplicidade.
7. Cliente recebe feedback e atualiza a interface.
8. Métricas são derivadas dos registros válidos.

O cliente nunca decide sozinho se uma resposta está correta ou quanto XP deve ser concedido.

## 6. Integrações externas

Integrações com IA, pagamentos, e-mail, fontes de concursos ou armazenamento devem ser encapsuladas atrás de interfaces próprias. Falhas externas precisam ter timeout, tratamento, logs seguros e comportamento degradado definido.

## 7. Ambientes

- Desenvolvimento: dados descartáveis e credenciais locais.
- Homologação: testes integrados com dados não reais.
- Produção: acesso restrito, backups, monitoramento e gestão segura de segredos.

## 8. Observabilidade

Registrar erros técnicos e eventos de produto necessários, evitando conteúdo de questões privadas, tokens, senhas e dados pessoais desnecessários nos logs.

## 9. Decisões pendentes

- Stack web definitiva.
- Provedor PostgreSQL e hospedagem.
- Estratégia de autenticação.
- ORM e migrações.
- Estratégia de armazenamento.
- Provedor de e-mail.
- Estratégia de analytics.
- Provedor e política de uso de IA.

Decisões relevantes devem ser registradas em [decisions](decisions/README.md).
