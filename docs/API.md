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
| GET | /api/dono/eu | `{dono: false}` (honesto: sem painel de dono local) |
| GET | /api/ponte/apps | `{apps: []}` (sem app de PC conectado) |

## Armazenamento
JSON local em `server/data/db.json` (contas, sessões, projetos, chaves, coletiva). Backup = copiar o arquivo.

## Chaves de IA (BYOK)
Cada conta cadastra provedores OpenAI-compatíveis (OpenAI, Groq, Mistral, DeepSeek, OpenRouter, Google…).
O teste de projeto usa a primeira IA ativa da fila. As chaves ficam no servidor, nunca no navegador.
