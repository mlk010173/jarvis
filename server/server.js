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
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const PORT = process.env.PORT || 3000;
const ROOT = path.resolve(__dirname, '..');
const DATA = path.join(__dirname, 'data');
const DB = path.join(DATA, 'db.json');
const SESSOES_DIAS = 30;

/* ---------- armazenamento ---------- */
let db = null;
function carregar() {
  try { db = JSON.parse(fs.readFileSync(DB, 'utf8')); }
  catch { db = { contas: [], projetos: [], sessoes: {}, coletiva: { eventos: 0, lotes: 0 } }; }
  if (!db.contas) db.contas = [];
  if (!db.projetos) db.projetos = [];
  if (!db.sessoes) db.sessoes = {};
  if (!db.coletiva) db.coletiva = { eventos: 0, lotes: 0 };
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
  { id: 'serio', nome: 'Sério', resumo: 'Direto e profissional, sem brincadeiras.' },
  { id: 'amigavel', nome: 'Amigável', resumo: 'Leve e próximo, com bom humor na medida.' },
  { id: 'professor', nome: 'Professor', resumo: 'Explica passo a passo, com exemplos.' },
  { id: 'tecnico', nome: 'Técnico', resumo: 'Preciso, denso, sem rodeios.' },
] };
const INFO = { marca: 'JARVIS', limites: { gratis: 100, pro: 5000 }, provedores: [] };
const NOVIDADES = { gerado: new Date().toISOString(), atual: '1.1.0', versoes: [
  { versao: '1.1.0', data: '19/10/2026', destaques: ['Frontend completo no repositório (landing, app, painéis)', 'Backend próprio (server/server.js) com o mesmo contrato da API', 'GitHub Pages online com api-bridge configurável'] },
] };
const PLANOS = { planos: [ { id: 'jarvis', nome: 'JARVIS', publico: 'Versão web aberta do projeto', preco_centavos: 0, precos: null, periodo: 'aberto' } ] };
const VITRINE = { base_css: ':root{--jv-azul:#2E9BFF;--jv-ciano:#00D2FF;--jv-fundo:#04101b;--jv-caixa:#050c16;--jv-linha:rgba(46,155,255,.25)}' };

async function climaExtern(cidade) {
  // Open-Meteo (gratuito, sem chave) — geocoding + previsão
  const g = await fetch('https://geocoding-api.open-meteo.com/v1/search?count=1&language=pt&name=' + encodeURIComponent(cidade || 'São Paulo')).then(r => r.json()).catch(() => null);
  if (!g || !g.results || !g.results.length) return { erro: 'Cidade não encontrada.' };
  const l = g.results[0];
  const m = await fetch(`https://api.open-meteo.com/v1/forecast?latitude=${l.latitude}&longitude=${l.longitude}&current=temperature_2m,relative_humidity_2m,weather_code,wind_speed_10m&daily=temperature_2m_max,temperature_2m_min&timezone=auto&forecast_days=1`).then(r => r.json()).catch(() => null);
  if (!m) return { erro: 'Serviço de clima indisponível.' };
  return { cidade: l.name, atual: m.current, hoje: m.daily };
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

// proxy para IAs BYOK (OpenAI-compatível) — só se a conta tiver chave salva
async function chamarIA(ia, mensagens) {
  const base = ia.base_url || 'https://api.openai.com/v1';
  const r = await fetch(base + '/chat/completions', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + ia.chave },
    body: JSON.stringify({ model: ia.modelo || 'gpt-4o-mini', messages: mensagens.slice(-20), max_tokens: 900 }),
  });
  const j = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error(j.error?.message || 'IA indisponível');
  return { texto: j.choices?.[0]?.message?.content || '', modelo: j.model || ia.modelo };
}

const ROTAS = {
  'GET /api/info': () => INFO,
  'GET /api/novidades': () => NOVIDADES,
  'GET /api/comercial/planos': () => PLANOS,
  'GET /api/web/personalidades': () => PESSOAS,
  'GET /api/ui/vitrine': () => VITRINE,
  'GET /api/download/info': () => ({ disponivel: false, versao: '1.1.0', bytes: 0, sha256: '' }),
};

async function api(req, res, rota, metodo, corpo, conta) {
  const K = metodo + ' ' + rota;

  /* públicas */
  if (ROTAS[K]) return ROTAS[K]();
  if (K === 'GET /api/dono/eu') return { dono: false, papel: null };
  if (K === 'GET /api/ponte/apps') return { apps: [] };
  if (K === 'POST /api/ponte/comando') return { erro: 'Nenhum PC conectado.' };
  if (K === 'GET /api/web/clima') return climaExtern(String(corpo.cidade || 'São Paulo'));
  if (K === 'POST /api/web/clima') return climaExtern(String((corpo || {}).cidade || 'São Paulo'));
  if (K === 'POST /api/web/melhorar-prompt') return melhorarPrompt((corpo || {}).texto);
  if (K === 'POST /api/coletiva/lote') { db.coletiva.eventos += (corpo.eventos || []).length; db.coletiva.lotes++; salvar(); return { ok: true }; }

  /* conta — sessão */
  if (K === 'GET /api/conta/sessao') return { logado: Boolean(conta), email: conta ? conta.email : null };
  if (K === 'POST /api/conta/cadastro') {
    const { nome, email, senha } = corpo || {};
    if (!nome || !email || !senha || senha.length < 8) return { __erro: [400, 'Confira nome, e-mail e senha (mínimo 8 caracteres).'] };
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
    return { token: novaSessao(email), usuario: { nome: c.nome, email: c.email } };
  }
  if (K === 'POST /api/conta/sair') { const t = tokenDe(req, corpo); if (t) { delete db.sessoes[t]; salvar(); } return { ok: true }; }

  /* daqui pra baixo: precisa login */
  if (!conta) return { __erro: [401, 'Faça login.'] };

  if (K === 'GET /api/conta/eu') return { usuario: { nome: conta.nome, email: conta.email }, uso_hoje: 0, limite: 100 };
  if (K === 'GET /api/conta/plano') return { id: conta.plano || 'jarvis', nome: 'JARVIS', uso_hoje: 0, limite: 100 };
  if (K === 'GET /api/conta/preferencias') return conta.preferencias || {};
  if (K === 'PUT /api/conta/preferencias') { conta.preferencias = corpo || {}; salvar(); return conta.preferencias; }
  if (K === 'GET /api/conta/memoria') return { itens: conta.memoria || [] };
  if (K === 'PUT /api/conta/memoria') { conta.memoria = (corpo.itens || corpo || []).slice(0, 500); salvar(); return { itens: conta.memoria }; }
  if (K === 'GET /api/conta/ias') return { ias: (conta.ias || []).map(i => ({ id: i.id, provedor: i.provedor, modelo: i.modelo, ativa: i.ativa })) };
  if (K === 'POST /api/conta/ias') {
    const { provedor, chave, base_url, modelo } = corpo || {};
    if (!provedor || !chave) return { __erro: [400, 'Informe provedor e chave.'] };
    const i = { id: id('ia'), provedor, chave, base_url, modelo, ativa: true };
    conta.ias = conta.ias || []; conta.ias.push(i); salvar();
    return { id: i.id, provedor, modelo, ativa: true };
  }
  if (K === 'PUT /api/conta/ias-ordem') { const ordem = corpo.ordem || []; conta.ias = (conta.ias || []).sort((a, b) => ordem.indexOf(a.id) - ordem.indexOf(b.id)); salvar(); return { ok: true }; }

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
      const ia = (conta.ias || []).find(i => i.ativa);
      if (!ia) return { __erro: [400, 'Nenhuma IA conectada. Configure em Minhas IAs.'] };
      const mensagens = [{ role: 'system', content: (p.instrucoes || '') + ' Você é ' + (p.assistente || 'JARVIS') + '.' }].concat((corpo.mensagens || []).slice(-20));
      try { const r = await chamarIA(ia, mensagens); p.usos = (p.usos || 0) + 1; salvar(); return r; }
      catch (e) { return { __erro: [502, e.message || 'Todas as IAs falharam.'] }; }
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

  return { __erro: [404, 'Rota não disponível no JARVIS.'] };
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
    if (r && r.__erro) return erro(res, r.__erro[0], r.__erro[1]);
    res.writeHead(200, CT.json); return res.end(JSON.stringify(r));
  }

  if (rota.startsWith('/api/')) {
    const corpo = req.method === 'POST' || req.method === 'PUT' ? await lerBody(req) : Object.fromEntries(u.searchParams);
    const conta = contaDoToken(tokenDe(req, corpo));
    const r = await api(req, res, rota, req.method, corpo, conta);
    if (r && r.__erro) return erro(res, r.__erro[0], r.__erro[1]);
    res.writeHead(200, CT.json);
    return res.end(JSON.stringify(r));
  }

  // páginas: / → jarvis/index.html, /jarvis/* → jarvis/*, raiz limpa para os .html do root
  if (rota === '/' || rota === '/jarvis' || rota === '/jarvis/') return servirArquivo(res, 'jarvis/index.html');
  if (rota.startsWith('/jarvis/')) return servirArquivo(res, 'jarvis/' + rota.slice(8).split('?')[0].replace(/\/$/, '') || 'index.html');
  return servirArquivo(res, rota.slice(1).replace(/\/$/, ''));
}).listen(PORT, () => console.log('JARVIS rodando em http://localhost:' + PORT));
