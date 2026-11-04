# Arquitetura — diretrizes técnicas

## Status

**Recomendação técnica em avaliação.** A arquitetura proposta é um monólito modular. A escolha de stack está detalhada na [ADR-0002](decisions/0002-stack-recommendation.md) e ainda precisa de validação antes da implementação.

## 1. Direção arquitetural

O Me Aprovaê deve começar como uma aplicação web full-stack modular, com um único repositório e implantação simples.

- Frontend e backend no mesmo projeto, com limites claros entre camadas.
- Regras de negócio críticas executadas no servidor.
- PostgreSQL como banco relacional principal.
- Módulos organizados por domínio.
- Integrações externas isoladas atrás de serviços/adaptadores.
- Sem microserviços, filas complexas ou infraestrutura distribuída no MVP.
- Contratos e validações compartilhados com cuidado, sem importar código exclusivo do navegador no servidor ou vice-versa.

## 2. Stack recomendada para avaliação

| Camada | Recomendação | Observação |
|---|---|---|
| Framework web | Nuxt 4.6.x | Versão estável identificada na revisão de 04/11/2026; não adotar Nuxt 5 enquanto estiver em desenvolvimento |
| Interface | Vue 3 + TypeScript | Aproveita a experiência existente do mantenedor |
| Servidor/API | Nitro, via server routes do Nuxt | Endpoints no mesmo projeto |
| Banco de dados | PostgreSQL gerenciado | Dados relacionais e integridade |
| ORM/query builder | Drizzle ORM | Tipagem e migrações SQL explícitas |
| Autenticação | Avaliar Supabase Auth | Validar integração SSR com Nuxt e maturidade do pacote antes de fechar |
| Hospedagem inicial do banco | Supabase Free para protótipo | Não tratar plano gratuito como garantia de produção |
| Estilização | CSS próprio com tokens e componentes | Evitar dependência prematura de framework visual |
| Testes | Vitest + Playwright | Unitários/integração e fluxos reais no navegador |
| Versionamento | GitHub | PRs, issues e CI |

A escolha de Nuxt é uma recomendação, não uma obrigação. O objetivo é alinhar a stack à experiência prática com Vue/Node e reduzir curva de aprendizado. A especificação inicial citava React/Next.js; essa alternativa foi considerada, mas não é a recomendação principal neste momento.

## 3. Banco e autenticação

- PostgreSQL será a fonte de verdade dos dados do produto.
- O provedor gerenciado pode facilitar banco, autenticação e armazenamento, mas cada serviço deve ter dependência isolada.
- Se Supabase for adotado, habilitar Row Level Security nas tabelas expostas e criar políticas explícitas.
- Nunca expor service role keys ou credenciais administrativas ao navegador.
- Toda operação protegida deve validar identidade e autorização no servidor.
- Não confiar em dados de sessão não verificados; validar assinatura/claims conforme a documentação do provedor.
- Avaliar com atenção o estado beta e a compatibilidade da biblioteca SSR escolhida.

## 4. Organização por domínio

Domínios previstos:
- identity: autenticação, perfis e preferências.
- contests: concursos, cargos, editais e fontes.
- catalog: disciplinas, assuntos e hierarquia.
- questions: questões, alternativas, gabaritos e fontes.
- learning: objetivos, sessões, progresso e planos.
- practice: tentativas e simulados.
- notebooks: favoritos e cadernos.
- gamification: eventos de XP, níveis e conquistas.
- analytics: indicadores derivados de dados reais.
- community: conteúdo social e moderação (futuro).
- ai: integrações de IA (futuro).
- billing: planos e assinaturas (futuro).

A estrutura física de pastas será definida ao criar a aplicação. Não criar módulos vazios apenas para antecipar funcionalidades distantes.

## 5. Fluxo de resposta de questão

1. Cliente solicita uma questão disponível.
2. Servidor autentica a pessoa e verifica acesso.
3. Cliente envia resposta e chave de idempotência.
4. Servidor valida a estrutura da resposta e consulta gabarito vigente.
5. Servidor calcula o resultado.
6. Servidor persiste a tentativa.
7. Servidor registra evento de progresso e, quando elegível, XP.
8. Cliente recebe feedback e atualiza a tela.

O cliente nunca define se acertou nem o valor de XP. Tentativas e concessões devem evitar duplicidade em reenvios.

## 6. Integrações externas

IA, pagamentos, e-mail, armazenamento e fontes de editais devem ser encapsulados. Uma falha externa não pode corromper tentativas, progresso ou saldo de XP.

## 7. Ambientes

- Local: desenvolvimento com variáveis próprias e dados de teste.
- Preview/homologação: validação integrada sem dados reais de usuários.
- Produção: credenciais isoladas, backups, monitoramento e acesso restrito.

## 8. Qualidade e automação

Pipeline mínimo:
1. Instalação determinística a partir do lockfile.
2. Formatação e lint.
3. Typecheck.
4. Testes unitários.
5. Testes de integração para regras críticas.
6. Build de produção.

Testes de ponta a ponta cobrem cadastro, seleção de objetivo, navegação no edital e resolução de questão.

## 9. Decisões pendentes

- Aprovação da stack recomendada.
- Escolha final de autenticação e compatibilidade SSR.
- Provedor de hospedagem da aplicação.
- Região e política de backup do banco.
- Estratégia de e-mail transacional.
- Política de armazenamento de arquivos.
- Provedor, limites e custos de IA.
- Analytics e retenção de eventos.

Decisões relevantes devem ser registradas em [decisions](decisions/README.md).
