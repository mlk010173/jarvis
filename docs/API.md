# API do JARVIS — contrato completo

Todas as rotas devolvem JSON. Erros seguem `{"erro": "mensagem em português"}` com o código HTTP
(400 inválido · 401 sem login/chave · 404 rota inexistente · 429 limite · 502 IAs falharam).

Duas formas de chamar:
1. **REST direto** — `GET/POST/PUT/DELETE https://SEU-BACKEND/api/...` com `Authorization: Bearer <token>` (token de sessão, retornado no cadastro/entrar).
2. **Bridge** — `POST https://SEU-BACKEND/bridge` com corpo `{ "rota": "/api/...", "metodo": "GET", "corpo": {...}, "token": "..." }` (formato usado pelo `jarvis/api-bridge.js` no GitHub Pages).

## Conta
| Método | Rota | Corpo / Observações |
|---|---|---|
| GET | /api/conta/sessao | `{logado, email}` |
| POST | /api/conta/cadastro | `{nome, email, senha≥8}` → `{token, usuario}` |
| POST | /api/conta/entrar | `{email, senha}` → `{token, usuario}` |
| POST | /api/conta/sair | encerra a sessão |
| GET | /api/conta/eu | dados da conta logada |
| GET | /api/conta/plano | plano e limites |
| GET/PUT | /api/conta/preferencias | preferências da conta |
| GET/PUT | /api/conta/memoria | itens de memória |
| GET/POST | /api/conta/ias | BYOK: `{provedor, chave, base_url, modelo}` |
| PUT | /api/conta/ias-ordem | `{ordem: [ids]}` — fila com failover |

## Projetos (agentes)
| Método | Rota | Observações |
|---|---|---|
| GET | /api/projetos | lista os da conta |
| POST | /api/projetos | `{nome, descricao, instrucoes, assistente}` |
| GET/PUT/DELETE | /api/projetos/:id | detalhe / edição / exclusão |
| POST | /api/projetos/:id/testar | `{mensagens: [...]}` → resposta da IA ativa (502 se nenhuma) |
| GET/POST | /api/projetos/:id/chaves | chaves de API do projeto (valor aparece 1×) |
| DELETE | /api/projetos/:id/chaves/:kid | revoga |

## API pública v1
| Método | Rota | Observações |
|---|---|---|
| POST | /api/v1/chat | `Authorization: Bearer jv_...` + `{mensagens}` (máx. 40) |

## Web / utilidades
| Método | Rota | Observações |
|---|---|---|
| GET | /api/info | marca, limites, provedores |
| GET | /api/novidades | changelog |
| GET | /api/comercial/planos | planos |
| GET | /api/web/personalidades | modos de tom |
| GET/POST | /api/web/clima | `{cidade}` — dados reais via Open-Meteo |
| POST | /api/web/melhorar-prompt | `{texto}` → versão melhorada + dicas |
| POST | /api/coletiva/lote | métricas anônimas (conta lotes/eventos) |
| GET | /api/ui/vitrine | tokens visuais |
| GET | /api/admin/eu | `{erro: "Área restrita ao dono e à equipe."}` |
| GET | /api/admin/vendas | `{erro: "Área restrita ao dono e à equipe."}` |
| GET | /api/admin/equipe | `{erro: "Área restrita ao dono e à equipe."}` |
| GET | /api/admin/cupons | `{erro: "Área restrita ao dono e à equipe."}` |
| GET | /api/admin/relatorios | `{erro: "Área restrita ao dono e à equipe."}` |
| GET | /api/admin/resumo | `{erro: "Área restrita ao dono."}` |
| GET | /api/admin/planos | `{erro: "Área restrita ao dono."}` |
| GET | /api/admin/usuarios | `{erro: "Área restrita ao dono."}` |
| GET | /api/admin/assinaturas | `{erro: "Área restrita ao dono."}` |
| GET | /api/admin/leads | `{erro: "Área restrita ao dono."}` |
| GET | /api/admin/push | `{erro: "Área restrita ao dono."}` |
| GET | /api/admin/auditoria | `{erro: "Área restrita ao dono."}` |
| GET | /api/admin/contas | `{erro: "Área restrita ao dono."}` |
| GET | /api/admin/contas/:id | `{erro: "Área restrita ao dono."}` (padrão com parâmetro) |
| GET | /api/admin/analytics | `{erro: "Área restrita ao dono e à equipe."}` |
| GET | /api/admin/clientes | `{erro: "Área restrita ao dono e à equipe."}` |
| GET | /api/admin/licencas | `{erro: "Área restrita ao dono."}` |
| GET | /api/admin/sites | `{erro: "Área restrita ao dono."}` |
| GET | /api/admin/transacoes | `{erro: "Área restrita ao dono."}` |
| POST | /api/admin/equipe | `{erro: "Área restrita ao dono."}` (convite/equipe) |
| POST | /api/admin/cupons | `{erro: "Área restrita ao dono."}` (criar cupom) |
| PUT | /api/admin/leads | `{erro: "Área restrita ao dono."}` (editar lead) | `{erro: "Área restrita ao dono."}` |
| GET | /api/dono/eu | `{dono: false}` (honesto: sem painel de dono local) |
| GET | /api/ponte/apps | `{apps: []}` (sem app de PC conectado) |

## Armazenamento
JSON local em `server/data/db.json` (contas, sessões, projetos, chaves, coletiva). Backup = copiar o arquivo.

## Chaves de IA (BYOK)
Cada conta cadastra provedores OpenAI-compatíveis (OpenAI, Groq, Mistral, DeepSeek, OpenRouter, Google…).
O teste de projeto usa a primeira IA ativa da fila. As chaves ficam no servidor, nunca no navegador.

---

## Rotas adicionais mapeadas na varredura profunda (19/10/2026)

### Conta e login
- `POST /api/conta/verificar-login` `{desafio, codigo}` — 2FA por e-mail em rede nova (código 6 dígitos, 10 min)
- `POST /api/conta/reenviar-codigo` `{desafio}` → `{email}`
- `GET /api/conta/google/ativo` → `{ativo: true}` (público)
- `GET /api/conta/google/iniciar` — inicia OAuth Google
- `GET /api/conta/pcs/` — PCs conectados à conta (login)
- `GET /api/conta/memoria` — memória da conta (login)

### Admin
- `/admin` → redireciona para `/entrar?volta=/admin` (área do dono: faturamento, Meta Ads, ROI)
- `GET /api/dono/negocio` (401 sem login de dono)

### Páginas do site
- `/orion/comecar`, `/orion/novidades`, `/entrar`, `/docs`, `/tutoriais`, `/termos`, `/privacidade`
- `/orion/checkout?plano=premium` — checkout próprio

### Marketing e métricas
- `GET /api/marketing/publico` → IDs de conversão públicos: Google Ads `AW-18521438314`, Facebook Pixel
- `POST /api/coletiva/lote` — métricas anônimas de uso (opt-in explícito no app)

### Componentes públicos
- `POST /api/public/v1/card-tokens` — tokens de componentes para sites externos
- `GET /api/ui/vitrine` — temas CSS servidos pela API
- `GET /api/ui/pro/midia/` (login Pro)

### API v1
- `POST /api/v1/chat` — `Authorization: Bearer sk_live_...`, histórico máx. 40 mensagens × 8.000 chars
- `GET /api/v1/projeto` — info do projeto da chave

### Comportamento verificado ao vivo
- Erros: sempre `{"erro": "..."}` em pt-BR com código HTTP correto (400/401/404/429/502)
- Roteamento de métodos real (PUT em rota GET → 404)
- Login sem sessão: erro genérico, sem leak de existência de conta
- Detalhes de segurança: `docs/AUDITORIA-ORION.md` · Histórico do produto: `docs/CHANGELOG-ORION.md`

## Área admin (descoberta em auditoria, 19/10/2026)

Varredura autenticada da API oficial (1157+ candidatos, discriminação 404 vs 401/403) confirmou 18 rotas GET `/api/admin/*` + 3 de escrita (POST equipe/cupons, PUT leads) + padrão `/api/admin/contas/:id` que exigem papel de dono ou equipe. A API oficial nega com `403 "Área restrita ao dono (e à equipe)."` para contas comuns; o backend JARVIS replica o contrato negando honestamente (`dono: false`). A família `/api/v1/*` é um muro por prefixo: qualquer caminho sob `/api/v1` exige `Authorization: Bearer SUA_CHAVE`.

## Conector de e-mail e Devtools (21/10/2026)

- `POST /api/email/caixa {consulta?, max?}` — lista e-mails da caixa do dono (consulta no formato do Gmail: `in:inbox newer_than:7d`, `from:hotmart`, etc.). Exige login.
- `POST /api/email/ler {id}` — corpo completo de uma mensagem. Exige login.
- Ferramenta do agente: `{EMAIL:consulta}` no Modo Agente (ex.: "quais e-mails chegaram hoje?").
- Devtools: `jarvis/devtools.html` — status da API, ferramentas do agente, console de erros e permissões reais do dispositivo (microfone, câmera, notificações, localização, clipboard).
- Conector: função jarvisEmail (Base44) com o Gmail conectado do dono; ações enviar/listar/ler. Se o canal externo estiver no limite de créditos, as rotas respondem 502 com o motivo real — nunca dados falsos.

## Monitoramento e segurança (21/10/2026, v1.3.1)

- `GET /api/logs/ia` — últimas 120 execuções de IA: modelo, provedor, latência (ms), tokens in/out, custo estimado em USD e erro quando houver. Login exigido.
- `GET /api/logs/ia/resumo` — por mês: execuções, erros, custo total e quebra por modelo (tabela de preços embutida por modelo; modelos free contam custo 0).
- Segurança: `abrirWeb`/ferramenta ABRIR agora aceita apenas **https público** — localhost, IPs privados (10.x, 127.x, 172.16-31.x, 192.168.x), link-local 169.254.x (metadados de nuvem) e http:// são bloqueados (anti-SSRF).
- Rate limit: `POST /api/v1/chat` limitado a 20 chamadas por minuto por chave (429 acima disso).
- Ollama no catálogo de IAs: base `http://127.0.0.1:11434/v1` — modelos locais no PC, grátis e privados.

## MCP oficial + Composio (21/10/2026, v1.3.2)

- `POST /mcp` — servidor MCP **oficial da spec** (modelcontextprotocol.io, JSON-RPC 2.0): `initialize`, `tools/list`, `tools/call` (ferramentas `pesquisar_web`, `abrir_url`, `email_buscar`, `clima`). Auth: `Authorization: Bearer <chave de projeto jv_...>` ou `{"token"}` da conta. Qualquer cliente MCP (Claude Desktop, Cursor, Claude Code etc.) conecta direto.
- `POST /api/composio/mcp` — proxy autenticado ao hub **Composio** (250+ apps: Gmail, Calendar, Notion, Slack, GitHub...). Envia JSON-RPC de MCP (métodos permitidos: initialize, ping, tools/list, tools/call, notifications/initialized); a chave `COMPOSIO_API_KEY` fica no servidor. Exige login.
- Ferramenta `composio` em `/api/mcp/executar`: `{ferramenta, args, busca}` executa meta-ferramentas do Composio (ex.: `COMPOSIO_SEARCH_TOOLS` com `busca:"gmail"`).
- Conta Composio: nm424294@gmail.com, workspace nm424294 (carteira com $2 de crédito inicial; apps pagos cobram por chamada).
