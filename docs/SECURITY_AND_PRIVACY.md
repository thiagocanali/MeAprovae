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

## Estado verificado no plano mestre (26/11/2026)

Este documento separa diretrizes acima de implementação e homologação:

| Controle | Evidência e limite |
| --- | --- |
| Identidade SSR | O servidor chama `getUser()`; não utiliza `getSession()` nem user_metadata como autorização editorial. Jornada hospedada completa continua na #57. |
| Papel editorial | Consulta `has_platform_role('editor')` no banco. Migrations protegem as tabelas com RLS e checks nas RPCs; testes descartáveis não são prova de duas contas reais. |
| Conteúdo e histórico | Gabaritos/explicações têm acesso restrito; RPC de correção deriva o usuário; sessões fixam composição/prazo e preservam histórico. Suítes SQL cobrem ID alheio, grants e concorrência. |
| Isolamento | Novo teste transacional com identidades sintéticas cobre perfil, tentativas, favoritos, acompanhamento, objetivo, sessões/itens e preferências. Executado somente em PostgreSQL descartável. |
| Links sensíveis/cache | Correções propostas na PR #66, **draft**. Não considerar origem canônica/no-store uniforme como implantados enquanto essa PR não for homologada e integrada. |
| Catálogo editorial | Schema evoluído na #71, **draft e ausente na produção**. Publicação bloqueada; não confundir com sessões privadas operacionais. |
| Senhas vazadas | Advisor continua informando proteção desabilitada; exige avaliação/configuração autorizada. Não alterada neste ciclo. |
| Dependências | Auditoria de 26/11 detectou alertas no Nuxt 4.6.3 e transitivos; patch e evidências de revalidação documentados no diagnóstico e na PR de manutenção. Zero alertas em uma execução não é certificação de segurança. |
| Limites operacionais | Homologação com e-mails controlados, rate limiting, inventário LGPD, monitoramento e restauração permanecem pendentes de evidência específica. Não anunciar produto finalizado. |

Diagnóstico, bloqueios por ambiente e sequência: [auditoria do plano mestre](MASTER_PLAN_AUDIT_2026-11-26.md). Valores de ambiente, credenciais, cookies e links com tokens ficam fora de documentação/artefatos. Mudanças sensíveis exigem gates de AGENTS.md e aprovação específica, mesmo com CI verde.
