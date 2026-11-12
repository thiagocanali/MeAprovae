# Diagnóstico para receber visitantes — 12/11/2026

Base observada: main b6104a4f67fc206f21796f0b4f1771698c10f3b1.
Objetivo: visitante entende a proposta, acessa sua conta, responde uma questão e consulta o resultado.

## Evidências desta sessão

| Parte da jornada | Resultado | Limite |
| --- | --- | --- |
| Publicação | Alias meaprovae.vercel.app aponta para deployment Vercel READY dpl_65KnD6nNqQV9QwJhcU7yTgRXoLi5, commit b6104a4 | READY não comprova a jornada autenticada |
| Página inicial | Carregou; links para cadastro, login e proposta presentes | Visitante precisa cadastrar-se antes de praticar |
| Cadastro | Formulário abriu com nome, e-mail e senha e link para entrar | Não foi criada conta nem testada entrega de confirmação |
| Login inválido | Credenciais sintéticas em domínio reservado example.invalid produziram erro visível [POST] "/api/auth/login": 401 | Corrigido nesta alteração; Preview/CI devem validar o novo comportamento |
| Recuperação | Página abriu com e-mail e retorno ao login | Não foram enviadas mensagens nem alteradas senhas |
| Celular | Início e recuperação inspecionados em 390×844; início sem overflow horizontal (scrollWidth 375, innerWidth 390) | Não comprova todas as páginas autenticadas |
| Área de questões sem sessão | /app/questoes redirecionou para /login | Resolução, correção e resultados com sessão continuam pendentes |
| Supabase | Projeto ACTIVE_HEALTHY; consulta somente leitura confirmou 60 publicadas e 100 em rascunho, todas com difficulty_reviewed=false; ledger contém 22 migrations | Não é revisão de qualidade dos enunciados |
| Segurança | Advisor retorna seis funções SECURITY DEFINER executáveis por authenticated e proteção de senhas vazadas desabilitada | Alertas requerem análise por função; não comprovam por si só acesso indevido |

## Correções deste lote

- Formulários de login, cadastro, recuperação e redefinição passam a mostrar mensagens públicas conhecidas retornadas pela API, com fallback em português para falhas de rede, proxy ou erros inesperados.
- Mensagens técnicas de fetch e mensagens arbitrárias do servidor não são apresentadas ao visitante.
- README deixa de afirmar simultaneamente que a migration 0016 está ausente e que foi aplicada.
- Testes cobrem o erro HTTP real, mensagens de orientação e respostas inesperadas.

## Menor entrega antes de divulgar

1. Validar cadastro/confirmação e recuperação com caixa de e-mail de teste controlada e Auth hospedado.
2. Validar login/logout e persistência de sessão, incluindo recarregar a página.
3. Com conta estudante de teste, responder, ver explicação e conferir histórico/desempenho; repetir em celular.
4. Conferir um simulado completo e sua retomada/resultado.
5. Validar isolamento entre duas contas, sem usar dados pessoais existentes.
6. Revisar um recorte pequeno de questões publicadas, incluindo gabaritos, fontes e dificuldade. Corrigir por versionamento quando já houver tentativas.
7. Explicar os limites do acervo e das funcionalidades em construção antes de pedir cadastro; prática pública é uma decisão de produto posterior ao diagnóstico.

Critério de pronto: jornada autenticada demonstrada com evidências, mensagens compreensíveis e recorte de conteúdo revisado. O projeto ainda não foi declarado pronto para divulgação.

## Pendências específicas de segurança

Reavaliar as seis funções conforme a auditoria existente em SECURITY_FUNCTION_AUDIT_2026-11-08.md, preservando autorização e testes de isolamento. Não alterar SECURITY DEFINER ou grants em bloco para silenciar alertas.

- [Advisor de funções privilegiadas](https://supabase.com/docs/guides/database/database-linter?lint=0029_authenticated_security_definer_function_executable)
- [Proteção contra senhas vazadas](https://supabase.com/docs/guides/auth/password-security#password-strength-and-leaked-password-protection)

## Limites do ambiente

O clone Git via shell não teve acesso à rede nesta sessão. Leitura e preparação das alterações foram feitas pelo conector GitHub; verificações completas de typecheck, Vitest, banco e build ficam no CI da PR. Não foram criadas contas, alteradas senhas, publicadas questões ou aplicadas migrations nesta sessão.
