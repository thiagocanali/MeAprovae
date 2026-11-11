# Simulados persistidos — modo estudo

A entrada é `/app/provas`. O estudante inicia um simulado de 10 questões/60 minutos ou 20 questões/120 minutos, opcionalmente filtrado por concurso. O banco seleciona questões de concursos e editais publicados com gabarito. A seleção percorre o catálogo elegível completo, superando o limite anterior de sortear apenas a primeira página de 100 questões.

Cada conta tem no máximo uma sessão ativa. A sessão, a ordem das questões e a ordem das alternativas ficam persistidas. O histórico mostra os últimos 50 simulados, contagens e nota. Em `/app/simulados/:id`, recarregar ou acessar em outro dispositivo retoma a primeira questão ainda não respondida, sem renovar o prazo.

## Integridade

- `exam_sessions` e `exam_session_items`: RLS por proprietário; estudantes possuem apenas SELECT. Não há INSERT/UPDATE/DELETE direto para authenticated.
- As RPCs públicas são SECURITY INVOKER. A implementação privilegiada fica no schema `exam_private`, com search_path vazio, EXECUTE revogado de PUBLIC/anon e autenticação/propriedade verificadas em cada operação. Não adicionar `exam_private` aos schemas expostos pela Data API.
- As funções privilegiadas são necessárias para manter prazo, nota, contagens e inserção de tentativas fora do controle direto do cliente. Elas não usam user_metadata para autorização.
- Criação idempotente por conta/requestId: retries retornam a mesma sessão, ordem e prazo; reutilizar a chave com outra configuração é rejeitado.
- Resposta final por posição: sessão bloqueada durante a gravação; reenviar a mesma alternativa retorna o estado já salvo sem criar outra tentativa. Outra alternativa após confirmação é rejeitada.
- Cada resposta entra no histórico geral e no desempenho por disciplina. O gabarito e a explicação só entram no resultado da questão após confirmar a resposta.
- O banco usa clock_timestamp(), inclusive após esperar por locks, para rejeitar novas respostas após o prazo. O relógio visual usa horário do servidor e tempo monotônico do navegador; não autoriza gravações.
- Ao expirar, a sessão mantém o horário de encerramento no prazo original. Finalizar ou consultar novamente não renova nem altera esse resultado. Questões não respondidas permanecem no denominador da nota.
- Questões escolhidas ficam protegidas contra alterações de enunciado, fontes, dificuldade, alternativas, gabarito e explicação, mesmo antes da primeira resposta. Correções exigem nova versão. Transições de status continuam permitidas; os snapshots permitem retomar e corrigir respostas mesmo se a questão foi arquivada depois do início.

## Experiência

A confirmação mostra correção imediata porque este é um modo de estudo. Navegar entre questões é permitido; selecionar uma alternativa só a salva após confirmar. Sair não pausa o relógio. Sem conexão, a seleção permanece na página para retry; seleções ainda não confirmadas não são sincronizadas entre dispositivos. O botão de sincronizar recupera respostas já aceitas caso a resposta HTTP se perca.

Finalizar encerra o simulado com o total de questões previsto. A revisão mostra respostas marcadas e gabaritos apenas das questões respondidas. Resultados antigos do simulador local não têm sessão persistida e não são reconstruídos; suas tentativas continuam no histórico geral.

Isto não é um ambiente de prova inviolável nem uma base pronta para rankings competitivos. O usuário pode praticar as mesmas questões fora do simulado; comparações futuras devem separar prática de avaliação e comparar cobertura e primeira tentativa de forma adequada.

## Verificação e limites

- Suite PostgreSQL em `tests/integration/exam-sessions.sql`: criação, idempotência, prazo preservado, contagens, nota, resposta final, alternativas de outra questão, isolamento entre contas, bloqueio de gravações diretas, expiração, finalização repetida e preservação editorial.
- O job database do CI executa todas as migrations e as suites de importação e simulados em PostgreSQL 17 descartável. O shim de auth.uid() aceita claims individuais de teste e request.jwt.claims do PostgREST.
- Testes unitários cobrem o relógio monotônico, tab throttling, arredondamento e datas inválidas.
- A seleção aleatória atual usa ORDER BY random() no catálogo elegível. É adequada ao acervo atual, mas exige estratégia de amostragem e medição de plano para milhões de questões.
- Encerramento de prazo é materializado ao consultar/responder/iniciar outra sessão; a listagem também calcula o status efetivo. Não depende de cron para impedir respostas tardias.
- Não há evento de pausa, prova oficial por edital, penalização por erro, retomada de seleção não confirmada nem comparação social nesta entrega.

## Fluxo local exercitado

Um teste Chromium em viewport móvel percorreu login → início → resposta → reload → retomada → finalização → consulta do resultado no histórico, passando por Nuxt SSR, cookies de sessão, PostgREST 12.2.3 com JWT HS256 e PostgreSQL 17 reais. Um adaptador Auth local foi usado somente para fornecer identidades e tokens de fixtures; não houve mock dos endpoints de simulados, das RPCs nem do banco. O teste confirmou prazo/ordem preservados, nota de 10% para 1 acerto em 10 questões, retry sem duplicação e HTTP 404 para outra conta. Nenhum overflow horizontal ou erro de página foi observado. Este teste não valida o serviço Supabase Auth hospedado nem entrega de e-mails.
