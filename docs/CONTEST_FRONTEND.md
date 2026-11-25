# Experiência de concursos

Prioridade definida em 21/11/2026: concluir a experiência de frontend, começando por concursos, antes de retomar a expansão dos demais módulos. Esta entrega cobre catálogo e detalhe de concurso; não representa conclusão de todo o frontend do produto.

## Catálogo

- Layout próprio compartilhado, navegação para rotas existentes e adaptação a desktop/celular, sem botões de funcionalidades futuras.
- Busca por título, órgão, banca e cargo, com palavras sem distinção de acentos/maiúsculas. Filtros combinados por banca, escolaridade e concursos acompanhados; ordenação por publicação no catálogo ou título.
- Formulário aplica filtros ao buscar. Filtros e página ficam na URL e acompanham voltar/avançar. A paginação de 12 itens e a busca são locais sobre os registros retornados pela API; antes de um catálogo grande atingir o limite do PostgREST, será necessária paginação e pesquisa no servidor.
- Objetivo atual consultado pela API existente, com atalho para questões do concurso. Erro nessa consulta é informado separadamente do catálogo.
- Estados distintos de carregamento, falha com nova tentativa, catálogo vazio e filtros sem resultados.

## Detalhe e ações

- Órgão, banca, editais, cargos e escolaridade usam os dados cadastrados. Campos ausentes têm indicação explícita; não se inventam vagas, salários, situação de inscrição, datas de prova ou quantidade de questões.
- Editais ordenados por data; disciplinas ordenadas pela composição editorial e ligadas à prática com concurso e disciplina. Datas sem horário são exibidas em UTC para não recuar um dia no Brasil.
- Fonte do edital permite somente URLs HTTP(S), abre em nova aba com noopener/noreferrer e tem descrição acessível. Link cadastrado não é tratado como verificação independente de autenticidade.
- Acompanhar/deixar de acompanhar usam endpoints existentes e não alteram o objetivo. Acompanhamento não ativa notificações.
- Objetivo pode ser criado ou atualizado no detalhe, com edital/cargo opcionais. Troca de concurso informa a substituição do objetivo anterior; histórico permanece. A RPC existente valida pertencimento ao concurso e faz a troca no servidor.
- Falha ao salvar preserva a seleção; ações pendentes são bloqueadas contra cliques duplicados. A página é remontada ao trocar slug, evitando retorno de ação antiga sobre outro concurso.
- Questões e simulados recebem contestId. O atalho não promete acervo disponível: as páginas de estudo mantêm a consulta real de disponibilidade.
- Concurso não encontrado tem recuperação para o catálogo, sem apresentar erro de infraestrutura como 404.

## Contrato de API corrigido

O detalhe anterior acessava study_positions.length sem receber study_positions na resposta. O SELECT agora retorna os cargos e source_url dos editais. Catálogo e detalhe filtram explicitamente cargos/editais publicados também quando acessados por editor, além da RLS existente.

O catálogo retorna followedContestIds somente da conta autenticada. Falha na leitura de acompanhamento é erro de serviço, não um valor falso de “não acompanha”. Ambas as respostas pessoais têm Cache-Control private,no-store. Não há nova tabela, migration, grant, regra de publicação ou credencial privilegiada.

## Verificação

- 147 testes unitários: busca, combinação de filtros, ordenação, dados ausentes, data sem deslocamento e URL segura entre os novos casos.
- Typecheck e build com preset Vercel aprovados.
- Chromium com APIs simuladas: catálogo sintético de 14 itens para paginação, busca sem acentos, filtros combinados, histórico, acompanhamento/retirada, falhas e repetição, objetivo com edital/cargo, troca de objetivo sem opcionais, persistência em nova montagem, links de estudo, detalhe vazio, 404, erro de catálogo e catálogo vazio.
- Sem overflow em 320, 390, 768 e 1440 pixels. Atalho de teclado foca o conteúdo principal; capturas de desktop/celular foram inspecionadas.
- Oito cenários anteriores de concorrência/filtros da prática também passaram. Nenhuma conta, objetivo ou concurso real foi modificado pelos testes de navegador.
- O teste da interface não substitui uma jornada autenticada com Supabase hospedado. Evidências de CI e produção são registradas no PR.

## Continuidade do frontend

Após concursos, aplicar a mesma revisão de experiência ao início do estudante e aos fluxos de questões, simulados e desempenho. Preservar suas implementações existentes, tratar estados e navegação e verificar responsividade; não reiniciar funcionalidades já entregues. A expansão editorial continua pendente e não foi misturada a esta entrega visual.
