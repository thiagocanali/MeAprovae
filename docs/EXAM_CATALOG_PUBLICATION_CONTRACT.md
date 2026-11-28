# Contrato de publicação futura do catálogo — Fase 11

**Proposta, não implementação de publicação.** A PR #71 permanece draft. O banco aceita somente `draft` e `in_review`; nenhuma API deste lote publica ou disponibiliza modelos ao estudante. Os estados futuros no domínio TypeScript não contornam as constraints PostgreSQL. Sessões privadas existentes permanecem independentes.

## Gates obrigatórios da futura operação

A futura transação deve autenticar a pessoa, consultar sua autorização editorial atual no banco e bloquear modelo/versão/fontes em ordem consistente. Não aceitar ator, aprovação, direitos, data de publicação ou snapshot escolhidos pelo cliente. Revalidar todos os itens e evidências sob os mesmos locks, sem janela entre checagem e gravação.

- Composição completa e contígua, IDs distintos, 1–20 questões, seis minutos por questão. Matérias reais devem corresponder aos itens e às metas explícitas; somas precisam coincidir. Multidisciplinar exige duas ou mais matérias; temático, exatamente uma.
- Cada questão, edital e concurso elegíveis e efetivamente publicados; nada arquivado ou ainda em rascunho. Rever classificação, alternativas, gabarito e explicação. Um modelo em revisão pode conter rascunhos hoje; isso não os torna elegíveis para estudantes.
- Parecer humano legítimo de pessoa autorizada, independente conforme a política vigente, com conferência de respostas, explicações e direitos de **todos** os itens. A conta/checkbox não comprova sozinha uma revisão pessoal. Homologação com duas pessoas controladas precisa ser documentada; fixtures nunca satisfazem esse gate.
- Parecer deve corresponder à revisão e ao fingerprint atuais, não ser `changes_requested`, não ter perdido elegibilidade e não ser substituído por um pedido posterior de ajustes. Nenhuma aprovação por flags legadas ou por clonagem.
- Proveniência e base jurídica verificáveis por questão. `unverified`, referência quebrada ou licença insuficiente impede publicação. Fonte pública, manifesto autoral e geração com IA não equivalem a licença/revisão humana. Exceções precisam de política e evidência específicas.
- Snapshot integral imutável de metadados, distribuição, enunciados, opções, gabaritos, explicações e evidências efetivamente autorizadas. Preservar hash, identidade e versão do protocolo de revisão, atores, horários do servidor e trilha de auditoria.
- Reenvio idempotente e CAS; qualquer falha deve reverter a transação inteira. Conteúdo alterado depois da publicação exige nova versão. Correções de parecer acrescentam registros; não sobrescrevem evidência.
- Testes reais de integração, RLS, permissões, isolamento, concorrência, rollback e restauração aprovados; revisão de schema/RPCs, retenção/privacidade e autorização específica de implantação concluídas. CI verde não substitui aprovação de produção.

## Política de reutilização

Compartilhar questões pode ser legítimo: simulados diagnósticos, revisões e comparações podem precisar de itens comuns. Percentuais e alertas são consultivos. O editor deve justificar reutilização quando pertinente e conferir diversidade de habilidades. ID compartilhado comprova identidade do item; família declarada comprova uma classificação de origem; semelhança textual/numérica é estimativa. Nenhum indicador, isoladamente, autoriza ou proíbe publicação.

## Leitura e sessões futuras

Projetar endpoints públicos que retornem apenas versões publicadas e elegíveis, com gabaritos/explicações liberados conforme o fluxo de resolução. A sessão deve fixar modelId, versão e snapshot; reabrir não sorteia outra composição. Não reutilizar os endpoints editoriais para estudantes nem alterar retroativamente sessões/resultados existentes.

Definir retirada de catálogo e correção de erros preservando tentativas e evidências. Autorização editorial não concede acesso a dados pessoais de estudantes. Nunca expor JWTs, cookies, chaves privilegiadas ou identidades desnecessárias.

## Gate de rollout e reversão

Aplicação de migration, publicação de conteúdo, merge e deploy são decisões distintas. Manter schema inativo enquanto faltarem homologações. Preparar backup/restore e plano de retirada sem DROP automático de ledger ou referências. A PR #66 tem homologação própria e não é liberada por este contrato. Nenhum destes requisitos habilita publicação automaticamente nesta fase.
