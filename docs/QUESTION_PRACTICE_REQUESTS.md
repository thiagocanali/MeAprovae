# Requisições concorrentes na prática

## Problema e comportamento

Em `/app/questoes`, uma resposta, atualização de favorito ou próxima página pode terminar depois que a pessoa troca os filtros. Antes da correção, o resultado da questão anterior podia aparecer na questão nova; uma página antiga podia ser anexada ao filtro novo, e a ação de avançar podia mudar seu índice.

Cada troca de filtro, substituição de lista ou avanço de questão agora invalida as operações da visualização anterior. Sucessos, erros e finalizações dessas operações não alteram a nova visualização. A lista anterior é retirada imediatamente ao trocar os filtros. Um retorno A → B → A também recebe uma revisão nova, mesmo que o ID da questão volte a ser igual.

O envio já iniciado pode continuar e ser registrado no servidor: trocar o filtro não desfaz uma tentativa. O histórico continua sendo a fonte do registro persistido. A chave de idempotência de uma tentativa incerta só é liberada quando sua confirmação é aceita na visualização atual. Assim, uma confirmação antiga não apaga a chave de um reenvio ainda pendente da mesma resposta.

As alterações são locais à interface. Não mudam APIs, permissões, banco, gabaritos ou regras de pontuação.

## Regressão de navegador

`tests/browser/question-practice-races.cjs` usa Chromium e intercepta todas as APIs com fixtures sintéticas. Não precisa de login real, não envia tentativas ao Supabase e não substitui um teste de integração do backend.

Com o Nuxt local em execução e Playwright/Chromium disponíveis:

```sh
TEST_BASE_URL=http://localhost:3000 node tests/browser/question-practice-races.cjs
```

Para instalações externas ao projeto, `PLAYWRIGHT_MODULE` indica o módulo Node do Playwright e `CHROMIUM_PATH` indica o executável Chromium. O teste não instala dependências por conta própria.

Sete cenários verificam resposta antiga bem-sucedida e com erro; retorno à mesma questão com reenvio pendente, erro e nova tentativa usando a mesma chave; paginação antiga bem-sucedida e com erro; erro de favorito anterior; e reenvio normal com chave preservada seguido de avanço. Também verificam ausência de erros de página e de overflow horizontal em 390 × 844.

O primeiro cenário falhou na versão anterior com `old answer appeared on new question`, confirmando a reprodução. Todos os sete passaram com a correção. Os 114 testes unitários, typecheck e build com preset Vercel também passaram; CI e deploy ficam registrados no PR.
