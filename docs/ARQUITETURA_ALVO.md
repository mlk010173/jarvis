# Arquitetura-alvo do JARVIS (v1.3.3 — 21/10/2026)

## Estado atual confirmado (auditado no código em 21/10/2026)

- **Frontend:** HTML/CSS/JS puro, ~20 páginas, hospedado no GitHub Pages (deploy automático via Actions a cada push). Sem build.
- **Backend ATIVO (canônico):** função serverless `jarvisApi` no Base44 (Deno), URL `https://superagent-6e379590.base44.app/functions/jarvisApi`. v1.3.0 até 21/10/2026, **v1.3.3 a partir de agora**.
- **Backend Node (`server/server.js`):** v1.3.2 no repositório. Deploy Render (`jarvis-backend-7949.onrender.com`) **travado na v1.1.0** desde 19/10 (sincronização com GitHub parou; retomar exige "Deploy latest commit" manual no dashboard).
- **Banco:** entidades Base44 (JarvisConta, JarvisSessao, JarvisProjeto, JarvisDado, JarvisLog). Isolamento por e-mail + token de sessão (30 dias, expiração numérica).
- **Contrato estável:** o frontend fala SOMENTE via `jarvis/api-bridge.js` com envelope POST `{rota, metodo, corpo, token}`. Trocar backend = trocar a URL da função, sem tocar no frontend.

## Divergência encontrada (problema estrutural nº 1)

As features v1.3.1/v1.3.2 (monitor de IA, MCP oficial, Composio, anti-SSRF, rate limit, Ollama, conector de e-mail) existiam APENAS no servidor Node. O site usava o Base44 v1.3.0 — sem nenhuma delas. Dois backends silenciosamente divergentes.

## Decisão de arquitetura: **Opção B — Base44 como backend canônico**

Motivos:
1. É o backend que o site já usa em produção, com deploy confiável e banco no mesmo lugar (menos uma peça na cadeia).
2. A Render parou de sincronizar; retomá-la exige ação manual do dono e não há vantagem técnica clara hoje.
3. O Deno do Base44 atende tudo que o Node oferecia; o que não atende (executar código no PC do usuário) nunca funcionaria em nenhum backend em nuvem.

O servidor Node fica no repositório como referência/porta alternativa, mas **não é mais o alvo**. Ele não deve receber features novas antes de uma decisão explícita do dono.

## Estratégia de deploy do Base44 (nova, v1.3.3)

O validador/desafio: a função `jarvisApi` passou de 45KB (v1.3.0) para ~120KB de código, acima do prático de enviar direto em cada deploy.

Solução adotada (transparência total, nada escondido):
1. O código-fonte legível completo é o TypeScript em **`base44/jarvisApi.ts`** (canônico).
2. O build é transpilado para **`base44/jarvisApi.js`** (`tsc --target es2022 --module esnext`) e commitado.
3. A função deployed é um bootstrap pequeno que faz `await import('https://cdn.jsdelivr.net/gh/mlk010173/jarvis@main/base44/jarvisApi.js')` e registra o handler exportado.
4. Todo o tráfego do site continua no mesmo envelope; nenhum segredo vai no repo (a chave mestra opcional `JARVIS_MASTER_KEY` vem do ambiente).

Consequência operacional: o jsDelivr cacheia o branch por até 12h — depois de um push, o deploy efetivo pode demorar até esse limite. Alternativa futura: fixar por tag (`@v1.3.3`) ou hospedar o build no storage do Base44.

## Paridade levada ao backend ativo nesta versão (v1.3.3)

Portado do Node v1.3.1/v1.3.2 → Base44:
- Monitor de execuções de IA (custo/tokens/latência/erro por modelo): `GET /api/logs/ia`, `GET /api/logs/ia/resumo`
- Guarda anti-SSRF no ABRIR e no MCP (bloqueia http, localhost, redes privadas, link-local, metadados)
- Rate limit (janela 60s): cadastro 10/IP, login 12/IP, SDK público 20/chave
- Ollama no catálogo (com aviso honesto: em nuvem o 127.0.0.1 é o servidor, não o PC do usuário)
- MCP oficial JSON-RPC 2.0 em `POST /mcp` (initialize/ping/tools/list/tools/call) com Bearer de projeto ou token de conta
- Rotas de descoberta: `GET /api/health` e `GET /api/capabilities` (estado real, sem fingir)
- SDK público v1: cada projeto ganha chave `jarvis_sk_...` (`GET/POST/DELETE /api/projetos/{id}/chaves`, `POST /api/v1/chat`, `GET /api/v1/projeto`)
- Cifra opcional de chaves BYOK em repouso (AES-256-GCM com `JARVIS_MASTER_KEY` do ambiente; sem a chave, fica texto puro e o /api/capabilities diz isso)
- Estados honestos para o que exige configuração externa: Composio (501 sem COMPOSIO_API_KEY), conector de e-mail (501), OAuth social, Pix

Não portado (por depender de infra/decisão do dono): OAuth social (falta criar Client IDs), 2FA por e-mail (falta SMTP), Pix (falta provedor), proxy Composio real (falta chave).

## Fluxo do modo Agente (como está)

intenção → prompt do sistema (instruções do projeto + personalidade + memória + catálogo de ferramentas) → IA responde ou pede ferramenta `{PESQUISAR:termo}` / `{ABRIR:url}` (até 4 rodadas) → ferramenta executada no servidor (busca Bing→DuckDuckGo; abertura com guarda SSRF) → resposta final com dados reais.

## Próximos passos técnicos (ordem sugerida)

1. Frontend lê `/api/capabilities` no boot e só mostra ferramentas/painéis suportados.
2. Painel de monitor de IA dentro do app (consumir /api/logs/ia).
3. Testes automatizados de contrato (ver MIGRACAO_BACKEND.md).
4. OAuth Google (guia em docs/ENV.md) quando o dono criar os Client IDs.
