# Favoritas: acesso à prática — 13/11/2026

## Problema reproduzido

Na sessão autorizada, uma questão foi salva e apareceu em /app/favoritas. O cartão só oferecia remoção, sem acesso à resolução, interrompendo a promessa de encontrar e revisar depois.

O favorito criado no diagnóstico foi removido e a lista voltou ao estado vazio. Nenhuma resposta foi submetida.

## Alteração

- Cartão com questão acessível oferece Resolver questão, usando a rota existente /app/questoes?questionId=UUID.
- Cartão cuja relação study_questions está indisponível explica a condição e mantém apenas a remoção.
- A falha de carregamento não pede ao estudante verificar migrations: oferece retry em linguagem de uso.
- Nenhuma API, regra de acesso, conteúdo ou schema alterado.

## Validação

CI e navegação autenticada: salvar → lista → resolver a mesma questão → remover apenas o favorito de teste. Conferir em celular e preservar histórico e demais favoritos.

A fila de erros já oferece Tentar novamente; seu item existente foi inspecionado sem registrar nova tentativa.
