# Módulos do ORION — mapa profundo (engenharia reversa)

> Análise de engenharia reversa do código público de assistanceorion.cloud (19/10/2026).
> Fonte: JS dos painéis (pn-leads.js 73KB, pn-componentes.js, web.js, ponte.js) + API viva.

## 1. Leads & Clientes (pn-leads.js) — o motor de negócio

Sistema completo de captação e entrega:

1. **Buscar**: Google Maps ou OpenStreetMap, por ramo + cidade, filtrando *só quem não tem site*; importar pelo link do Maps; mapa com pins numerados (Leaflet, raio visível)
2. **Seus leads**: funil em lista ou quadro (arrastar entre etapas), próximo contato, WhatsApp (wa.me), exportar/importar CSV
3. **IA de abordagem**: gera a primeira mensagem para cada lead
4. **Seus sites** — pipeline de entrega com 5 passos:
   - Checklist de progresso por site
   - *Demonstração grátis na Vercel* (endereço .vercel.app com HTTPS)
   - *Domínio próprio*: orienta registro.br (~R$40/ano), liga o domínio na publicação e mostra o DNS a configurar
   - *Revisão de segurança do código* antes de publicar (`POST /sites/:id/revisar`)
   - *Publicação oficial*: Vercel (com token do usuário) ou "no ar de vez pelo ORION" (hospedado em assistanceorion.cloud/s/…)
5. **Seus clientes**: quem fechou — venda, mensalidade e o site de cada um

Plano trava funcionalidades ("trava do plano") conforme Free/Premium.

## 2. Componentes & UI (pn-componentes.js)

- Biblioteca visual: cada peça roda isolada em **Shadow DOM** (CSS não vaza entre peça e app)
- Copiar HTML+CSS liberado por plano; peças de outros planos aparecem com cadeado
- Aba **React**: componentes React + Tailwind (licença MIT) com prévia em vídeo, guardados na nuvem do ORION
- Aba **Sites prontos**: sites completos de exemplo (negócios fictícios) pra usar como base
- API pública de tokens: `POST /api/public/v1/card-tokens` (componentes em sites externos) e `GET /api/ui/vitrine` (temas CSS servidos pela API)

## 3. Chat / Agentes (web.js)

- **Schema do projeto**: `{nome, assistente, descricao, instrucoes}`
- **Prompt padrão do ORION** (verbatim): "Você é o ORION, um assistente pessoal de IA em português do Brasil. Responda de forma clara, útil e direta, como numa conversa por voz: frases curtas, sem enrolação. Use listas quando ajudarem. Se faltar informação importante, pergunte. Não invente fatos."
- Conversa fica no navegador: últimas **60 mensagens** em localStorage
- Teste de agente: `POST /api/projetos/:id/testar {mensagens, personalidade}`
- **6 personalidades**: sério, equilibrado, mordomo, divertido, zueiro, motivador

## 4. Ponte site ↔ app (ponte.js)

- **Pela conta**: app escuta a nuvem; site manda `POST /api/ponte/comando {pc, metodo, rota, corpo}` — não depende de permissão de rede local
- **Direto**: `127.0.0.1:3950/ponte/v1/ola` (+portas 3951-54, 3900), código de 6 dígitos que aparece NO PC, token de 12h preso à origem
- App só executa **lista fechada de ações**, com confirmações
- 23 sub-rotas de painel (financeiro, casa, monitor, fontes, leads, logs)

## 5. Infraestrutura (DNS/TLS)

- IP único: 2.24.66.31 (RIPE) · servidor **Caddy** · TLS **Let's Encrypt** (SAN único, sem wildcard)
- Sem MX (contato via Gmail: assistanceorion.cloud@gmail.com) · SPF restrito ao próprio IP
- NS de DNS parking (atlas/hyperion.dns-parking.com)
- Sem subdomínios de API/CDN — tudo no domínio único
- Headers: CSP rígida, HSTS 1 ano, X-Frame-Options DENY, noindex no app

## 6. Crescimento

- 17 versões em 4 dias (1.6.0 → 1.9.8) — ver CHANGELOG-ORION.md
- Sem snapshots no Wayback Machine (domínio novo)
