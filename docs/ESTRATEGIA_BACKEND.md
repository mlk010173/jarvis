# Estratégia de backend e motor de execução (v1.3.6, 22/10/2026)

## Auditoria: o que existe e onde

**Backend Base44 (ativo, canônico do site)**
- `jarvisApi` (core, este arquivo): contas, sessões, chat com fila de IAs e fallback, ferramentas web com guarda anti-SSRF, log de execução v1.3.5, MCP oficial JSON-RPC, SDK v1, monitor de IA (latência/tokens/erros por chamada), rotas de dados ao vivo (clima, câmbio, cripto, wiki, feriados, GitHub), memória de conta e — a partir da v1.3.6 — catálogo central de ferramentas e motor de tarefas autônomas.
- `jarvisApi2` (painéis): casa/HA, financeiro, leads, logs, monitor, negócio, fontes, componentes, marketing, download, briefing.

**Backend Node do PC (`server/server.js`)**
- Recursos que a Base44 não oferece: Composio MCP (`/api/composio/mcp`), callbacks OAuth (Google, GitHub, Discord), endpoint OpenAI-compatível (`/chat/completions`), ponte com o app do PC (`/bridge`, módulos do computador), voz proxy, `/api/states` (Home Assistant local).
- Conexão com o site: somente via ponte, quando o app do PC está aberto e conectado (`/api/ponte/comando`).

## Decisão de unificação (documentada, não é migração)

A Base44 permanece o **cérebro canônico na nuvem**. O Node do PC vira **extensão de capacidades locais**, não um segundo cérebro. Motivação:
1. A Base44 não permite `eval` nem imports remotos e roda em Deno isolado: navegador automatizado e Ollama (localhost) não podem rodar nela; só o PC pode oferecer isso.
2. Migração de backend exigiria reimplantar sessões, fila de IAs, sanitização e painéis já testados — sem ganho funcional.
3. O catálogo central de ferramentas tem campo `onde` ('nuvem' | 'pc'): ferramentas da nuvem rodam na própria função; ferramentas do PC serão delegadas pela ponte quando o app estiver conectado (hoje nenhuma ferramenta do catálogo exige o PC — quando houver, a delegação usa a mesma interface de etapa).

## Integrações avaliadas com honestidade

- **MCP oficial**: já ativo em `/mcp` (JSON-RPC 2.0, 9 ferramentas). O motor de tarefas usa o MESMO catálogo central; registrar ferramentas de tarefa no `tools/list` do MCP é um próximo passo natural (não implementado nesta versão).
- **Composio**: existe no Node do PC (`/api/composio/mcp`) e a carteira nm424294 tem crédito inicial, mas depende de chave/app ativos do Pedro — não integrada ao motor. Nada foi marcado como funcional sem teste.
- **Navegador automatizado**: nenhum dos dois backends tem navegador headless. No PC é viável (a decidir: Playwright/Puppeteer); na Base44 não. Ferramenta `abrir` cobre leitura de páginas públicas com guarda anti-SSRF.
- **Ollama**: só no PC (localhost). Quando o app do PC implementar a ponte `/ollama`, entra no catálogo como ferramenta/IA `onde: 'pc'`.
- **Monitor de IA**: todas as chamadas do motor (planejamento e verificação) passam por `chamarIA` e já caem no monitor (`/api/logs/ia`): latência, tokens, custo estimado e erros por modelo.

## Motor de tarefas (v1.3.6)

Ciclo: objetivo → plano (IA conectada gera JSON de etapas com dependências; ou plano manual) → execução com limites reais (limite_ms e tentativas por ferramenta, 3 etapas e ~14s por chamada de `rodar`) → verificação por evidências reais (IA avalia o resultado com as evidências na mão; sem IA, verificação determinística honesta) → aprovação humana obrigatória para ferramentas sensíveis (`memoria_apagar`) → cancelamento com resultados parciais preservados.

- Persistência: `JarvisDado` chaves `tarefa:{id}` e índice `tarefas` (últimas 30 por conta). Isolamento por e-mail da sessão (conta alheia recebe 404).
- Cada etapa vira um passo no MESMO formato do log de execução v1.3.5 — o painel do chat renderiza tarefas e respostas normais com o mesmo componente.
- Segredos: sanitização dupla (gravação e leitura, `limpaSegredo` + `sanitizaExec`); nenhuma chave de IA vai ao frontend.
- Rota de cancelamento: `/cancelar` marca etapas pendentes como canceladas e preserva as concluídas; o cliente para de chamar `/rodar`. Abort em execução dentro da mesma chamada HTTP continua sendo limitação documentada.

## Arquitetura final (deploy de 22/10/2026)

O motor roda em função dedicada: `jarvisTarefas` (superagent-6e379590.base44.app/functions/jarvisTarefas), com o MESMO envelope e banco do core. Nada de duplicação: cada ferramenta (clima, câmbio, cripto, wiki, feriados, GitHub, novidades, pesquisa, abrir) e cada chamada de IA (planejamento e verificação) é executada pelo CORE por chamada interna autenticada — então a fila de IAs com fallback e o monitor de IA continuam no core, e nenhuma chave vai ao frontend.

- Site → `api-bridge.js` roteia `/api/tarefas*` e `/api/memoria` para a função do motor; todo o resto segue para o core.
- Limites reais do motor: `limite_ms` e tentativas por ferramenta, 3 etapas e ~14 s por chamada de `rodar` (o cliente do chat puxa o progresso até o fim), histórico das últimas 30 tarefas por conta.
- Aprovação humana: ferramenta `memoria_apagar` trava a tarefa em `aguardando_aprovacao` até `/aprovar`.
- Verificação: com IA conectada, a IA julga o objetivo contra as evidências reais (SIM/NÃO); sem IA, verificação determinística honesta.
- Plataforma: 70 entity_list/min por chamador — o motor é econômico por chamada, mas suítes de teste devem fazer pacing (o script oficial tem retry automático).

## Testes executados ao vivo (tests/backend/tarefas.test.sh, 22/10/2026): 19 verificações, todas no verde

Sucesso com evidências reais (clima+câmbio com dependência), timeout por etapa (limite_ms=1, 2 tentativas), falha honesta com guarda anti-SSRF (http interno bloqueado), ferramenta fora do catálogo rejeitada, cancelamento com resultado parcial preservado, ação sensível travada até aprovação humana, memória salvar/consultar/apagar, planejamento sem IA falha honesto, fallback entre provedores no planejador SEM vazar chave (sanitização confirmada), isolamento entre contas (404 e lista vazia para intruso), tarefa deletável e histórico persistido.

Pendência documentada: o painel Novidades do site ainda mostra 1.3.5 — o changelog 1.3.6 está pronto no repo (base44/jarvisApiA.ts) e entra no ar no próximo deploy do core (arquivo grande; sem risco para o motor, que já está no ar).
