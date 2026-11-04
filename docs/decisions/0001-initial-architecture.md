# ADR-0001 — Arquitetura inicial e critérios de escolha

- **Status:** Proposta
- **Data:** 2026-11-04

## Contexto

O Me Aprovaê é uma plataforma web com autenticação, dados relacionais, conteúdo educacional, progresso individual, gamificação, comunidade e futuras integrações com IA e pagamentos.

As especificações sugerem React/Next.js, TypeScript e PostgreSQL, mas não determinam uma stack obrigatória.

## Opções consideradas

1. Aplicação web full-stack com Next.js, TypeScript e PostgreSQL.
2. Frontend separado de uma API/backend independente.
3. Backend gerenciado com PostgreSQL e autenticação integrada.

## Proposta inicial

Avaliar primeiro uma aplicação modular full-stack com TypeScript e PostgreSQL, mantendo limites claros entre domínios e regras de negócio. Evitar microserviços na fase inicial.

## Critérios para decisão final

- Custo de hospedagem e operação.
- Facilidade de desenvolvimento e manutenção.
- Segurança e controle de acesso.
- Migrações e integridade relacional.
- Suporte a jobs, arquivos e tarefas assíncronas.
- Compatibilidade com integrações futuras.
- Facilidade de testes e observabilidade.
- Possibilidade de migrar sem reescrever o domínio.

## Consequências

A decisão final da stack permanece pendente. Nenhuma dependência ou serviço deve ser considerado aprovado até que a avaliação seja concluída.

## Próxima ação

Comparar opções concretas e registrar a decisão aceita em uma ADR posterior.
