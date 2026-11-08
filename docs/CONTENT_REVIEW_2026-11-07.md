# Revisão editorial inicial das 60 questões — 07/11/2026

## Escopo

Foi feita leitura individual dos 60 registros publicados no banco Supabase, em lotes, conferindo enunciado, quatro alternativas, alternativa vinculada ao gabarito, explicação na tabela editorial protegida, assunto, rótulo de procedência, URL e dificuldade.

Esta é uma **triagem editorial inicial**, não uma certificação jurídica, revisão independente por especialista de cada disciplina nem autorização de republicação. A checagem de que o ID do gabarito aponta para uma das alternativas da questão confirma integridade referencial, não prova por si só que a resposta esteja correta. A revisão de fontes e direitos de uso permanece pendente em parte dos itens.

Nenhum dado do banco foi alterado nesta etapa.

## Impacto no histórico de tentativas

Consulta read-only adicional ao histórico confirmou:
- 60 questões publicadas;
- 1 tentativa registrada em 1 questão;
- 59 questões sem tentativas.

A única questão com tentativa é a de conflito de interesses (`e8c3ce3d-9162-433c-a408-a0f2d7d5dadf`). A migration 0012 protege o histórico de questões respondidas contra alterações de conteúdo. Portanto, essa questão **não deve ser editada in-place**: qualquer correção material deverá seguir o fluxo de nova versão/novo item, preservando a questão respondida e seus resultados. As outras 59 não têm tentativas no retrato consultado, mas continuam sujeitas a versionamento, trilha de auditoria e revisão antes de qualquer alteração.


## Resultado por disciplina

| Disciplina | Itens | Resultado preliminar |
|---|---:|---|
| Administração Financeira e Orçamentária | 5 | Conceitos e gabaritos coerentes com a legislação consultada. Melhorar precisão da alternativa sobre LOA e detalhar o papel constitucional da LDO. |
| Administração Pública | 5 | Conceitos introdutórios coerentes. Acrescentar referências bibliográficas/primárias verificáveis para desconcentração, administração indireta, accountability, eficiência e planejamento. |
| Arquivologia | 5 | Conceitos introdutórios coerentes. O rótulo atual cita a Lei 8.159/1991 de forma ampla; associar cada conceito a material técnico específico do Arquivo Nacional, em especial temporalidade, ciclo documental, proveniência e protocolo. |
| Direito Administrativo | 8 | Respostas preliminarmente coerentes. Completar referências para elementos do ato (doutrina), autotutela (Súmulas 346 e 473 do STF) e poder de polícia (CTN, art. 78). |
| Direito Constitucional | 8 | Itens alinhados, em leitura preliminar, aos dispositivos constitucionais indicados. Manter links oficiais e identificar artigos em cada explicação. |
| Ética no Serviço Público | 5 | Quatro itens conceituais razoavelmente claros, mas precisam de referências específicas. O item sobre conflito de interesses exige reformulação do cenário e delimitação do regime jurídico aplicável. |
| Informática | 8 | Conceitos técnicos básicos coerentes. Todos precisam de referências técnicas verificáveis; revisar a explicação de hash para distinguir resistência à pré-imagem e resistência a colisões; contextualizar a regra 3-2-1 como estratégia-base, não padrão único atual. |
| Língua Portuguesa | 8 | Gabaritos preliminarmente coerentes com a norma-padrão. Acrescentar referências gramaticais adequadas e melhorar a instrução genérica do item de colocação pronominal. |
| Raciocínio Lógico e Matemática | 8 | Cálculos e inferências apresentados estão coerentes. O item de sequência numérica precisa explicitar a regra de formação para reduzir ambiguidade; a regra de três deve explicitar a hipótese de produtividade constante. |

## Ajustes prioritários identificados

### 1. LOA — precisão constitucional

Questão: `3e584ce2-5761-4689-826b-5953aeed103a`.

A alternativa correta atual fala em “empresas estatais abrangidas”. A expressão é vaga. O art. 165, § 5º, II, da Constituição delimita o orçamento de investimento às empresas em que a União, direta ou indiretamente, detenha a maioria do capital social com direito a voto. Recomenda-se reproduzir a delimitação constitucional com redação autoral precisa, sem simplificação que esconda o critério.

Referência primária: https://www.planalto.gov.br/ccivil_03/constituicao/constituicaocompilado.htm

### 2. LDO — completar a definição

Questão: `4dfe5aaf-ac3b-4332-99e1-602160572ed0`.

A alternativa correta descreve a orientação da LOA e diretrizes fiscais, mas a explicação pode refletir melhor o art. 165, § 2º: metas e prioridades da administração pública federal, despesas de capital para o exercício subsequente, orientação da elaboração da LOA, alterações na legislação tributária e política de aplicação das agências financeiras oficiais de fomento. Atualizar a explicação e avaliar se o enunciado pede uma função central ou o conjunto de atribuições constitucionais.

Referência primária: https://www.planalto.gov.br/ccivil_03/constituicao/constituicaocompilado.htm

### 3. Arquivologia — fonte genérica para conceitos específicos

Os cinco itens usam a Lei 8.159/1991 como referência geral. A lei é relevante para a política nacional de arquivos, mas não deve ser apresentada como se fosse, isoladamente, a fonte técnica detalhada de todos os conceitos cobrados. A tabela de temporalidade, por exemplo, tem orientação e instrumentos técnicos próprios do Arquivo Nacional.

Referências técnicas:
- https://www.gov.br/arquivonacional/pt-br/servicos/gestao-de-documentos
- https://www.gov.br/arquivonacional/pt-br/servicos/gestao-de-documentos/orientacao-tecnica-1/codigo-de-classificacao-e-tabela-de-temporalidade-e-destinacao-de-documentos-de-arquivo/codigo-de-classificacao-e-tabela-de-temporalidade-e-destinacao-de-documentos-de-arquivo-1
- https://www.gov.br/gestao/pt-br/assuntos/gestaoeinovacao/informacoes-sistemas-e-servicos-de-gestao/processo-eletronico-nacional/Jornada-do-PEN/3-Gestaodocumental/

### 4. Administração — fontes normativas e doutrinárias

- Autotutela: associar a explicação às Súmulas 346 e 473 do STF, observando limites atuais, segurança jurídica, decadência e contraditório quando aplicáveis.
- Elementos do ato administrativo: identificar como classificação doutrinária tradicional (competência, finalidade, forma, motivo e objeto), sem atribuir a lista a uma lei específica.
- Poder de polícia: usar o conceito legal do art. 78 do CTN e explicar que o exercício está sujeito aos limites legais.
- Delegação e motivação: manter a Lei 9.784/1999, identificando arts. 13 e 50.
- Licitação: manter a Lei 14.133/2021, art. 11, e explicar que a proposta mais vantajosa não equivale automaticamente ao menor preço.

Referências:
- https://www.planalto.gov.br/ccivil_03/leis/l9784.htm
- https://www.planalto.gov.br/ccivil_03/_ato2019-2022/2021/lei/l14133.htm
- https://www.planalto.gov.br/ccivil_03/leis/l5172compilado.htm

### 5. Conflito de interesses — cenário insuficientemente delimitado

Questão: `e8c3ce3d-9162-433c-a408-a0f2d7d5dadf`.

O enunciado menciona “empresa de familiar próximo”, mas não informa a relação jurídica do familiar com a pessoa jurídica, o grau de parentesco nem o regime legal aplicável. A Lei 12.813/2013 trata do conflito de interesses no âmbito do Poder Executivo federal e contém hipóteses específicas, inclusive benefício a pessoa jurídica da qual participe o agente ou familiar nos termos legais. O Decreto 1.171/1994 não deve ser usado como única referência para esse cenário.

Reformular com fatos suficientes para uma única resposta e delimitar expressamente o âmbito (por exemplo, agente do Poder Executivo federal e situação prevista na Lei 12.813/2013). Evitar ensinar que qualquer benefício a qualquer empresa de qualquer familiar configura automaticamente a mesma hipótese legal.

Referências:
- https://www.planalto.gov.br/ccivil_03/_ato2011-2014/2013/lei/l12813.htm
- https://www.gov.br/defesa/pt-br/acesso-a-informacao/portal-da-integridade0/divulgacoes/voce-sabe-as-situacoes-que-configuram-o-conflito-de-interesse
- https://www.gov.br/fazenda/pt-br/acesso-a-informacao/institucional/comissao-de-etica-publica-setorial/sobre-ceps/legislacao/legislacao

### 6. Ética, transparência e dados pessoais

O item sobre acesso a informação com dados pessoais deve referenciar diretamente a Lei de Acesso à Informação e a LGPD, deixando claro que a existência de dados pessoais não autoriza nem a divulgação irrestrita nem a negativa automática de todo o pedido. A explicação atual acerta a ideia geral, mas precisa de base normativa específica.

Referências:
- https://www.planalto.gov.br/ccivil_03/_ato2011-2014/2011/lei/l12527.htm
- https://www.planalto.gov.br/ccivil_03/_ato2015-2018/2018/lei/l13709.htm

### 7. Informática — precisão técnica

- Hash: distinguir resistência à pré-imagem (dificuldade de recuperar uma entrada a partir do hash) de resistência a colisões (dificuldade de encontrar duas entradas distintas com o mesmo hash). Para armazenamento de senhas, recomendar funções próprias de derivação de senha, com salt e custo configurável, não hash rápido genérico.
- Backup 3-2-1: apresentar como estratégia-base (três cópias, dois tipos de mídia, uma fora do local principal). Se a intenção for ensinar resiliência atual, explicar também variantes com cópia offline/imutável e testes de restauração; não declarar que a regra-base é inválida.
- MFA, phishing, DNS, TLS, SQL WHERE e menor privilégio: acrescentar fontes técnicas primárias e datadas, como documentação de padrões, órgãos de segurança e documentação oficial do PostgreSQL.

### 8. Língua Portuguesa — instruções e fontes

- Questão `34e0f601-1631-472b-b024-02fd6f0e6bbb`: substituir “Assinale a alternativa correta” por comando que delimite o objeto (“Considerando a colocação pronominal e a concordância verbal, assinale a frase de acordo com a norma-padrão”).
- Nas questões de concordância, crase/regência, pontuação, conjunções e sintaxe, indicar a regra aplicada na explicação e registrar referência gramatical identificável. Não inventar banca ou atribuir a questão a prova real.

### 9. Raciocínio lógico — evitar ambiguidade

Questão: `9caa5a80-a9bb-4a00-b0dd-488cc29e993e`.

A sequência `3, 7, 13, 21, 31` sugere diferenças `4, 6, 8, 10`, levando a `43`. Porém, uma sequência finita admite diversas regras possíveis. Acrescentar ao enunciado a regra de formação pretendida (diferenças pares consecutivas crescentes) ou um contexto que a determine.

Na questão de regra de três, explicitar “mantida a mesma produtividade individual e as mesmas condições de trabalho”, para justificar a proporcionalidade inversa.

## Dificuldade

Os 60 registros estão como `medium` por valor padrão da migration 0015. Isso não constitui classificação editorial. A leitura inicial sugere que vários itens são de reconhecimento direto ou aplicação de uma única regra e podem ser classificados como fáceis, mas não se atribuiu uma nova dificuldade sem uma rubrica aprovada e análise item a item. Nenhuma dificuldade deve ser alterada em lote.

Rubrica sugerida:
- **Fácil:** reconhecimento direto, um conceito ou operação simples, sem integração relevante.
- **Média:** aplicação contextualizada, duas ou mais etapas, comparação de conceitos próximos ou interpretação moderada.
- **Difícil:** integração de múltiplos tópicos, exceções relevantes, análise de cenário complexo ou várias etapas de raciocínio.

## Procedência e direitos de uso

Os registros com `source_label = Questão autoral — Me Aprovaê (caderno piloto)` são identificados como autorais, mas esse rótulo isolado não comprova autoria, data de criação, licenciamento ou histórico. Registrar autor/responsável, data, versão, assistência de IA quando houver e revisão humana. Para questões com referência normativa, a norma sustenta o conteúdo, mas não é necessariamente a origem do texto da questão. Não atribuir questão autoral a banca ou prova real.

Para os 32 itens sem `source_url`, incluir uma referência adequada ao conceito (norma, documentação oficial ou bibliografia identificável). Quando a questão for genuinamente autoral e não depender de fonte externa específica, registrar a base conceitual e a autoria, sem inventar uma fonte.

## Próximas ações editoriais

1. Ajustar os enunciados e explicações dos itens prioritários listados neste documento.
2. Completar a matriz de fontes dos 32 registros sem URL e validar se as 28 URLs existentes apontam para o dispositivo/documento correto.
3. Revisar direitos de uso e trilha de autoria dos 60 itens.
4. Atribuir dificuldade item a item usando a rubrica, registrando justificativa.
5. Submeter itens jurídicos a revisão de atualização normativa e itens técnicos/pedagógicos à revisão de especialista.
6. Alterar conteúdo publicado somente por fluxo versionado e auditável, respeitando o bloqueio de edição após tentativas.

## Fontes oficiais consultadas nesta triagem

- Constituição Federal, especialmente arts. 5º, 18, 37, 165: https://www.planalto.gov.br/ccivil_03/constituicao/constituicaocompilado.htm
- Lei 9.784/1999: https://www.planalto.gov.br/ccivil_03/leis/l9784.htm
- Lei 14.133/2021: https://www.planalto.gov.br/ccivil_03/_ato2019-2022/2021/lei/l14133.htm
- Arquivo Nacional — gestão documental: https://www.gov.br/arquivonacional/pt-br/servicos/gestao-de-documentos
- Lei 12.813/2013: https://www.planalto.gov.br/ccivil_03/_ato2011-2014/2013/lei/l12813.htm
- LAI: https://www.planalto.gov.br/ccivil_03/_ato2011-2014/2011/lei/l12527.htm
- LGPD: https://www.planalto.gov.br/ccivil_03/_ato2015-2018/2018/lei/l13709.htm

As fontes acima dão suporte a parte dos conceitos jurídicos e arquivísticos. Elas não substituem a conferência item a item de cada URL, a checagem das versões vigentes na data da prova ou a revisão especializada das 60 questões.
