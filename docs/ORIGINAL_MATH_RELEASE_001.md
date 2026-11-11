# Lote original de matemática 001

## Conteúdo e limites

O lote contém **100 questões originais**: 20 famílias de problemas com cinco variantes numéricas cada. É material de prática básica/intermediária, não 100 assuntos diferentes nem reprodução de provas reais. Os textos foram elaborados com assistência de IA, sem atribuição a banca. A revisão humana, a avaliação pedagógica dos distratores e a classificação individual de dificuldade permanecem pendentes.

As famílias incluem percentuais sucessivos, produtividade inversa, frações, médias, juros simples, probabilidade sem reposição, combinações, permutações com bloco, MMC/MDC, progressões, equações, sistemas, área, velocidade média, conjuntos, lógica proposicional e divisão proporcional.

Arquivos:

- `content/releases/matematica-original-001.jsonl`: conteúdo compatível com o preflight de importação; inclui assunto em `topic`.
- `content/releases/matematica-original-001.manifest.json`: origem, estado de revisão, parâmetros de conferência e SHA-256 do arquivo exato.
- `scripts/content/generate_math_release.py`: geração determinística sem conexão com banco.
- `scripts/content/check_math_release.py`: conferência independente, sem importar o gerador. Usa aritmética racional, enumeração de combinações/permutações, tabelas-verdade e métodos alternativos de cálculo.

O checker confirma as 100 respostas, unicidade numérica das alternativas, identificadores/enunciados não repetidos no lote, cobertura de 20 famílias e hash. Ele verifica os cálculos a partir dos parâmetros registrados. Não compreende linguagem natural nem certifica sozinho que um enunciado é pedagogicamente adequado; revisão editorial continua necessária.

Execute `python3 scripts/content/check_math_release.py` ou `pnpm content:check`. O CI também executa essa conferência e o preflight completo da aplicação.

## Instalação e procedência

O lote destina-se ao caderno autoral geral existente, sem vínculo inventado com concurso real. A instalação cria apenas rascunhos, com dificuldade não revisada, alternativas, gabaritos e explicações na tabela editorial protegida. Assuntos existentes são reutilizados e os ausentes são cadastrados na mesma disciplina.

A migration `original_content_releases` cria registro da versão, arquivo/hash, commit de origem, edital e vínculo individual de cada questão. O instalador é SECURITY INVOKER, sem EXECUTE para PUBLIC, anon ou authenticated. Só é usado por SQL administrativo autorizado. Não usa service key no navegador nem assume a identidade de um editor. A trilha de auditoria pode ter actor_id nulo; isso identifica operação administrativa e não atribui autoria/revisão humana a uma conta.

Para produzir SQL revisável, sem executá-lo:

```bash
python3 scripts/content/build_release_sql.py \
  --notice-id UUID_DO_CADERNO_AUTORAL \
  --commit SHA_COMPLETO_DO_COMMIT_DE_ORIGEM \
  --output work/install-original-release.sql
```

Confira o arquivo, o destino e o commit antes de executá-lo com a ferramenta administrativa autorizada. A instalação é transacional: falha em qualquer questão desfaz tudo. Repetir o mesmo lote/hash/destino retorna o registro existente; alterar o conteúdo usando o mesmo nome é rejeitado. Enunciados são comparados com o acervo por caixa e espaços normalizados, sem deduplicação semântica.

Depois da instalação, trate o release como imutável. Correções exigem uma nova versão de conteúdo ou o fluxo editorial apropriado; não regenere silenciosamente um arquivo já instalado. O importador JSONL comum continua disponível, mas não instala automaticamente os metadados de release nem usa o campo extra topic. Para este lote versionado, use o instalador específico.

## Revisão na aplicação

A página `/admin/acervo` mostra lotes, contagens atuais por status e dificuldades pendentes. O editor pode abrir a lista e seguir o link até cada questão em `/admin?questionId=...#question-editor`, inclusive se ela estiver fora das primeiras 200 linhas da listagem geral.

A publicação segue o editor existente, questão a questão. Não há publicação automática ou em massa neste fluxo. Revise enunciado, gabarito, justificativa, distratores, direitos e dificuldade antes de publicar. Os estudantes continuam vendo somente questões publicadas.

## Evidências de verificação

- Checker independente: 100/100 gabaritos conferidos, 20 famílias, hash consistente.
- Vitest: preflight do lote e integridade do manifesto, além da suite existente.
- PostgreSQL 17 descartável: instalação real de 100 rascunhos, 400 alternativas e 100 gabaritos; repetição sem duplicação.
- Suite SQL: hash incorreto, tentativa de sobrescrever release, duplicidade com rollback, leitura editorial e bloqueio de estudante/anônimo/execução pelo navegador.
- Fluxo de navegador e implantação são registrados na descrição do PR e no progresso após validação.

A migração de rastreabilidade foi aplicada no Supabase antes da instalação do conteúdo. A instalação remota usa o SHA do merge do PR como origem estável; a descrição do PR registra a resposta do instalador e as contagens finais. Fixtures e identidades usadas nos testes locais não são instaladas no banco remoto.

O fluxo de navegador local validou editor → acervo → lista de 100 rascunhos → abertura direta no editor. A conta estudante recebeu 403 no endpoint editorial e viu zero questões no catálogo da base isolada, que continha apenas rascunhos. O fluxo usou Nuxt/cookies e PostgREST/JWT/PostgreSQL reais, com adaptador de Auth somente para usuários de teste; não comprova login com Supabase Auth hospedado.

Verificação de schema remoto: ledger `20261111164812 / original_content_releases`; RLS ativa nas duas tabelas; sem SELECT para anon nem INSERT para authenticated. Instalador SECURITY INVOKER e sem EXECUTE para anon/authenticated. Advisor sem novos alertas em relação à auditoria anterior. Build com preset Vercel e 83 testes passaram.
