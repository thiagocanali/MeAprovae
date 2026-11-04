# Segurança, privacidade e LGPD

## Objetivo

Proteger contas, dados de estudo, informações pessoais e conteúdo da comunidade desde o desenho do produto.

Este documento é uma diretriz técnica inicial e não substitui avaliação jurídica especializada.

## Princípios

- Privacidade por padrão.
- Coleta mínima e finalidade explícita.
- Transparência sobre uso e compartilhamento.
- Controle do usuário sobre visibilidade.
- Segurança em trânsito e em repouso.
- Acesso mínimo necessário.
- Retenção limitada e exclusão conforme obrigações aplicáveis.

## Dados e finalidades

Mapear para cada categoria:
- Dados coletados.
- Finalidade.
- Base legal aplicável a ser validada.
- Prazo de retenção.
- Compartilhamentos e operadores.
- Direitos do titular e canal de atendimento.

Categorias possíveis: cadastro, perfil, preferências, atividade de estudo, tentativas, conteúdo publicado, mensagens futuras, dados de assinatura e logs técnicos.

## Controles técnicos mínimos

- Autenticação segura e recuperação de conta.
- Autorização no servidor em toda operação protegida.
- Isolamento dos dados por usuário e grupo.
- Proteção contra acesso indevido e enumeração.
- Validação e sanitização de entradas.
- Proteção contra CSRF, XSS, SQL injection e abuso de API conforme arquitetura.
- Rate limiting em autenticação, respostas, denúncias e IA.
- Segredos em gerenciador apropriado, nunca no repositório.
- Backups e testes de restauração.
- Atualização de dependências e análise de vulnerabilidades.
- Logs sem senhas, tokens ou dados sensíveis desnecessários.

## Comunidade

- Controles de perfil público/privado.
- Bloquear e denunciar.
- Moderação e trilha de auditoria.
- Regras de conteúdo e processo de contestação.
- Exposição mínima de estatísticas pessoais.

## Administração

- Papéis e permissões explícitos.
- MFA para contas administrativas, quando suportado.
- Auditoria de alterações críticas.
- Separação de ambientes e credenciais.
- Acesso administrativo restrito.

## Direitos dos titulares

Planejar mecanismos para solicitações de acesso, correção, informação, portabilidade quando aplicável, oposição e exclusão, respeitando hipóteses legais de retenção.

## Incidentes

Definir processo para:
1. Identificar e classificar incidente.
2. Conter e preservar evidências.
3. Avaliar impacto e dados envolvidos.
4. Acionar responsáveis internos e fornecedores.
5. Cumprir obrigações de comunicação aplicáveis.
6. Corrigir causa raiz e documentar lições.

## Antes de produção

Concluir inventário de dados, política de privacidade, termos, contratos com operadores, análise de riscos, plano de resposta a incidentes e revisão de segurança.
