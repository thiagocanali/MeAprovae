# Requisitos do produto

Este documento consolida os requisitos presentes nas especificações iniciais do Me Aprovaê. Requisitos são objetivos de produto; sua presença aqui não significa que estejam implementados.

## 1. Contas e onboarding

- Cadastro, login, logout e recuperação de senha.
- Perfil do estudante com nome/apelido, foto opcional, biografia e interesses.
- Onboarding para selecionar objetivo, concurso/cargo de interesse, disponibilidade e meta.
- Configurações de privacidade e preferências.
- Persistência segura dos dados e do progresso.

## 2. Dashboard

- Saudação e resumo do perfil.
- Nível, XP e progresso para próximo nível.
- Meta diária e sequência de estudos.
- Tempo estudado, questões resolvidas e taxa de acerto.
- Evolução por período.
- Concursos acompanhados e progresso dos editais.
- Pontos fortes, dificuldades e recomendações.
- Conquistas e atividades recentes.
- Ações para continuar de onde parou e iniciar o próximo passo.

## 3. Concursos e editais

- Pesquisa e filtros por órgão, cargo, localização, escolaridade, área, banca, ano, situação, remuneração e datas.
- Página de detalhes do concurso.
- Associação de cargos, editais, documentos, datas, disciplinas e conteúdos programáticos.
- Favoritar e acompanhar concursos.
- Hierarquia: concurso → cargo → disciplina → assunto → subassunto.
- Mapa de domínio e progresso do edital.

## 4. Trilhas e conteúdos

- Trilhas personalizadas.
- Status: não iniciado, estudando, estudado, revisar e dominado.
- Prioridade, domínio, última atividade e tempo estudado.
- Associação de conteúdos a editais e objetivos.
- Progresso calculado a partir de atividades registradas, com regras documentadas.

## 5. Banco de questões

- Filtros por concurso, órgão, cargo, banca, disciplina, assunto, ano, dificuldade e tipo.
- Filtros pessoais: inéditas, erradas, favoritas e para revisão.
- Enunciado, alternativas, gabarito, comentário, resolução e referências.
- Suporte a imagens e tabelas quando necessário.
- Resposta com feedback imediato e explicação.
- Resolução contínua.
- Favoritar, adicionar a cadernos e reportar problemas.
- Histórico de tentativas.

## 6. Simulados

- Criação personalizada por concurso, disciplina, banca, quantidade e dificuldade.
- Tempo configurável e modo cronometrado.
- Registro de respostas e questões não respondidas.
- Relatório com nota, acertos, erros, aproveitamento, tempo médio e desempenho por assunto.
- Revisão posterior e comparação entre tentativas.

## 7. Aprendizagem e revisão

- Flashcards pessoais e conjuntos compartilháveis.
- Revisão espaçada.
- Central de revisões do dia.
- Reunião de flashcards pendentes, questões erradas e assuntos prioritários.
- Cronograma, calendário, agenda semanal e histórico.
- Recomendações baseadas em edital, disponibilidade e desempenho.

## 8. Desempenho

- Evolução geral, por disciplina e assunto.
- Taxa de acerto, volume, tempo e frequência.
- Histórico de simulados.
- Pontos fortes e fracos.
- Comparação entre períodos.
- Recomendações acompanhadas de justificativa.

## 9. Gamificação e ranking

- XP por atividades pedagógicas elegíveis.
- Níveis, títulos, medalhas e conquistas.
- Rankings por período, concurso, disciplina e entre amigos.
- Ligas e desafios.
- Critérios equilibrados para novos usuários e proteção contra manipulação.

## 10. Comunidade

- Perfil público ou privado conforme configuração.
- Seguir, amizades, publicações, curtidas e comentários.
- Compartilhamento opcional de conquistas e resultados.
- Grupos e desafios coletivos.
- Denúncia, moderação, bloqueio e controles de privacidade.
- Mensagens privadas são uma possibilidade futura, sujeita a avaliação de segurança e moderação.

## 11. Tutor IA

- Tirar dúvidas e explicar conceitos.
- Criar resumos, exemplos, flashcards e questões de treino.
- Explicar erros e comparar conceitos.
- Sugerir planos de estudo e revisão.
- Considerar edital, disciplina e histórico, mediante autorização e controles.
- Informar limitações, fontes e incertezas; não inventar legislação ou jurisprudência.

## 12. Administração

- Gestão de usuários, concursos, editais, cargos, disciplinas, assuntos, bancas e questões.
- Gestão de conquistas, XP, rankings, publicações e denúncias.
- Gestão de planos e assinaturas.
- Indicadores operacionais.
- Permissões por função e trilha de auditoria para ações sensíveis.

## 13. Monetização

- Preparação para plano gratuito, premium e premium com IA.
- Controle de acesso por plano.
- Integração futura com provedor de pagamentos.
- Nenhuma cobrança real sem integração, testes, tratamento de falhas e operação definidos.

## 14. Requisitos não funcionais

- Interface responsiva e acessível.
- Desempenho adequado e escalabilidade gradual.
- Segurança em todas as camadas.
- Controle de acesso no servidor.
- Persistência e integridade dos dados.
- Observabilidade sem exposição de dados sensíveis.
- Conformidade com LGPD.
- Testabilidade e documentação.
- Estados claros de carregamento, vazio, sucesso e erro.

## 15. Regras de integridade

- Não exibir dados fictícios como reais.
- Identificar conteúdo demonstrativo.
- Não atribuir questões autorais a bancas reais.
- Não apresentar integração simulada como operacional.
- Toda ação visível deve ter comportamento funcional ou estar explicitamente marcada como indisponível/planejada.
