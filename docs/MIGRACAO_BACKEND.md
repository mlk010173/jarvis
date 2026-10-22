# Migração e paridade de backend — JARVIS (21/10/2026)

Como saímos de dois backends divergentes para um backend canônico (Base44) sem quebrar nada do que funciona.

## Regra inviolável

O contrato é o envelope `jarvis/api-bridge.js`: `POST {rota, metodo, corpo, token}`. Enquanto ele existir, o frontend não muda. Nenhuma migração pode quebrar: login, sessões, isolamento por conta, chat, SDK, painéis.

## Matriz de paridade (Base44 v1.3.3 =Node v1.3.2 agora)

| Capacidade | Node v1.3.2 | Base44 antes | Base44 v1.3.3 |
|---|---|---|---|
| Conta e-mail/senha, sessões 30d | sim | sim | sim |
| BYOK 7 provedores + fila fallback | sim | sim | sim (+Ollama) |
| Chat com IA real | sim | sim | sim |
| Modo Agente (pesquisar/abrir) | sim | sim | sim (busca agora Bing→DDG) |
| Monitor de IA (custo/tokens/latência) | sim (/api/logs/ia) | não | **sim** |
| Guarda anti-SSRF no ABRIR | sim | não | **sim** |
| Rate limit em rotas públicas | sim (v1/chat) | não | **sim** (cadastro/login/v1/chat) |
| Ollama no catálogo | sim | não | **sim** (aviso honesto) |
| MCP oficial JSON-RPC 2.0 (/mcp) | sim | não | **sim** |
| SDK público v1 + chave de projeto | sim | não | **sim** |
| /api/health e /api/capabilities | não | não | **sim** |
| Cifra de chaves BYOK em repouso | não | não | **sim** (opcional via JARVIS_MASTER_KEY) |
| Proxy Composio (250+ apps) | sim (com chave) | não | suporte + 501 honesto (falta COMPOSIO_API_KEY) |
| Conector de e-mail do dono | sim (com env) | não | suporte + 501 honesto (falta config) |
| OAuth Google/Discord/GitHub | código pronto | não | pendente: exigiria portar + Client IDs do dono |
| 2FA por e-mail | código pronto (com env) | não | pendente: exigiria SMTP |
| Pix/cartão no checkout | 501 honesto | não | pendente: exigir provedor |
| devtools.html rico | sim | limitado | pendente (frontend) |

## Como o deploy funciona agora (rollback fácil)

- Fonte canônica: `base44/jarvisApi.ts` (legível, comentado).
- Build: `tsc --target es2022 --module esnext --lib es2022,dom base44/jarvisApi.ts` → `base44/jarvisApi.js` (commitado junto).
- Função deployed: bootstrap de ~15 linhas que importa `base44/jarvisApi.js` via jsDelivr e registra `handler`.
- **Rollback =** restaurar o commit anterior do arquivo .js e (se o cache do jsDelivr demorar) atualizar a URL do bootstrap com o hash do commit. Nenhuma etapa toca nos dados do banco — rollback de código nunca apaga nada.
- Para testar localmente: `node --check base44/jarvisApi.js` (sintaxe) e chamadas reais na função (ver abaixo).

## Testes de contrato (a rodar a cada mudança de backend)

1. `POST {rota:"/api/health"}` → 200 com `versao`.
2. Cadastro/login/eu/sair com conta de teste → sessão válida e isolada.
3. `GET /api/novidades` → `atual` com a versão esperada.
4. `POST /api/web/pesquisar` com login → resultados reais.
5. `POST /mcp` JSON-RPC `tools/list` com Bearer de projeto → lista de ferramentas.
6. `POST /api/v1/chat` com Bearer de projeto → resposta da IA do dono.
7. Duas contas criadas → nenhuma enxerga dados da outra (verificar em /api/financeiro etc).
8. Login 13x seguidas → 429 na 13ª (rate limit).

## Riscos conhecidos e mitigações

- **Cache do jsDelivr (até ~12h no branch main):** mitigar fixando tag por versão se o ciclo de deploy apertar.
- **Instância fria busca o pacote na 1ª chamada:** latência extra de centenas de ms só no primeiro request de cada instância.
- **Memória do monitor de IA (OBS) é por instância:** volume baixo por enquanto; evoluir para JarvisLog se precisar de histórico persistente entre instâncias.
- **Chaves BYOK em texto puro enquanto JARVIS_MASTER_KEY não existir:** risco registrado em /api/capabilities e no ENV.md; a cifra é retroativa (chaves antigas em texto continuam legíveis; ao re-salvar a chave, ela é cifrada).
