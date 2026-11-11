# Desempenho por período e evolução dos simulados

A página `/app/desempenho` oferece períodos de 7, 30 e 90 dias de calendário, incluindo o dia atual parcial. O fuso padrão é America/Sao_Paulo, com alternativa UTC. Prática diária, indicadores, disciplinas e simulados usam a mesma janela.

## Dados e interpretação

A RPC get_student_performance agrega todas as tentativas do próprio estudante dentro da janela. O limite anterior das mil respostas mais recentes foi removido; o aplicativo recebe totais agregados em vez de baixar as tentativas. Repetições e respostas de simulados contam como novas tentativas, como no histórico existente.

A distribuição diária inclui dias sem atividade. O volume é separado em acertos e erros, com tabela acessível de valores. A taxa de acerto sem tentativas é exibida como ausência de dados, não como desempenho zero.

Disciplinas são ordenadas por taxa de acerto no período. Se uma questão ficou indisponível por arquivamento/RLS, suas tentativas permanecem no total e são agrupadas como Conteúdo indisponível. A API não contorna RLS para revelar seu conteúdo ou metadados.

Os simulados entram pelo horário efetivo de encerramento, incluindo prazo expirado ainda não materializado no status. Sessões em andamento ficam fora da média. A média é simples entre notas percentuais, com igual peso por simulado; a nota de cada sessão mantém não respondidas no denominador. Histórico, volume e nota não representam avaliação padronizada de habilidade: conteúdo e dificuldade podem variar entre sessões.

O gráfico usa escala fixa de 0–100 e até 20 resultados recentes do período em ordem cronológica. A contagem, a média e a melhor nota consideram todos os resultados do intervalo, mesmo quando há mais de 20. A tabela permite abrir a revisão de cada sessão. Nenhum resultado ou tendência é criado se ainda não há simulados; com um resultado, há apenas um ponto.

## Implementação e segurança

GET `/api/study/performance` aceita days=7/30/90 e timezone=America/Sao_Paulo/UTC. Parâmetros inválidos/repetidos são rejeitados com 400; ausência de sessão retorna 401. O formato anterior baseado em amostragem foi substituído por PerformanceOverview compartilhado entre API e página.

A função SQL é SECURITY INVOKER, com search_path vazio, verificação de auth.uid(), predicados de propriedade e RLS existente. EXECUTE é revogado de PUBLIC/anon e concedido a authenticated. Não há chave privilegiada nem dados de outros estudantes. A função não altera sessões, tentativas ou status expirado: só calcula a situação efetiva para o relatório.

O filtro de tentativas usa o índice existente em user_id/submitted_at; uma migration aditiva cria índice por user_id e coalesce(finished_at, expires_at) para o histórico de resultados e instala a RPC. O início do período é meia-noite no fuso escolhido, convertido em timestamptz antes de filtrar. Não convertemos cada linha para aplicar o filtro indexável. A agregação diária usa datas locais, preservando fronteiras de calendário.

A janela máxima é de 90 dias. Não há amostragem, mas cardinalidade muito alta ainda requer medição de planos, custos e eventual pré-agregação; esta entrega não promete capacidade ilimitada.

## Verificação

- Testes unitários: parâmetros, fuso, arrays/valores inválidos e geometria do gráfico de zero/um/vários resultados.
- Suite PostgreSQL descartável: 1.111 tentativas válidas, sem corte em mil, exclusão de dados futuros/antigos, preservação de 1.101 tentativas arquivadas, fronteira São Paulo/UTC, isolamento entre contas, média de 27 simulados com gráfico limitado a 20, sessão ativa excluída e conta vazia sem notas inventadas.
- A função usa clock_timestamp() capturado uma vez por relatório; os indicadores são produzidos na mesma consulta/snapshot.
- Evidências de navegador, grants, CI e deploy são registradas na descrição do PR após execução.

Não foram inseridos dados fictícios no banco hospedado nem criado ranking ou exposição de perfis nesta entrega.

Fluxo local de navegador aprovado com Nuxt/cookies e PostgREST/JWT/PostgreSQL reais, usando adaptador Auth para as identidades de teste: 1.111 tentativas, média de simulados 45%, preservação de 1.101 tentativas arquivadas, períodos 7/30/90, fusos São Paulo/UTC, isolamento entre contas e estado vazio sem notas fictícias. A tabela recebeu contenção de largura e região com rolagem acessível; nova execução em 390×844 não teve overflow horizontal da página nem erros de console. Não equivale a teste com Supabase Auth hospedado.

Migração aplicada no Supabase meaprovae: ledger `20261111234228 / student_performance_overview`; arquivo local criado pelo CLI como `20261111173622_student_performance_overview.sql`. Função sem SECURITY DEFINER, EXECUTE negado a anon e concedido a authenticated; índice de horário de resultado confirmado. Advisor sem novos alertas. Typecheck, 106 testes unitários, suites SQL e build final com preset Vercel aprovados localmente.
