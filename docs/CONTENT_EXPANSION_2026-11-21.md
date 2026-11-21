# Ampliação do acervo — revisão técnica de 21/11/2026

## Resultado desta entrega

Inventário por matéria e assunto, revisão técnica assistida das 100 questões de Matemática e 300 propostas de distratores com justificativas específicas. Nenhum dado de produção foi alterado. Nenhuma proposta representa aprovação humana ou publicação.

Arquivos: `content/reviews/inventory-2026-11-21.json` contém apenas agregados do catálogo, sem contas, tentativas ou gabaritos. `content/reviews/matematica-2026-11-21.proposals.json` é um dossiê editorial, incompatível deliberadamente com o importador: não é um novo release. O lote original instalado permanece imutável.

## Acervo e lacunas atuais

| Matéria | Publicadas | Rascunhos | Publicadas sem URL | Meta proposta |
| --- | ---: | ---: | ---: | ---: |
| Administração Financeira e Orçamentária | 5 | 0 | 0 | 100 |
| Administração Pública | 5 | 0 | 5 | 100 |
| Arquivologia | 5 | 0 | 0 | 100 |
| Direito Administrativo | 8 | 0 | 3 | 100 |
| Direito Constitucional | 8 | 0 | 0 | 100 |
| Ética no Serviço Público | 5 | 0 | 0 | 100 |
| Informática | 8 | 0 | 8 | 100 |
| Língua Portuguesa | 8 | 0 | 8 | 150 |
| Raciocínio Lógico e Matemática | 8 | 100 | 8 | 150 |
| **Total** | **60** | **100** | **32** | **1.000** |

As metas distribuem o marco da #54; não são conteúdo produzido ou promessa de prazo. Faltam 940 publicações líquidas para alcançar 1.000, além da revisão das existentes. Nenhuma das 60 tem dificuldade marcada como revisada; isso não prova ausência de qualquer revisão anterior de conteúdo. URL ausente também não prova irregularidade de direitos: exige referência ou justificativa de autoria, separadamente.

O cadastro tem 63 assuntos distribuídos pelas nove matérias. Oito assuntos de Matemática têm apenas rascunhos: Análise combinatória, Divisibilidade, Equações e sistemas, Frações e operações, Geometria plana, Grandezas e medidas, Médias e Razão e proporção. Este inventário descreve os assuntos cadastrados; uma matriz curricular completa ainda precisa ser definida antes dos próximos lotes.

## Revisão do lote de Matemática

- 100 itens, 20 famílias, 15 assuntos; cada família tem cinco variantes. Não contar variantes como novos objetivos pedagógicos.
- Os 100 gabaritos foram reconferidos pelo oráculo existente, com aritmética racional e enumeração independente. Isso valida os cálculos parametrizados, sem substituir a leitura humana do enunciado.
- As propostas preservam enunciado, gabarito e posição correta. Cada distrator tem uma hipótese explícita de erro. Não foram alterados os 100 rascunhos instalados.
- Exemplos: percentuais com bases distintas versus soma de taxas; relação inversa versus direta; comissão sem cargos versus contagem ordenada; juros versus montante; velocidade média versus média aritmética.
- O checker verifica identidade/hash do lote, cobertura integral sem duplicar IDs, gabarito pelo oráculo, quatro valores distintos, uma resposta correta, justificativas distintas, contagens inteiras nos contextos discretos e probabilidades entre zero e um.
- A revisão humana deve avaliar plausibilidade de cada distrator, clareza, dificuldade por rubrica e procedência/direitos. Resultados automáticos não marcam `difficultyReviewed` nem `readyForPublication` como verdadeiros.

### Ordem concreta de trabalho editorial

1. Ler um representante de cada família (sufixo `-01`) com seus três diagnósticos de erro: 20 itens iniciais, 15 assuntos. Validar o objetivo antes de gastar revisão nas demais variantes.
2. Corrigir e aprovar as propostas individualmente; revisar os outros quatro membros de cada família, sem aprovação herdada.
3. Definir dificuldade com rubrica explícita e registrar responsável humano real. Não preencher um nome automaticamente.
4. Para conteúdo alterado, preparar versão editorial nova e manter a rastreabilidade para o release de origem. Não regenerar nem sobrescrever silenciosamente o release já instalado.
5. Publicar pelo fluxo editorial após conferência; verificar contagens estudantis e filtros. Material com tentativas ou sessões exige nova versão conforme os bloqueios existentes.
6. Revisar as 60 publicadas, começando por fontes/explicações de Português, Administração Pública e Matemática; reutilizar as propostas de Informática da PR #50 como insumo, ainda sem tratá-las como aprovadas.

## Plano do catálogo de simulados (#56)

O gerador publicado já aceita 1–20 questões por concurso, matéria e assunto. Modelos editoriais ainda são uma entrega futura, diferente das sessões privadas existentes.

Primeira composição proposta: nove modelos de fundamentos (um por matéria), nove modelos temáticos (um por matéria) e dois multidisciplinares. Isso soma 20 modelos planejados, não publicados. Fundamentos e temáticos precisam de objetivos e composições diferentes; não oferecer o mesmo sorteio com nomes diferentes.

| Grupo | Modelos | Quantidade | Tempo proposto | Condição de liberação |
| --- | ---: | ---: | ---: | --- |
| Fundamentos de cada matéria | 9 | 10 | 60 min | Questões revisadas e objetivos básicos explícitos |
| Aplicação por matéria | 9 | 10 | 60 min | Composição distinta do modelo de fundamentos |
| Multidisciplinar essencial | 1 | 20 | 120 min | Distribuição publicada por matéria, totalizando 20 |
| Multidisciplinar ampliado | 1 | 20 | 120 min | Novos itens/objetivos; diversidade comparada ao essencial |

Os tempos mantêm o modo estudo atual (seis minutos por questão). A distribuição multidisciplinar depende da matriz curricular; ainda não é configuração executável. Definir uma política explícita de sobreposição e medir interseção de IDs/objetivos antes de aprovar os modelos. Questões e modelos permanecem bloqueados para publicação enquanto faltarem as revisões. A expansão para 50 modelos depende de diversidade real e não apenas de novos sorteios.

## Validação e limites

Executar `python3 scripts/content/check_math_release.py` e `python3 scripts/content/check_math_review.py`. O CI também executa ambos. Nenhum comando desses acessa o banco ou publica conteúdo. O dossiê não implementa o catálogo, não completa a revisão das 60 publicadas e não libera as 100 de Matemática; essas pendências seguem nas #54 e #56.
