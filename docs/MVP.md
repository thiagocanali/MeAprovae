# MVP — primeira versão utilizável

## Objetivo

Validar o núcleo de valor do Me Aprovaê: permitir que uma pessoa escolha um objetivo de concurso, acompanhe um edital, estude por assuntos, resolva questões e entenda seu progresso.

O MVP deve ser pequeno, integrado e confiável. Não deve tentar entregar toda a visão da plataforma de uma vez.

## Escopo proposto

### Incluído

1. Landing page simples com proposta de valor.
2. Cadastro, login e recuperação de acesso.
3. Onboarding com objetivo de estudo e disponibilidade.
4. Perfil básico e preferências.
5. Dashboard com dados reais da própria conta.
6. Catálogo inicial controlado de concursos e cargos.
7. Edital estruturado em disciplinas e assuntos.
8. Mapa de progresso com status de conteúdo.
9. Banco inicial de questões com origem e classificação.
10. Resolução de questão, feedback e histórico de tentativas.
11. Favoritos e caderno pessoal básico.
12. Indicadores iniciais de questões, acertos e progresso.
13. XP básico, com regras no servidor e histórico de concessões.
14. Identificação explícita de conteúdo demonstrativo, quando usado.

### Fora do MVP

- Feed social completo, mensagens e grupos.
- Batalhas em tempo real.
- Rankings regionais e ligas avançadas.
- Tutor IA com geração livre de conteúdo.
- Importação automatizada de editais em escala.
- Sistema completo de pagamentos e assinaturas.
- Simulados avançados e comparações entre usuários.
- Recomendação preditiva de aprovação.

Esses módulos permanecem no roadmap, não são descartados.

## Fluxos essenciais

### Fluxo A — começar a estudar
Cadastro → onboarding → escolher concurso/cargo → visualizar edital → selecionar assunto → iniciar estudo.

### Fluxo B — resolver questão
Abrir questões → filtrar → responder → receber feedback → registrar tentativa → atualizar indicadores e progresso pertinente.

### Fluxo C — acompanhar evolução
Dashboard → visualizar métricas → identificar assunto prioritário → abrir conteúdo ou questões recomendadas.

## Critérios de aceite

- Um usuário consegue criar conta e acessar apenas seus próprios dados privados.
- O usuário consegue selecionar e acompanhar um objetivo.
- O edital apresenta hierarquia consistente de disciplinas e assuntos.
- O usuário consegue alterar status de estudo e consultar o progresso.
- Questões têm origem, classificação e gabarito revisados.
- Uma resposta gera tentativa persistida e feedback correto.
- Reenvio da mesma ação não duplica XP ou tentativa indevidamente.
- Métricas são calculadas a partir de registros persistidos.
- Dados demonstrativos estão claramente identificados.
- A interface funciona em celular e desktop.
- Erros e estados vazios são tratados.
- Testes cobrem regras críticas e permissões.

## Estratégia de validação

Testar com um grupo pequeno de estudantes e observar:
- Se conseguem configurar um objetivo sem ajuda.
- Se entendem o mapa do edital.
- Se sabem qual é o próximo passo.
- Se o feedback das questões é útil.
- Se os indicadores refletem corretamente sua atividade.

## Definição de pronto

Uma funcionalidade só é considerada concluída quando possui interface, regra de negócio, persistência necessária, autorização, estados de erro, testes relevantes e documentação atualizada.
