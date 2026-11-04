# Modelo de dados — visão conceitual

Este documento descreve entidades e relações esperadas. Não é ainda um schema SQL definitivo.

## 1. Identidade

### User
Conta de acesso: identificador, e-mail normalizado, hash/identidade gerenciada pelo provedor, status e timestamps.

### UserProfile
Dados de perfil: nome público, apelido, biografia, avatar e preferências de visibilidade.

### UserPreference
Preferências de estudo, notificações, tema e configurações pessoais.

### Role / Permission
Papéis e permissões administrativas. A autorização deve ser verificada no servidor.

## 2. Catálogo de concursos

### Organization
Órgão ou instituição responsável.

### ExamBoard
Banca organizadora.

### Contest
Concurso, com órgão, situação e metadados.

### Position
Cargo relacionado ao concurso, com escolaridade, área e remuneração quando confirmadas.

### Notice
Edital e versão do documento, datas, origem e situação de publicação.

### NoticeSubject
Associação entre edital/cargo e disciplinas cobradas.

## 3. Estrutura pedagógica

### Subject
Disciplina.

### Topic
Assunto, com possibilidade de hierarquia pai/filho para subassuntos.

### NoticeTopic
Associação do conteúdo programático a um edital/cargo, preservando a estrutura e a redação de origem quando necessário.

## 4. Questões

### Question
Enunciado, tipo, dificuldade, estado de publicação e classificação.

### QuestionOption
Alternativas ordenadas, quando a questão for objetiva.

### QuestionAnswerKey
Gabarito versionado e revisado. Alterações precisam manter trilha de auditoria.

### QuestionExplanation
Comentário, resolução e referências.

### QuestionSource
Origem, URL/documento, titularidade/licença, data de captura e condições de uso.

### QuestionTopic
Associação entre questão e assuntos.

### QuestionAttempt
Tentativa do usuário: resposta, resultado calculado no servidor, duração e timestamp.

## 5. Estudo e progresso

### StudyGoal
Objetivo de preparação do usuário, ligado a concurso/cargo.

### UserTopicProgress
Estado do usuário por tópico: status, domínio estimado, prioridade e última atividade.

### StudySession
Sessão de estudo com início, fim, duração e atividades associadas.

### StudyPlan / StudyTask
Plano e tarefas planejadas.

### Notebook / NotebookQuestion
Cadernos pessoais e associação de questões.

### Flashcard / FlashcardReview
Cartões e histórico de revisões.

### MockExam / MockExamQuestion / MockExamAttempt
Configuração, questões e tentativas de simulados.

## 6. Gamificação

### XpEvent
Evento de XP imutável ou auditável, com origem, regra, usuário, valor e chave de idempotência.

### Achievement / UserAchievement
Definição de conquista e desbloqueio do usuário.

### Level / League / RankingSnapshot
Regras de progressão e snapshots de classificação.

XP deve ser derivado de eventos elegíveis, não de um valor enviado pelo cliente.

## 7. Comunidade

### Follow / Friendship
Relações sociais.

### Post / Comment / Reaction
Publicações, comentários e reações.

### StudyGroup / GroupMember / Challenge
Grupos e desafios.

### Report / ModerationAction / Block
Denúncias, ações de moderação e bloqueios.

## 8. IA e assinaturas

### AiConversation / AiMessage
Histórico de interação, com política de retenção e exclusão definida.

### SubscriptionPlan / Subscription / Entitlement
Planos, assinaturas e direitos de acesso.

### PaymentEvent
Eventos do provedor de pagamento, com validação de assinatura/webhook.

## 9. Relações principais

- Um concurso possui vários cargos e editais.
- Um edital/cargo referencia disciplinas e tópicos.
- Questões podem se relacionar a vários tópicos e fontes.
- Usuários possuem objetivos, tentativas, sessões e progresso.
- XP é registrado por eventos ligados a atividades verificáveis.
- Conquistas são desbloqueadas conforme regras versionadas.
- Conteúdo comunitário pertence a usuários e está sujeito a controles de privacidade e moderação.

## 10. Regras de integridade

- IDs estáveis e chaves estrangeiras.
- Unicidade para eventos idempotentes.
- Timestamps consistentes.
- Soft delete apenas quando houver justificativa; retenção e exclusão devem respeitar obrigações legais.
- Auditoria de alterações em gabaritos, permissões e conteúdo publicado.
- Separação entre conteúdo demonstrativo e conteúdo verificado.
- Índices orientados a consultas reais, definidos após medir uso.

## 11. Próxima etapa

Converter este modelo conceitual em ERD e migrações SQL depois da aprovação da stack, políticas de acesso e fluxos do MVP.
