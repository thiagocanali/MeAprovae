# Preparação e validação do build — 13/11/2026

## Problema observado

Os primeiros builds da PR #47 e do commit integrado falharam com TS7006 em callbacks de várias páginas não modificadas. Ambos restauraram cache de um deployment anterior. Novas compilações dos mesmos commits passaram, mantendo TypeScript estrito.

O CI executava nuxt typecheck antes de nuxt build; na Vercel o comando direto era pnpm run build. O CI, portanto, já tinha executado uma etapa de preparação antes da compilação. Isso é uma diferença observada, não prova isolada da causa interna dos erros.

## Mudança

O script build executa nuxt prepare antes de nuxt build. A preparação gera os arquivos e tipos de .nuxt antes de iniciar a compilação e sua checagem de tipos. A checagem estrita permanece habilitada; erros não são suprimidos.

O CI usa o preset vercel e repete o build no mesmo checkout, preservando os arquivos gerados entre as duas execuções. Nenhuma dependência, lockfile, variável secreta, permissão, regra de acesso ou configuração de banco é alterada.

## Validação esperada

- Typecheck, testes unitários, checker de conteúdo e suíte SQL aprovados.
- Dois builds seguidos no CI com NITRO_PRESET=vercel.
- Preview e produção verificados pelo commit publicado.
- Build com cache Vercel observado nos logs, sem os TS7006 anteriores.

Uma sequência bem-sucedida reduz o risco identificado, mas não comprova ausência de todas as falhas futuras de cache ou dependências.

Referência: https://nuxt.com/docs/api/commands/prepare
