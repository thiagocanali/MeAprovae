# MVP — primeira versão utilizável

## Objetivo

Validar o núcleo de valor do Me Aprovaê: permitir que uma pessoa escolha um objetivo de concurso, acompanhe um edital, estude por assuntos, resolva questões e entenda seu progresso.

O MVP deve ser pequeno, integrado e confiável. A visão completa permanece no [roadmap](ROADMAP.md).

## Escopo do MVP

### Entrega essencial (MVP 1.0)

1. Landing page simples.
2. Cadastro, login, logout e recuperação de acesso.
3. Onboarding e perfil básico.
4. Seleção de um concurso/cargo como objetivo ativo.
5. Catálogo inicial administrado manualmente.
6. Concurso, cargo e edital com fonte e data de atualização.
7. Edital organizado em disciplinas e assuntos.
8. Mapa de progresso por assunto.
9. Banco inicial de questões com origem, classificação e gabarito revisado.
10. Filtros básicos de questões por disciplina/assunto.
11. Resolução de questão com feedback e explicação.
12. Histórico persistido de tentativas.
13. Favoritar questão.
14. Dashboard com dados reais: questões respondidas, acertos, taxa de acerto e progresso do edital.
15. Estados de carregamento, vazio, erro e sucesso.
16. Interface responsiva e acessível.

### Entrega complementar (MVP 1.1, após validar o fluxo principal)

- Caderno pessoal de questões.
- Meta diária simples.
- Sessão de estudo com duração registrada.
- XP inicial, com regras no servidor e histórico auditável.
- Conquistas iniciais sem ranking público.

A divisão 1.0/1.1 evita que gamificação e métricas adiem a validação do ciclo central de aprendizagem.

## Fora do MVP

- Feed social completo, mensagens e grupos.
- Batalhas em tempo real.
- Rankings públicos, ligas e desafios avançados.
- Tutor IA com geração livre de conteúdo.
- Importação automatizada de editais em escala.
- Pagamentos e assinaturas reais.
- Simulados avançados.
- Recomendação preditiva de aprovação.
- Aplicativo mobile nativo.

Esses módulos permanecem no roadmap.

## Fluxos essenciais

### Fluxo A — começar a estudar

Cadastro → onboarding → escolher concurso/cargo → visualizar edital → selecionar assunto → iniciar estudo.

### Fluxo B — resolver questão

Abrir questões → filtrar → responder → receber feedback → registrar tentativa → atualizar indicadores.

### Fluxo C — acompanhar evolução

Dashboard → visualizar métricas → identificar assunto com menor desempenho → abrir questões relacionadas.

## Critérios de aceite

- Uma conta consegue se cadastrar, autenticar e recuperar acesso.
- Dados privados de uma conta não podem ser consultados por outra.
- A pessoa consegue selecionar e acompanhar um objetivo.
- O edital apresenta hierarquia consistente de disciplinas e assuntos.
- O progresso por assunto é persistido e calculado conforme regra documentada.
- Questões publicadas possuem fonte, situação editorial e gabarito revisado.
- Uma resposta gera tentativa persistida e feedback calculado no servidor.
- Reenvio da mesma submissão não duplica a tentativa nem os efeitos associados.
- Dashboard consulta dados persistidos, não números fixos.
- Conteúdo demonstrativo é identificado visualmente.
- Interface funciona em celular e desktop.
- Erros e estados vazios são tratados.
- Testes cobrem autorização, resolução de questão e atualização de progresso.

## Dados e conteúdo para validação

Começar com um catálogo pequeno e curado. Não fazer scraping em massa nem republicar questões sem verificar direitos de uso. Se não houver material autorizado suficiente, usar questões demonstrativas claramente identificadas, sem atribuí-las a bancas reais.

## Estratégia de validação

Testar com um grupo pequeno de estudantes e observar:
- Se conseguem configurar um objetivo sem ajuda.
- Se entendem a estrutura do edital.
- Se sabem qual é o próximo passo.
- Se o feedback das questões é útil.
- Se os indicadores refletem corretamente sua atividade.

## Definição de pronto

Uma funcionalidade só é concluída quando possui interface, regra de negócio, persistência necessária, autorização, estados de erro, testes relevantes e documentação atualizada.
