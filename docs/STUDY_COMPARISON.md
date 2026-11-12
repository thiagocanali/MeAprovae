# Comparação voluntária de prática

`/app/comparar` oferece uma referência agregada, sem perfis públicos, nomes, posições, percentis ou resultados individuais de terceiros. A participação nasce desativada: a migração não inclui ninguém automaticamente. A pessoa aceita uma declaração versionada, pode sair pelo mesmo painel e mantém seu histórico privado após sair.

## Escopo e elegibilidade

A janela é o mês de calendário atual no horário de São Paulo. A participação continua entre meses até ser desativada; a declaração inclui respostas já existentes no mês atual e primeiras respostas dos meses seguintes enquanto houver adesão.

O contexto é somente o concurso publicado do objetivo ativo da própria conta. Não há filtros de usuário, concurso, período, disciplina ou grupo na API de comparação. Cargos/editais do objetivo podem diferir; a cobertura é igualada por um caderno de referência de exatamente 20 questões, não por uma suposição de que todos fizeram a mesma prova oficial.

Na primeira consulta de um participante, um caderno mensal é fixado para aquele concurso: as 20 questões publicadas com gabarito mais antigas, ordenadas por data/ID e sob editais/concursos publicados. O conjunto não muda se novas questões forem publicadas. Não é um caderno curado nem uma prova específica de cargo. Todos no mesmo contexto usam os mesmos IDs.

Conta a primeira resposta por questão dentro do mês (desempate por timestamp/ID). Repetições no mês não substituem essa resposta e não completam questões distintas ausentes. A pessoa só consulta a referência do grupo após responder às 20 questões. A média exige pelo menos dez **outros** participantes aderentes, com o mesmo concurso ativo e as mesmas 20 questões completas no mês. O próprio usuário é excluído da média.

O indicador do grupo é arredondado ao múltiplo mais próximo de cinco pontos percentuais. Não há número exato de membros, nomes, identificadores, notas individuais, mínimo/máximo ou classificação. Enquanto o mínimo não é atingido, o valor fica nulo: nenhum benchmark ou participante é inventado.

Se uma questão do caderno deixa de estar publicada, a comparação fica indisponível e a lista não revela conteúdo oculto. Não há troca silenciosa das questões no mês. Arquivamento continua permitido; exclusão é impedida pelas referências. O bloqueio de alteração de conteúdo com tentativas já existente preserva significado/gabarito para questões respondidas.

## Privacidade e limites

A retirada vale para consultas seguintes e impede que o próprio usuário consulte o agregado enquanto não participa. Não revoga informações que alguém já tenha recebido ou capturado. Não existem snapshots persistidos de notas dos participantes: a consulta usa preferências atuais e retorna apenas a média permitida.

Limiar mínimo, caderno fixo, contexto sem parâmetros, ausência de contagem exata e arredondamento reduzem exposição por grupos pequenos e consultas diferenciais. **Isso não é anonimização formal ou differential privacy.** Contas múltiplas, conluio e inferências com conhecimento externo não são eliminados por esses controles. O recurso não é adequado a rankings competitivos ou decisões sobre aprovação/emprego; antiabuso e privacidade formal precisam de desenho adicional para esses usos.

A nota descreve prática, não uma avaliação padronizada: pessoas podem ter visto questões/gabaritos antes. O histórico próprio completo continua em desempenho e simulados. O caderno iguala questões e mês; não prova equivalência de preparação, tempo de estudo ou condições de resolução.

## Implementação

- study_comparison_preferences: RLS por proprietário e somente SELECT para authenticated. Escolha, versão vigente e horário são definidos no servidor, sem user_metadata.
- comparison_private: cadernos mensais e implementação privilegiada, RLS ativa nas tabelas, sem leitura direta para authenticated/anon. Não expor esse schema na Data API.
- RPCs públicas SECURITY INVOKER chamam funções privadas SECURITY DEFINER, necessárias para agregar participantes aderentes fora da RLS individual. Cada operação valida auth.uid(); não recebe identidade-alvo. search_path vazio e EXECUTE revogado de PUBLIC/anon.
- Getter só consulta o grupo após validar adesão, objetivo, disponibilidade das questões e cobertura completa do próprio usuário. Perguntas são bloqueadas para leitura compartilhada durante a consulta para evitar que despublicação concorrente exponha conteúdo oculto.
- Criação do caderno é serializada e única por concurso/mês. A preferência só muda para a própria conta; desligar não exige aceitar uma nova versão de texto.
- Respostas HTTP usam Cache-Control: private, no-store. Parâmetros extras de GET e campos-alvo de POST são rejeitados.
- API: GET /api/study/comparison e POST /api/study/comparison/participation, com enabled boolean e consentVersion vigente para ativação.

## Verificação

A suite SQL usa dados exclusivamente descartáveis: desativação padrão, falta de consentimento, primeira resposta sem substituição por acertos posteriores, 19 questões com repetições sem elegibilidade, mínimo de dez outros participantes, exclusão de objetivo errado/adesão ausente/respostas antigas ou futuras, arredondamento, saída própria/de colega, caderno estável, questão arquivada e bloqueios de identidade/anon/leitura direta.

As fixtures não são copiadas para o banco hospedado. Evidências de navegador, schema, CI e implantação são registradas no PR. O adaptador de Auth dos testes locais não substitui validação com Supabase Auth hospedado.

## Evidência de entrega

Typecheck, 114 testes unitários e build com preset Vercel aprovados. As migrations foram aplicadas do zero em PostgreSQL 17 e todas as suites SQL passaram, incluindo a comparação. Em Chromium móvel, o fluxo real Nuxt/cookies/PostgREST/JWT/PostgreSQL com adaptador Auth local confirmou aceite não pré-marcado, grupo pequeno sem média, caderno de 20 questões, taxa própria 50% e média de grupo 90% em fixtures, ausência de identificadores de participantes, retirada persistida e Cache-Control no-store. Sem overflow da página ou erros de console.

Schema aplicado no Supabase meaprovae: voluntary_study_comparison, ledger 20261112110513. A checagem inicial confirmou zero preferências: ninguém foi incluído automaticamente. Wrappers públicos sem SECURITY DEFINER/EXECUTE anônimo, preferências sem escrita direta e tabelas privadas sem SELECT para authenticated. Uma segunda migration, comparison_private_deny_policies, registra negação RLS explícita/restritiva nas duas tabelas privadas, além dos grants revogados.

A repetição do teste no mesmo navegador, com logout e login em outra conta sem recarregar toda a aplicação, confirmou que a referência anterior não aparece para o novo usuário. Após a política restritiva explícita, nova execução de todas as migrations e suites SQL passou; o advisor voltou a conter somente os seis avisos preexistentes de funções públicas SECURITY DEFINER e a proteção de senhas vazadas já pendente.
