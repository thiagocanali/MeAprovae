# Integração e qualidade do catálogo — checkpoint de 27/11/2026

PR #71, branch `feat/exam-catalog-postgres-staging`, início `9475112`. Proposta **draft**, sem migrations produtivas, publicação, merge ou deploy manual. #66 permanece intocada. A interface anterior e seus testes foram preservados.

## Lote de oito tarefas

1. Runner reproduzível `node tests/integration/catalog/run.mjs`: PostgreSQL 17 e PostgREST 12.2.3 descartáveis, migrations reais, endpoints Nuxt reais e Chromium, sem interceptação das APIs editoriais. Portas locais, nomes exclusivos, credenciais efêmeras exclusivamente de teste e limpeza dos próprios contêineres.
2. Criar modelo pela interface, selecionar questões de duas matérias, salvar, validar, solicitar revisão, registrar uma declaração de teste autorizada, clonar e consultar auditoria/snapshot histórico.
3. Identidades editor/revisor/estudante em provedor local de fixtures, cookies produzidos pela biblioteca SSR real, JWTs validados por assinatura/expiração. PostgREST aplica RLS e permissões reais. Nenhum atalho de autenticação ou flag de teste foi acrescentado à aplicação.
4. Dois HTTP PUT concorrentes com a mesma revisão (um sucesso e um conflito), conflito externo preservando formulário, rollback de referências inválidas, gabaritos/snapshots protegidos, imutabilidade e restrições referenciais. Suíte SQL completa executada no mesmo PostgreSQL descartável, antes do fluxo de navegador.
5. Endpoint somente leitura `/api/admin/exam-models/[id]/versions/[version]/quality`, private/no-store e autorização editorial. RPC invoker, RLS e snapshot de leitura coerente. Sobreposição exata por UUID, paginação e ordenação estável. Compara somente a versão mais recente de cada **outro** modelo, excluindo a própria linhagem inteira. Porcentagem = questões em comum / quantidade efetivamente salva na versão atual; não usa a quantidade ainda não composta.
6. Diversidade por matéria e assunto, assuntos desconhecidos, concentração de pelo menos 75% em um assunto (mínimo quatro questões) e enunciados longos com variações numéricas na mesma matéria. Heurística `numeric-stem-v1`: normaliza acentos, caixa, números e pontuação. Não mede equivalência semântica, dificuldade nem qualidade jurídica; alertas são consultivos e podem ter falsos positivos/negativos. Ausência de IDs compartilhados não significa diversidade de habilidades.
7. Metas explícitas opcionais `subjectDistribution: [{subjectId,questionCount}]` em criação/salvamento, guardadas em tabela com FKs/RLS. A interface permite adicionar/remover matérias e quantidades. Quando presentes, todas as matérias/quantidades precisam corresponder exatamente aos itens para entrar em revisão. Drafts podem manter plano incompleto para edição. Metas congelam em revisão, entram na auditoria, independência e fingerprint/snapshot, e são copiadas sem aprovação na clonagem.
8. Testes novos e regressões existentes, CI dedicada ao fluxo completo, documentação e checkpoint com resultados reais.

## Correção revelada pela integração

O PostgREST 12.2.3 repete transações ao receber SQLSTATE `40001`. As RPCs antigas usavam esse código para conflitos lógicos permanentes (revisão esperada/fingerprint/requestId divergentes), provocando repetição em vez do HTTP 409 esperado. Um ensaio mínimo local confirmou timeout acima de três segundos para `40001`, versus HTTP 409 em aproximadamente 14 ms para `PT409`. A migration proposta troca **apenas os conflitos de negócio explicitamente levantados** por `PT409` nas funções de escrita/revisão. A API continua com o contrato HTTP 409 e conserva o tratamento de erros reais `40001`/deadlock. Testes SQL foram ajustados para essa distinção; os testes concorrentes HTTP verificam a correção pelo transporte real.

## Compatibilidade e verdade editorial

A API anterior continua aceitando payloads sem `subjectDistribution`: criar inicia sem metas, salvar sem o campo preserva as metas existentes; `[]` remove explicitamente o plano em draft. Versões históricas não são reescritas nem recebem metas inferidas. Sem metas, as regras estruturais anteriores continuam valendo (multidisciplinar exige pelo menos duas matérias). Com metas, o banco repete a verificação do servidor. A tela de qualidade analisa somente a composição salva.

A nova migration adiciona tabela/guardas e atualiza funções isoladas. A evolução do formato do snapshot torna fingerprints anteriores diferentes; registros antigos continuam íntegros e acessíveis como históricos. Não alterar registros antigos para fazê-los parecer atuais. Alterar apenas um plano também muda o fingerprint. Uma aprovação não é herdada pela cópia.

O teste **não realiza nem declara revisão humana real**. Usa dados identificados como fixtures e decisão `changes_requested`, mantendo direitos `unverified` e sem aprovar conteúdo. O requisito de conferência pessoal é exercitado como contrato de software em identidade sintética; não comprova ação de uma pessoa. Revisão humana autorizada real e Auth hospedado continuam gates de homologação, fora deste runner e da #66.

## Execução e limites

```sh
pnpm install --frozen-lockfile
pnpm exec playwright-core install --with-deps chromium
pnpm exec nuxt prepare
node tests/integration/catalog/run.mjs
pnpm typecheck
pnpm test
NITRO_PRESET=vercel pnpm build
```

Pode-se reutilizar Chromium instalado com `CHROMIUM_PATH`. `playwright-core` está fixado em 1.62.1 como dependência de desenvolvimento. Docker deve estar disponível localmente. O runner cria seu próprio banco: não aceita URL de banco, projeto hospedado ou serviço de produção. Não executar com outros processos alterando arquivos/gerando tipos Nuxt durante o fluxo. Artefatos temporários têm logs de execução e capturas apenas das fixtures; não registrar cookies, JWTs, cabeçalhos de autenticação ou traces com credenciais.

Fixtures locais não homologam redirecionamentos, entrega de e-mails, refresh/revogação hospedados, sessão real ou concorrência geográfica. As comparações são leituras atuais e podem mudar entre páginas enquanto outros editores trabalham. Resultados não persistem notas pedagógicas ou mudam conteúdo. Um catálogo muito grande pode exigir índices adicionais de composição e medição de planos antes de implantação.

## Resultado local final

**273 testes em 32 arquivos** (dez novos, mantendo os 263 anteriores), typecheck, build Vercel e suíte PostgreSQL completa aprovados. O fluxo real confirmou concorrência HTTP 200/409, rollback, metas incompatíveis bloqueadas, replay canônico, clonagem com metas e edição isolada, snapshot preservado, recarga do painel, anônimo/estudante bloqueados e revogação com o mesmo JWT. Dois temas em 320/1440 px, sem overflow nem pageerrors, com capturas conferidas. Artefatos locais em `/workspace/work/catalog-quality-2026-11-27`.

As primeiras execuções interrompidas não contam como aprovação: limite de espaço na criação de contêineres (resolvido limpando caches por seus gerenciadores, sem remover ferramentas ou contêineres alheios), inclusão relativa de SQL no adaptador Docker, seleção repetida na fixture de navegador e atualização do painel foram corrigidos antes da validação final. O problema de repetição de transações `40001` foi confirmado separadamente e corrigido no código de aplicação proposto. A CI dedicada executa o ensaio completo e disponibiliza somente resultados/capturas de fixtures, sem traces ou credenciais.

Matriz Chromium de regressão: 24 páginas × 2 temas × 4 larguras = **192 combinações**, aprovada após as mudanças. Instalação com frozen-lockfile conferida. Requisitos de liberação futura em [contrato de publicação](EXAM_CATALOG_PUBLICATION_CONTRACT.md), sem habilitar publicação.

## Reversão e próximo gate

Reverter UI/API por commit; preservar snapshots e ledger. Schema permanece proposto e não deve ser aplicado automaticamente. Antes de integração: revisão de RPC/RLS/FKs, retenção de identidades/evidências e homologação controlada com duas pessoas autorizadas. Não apagar metas de versões em revisão como rollback. Publicação e uso de modelos por estudantes continuam indisponíveis.

Próximo ponto: ampliar a homologação com revisores reais em ambiente autorizado, revisar relevância dos alertas e medir a análise com volume representativo. Qualquer liberação ao estudante exige gates de direitos/publicação e snapshots completos na sessão, com autorização separada.

## Complemento da Fase 11

[Famílias de origem e estimativas](EXAM_CATALOG_FAMILY_QUALITY.md) acrescentam comparações separadas por famílias declaradas, cobertura desconhecida, proteção contra fonte editada/ambígua e aviso simétrico de quase duplicação por IDs. O domínio não infere objetivos de aprendizagem. A publicação permanece bloqueada.
