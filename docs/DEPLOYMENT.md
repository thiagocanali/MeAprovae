# Deploy e ambientes

## Endereços

- Produção informada pelo mantenedor: https://meaprovae.vercel.app
- Repositório: https://github.com/thiagocanali/MeAprovae

O vínculo entre o projeto da Vercel e este repositório ainda precisa ser confirmado. A URL existir não comprova, por si só, que os commits desta branch sejam publicados nela.

## Configuração esperada na Vercel

Para o projeto que receber esta aplicação:

- Framework Preset: Nuxt
- Root Directory: `./`
- Build Command: padrão do Nuxt / `npm run build`
- Install Command: `npm install`
- Node.js: 22.x ou versão compatível com Nuxt 4
- Output Directory: deixar o padrão detectado pela Vercel; não configurar manualmente `.output/public`

A branch `main` deve continuar sendo a produção. A branch `spike/nuxt-foundation` foi criada para validar a fundação e, se a integração estiver configurada, gerar um Preview Deployment sem substituir a versão principal.

## Variáveis de ambiente

Arquivo de referência: [../.env.example](../.env.example) e [../ENVIRONMENT.md](../ENVIRONMENT.md).

| Variável | Ambiente | Segredo |
|---|---|---|
| `DATABASE_URL` | Preview e Production quando o banco for conectado | Sim |
| `NODE_ENV` | Gerenciada pela plataforma | Não configurar manualmente sem necessidade |

Nunca commitar valores reais de conexão, tokens, senhas ou chaves privadas. Configurar segredos diretamente nas configurações de Environment Variables da Vercel, separados por ambiente.

## Verificação inicial

Depois que o Preview Deployment estiver pronto:

1. Abrir a URL de preview e confirmar o carregamento da landing page.
2. Acessar `/api/health` e verificar uma resposta JSON com `status: "ok"`.
3. Conferir logs de build e runtime.
4. Testar em desktop e celular.
5. Confirmar que a produção atual não foi substituída antes de aprovar e mesclar a branch.

## Estado do spike

- [x] Criar branch isolada para a fundação.
- [x] Criar configuração inicial do Nuxt e TypeScript.
- [x] Criar landing page de apresentação com aviso de produto em construção.
- [x] Criar endpoint de saúde da aplicação.
- [x] Confirmar vínculo Vercel ↔ GitHub pelos metadados do deployment de produção.
- [x] Confirmar build de produção READY no commit `8167a400`.
- [ ] Validar resposta HTTP da landing page e `/api/health` (a integração Vercel não liberou o fetch nesta auditoria).
- [ ] Conectar PostgreSQL e executar migração Drizzle.
- [ ] Validar autenticação SSR e isolamento entre duas contas.
- [ ] Aprovar ou revisar a ADR-0002.

A landing page é apenas uma apresentação inicial. Cadastro, login, banco de questões, edital, progresso e demais recursos do produto ainda não estão implementados.

## Origem canônica para links de autenticação (alteração proposta)

As rotas de cadastro e recuperação de senha não devem gerar links usando o cabeçalho Host da requisição.

- Configurar **AUTH_REDIRECT_ORIGIN** somente no servidor com a origem HTTPS validada da aplicação, por exemplo `https://meaprovae.vercel.app` (sem caminho, query, credenciais ou fragmento).
- Conferir a correspondência exata com as URLs de redirecionamento permitidas no projeto Supabase Auth.
- Antes de integrar esta alteração, verificar a variável em todos os ambientes hospedados relevantes e testar cadastro, confirmação e recuperação com uma caixa de e-mail controlada.
- Sem essa variável fora do desenvolvimento local, as rotas retornam indisponibilidade controlada (503) para evitar links gerados com Host não confiável. **Não integrar antes de configurar o ambiente**.
- O fallback HTTP é permitido somente para localhost/127.0.0.1 em desenvolvimento.
- Não publicar tokens, links de recuperação ou dados de sessões em logs e PRs. Validar o rollback com a versão anterior do deploy sem modificar dados de usuários.
