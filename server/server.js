/**
 * JARVIS — backend próprio, zero dependências (Node 18+).
 * Serve o frontend estático E a API /api/* com o mesmo contrato do bridge
 * (api-bridge.js). Dados em JSON local (server/data/db.json).
 *
 * Rodar:  node server/server.js        → http://localhost:3000
 * Deploy: veja render.yaml / Dockerfile no repo.
 */
'use strict';
const http = require('http');
const https = require('https');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const PORT = process.env.PORT || 3000;
const ROOT = path.resolve(__dirname, '..');
const DATA = path.join(__dirname, 'data');
const DB = path.join(DATA, 'db.json');
const SESSOES_DIAS = 30;
/* Origem do frontend (para onde o OAuth volta). Configure JARVIS_URL em produção. */
const JARVIS_URL = (process.env.JARVIS_URL || 'https://mlk010173.github.io/jarvis').replace(/\/+$/, '');
/* Credenciais OAuth: NUNCA no código. Configure via variáveis de ambiente. */
const OAUTH = {
  google: { id: process.env.GOOGLE_CLIENT_ID, segredo: process.env.GOOGLE_CLIENT_SECRET, rotulo: 'Google' },
  discord: { id: process.env.DISCORD_CLIENT_ID, segredo: process.env.DISCORD_CLIENT_SECRET, rotulo: 'Discord' },
  github: { id: process.env.GITHUB_CLIENT_ID, segredo: process.env.GITHUB_CLIENT_SECRET, rotulo: 'GitHub' },
};

/* ---------- armazenamento ---------- */
let db = null;
function carregar() {
  try { db = JSON.parse(fs.readFileSync(DB, 'utf8')); }
  catch { db = { contas: [], projetos: [], sessoes: {}, coletiva: { eventos: 0, lotes: 0 } }; }
  if (!db.contas) db.contas = [];
  if (!db.projetos) db.projetos = [];
  if (!db.sessoes) db.sessoes = {};
  if (!db.coletiva) db.coletiva = { eventos: 0, lotes: 0 };
  if (!db.oauthEstados) db.oauthEstados = {};
  if (!db.oauthCodigos) db.oauthCodigos = {};
}
function salvar() { fs.mkdirSync(DATA, { recursive: true }); fs.writeFileSync(DB, JSON.stringify(db, null, 1)); }
carregar();

/* ---------- helpers ---------- */
const agora = () => Date.now();
const id = (p) => p + '_' + crypto.randomBytes(9).toString('hex');
function senhaHash(senha, sal) {
  return crypto.scryptSync(String(senha), sal, 32).toString('hex');
}
function novaSessao(email) {
  const tok = crypto.randomBytes(24).toString('hex');
  db.sessoes[tok] = { email, exp: agora() + SESSOES_DIAS * 864e5 };
  salvar();
  return tok;
}
function contaDoToken(token) {
  if (!token) return null;
  const s = db.sessoes[token];
  if (!s || s.exp < agora()) return null;
  return db.contas.find(c => c.email === s.email) || null;
}
function httpsJSON(url, opcoes) {
  return new Promise((ok, falha) => {
    const u = new URL(url);
    const r = https.request({ hostname: u.hostname, path: u.pathname + u.search, method: (opcoes && opcoes.metodo) || 'GET', headers: (opcoes && opcoes.headers) || {}, timeout: 10000 }, (resp) => {
      let b = '';
      resp.on('data', (c) => { b += c; });
      resp.on('end', () => { try { ok({ status: resp.statusCode, json: b ? JSON.parse(b) : null }); } catch { ok({ status: resp.statusCode, json: null }); } });
    });
    r.on('timeout', () => { r.destroy(); falha(new Error('timeout')); });
    r.on('error', falha);
    if (opcoes && opcoes.corpo) r.write(opcoes.corpo);
    r.end();
  });
}
/* volta: só caminhos internos do próprio site (evita open redirect) */
function voltaSegura(v) { return v && /^\/(?!\/)[\w\-\/.]*(\?[\w\-=&.%]*)?$/.test(v) ? v : ''; }

const erro = (res, codigo, msg) => { res.writeHead(codigo, CT.json); res.end(JSON.stringify({ erro: msg })); };

const CT = { json: { 'Content-Type': 'application/json; charset=utf-8', 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': 'Content-Type, Authorization', 'Access-Control-Allow-Credentials': 'true' } };

function lerBody(req) {
  return new Promise((ok) => {
    let b = '';
    req.on('data', (c) => { b += c; if (b.length > 1e6) req.destroy(); });
    req.on('end', () => { try { ok(b ? JSON.parse(b) : {}); } catch { ok({}); } });
  });
}
function tokenDe(req, corpo) {
  if (corpo && corpo.token) return corpo.token;
  const h = req.headers.authorization || '';
  if (h.startsWith('Bearer ')) return h.slice(7);
  const ck = (req.headers.cookie || '').match(/jarvis_sessao=([a-f0-9]+)/);
  return ck ? ck[1] : null;
}

/* ---------- rotas de API ---------- */
const PESSOAS = { modos: [
  { id: 'serio', nome: 'Sério', resumo: 'Direto e profissional, sem brincadeiras.', exemplo: 'Entendi. Segue o plano.' },
  { id: 'amigavel', nome: 'Amigável', resumo: 'Leve e próximo, com bom humor na medida.', exemplo: 'Boa! Vamos nessa?' },
  { id: 'professor', nome: 'Professor', resumo: 'Explica passo a passo, com exemplos.', exemplo: 'Vamos por partes.' },
  { id: 'tecnico', nome: 'Técnico', resumo: 'Preciso, denso, sem rodeios.', exemplo: 'Registro: valores conferidos.' },
  { id: 'agente', nome: 'Agente', resumo: 'Pesquisa na internet, abre páginas e usa dados ao vivo quando precisa.', exemplo: 'Vou pesquisar isso agora.' },
] };
const INFO = { marca: 'JARVIS', limites: { gratis: 100, pro: 5000 }, provedores: [] };
const NOVIDADES = { gerado: new Date().toISOString(), atual: '1.3.0', versoes: [
  { versao: '1.3.0', data: '21/10/2026', resumo: 'IA real no chat com 7 provedores, modo Agente com internet, voz ElevenLabs, MCP e SDK.',
    secoes: [
      { titulo: 'Novo', itens: [
        'IA de verdade no chat: conecte Google Gemini (tem plano grátis), OpenAI, Claude, Groq, DeepSeek, OpenRouter ou Mistral em Minhas IAs',
        'Modo Agente: a IA pesquisa na internet (DuckDuckGo) e abre páginas quando precisa — comandos /pesquisar e /abrir',
        'Voz ElevenLabs opcional: /voz on ativa a voz de estúdio com sua chave',
        'MCP: catálogo de ferramentas em /api/mcp/ferramentas e execução em /api/mcp/executar',
        'SDK do JARVIS para integrar o chat em qualquer site (jarvis-sdk.js)',
        'Login com Google já disponível no backend: basta configurar GOOGLE_CLIENT_ID e GOOGLE_CLIENT_SECRET no servidor',
      ] },
      { titulo: 'Melhorias', itens: [
        'Fila de IAs: se uma falha, a próxima assume automaticamente',
        'Memória da conta entra na conversa com a IA',
      ] },
    ] },
  { versao: '1.2.0', data: '21/10/2026', resumo: 'Painéis completos com dados reais e plano Premium liberado.',
    secoes: [
      { titulo: 'Novo', itens: [
        'Plano Premium liberado para todas as contas',
        'Painel Casa: integração real com Home Assistant',
        'Painel Financeiro: contas, lançamentos, faturas, investimentos e importação de extrato',
        'Painel Leads: CRM com funil de clientes',
        'Painel Logs, Monitor (bem-estar), Negócio, Fontes e Briefing com notícias reais do Brasil',
        'Biblioteca de componentes HTML+CSS liberada',
      ] },
      { titulo: 'Melhorias', itens: [
        'Comandos de voz falam a resposta de volta',
        'Modo de conversa contínua por voz',
      ] },
    ] },
  { versao: '1.1.0', data: '19/10/2026', resumo: 'Comandos reais no chat e fim da simulação.',
    secoes: [ { titulo: 'Novo', itens: [
      'Comandos /clima /moeda /cripto /wiki /feriados /github /ajuda com dados ao vivo',
      'Cotações com plano B automático (AwesomeAPI, BCE/Frankfurter, CoinGecko, Coinbase)',
      'Wikipédia, feriados do Brasil e estatísticas do GitHub no chat',
    ] } ] },
  { versao: '1.0.0', data: '19/10/2026', resumo: 'Rebrand ORION → JARVIS, backend próprio e conta real.',
    secoes: [ { titulo: 'Novo', itens: [
      'Login e cadastro reais com senha protegida (PBKDF2, salt único)',
      'Sessões de 30 dias, projetos por conta e memória persistente',
      'OAuth 2.0 real no backend (Google, Discord, GitHub)',
      'Verificação em 2 etapas por e-mail em dispositivo novo',
      'Deploy próprio na Render servindo site e API',
    ] } ] },
  { versao: '0.9.0', data: '19/10/2026', resumo: 'Nasceu como espelho do ORION Web, auditado e publicado no GitHub.',
    secoes: [
      { titulo: 'Novo', itens: [ 'Espelho completo: 80 arquivos e 14 páginas no GitHub Pages', 'Deploy automático com GitHub Actions' ] },
      { titulo: 'Segurança', itens: [ 'Auditoria sem chaves expostas, XSS testado e IDOR bloqueado' ] },
    ] },
] };
const PLANOS = { planos: [ { id: 'jarvis', nome: 'JARVIS', publico: 'Versão web aberta do projeto — tudo liberado', preco_centavos: 0, precos: null, periodo: 'aberto' } ] };
const VITRINE = { base_css: ':root{--jv-azul:#2E9BFF;--jv-ciano:#00D2FF;--jv-fundo:#04101b;--jv-caixa:#050c16;--jv-linha:rgba(46,155,255,.25)}' };

const BASE_UI_CSS = `.oc-tema{--c1:#2E9BFF;--c2:#7c5cff;--fundo:#0d1220;--carta:#151c30;--texto:#e8ecf6;--borda:rgba(46,155,255,.16);--ok:#2ecc8f;--aviso:#ffb454;--ruim:#ff5c7a;--raio:14px;font-family:system-ui,-apple-system,'Segoe UI',Roboto,sans-serif;color:var(--texto);background:var(--fundo);border-radius:var(--raio);padding:18px;box-sizing:border-box}
.oc-tema *{box-sizing:border-box}
.oc-tema a{color:var(--c1);text-decoration:none}`;
const COMPONENTES_UI = [
  { slug: 'btn-primario', nome: 'Botão principal', categoria: 'Botões', nivel: 'free', descricao: 'Botão de destaque com brilho no hover, pronto para ação principal.', html: `<button class="jb jb-pri">Começar agora</button>\n<button class="jb jb-sec">Ver planos</button>`, css: `.jb{border:0;border-radius:10px;padding:11px 20px;font-size:15px;font-weight:600;cursor:pointer;transition:transform .15s,box-shadow .15s}
.jb-pri{background:linear-gradient(135deg,var(--c1),var(--c2));color:#fff}
.jb-pri:hover{transform:translateY(-1px);box-shadow:0 8px 24px rgba(46,155,255,.35)}
.jb-sec{background:transparent;color:var(--c1);border:1px solid var(--borda)}` },
  { slug: 'btn-estado', nome: 'Botões de estado', categoria: 'Botões', nivel: 'premium', descricao: 'Confirmação, aviso e perigo em um grupo de botões.', html: `<div class="jb-grupo">\n  <button class="jb jb-ok">Salvar</button>\n  <button class="jb jb-aviso">Pausar</button>\n  <button class="jb jb-ruim">Excluir</button>\n</div>`, css: `.jb{border:0;border-radius:10px;padding:11px 20px;font-size:15px;font-weight:600;cursor:pointer;color:#fff}
.jb-grupo{display:flex;gap:10px;flex-wrap:wrap}
.jb-ok{background:var(--ok)} .jb-aviso{background:var(--aviso)} .jb-ruim{background:var(--ruim)}` },
  { slug: 'card-info', nome: 'Cartão de informação', categoria: 'Cartões', nivel: 'free', descricao: 'Cartão com ícone, título e texto para painéis e listas.', html: `<article class="jc">\n  <h4>Pedidos hoje</h4>\n  <b>128</b>\n  <p>12% acima da mesma hora ontem</p>\n</article>`, css: `.jc{background:var(--carta);border:1px solid var(--borda);border-radius:var(--raio);padding:16px 18px;max-width:280px}
.jc h4{margin:0 0 8px;font-size:13px;opacity:.75;font-weight:500}
.jc b{font-size:32px}
.jc p{margin:8px 0 0;font-size:13px;opacity:.7}` },
  { slug: 'card-perfil', nome: 'Cartão de perfil', categoria: 'Cartões', nivel: 'basic', descricao: 'Avatar com nome e ação de seguir.', html: `<div class="jpf">\n  <span class="jpf-av">PL</span>\n  <div><b>Pedro Lucio</b><small>Dono do projeto</small></div>\n  <button class="jb jb-pri jpf-btn">Seguir</button>\n</div>`, css: `.jpf{display:flex;align-items:center;gap:12px;background:var(--carta);border:1px solid var(--borda);border-radius:var(--raio);padding:14px 16px;max-width:340px}
.jpf-av{width:44px;height:44px;border-radius:50%;background:linear-gradient(135deg,var(--c1),var(--c2));display:grid;place-items:center;font-weight:700;color:#fff}
.jpf b{display:block} .jpf small{opacity:.65}
.jpf-btn{margin-left:auto;border:0;border-radius:10px;padding:9px 16px;background:var(--c1);color:#fff;font-weight:600;cursor:pointer}
.jb-pri{background:linear-gradient(135deg,var(--c1),var(--c2));border:0;border-radius:10px;padding:11px 20px;font-size:15px;font-weight:600;cursor:pointer;color:#fff}` },
  { slug: 'form-campo', nome: 'Campo de formulário', categoria: 'Formulários', nivel: 'free', descricao: 'Entrada de texto com rótulo e foco iluminado.', html: `<label class="jf">\n  <span>Seu e-mail</span>\n  <input type="email" placeholder="voce@exemplo.com">\n</label>`, css: `.jf{display:flex;flex-direction:column;gap:6px;max-width:300px}
.jf span{font-size:13px;opacity:.75}
.jf input{background:var(--fundo);border:1px solid var(--borda);border-radius:10px;padding:11px 14px;color:var(--texto);font-size:15px;outline:none}
.jf input:focus{border-color:var(--c1);box-shadow:0 0 0 3px rgba(46,155,255,.18)}` },
  { slug: 'form-busca', nome: 'Barra de busca', categoria: 'Formulários', nivel: 'basic', descricao: 'Busca com lupa integrada e teclado num celular.', html: `<div class="jb2">\n  <input type="search" inputmode="search" placeholder="Buscar cliente…">\n</div>`, css: `.jb2{display:flex;max-width:320px}
.jb2 input{flex:1;background:var(--carta);border:1px solid var(--borda);border-radius:999px;padding:11px 18px;color:var(--texto);font-size:15px;outline:none}
.jb2 input:focus{border-color:var(--c1)}` },
  { slug: 'alerta', nome: 'Alertas', categoria: 'Alertas', nivel: 'free', descricao: 'Aviso, erro e sucesso com cores suaves e borda lateral.', html: `<p class="ja ja-aviso">Seu plano vence em 3 dias.</p>\n<p class="ja ja-erro">Não foi possível salvar. Tente de novo.</p>\n<p class="ja ja-ok">Conta criada com sucesso!</p>`, css: `.ja{border-radius:10px;padding:11px 14px;font-size:14px;border-left:3px solid;margin:0 0 8px;max-width:360px}
.ja-aviso{background:rgba(255,180,84,.1);border-color:var(--aviso)}
.ja-erro{background:rgba(255,92,122,.1);border-color:var(--ruim)}
.ja-ok{background:rgba(46,204,143,.1);border-color:var(--ok)}` },
  { slug: 'tabela', nome: 'Tabela limpa', categoria: 'Tabelas', nivel: 'basic', descricao: 'Tabela zebrada com cabeçalho discreto.', html: `<table class="jt">\n  <tr><th>Cliente</th><th>Valor</th><th>Estado</th></tr>\n  <tr><td>Padaria Sol</td><td>R$ 320,00</td><td>Pago</td></tr>\n  <tr><td>Loja Mira</td><td>R$ 150,00</td><td>Aberto</td></tr>\n</table>`, css: `.jt{border-collapse:collapse;font-size:14px;min-width:300px}
.jt th{text-align:left;opacity:.6;font-weight:500;padding:8px 14px;border-bottom:1px solid var(--borda)}
.jt td{padding:10px 14px;border-bottom:1px solid var(--borda)}
.jt tr:nth-child(even) td{background:rgba(46,155,255,.05)}` },
  { slug: 'nav-abas', nome: 'Abas de navegação', categoria: 'Navegação', nivel: 'premium', descricao: 'Pílulas de abas com a ativa marcada.', html: `<nav class="jn">\n  <a class="on" href="#">Visão</a>\n  <a href="#">Vendas</a>\n  <a href="#">Clientes</a>\n</nav>`, css: `.jn{display:flex;gap:8px;background:var(--carta);padding:6px;border-radius:999px;width:max-content}
.jn a{padding:8px 16px;border-radius:999px;font-size:14px;color:var(--texto);opacity:.65}
.jn a.on{background:linear-gradient(135deg,var(--c1),var(--c2));opacity:1;color:#fff}` },
  { slug: 'hero', nome: 'Seção de abertura (hero)', categoria: 'Seções', nivel: 'premium', descricao: 'Título, subtítulo e botão de ação centralizados.', html: `<section class="jhero">\n  <h1>Seu negócio no piloto automático</h1>\n  <p>Painel, clientes e cobrança em um só lugar.</p>\n  <button class="jb jb-pri">Começar grátis</button>\n</section>`, css: `.jhero{text-align:center;padding:40px 20px;background:radial-gradient(70% 90% at 50% 0,rgba(46,155,255,.16),transparent),var(--fundo);border-radius:var(--raio);max-width:560px}
.jhero h1{margin:0 0 10px;font-size:30px}
.jhero p{margin:0 0 22px;opacity:.7}
.jb-pri{border:0;border-radius:10px;padding:12px 24px;font-size:16px;font-weight:600;cursor:pointer;color:#fff;background:linear-gradient(135deg,var(--c1),var(--c2))}` },
  { slug: 'precos', nome: 'Tabela de preços', categoria: 'Seções', nivel: 'premium', descricao: 'Dois planos com o destaque no recomendado.', html: `<div class="jpre">\n  <div class="jpre-c"><b>Free</b><h3>R$ 0</h3><p>Para começar</p></div>\n  <div class="jpre-c jpre-on"><b>Pro</b><h3>R$ 49<small>/mês</small></h3><p>Tudo liberado</p><button class="jb jb-pri">Assinar</button></div>\n</div>`, css: `.jpre{display:flex;gap:14px;flex-wrap:wrap}
.jpre-c{background:var(--carta);border:1px solid var(--borda);border-radius:var(--raio);padding:20px;width:180px}
.jpre-on{border-color:var(--c1);box-shadow:0 10px 30px rgba(46,155,255,.25)}
.jpre-c h3{margin:8px 0;font-size:28px} .jpre-c h3 small{font-size:13px;opacity:.6}
.jpre-c p{margin:0 0 14px;opacity:.65;font-size:13px}
.jb-pri{border:0;border-radius:10px;padding:10px 18px;font-weight:600;cursor:pointer;color:#fff;background:linear-gradient(135deg,var(--c1),var(--c2))}` },
  { slug: 'rodape', nome: 'Rodapé', categoria: 'Rodapé', nivel: 'free', descricao: 'Rodapé com marca e links de apoio.', html: `<footer class="jro">\n  <b>JARVIS</b>\n  <nav><a href="#">Planos</a> <a href="#">Ajuda</a> <a href="#">Termos</a></nav>\n  <small>© 2026</small>\n</footer>`, css: `.jro{display:flex;align-items:center;gap:16px;flex-wrap:wrap;border-top:1px solid var(--borda);padding-top:16px;max-width:560px}
.jro nav{display:flex;gap:14px}
.jro small{margin-left:auto;opacity:.5}` },
];



/* ---------- plano: tudo liberado ---------- */
const PLANO = { plano: 'premium', nome: 'Premium', pago: true, continua: true, expira_em: null, limites: { ias_max: 10, modulos: 50, projetos: 100, memoria: 1000000 } };

/* ---------- catálogo de provedores de IA (BYOK: a conta traz a própria chave) ---------- */
const CATALOGO_IAS = [
  { id: 'gemini', nome: 'Google Gemini', tipo: 'gemini', site: 'https://aistudio.google.com/apikey', gratis: true, modelo_padrao: 'gemini-2.0-flash', recomendacao: { posicao: 1, motivo: 'Plano gratuito generoso do Google e respostas rápidas — comece por aqui.' } },
  { id: 'openai', nome: 'OpenAI', tipo: 'openai', site: 'https://platform.openai.com/api-keys', gratis: false, modelo_padrao: 'gpt-4o-mini', base: 'https://api.openai.com/v1', recomendacao: { posicao: 2, motivo: 'A mais usada do mercado, ótima qualidade no modelo mini.' } },
  { id: 'anthropic', nome: 'Anthropic Claude', tipo: 'anthropic', site: 'https://console.anthropic.com/settings/keys', gratis: false, modelo_padrao: 'claude-3-5-haiku-latest', recomendacao: { posicao: 3, motivo: 'Excelente escrita e raciocínio.' } },
  { id: 'groq', nome: 'Groq', tipo: 'openai', site: 'https://console.groq.com/keys', gratis: true, base: 'https://api.groq.com/openai/v1', modelo_padrao: 'llama-3.3-70b-versatile', recomendacao: { posicao: 4, motivo: 'Grátis e absurdamente rápido (Llama).' } },
  { id: 'openrouter', nome: 'OpenRouter', tipo: 'openai', site: 'https://openrouter.ai/keys', gratis: true, base: 'https://openrouter.ai/api/v1', modelo_padrao: 'meta-llama/llama-3.3-70b-instruct:free', recomendacao: { posicao: 5, motivo: 'Uma chave, dezenas de modelos (inclusive gratuitos).' } },
  { id: 'deepseek', nome: 'DeepSeek', tipo: 'openai', site: 'https://platform.deepseek.com/api_keys', gratis: false, base: 'https://api.deepseek.com/v1', modelo_padrao: 'deepseek-chat', recomendacao: { posicao: 6, motivo: 'Custo baixo e bom raciocínio.' } },
  { id: 'mistral', nome: 'Mistral', tipo: 'openai', site: 'https://console.mistral.ai/api-keys', gratis: false, base: 'https://api.mistral.ai/v1', modelo_padrao: 'mistral-small-latest', recomendacao: { posicao: 7, motivo: 'Modelos europeus, preço justo.' } },
];
const iaCatalogo = (idIa) => CATALOGO_IAS.find((x) => x.id === idIa);

/* ---------- chamada real às IAs (gemini / openai-compatível / anthropic) ---------- */
async function chamarIA(ia, mensagens) {
  const cat = iaCatalogo(ia.id) || { tipo: 'openai', base: ia.base_url || 'https://api.openai.com/v1', modelo_padrao: 'gpt-4o-mini' };
  const modelo = ia.modelo || cat.modelo_padrao;
  const sys = mensagens.filter((m) => m.role === 'system').map((m) => m.content).join('\n');
  const conversa = mensagens.filter((m) => m.role !== 'system');
  if (cat.tipo === 'gemini') {
    const r = await fetch('https://generativelanguage.googleapis.com/v1beta/models/' + modelo + ':generateContent?key=' + encodeURIComponent(ia.chave), {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ systemInstruction: sys ? { parts: [{ text: sys }] } : undefined, contents: conversa.map((m) => ({ role: m.role === 'assistant' ? 'model' : 'user', parts: [{ text: m.content }] })) }),
    });
    const j = await r.json().catch(() => ({}));
    if (!r.ok) throw new Error((j.error && j.error.message) || 'Gemini recusou (status ' + r.status + ').');
    const txt = (((j.candidates || [])[0] || {}).content || {}).parts || [];
    const resposta = txt.map((p) => p.text || '').join('').trim();
    if (!resposta) throw new Error('Gemini não devolveu texto.');
    return { texto: resposta, ia: cat.nome, modelo: j.model || modelo };
  }
  if (cat.tipo === 'anthropic') {
    const r = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST', headers: { 'Content-Type': 'application/json', 'x-api-key': ia.chave, 'anthropic-version': '2023-06-01' },
      body: JSON.stringify({ model: modelo, max_tokens: 1024, system: sys || undefined, messages: conversa.map((m) => ({ role: m.role === 'assistant' ? 'assistant' : 'user', content: m.content })) }),
    });
    const j = await r.json().catch(() => ({}));
    if (!r.ok) throw new Error((j.error && j.error.message) || 'Claude recusou (status ' + r.status + ').');
    const resposta = (j.content || []).map((b) => b.text || '').join('').trim();
    if (!resposta) throw new Error('Claude não devolveu texto.');
    return { texto: resposta, ia: cat.nome, modelo: j.model || modelo };
  }
  const base = cat.base || ia.base_url || 'https://api.openai.com/v1';
  const r = await fetch(base + '/chat/completions', {
    method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + ia.chave },
    body: JSON.stringify({ model: modelo, messages: mensagens.slice(-24), max_tokens: 1024 }),
  });
  const j = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error((j.error && (j.error.message || j.error)) || 'IA recusou (status ' + r.status + ').');
  const resposta = (j.choices && j.choices[0] && j.choices[0].message && j.choices[0].message.content || '').trim();
  if (!resposta) throw new Error('A IA não devolveu texto.');
  return { texto: resposta, ia: cat.nome, modelo: j.model || modelo };
}

/* ---------- ferramentas do modo agente: pesquisa e leitura reais ---------- */
const decodificar = (t) => String(t || '').replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&#x27;|&#39;/g, "'").replace(/&#(\d+);/g, (m, n) => String.fromCharCode(Number(n)));
async function pesquisarWeb(q) {
  const UA = { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/128.0 Safari/537.36' };
  for (const u of ['https://html.duckduckgo.com/html/?q=', 'https://lite.duckduckgo.com/lite/?q=']) {
    try {
      const r = await fetch(u + encodeURIComponent(q), { headers: UA });
      if (!r.ok) continue;
      const html = await r.text();
      const resultados = [];
      for (const m of html.matchAll(/<a[^>]*class="result__a"[^>]*href="([^"]+)"[^>]*>([\s\S]*?)<\/a>/g)) {
        let url = decodificar(m[1]);
        const mU = /uddg=([^&]+)/.exec(url);
        if (mU) { try { url = decodeURIComponent(mU[1]); } catch {} }
        if (url.startsWith('//')) url = 'https:' + url;
        const titulo = decodificar(m[2].replace(/<[^>]+>/g, '')).trim();
        if (titulo && url && !resultados.some((x) => x.titulo === titulo)) resultados.push({ titulo, url, resumo: '' });
        if (resultados.length >= 6) break;
      }
      const snacks = [...html.matchAll(/class="result__snippet"[^>]*>([\s\S]*?)<\/a>/g)].map((m) => decodificar(m[1].replace(/<[^>]+>/g, '')).trim());
      resultados.forEach((x, i) => { x.resumo = (snacks[i] || '').slice(0, 240); });
      if (resultados.length) return { resultados };
    } catch {}
  }
  throw new Error('A busca não respondeu agora. Tente de novo.');
}
async function abrirWeb(url) {
  if (!/^https?:\/\/.+/i.test(String(url || ''))) throw new Error('Informe um endereço http(s).');
  const r = await fetch(url, { headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/128.0 Safari/537.36' } });
  if (!r.ok) throw new Error('A página respondeu status ' + r.status + '.');
  const html = (await r.text()).slice(0, 2 * 1024 * 1024);
  const titulo = decodificar((html.match(/<title[^>]*>([\s\S]*?)<\/title>/i) || [])[1] || '').trim();
  const texto = html
    .replace(/<script[\s\S]*?<\/script>/gi, ' ').replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
  return { titulo, texto: texto.slice(0, 4000), url };
}
async function rodarFerramenta(nome, arg) {
  if (nome === 'PESQUISAR') { const r = await pesquisarWeb(arg); return r.resultados.map((x, i) => (i + 1) + '. ' + x.titulo + ' — ' + x.url + (x.resumo ? ' | ' + x.resumo : '')).join('\n'); }
  if (nome === 'ABRIR') { const p = await abrirWeb(arg); return (p.titulo ? p.titulo + '\n' : '') + p.texto; }
  throw new Error('Ferramenta desconhecida: ' + nome);
}

/* ---------- notícias reais (Google News → BBC Brasil → G1) ---------- */
let noticiasCache = null;
const limpaRSS = (t) => String(t || '').replace(/<!\[CDATA\[|\]\]>/g, '').replace(/<[^>]+>/g, '').trim();
async function rssNoticias(url, fonteFixa) {
  const r = await fetch(url, { headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/128.0 Safari/537.36' } });
  if (!r.ok) return [];
  const xml = await r.text();
  const itens = [];
  for (const m of xml.matchAll(/<item>([\s\S]*?)<\/item>/g)) {
    if (itens.length >= 8) break;
    const b = m[1];
    const titulo = limpaRSS(b.match(/<title>([\s\S]*?)<\/title>/) && b.match(/<title>([\s\S]*?)<\/title>/)[1]);
    const link = limpaRSS(b.match(/<link>([\s\S]*?)<\/link>/) && b.match(/<link>([\s\S]*?)<\/link>/)[1]);
    const pub = (b.match(/<pubDate>([\s\S]*?)<\/pubDate>/) || [])[1] || '';
    if (!titulo || !link) continue;
    const fonteTag = limpaRSS((b.match(/<source[^>]*>([\s\S]*?)<\/source>/) || [])[1]);
    const sep = titulo.lastIndexOf(' - ');
    itens.push({ titulo: fonteFixa || (sep > 0 ? titulo.slice(0, sep) : titulo), link, fonte: fonteFixa || fonteTag || (sep > 0 ? titulo.slice(sep + 3) : 'Notícias'), quando: pub ? new Date(pub).toISOString() : new Date().toISOString() });
  }
  return itens;
}
async function manchetes() {
  if (noticiasCache && Date.now() - noticiasCache.quando < 600000) return noticiasCache.itens;
  let itens = [];
  try { itens = await rssNoticias('https://news.google.com/rss?hl=pt-BR&gl=BR&ceid=BR:pt-419', ''); } catch {}
  if (!itens.length) { try { itens = await rssNoticias('https://feeds.bbci.co.uk/portuguese/rss.xml', 'BBC Brasil'); } catch {} }
  if (!itens.length) { try { itens = await rssNoticias('https://g1.globo.com/rss/g1/', 'G1'); } catch {} }
  if (itens.length) noticiasCache = { quando: Date.now(), itens };
  return itens;
}

/* ---------- clima real (MET.no, formato do chat) ---------- */
async function climaExtern(cidade) {
  if (!cidade) return { configurado: false, mensagem: 'Informe a sua cidade nas preferências.' };
  const geo = await (await fetch('https://geocoding-api.open-meteo.com/v1/search?count=1&language=pt&name=' + encodeURIComponent(cidade))).json().catch(() => null);
  const g = geo && geo.results && geo.results[0];
  if (!g) return { configurado: false, mensagem: 'Cidade não encontrada.' };
  const r = await fetch('https://api.met.no/weatherapi/locationforecast/2.0/compact?lat=' + g.latitude + '&lon=' + g.longitude, { headers: { 'User-Agent': 'JARVIS-web/1.0 github.com/mlk010173/jarvis' } });
  const txt = await r.text();
  let m = null; try { m = JSON.parse(txt); } catch {}
  const serie = m && m.properties && m.properties.timeseries;
  if (!r.ok || !serie || !serie.length) return { configurado: false, mensagem: 'Previsão indisponível agora.' };
  const d = serie[0].data.instant.details;
  const simbolo = String((serie[0].data.next_1_hours && serie[0].data.next_1_hours.summary && serie[0].data.next_1_hours.summary.symbol_code) || '');
  const temps = serie.slice(0, 13).map((t) => t.data.instant.details.air_temperature);
  const ic = simbolo.includes('thunder') ? 'zap' : simbolo.includes('snow') ? 'snow' : (simbolo.includes('rain') || simbolo.includes('sleet')) ? 'rain' : simbolo.includes('cloud') ? 'cloud' : 'sun';
  const desc = ic === 'zap' ? 'Tempestade' : ic === 'snow' ? 'Neve' : ic === 'rain' ? 'Chuva' : ic === 'cloud' ? 'Nublado' : 'Céu limpo';
  return { configurado: true, cidade: g.name, icone: ic, descricao: desc, temperatura: d.air_temperature, minima: Math.round(Math.min(...temps) * 10) / 10, maxima: Math.round(Math.max(...temps) * 10) / 10, umidade: d.relative_humidity, vento: Math.round(d.wind_speed * 36) / 10 };
}

function melhorarPrompt(t) {
  let r = String(t || '').trim();
  if (!r) return { texto: '', dicas: ['Escreva o que quer em uma frase.'] };
  const dicas = [];
  if (r.length < 40) dicas.push('Detalhe o objetivo: o que exatamente quer receber de volta.');
  if (!/contexto|porque|objetivo/i.test(r)) dicas.push('Diga o contexto e o papel que a IA deve assumir.');
  if (!/formato|lista|json|tabela|resumo/i.test(r)) dicas.push('Peça um formato de saída (lista, tabela, JSON…).');
  return { texto: `${r}\n\n(Contexto: seja específico; entregue no formato pedido; revise antes de responder.)`, dicas };
}


const ROTAS = {
  'GET /api/info': () => INFO,
  'GET /api/novidades': () => NOVIDADES,
  'GET /api/comercial/planos': () => PLANOS,
  'GET /api/web/personalidades': () => PESSOAS,
  'GET /api/ui/vitrine': () => VITRINE,
  'GET /api/download/info': () => {
    const arq = path.join(ROOT, 'downloads', 'jarvis-setup-1.9.8.exe');
    const tem = fs.existsSync(arq);
    return { disponivel: tem, versao: '1.9.8', build: 1792394811,
             bytes: tem ? fs.statSync(arq).size : 0,
             sha256: '9E8FB92B372A315779638A0429B88A426192BC8D9297D' };
  },
  'GET /api/marketing/publico': () => ({ ga4: null,
    gads: { id: 'AW-18521438314', compra: '-38eCLjG7KEdEOrw2v9E', cadastro: '-kcXCMat_KEdEOrw2v9E' },
    fb: '235962338795367' }),
  'GET /api/pagamentos/metodos': () => ({ pix: true, cartao: false, pix_automatico: Boolean(process.env.PIX_CHAVE) }),
};

/* 2FA real por e-mail: envia código se o remetente estiver configurado (JARVIS_EMAIL_URL/JARVIS_EMAIL_SIG).
   Sem remetente configurado, o login continua funcionando SEM verificação — nunca bloqueado, nunca falso. */
const EMAIL_URL = process.env.JARVIS_EMAIL_URL || '';
const EMAIL_SIG = process.env.JARVIS_EMAIL_SIG || '';
const enviarEmail = async (para, assunto, texto) => {
  if (!EMAIL_URL || !EMAIL_SIG) return false;
  try {
    const c = new AbortController(); const t = setTimeout(() => c.abort(), 15000);
    const r = await fetch(EMAIL_URL, { method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ sig: EMAIL_SIG, para, assunto, texto }), signal: c.signal });
    clearTimeout(t);
    return r.ok;
  } catch { return false; }
};
const mascaraEmail = (e) => { const [u, d] = String(e).split('@'); return (u || '').slice(0, 2) + '***@' + d; };
const uaHash = (req) => crypto.createHash('sha256').update((req.headers['user-agent'] || '') + '|' + (req.headers['accept-language'] || '')).digest('hex').slice(0, 20);

async function api(req, res, rota, metodo, corpo, conta) {
  /* query string: a bridge manda tudo em rota; aqui vira corpo (parâmetros de URL) */
  const qi = rota.indexOf('?');
  if (qi >= 0) {
    const q = new URLSearchParams(rota.slice(qi + 1));
    rota = rota.slice(0, qi);
    corpo = corpo || {};
    for (const [k, v] of q) if (corpo[k] === undefined) corpo[k] = v;
  }
  const K = metodo + ' ' + rota;

  /* públicas */
  if (ROTAS[K]) return ROTAS[K]();
  if (K === 'GET /api/dono/eu') return { dono: false, papel: null };

  /* rotas admin descobertas na auditoria da API oficial (19/10/2026, brute-force autorizado):
     todas exigem dono ou equipe (GET, e 3 de escrita: POST equipe/cupons, PUT leads); o backend local não tem dono, então responde honesto. */
  if (K === 'GET /api/admin/eu') return { __erro: [403, 'Área restrita ao dono e à equipe.'], dono: false, papel: null };
  if (K === 'GET /api/admin/vendas') return { __erro: [403, 'Área restrita ao dono e à equipe.'], dono: false };
  if (K === 'GET /api/admin/equipe') return { __erro: [403, 'Área restrita ao dono e à equipe.'], dono: false };
  if (K === 'GET /api/admin/cupons') return { __erro: [403, 'Área restrita ao dono e à equipe.'], dono: false };
  if (K === 'GET /api/admin/relatorios') return { __erro: [403, 'Área restrita ao dono e à equipe.'], dono: false };
  if (K === 'GET /api/admin/resumo') return { __erro: [403, 'Área restrita ao dono.'], dono: false };
  if (K === 'GET /api/admin/planos') return { __erro: [403, 'Área restrita ao dono.'], dono: false };
  if (K === 'GET /api/admin/usuarios') return { __erro: [403, 'Área restrita ao dono.'], dono: false };
  if (K === 'GET /api/admin/assinaturas') return { __erro: [403, 'Área restrita ao dono.'], dono: false };
  if (K === 'GET /api/admin/leads') return { __erro: [403, 'Área restrita ao dono.'], dono: false };
  if (K === 'GET /api/admin/push') return { __erro: [403, 'Área restrita ao dono.'], dono: false };
  if (K === 'GET /api/admin/auditoria') return { __erro: [403, 'Área restrita ao dono.'], dono: false };
  if (K === 'GET /api/admin/contas') return { __erro: [403, 'Área restrita ao dono.'], dono: false };
  if (K === 'GET /api/admin/analytics') return { __erro: [403, 'Área restrita ao dono e à equipe.'], dono: false };
  if (K === 'GET /api/admin/clientes') return { __erro: [403, 'Área restrita ao dono e à equipe.'], dono: false };
  if (K === 'GET /api/admin/licencas') return { __erro: [403, 'Área restrita ao dono.'], dono: false };
  if (K === 'GET /api/admin/sites') return { __erro: [403, 'Área restrita ao dono.'], dono: false };
  if (K === 'GET /api/admin/transacoes') return { __erro: [403, 'Área restrita ao dono.'], dono: false };
  if (K === 'GET /api/admin/contas/') return { __erro: [403, 'Área restrita ao dono.'], dono: false }; /* padrão /:id */
  if (K === 'POST /api/admin/equipe') return { __erro: [403, 'Área restrita ao dono.'], dono: false };
  if (K === 'POST /api/admin/cupons') return { __erro: [403, 'Área restrita ao dono.'], dono: false };
  if (K === 'PUT /api/admin/leads') return { __erro: [403, 'Área restrita ao dono.'], dono: false };
  if (K === 'GET /api/ponte/apps') return { apps: [] };
  if (K === 'POST /api/ponte/comando') return { erro: 'Nenhum PC conectado.' };
  if (K === 'GET /api/web/clima') return climaExtern(String(corpo.cidade || 'São Paulo'));
  if (K === 'POST /api/web/clima') return climaExtern(String((corpo || {}).cidade || 'São Paulo'));
  if (K === 'POST /api/web/melhorar-prompt') {
    const t = String((corpo || {}).texto || '').trim();
    if (!t) return { __erro: [400, 'Escreva o texto que você quer melhorar.'] };
    if (t.length > 8000) return { __erro: [400, 'Texto longo demais (máximo 8.000 caracteres).'] };
    return melhorarPrompt(t);
  }
  if (K === 'POST /api/coletiva/lote') { db.coletiva.eventos += (corpo.eventos || []).length; db.coletiva.lotes++; salvar(); return { ok: true }; }

  /* conta — sessão */
  if (K === 'GET /api/conta/sessao') return { logado: Boolean(conta), email: conta ? conta.email : null };
  if (K === 'POST /api/conta/cadastro') {
    const { nome, email, senha } = corpo || {};
    if (!nome || !email || !senha || senha.length < 8) return { __erro: [400, 'Confira nome, e-mail e senha (mínimo 8 caracteres).'] };
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(String(email))) return { __erro: [400, 'E-mail inválido. Confira o endereço digitado.'] };
    if (db.contas.some(c => c.email === email)) return { __erro: [400, 'Já existe uma conta com este e-mail.'] };
    const sal = crypto.randomBytes(12).toString('hex');
    db.contas.push({ id: id('c'), nome, email, sal, hash: senhaHash(senha, sal), plano: 'jarvis', ias: [], memoria: [], criado: agora() });
    salvar();
    return { token: novaSessao(email), usuario: { nome, email } };
  }
  if (K === 'POST /api/conta/entrar') {
    const { email, senha } = corpo || {};
    const c = db.contas.find(x => x.email === email);
    if (!c || c.hash !== senhaHash(senha, c.sal)) return { __erro: [401, 'E-mail ou senha incorretos.'] };
    // dispositivo desconhecido + e-mail configurado → código de 6 dígitos, 10 min
    const h = uaHash(req);
    if (EMAIL_URL && !(c.uas || []).includes(h)) {
      const desafio = crypto.randomBytes(16).toString('hex');
      const codigo = String(crypto.randomInt(0, 1000000)).padStart(6, '0');
      const ok = await enviarEmail(c.email, 'Seu código JARVIS: ' + codigo,
        'Entrada de um dispositivo novo no JARVIS.\n\nCódigo de verificação: ' + codigo + '\n\nEle vale por 10 minutos. Se não foi você, troque sua senha.');
      if (ok) {
        (db.desafios = db.desafios || {})[desafio] = { email: c.email, codigo, exp: agora() + 600e3, ua: h, env: Date.now() };
        salvar();
        return { verificacao: true, desafio, email: mascaraEmail(c.email) };
      }
      // e-mail falhou (remetente fora/limite): login segue normal, sem fingir verificação
    }
    (c.uas = c.uas || []).push(h); if (c.uas.length > 12) c.uas.shift(); salvar();
    return { token: novaSessao(email), usuario: { nome: c.nome, email: c.email } };
  }
  if (K === 'POST /api/conta/sair') { const t = tokenDe(req, corpo); if (t) { delete db.sessoes[t]; salvar(); } return { ok: true }; }


  /* ---------- conta — OAuth 2.0 real (Google / Discord / GitHub) ---------- */
  const mOauth = rota.match(/^\/api\/conta\/(google|discord|github)\/(ativo|iniciar|callback)(\?.*)?$/);
  if (mOauth) {
    const prov = mOauth[1], acao = mOauth[2];
    const cfg = OAUTH[prov];
    const base = 'https://' + (req.headers.host || 'localhost:3000');
    const voltar = (q) => { res.writeHead(302, { Location: JARVIS_URL + '/entrar.html?' + q }); res.end(); return null; };
    if (acao === 'ativo') return { ativo: Boolean(cfg.id && cfg.segredo) };
    if (acao === 'iniciar') {
      if (!cfg.id || !cfg.segredo) return { __erro: [501, 'Login com ' + cfg.rotulo + ' ainda não está configurado neste servidor.'] };
      const volta = voltaSegura(String(corpo.volta || ''));
      const estado = crypto.randomBytes(16).toString('hex');
      const verificador = prov === 'google' ? crypto.randomBytes(32).toString('base64url') : null;
      for (const k of Object.keys(db.oauthEstados)) if (db.oauthEstados[k].exp < agora()) delete db.oauthEstados[k];
      db.oauthEstados[estado] = { prov, volta, verificador, exp: agora() + 600e3 };
      salvar();
      const redirect = encodeURIComponent(base + '/api/conta/' + prov + '/callback');
      let url = '';
      if (prov === 'google') {
        const desafio = crypto.createHash('sha256').update(verificador).digest('base64url');
        url = 'https://accounts.google.com/o/oauth2/v2/auth?client_id=' + encodeURIComponent(cfg.id) + '&redirect_uri=' + redirect + '&response_type=code&scope=' + encodeURIComponent('openid email profile') + '&state=' + estado + '&code_challenge=' + encodeURIComponent(desafio) + '&code_challenge_method=S256';
      } else if (prov === 'discord') {
        url = 'https://discord.com/oauth2/authorize?client_id=' + encodeURIComponent(cfg.id) + '&redirect_uri=' + redirect + '&response_type=code&scope=' + encodeURIComponent('identify email') + '&state=' + estado;
      } else {
        url = 'https://github.com/login/oauth/authorize?client_id=' + encodeURIComponent(cfg.id) + '&redirect_uri=' + redirect + '&scope=' + encodeURIComponent('read:user user:email') + '&state=' + estado;
      }
      res.writeHead(302, { Location: url }); res.end(); return null;
    }
    /* callback */
    const st = corpo.state && db.oauthEstados[corpo.state];
    if (st) { delete db.oauthEstados[corpo.state]; salvar(); }
    const volta = st ? st.volta : '';
    if (corpo.error || corpo.error_description || !corpo.code || !st) return voltar('erro=' + prov + (volta ? '&volta=' + encodeURIComponent(volta) : ''));
    try {
      let perfil = null;
      if (prov === 'google') {
        const corpo1 = new URLSearchParams({ client_id: cfg.id, client_secret: cfg.segredo, code: corpo.code, grant_type: 'authorization_code', redirect_uri: base + '/api/conta/google/callback', code_verifier: st.verificador }).toString();
        const tok = await httpsJSON('https://oauth2.googleapis.com/token', { metodo: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, corpo: corpo1 });
        if (!tok.json || !tok.json.access_token) throw new Error('token');
        const ui = await httpsJSON('https://openidconnect.googleapis.com/v1/userinfo', { headers: { Authorization: 'Bearer ' + tok.json.access_token } });
        perfil = { idExt: ui.json && ui.json.sub, email: ui.json && ui.json.email, nome: (ui.json && ui.json.name) || 'Usuário Google' };
      } else if (prov === 'discord') {
        const corpo1 = new URLSearchParams({ client_id: cfg.id, client_secret: cfg.segredo, grant_type: 'authorization_code', code: corpo.code, redirect_uri: base + '/api/conta/discord/callback' }).toString();
        const tok = await httpsJSON('https://discord.com/api/oauth2/token', { metodo: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, corpo: corpo1 });
        if (!tok.json || !tok.json.access_token) throw new Error('token');
        const ui = await httpsJSON('https://discord.com/api/users/@me', { headers: { Authorization: 'Bearer ' + tok.json.access_token } });
        perfil = { idExt: ui.json && ui.json.id, email: ui.json && ui.json.email, nome: (ui.json && (ui.json.global_name || ui.json.username)) || 'Usuário Discord' };
      } else {
        const corpo1 = new URLSearchParams({ client_id: cfg.id, client_secret: cfg.segredo, code: corpo.code, redirect_uri: base + '/api/conta/github/callback' }).toString();
        const tok = await httpsJSON('https://github.com/login/oauth/access_token', { metodo: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded', Accept: 'application/json' }, corpo: corpo1 });
        if (!tok.json || !tok.json.access_token) throw new Error('token');
        const cab = { Authorization: 'Bearer ' + tok.json.access_token, Accept: 'application/vnd.github+json', 'User-Agent': 'jarvis-backend' };
        const ui = await httpsJSON('https://api.github.com/user', { headers: cab });
        let email = ui.json && ui.json.email;
        if (!email) {
          const em = await httpsJSON('https://api.github.com/user/emails', { headers: cab });
          const principal = (em.json || []).find((e) => e.primary) || (em.json || [])[0];
          email = principal && principal.email;
        }
        perfil = { idExt: ui.json && String(ui.json.id), email, nome: (ui.json && (ui.json.name || ui.json.login)) || 'Usuário GitHub' };
      }
      if (!perfil || !perfil.idExt) throw new Error('perfil');
      let c = db.contas.find((x) => x.oauth && x.oauth[prov] === perfil.idExt);
      if (!c && perfil.email) c = db.contas.find((x) => x.email === perfil.email);
      if (!c) {
        c = { id: id('c'), nome: perfil.nome, email: perfil.email || (prov + '_' + perfil.idExt + '@oauth.jarvis.local'), plano: 'jarvis', ias: [], memoria: [], criado: agora(), oauth: {} };
        db.contas.push(c);
      }
      if (!c.oauth) c.oauth = {};
      c.oauth[prov] = perfil.idExt;
      if (prov === 'discord' && !c.discord) c.discord = { tag: perfil.nome };
      if (perfil.nome && c.nome === 'Usuário ' + prov.charAt(0).toUpperCase() + prov.slice(1)) c.nome = perfil.nome;
      salvar();
      const codigo = crypto.randomBytes(24).toString('hex');
      for (const k of Object.keys(db.oauthCodigos)) if (db.oauthCodigos[k].exp < agora()) delete db.oauthCodigos[k];
      db.oauthCodigos[codigo] = { email: c.email, exp: agora() + 60e3 };
      salvar();
      res.writeHead(302, { Location: JARVIS_URL + '/entrar.html?oauth=' + prov + '&codigo=' + codigo + (volta ? '&volta=' + encodeURIComponent(volta) : '') });
      res.end(); return null;
    } catch (e) {
      return voltar('erro=' + prov + (volta ? '&volta=' + encodeURIComponent(volta) : ''));
    }
  }
  if (K === 'POST /api/conta/oauth/resgatar') {
    const codigo = (corpo || {}).codigo;
    const reg = codigo && db.oauthCodigos[codigo];
    if (reg) { delete db.oauthCodigos[codigo]; salvar(); }
    if (!reg || reg.exp < agora()) return { __erro: [401, 'Código de login expirado. Entre de novo.'] };
    const c = db.contas.find((x) => x.email === reg.email);
    if (!c) return { __erro: [401, 'Conta não encontrada.'] };
    return { token: novaSessao(c.email), usuario: { nome: c.nome, email: c.email } };
  }

  /* verificação em 2 etapas (públicas: o desafio+ código são a própria credencial) */
  if (K === 'POST /api/conta/verificar-login') {
    const { desafio, codigo } = corpo || {};
    const reg = (db.desafios || {})[String(desafio || '')];
    if (!reg || reg.exp < agora()) return { __erro: [400, 'Código expirado. Entre de novo.'] };
    if (String(codigo || '').trim() !== reg.codigo) return { __erro: [401, 'Código incorreto. Confira o e-mail.'] };
    delete db.desafios[desafio]; // código de uso único
    const c = db.contas.find(x => x.email === reg.email);
    if (!c) return { __erro: [401, 'Conta não encontrada.'] };
    (c.uas = c.uas || []).push(reg.ua); if (c.uas.length > 12) c.uas.shift();
    salvar();
    return { token: novaSessao(c.email), usuario: { nome: c.nome, email: c.email } };
  }
  if (K === 'POST /api/conta/reenviar-codigo') {
    const { desafio } = corpo || {};
    const reg = (db.desafios || {})[String(desafio || '')];
    if (!reg || reg.exp < agora()) return { __erro: [400, 'Código expirado. Entre de novo.'] };
    if (Date.now() - (reg.env || 0) < 60e3) return { __erro: [429, 'Aguarde um minuto antes de pedir outro código.'] };
    const c = db.contas.find(x => x.email === reg.email);
    if (!c) return { __erro: [401, 'Conta não encontrada.'] };
    const ok = await enviarEmail(c.email, 'Seu novo código JARVIS: ' + reg.codigo,
      'Novo código de verificação do JARVIS: ' + reg.codigo + '\n\nVale por 10 minutos a partir de agora.');
    if (!ok) return { __erro: [503, 'Não consegui reenviar agora. Tente de novo em instantes.'] };
    reg.env = Date.now(); reg.exp = agora() + 600e3; salvar();
    return { email: mascaraEmail(c.email) };
  }

  /* download do instalador (público) */
  if (K === 'GET /api/download/instalador') {
    const arq = path.join(ROOT, 'downloads', 'jarvis-setup-1.9.8.exe');
    if (!fs.existsSync(arq)) return { __erro: [404, 'Instalador não encontrado neste servidor.'] };
    res.writeHead(200, { 'Content-Type': 'application/octet-stream', 'Access-Control-Allow-Origin': '*',
      'Content-Disposition': 'attachment; filename="jarvis-setup-1.9.8.exe"' });
    fs.createReadStream(arq).pipe(res);
    return null; // resposta já enviada
  }

  /* pagamentos — Pix real via chave do dono (env PIX_CHAVE), senão aviso claro */
  if (K === 'POST /api/pagamentos/pix' || K === 'POST /api/pagamentos/cartao') {
    if (!conta) return { __erro: [401, 'Faça login.'] };
    const chave = process.env.PIX_CHAVE;
    if (!chave) return { __erro: [503, 'Pagamentos não configurados neste backend: defina PIX_CHAVE (e opcional PIX_NOME/PIX_CIDADE) no ambiente.'] };
    if (K === 'POST /api/pagamentos/cartao') return { __erro: [501, 'Cartão não suportado neste backend próprio.'] };
    const nome = (process.env.PIX_NOME || 'JARVIS').slice(0, 25);
    const cid = (process.env.PIX_CIDADE || 'SAO PAULO').slice(0, 15);
    const ref = crypto.randomBytes(4).toString('hex').toUpperCase();
    const fld = (n, v) => n + String(v.length).padStart(2, '0') + v;
    let emv = fld('00', '01') + fld('26', fld('00', 'br.gov.bcb.pix') + fld('01', chave)) + fld('52', '0000') + fld('53', '986');
    emv += fld('58', 'BR') + fld('59', nome) + fld('60', cid) + fld('62', fld('05', ref));
    emv += '6304';
    const crc = (str) => { let r = 0xFFFF; for (const c of Buffer.from(str, 'utf8')) { r ^= c << 8; for (let i = 0; i < 8; i++) r = (r & 0x8000) ? ((r << 1) ^ 0x1021) & 0xFFFF : (r << 1) & 0xFFFF; } return r.toString(16).toUpperCase().padStart(4, '0'); };
    const copiaecola = emv + crc(emv);
    return { ok: true, modo: 'pix_estatico', referencia: ref, copia_e_cola: copiaecola, expira_em: agora() + 30 * 60e3 };
  }
  if (K === 'POST /api/cupons/validar') {
    const c = String((corpo || {}).cupom || '').trim().toUpperCase();
    const validos = (process.env.CUPONS || '').split(',').map(x => x.trim().toUpperCase()).filter(Boolean);
    if (validos.includes(c)) return { ok: true, cupom: c, desconto: Number(process.env.CUPOM_DESCONTO || 10) };
    return { __erro: [404, 'Cupom inválido ou expirado.'] };
  }

  /* daqui pra baixo: precisa login — rota que não existe aqui é 404, nunca 401 genérico */
  const PROTEGIDAS = [
    /^\/api\/conta\/(assinatura|discord|pcs|eu|plano|preferencias|memoria|ias|ias-ordem)(\/?.*)$/,
    /^\/api\/projetos(\/.*)?$/,
    /^\/api\/pagamentos\//,
    /^\/api\/dono\/negocio$/,
  ]; /* /api/v1/* faz a própria checagem de Bearer (chave de projeto) */

  if (!conta && PROTEGIDAS.some((re) => re.test(rota))) return { __erro: [401, 'Faça login.'] };

  if (K === 'GET /api/conta/assinatura') return { plano: 'premium', nome: 'Premium', pago: true, continua: true, expira_em: null, status: 'ativo', cobranca: 'aberto', limites: PLANO.limites };
  if (K === 'GET /api/conta/discord') return { vinculado: Boolean(conta.discord), tag: conta.discord ? conta.discord.tag : null };
  if (K === 'POST /api/conta/discord') return { __erro: [501, 'Vinculação Discord requer o servidor oficial.'] };
  if (K === 'GET /api/conta/pcs' || K === 'GET /api/conta/pcs/') return { pcs: conta.pcs || [] };
  if (K === 'GET /api/conta/google/ativo') return { ativo: Boolean(conta.google) };
  if (K === 'GET /api/dono/negocio') return {
    negocio: { contas: db.contas.length, projetos: db.projetos.length, sessoes: Object.keys(db.sessoes).length, eventos: db.coletiva.eventos },
    aviso: 'Estatísticas deste servidor (dados locais).' };
  if (K === 'GET /api/conta/eu') return { usuario: { nome: conta.nome, email: conta.email }, uso_hoje: 0, limite: 100 };
  if (K === 'GET /api/conta/plano') return PLANO;
  if (K === 'GET /api/conta/preferencias') return conta.preferencias || {};
  if (K === 'PUT /api/conta/preferencias') { conta.preferencias = corpo || {}; salvar(); return conta.preferencias; }
  if (K === 'GET /api/conta/memoria') return { itens: conta.memoria || [] };
  if (K === 'PUT /api/conta/memoria') { conta.memoria = (corpo.itens || corpo || []).slice(0, 500); salvar(); return { itens: conta.memoria }; }
  if (K === 'GET /api/conta/ias') {
    conta.ias = conta.ias || [];
    return CATALOGO_IAS.map((cat) => {
      const ligada = conta.ias.find((i) => i.id === cat.id);
      return { id: cat.id, nome: cat.nome, tipo: cat.tipo, site: cat.site, gratis: !!cat.gratis, modelo_padrao: cat.modelo_padrao,
        conectada: Boolean(ligada), ordem: ligada ? conta.ias.indexOf(ligada) : 999, modelo: ligada ? ligada.modelo : null,
        final_chave: ligada ? ('…' + String(ligada.chave).slice(-4)) : null, recomendacao: cat.recomendacao };
    });
  }
  const mIa = rota.match(/^\/api\/conta\/ias\/([^/]+)(\/testar)?$/);
  if (mIa) {
    conta.ias = conta.ias || [];
    const cat = iaCatalogo(mIa[1]);
    if (!cat) return { __erro: [404, 'Provedor desconhecido.'] };
    if (mIa[2] === '/testar' && metodo === 'POST') {
      const ligada = conta.ias.find((i) => i.id === cat.id);
      if (!ligada) return { __erro: [400, 'Conecte a chave primeiro.'] };
      try { await chamarIA(ligada, [{ role: 'user', content: 'Responda apenas: ok' }]); return { ok: true, msg: cat.nome + ' respondeu — chave válida.' }; }
      catch (e) { return { ok: false, msg: e.message || 'Falhou.' }; }
    }
    if (metodo === 'PUT') {
      const chave = String(corpo.chave || '').trim();
      if (!chave) return { __erro: [400, 'Informe a chave.'] };
      const existente = conta.ias.find((i) => i.id === cat.id);
      if (existente) { existente.chave = chave; existente.modelo = String(corpo.modelo || existente.modelo || cat.modelo_padrao); }
      else conta.ias.push({ id: cat.id, chave, modelo: String(corpo.modelo || cat.modelo_padrao), ordem: conta.ias.length });
      salvar();
      return { ok: true };
    }
    if (metodo === 'DELETE') { conta.ias = conta.ias.filter((i) => i.id !== cat.id); salvar(); return { ok: true }; }
  }
  if (K === 'PUT /api/conta/ias-ordem') {
    const ordem = corpo.ordem || [];
    conta.ias.sort((a, b) => (ordem.indexOf(a.id) === -1 ? 99 : ordem.indexOf(a.id)) - (ordem.indexOf(b.id) === -1 ? 99 : ordem.indexOf(b.id)));
    salvar();
    return { ok: true };
  }

  /* projetos */
  if (K === 'GET /api/projetos') return { projetos: db.projetos.filter(p => p.email === conta.email).map(semSecretos) };
  if (K === 'POST /api/projetos') {
    const { nome, descricao, instrucoes, assistente } = corpo || {};
    if (!nome) return { __erro: [400, 'Dê um nome ao projeto.'] };
    const p = { id: id('p'), email: conta.email, nome, descricao: descricao || '', instrucoes: instrucoes || '', assistente: assistente || 'JARVIS', chaves: [], criado: agora() };
    db.projetos.push(p); salvar();
    return semSecretos(p);
  }
  const mP = rota.match(/^\/api\/projetos\/([^/]+)(\/.*)?$/);
  if (mP) {
    const p = db.projetos.find(x => x.id === mP[1] && x.email === conta.email);
    if (!p) return { __erro: [404, 'Projeto não encontrado.'] };
    const sub = mP[2] || '';
    if (sub === '' && metodo === 'GET') return semSecretos(p);
    if (sub === '' && metodo === 'PUT') { Object.assign(p, corpo || {}); salvar(); return semSecretos(p); }
    if (sub === '' && metodo === 'DELETE') { db.projetos = db.projetos.filter(x => x.id !== p.id); salvar(); return { ok: true }; }
    if (sub === '/testar' && metodo === 'POST') {
      const fila = conta.ias || [];
      if (!fila.length) return { __erro: [400, 'Nenhuma IA conectada. Configure em Minhas IAs (Gemini tem plano grátis).' ] };
      const mem = (conta.memoria || []).slice(-12).map((m) => m.texto || m).join(' | ');
      const agente = String(corpo.personalidade || '') === 'agente';
      const ferramentas = 'FERRAMENTAS (use quando precisar de dados ao vivo, no formato exato): {PESQUISAR:termo} busca no Google/DuckDuckGo; {ABRIR:url} lê uma página. Responda APENAS com a chamada da ferramenta quando for usar. Sem dados de internet, responda direto ao usuário.';
      const persona = { serio: 'Seja direto e profissional.', amigavel: 'Seja amigável e leve.', professor: 'Explique passo a passo com exemplos.', tecnico: 'Seja preciso e denso.' }[corpo.personalidade] || 'Seja útil e natural.';
      const sistema = [
        (p.instrucoes || ''),
        'Você é ' + (p.assistente || 'JARVIS') + ', assistente pessoal do usuário, respondendo sempre em português do Brasil.',
        persona,
        agente ? 'Modo Agente: você PODE usar as ferramentas sempre que a pergunta precisar de informação atual da internet.' : '',
        ferramentas,
        mem ? 'Lembranças do usuário: ' + mem : '',
      ].filter(Boolean).join(' ');
      const falhas = [];
      let resposta = null, iaUsada = null;
      for (const ia of fila) {
        try {
          let mensagens = [{ role: 'system', content: sistema }].concat((corpo.mensagens || []).slice(-24));
          for (let rodada = 0; rodada < 4; rodada++) {
            const r = await chamarIA(ia, mensagens);
            const uso = /\{(PESQUISAR|ABRIR):([^}]+)\}/.exec(r.texto);
            if (!uso) { resposta = r.texto; iaUsada = r.ia; break; }
            try {
              const resultado = await rodarFerramenta(uso[1], uso[2].trim());
              mensagens.push({ role: 'assistant', content: r.texto });
              mensagens.push({ role: 'user', content: 'RESULTADO DA FERRAMENTA ' + uso[1] + ' (use para responder em português, sem repetir o resultado cru):\n' + resultado.slice(0, 3000) });
            } catch (e) {
              resposta = 'A ferramenta falhou: ' + (e.message || 'erro') + '. Tente perguntar de outro jeito.'; iaUsada = r.ia; break;
            }
          }
          if (resposta) break;
        } catch (e) { falhas.push({ id: ia.id, erro: e.message || 'falhou' }); }
      }
      if (!resposta) return { __erro: [502, 'Todas as IAs falharam: ' + falhas.map((f) => f.erro).join(' | ') || 'sem resposta.'] };
      p.usos = (p.usos || 0) + 1; salvar();
      return { resposta, ia_nome: iaUsada, tentativas_falhas: falhas };
    }
    if (sub === '/assistente' && metodo === 'POST') {
      const fila = conta.ias || [];
      if (!fila.length) return { __erro: [501, 'Criar projeto com IA requer uma IA conectada em Minhas IAs.' ] };
      const acao = corpo.acao === 'otimizar' ? 'melhorar' : 'criar';
      const pedido = String(corpo.texto || '').slice(0, 4000);
      if (!pedido) return { __erro: [400, 'Descreva o assistente que quer criar.'] };
      try {
        const r = await chamarIA(fila[0], [
          { role: 'system', content: 'Você cria definições de assistentes para o JARVIS. Responda SOMENTE com JSON válido: {"nome": "", "assistente": "", "descricao": "", "instrucoes": ""} — nomes curtos, instruções em português.' },
          { role: 'user', content: 'Ação: ' + acao + '. Pedido do usuário: ' + pedido },
        ]);
        const j = JSON.parse((r.texto.match(/\{[\s\S]*\}/) || [r.texto])[0]);
        return { projeto: { nome: String(j.nome || corpo.nome || 'Assistente').slice(0, 60), assistente: String(j.assistente || 'Assistente').slice(0, 60), descricao: String(j.descricao || '').slice(0, 300), instrucoes: String(j.instrucoes || '').slice(0, 4000) }, ia: r.ia };
      } catch (e) { return { __erro: [502, 'A IA não conseguiu criar o projeto agora: ' + (e.message || 'erro')] }; }
    }
    if (sub === '/chaves' && metodo === 'GET') return { chaves: p.chaves.map(c => ({ id: c.id, nome: c.nome, criado: c.criado })) };
    if (sub === '/chaves' && metodo === 'POST') {
      const c = { id: id('k'), nome: (corpo.nome || 'chave'), valor: 'jv_' + crypto.randomBytes(20).toString('hex'), criado: agora() };
      p.chaves.push(c); salvar();
      return { id: c.id, nome: c.nome, chave: c.valor }; // aparece uma vez só
    }
    const mK = sub.match(/^\/chaves\/([^/]+)$/);
    if (mK && metodo === 'DELETE') { p.chaves = p.chaves.filter(c => c.id !== mK[1]); salvar(); return { ok: true }; }
  }

  /* API pública v1 (chave do projeto) */
  if (K === 'POST /api/v1/chat') {
    const chave = (req.headers.authorization || '').replace(/^Bearer /, '');
    const proj = db.projetos.find(x => x.chaves.some(c => c.valor === chave));
    if (!proj) return { __erro: [401, 'Chave ausente, errada ou revogada.'] };
    const dono = db.contas.find(c => c.email === proj.email);
    const ia = (dono.ias || []).find(i => i.ativa);
    if (!ia) return { __erro: [400, 'Nenhuma IA conectada na conta do projeto.'] };
    try { return await chamarIA(ia, (corpo.mensagens || []).slice(-40)); }
    catch (e) { return { __erro: [502, e.message || 'Todas as IAs falharam.'] }; }
  }

  /* ---------- comandos reais (v1.1): moeda, cripto, wiki, feriados, github, pesquisa e abertura ---------- */
  if (rota === '/api/web/moeda' && metodo === 'GET') {
    if (!conta) return { __erro: [401, 'Faça login.'] };
    const de = String(corpo.de || 'USD').toUpperCase().slice(0, 4), para = String(corpo.para || 'BRL').toUpperCase().slice(0, 4);
    if (!/^[A-Z]{3,4}$/.test(de) || !/^[A-Z]{3,4}$/.test(para)) return { __erro: [400, 'Moeda inválida (use USD, EUR, BRL…).'] };
    const UA = { headers: { 'User-Agent': 'JARVIS-web/1.0 github.com/mlk010173/jarvis' } };
    try {
      const r = await fetch('https://economia.awesomeapi.com.br/json/last/' + de + '-' + para, UA);
      const o = (await r.json().catch(() => null)) || {};
      const j = o[de + para];
      if (r.ok && j && j.bid) return { de, para, valor: j.bid, titulo: j.name, atualizado: j.create_date, fonte: 'AwesomeAPI' };
    } catch {}
    try {
      const r2 = await fetch('https://api.frankfurter.dev/v1/latest?base=' + de + '&symbols=' + para, UA);
      const o2 = await r2.json().catch(() => null);
      if (r2.ok && o2 && o2.rates && o2.rates[para]) return { de, para, valor: o2.rates[para], titulo: de + '/' + para, atualizado: o2.date, fonte: 'BCE/Frankfurter' };
    } catch {}
    return { __erro: [502, 'Cotação não encontrada agora.'] };
  }
  if (rota === '/api/web/cripto' && metodo === 'GET') {
    if (!conta) return { __erro: [401, 'Faça login.'] };
    const mapa = { bitcoin: 'BTC', ethereum: 'ETH', solana: 'SOL', cardano: 'ADA', dogecoin: 'DOGE' };
    const sigla = mapa[String(corpo.id || 'bitcoin').toLowerCase()];
    if (!sigla) return { __erro: [400, 'Cripto não suportada (bitcoin, ethereum, solana, cardano, dogecoin).'] };
    const UA = { headers: { 'User-Agent': 'JARVIS-web/1.0 github.com/mlk010173/jarvis' } };
    const idc = String(corpo.id).toLowerCase();
    try {
      const r = await fetch('https://api.coingecko.com/api/v3/simple/price?ids=' + idc + '&vs_currencies=brl', UA);
      const o = await r.json().catch(() => null);
      if (r.ok && o && o[idc] && o[idc].brl) return { nome: sigla, valor_brl: o[idc].brl, atualizado: new Date().toISOString().slice(0, 19), fonte: 'CoinGecko' };
    } catch {}
    try {
      const r2 = await fetch('https://api.coinbase.com/v2/exchange-rates?currency=' + sigla, UA);
      const o2 = await r2.json().catch(() => null);
      const v2 = o2 && o2.data && o2.data.rates && o2.data.rates.BRL;
      if (r2.ok && v2) return { nome: sigla, valor_brl: Math.round(Number(v2) * 100) / 100, atualizado: new Date().toISOString().slice(0, 19), fonte: 'Coinbase' };
    } catch {}
    try {
      const r3 = await fetch('https://economia.awesomeapi.com.br/json/last/' + sigla + '-BRL', UA);
      const o3 = (await r3.json().catch(() => null)) || {};
      if (r3.ok && o3[sigla + 'BRL'] && o3[sigla + 'BRL'].bid) return { nome: sigla, valor_brl: o3[sigla + 'BRL'].bid, atualizado: o3[sigla + 'BRL'].create_date, fonte: 'AwesomeAPI' };
    } catch {}
    return { __erro: [502, 'Cotação não encontrada agora.'] };
  }
  if (rota === '/api/web/wiki' && metodo === 'GET') {
    if (!conta) return { __erro: [401, 'Faça login.'] };
    const termo = String(corpo.q || '').trim();
    if (!termo) return { __erro: [400, 'Informe o termo.'] };
    const UAh = { 'User-Agent': 'JARVIS-web/1.0 github.com/mlk010173/jarvis' };
    const resumo = (o) => ({ titulo: (o && o.title) || '', resumo: String((o && o.extract) || '').slice(0, 340), url: (o && o.content_urls && o.content_urls.desktop && o.content_urls.desktop.page) || '' });
    let r = await fetch('https://pt.wikipedia.org/api/rest_v1/page/summary/' + encodeURIComponent(termo), { headers: UAh });
    if (r.ok) { const o = await r.json().catch(() => null); if (o && o.extract) return resumo(o); }
    const s = await (await fetch('https://pt.wikipedia.org/w/api.php?action=opensearch&limit=1&format=json&search=' + encodeURIComponent(termo), { headers: UAh })).json();
    const titulo = (s && s[1] && s[1][0]) || null;
    if (!titulo) return { __erro: [404, 'Nada encontrado na Wikipédia.'] };
    r = await fetch('https://pt.wikipedia.org/api/rest_v1/page/summary/' + encodeURIComponent(titulo), { headers: UAh });
    const o2 = await r.json().catch(() => null);
    if (!r.ok || !o2 || !o2.extract) return { __erro: [404, 'Nada encontrado na Wikipédia.'] };
    return resumo(o2);
  }
  if (rota === '/api/web/feriados' && metodo === 'GET') {
    if (!conta) return { __erro: [401, 'Faça login.'] };
    const ano = String(corpo.ano || new Date().getFullYear()).replace(/\D/g, '').slice(0, 4);
    const r = await fetch('https://date.nager.at/api/v3/PublicHolidays/' + ano + '/BR', { headers: { 'User-Agent': 'JARVIS-web/1.0 github.com/mlk010173/jarvis' } });
    if (!r.ok) return { __erro: [502, 'Feriados indisponíveis agora.'] };
    const lista = await r.json().catch(() => []);
    const nacionais = (lista || []).filter((f) => f.global).map((f) => ({ data: f.date, nome: f.localName }));
    if (!nacionais.length) return { __erro: [404, 'Sem feriados para o ano informado.'] };
    return { ano, feriados: nacionais };
  }
  if (rota === '/api/web/repos' && metodo === 'GET') {
    if (!conta) return { __erro: [401, 'Faça login.'] };
    const r = await fetch('https://api.github.com/repos/mlk010173/jarvis', { headers: { 'User-Agent': 'JARVIS-web/1.0 github.com/mlk010173/jarvis' } });
    const o = await r.json().catch(() => null);
    if (!r.ok || !o || !o.full_name) return { __erro: [502, 'Repositório indisponível agora.'] };
    return { nome: o.full_name, estrelas: o.stargazers_count, forks: o.forks_count, issues: o.open_issues_count, atualizado: String(o.updated_at || '').slice(0, 10), url: o.html_url };
  }
  if (rota === '/api/web/pesquisar' && metodo === 'GET') {
    if (!conta) return { __erro: [401, 'Faça login.'] };
    const q = String(corpo.q || '').trim();
    if (!q) return { __erro: [400, 'Informe o que pesquisar.'] };
    try { const r = await pesquisarWeb(q); return r; } catch (e) { return { __erro: [502, e.message || 'A busca falhou.'] }; }
  }
  if (rota === '/api/web/abrir' && metodo === 'GET') {
    if (!conta) return { __erro: [401, 'Faça login.'] };
    try { return await abrirWeb(String(corpo.url || '')); } catch (e) { return { __erro: [400, e.message || 'Não consegui abrir.'] }; }
  }
  if (rota === '/api/web/briefing' && metodo === 'GET') {
    return { itens: await manchetes() };
  }

  /* ---------- painel Casa: Home Assistant real ---------- */
  if (rota.startsWith('/api/casa/')) {
    if (!conta) return { __erro: [401, 'Faça login.'] };
    const cfg = conta.casa || { url: '', token: '' };
    const ha = (caminho, m, b) => fetch(String(cfg.url || '').replace(/\/+$/, '') + caminho, { method: m || 'GET', headers: { Authorization: 'Bearer ' + (cfg.token || ''), 'Content-Type': 'application/json' }, body: b ? JSON.stringify(b) : undefined });
    if (K === 'GET /api/casa/estado') {
      if (!cfg.url || !cfg.token) return { configurado: false, ok: false, erro: null };
      try {
        const r = await ha('/api/');
        const o = await r.json().catch(() => null);
        return { configurado: true, ok: r.ok && o && o.message === 'API running.', erro: r.ok ? null : 'Sem resposta do Home Assistant (status ' + r.status + ').' };
      } catch { return { configurado: true, ok: false, erro: 'Não consegui alcançar o endereço informado.' }; }
    }
    if (K === 'POST /api/casa/conectar') {
      const url = String(corpo.url || '').trim(), tok = String(corpo.token || '').trim();
      if (!/^https?:\/\/.+/i.test(url)) return { __erro: [400, 'Informe o endereço completo (começando com http).'] };
      if (!tok) return { __erro: [400, 'Informe o token de acesso longo do Home Assistant.'] };
      try {
        const r = await fetch(url.replace(/\/+$/, '') + '/api/', { headers: { Authorization: 'Bearer ' + tok } });
        if (!r.ok) return { __erro: [400, 'O Home Assistant recusou (status ' + r.status + '). Confira o token.'] };
        conta.casa = { url, token: tok }; salvar();
        return { ok: true };
      } catch { return { __erro: [400, 'Não consegui alcançar o endereço informado.'] }; }
    }
    if (K === 'POST /api/casa/desconectar') { conta.casa = { url: '', token: '' }; salvar(); return { ok: true }; }
    if (!cfg.url || !cfg.token) return { __erro: [400, 'Conecte o Home Assistant primeiro (painel Casa).'] };
    if (K === 'GET /api/casa/aparelhos') {
      const r = await ha('/api/states');
      if (!r.ok) return { __erro: [502, 'Sem resposta do Home Assistant (status ' + r.status + ').'] };
      const estados = await r.json().catch(() => []);
      const favs = conta.casaFavoritos || {};
      const grupos = { light: 'Luzes', switch: 'Tomadas', climate: 'Climatização', media_player: 'Mídia', cover: 'Portões e cortinas', fan: 'Ventilação', lock: 'Fechaduras', vacuum: 'Robôs', humidifier: 'Umidade', water_heater: 'Água quente' };
      const acoesDe = (dominio) => {
        const base = { toggle: { id: 'toggle', nome: 'Ligar/Apagar', pri: true }, turn_on: { id: 'turn_on', nome: 'Acender' }, turn_off: { id: 'turn_off', nome: 'Apagar' } };
        if (dominio === 'light' || dominio === 'switch' || dominio === 'fan' || dominio === 'humidifier') return [base.toggle, base.turn_on, base.turn_off];
        if (dominio === 'media_player') return [{ id: 'media_play_pause', nome: 'Pausar/Tocar', pri: true }, base.turn_on, base.turn_off];
        if (dominio === 'cover') return [{ id: 'open_cover', nome: 'Abrir' }, { id: 'close_cover', nome: 'Fechar' }, base.toggle];
        if (dominio === 'vacuum') return [{ id: 'start', nome: 'Começar', pri: true }, { id: 'trigger', nome: 'Localizar' }];
        return [];
      };
      const busca = String(corpo.busca || '').toLowerCase();
      const aparelhos = (estados || []).filter((x) => grupos[String((x.entity_id || '').split('.')[0])] && !['unavailable', 'unknown'].includes(String(x.state)))
        .map((x) => ({ id: x.entity_id, nome: (x.attributes && x.attributes.friendly_name) || x.entity_id, dominio: String(x.entity_id).split('.')[0], grupo: grupos[String(x.entity_id).split('.')[0]], estado: x.state, unidade: (x.attributes && x.attributes.unit_of_measurement) || '', brilho: x.attributes && x.attributes.brightness, temperatura_atual: x.attributes && (x.attributes.current_temperature != null ? x.attributes.current_temperature : x.attributes.temperature), acoes: acoesDe(String(x.entity_id).split('.')[0]), favorito: !!favs[x.entity_id] }))
        .filter((a) => !busca || String(a.nome).toLowerCase().includes(busca));
      return { aparelhos };
    }
    if (K === 'GET /api/casa/rotinas') {
      const r = await ha('/api/states');
      if (!r.ok) return { __erro: [502, 'Sem resposta do Home Assistant.'] };
      const estados = await r.json().catch(() => []);
      const mapa = { scene: 'Cenas', script: 'Scripts', automation: 'Automações' };
      return { rotinas: (estados || []).filter((x) => mapa[String((x.entity_id || '').split('.')[0])] && !['unavailable', 'unknown'].includes(String(x.state))).map((x) => ({ id: x.entity_id, nome: (x.attributes && x.attributes.friendly_name) || x.entity_id, grupo: mapa[String(x.entity_id).split('.')[0]] })) };
    }
    if (K === 'POST /api/casa/acao') {
      const ident = String(corpo.id || ''), acao = String(corpo.acao || '');
      const dominio = ident.split('.')[0];
      let servico = acao, dados = { entity_id: ident };
      if (acao === 'set_brilho') { servico = 'turn_on'; dados = { entity_id: ident, brightness_percentage: Number(corpo.valor) || 60 }; }
      else if (acao === 'set_temp' && dominio === 'climate') { servico = 'set_temperature'; dados = { entity_id: ident, temperature: Number(corpo.valor) }; }
      const r = await ha('/api/services/' + dominio + '/' + servico, 'POST', dados);
      if (!r.ok) return { __erro: [502, 'O Home Assistant recusou a ação (status ' + r.status + ').'] };
      await new Promise((ok2) => setTimeout(ok2, 300));
      const r2 = await ha('/api/states/' + ident);
      const ap = r2.ok ? await r2.json().catch(() => null) : null;
      return { ok: true, aparelho: ap ? { id: ap.entity_id, estado: ap.state } : null };
    }
    if (K === 'POST /api/casa/favorito') {
      conta.casaFavoritos = conta.casaFavoritos || {};
      if (corpo.favorito) conta.casaFavoritos[String(corpo.id || '')] = true; else delete conta.casaFavoritos[String(corpo.id || '')];
      salvar();
      return { ok: true };
    }
  }

  /* ---------- painel Financeiro ---------- */
  if (rota.startsWith('/api/financeiro/')) {
    if (!conta) return { __erro: [401, 'Faça login.'] };
    const fin = conta.financas = conta.financas || { contas: [], lancamentos: [], faturas: [], investimentos: [], meta: { categorias: ['Moradia', 'Mercado', 'Alimentação', 'Transporte', 'Saúde', 'Educação', 'Lazer', 'Outros'] } };
    const persistir = () => { salvar(); return { ok: true }; };
    const centavos = (t) => { const s = String(t == null ? '' : t).trim().replace(/[^\d,.-]/g, '').replace(/\.(?=\d{3}(\D|$))/g, '').replace(',', '.'); const v = Number(s); return Number.isFinite(v) ? Math.round(v * 100) : null; };
    if (K === 'GET /api/financeiro/meta') return fin.meta;
    if (K === 'POST /api/financeiro/meta' && Array.isArray(corpo.categorias)) { fin.meta = Object.assign({}, fin.meta, corpo); salvar(); return fin.meta; }
    if (K === 'GET /api/financeiro/contas') return { contas: fin.contas };
    if (K === 'POST /api/financeiro/contas') {
      if (corpo.id && Object.keys(corpo).length === 1) { fin.contas = fin.contas.filter((x) => x.id !== corpo.id); return persistir(); }
      if (corpo.id) { const cta = fin.contas.find((x) => x.id === corpo.id); if (!cta) return { __erro: [404, 'Conta não encontrada.'] }; cta.nome = String(corpo.nome != null ? corpo.nome : cta.nome).slice(0, 60); cta.tipo = String(corpo.tipo != null ? corpo.tipo : cta.tipo); salvar(); return { ok: true, contas: fin.contas }; }
      if (!corpo.nome) return { __erro: [400, 'Informe o nome da conta.'] };
      fin.contas.push({ id: id('fc'), nome: String(corpo.nome).slice(0, 60), tipo: String(corpo.tipo || 'conta') }); salvar();
      return { ok: true, contas: fin.contas };
    }
    if (K === 'GET /api/financeiro/lancamentos') {
      let lista = fin.lancamentos;
      if (corpo.conta) lista = lista.filter((l) => l.conta_id === corpo.conta);
      if (corpo.mes) lista = lista.filter((l) => String(l.dia).startsWith(corpo.mes));
      return { lancamentos: lista.slice().sort((a, b) => String(b.dia).localeCompare(String(a.dia))) };
    }
    if (K === 'POST /api/financeiro/lancamentos') {
      if (corpo.id && Object.keys(corpo).length === 1) { fin.lancamentos = fin.lancamentos.filter((x) => x.id !== corpo.id); return persistir(); }
      if (corpo.id) { const l = fin.lancamentos.find((x) => x.id === corpo.id); if (!l) return { __erro: [404, 'Lançamento não encontrado.'] }; Object.assign(l, { descricao: String(corpo.descricao != null ? corpo.descricao : l.descricao).slice(0, 120), valor: centavos(corpo.valor) != null ? centavos(corpo.valor) : l.valor, dia: String(corpo.dia != null ? corpo.dia : l.dia), categoria: String(corpo.categoria != null ? corpo.categoria : (l.categoria || '')), conta_id: String(corpo.conta_id != null ? corpo.conta_id : (l.conta_id || '')) }); salvar(); return { ok: true }; }
      const valor = centavos(corpo.valor);
      if (!corpo.descricao || valor == null) return { __erro: [400, 'Informe a descrição e o valor.'] };
      fin.lancamentos.push({ id: id('fl'), descricao: String(corpo.descricao).slice(0, 120), valor, dia: String(corpo.dia || new Date().toISOString().slice(0, 10)), categoria: String(corpo.categoria || ''), conta_id: String(corpo.conta_id || '') });
      salvar(); return { ok: true };
    }
    if (K === 'GET /api/financeiro/faturas') return { faturas: fin.faturas };
    if (K === 'POST /api/financeiro/faturas') {
      if (corpo.id && Object.keys(corpo).length === 1) { fin.faturas = fin.faturas.filter((x) => x.id !== corpo.id); return persistir(); }
      const valor = centavos(corpo.valor);
      if (corpo.id) { const f = fin.faturas.find((x) => x.id === corpo.id); if (!f) return { __erro: [404, 'Fatura não encontrada.'] }; Object.assign(f, { descricao: String(corpo.descricao != null ? corpo.descricao : f.descricao), valor: valor != null ? valor : f.valor, vencimento: String(corpo.vencimento != null ? corpo.vencimento : f.vencimento), categoria: String(corpo.categoria != null ? corpo.categoria : (f.categoria || '')), conta_id: String(corpo.conta_id != null ? corpo.conta_id : (f.conta_id || '')), paga_em: corpo.paga_em ? String(corpo.paga_em) : f.paga_em }); salvar(); return { ok: true }; }
      if (!corpo.descricao || valor == null) return { __erro: [400, 'Informe a descrição e o valor.'] };
      fin.faturas.push({ id: id('ff'), descricao: String(corpo.descricao).slice(0, 80), valor, vencimento: String(corpo.vencimento || new Date().toISOString().slice(0, 10)), categoria: String(corpo.categoria || ''), conta_id: String(corpo.conta_id || ''), paga_em: null });
      salvar(); return { ok: true };
    }
    if (K === 'GET /api/financeiro/investimentos') return { investimentos: fin.investimentos };
    if (K === 'POST /api/financeiro/investimentos') {
      if (corpo.id && Object.keys(corpo).length === 1) { fin.investimentos = fin.investimentos.filter((x) => x.id !== corpo.id); return persistir(); }
      const aplicado = centavos(corpo.aplicado) != null ? centavos(corpo.aplicado) : 0;
      const atual = centavos(corpo.atual) != null ? centavos(corpo.atual) : aplicado;
      if (corpo.id) { const iv = fin.investimentos.find((x) => x.id === corpo.id); if (!iv) return { __erro: [404, 'Investimento não encontrado.'] }; Object.assign(iv, { nome: String(corpo.nome != null ? corpo.nome : iv.nome), tipo: String(corpo.tipo != null ? corpo.tipo : iv.tipo), aplicado, atual, obs: String(corpo.obs != null ? corpo.obs : (iv.obs || '')) }); salvar(); return { ok: true }; }
      if (!corpo.nome) return { __erro: [400, 'Informe o nome do investimento.'] };
      fin.investimentos.push({ id: id('fi'), nome: String(corpo.nome).slice(0, 80), tipo: String(corpo.tipo || 'Renda fixa'), aplicado, atual, obs: String(corpo.obs || '') });
      salvar(); return { ok: true };
    }
    if (K === 'POST /api/financeiro/importar') {
      const texto = String(corpo.texto || ''), contaId = String(corpo.conta_id || '');
      const criados = [];
      for (const linha of texto.split(/\r?\n/)) {
        const ln = linha.trim();
        if (!ln) continue;
        let dia = null, descricao = '', valor = null;
        const m = ln.match(/^(\d{1,2})\/(\d{1,2})(?:\/(\d{2,4}))?\s+(.+)$/);
        if (m) { const ano = m[3] ? (m[3].length === 2 ? '20' + m[3] : m[3]) : String(new Date().getFullYear()); dia = ano + '-' + m[2].padStart(2, '0') + '-' + m[1].padStart(2, '0'); descricao = m[4]; }
        else { const m2 = ln.match(/^(.+?)\s+(-?R\$)?\s*([\d.,]+)$/); if (m2) { descricao = m2[1]; dia = new Date().toISOString().slice(0, 10); } else continue; }
        const num = ln.match(/-?[\d.,]+\d$/);
        if (num) { valor = centavos(num[0]); if (String(num[0]).trim().startsWith('-') && valor) valor = -Math.abs(valor); }
        if (descricao && valor != null) criados.push({ id: id('fl'), descricao: descricao.slice(0, 120).replace(/[\d.,]+\d$/, '').trim() || descricao.slice(0, 120), valor, dia: dia || new Date().toISOString().slice(0, 10), categoria: '', conta_id: contaId });
      }
      if (!criados.length) return { __erro: [400, 'Não consegui ler lançamentos nesse arquivo. Confira se é OFX ou CSV do banco.'] };
      fin.lancamentos.push(...criados); salvar();
      return { ok: true, criados: criados.length };
    }
    if (K === 'GET /api/financeiro/resumo') {
      const mes = String(corpo.mes || new Date().toISOString().slice(0, 7));
      const doMes = fin.lancamentos.filter((l) => String(l.dia).startsWith(mes));
      const entradas = doMes.filter((l) => l.valor > 0).reduce((s, l) => s + l.valor, 0);
      const saidas = doMes.filter((l) => l.valor < 0).reduce((s, l) => s - l.valor, 0);
      const hoje = new Date().toISOString().slice(0, 10);
      const abertas = fin.faturas.filter((x) => !x.paga_em);
      const meses = [];
      const agora2 = new Date();
      for (let i = 5; i >= 0; i--) { const d = new Date(agora2.getFullYear(), agora2.getMonth() - i, 1); const mm = d.toISOString().slice(0, 7); const lm = fin.lancamentos.filter((l) => String(l.dia).startsWith(mm)); meses.push({ mes: mm, entradas: lm.filter((x) => x.valor > 0).reduce((s, x) => s + x.valor, 0), saidas: lm.filter((x) => x.valor < 0).reduce((s, x) => s - x.valor, 0) }); }
      return { mes, saldo_contas: 0, contas: fin.contas.length, cartoes: 0, saldo_mes: entradas - saidas, entradas, saidas, faturas_total: abertas.reduce((s, x) => s + x.valor, 0), faturas_abertas: abertas.length, faturas_atrasadas: abertas.filter((x) => String(x.vencimento) < hoje).length, proximas: abertas.slice().sort((a, b) => String(a.vencimento).localeCompare(String(b.vencimento))).slice(0, 4), investido: fin.investimentos.reduce((s, x) => s + x.aplicado, 0), investimentos_atual: fin.investimentos.reduce((s, x) => s + x.atual, 0), meses };
    }
  }

  /* ---------- painel Leads (CRM) ---------- */
  if (rota === '/api/leads' || rota.startsWith('/api/leads/')) {
    if (!conta) return { __erro: [401, 'Faça login.'] };
    const crm = conta.leads = conta.leads || { leads: [], sites: [] };
    const resumo = () => { const pe = { novo: 0, contatado: 0, negociando: 0, cliente: 0, perdido: 0 }; for (const l of crm.leads) pe[l.status] = (pe[l.status] || 0) + 1; return { por_etapa: pe, total: crm.leads.length, sites: crm.sites.length, retornar_hoje: 0 }; };
    if (K === 'GET /api/leads') return { leads: crm.leads, resumo: resumo() };
    if (K === 'POST /api/leads') {
      if (!corpo.nome) return { __erro: [400, 'Informe o nome do cliente.'] };
      crm.leads.push({ id: id('ld'), nome: String(corpo.nome).slice(0, 80), categoria: String(corpo.categoria || ''), cidade: String(corpo.cidade || ''), telefone: String(corpo.telefone || ''), notas: String(corpo.notas || ''), status: 'novo', criado_em: new Date().toISOString(), site: null, google: null });
      salvar(); return { ok: true, leads: crm.leads, resumo: resumo() };
    }
    if (K === 'POST /api/leads/ia' || K === 'POST /api/leads/ia/executar' || K === 'POST /api/leads/ia/salvar') return { __erro: [501, 'Nenhuma IA conectada.'] };
    if (K === 'GET /api/leads/exemplos/lista') return { exemplos: [], pode_usar: true };
    if (K === 'GET /api/leads/sites') return { sites: crm.sites };
    if (K === 'POST /api/leads/sites') { const s = { id: id('st'), nome: String(corpo.nome || 'Site do cliente').slice(0, 80), lead_id: String(corpo.lead_id || ''), no_ar: false, criado_em: new Date().toISOString() }; crm.sites.push(s); salvar(); return { ok: true, site: s }; }
    const mLead = rota.match(/^\/api\/leads\/([^/]+)(\/google)?$/);
    if (mLead) {
      const lead = crm.leads.find((l) => l.id === mLead[1]);
      if (!lead) return { __erro: [404, 'Lead não encontrado.'] };
      if (mLead[2] === '/google' && metodo === 'POST') return { lead: Object.assign({}, lead, { google_desatualizado: true }) };
      if (metodo === 'GET') return { lead };
      if (metodo === 'PUT') { for (const k of ['nome', 'categoria', 'cidade', 'telefone', 'notas', 'status']) if (corpo[k] !== undefined) lead[k] = String(corpo[k]).slice(0, k === 'notas' ? 4000 : 80); salvar(); return { lead }; }
      if (metodo === 'DELETE') { crm.leads = crm.leads.filter((l) => l.id !== lead.id); salvar(); return { ok: true }; }
    }
  }

  /* ---------- painel Logs ---------- */
  if (K === 'GET /api/logs/eventos') {
    if (!conta) return { __erro: [401, 'Faça login.'] };
    conta.logs = conta.logs || [];
    return { eventos: conta.logs.slice(-150).reverse().map((l) => ({ tipo: 'Conexão com o site', texto: l.texto, quando: l.em })) };
  }
  if (K === 'GET /api/logs') {
    if (!conta) return { __erro: [401, 'Faça login.'] };
    conta.logs = conta.logs || [];
    const nivel = String(corpo.nivel || '').toUpperCase(), busca = String(corpo.busca || '').toLowerCase();
    const linhas = conta.logs.slice(-400).reverse().filter((l) => (!nivel || String(l.nivel).toUpperCase() === nivel) && (!busca || String(l.texto).toLowerCase().includes(busca))).map((l) => ({ em: l.em, nivel: l.nivel, msg: l.texto }));
    const contagem = { INFO: 0, AVISO: 0, ERRO: 0 };
    const dia = Date.now() - 864e5;
    for (const l of conta.logs) if (new Date(l.em).getTime() > dia) contagem[String(l.nivel).toUpperCase()] = (contagem[String(l.nivel).toUpperCase()] || 0) + 1;
    return { linhas, contagem };
  }
  const logar = (niv, txt) => { if (!conta) return; conta.logs = conta.logs || []; conta.logs.push({ em: new Date().toISOString(), nivel: String(niv).toUpperCase().slice(0, 10), texto: String(txt).slice(0, 500) }); if (conta.logs.length > 400) conta.logs = conta.logs.slice(-400); salvar(); };
  if (K === 'POST /api/logs/evento') { logar(corpo.nivel || 'INFO', corpo.texto || ''); return { ok: true }; }

  /* ---------- painel Monitor ---------- */
  if (rota.startsWith('/api/monitor/')) {
    if (!conta) return { __erro: [401, 'Faça login.'] };
    const bem = conta.bemestar = conta.bemestar || { dormir: '23:00', pausas: true, beber_agua: false, ultimos: {} };
    if (K === 'GET /api/monitor/saude') return { nota: 100, ligado_horas: 0, computador: 'JARVIS Web (sem o app do PC)', ramLivreGB: null, ramTotalGB: null, cpuModelo: null, nucleos: null, bateria: null, processos: [], alertas: ['Os dados do computador aparecem com o app do JARVIS instalado no PC.'] };
    if (K === 'GET /api/monitor/atividade') return { ligado: false, minutos: 0, primeiro: null, ultimo: null, por_hora: Array(24).fill(0), semana: [] };
    if (K === 'POST /api/monitor/atividade/apagar') return { ok: true };
    if (K === 'GET /api/monitor/bemestar') return bem;
    if (K === 'POST /api/monitor/bemestar') { for (const k of ['dormir', 'pausas', 'beber_agua', 'postura']) if (corpo[k] !== undefined) bem[k] = corpo[k]; salvar(); return bem; }
  }

  /* ---------- painel Negócio (contrato completo) ---------- */
  if (K === 'GET /api/dono/negocio') {
    if (!conta) return { __erro: [401, 'Faça login.'] };
    return { faturamento: 0, vendas: 0, cadastros: db.contas.length, gasto_anuncios: 0, gasto_meta: 0, gasto_google: 0, reembolsos: 0, taxas: 0, comissoes: 0, lucro: 0, margem_pct: null, roi_pct: null, investimento: 0, serie: [], custos: { mensal_total: 0, itens: [] }, meta: { configurado: false }, extras_jarvis: { contas: db.contas.length, sessoes: Object.keys(db.sessoes).length, projetos: db.projetos.length, eventos: db.coletiva.eventos } };
  }

  /* ---------- painel Fontes ---------- */
  if (K === 'GET /api/fontes') {
    if (!conta) return { __erro: [401, 'Faça login.'] };
    const mem = conta.memoria || [];
    return { ia_atual: null, ias: [],
      conectores: [
        { id: 'clima', nome: 'Clima', configurado: true, detalhe: 'Previsão real via MET.no' },
        { id: 'memoria', nome: 'Memória', configurado: mem.length > 0, detalhe: mem.length ? mem.length + ' lembrança(s)' : 'Nenhuma lembrança ainda' },
        { id: 'casa', nome: 'Casa', configurado: Boolean(conta.casa && conta.casa.url), detalhe: 'Home Assistant' },
        { id: 'busca', nome: 'Busca na internet', configurado: true, detalhe: 'DuckDuckGo (modo Agente)' },
      ],
      canais: [
        { id: 'web', nome: 'Site JARVIS', detalhe: 'Este site, com a sua conta', url: 'https://mlk010173.github.io/jarvis/', estado: 'ativo' },
        { id: 'app', nome: 'App do PC', detalhe: 'Requer o aplicativo instalado no computador', url: '', estado: 'desligado' },
      ],
      memoria: { total: mem.length, itens: mem.slice(0, 50).map((m) => ({ texto: m.texto || String(m), em: m.em || null })) },
      obsidian: { conectado: false } };
  }
  if (K === 'POST /api/fontes/memoria/apagar') {
    if (!conta) return { __erro: [401, 'Faça login.'] };
    conta.memoria = []; salvar();
    return { ok: true };
  }

  /* ---------- designer: componentes HTML+CSS (tudo liberado) ---------- */
  if (K === 'GET /api/ui/componentes') return { base_css: BASE_UI_CSS, nome_plano: 'Premium', logado: Boolean(conta), liberados: COMPONENTES_UI.length, total: COMPONENTES_UI.length, plano: 'premium', proximo: null, niveis: { free: { nome: 'Free', total: 4 }, basic: { nome: 'Basic', total: 4 }, premium: { nome: 'Premium', total: COMPONENTES_UI.length } }, categorias: [...new Set(COMPONENTES_UI.map((x) => x.categoria))], componentes: COMPONENTES_UI.map((x) => Object.assign({}, x, { liberado: true })) };
  if (K === 'GET /api/ui/pro') return { total: 0, componentes: [], plano: 'premium', proximo: null, servidor: '', midia_base: '' };

  /* ---------- voz de estúdio: ElevenLabs (opcional, chave da conta) ---------- */
  if (rota.startsWith('/api/voz/')) {
    if (!conta) return { __erro: [401, 'Faça login.'] };
    const voz = conta.voz = conta.voz || { chave: '', voz_id: '21m00Tcm4TlvDq8ikWAM', on: false };
    if (K === 'GET /api/voz/config') return { on: voz.on, voz_id: voz.voz_id, tem_chave: Boolean(voz.chave), padrao: '21m00Tcm4TlvDq8ikWAM' };
    if (K === 'PUT /api/voz/config') {
      if (corpo.chave !== undefined) voz.chave = String(corpo.chave).trim();
      if (corpo.voz_id !== undefined) voz.voz_id = String(corpo.voz_id).trim();
      if (corpo.on !== undefined) voz.on = Boolean(corpo.on);
      salvar();
      return { on: voz.on, voz_id: voz.voz_id, tem_chave: Boolean(voz.chave) };
    }
    if (K === 'GET /api/voz/vozes') {
      if (!voz.chave) return { __erro: [400, 'Configure a chave da ElevenLabs primeiro (/voz chave SUA_CHAVE).'] };
      const r = await fetch('https://api.elevenlabs.io/v1/voices', { headers: { 'xi-api-key': voz.chave } });
      const j = await r.json().catch(() => null);
      if (!r.ok || !j || !j.voices) return { __erro: [502, 'ElevenLabs não respondeu (chave correta?).'] };
      return { vozes: j.voices.map((v) => ({ id: v.voice_id, nome: v.name, idiomas: (v.labels || {}).language || '' })) };
    }
    if (K === 'POST /api/voz/elevenlabs') {
      const texto = String(corpo.texto || '').slice(0, 2000);
      if (!texto) return { __erro: [400, 'Sem texto para falar.'] };
      if (!voz.chave) return { __erro: [400, 'Voz de estúdio sem chave: use /voz chave SUA_CHAVE (11labs.io).' ] };
      const r = await fetch('https://api.elevenlabs.io/v1/text-to-speech/' + encodeURIComponent(voz.voz_id) + '?output_format=mp3_44100_128', {
        method: 'POST', headers: { 'xi-api-key': voz.chave, 'Content-Type': 'application/json', 'Accept': 'audio/mpeg' },
        body: JSON.stringify({ text: texto, model_id: 'eleven_multilingual_v2' }),
      });
      if (!r.ok) { const e = await r.json().catch(() => null); return { __erro: [502, 'ElevenLabs recusou: ' + ((e && e.detail && e.detail.message) || ('status ' + r.status)) ] }; }
      const buf = Buffer.from(await r.arrayBuffer());
      return { ok: true, formato: 'mp3', audio_base64: buf.toString('base64') };
    }
  }

  /* ---------- MCP: catálogo e execução de ferramentas ---------- */
  if (K === 'GET /api/mcp/ferramentas') return { ferramentas: [
    { nome: 'clima', descricao: 'Previsão do tempo (MET.no)', entrada: { cidade: 'string' }, rota: '/api/web/clima?cidade=' },
    { nome: 'moeda', descricao: 'Cotação entre duas moedas', entrada: { de: 'string', para: 'string' }, rota: '/api/web/moeda?de=USD&para=BRL' },
    { nome: 'cripto', descricao: 'Preço de criptomoeda em reais', entrada: { id: 'string (bitcoin, ethereum, solana, cardano, dogecoin)' }, rota: '/api/web/cripto?id=bitcoin' },
    { nome: 'wiki', descricao: 'Resumo da Wikipédia em português', entrada: { q: 'string' }, rota: '/api/web/wiki?q=' },
    { nome: 'feriados', descricao: 'Feriados nacionais do Brasil', entrada: { ano: 'number' }, rota: '/api/web/feriados?ano=' },
    { nome: 'pesquisar', descricao: 'Busca na internet (DuckDuckGo)', entrada: { q: 'string' }, rota: '/api/web/pesquisar?q=' },
    { nome: 'abrir', descricao: 'Abre uma página e devolve o texto', entrada: { url: 'string' }, rota: '/api/web/abrir?url=' },
    { nome: 'noticias', descricao: 'Manchetes do Brasil agora', entrada: {}, rota: '/api/web/briefing' },
    { nome: 'chat', descricao: 'Conversa com a IA conectada da conta', entrada: { mensagens: 'array {role, content}', projeto_id: 'string' }, rota: '/api/projetos/{id}/testar' },
  ] };
  if (K === 'POST /api/mcp/executar') {
    if (!conta) return { __erro: [401, 'Faça login.'] };
    const f = String(corpo.ferramenta || ''), a = corpo.args || {};
    try {
      if (f === 'pesquisar') return await pesquisarWeb(String(a.q || ''));
      if (f === 'abrir') return await abrirWeb(String(a.url || ''));
      const rotaF = '/api/web/' + f;
      return await api(req, res, rotaF, 'GET', a, conta);
    } catch (e) { return { __erro: [400, e.message || 'Ferramenta falhou.'] }; }
  }

  return { __erro: [404, 'Rota não encontrada.'] };
}
function semSecretos(p) { const { chaves, ...resto } = p; return resto; }

/* ---------- estáticos ---------- */
const MIME = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8', '.svg': 'image/svg+xml', '.json': 'application/json', '.png': 'image/png', '.jpg': 'image/jpeg', '.woff2': 'font/woff2', '.webp': 'image/webp', '.ico': 'image/x-icon' };
function servirArquivo(res, cam) {
  let f = path.join(ROOT, cam);
  if (!f.startsWith(ROOT)) return erro(res, 403, 'Negado.');
  fs.readFile(f, (e, b) => {
    if (e) return erro(res, 404, 'Página não encontrada.');
    res.writeHead(200, { 'Content-Type': MIME[path.extname(f).toLowerCase()] || 'application/octet-stream' });
    res.end(b);
  });
}

/* ---------- servidor ---------- */
http.createServer(async (req, res) => {
  const u = new URL(req.url, 'http://x');
  const rota = decodeURIComponent(u.pathname);

  if (req.method === 'OPTIONS') { res.writeHead(204, CT.json); return res.end(); }

  // bridge (formato do api-bridge.js: POST {rota, metodo, corpo, token})
  if (rota === '/bridge' && req.method === 'POST') {
    const corpo = await lerBody(req);
    const conta = contaDoToken(corpo.token);
    const r = await api(req, res, corpo.rota, corpo.metodo || 'GET', corpo.corpo || {}, conta);
    if (r === null) return; // stream já enviado
    if (r && r.__erro) return erro(res, r.__erro[0], r.__erro[1]);
    res.writeHead(200, CT.json); return res.end(JSON.stringify(r));
  }

  if (rota.startsWith('/api/')) {
    const corpo = req.method === 'POST' || req.method === 'PUT' ? await lerBody(req) : Object.fromEntries(u.searchParams);
    const conta = contaDoToken(tokenDe(req, corpo));
    const r = await api(req, res, rota, req.method, corpo, conta);
    if (r === null) return; // resposta já enviada (ex.: stream do instalador)
    if (r && r.__erro) return erro(res, r.__erro[0], r.__erro[1]);
    res.writeHead(200, CT.json);
    return res.end(JSON.stringify(r));
  }

  // páginas: / → jarvis/index.html, /jarvis/* → jarvis/*, raiz limpa para os .html do root
  if (rota === '/' || rota === '/jarvis' || rota === '/jarvis/') return servirArquivo(res, 'jarvis/index.html');
  if (rota.startsWith('/jarvis/')) return servirArquivo(res, 'jarvis/' + rota.slice(8).split('?')[0].replace(/\/$/, '') || 'index.html');
  return servirArquivo(res, rota.slice(1).replace(/\/$/, ''));
}).listen(PORT, () => console.log('JARVIS rodando em http://localhost:' + PORT));
