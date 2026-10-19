# Arquitetura do ORION Web — Documentação Técnica

> Documento original, escrito a partir da análise do frontend público de `assistanceorion.cloud`
> (ORION Web, página `/orion/app`), realizada em 17–19/10/2026.
> **Até 19/10/2026 este repo era só descrição técnica;** a partir de agora a pasta `codigo/` contém o espelho completo dos 54 arquivos do frontend público, em `.md` (fatos,
> estruturas e comportamentos observáveis), para verificação, estudo e planejamento de testes.

## 1. Visão geral do produto

O ORION é um assistente pessoal de IA brasileiro com três partes que conversam entre si:

| Parte | Papel |
|---|---|
| Site (`assistanceorion.cloud`) | Conta, planos, pagamento (PIX), download do app e o ORION Web (área de trabalho no navegador) |
| App Windows (ORION Desktop) | Voz, editor de vídeo (corte de silêncio, legendas), motion com IA, mapeamento de leads, central de automação |
| Ponte | Ligação segura site ↔ app no PC do usuário (via conta na nuvem ou rede local) |

Modelo de negócio: plano Free (1 PC, 1 IA) e Premium por PIX (mensal, trimestral ou vitalício,
até 3 PCs). Contato: `assistanceorion.cloud@gmail.com` + Discord. Instalador Windows distribuído
na área "Minha conta" após cadastro (não assinado digitalmente; publicam o hash SHA-256).

## 2. Árvore de arquivos do frontend (observada no HTML público)

Monorepo: um comentário no HTML (`scripts/copiar-visual-app.js`) indica que o app do PC e o site
compartilham o mesmo repositório; um script copia os arquivos visuais do app para a pasta web.

```
/orion/
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

**https://mlk010173.github.io/orion-web-arquitetura/**

- 80 arquivos, 14 páginas: `/orion/app` (ORION Web), `/entrar`, `/orion/conta`, `/orion/comecar`,
  `/orion/checkout`, `/orion/novidades`, `/docs`, `/tutoriais`, `/painel`, `/tutorials`,
  `/termos`, `/privacidade`
- Caminhos absolutos reescritos para relativos (o Pages não serve na raiz do domínio)
- `orion/pages-shim.js`: intercepta chamadas `/api/*` e devolve resposta amigável — o
  backend (login, planos, PIX, ponte com o PC) não existe num site estático
- As validações do espelho: `node --check` em todos os JS + todos os links internos resolvem
- `pages-workflow.yml` (na raiz do repo): workflow de Actions pronto. Para ativar, mova para
  `.github/workflows/` na interface do GitHub (o token usado não tinha escopo `workflow`).

> Para editar: os arquivos na raiz do repo são o site; `codigo/` continua sendo o espelho em `.md`.
