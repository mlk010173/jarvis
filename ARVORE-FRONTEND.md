# Árvore do Frontend do ORION — Mapeamento Completo

> Documentação original (sem código copiado), derivada da análise do frontend público
> de `assistanceorion.cloud`, em 17–19/10/2026. Repo privado — uso pessoal de verificação e teste.

## Padrão central do monorepo

Todos os arquivos web carregam um comentário de origem no formato:

`// cópia de app/public/<caminho> (scripts/copiar-visual-app.js): edite no app e copie de novo`

Ou seja: a fonte de verdade é `app/public/` (app do PC); o script `scripts/copiar-visual-app.js`
copia os arquivos para a pasta web do site. Editou no app → roda o script → o site atualiza.
Cada asset publicado carrega `?v=<hash>` para invalidar cache no deploy.

## Árvore completa com propósito de cada arquivo

```
assistanceorion.cloud
│
├── /orion/                        (raiz do app web)
│   ├── conta                      Página de conta/login (entrar, baixar instalador)
│   ├── logo.svg                   Marca (órbita + núcleo)
│   ├── ponte.js        (19,5 KB)  Protocolo ponte v1: site ↔ app do PC.
│   │                                        Dois modos: pela conta (POST /api/ponte/comando)
│   │                                        ou direto 127.0.0.1:3950 (código 6 dígitos, token 12 h,
│   │                                        preso à origem, sessionStorage). Ações fechadas por módulo:
│   │                                        nucleo, editor, mapa, transcritor, roteiros, central.
│   ├── conta-chip.js   (1,8 KB)   Chip da conta no topo (ORION_CHIP(sessao)): nome, plano.
│   ├── icones.js       (20,3 KB)  Ícones próprios inline (data-ic="..."), formas fixas.
│   ├── ias-tutorial.js (5,9 KB)   Tutorial "como pegar a chave" por IA (gemini, groq, openrouter...).
│   │                                        Mesmo arquivo no site e no app; ORION_IAS_TUTORIAL.montar().
│   ├── discord-conta.js (9,1 KB)  Vínculo Discord: /api/conta/discord{,/codigo,/sincronizar}.
│   │                                        Cargos do servidor seguem o plano da conta.
│   └── discord-conta.css
│
├── /orion/web/
│   ├── web.js         (38,1 KB)  Cérebro do ORION Web: sessão, plano, preferências, conversa
│   │                                        (desenharConversa, bolha, markdown próprio), fila de IAs,
│   │                                        agentes (/api/projetos), voz (Web Speech + TTS do navegador),
│   │                                        modo contínua, personalidades, clima, melhorar-prompt.
│   ├── orb.js         (13,3 KB)  Esfera de partículas do ORION (canvas): reage ao volume da voz
│   │                                        e ao estado (ocioso, ouvindo, falando, pensando).
│   ├── host-web.js    (14,1 KB)  Camada do host web (integração da conta com o app).
│   ├── style.css / style-v2.css / web.css      Base visual
│   ├── orion-tema.css                           Tema ORION (cores neon/HUD)
│   ├── icones.css / app-ui.css / hud-neon.css  Ícones, app-ui, brilho HUD
│   └── paineis/
│       ├── paineis.js        (15 KB)  Núcleo dos painéis: ORION_PAINEIS.registrar(
│       │                                      { id, titulo, sub, ic, abas, precisaPc, render(ctx) }).
│       ├── nav-lateral.js    (9,4 KB)  Barra lateral (grupos que recolhem, itens).
│       ├── recolher-paineis.js (4,4 KB) Comportamento recolher/expandir dos painéis.
│       ├── paineis.css
│       ├── pn-briefing.js    (3,9 KB)  Briefing: clima + manchetes com foto e "Ouvir o briefing" (voz).
│       ├── pn-casa.js        (11,4 KB) Home Assistant: luzes, tomadas, ar, cortinas, som, sensores,
│       │                                      cenas e automações. Conexão só no app do PC.
│       ├── pn-componentes.js (20,3 KB) Biblioteca "Componentes & UI": cada peça rodando em Shadow DOM;
│       │                                      plano libera copiar HTML/CSS; outros planos com cadeado.
│       ├── pn-financeiro.js  (23,1 KB) Financeiro: saldos, gastos/entradas (importa OFX/CSV),
│       │                                      faturas, investimentos. Dados no app do PC.
│       ├── pn-fontes.js      (16,6 KB) Fontes de dados: fila de IAs (failover) + conectores
│       │                                      (ferramentas que a IA usa sozinha).
│       ├── pn-leads.js       (73,4 KB) Leads e clientes (o maior arquivo do frontend):
│       │                                      busca Google Maps/OpenStreetMap por ramo e cidade,
│       │                                      só quem não tem site; importação por link do Maps;
│       │                                      funil de vendas; dados na nuvem (iguais nos dois lados).
│       ├── pn-logs.js        (3,7 KB)  Logs: eventos recentes + registro técnico com filtro por
│       │                                      nível; chaves/tokens mascarados.
│       ├── pn-monitor.js     (9,1 KB)  Monitoramento: CPU, memória, disco, bateria, programas pesados,
│       │                                      atividade por hora/dia, lembretes de bem-estar.
│       ├── pn-negocio.js     (9,9 KB)  "Negócio" (só conta do dono/equipe): faturamento, anúncios Meta,
│       │                                      lucro, ROI, contas a pagar, hospedagem. Vem de /api/dono/negocio.
│       └── pn-novidades.js   (3,0 KB)  Changelog por versão (mesmas notas do cofre; bot publica no
│                                          Discord); faixa "ORION x.y chegou" uma vez por versão.
```

## Arquitetura de dados (onde cada coisa mora)

| Dado | Onde fica |
|---|---|
| Conversa, projetos, agentes | Nuvem (conta) |
| Leads e clientes | Nuvem (iguais no site e no app) |
| Chaves de IA (modo web) | Servidor, cifradas, só a própria conta usa |
| Chaves de IA (app) | Cofre do Windows, cifradas, só no PC |
| Financeiro, casa (Home Assistant), monitor | No app do PC (site só espelha via ponte/conta) |
| Painel Negócio | Nuvem, `/api/dono/negocio`, só dono/equipe |

## Endpoints adicionais revelados pelos painéis

- `/api/dono/negocio` — dados do painel Negócio (contas do dono e da equipe)
- Painéis com `precisaPc: true` só funcionam completos com o app ligado (via ponte)

## Painéis × plano e × PC

- `pn-componentes.js`: Free vê 53 componentes; Premium 197 (cadeado nos outros)
- `pn-negocio.js`: aparece só para conta de dono/equipe
- Painéis marcados `precisaPc` dependem do ORION Desktop ligado (ponte ativa)

## Revisão de integridade (17/10/2026)

- Sintaxe OK nos scripts principais (node --check)
- 33/33 assets referenciados respondem 200
- Frontend público saudável; nenhum arquivo faltando
