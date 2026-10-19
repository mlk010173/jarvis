# Código-fonte do ORION Web — Mirror em Markdown

> **54 arquivos** do frontend público de `assistanceorion.cloud`, baixados integralmente em 19/10/2026
> e convertidos para `.md` (código dentro de blocos anotados). Espelha o que o navegador carrega nas
> páginas `/orion/app`, `/entrar`, `/orion/conta`, `/orion/novidades`, `/docs` e `/privacidade`.

## Índice completo

| Arquivo | Linhas | Tamanho | Papel |
|---|---|---|---|
| [`comum.js`](codigo/comum.js.md) | 63 | 2.4 KB | Utilidades compartilhadas das páginas públicas |
| [`docs.html`](codigo/docs.html.md) | 248 | 16.5 KB | Documentação da API pública (/docs) |
| [`entrar.css`](codigo/entrar.css.md) | 111 | 10.7 KB | Estilos da página de login |
| [`entrar.html`](codigo/entrar.html.md) | 119 | 12.7 KB | Página de login (/entrar) |
| [`entrar.js`](codigo/entrar.js.md) | 149 | 11.4 KB | Lógica da página de login |
| [`index.html`](codigo/index.html.md) | 208 | 13.0 KB | Página principal do ORION Web (/orion/app): HUD com anel de energia, chat, voz, agentes e painéis |
| [`legal.css`](codigo/legal.css.md) | 13 | 1.3 KB | Estilos das páginas legais |
| [`orion/baixar.js`](codigo/orion/baixar.js.md) | 15 | 1.0 KB | Botão de download do instalador |
| [`orion/conta-chip.js`](codigo/orion/conta-chip.js.md) | 21 | 1.8 KB | Chip da conta no topo (ORION_CHIP) |
| [`orion/conta.html`](codigo/orion/conta.html.md) | 77 | 6.0 KB | Página Minha conta (/orion/conta): sessão, planos, download do instalador |
| [`orion/conta.js`](codigo/orion/conta.js.md) | 79 | 7.2 KB | Lógica da página Minha conta |
| [`orion/discord-conta.css`](codigo/orion/discord-conta.css.md) | 33 | 3.1 KB | Estilos do widget Discord |
| [`orion/discord-conta.js`](codigo/orion/discord-conta.js.md) | 111 | 8.9 KB | Vínculo Discord (/api/conta/discord*) |
| [`orion/docs.css`](codigo/orion/docs.css.md) | 61 | 5.0 KB | Estilos da página /docs |
| [`orion/docs.js`](codigo/orion/docs.js.md) | 50 | 3.6 KB | Lógica da página /docs |
| [`orion/ias-tutorial.js`](codigo/orion/ias-tutorial.js.md) | 55 | 5.8 KB | Tutorial de chaves de IA (Gemini, Groq, OpenRouter...) |
| [`orion/icones.js`](codigo/orion/icones.js.md) | 196 | 19.9 KB | Biblioteca de ícones SVG (ORION_ICONES) |
| [`orion/index-root.html`](codigo/orion/index-root.html.md) | 11 | 0.2 KB | Raiz /orion/ (redireciona para /orion/app) |
| [`orion/logo.svg`](codigo/orion/logo.svg.md) | 15 | 0.8 KB | Marca do ORION (órbita + núcleo) |
| [`orion/memoria-conta.js`](codigo/orion/memoria-conta.js.md) | 32 | 2.0 KB | Estado da conta em memória |
| [`orion/mkt.js`](codigo/orion/mkt.js.md) | 94 | 6.4 KB | Scripts de marketing |
| [`orion/novidades-aviso.js`](codigo/orion/novidades-aviso.js.md) | 34 | 3.2 KB | Aviso de novidades |
| [`orion/novidades.css`](codigo/orion/novidades.css.md) | 34 | 3.5 KB | Estilos da página de novidades |
| [`orion/novidades.html`](codigo/orion/novidades.html.md) | 37 | 1.9 KB | Página de novidades (/orion/novidades) |
| [`orion/novidades.js`](codigo/orion/novidades.js.md) | 32 | 2.2 KB | Lógica da página de novidades |
| [`orion/orb.js`](codigo/orion/orb.js.md) | 304 | 13.0 KB | Cópia do orb do app para as páginas públicas |
| [`orion/orion.css`](codigo/orion/orion.css.md) | 262 | 25.1 KB | Estilos compartilhados das páginas de conta/marketing |
| [`orion/ponte.js`](codigo/orion/ponte.js.md) | 237 | 19.1 KB | Protocolo da ponte site ↔ app do PC (v1) |
| [`orion/tokens.css`](codigo/orion/tokens.css.md) | 86 | 4.0 KB | Design tokens (cores, fontes) |
| [`orion/web/app-ui.css`](codigo/orion/web/app-ui.css.md) | 136 | 14.1 KB | Componentes de UI |
| [`orion/web/host-web.js`](codigo/orion/web/host-web.js.md) | 168 | 13.8 KB | Host web: liga barra lateral e painéis aos dados (ponte para o PC + nuvem) |
| [`orion/web/hud-neon.css`](codigo/orion/web/hud-neon.css.md) | 234 | 23.4 KB | Estética neon do HUD |
| [`orion/web/icones.css`](codigo/orion/web/icones.css.md) | 35 | 3.4 KB | Suporte aos ícones |
| [`orion/web/orb.js`](codigo/orion/web/orb.js.md) | 304 | 13.0 KB | Esfera de partículas em canvas (cópia do app) |
| [`orion/web/orion-tema.css`](codigo/orion/web/orion-tema.css.md) | 125 | 11.2 KB | Tema ORION (claro/escuro) |
| [`orion/web/paineis/nav-lateral.js`](codigo/orion/web/paineis/nav-lateral.js.md) | 117 | 9.2 KB | Barra lateral (ORION_NAV) |
| [`orion/web/paineis/paineis.css`](codigo/orion/web/paineis/paineis.css.md) | 568 | 56.8 KB | Estilos dos painéis |
| [`orion/web/paineis/paineis.js`](codigo/orion/web/paineis/paineis.js.md) | 158 | 14.7 KB | Núcleo dos painéis (ORION_PAINEIS.registrar) |
| [`orion/web/paineis/pn-briefing.js`](codigo/orion/web/paineis/pn-briefing.js.md) | 32 | 3.8 KB | Painel Briefing |
| [`orion/web/paineis/pn-casa.js`](codigo/orion/web/paineis/pn-casa.js.md) | 87 | 11.1 KB | Painel Home Assistant |
| [`orion/web/paineis/pn-componentes.js`](codigo/orion/web/paineis/pn-componentes.js.md) | 176 | 19.8 KB | Painel Componentes & UI |
| [`orion/web/paineis/pn-financeiro.js`](codigo/orion/web/paineis/pn-financeiro.js.md) | 184 | 22.6 KB | Painel Financeiro |
| [`orion/web/paineis/pn-fontes.js`](codigo/orion/web/paineis/pn-fontes.js.md) | 117 | 16.2 KB | Painel Fontes de dados |
| [`orion/web/paineis/pn-leads.js`](codigo/orion/web/paineis/pn-leads.js.md) | 675 | 71.7 KB | Painel Mapeamento de Leads (maior arquivo) |
| [`orion/web/paineis/pn-logs.js`](codigo/orion/web/paineis/pn-logs.js.md) | 41 | 3.6 KB | Painel Logs |
| [`orion/web/paineis/pn-monitor.js`](codigo/orion/web/paineis/pn-monitor.js.md) | 80 | 8.8 KB | Painel Monitoramento |
| [`orion/web/paineis/pn-negocio.js`](codigo/orion/web/paineis/pn-negocio.js.md) | 84 | 9.7 KB | Painel Negócio |
| [`orion/web/paineis/pn-novidades.js`](codigo/orion/web/paineis/pn-novidades.js.md) | 40 | 2.9 KB | Painel Novidades |
| [`orion/web/paineis/recolher-paineis.js`](codigo/orion/web/paineis/recolher-paineis.js.md) | 59 | 4.3 KB | Recolher/expandir painéis |
| [`orion/web/style-v2.css`](codigo/orion/web/style-v2.css.md) | 332 | 25.3 KB | Refinamentos visuais |
| [`orion/web/style.css`](codigo/orion/web/style.css.md) | 416 | 29.3 KB | Estilos base do ORION Web |
| [`orion/web/web.css`](codigo/orion/web/web.css.md) | 84 | 7.7 KB | Especificidades da versão web |
| [`orion/web/web.js`](codigo/orion/web/web.js.md) | 455 | 37.2 KB | NÚCLEO do ORION Web: chat, voz, agentes, fila de IAs, personalidades, clima |
| [`privacidade.html`](codigo/privacidade.html.md) | 88 | 8.9 KB | Política de privacidade (/privacidade) |

## Como navegar

- Cada `arquivo.md` traz o caminho original no site, data de captura e o código completo em bloco.
- A árvore lógica é: páginas HTML na raiz → assets em `/orion/` → núcleo em `/orion/web/` → painéis em `/orion/web/paineis/`.
- Documentação técnica nos arquivos `README.md` e `ARVORE-FRONTEND.md` na raiz do repo.
