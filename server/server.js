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
  const K = metodo + ' ' + rota;

  /* públicas */
  if (ROTAS[K]) return ROTAS[K]();
  if (K === 'GET /api/dono/eu') return { dono: false, papel: null };

  /* rotas admin descobertas na auditoria da API oficial (19/10/2026, brute-force autorizado):
     todas exigem dono ou equipe (GET, e 3 de escrita: POST equipe/cupons, PUT leads); o backend local não tem dono, então responde honesto. */
  if (K === 'GET /api/admin/eu') return { erro: 'Área restrita ao dono e à equipe.', dono: false, papel: null };
  if (K === 'GET /api/admin/vendas') return { erro: 'Área restrita ao dono e à equipe.', dono: false };
  if (K === 'GET /api/admin/equipe') return { erro: 'Área restrita ao dono e à equipe.', dono: false };
  if (K === 'GET /api/admin/cupons') return { erro: 'Área restrita ao dono e à equipe.', dono: false };
  if (K === 'GET /api/admin/relatorios') return { erro: 'Área restrita ao dono e à equipe.', dono: false };
  if (K === 'GET /api/admin/resumo') return { erro: 'Área restrita ao dono.', dono: false };
  if (K === 'GET /api/admin/planos') return { erro: 'Área restrita ao dono.', dono: false };
  if (K === 'GET /api/admin/usuarios') return { erro: 'Área restrita ao dono.', dono: false };
  if (K === 'GET /api/admin/assinaturas') return { erro: 'Área restrita ao dono.', dono: false };
  if (K === 'GET /api/admin/leads') return { erro: 'Área restrita ao dono.', dono: false };
  if (K === 'GET /api/admin/push') return { erro: 'Área restrita ao dono.', dono: false };
  if (K === 'GET /api/admin/auditoria') return { erro: 'Área restrita ao dono.', dono: false };
  if (K === 'GET /api/admin/contas') return { erro: 'Área restrita ao dono.', dono: false };
  if (K === 'GET /api/admin/analytics') return { erro: 'Área restrita ao dono e à equipe.', dono: false };
  if (K === 'GET /api/admin/clientes') return { erro: 'Área restrita ao dono e à equipe.', dono: false };
  if (K === 'GET /api/admin/licencas') return { erro: 'Área restrita ao dono.', dono: false };
  if (K === 'GET /api/admin/sites') return { erro: 'Área restrita ao dono.', dono: false };
  if (K === 'GET /api/admin/transacoes') return { erro: 'Área restrita ao dono.', dono: false };
  if (K === 'GET /api/admin/contas/') return { erro: 'Área restrita ao dono.', dono: false }; /* padrão /:id */
  if (K === 'POST /api/admin/equipe') return { erro: 'Área restrita ao dono.', dono: false };
  if (K === 'POST /api/admin/cupons') return { erro: 'Área restrita ao dono.', dono: false };
  if (K === 'PUT /api/admin/leads') return { erro: 'Área restrita ao dono.', dono: false };
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
    /^\/api\/v1\//,
  ];
  if (!conta && PROTEGIDAS.some((re) => re.test(rota))) return { __erro: [401, 'Faça login.'] };

  if (K === 'GET /api/conta/assinatura') return { plano: conta.plano || 'jarvis', status: 'ativo', cobranca: 'aberto' };
  if (K === 'GET /api/conta/discord') return { vinculado: Boolean(conta.discord), tag: conta.discord ? conta.discord.tag : null };
  if (K === 'POST /api/conta/discord') return { __erro: [501, 'Vinculação Discord requer o servidor oficial.'] };
  if (K === 'GET /api/conta/pcs' || K === 'GET /api/conta/pcs/') return { pcs: conta.pcs || [] };
  if (K === 'GET /api/conta/google/ativo') return { ativo: Boolean(conta.google) };
  if (K === 'GET /api/dono/negocio') return {
    negocio: { contas: db.contas.length, projetos: db.projetos.length, sessoes: Object.keys(db.sessoes).length, eventos: db.coletiva.eventos },
    aviso: 'Estatísticas deste servidor (dados locais).' };
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
