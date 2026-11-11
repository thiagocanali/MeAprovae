# Entrega: simulados persistidos — 11/11/2026

## Problema e resultado

O simulado anterior registrava tentativas, mas mantinha sessão, seleção e relógio apenas na memória do navegador. Recarregar perdia o simulado e o prazo não era validado no servidor.

A nova experiência persiste sessão e resultados, permite retomada entre páginas/dispositivos dentro do prazo, mostra histórico e preserva versões das questões. A nota usa o total previsto, incluindo não respondidas. Continua sendo modo estudo, com correção imediata; não foi apresentado como prova oficial ou ranking competitivo.

## Banco e autorização

- Migration criada com Supabase CLI v2.81.3: `20261111134405_persistent_exam_sessions.sql`.
- Tabelas públicas com RLS por usuário e somente SELECT para authenticated. Escrita direta, alteração de prazo e fabricação de resultado não são permitidas.
- Implementação privilegiada no schema não exposto `exam_private`; wrappers públicos SECURITY INVOKER. Todas as operações verificam auth.uid()/propriedade; EXECUTE revogado de PUBLIC/anon, search_path vazio, sem autorização baseada em user_metadata.
- O schema contém triggers que congelam conteúdo utilizado em sessões. Correções editoriais passam a exigir nova versão também quando existe sessão sem tentativa respondida. Status pode mudar; snapshots preservam a experiência de sessões já iniciadas.
- Somente uma sessão ativa por conta. Criação e respostas idempotentes, bloqueios transacionais, prazo pelo relógio do PostgreSQL e contagens mantidas no banco.
- Migração aplicada no projeto meaprovae após revisão e testes locais. Nenhuma questão ou sessão fictícia foi inserida no banco remoto.

## Verificação

- Typecheck e 81 testes unitários aprovados.
- Build local com NITRO_PRESET=vercel aprovado.
- Todas as migrations aplicadas em PostgreSQL 17 descartável. Testes SQL de importação e simulados aprovados; incluem isolamento, prazo, nota, retry, bloqueio de escrita direta e integridade editorial.
- Chromium móvel percorreu o fluxo real da aplicação com PostgREST/JWT/PostgreSQL locais, usando adaptador Auth apenas para identidades de teste. Início, resposta, reload, retomada, resultado salvo e consulta pelo histórico aprovados. Outra conta recebeu 404, sem erros de página/overflow.
- O bootstrap mínimo de auth.uid() dos testes aceita request.jwt.claims do PostgREST; não substitui testes com Supabase Auth hospedado.

## Limites

Detalhes em `docs/EXAM_SESSIONS.md`. Acervo continua com 60 questões; esta entrega não importa nem publica conteúdo. Comparação social, prova sem feedback e critérios competitivos continuam pendentes. Seleções não confirmadas não são sincronizadas. Sorteio com ORDER BY random() precisa de medição/otimização antes de milhões de questões.
