# Arquitetura do JARVIS — Documentação Técnica

> Documento original, escrito a partir da análise do frontend público de `assistanceorion.cloud`
> (JARVIS, página `/jarvis/app`), realizada em 17–19/10/2026.
> **Até 19/10/2026 este repo era só descrição técnica;** a partir de agora a pasta `codigo/` contém o espelho completo dos 54 arquivos do frontend público, em `.md` (fatos,
> estruturas e comportamentos observáveis), para verificação, estudo e planejamento de testes.

## 1. Visão geral do produto

O JARVIS é um assistente pessoal de IA brasileiro com três partes que conversam entre si:

| Parte | Papel |
|---|---|
| Site (`assistanceorion.cloud`) | Conta, planos, pagamento (PIX), download do app e o JARVIS (área de trabalho no navegador) |
| App Windows (JARVIS Desktop) | Voz, editor de vídeo (corte de silêncio, legendas), motion com IA, mapeamento de leads, central de automação |
| Ponte | Ligação segura site ↔ app no PC do usuário (via conta na nuvem ou rede local) |

Modelo de negócio: plano Free (1 PC, 1 IA) e Premium por PIX (mensal, trimestral ou vitalício,
até 3 PCs). Contato: `assistanceorion.cloud@gmail.com` + Discord. Instalador Windows distribuído
na área "Minha conta" após cadastro (não assinado digitalmente; publicam o hash SHA-256).

## 2. Árvore de arquivos do frontend (observada no HTML público)

Monorepo: um comentário no HTML (`scripts/copiar-visual-app.js`) indica que o app do PC e o site
compartilham o mesmo repositório; um script copia os arquivos visuais do app para a pasta web.

```
/jarvis/
├── conta, logo.svg, ponte.js, conta-chip.js, icones.js
├── discord-conta.js + discord-conta.css
├── ias-tutorial.js        (tutorial de chaves de IA: gemini, groq, openrouter…)
└── web/
    ├── web.js (38 KB, app principal), orb.js, host-web.js
    ├── style.css, style-v2.css, web.css, orion-tema.css, icones.css, app-ui.css, hud-neon.css
    └── paineis/
        ├── paineis.js, paineis.css, nav-lateral.js, recolher-paineis.js
        └── pn-monitor.js, pn-financeiro.js, pn-casa.js, pn-negocio.js,
            pn-leads.js, pn-briefing.js, pn-componentes.js, pn-logs.js,
            pn-fontes.js, pn-novidades.js
```

Cada asset carrega com versionamento de build (`?v=` + hash), sugerindo pipeline de deploy
com invalidação de cache.

## 3. Superfície de API (inferida das chamadas do frontend)

**Conta**
- `POST /api/conta/sessao` — login/sessão
- `GET /api/conta/plano` — plano da conta
- `GET/PUT /api/conta/preferencias` — preferências (voz, modo)
- `GET/PUT /api/conta/ias`, `/api/conta/ias-ordem`, `/api/conta/ias/{id}` — fila de IAs (chaves cifradas no servidor, uso exclusivo da conta)
- `/api/conta/discord`, `/api/conta/discord/codigo`, `/api/conta/discord/sincronizar` — vínculo Discord (cargos por plano)

**Projetos/Agentes**
- `GET/POST /api/projetos`, `/api/projetos/{id}`, `/api/projetos/assistente` — CRUD de agentes (nome, instruções, personalidade)

**Web**
- `GET /api/web/clima?cidade=` — clima
- `POST /api/web/melhorar-prompt` — "Melhorar o pedido com IA" (Alt+M)
- `GET /api/web/personalidades` — modos de personalidade

**Ponte site ↔ PC**
- `GET /api/ponte/apps` — PCs ligados na conta
- `POST /api/ponte/comando` — envia pedido ao app `{ pc, metodo, rota, corpo }`
- `POST /modulo/abrir` — abre módulo no PC

**API pública de desenvolvedores (documentada em /docs)**
- `POST /api/v1/chat` — `{ mensagem }` ou `{ mensagens: [{role, content}] }` (máx. 40 msgs de 8 KB); resposta `{ resposta, ia, modelo, tokens }`
- `GET /api/v1/projeto` — valida a chave e mostra o projeto
- Auth: `Authorization: Bearer sk_live_…` gerada por projeto; limites 60 req/min por chave + cota diária do plano (meia-noite de Brasília); timeout recomendado 90 s

## 4. Protocolo da ponte (v1)

Dois caminhos, documentados no próprio script:
1. **Pela conta (preferido):** o app escuta a nuvem; o site manda `/api/ponte/comando` com credenciais da sessão. Sem permissão de rede local.
2. **Direto (127.0.0.1):** o app aceita só a origem exata do site; pede código de 6 dígitos que aparece no PC; entrega token Bearer de 12h preso à origem (sessionStorage).

- Portas: 3950 (padrão do instalador) + extras 3951–3954 e 3900
- Lista fechada de módulos: `nucleo` (voz), `editor`, `mapa` (leads), `transcritor`, `roteiros`, `central` (automação)
- Só executa ações fechadas, com confirmações no PC
- Estados observados: procurando…, ONLINE, EM ESPERA

## 5. Fila de IAs com failover (conceito-chave)

A primeira IA da fila responde; se falhar (sem crédito, limite, erro) a próxima assume com a mesma
conversa e tarefa em andamento. Chaves: no app ficam cifradas só no PC (cofre do Windows); no modo
web ficam cifradas no servidor. Tutoriais embutidos para: Gemini (grátis, AI Studio), Groq (grátis),
OpenRouter (grátis). Free usa 1 IA; Premium sem limite (OpenAI, Claude, Gemini, Ollama…).

## 6. Padrões técnicos do frontend

- 100% vanilla JS (sem React/Vue): funções próprias (desenharConversa, bolha, animar…)
- Renderizador de markdown próprio
- Voz: Web Speech API (microfone), TTS do navegador (vozes do Edge), modo "contínua" (reouvir após responder), atalhos Ctrl+Espaço/Esc
- Agente gerado por IA (descrição → formulário preenchido)
- Ícones próprios via `icones.js` (data-ic), CSS com tema neon/HUD

## 7. Revisão de erros dos arquivos públicos (17/10/2026)

- Sintaxe: os 5 scripts principais passam sem erro (`node --check`): ponte.js, ias-tutorial.js, discord-conta.js, web.js, host-web.js
- Assets: todos os 33 arquivos referenciados pelo HTML respondem 200 (nenhum 404/quebra)
- Conclusão: frontend público saudável, sem sinais de arquivos faltando

## 8. O que não é observável de fora

- Backend (serviços, banco, autenticação real, pagamentos PIX)
- Código do app Windows (fechado no instalador)
- Nada em lojas de apps, GitHub ou imprensa — presença pública é só o site + Discord

## 9. Checklist de verificação para o dono

1. Comparar esta árvore com a pasta real do projeto
2. Conferir se as portas da ponte batem com o instalador atual
3. Testar os endpoints `/api/v1/*` com uma chave de projeto própria
4. Reproduzir a revisão de erros: `node --check` nos scripts + varredura de 404 nos assets

## 10. Espelho no GitHub Pages (19/10/2026)

O **site estático completo** está publicado em:

**https://mlk010173.github.io/jarvis/**

- 80 arquivos, 14 páginas: `/jarvis/app` (JARVIS), `/entrar`, `/jarvis/conta`, `/jarvis/comecar`,
  `/jarvis/checkout`, `/jarvis/novidades`, `/docs`, `/tutoriais`, `/painel`, `/tutorials`,
  `/termos`, `/privacidade`
- Caminhos absolutos reescritos para relativos (o Pages não serve na raiz do domínio)
- `jarvis/api-bridge.js`: intercepta chamadas `/api/*` e devolve resposta amigável — o
  backend (login, planos, PIX, ponte com o PC) não existe num site estático
- As validações do espelho: `node --check` em todos os JS + todos os links internos resolvem
- `pages-workflow.yml` (na raiz do repo): workflow de Actions pronto. Para ativar, mova para
  `.github/workflows/` na interface do GitHub (o token usado não tinha escopo `workflow`).

> Para editar: os arquivos na raiz do repo são o site; `codigo/` continua sendo o espelho em `.md`.

## 11. Auditoria de segurança
Relatório em [`AUDITORIA_SEGURANCA.md`](AUDITORIA_SEGURANCA.md): mapeamento de 65 endpoints, varredura de segredos,
cabeçalhos, teste do renderizador Markdown contra XSS e observações de baixo risco. Nenhuma falha crítica no frontend;
backend não analisado.

## 12. Deploy
`.github/workflows/pages.yml` valida a sintaxe de todos os JS e os links internos, e publica no Pages a cada push em `main`.


## 13. JARVIS: rebrand e backend de verdade (19/10/2026)

**Comandos reais no chat** (dados abertos ao vivo, sem IA): `/clima [cidade]`, `/moeda [USD] [BRL]`,
`/cripto [bitcoin|ethereum|solana|cardano|dogecoin]`, `/wiki [termo]`, `/feriados [ano]`, `/github`, `/ajuda`.
Fontes: MET.no/Open-Meteo (clima), AwesomeAPI/Frankfurter-BCE (moedas), CoinGecko/Coinbase (cripto),
Wikipédia PT, Nager.Date (feriados), GitHub API — todas abertas e sem chave.

O projeto deixou de ser um espelho estático e virou o **JARVIS**, com backend real:

- **Nome:** repositório renomeado para `mlk010173/jarvis`, site em https://mlk010173.github.io/jarvis/
- **Backend real:** função `jarvisApi` (Base44 backend function, Deno) com banco de dados persistido
  (entidades `JarvisConta`, `JarvisSessao`, `JarvisProjeto`):
  - Cadastro e login reais, senha com PBKDF2-SHA256 (60k iterações, salt por usuário)
  - Sessões com token de 30 dias, logout, troca de senha
  - Projetos/assistentes persistidos por conta (com proteção contra acesso de outros usuários)
  - Preferências e memória da conta gravadas no banco
  - Clima real via MET.no + Open-Meteo geocoding
  - Limite de 120 requisições/minuto por token
- **Sem simulação:** `pages-shim.js` (API falsa) foi removido; `jarvis/api-bridge.js` só traduz as
  chamadas `/api/*` do site para o backend real
- **Removidas as ligações ao site oficial anterior:** links de suporte apontam para
  https://github.com/mlk010173/jarvis/issues
- **O que não existe (por ser verdadeiro):** IA de conversa exige provedor de IA conectado;
  pagamentos, login Google/Discord e ponte com o app do PC não estão ativos — a API responde
  com erro honesto, não com dado inventado
- O espelho histórico em `.md` continua na pasta `codigo/` (documenta a origem ORION do código)

> A pasta `codigo/` e o `AUDITORIA_SEGURANCA.md` preservam a história do projeto (origem ORION).

---

## 3. Como rodar 100% online (frontend + backend juntos)

O repositório agora é **completo**: frontend inteiro (landing, app, painéis) + backend próprio.

```bash
# Requisito: Node 18+
npm start            # ou: node server/server.js
# → http://localhost:3000  (landing em /, app em /jarvis/app.html)
```

O servidor (`server/server.js`) não tem dependências, serve os arquivos estáticos
e implementa toda a API (`docs/API.md`): contas com sessão, projetos (agentes),
chaves de API, clima real (Open-Meteo), personalidades, melhorar-prompt e coletiva.
Dados em JSON local (`server/data/db.json`).

### Deploy grátis
- **Render**: o `render.yaml` está pronto — New Web Service → repositório → plano free.
- **Docker**: `Dockerfile` pronto (Fly.io, Railway, VPS…).
- Depois do deploy, para que o **GitHub Pages** use o SEU backend, rode no console do navegador:
  `localStorage.setItem('jarvis.api', 'https://SEU-APP.onrender.com/bridge')`
  (sem isso, o Pages usa o backend compartilhado configurado por padrão no `api-bridge.js`).

### Estrutura

```
/                      páginas: entrar.html, painel.html, docs, tutoriais, termos, privacidade
jarvis/                landing (index.html), app (app.html), painéis, checkout, conta
jarvis/web/            estilos + web.js + host-web.js do app
jarvis/web/paineis/   pn-*.js — painéis do app
jarvis/api-bridge.js   ponte frontend↔backend (base configurável via localStorage)
server/server.js       backend Node sem dependências (API completa + arquivos estáticos)
docs/API.md            contrato de todas as rotas
render.yaml, Dockerfile, package.json
```

## 4. Versões

- **1.1.0 (19/10/2026)** — frontend completo no repo (landing com hero, app com todos os painéis),
  backend próprio `server/`, api-bridge configurável, login funcionando no GitHub Pages,
  documentação (`docs/API.md`) e configs de deploy (Render/Docker).
