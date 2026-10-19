# Variáveis de ambiente e deploy seguro — JARVIS

Como o backend lê a configuração, onde cada valor entra e o que ainda precisa ser cadastrado
nos provedores. **Nenhum valor secreto aparece aqui — e nenhum segredo vai no frontend ou no repo.**

## Servidor

| Variável | Obrigatória | Para quê |
|---|---|---|
| `PORT` | sim (host define) | Porta HTTP. No Render é injetada automaticamente. |
| `JARVIS_URL` | sim | Origem do frontend, usada nos redirecionamentos do OAuth (ex.: `https://mlk010173.github.io/jarvis`). Sem ela o login social volta pro destino errado. |

## Pagamento (opcional)

`PIX_CHAVE`, `PIX_NOME`, `PIX_CIDADE` — ativam o Pix EMV copia-e-cola no checkout premium.
Sem elas, a rota `/api/pagamentos/pix` responde 501 com mensagem clara (não finge que funcionou).

## Verificação em 2 etapas (e-mail real)

`JARVIS_EMAIL_URL` + `JARVIS_EMAIL_SIG` — ligam o 2FA: login de dispositivo novo gera código de 6 dígitos
enviado por e-mail (10 min, uso único, reenvio com espera de 60 s). O remetente é uma função de e-mail
do ecossistema Base44 que usa o Gmail conectado do dono. **Sem essas variáveis o login continua funcionando
normalmente, sem verificação** — degradação honesta, nunca bloqueia o usuário.

## OAuth (login com Google, Discord e GitHub)

Cada provedor só aparece na tela de login quando o par id+segredo está no ambiente
(`/api/conta/<provedor>/ativo` responde `true`). Botão não configurado = não aparece, sem link falso.

| Variável | Obrigatória | Escopo pedido (mínimo) |
|---|---|---|
| `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` | para login Google | `openid email profile` — só identidade. Nada de Gmail/Drive. Fluxo com PKCE (S256) + `state`. |
| `DISCORD_CLIENT_ID` / `DISCORD_CLIENT_SECRET` | para login Discord | `identify email` |
| `GITHUB_CLIENT_ID` / `GITHUB_CLIENT_SECRET` | para login GitHub | `read:user user:email` — **zero acesso a repositórios**. |

### Callbacks para cadastrar no provedor

Produção (backend atual):

```
Google  : https://jarvis-backend-7949.onrender.com/api/conta/google/callback
Discord : https://jarvis-backend-7949.onrender.com/api/conta/discord/callback
GitHub  : https://jarvis-backend-7949.onrender.com/api/conta/github/callback
```

- **Google**: Google Cloud Console → Credenciais → ID do cliente OAuth → "Aplicativo da Web".
  Origens JavaScript autorizadas: `https://mlk010173.github.io` e a URL do backend.
- **Discord**: discord.com/developers → Application → OAuth2 → "Add Redirect".
- **GitHub**: github.com/settings/developers → OAuth Apps → "Authorization callback URL".

### Como a sessão funciona

1. `/api/conta/<prov>/iniciar` → provedor (state + PKCE, sem redirecionamento aberto: `volta` só aceita caminho interno).
2. `/api/conta/<prov>/callback` → troca o code por token no servidor, lê o perfil, cria/vincula a conta.
3. Gera um **código de uso único (60 s)** e volta para `JARVIS_URL/entrar.html?oauth=...&codigo=...` — o token de sessão **nunca vai na URL**.
4. O frontend troca o código em `POST /api/conta/oauth/resgatar` → recebe o token de sessão (30 dias) e guarda em `localStorage('jarvis.sessao')`; o api-bridge o envia em cada chamada. Contas ficam isoladas por token: cada sessão só lê os próprios dados.

## O que já está configurado no Render

`JARVIS_URL`, `JARVIS_EMAIL_URL`, `JARVIS_EMAIL_SIG` — o resto depende de credenciais que só o dono cria no console de cada provedor
(o botão correspondente acende sozinho quando o par entrar no ambiente).

`JARVIS_URL` — o resto depende de credenciais que só o dono cria no console de cada provedor
(o botão correspondente acende sozinho quando o par entrar no ambiente).
