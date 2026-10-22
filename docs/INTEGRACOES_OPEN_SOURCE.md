# Integrações open-source — decisões verificadas (21/10/2026)

Registro de cada tecnologia avaliada para o JARVIS, com o que foi verificado na data e a decisão. Um repositório público não significa licença permissiva nem serviço gratuito — aqui ficam as distinções.

## Adotadas

| Tecnologia | Licença (verificada) | Uso no JARVIS | Decisão |
|---|---|---|---|
| Model Context Protocol (spec/padrão) | spec aberta (modelcontextprotocol.io) | Contrato JSON-RPC 2.0 do servidor MCP em `/mcp` — implementado na mão no backend, sem SDK pesado | **Adotado** (v1.3.3). Autenticação: Bearer de projeto ou token de conta; ferramentas com guarda SSRF |
| SDK Base44 (@base44/sdk) | componente da plataforma | Acesso às entidades e auth nas funções | **Adotado** (já era o caso) |

## Implementadas em modo "suporte + estado honesto" (aguardam chave/config do dono)

| Tecnologia | Licença | Uso previsto | Estado |
|---|---|---|---|
| Composio (hub) | SDK open (MIT); **serviço hospedado com custos/limites** | 250+ apps externos via proxy `/api/composio/mcp` | Rota existe e devolve 501 claro até existir `COMPOSIO_API_KEY`. Só anunciar como funcional quando configurado |
| Ollama | MIT (pesos dos modelos têm licenças próprias) | IA local no app do PC | No catálogo com aviso honesto: em backend de nuvem o 127.0.0.1 é o servidor, não o PC do usuário |

## Avaliadas e NÃO adotadas por enquanto (com motivo)

| Tecnologia | Licença (verificada 21/10/2026) | Motivo da decisão |
|---|---|---|
| LangGraph | MIT | Reescrever a orquestração do agente em framework novo não compensa: o loop atual (4 rodadas, fila de IAs, ferramentas registradas) é pequeno, observável e suficiente. Reavaliar se surgirem fluxos multi-etapa complexos |
| Agno | Apache-2.0 | Runtime centrado em Python = serviço extra para manter. Não há lacuna que ele cubra hoje |
| Microsoft Agent Framework | MIT | Mesma lógica: exigiria serviço separado (.NET/Python) sem ganho mensurável |
| AutoGen | MIT (em modo manutenção; o próprio repo recomenda o Agent Framework para projetos novos) | Não usar como base nova |
| Playwright | Apache-2.0 | Útil para testes e2e futuros; o projeto ainda não tem suíte de testes automatizada para ele rodar. Fica como próximo passo |
| Browser Use | MIT | Exigiria serviço Python; o modo Agente resolve hoje com PESQUISAR/ABRIR + guarda SSRF |
| LiteLLM | MIT | O catálogo BYOK com fila de fallback já resolve o roteamento de provedores sem gateway extra |
| Langfuse | MIT (código fora de `ee/`, que tem licença própria) | O monitor de IA nativo (v1.3.3) cobre custo/tokens/latência/erros sem serviço externo. Reavaliar se precisar de traces multi-etapa |
| OpenTelemetry | padrão aberto | Idem Langfuse |
| Motion (ex-Framer Motion) | MIT | Exigiria migração para React/Vite. O projeto é vanilla sem build; animações seguem CSS/WAAPI |
| Trigger.dev | Apache-2.0 | Sem necessidade de filas duráveis hoje; automações existentes são workflows do Base44 |
| Dify | Licença própria (baseada em Apache-2.0 com condições adicionais) | Plataforma inteira para algo que o backend já faz; revisar compatibilidade antes de qualquer uso |
| n8n | Fair-code (Sustainable Use) — **não é open-source permissivo** | Não incorporar nem anunciar como open-source |

## Critérios para incluir qualquer coisa nova

1. Resolve uma lacuna real (não "porque é famoso").
2. Licença do pacote/subdiretório exato verificada na data, com dependências.
3. Custo de infraestrutura e modelo de hospedagem explícitos (self-host vs API paga).
4. Sem segredo no repo; variáveis documentadas em docs/ENV.md.
5. Como desativar/remover documentado aqui.
