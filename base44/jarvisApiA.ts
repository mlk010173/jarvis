// JARVIS backend v1.3.3 — PARTE A (core): contas, sessões, IAs, chat, agente, web, voz, MCP, SDK v1, monitor de IA.
// Painéis e conteúdo ficam na função jarvisApi2; rotas de painel são encaminhadas no fim deste arquivo.
// JARVIS – backend real do site (Base44 backend function)
// Rotas da API do JARVIS: contas, sessões, preferências, projetos, clima, moedas, cripto, wiki,
// feriados, GitHub, briefing (notícias reais), casa (Home Assistant real), financeiro, leads,
// logs, monitor, negócio e biblioteca de componentes de UI. Tudo real: sem chave é erro honesto.
import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

const CORS: Record<string, string> = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
  'Content-Type': 'application/json; charset=utf-8',
};
const json = (obj: unknown, status = 200) => new Response(JSON.stringify(obj), { status, headers: CORS });
const erro = (msg: string, status = 400) => json({ erro: msg }, status);

// ---------- cripto real (PBKDF2-SHA256, 60k iterações, salt aleatório) ----------
const hex = (b: ArrayBuffer | Uint8Array) => [...new Uint8Array(b)].map((x) => x.toString(16).padStart(2, '0')).join('');
const unhex = (h: string) => new Uint8Array((h.match(/../g) || []).map((x) => parseInt(x, 16)));
async function hashSenha(senha: string, saltHex: string): Promise<string> {
  const key = await crypto.subtle.importKey('raw', new TextEncoder().encode(senha), 'PBKDF2', false, ['deriveBits']);
  const bits = await crypto.subtle.deriveBits({ name: 'PBKDF2', hash: 'SHA-256', salt: unhex(saltHex), iterations: 60000 }, key, 256);
  return hex(bits);
}

// ---------- limite real por token (anti-abuso) ----------
const ratos = new Map<string, { n: number; reset: number }>();
function rateLimit(chave: string): boolean {
  const agora = Date.now();
  const r = ratos.get(chave);
  if (!r || r.reset < agora) { ratos.set(chave, { n: 1, reset: agora + 60000 }); return true; }
  r.n++;
  return r.n <= 120;
}

// ---------- plano do JARVIS: tudo liberado (premium) ----------
const PLANO = {
  plano: 'premium', nome: 'Premium', pago: true, continua: true, expira_em: null, origem: 'jarvis',
  limites: { ias_max: 10, modulos: 50, projetos: 100, memoria: 1000000 },
};

const VERSAO = '1.3.3';

// ---------- v1.3.1/1.3.2 portadas: observabilidade, SSRF, rate limit, cripto BYOK ----------
const PRECO_1M_USD: any[][] = [ [/gpt-4o-mini/, 0.15, 0.6], [/gpt-4o\b/, 2.5, 10], [/^o\d/, 1.25, 10], [/claude-3-5-haiku/, 0.8, 4], [/claude.*haiku/, 1, 5], [/claude.*sonnet/, 3, 15], [/gemini-2.0-flash/, 0.1, 0.4], [/gemini/, 0.3, 1.2], [/deepseek/, 0.14, 0.28], [/mistral-small/, 0.2, 0.6], [/grok/, 0.5, 2] ]; // entrada, saída por 1M tokens (estimativa)
const OBS = { log: <any[]>[] };
const RL = new Map<string, number[]>();
const mesAtual = () => new Date().toISOString().slice(0, 7);
const custoUsd = (modelo: any, tin: any, tout: any) => {
  const p = PRECO_1M_USD.find((x) => x[0].test(String(modelo || '')));
  if (!p) return 0; // modelos free e desconhecidos: 0
  return (Number(tin || 0) / 1e6) * p[1] + (Number(tout || 0) / 1e6) * p[2];
};
function registrarObs(ev: any) {
  ev.mes = mesAtual();
  OBS.log.push(ev);
  if (OBS.log.length > 800) OBS.log.splice(0, OBS.log.length - 800);
}
function rlPermitir(chave: string, max: number, janelaMs = 60e3) {
  const agora = Date.now();
  const lista = (RL.get(chave) || []).filter((t) => agora - t < janelaMs);
  if (lista.length >= max) return false;
  lista.push(agora);
  RL.set(chave, lista);
  return true;
}
// guarda SSRF: só endereços https públicos
const hostPermitido = (u: any) => {
  let h: string;
  try { h = new URL(String(u || '')).hostname; } catch { return false; }
  if (!/^https:/.test(String(u || ''))) return false;
  if (/^(localhost|.*\.local)$/i.test(h)) return false;
  if (/^(10\.|127\.|192\.168\.|169\.254\.|0\.)/.test(h)) return false;
  const m172 = h.match(/^172\.(\d+)\./); if (m172 && +m172[1] >= 16 && +m172[1] <= 31) return false;
  if (h === '::1' || h === '[::1]' || h === '::') return false;
  return true;
};
// BYOK cifrado em repouso: AES-256-GCM com chave mestra do ambiente (sem chave => texto puro e estado honesto)
const CHAVE_MESTRA = ''; // cifra BYOK em repouso desativada neste deploy (para ativar: configure JARVIS_MASTER_KEY no ambiente)
const b64 = (b: any) => btoa(String.fromCharCode(...new Uint8Array(b)));
const deB64 = (s: string) => Uint8Array.from(atob(s), (ch) => ch.charCodeAt(0));
async function chaveCripto(raw: ArrayBuffer) { return crypto.subtle.importKey('raw', raw, 'AES-GCM', false, ['encrypt', 'decrypt']); }
async function cifra(texto: string) {
  if (!CHAVE_MESTRA) return texto;
  try {
    const chaveRaw = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(CHAVE_MESTRA));
    const iv = crypto.getRandomValues(new Uint8Array(12));
    const cr = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, await chaveCripto(chaveRaw), new TextEncoder().encode(texto));
    return 'enc1:' + b64(iv) + ':' + b64(cr);
  } catch { return texto; }
}
async function decifra(v: any) {
  const s = String(v ?? '');
  if (!s.startsWith('enc1:')) return s;
  if (!CHAVE_MESTRA) throw new Error('Chave de IA cifrada, mas JARVIS_MASTER_KEY não está configurada no ambiente.');
  try {
    const [_, ivS, dS] = s.split(':');
    const chaveRaw = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(CHAVE_MESTRA));
    const pt = await crypto.subtle.decrypt({ name: 'AES-GCM', iv: deB64(ivS) }, await chaveCripto(chaveRaw), deB64(dS));
    return new TextDecoder().decode(pt);
  } catch { throw new Error('Não foi possível decifrar a chave de IA.'); }
}

// ---------- catálogo de provedores de IA (BYOK: a conta traz a própria chave) ----------
const CATALOGO_IAS: any[] = [
  { id: 'gemini', nome: 'Google Gemini', tipo: 'gemini', site: 'https://aistudio.google.com/apikey', gratis: true, modelo_padrao: 'gemini-2.0-flash', recomendacao: { posicao: 1, motivo: 'Plano gratuito generoso do Google e respostas rápidas — comece por aqui.' } },
  { id: 'openai', nome: 'OpenAI', tipo: 'openai', site: 'https://platform.openai.com/api-keys', gratis: false, modelo_padrao: 'gpt-4o-mini', base: 'https://api.openai.com/v1', recomendacao: { posicao: 2, motivo: 'A mais usada do mercado, ótima qualidade no modelo mini.' } },
  { id: 'anthropic', nome: 'Anthropic Claude', tipo: 'anthropic', site: 'https://console.anthropic.com/settings/keys', gratis: false, modelo_padrao: 'claude-3-5-haiku-latest', recomendacao: { posicao: 3, motivo: 'Excelente escrita e raciocínio.' } },
  { id: 'groq', nome: 'Groq', tipo: 'openai', site: 'https://console.groq.com/keys', gratis: true, base: 'https://api.groq.com/openai/v1', modelo_padrao: 'llama-3.3-70b-versatile', recomendacao: { posicao: 4, motivo: 'Grátis e absurdamente rápido (Llama).' } },
  { id: 'openrouter', nome: 'OpenRouter', tipo: 'openai', site: 'https://openrouter.ai/keys', gratis: true, base: 'https://openrouter.ai/api/v1', modelo_padrao: 'meta-llama/llama-3.3-70b-instruct:free', recomendacao: { posicao: 5, motivo: 'Uma chave, dezenas de modelos (inclusive gratuitos).' } },
  { id: 'deepseek', nome: 'DeepSeek', tipo: 'openai', site: 'https://platform.deepseek.com/api_keys', gratis: false, base: 'https://api.deepseek.com/v1', modelo_padrao: 'deepseek-chat', recomendacao: { posicao: 6, motivo: 'Custo baixo e bom raciocínio.' } },
  { id: 'mistral', nome: 'Mistral', tipo: 'openai', site: 'https://console.mistral.ai/api-keys', gratis: false, base: 'https://api.mistral.ai/v1', modelo_padrao: 'mistral-small-latest', recomendacao: { posicao: 7, motivo: 'Modelos europeus, preço justo.' } },
  { id: 'ollama', nome: 'Ollama (local no seu PC)', tipo: 'openai', site: 'https://ollama.com', gratis: true, base: 'http://127.0.0.1:11434/v1', modelo_padrao: 'llama3.2', recomendacao: { posicao: 8, motivo: 'Grátis e privado, mas só funciona com o Ollama rodando na MESMA máquina do backend (app do PC). No site em nuvem o 127.0.0.1 é o servidor, não o seu PC.' } },
];
const iaCatalogo = (id: string) => CATALOGO_IAS.find((x) => x.id === id);

// monitor de execuções (estilo Langfuse): latência, tokens, custo estimado e erro de cada chamada
async function chamarIA(ia: any, mensagens: any[], rotulo = 'chat'): Promise<any> {
  const t0 = Date.now();
  try {
    const r = await chamarIAInterna(ia, mensagens);
    registrarObs({ quando: t0, rotulo, provedor: ia.id || '?', modelo: r.modelo || ia.modelo || '?', ms: Date.now() - t0, ok: true, tokens_in: r.tokens_in || 0, tokens_out: r.tokens_out || 0, custo_usd: custoUsd(r.modelo, r.tokens_in, r.tokens_out), erro: null });
    return r;
  } catch (err: any) {
    registrarObs({ quando: t0, rotulo, provedor: ia.id || '?', modelo: ia.modelo || '?', ms: Date.now() - t0, ok: false, tokens_in: 0, tokens_out: 0, custo_usd: 0, erro: String(err?.message || err || 'erro').slice(0, 200) });
    throw err;
  }
}

async function chamarIAInterna(ia: any, mensagens: any[]): Promise<any> {
  const cat: any = iaCatalogo(ia.id) || { tipo: 'openai', base: 'https://api.openai.com/v1', modelo_padrao: 'gpt-4o-mini', nome: 'IA' };
  const modelo = ia.modelo || cat.modelo_padrao;
  const sys = mensagens.filter((m) => m.role === 'system').map((m) => m.content).join('\n');
  const conversa = mensagens.filter((m) => m.role !== 'system');
  if (cat.tipo === 'gemini') {
    const r = await fetch('https://generativelanguage.googleapis.com/v1beta/models/' + modelo + ':generateContent?key=' + encodeURIComponent(ia.chave), {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ systemInstruction: sys ? { parts: [{ text: sys }] } : undefined, contents: conversa.map((m) => ({ role: m.role === 'assistant' ? 'model' : 'user', parts: [{ text: m.content }] })) }),
    });
    const j: any = await r.json().catch(() => ({}));
    if (!r.ok) throw new Error(j?.error?.message || 'Gemini recusou (status ' + r.status + ').');
    const resposta = ((j.candidates?.[0]?.content?.parts) || []).map((p: any) => p.text || '').join('').trim();
    if (!resposta) throw new Error('Gemini não devolveu texto.');
    return { texto: resposta, ia: cat.nome, modelo: j.model || modelo, tokens_in: j?.usageMetadata?.promptTokenCount ?? j?.usage?.input_tokens ?? j?.usage?.prompt_tokens ?? 0, tokens_out: j?.usageMetadata?.candidatesTokenCount ?? j?.usage?.output_tokens ?? j?.usage?.completion_tokens ?? 0 };
  }
  if (cat.tipo === 'anthropic') {
    const r = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST', headers: { 'Content-Type': 'application/json', 'x-api-key': ia.chave, 'anthropic-version': '2023-06-01' },
      body: JSON.stringify({ model: modelo, max_tokens: 1024, system: sys || undefined, messages: conversa.map((m) => ({ role: m.role === 'assistant' ? 'assistant' : 'user', content: m.content })) }),
    });
    const j: any = await r.json().catch(() => ({}));
    if (!r.ok) throw new Error(j?.error?.message || 'Claude recusou (status ' + r.status + ').');
    const resposta = (j.content || []).map((b: any) => b.text || '').join('').trim();
    if (!resposta) throw new Error('Claude não devolveu texto.');
    return { texto: resposta, ia: cat.nome, modelo: j.model || modelo, tokens_in: j?.usageMetadata?.promptTokenCount ?? j?.usage?.input_tokens ?? j?.usage?.prompt_tokens ?? 0, tokens_out: j?.usageMetadata?.candidatesTokenCount ?? j?.usage?.output_tokens ?? j?.usage?.completion_tokens ?? 0 };
  }
  const base = cat.base || 'https://api.openai.com/v1';
  const r = await fetch(base + '/chat/completions', {
    method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + ia.chave },
    body: JSON.stringify({ model: modelo, messages: mensagens.slice(-24), max_tokens: 1024 }),
  });
  const j: any = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error(j?.error?.message || j?.error || 'IA recusou (status ' + r.status + ').');
  const resposta = (j.choices?.[0]?.message?.content || '').trim();
  if (!resposta) throw new Error('A IA não devolveu texto.');
  return { texto: resposta, ia: cat.nome, modelo: j.model || modelo, tokens_in: j?.usageMetadata?.promptTokenCount ?? j?.usage?.input_tokens ?? j?.usage?.prompt_tokens ?? 0, tokens_out: j?.usageMetadata?.candidatesTokenCount ?? j?.usage?.output_tokens ?? j?.usage?.completion_tokens ?? 0 };
}

// ---------- ferramentas do modo agente: pesquisa e leitura reais ----------
const decodificar = (t: any) => String(t || '').replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&#x27;|&#39;/g, "'").replace(/&#(\d+);/g, (_: any, n: string) => String.fromCharCode(Number(n)));
async function pesquisarWeb(q: string) {
  const UA = { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/128.0 Safari/537.36', 'Accept-Language': 'pt-BR,pt;q=0.9,en;q=0.8' };
  // 1) Bing
  try {
    const r = await fetch('https://www.bing.com/search?q=' + encodeURIComponent(q) + '&setlang=pt', { headers: UA });
    if (r.ok) {
      const html = await r.text();
      const resultados: any[] = [];
      for (const bloco of html.split('class="b_algo"').slice(1, 8)) {
        const mA = /<h2><a[^>]*href="([^"]+)"[^>]*>([\s\S]*?)<\/a>/.exec(bloco);
        if (!mA) continue;
        let url = decodificar(mA[1]);
        const mU = /u=a1([A-Za-z0-9_-]+)/.exec(url);
        if (mU) { try { let b = mU[1].replace(/-/g, '+').replace(/_/g, '/'); while (b.length % 4) b += '='; url = atob(b); } catch { } }
        const titulo = decodificar(mA[2].replace(/<[^>]+>/g, '')).trim();
        const mS = /<p[^>]*>([\s\S]*?)<\/p>/.exec(bloco);
        const resumo = mS ? decodificar(mS[1].replace(/<[^>]+>/g, '')).trim().slice(0, 240) : '';
        if (titulo && /^https?:\/\//.test(url) && url.indexOf('bing.com') === -1 && !resultados.some((x: any) => x.url === url)) resultados.push({ titulo, url, resumo });
        if (resultados.length >= 6) break;
      }
      if (resultados.length) return { resultados, fonte: 'Bing' };
    }
  } catch { }
  // 2) DuckDuckGo (html e lite)
  for (const u of ['https://html.duckduckgo.com/html/?q=', 'https://lite.duckduckgo.com/lite/?q=']) {
    try {
      const r = await fetch(u + encodeURIComponent(q), { headers: UA });
      if (!r.ok) continue;
      const html = await r.text();
      const resultados: any[] = [];
      for (const m of html.matchAll(/<a[^>]*class="result__a"[^>]*href="([^"]+)"[^>]*>([\s\S]*?)<\/a>/g)) {
        let url = decodificar(m[1]);
        const mU = /uddg=([^&]+)/.exec(url);
        if (mU) { try { url = decodeURIComponent(mU[1]); } catch { } }
        if (url.startsWith('//')) url = 'https:' + url;
        const titulo = decodificar(m[2].replace(/<[^>]+>/g, '')).trim();
        if (titulo && url && !resultados.some((x: any) => x.titulo === titulo)) resultados.push({ titulo, url, resumo: '' });
        if (resultados.length >= 6) break;
      }
      const snacks = [...html.matchAll(/class="result__snippet"[^>]*>([\s\S]*?)<\/a>/g)].map((m) => decodificar(m[1].replace(/<[^>]+>/g, '')).trim());
      resultados.forEach((x: any, i: number) => { x.resumo = (snacks[i] || '').slice(0, 240); });
      if (resultados.length) return { resultados, fonte: 'DuckDuckGo' };
    } catch { }
  }
  throw new Error('A busca não respondeu agora. Tente de novo.');
}
async function abrirWeb(url: string) {
  if (!hostPermitido(String(url || ''))) throw new Error('Só endereços https públicos são permitidos (rede interna e http são bloqueados).');
  const r = await fetch(url, { headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/128.0 Safari/537.36' } });
  if (!r.ok) throw new Error('A página respondeu status ' + r.status + '.');
  const html = (await r.text()).slice(0, 2 * 1024 * 1024);
  const titulo = decodificar((html.match(/<title[^>]*>([\s\S]*?)<\/title>/i) || [])[1] || '').trim();
  const texto = html.replace(/<script[\s\S]*?<\/script>/gi, ' ').replace(/<style[\s\S]*?<\/style>/gi, ' ').replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
  return { titulo, texto: texto.slice(0, 4000), url };
}
async function rodarFerramenta(nome: string, arg: string): Promise<string> {
  if (nome === 'PESQUISAR') { const r = await pesquisarWeb(arg); return r.resultados.map((x: any, i: number) => (i + 1) + '. ' + x.titulo + ' — ' + x.url + (x.resumo ? ' | ' + x.resumo : '')).join('\n'); }
  if (nome === 'ABRIR') { const p = await abrirWeb(arg); return (p.titulo ? p.titulo + '\n' : '') + p.texto; }
  throw new Error('Ferramenta desconhecida: ' + nome);
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { status: 204, headers: CORS });
  let body: any = {};
  try { body = await req.json(); } catch { return erro('Corpo JSON inválido.'); }
  // ---------- servidor MCP oficial (JSON-RPC 2.0, spec modelcontextprotocol.io) ----------
  if (body && body.jsonrpc === '2.0' && body.method) {
    const idR = body.id === undefined ? null : body.id;
    const rcp = (obj: any) => new Response(JSON.stringify(Object.assign({ jsonrpc: '2.0' }, idR !== null ? { id: idR } : {}, obj)), { status: 200, headers: CORS });
    const rcpErr = (code: number, msg: string) => rcp({ error: { code, message: msg } });
    const bearerMcp = String(req.headers.get('authorization') || '').replace(/^Bearer\s+/i, '');
    const dbMcp: any = (createClientFromRequest(req) as any).asServiceRole ?? createClientFromRequest(req);
    const normMcp = async (ent: string) => { const r = await dbMcp.entities[ent].list({}); return Array.isArray(r) ? r : (r?.items || r?.data || []); };
    const fMcp = (r: any, k: string) => r?.[k] ?? r?.data?.[k];
    const chaveProjetoOk = bearerMcp ? (await normMcp('JarvisProjeto')).find((x: any) => { try { return (JSON.parse(fMcp(x, 'chaves') || '[]') || []).some((k: any) => k.valor === bearerMcp); } catch { return false; } }) : null;
    const tokMcp = String(body.params?.token || '');
    const sessMcp = tokMcp ? (await normMcp('JarvisSessao')).find((s: any) => fMcp(s, 'token') === tokMcp && Number(fMcp(s, 'expira')) > Date.now()) : null;
    if (!chaveProjetoOk && !sessMcp && body.method !== 'ping') return rcpErr(-32001, 'Envie Authorization: Bearer SUA_CHAVE de projeto ou params.token da conta.');
    const m = String(body.method || '');
    if (m === 'initialize') return rcp({ result: { protocolVersion: '2024-11-05', serverInfo: { name: 'jarvis', version: VERSAO }, capabilities: { tools: {} } } });
    if (m === 'ping') return rcp({ result: {} });
    if (m === 'tools/list') return rcp({ result: { tools: [
      { name: 'pesquisar_web', description: 'Busca na internet (Bing com fallback DuckDuckGo) e devolve títulos, links e resumos.', inputSchema: { type: 'object', properties: { consulta: { type: 'string' } }, required: ['consulta'] } },
      { name: 'abrir_url', description: 'Abre uma página https pública e devolve o texto principal (rede interna bloqueada).', inputSchema: { type: 'object', properties: { url: { type: 'string' } }, required: ['url'] } },
      { name: 'clima', description: 'Previsão do tempo de uma cidade (MET.no).', inputSchema: { type: 'object', properties: { cidade: { type: 'string' } }, required: ['cidade'] } },
      { name: 'moeda', description: 'Cotação entre duas moedas (AwesomeAPI/BCE).', inputSchema: { type: 'object', properties: { de: { type: 'string' }, para: { type: 'string' } }, required: ['de', 'para'] } },
    ] } });
    if (m === 'tools/call') {
      const nome = String(body.params?.name || ''), args: any = body.params?.arguments || {};
      try {
        if (nome === 'pesquisar_web') return rcp({ result: { content: [{ type: 'text', text: JSON.stringify(await pesquisarWeb(String(args.consulta || ''))) }] } });
        if (nome === 'abrir_url') { const p = await abrirWeb(String(args.url || '')); return rcp({ result: { content: [{ type: 'text', text: (p.titulo ? p.titulo + '\n' : '') + p.texto }] } }); }
        if (nome === 'clima') {
          const geo = await (await fetch('https://geocoding-api.open-meteo.com/v1/search?count=1&language=pt&name=' + encodeURIComponent(String(args.cidade || '')))).json().catch(() => ({}));
          const g = geo?.results?.[0];
          if (!g) return rcpErr(-32002, 'Cidade não encontrada.');
          const w = await (await fetch('https://api.met.no/weatherapi/locationforecast/2.0/compact?lat=' + g.latitude + '&lon=' + g.longitude, { headers: { 'User-Agent': 'jarvis-site' } })).json().catch(() => ({}));
          const d = w?.properties?.timeseries?.[0]?.data;
          return rcp({ result: { content: [{ type: 'text', text: JSON.stringify({ cidade: g.name, agora: d?.instant?.details, proximas_horas: (w?.properties?.timeseries || []).slice(1, 7).map((t: any) => ({ hora: t.time, ...t.data?.next_1_hours?.summary })) }) }] } });
        }
        if (nome === 'moeda') {
          const de = String(args.de || 'USD'), para = String(args.para || 'BRL');
          const r = await (await fetch('https://economia.awesomeapi.com.br/json/last/' + de + '-' + para)).json().catch(() => ({}));
          const o = r?.[de + para];
          if (!o) return rcpErr(-32002, 'Par não disponível.');
          return rcp({ result: { content: [{ type: 'text', text: JSON.stringify({ de, para, valor: o.bid, atualizado: o.create_date, fonte: 'AwesomeAPI' }) }] } });
        }
        return rcpErr(-32602, 'Ferramenta desconhecida: ' + nome);
      } catch (err: any) { return rcpErr(-32003, String(err?.message || err || 'falhou')); }
    }
    return rcpErr(-32601, 'Método não suportado: ' + m);
  }

  const rotaCompleta = String(body.rota || '');
  const rota = rotaCompleta.split('?')[0].replace(/\/+$/, '') || '/';
  const qs = new URLSearchParams(rotaCompleta.split('?')[1] || '');
  const metodo = String(body.metodo || 'GET').toUpperCase();
  const corpo = body.corpo || {};
  const token = String(body.token || '');
  const ip = String(req.headers.get('x-forwarded-for') || 'local').split(',')[0].trim();

  const base44 = createClientFromRequest(req);
  const db: any = (base44 as any).asServiceRole ?? base44;
  const f = (r: any, k: string) => r?.[k] ?? r?.data?.[k];
  const norm = async (ent: string) => {
    const r = await db.entities[ent].list({});
    return Array.isArray(r) ? r : (r?.items || r?.data || []);
  };
  const contaPor = async (email: string) => (await norm('JarvisConta')).find((c: any) => String(f(c, 'email') || '').toLowerCase() === email);
  const sessaoValida = async () => {
    const s = (await norm('JarvisSessao')).find((x: any) => f(x, 'token') === token && Number(f(x, 'expira')) > Date.now());
    if (!s) return null;
    return await contaPor(String(f(s, 'email')));
  };
  const publicaConta = (c: any) => ({ id: c?.id || '', nome: f(c, 'nome') || '', email: f(c, 'email') || '', plano: 'premium', criado_em: f(c, 'created_date') || '' });
  const publicaProjeto = (p: any) => ({ id: p?.id || '', usuario_id: 'jarvis', nome: f(p, 'nome') || '', descricao: '', assistente: f(p, 'assistente') || 'JARVIS', instrucoes: f(p, 'instrucoes') || '', provedores: [], criado_em: f(p, 'criado_em') || f(p, 'created_date') || '' });

  // dados por conta (leads, finanças, monitor, casa…): JSON guardado por chave
  const dadoGet = async (email: string, chave: string, padrao: any) => {
    const r = (await norm('JarvisDado')).find((d: any) => f(d, 'email') === email && f(d, 'chave') === chave);
    if (!r) return padrao;
    try { return JSON.parse(f(r, 'valor')); } catch { return padrao; }
  };
  const dadoSet = async (email: string, chave: string, valor: any) => {
    const r = (await norm('JarvisDado')).find((d: any) => f(d, 'email') === email && f(d, 'chave') === chave);
    if (r) await db.entities.JarvisDado.update(r.id, { valor: JSON.stringify(valor) });
    else await db.entities.JarvisDado.create({ email, chave, valor: JSON.stringify(valor) });
  };
  // registro técnico por conta (nível INFO/AVISO/ERRO, sem chaves nem senhas)
  const logAdd = async (email: string, nivel: string, texto: string) => {
    await db.entities.JarvisLog.create({ email, nivel: nivel.toUpperCase().slice(0, 10), texto: String(texto).slice(0, 500), em: new Date().toISOString() });
    const todos = (await norm('JarvisLog')).filter((l: any) => f(l, 'email') === email);
    if (todos.length > 400) for (const antigo of todos.sort((a: any, b: any) => String(f(b, 'em')).localeCompare(String(f(a, 'em')))).slice(400)) await db.entities.JarvisLog.delete(antigo.id);
  };

  try {
    if (!rateLimit(token || rota)) return erro('Muitas requisições. Aguarde um instante.', 429);
    const auth = await sessaoValida();
    const login401 = () => (auth ? null : erro('Faça login.', 401));
    const email = auth ? String(f(auth, 'email')) : '';

    // ---------- conta ----------
    if (rota === '/api/conta/cadastro' && metodo === 'POST') {
      if (!rlPermitir('cad:' + ip, 10)) return erro('Muitas tentativas; aguarde um minuto.', 429);
      const emailN = String(corpo.email || '').trim().toLowerCase();
      const senha = String(corpo.senha || '');
      if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(emailN)) return erro('E-mail inválido.');
      if (senha.length < 8) return erro('A senha precisa de pelo menos 8 caracteres.');
      if (await contaPor(emailN)) return erro('E-mail já cadastrado. Faça login.', 409);
      const salt = hex(crypto.getRandomValues(new Uint8Array(16)));
      const hash = await hashSenha(senha, salt);
      const conta = await db.entities.JarvisConta.create({ email: emailN, nome: String(corpo.nome || emailN.split('@')[0]).slice(0, 60), hash, salt });
      const tok = crypto.randomUUID() + crypto.randomUUID();
      await db.entities.JarvisSessao.create({ token: tok, email: emailN, expira: Date.now() + 30 * 864e5 });
      await logAdd(emailN, 'INFO', 'Conta criada.');
      return json({ ok: true, token: tok, usuario: publicaConta(conta) }, 201);
    }
    if (rota === '/api/conta/entrar' && metodo === 'POST') {
      if (!rlPermitir('ent:' + ip, 12)) return erro('Muitas tentativas; aguarde um minuto.', 429);
      const emailN = String(corpo.email || '').trim().toLowerCase();
      const conta = await contaPor(emailN);
      const hash = conta ? await hashSenha(String(corpo.senha || ''), f(conta, 'salt')) : '';
      if (!conta || hash !== f(conta, 'hash')) return erro('E-mail ou senha incorretos.', 401);
      const tok = crypto.randomUUID() + crypto.randomUUID();
      await db.entities.JarvisSessao.create({ token: tok, email: emailN, expira: Date.now() + 30 * 864e5 });
      await logAdd(emailN, 'INFO', 'Login no site.');
      return json({ ok: true, token: tok, usuario: publicaConta(conta) });
    }
    if (rota === '/api/conta/sair' && metodo === 'POST') {
      for (const s of await norm('JarvisSessao')) if (f(s, 'token') === token) await db.entities.JarvisSessao.delete(s.id);
      return json({ ok: true });
    }
    if (rota === '/api/conta/sessao') return auth ? json({ logado: true, usuario: publicaConta(auth) }) : json({ logado: false });
    if (rota === '/api/conta/eu') return login401() || json({ usuario: publicaConta(auth) });
    if (rota === '/api/conta/plano' || rota === '/api/conta/assinatura') return login401() || json(PLANO);
    if (rota === '/api/conta/senha' && metodo === 'PUT') {
      const e = login401(); if (e) return e;
      const senha = String(corpo.senha || corpo.nova || '');
      if (senha.length < 8) return erro('A senha precisa de pelo menos 8 caracteres.');
      const salt = hex(crypto.getRandomValues(new Uint8Array(16)));
      await db.entities.JarvisConta.update(auth.id, { salt, hash: await hashSenha(senha, salt) });
      await logAdd(email, 'INFO', 'Senha alterada.');
      return json({ ok: true });
    }
    if (rota === '/api/conta/preferencias') {
      const e = login401(); if (e) return e;
      if (metodo === 'PUT') { await db.entities.JarvisConta.update(auth.id, { preferencias: JSON.stringify(corpo) }); return json({ ok: true }); }
      const p = f(auth, 'preferencias');
      return json(p ? JSON.parse(p) : { configurado: false, dados: {} });
    }
    if (rota === '/api/conta/memoria') {
      const e = login401(); if (e) return e;
      if (metodo === 'PUT') { await db.entities.JarvisConta.update(auth.id, { memoria: JSON.stringify(corpo) }); return json({ ok: true }); }
      if (metodo === 'DELETE') { await db.entities.JarvisConta.update(auth.id, { memoria: '' }); return json({ ok: true }); }
      const m = f(auth, 'memoria');
      return json(m ? JSON.parse(m) : {});
    }
    // ---------- IAs da conta (fila BYOK: a conta traz a própria chave) ----------
    const mIa = rota.match(/^\/api\/conta\/ias\/([^/]+)(\/testar)?$/);
    if (rota === '/api/conta/ias' || rota === '/api/conta/ias-ordem' || mIa) {
      const e = login401(); if (e) return e;
      const fila = await dadoGet(email, 'ias', []);
      const salvarIas = async () => dadoSet(email, 'ias', fila);
      if (rota === '/api/conta/ias' && metodo === 'GET') {
        return json(CATALOGO_IAS.map((cat) => {
          const ligada = fila.find((i: any) => i.id === cat.id);
          return { id: cat.id, nome: cat.nome, tipo: cat.tipo, site: cat.site, gratis: !!cat.gratis, modelo_padrao: cat.modelo_padrao, conectada: !!ligada, ordem: ligada ? fila.indexOf(ligada) : 999, modelo: ligada ? ligada.modelo : null, final_chave: ligada ? (ligada.final || null) : null, recomendacao: cat.recomendacao };
        }));
      }
      if (rota === '/api/conta/ias-ordem' && metodo === 'PUT') {
        const ordem = corpo.ordem || [];
        fila.sort((a: any, b: any) => (ordem.indexOf(a.id) === -1 ? 99 : ordem.indexOf(a.id)) - (ordem.indexOf(b.id) === -1 ? 99 : ordem.indexOf(b.id)));
        await salvarIas();
        return json({ ok: true });
      }
      if (mIa) {
        const cat = iaCatalogo(mIa[1]);
        if (!cat) return erro('Provedor desconhecido.', 404);
        const ligada = fila.find((i: any) => i.id === cat.id);
        if (mIa[2] === '/testar' && metodo === 'POST') {
          if (!ligada) return erro('Conecte a chave primeiro.', 400);
          try { await chamarIA({ ...ligada, chave: await decifra(ligada.chave) }, [{ role: 'user', content: 'Responda apenas: ok' }], 'testar'); return json({ ok: true, msg: cat.nome + ' respondeu — chave válida.' }); }
          catch (err: any) { return json({ ok: false, msg: err.message || 'Falhou.' }); }
        }
        if (metodo === 'PUT') {
          const chave = String(corpo.chave || '').trim();
          if (!chave) return erro('Informe a chave.', 400);
          const chaveC = await cifra(chave);
        if (ligada) { ligada.chave = chaveC; ligada.final = '…' + chave.slice(-4); ligada.modelo = String(corpo.modelo || ligada.modelo || cat.modelo_padrao); }
          else fila.push({ id: cat.id, chave: chaveC, final: '…' + chave.slice(-4), modelo: String(corpo.modelo || cat.modelo_padrao), ordem: fila.length });
          await salvarIas();
          return json({ ok: true });
        }
        if (metodo === 'DELETE') {
          const nova = fila.filter((i: any) => i.id !== cat.id);
          await dadoSet(email, 'ias', nova);
          return json({ ok: true });
        }
      }
      return erro('Método não suportado.', 405);
    }

    // ---------- projetos (assistentes) ----------
    if (rota === '/api/projetos' && metodo === 'GET') {
      const e = login401(); if (e) return e;
      const meus = (await norm('JarvisProjeto')).filter((p: any) => f(p, 'email') === email)
        .sort((a: any, b: any) => String(f(a, 'criado_em')).localeCompare(String(f(b, 'criado_em'))));
      return json(meus.map(publicaProjeto));
    }
    if (rota === '/api/projetos' && metodo === 'POST') {
      const e = login401(); if (e) return e;
      const nome = String(corpo.nome || '').slice(0, 60) || 'Novo assistente';
      const chavePub = 'jarvis_sk_' + Array.from(crypto.getRandomValues(new Uint8Array(18))).map((b) => b.toString(16).padStart(2, '0')).join('');
      const p = await db.entities.JarvisProjeto.create({ email, nome, assistente: String(corpo.assistente || 'JARVIS').slice(0, 60), instrucoes: String(corpo.instrucoes || '').slice(0, 4000), criado_em: new Date().toISOString(), chaves: JSON.stringify([{ id: '1', nome: 'padrão', valor: chavePub, criado: new Date().toISOString() }]) });
      return json(publicaProjeto(p), 201);
    }
    if (rota === '/api/projetos/apagar' && metodo === 'POST') {
      const e = login401(); if (e) return e;
      const p = (await norm('JarvisProjeto')).find((x: any) => x.id === String(corpo.id || '') && f(x, 'email') === email);
      if (!p) return erro('Projeto não encontrado.', 404);
      await db.entities.JarvisProjeto.delete(p.id);
      return json({ ok: true });
    }
    if (rota === '/api/projetos/salvar' && metodo === 'POST') {
      const e = login401(); if (e) return e;
      const id = String(corpo.id || '');
      const meus = (await norm('JarvisProjeto')).filter((p: any) => f(p, 'email') === email);
      const p = id ? meus.find((x: any) => x.id === id) : null;
      if (id && !p) return erro('Projeto não encontrado.', 404);
      const dados = { nome: String(corpo.nome ?? f(p, 'nome') ?? 'Projeto').slice(0, 60), assistente: String(corpo.assistente ?? f(p, 'assistente') ?? 'JARVIS').slice(0, 60), instrucoes: String(corpo.instrucoes ?? f(p, 'instrucoes') ?? '').slice(0, 4000) };
      if (p) { await db.entities.JarvisProjeto.update(p.id, dados); return json(publicaProjeto({ ...p, ...dados })); }
      const novo = await db.entities.JarvisProjeto.create({ email, ...dados, criado_em: new Date().toISOString() });
      return json(publicaProjeto(novo), 201);
    }
    if (rota.startsWith('/api/projetos/')) {
      const e = login401(); if (e) return e;
      const idProj = rota.split('/')[3];
      const subProj = rota.split('/')[4] || '';
      const p = (await norm('JarvisProjeto')).find((x: any) => x.id === idProj && f(x, 'email') === email);
      if (!p) return erro('Projeto não encontrado.', 404);
      if (subProj === 'testar' && metodo === 'POST') {
        const fila = await dadoGet(email, 'ias', []);
        if (!fila.length) return erro('Nenhuma IA conectada. Configure em Minhas IAs (o Gemini tem plano grátis).', 400);
        let memItens: any[] = [];
        try { const m = f(auth, 'memoria') ? JSON.parse(f(auth, 'memoria')) : null; memItens = (m?.itens || m || []).slice(-12); } catch { }
        const mem = memItens.map((m: any) => m.texto || String(m)).join(' | ');
        const agente = String(corpo.personalidade || '') === 'agente';
        const ferramentas = 'FERRAMENTAS (use quando precisar de dados ao vivo, no formato exato): {PESQUISAR:termo} busca na internet; {ABRIR:url} lê uma página. Responda APENAS com a chamada da ferramenta quando for usar. Sem dados de internet, responda direto.';
        const persona: Record<string, string> = { serio: 'Seja direto e profissional.', amigavel: 'Seja amigável e leve.', professor: 'Explique passo a passo com exemplos.', tecnico: 'Seja preciso e denso.', direto: 'Responda curto, só o essencial.' };
        const sistema = [
          f(p, 'instrucoes') || '',
          'Você é ' + (f(p, 'assistente') || 'JARVIS') + ', assistente pessoal do usuário, respondendo sempre em português do Brasil.',
          persona[corpo.personalidade] || 'Seja útil e natural.',
          agente ? 'Modo Agente: você PODE usar as ferramentas sempre que a pergunta precisar de informação atual da internet.' : '',
          ferramentas,
          mem ? 'Lembranças do usuário: ' + mem : '',
        ].filter(Boolean).join(' ');
        const falhas: any[] = [];
        for (const iaBruta of fila) {
          const ia = { ...iaBruta, chave: await decifra(iaBruta.chave) };
          try {
            let mensagens = [{ role: 'system', content: sistema }].concat((corpo.mensagens || []).slice(-24));
            let resposta: string | null = null, iaUsada: string | null = null;
            for (let rodada = 0; rodada < 4; rodada++) {
              const r = await chamarIA(ia, mensagens);
              const uso = /\{(PESQUISAR|ABRIR):([^}]+)\}/.exec(r.texto);
              if (!uso) { resposta = r.texto; iaUsada = r.ia; break; }
              try {
                const resultado = await rodarFerramenta(uso[1], uso[2].trim());
                mensagens.push({ role: 'assistant', content: r.texto });
                mensagens.push({ role: 'user', content: 'RESULTADO DA FERRAMENTA ' + uso[1] + ' (use para responder em português, sem repetir o resultado cru):\n' + resultado.slice(0, 3000) });
              } catch (err: any) { resposta = 'A ferramenta falhou: ' + (err.message || 'erro') + '.'; iaUsada = r.ia; break; }
            }
            if (resposta) return json({ resposta, ia_nome: iaUsada, tentativas_falhas: falhas });
          } catch (err: any) { falhas.push({ id: ia.id, erro: err.message || 'falhou' }); }
        }
        return erro('Todas as IAs falharam: ' + (falhas.map((x) => x.erro).join(' | ') || 'sem resposta.'), 502);
      }
      if (metodo === 'PUT') {
        const dados = { nome: String(corpo.nome ?? f(p, 'nome')).slice(0, 60), assistente: String(corpo.assistente ?? f(p, 'assistente')).slice(0, 60), instrucoes: String(corpo.instrucoes ?? f(p, 'instrucoes')).slice(0, 4000) };
        await db.entities.JarvisProjeto.update(p.id, dados);
        return json(publicaProjeto({ ...p, ...dados }));
      }
      if (metodo === 'DELETE') { await db.entities.JarvisProjeto.delete(p.id); return json({ ok: true }); }
      return erro('Método não suportado.', 405);
    }

    // ---------- conteúdo real (sem provedor de IA: respostas honestas) ----------
    if (rota === '/api/projetos/assistente') {
      const e = login401(); if (e) return e;
      const fila = await dadoGet(email, 'ias', []);
      if (!fila.length) return erro('Criar projeto com IA requer uma IA conectada em Minhas IAs.', 501);
      const acao = corpo.acao === 'otimizar' ? 'melhorar' : 'criar';
      const pedido = String(corpo.texto || '').slice(0, 4000);
      if (!pedido) return erro('Descreva o assistente que quer criar.', 400);
      try {
        const r = await chamarIA({ ...fila[0], chave: await decifra(fila[0].chave) }, [
          { role: 'system', content: 'Você cria definições de assistentes para o JARVIS. Responda SOMENTE com JSON válido: {"nome": "", "assistente": "", "descricao": "", "instrucoes": ""} — nomes curtos, instruções em português.' },
          { role: 'user', content: 'Ação: ' + acao + '. Pedido do usuário: ' + pedido },
        ]);
        const j = JSON.parse((r.texto.match(/\{[\s\S]*\}/) || [r.texto])[0]);
        return json({ projeto: { nome: String(j.nome || corpo.nome || 'Assistente').slice(0, 60), assistente: String(j.assistente || 'Assistente').slice(0, 60), descricao: String(j.descricao || '').slice(0, 300), instrucoes: String(j.instrucoes || '').slice(0, 4000) }, ia: r.ia });
      } catch (err: any) { return erro('A IA não conseguiu criar o projeto agora: ' + (err.message || 'erro'), 502); }
    }
    if (rota === '/api/web/melhorar-prompt') {
      return erro('Melhorar prompt com IA requer uma IA conectada em Minhas IAs.', 501);
    }
    if (rota === '/api/web/personalidades') {
      return json({ modos: [
        { id: 'serio', nome: 'Sério', resumo: 'Direto e profissional, sem brincadeiras.', exemplo: 'Entendi. Segue o plano.' },
        { id: 'amigavel', nome: 'Amigável', resumo: 'Perto do dia a dia, com leveza.', exemplo: 'Boa! Vamos nessa então?' },
        { id: 'direto', nome: 'Direto', resumo: 'Respostas curtas, só o essencial.', exemplo: 'Feito.' },
        { id: 'agente', nome: 'Agente', resumo: 'Pesquisa na internet, abre páginas e usa dados ao vivo quando precisa.', exemplo: 'Vou pesquisar isso agora.' },
      ] });
    }
    if (rota === '/api/web/pesquisar') {
      const e = login401(); if (e) return e;
      const q = String(qs.get('q') || corpo.q || '').trim();
      if (!q) return erro('Informe o que pesquisar.', 400);
      try { return json(await pesquisarWeb(q)); } catch (err: any) { return erro(err.message || 'A busca falhou.', 502); }
    }
    if (rota === '/api/web/abrir') {
      const e = login401(); if (e) return e;
      try { return json(await abrirWeb(String(qs.get('url') || corpo.url || ''))); } catch (err: any) { return erro(err.message || 'Não consegui abrir.', 400); }
    }
    if (rota === '/api/voz/config') {
      const e = login401(); if (e) return e;
      let voz = await dadoGet(email, 'voz', null);
      if (!voz) voz = { chave: '', voz_id: '21m00Tcm4TlvDq8ikWAM', on: false };
      if (metodo === 'PUT') {
        if (corpo.chave !== undefined) voz.chave = String(corpo.chave).trim();
        if (corpo.voz_id !== undefined) voz.voz_id = String(corpo.voz_id).trim();
        if (corpo.on !== undefined) voz.on = Boolean(corpo.on);
        await dadoSet(email, 'voz', voz);
      }
      return json({ on: voz.on, voz_id: voz.voz_id, tem_chave: !!voz.chave, padrao: '21m00Tcm4TlvDq8ikWAM' });
    }
    if (rota === '/api/voz/vozes') {
      const e = login401(); if (e) return e;
      const voz = await dadoGet(email, 'voz', { chave: '' });
      if (!voz.chave) return erro('Configure a chave da ElevenLabs primeiro (/voz chave SUA_CHAVE).', 400);
      const r = await fetch('https://api.elevenlabs.io/v1/voices', { headers: { 'xi-api-key': voz.chave } });
      const j: any = await r.json().catch(() => null);
      if (!r.ok || !j?.voices) return erro('ElevenLabs não respondeu (chave correta?).', 502);
      return json({ vozes: j.voices.map((v: any) => ({ id: v.voice_id, nome: v.name, idiomas: v.labels?.language || '' })) });
    }
    if (rota === '/api/voz/elevenlabs' && metodo === 'POST') {
      const e = login401(); if (e) return e;
      const texto = String(corpo.texto || '').slice(0, 2000);
      if (!texto) return erro('Sem texto para falar.', 400);
      const voz = await dadoGet(email, 'voz', { chave: '', voz_id: '21m00Tcm4TlvDq8ikWAM', on: false });
      if (!voz.chave) return erro('Voz de estúdio sem chave: use /voz chave SUA_CHAVE (crie grátis em 11labs.io).', 400);
      const r = await fetch('https://api.elevenlabs.io/v1/text-to-speech/' + encodeURIComponent(voz.voz_id) + '?output_format=mp3_44100_128', {
        method: 'POST', headers: { 'xi-api-key': voz.chave, 'Content-Type': 'application/json', 'Accept': 'audio/mpeg' },
        body: JSON.stringify({ text: texto, model_id: 'eleven_multilingual_v2' }),
      });
      if (!r.ok) { const j: any = await r.json().catch(() => null); return erro('ElevenLabs recusou: ' + (j?.detail?.message || ('status ' + r.status)), 502); }
      const buf = new Uint8Array(await r.arrayBuffer());
      let bin = '';
      for (const b of buf) bin += String.fromCharCode(b);
      return json({ ok: true, formato: 'mp3', audio_base64: btoa(bin) });
    }
    // ---------- v1.3.3: saúde, capacidades, monitor, SDK v1, estados honestos ----------
    if (rota === '/api/health') return json({ ok: true, versao: VERSAO, backend: 'base44-deno', quando: new Date().toISOString() });
    if (rota === '/api/capabilities') return json({
      versao: VERSAO, backend: 'base44-deno',
      funcional: ['conta-email-senha', 'sessoes-token-30d', 'byok-7-provedores-mais-ollama', 'chat-fallback-em-fila', 'modo-agente-pesquisa-bing-duckduckgo', 'abrir-url-com-guarda-ssrf', 'voz-elevenlabs-opcional', 'memoria-de-conta', 'projetos-assistentes-com-chave-sdk', 'painel-casa-ha', 'painel-financeiro', 'painel-leads', 'painel-logs', 'painel-monitor', 'painel-negocio', 'painel-fontes', 'briefing-noticias', 'mcp-simplificado-api-mcp', 'mcp-oficial-jsonrpc-em-mcp', 'sdk-publico-v1', 'monitor-de-ia-logs', 'rate-limit-por-ip-e-chave', 'criptografia-byok-opcional'],
      pendentes: {
        oauth_google: 'requer GOOGLE_CLIENT_ID/SECRET criados pelo dono no Google Cloud e no ambiente do backend',
        oauth_discord: 'requer DISCORD_CLIENT_ID/SECRET',
        oauth_github: 'requer GITHUB_CLIENT_ID/SECRET',
        dois_fatores_email: 'requer SMTP/ provedor de e-mail configurado',
        pix_cartao: 'requer provedor de pagamento (chaves e ambiente)',
        composio: 'requer COMPOSIO_API_KEY no ambiente (hub de 250+ apps)',
        email_conector: 'requer credenciais IMAP/SMTP autorizadas por usuário',
        byok_cifrado: CHAVE_MESTRA ? 'ativo: chaves guardadas com AES-256-GCM' : 'inativo: defina JARVIS_MASTER_KEY no ambiente para cifrar chaves de IA em repouso',
        ollama: 'catálogo presente, mas só funciona com Ollama na mesma máquina do backend (app do PC); em nuvem o 127.0.0.1 é o servidor',
      },
    });
    if (rota === '/api/conta/verificar-login') return json({ logado: !!auth, email: auth ? String(f(auth, 'email')) : null });
    if (rota === '/api/logs/ia') {
      const e = login401(); if (e) return e;
      return json({ total: OBS.log.length, execucoes: OBS.log.slice(-120).reverse().map((ev: any) => ({ quando: new Date(ev.quando).toISOString(), rotulo: ev.rotulo, provedor: ev.provedor, modelo: ev.modelo, ms: ev.ms, ok: ev.ok, erro: ev.erro || null, tokens_in: ev.tokens_in, tokens_out: ev.tokens_out, custo_usd: Math.round(ev.custo_usd * 1e6) / 1e6 })) });
    }
    if (rota === '/api/logs/ia/resumo') {
      const e = login401(); if (e) return e;
      const doMes = OBS.log.filter((ev: any) => ev.mes === mesAtual());
      const porModelo: any = {};
      for (const ev of doMes) {
        porModelo[ev.modelo] = porModelo[ev.modelo] || { chamadas: 0, erros: 0, ms_total: 0, tokens: 0, custo_usd: 0 };
        porModelo[ev.modelo].chamadas += 1; porModelo[ev.modelo].erros += ev.ok ? 0 : 1; porModelo[ev.modelo].ms_total += ev.ms;
        porModelo[ev.modelo].tokens += (ev.tokens_in || 0) + (ev.tokens_out || 0); porModelo[ev.modelo].custo_usd += ev.custo_usd || 0;
      }
      return json({ mes: mesAtual(), execucoes: doMes.length, por_modelo: porModelo });
    }
    if (rota === '/api/composio/mcp') return erro('Composio não está configurado neste backend: defina COMPOSIO_API_KEY no ambiente (hub Composio, 250+ apps). Enquanto ausente, use o MCP oficial em POST /mcp com Bearer de projeto.', 501);
    if (rota === '/api/email/caixa' || rota === '/api/email/ler') return erro('Conector de e-mail não configurado: requer credenciais IMAP/SMTP autorizadas pelo dono da conta.', 501);
    // SDK público v1 (chave de projeto, sem token de conta)
    if (rota === '/api/v1/chat' && metodo === 'POST') {
      const bearer = String(req.headers.get('authorization') || '').replace(/^Bearer\s+/i, '');
      if (!bearer) return erro('Envie Authorization: Bearer SUA_CHAVE de projeto (veja a chave em Devtools ou /api/v1/projeto).', 401);
      if (!rlPermitir('v1:' + bearer.slice(-10), 20)) return erro('Muitas chamadas seguidas; aguarde um minuto.', 429);
      let projV1: any = null;
      for (const x of await norm('JarvisProjeto')) { try { if ((JSON.parse(f(x, 'chaves') || '[]') || []).some((k: any) => k.valor === bearer)) { projV1 = x; break; } } catch { } }
      if (!projV1) return erro('Chave ausente, errada ou revogada.', 401);
      const donoV1 = String(f(projV1, 'email'));
      const filaV1 = await dadoGet(donoV1, 'ias', []);
      if (!filaV1.length) return erro('O dono do projeto não tem IA conectada.', 501);
      const sistemaV1 = [String(f(projV1, 'instrucoes') || ''), 'Você é ' + (f(projV1, 'assistente') || 'JARVIS') + '. Responda sempre em português do Brasil.'].filter(Boolean).join(' ');
      const falhasV1: any[] = [];
      for (const iaBruta of filaV1) {
        try {
          const r = await chamarIA({ ...iaBruta, chave: await decifra(iaBruta.chave) }, [{ role: 'system', content: sistemaV1 }].concat((corpo.mensagens || []).slice(-24)), 'sdk-v1');
          return json({ resposta: r.texto, modelo: r.modelo, ia: r.ia, projeto: f(projV1, 'nome') });
        } catch (err: any) { falhasV1.push({ id: iaBruta.id, erro: String(err?.message || err).slice(0, 200) }); }
      }
      return erro('Todas as IAs falharam: ' + falhasV1.map((x: any) => x.erro).join(' | '), 502);
    }
    if (rota === '/api/v1/projeto') {
      const bearer = String(req.headers.get('authorization') || '').replace(/^Bearer\s+/i, '');
      if (!bearer) return erro('Envie Authorization: Bearer SUA_CHAVE de projeto.', 401);
      let projV1: any = null;
      for (const x of await norm('JarvisProjeto')) { try { if ((JSON.parse(f(x, 'chaves') || '[]') || []).some((k: any) => k.valor === bearer)) { projV1 = x; break; } } catch { } }
      if (!projV1) return erro('Chave ausente, errada ou revogada.', 401);
      return json({ nome: f(projV1, 'nome'), assistente: f(projV1, 'assistente'), criado_em: f(projV1, 'criado_em') });
    }
    // chaves de projeto (dono vê mascaradas; cria/revoga)
    if (rota.startsWith('/api/projetos/') && rota.split('/')[4] === 'chaves') {
      const e = login401(); if (e) return e;
      const idProj = rota.split('/')[3];
      const p = (await norm('JarvisProjeto')).find((x: any) => x.id === idProj && f(x, 'email') === email);
      if (!p) return erro('Projeto não encontrado.', 404);
      let lista: any[] = []; try { lista = JSON.parse(f(p, 'chaves') || '[]') || []; } catch { }
      if (metodo === 'GET') return json({ chaves: lista.map((k: any) => ({ id: k.id, nome: k.nome, final: '…' + String(k.valor).slice(-4), criado: k.criado })) });
      if (metodo === 'POST') {
        const nova = { id: String(Date.now()), nome: String(corpo.nome || 'chave ' + (lista.length + 1)).slice(0, 30), valor: 'jarvis_sk_' + Array.from(crypto.getRandomValues(new Uint8Array(18))).map((b: any) => b.toString(16).padStart(2, '0')).join(''), criado: new Date().toISOString() };
        lista.push(nova);
        await db.entities.JarvisProjeto.update(p.id, { chaves: JSON.stringify(lista) });
        return json({ ok: true, chave: nova.valor, aviso: 'Guarde agora: a chave completa não é mostrada de novo.' }, 201);
      }
      if (metodo === 'DELETE') {
        const nova = lista.filter((k: any) => k.id !== String(corpo.id || ''));
        await db.entities.JarvisProjeto.update(p.id, { chaves: JSON.stringify(nova) });
        return json({ ok: true });
      }
      return erro('Método não suportado.', 405);
    }
        if (rota === '/api/mcp/ferramentas') {
      return json({ ferramentas: [
        { nome: 'clima', descricao: 'Previsão do tempo (MET.no)', entrada: { cidade: 'string' }, rota: '/api/web/clima?cidade=' },
        { nome: 'moeda', descricao: 'Cotação entre duas moedas', entrada: { de: 'string', para: 'string' }, rota: '/api/web/moeda?de=USD&para=BRL' },
        { nome: 'cripto', descricao: 'Preço de criptomoeda em reais', entrada: { id: 'string (bitcoin, ethereum, solana, cardano, dogecoin)' }, rota: '/api/web/cripto?id=bitcoin' },
        { nome: 'wiki', descricao: 'Resumo da Wikipédia em português', entrada: { q: 'string' }, rota: '/api/web/wiki?q=' },
        { nome: 'feriados', descricao: 'Feriados nacionais do Brasil', entrada: { ano: 'number' }, rota: '/api/web/feriados?ano=' },
        { nome: 'pesquisar', descricao: 'Busca na internet (DuckDuckGo)', entrada: { q: 'string' }, rota: '/api/web/pesquisar?q=' },
        { nome: 'abrir', descricao: 'Abre uma página e devolve o texto', entrada: { url: 'string' }, rota: '/api/web/abrir?url=' },
        { nome: 'noticias', descricao: 'Manchetes do Brasil agora', entrada: {}, rota: '/api/web/briefing' },
        { nome: 'chat', descricao: 'Conversa com a IA conectada da conta', entrada: { mensagens: 'array {role, content}', projeto_id: 'string' }, rota: '/api/projetos/{id}/testar' },
      ] });
    }
    if (rota === '/api/mcp/executar' && metodo === 'POST') {
      const e = login401(); if (e) return e;
      const nomeF = String(corpo.ferramenta || ''), a = corpo.args || {};
      try {
        if (nomeF === 'pesquisar') return json(await pesquisarWeb(String(a.q || '')));
        if (nomeF === 'abrir') return json(await abrirWeb(String(a.url || '')));
        return json({ erro: 'Ferramenta desconhecida: ' + nomeF, sugestao: 'GET /api/mcp/ferramentas' });
      } catch (err: any) { return erro(err.message || 'Ferramenta falhou.', 400); }
    }
    if (rota === '/api/web/clima') {
      const e = login401(); if (e) return e;
      const cidade = String(qs.get('cidade') || '').trim();
      if (!cidade) return json({ configurado: false, mensagem: 'Informe a sua cidade nas preferências.' });
      const geo = await (await fetch('https://geocoding-api.open-meteo.com/v1/search?count=1&language=pt&name=' + encodeURIComponent(cidade))).json();
      const g = geo?.results?.[0];
      if (!g) return json({ configurado: false, mensagem: 'Cidade não encontrada.' });
      const respM = await fetch(`https://api.met.no/weatherapi/locationforecast/2.0/compact?lat=${g.latitude}&lon=${g.longitude}`, { headers: { 'User-Agent': 'JARVIS-web/1.0 github.com/mlk010173/jarvis' } });
      const txtM = await respM.text();
      let m: any = null; try { m = JSON.parse(txtM); } catch { m = null; }
      const serie = m?.properties?.timeseries;
      if (!respM.ok || !serie?.length) return json({ configurado: false, mensagem: 'Previsão indisponível agora.' });
      const detalhe = serie[0].data.instant.details;
      const simbolo = String(serie[0].data.next_1_hours?.summary?.symbol_code || serie[0].data.next_12_hours?.summary?.symbol_code || '');
      const temps = serie.slice(0, 13).map((t: any) => t.data.instant.details.air_temperature);
      const ic = simbolo.includes('thunder') ? 'zap' : simbolo.includes('snow') ? 'snow' : (simbolo.includes('rain') || simbolo.includes('sleet')) ? 'rain' : simbolo.includes('cloud') ? 'cloud' : 'sun';
      const desc = ic === 'zap' ? 'Tempestade' : ic === 'snow' ? 'Neve' : ic === 'rain' ? 'Chuva' : ic === 'cloud' ? 'Nublado' : 'Céu limpo';
      return json({ configurado: true, cidade: g.name, icone: ic, descricao: desc, temperatura: detalhe.air_temperature, minima: Math.round(Math.min(...temps) * 10) / 10, maxima: Math.round(Math.max(...temps) * 10) / 10, umidade: detalhe.relative_humidity, vento: Math.round(detalhe.wind_speed * 36) / 10 });
    }
    if (rota === '/api/web/moeda') {
      const e = login401(); if (e) return e;
      const de = (qs.get('de') || 'USD').toUpperCase().slice(0, 4);
      const para = (qs.get('para') || 'BRL').toUpperCase().slice(0, 4);
      if (!/^[A-Z]{3,4}$/.test(de) || !/^[A-Z]{3,4}$/.test(para)) return erro('Moeda inválida (use USD, EUR, BRL…).');
      const UA: any = { headers: { 'User-Agent': 'JARVIS-web/1.0 github.com/mlk010173/jarvis' } };
      try {
        const r = await fetch('https://economia.awesomeapi.com.br/json/last/' + de + '-' + para, UA);
        const o = (await r.json().catch(() => null))?.[de + para];
        if (r.ok && o?.bid) return json({ de, para, valor: o.bid, titulo: o.name, atualizado: o.create_date, fonte: 'AwesomeAPI' });
      } catch {}
      try {
        const r2 = await fetch('https://api.frankfurter.dev/v1/latest?base=' + de + '&symbols=' + para, UA);
        const o2: any = await r2.json().catch(() => null);
        if (r2.ok && o2?.rates?.[para]) return json({ de, para, valor: o2.rates[para], titulo: de + '/' + para, atualizado: o2.date, fonte: 'BCE/Frankfurter' });
      } catch {}
      return erro('Cotação não encontrada agora.');
    }
    if (rota === '/api/web/cripto') {
      const e = login401(); if (e) return e;
      const mapaC: any = { bitcoin: 'BTC', ethereum: 'ETH', solana: 'SOL', cardano: 'ADA', dogecoin: 'DOGE' };
      const id = String(qs.get('id') || 'bitcoin').toLowerCase();
      const sigla = mapaC[id];
      if (!sigla) return erro('Cripto não suportada (bitcoin, ethereum, solana, cardano, dogecoin).');
      const UA: any = { headers: { 'User-Agent': 'JARVIS-web/1.0 github.com/mlk010173/jarvis' } };
      try {
        const r = await fetch('https://api.coingecko.com/api/v3/simple/price?ids=' + id + '&vs_currencies=brl', UA);
        const o: any = await r.json().catch(() => null);
        if (r.ok && o?.[id]?.brl) return json({ nome: sigla, valor_brl: o[id].brl, atualizado: new Date().toISOString().slice(0, 19), fonte: 'CoinGecko' });
      } catch {}
      try {
        const r2 = await fetch('https://api.coinbase.com/v2/exchange-rates?currency=' + sigla, UA);
        const o2: any = await r2.json().catch(() => null);
        const v2 = o2?.data?.rates?.BRL;
        if (r2.ok && v2) return json({ nome: sigla, valor_brl: Math.round(Number(v2) * 100) / 100, atualizado: new Date().toISOString().slice(0, 19), fonte: 'Coinbase' });
      } catch {}
      try {
        const r3 = await fetch('https://economia.awesomeapi.com.br/json/last/' + sigla + '-BRL', UA);
        const o3 = (await r3.json().catch(() => null))?.[sigla + 'BRL'];
        if (r3.ok && o3?.bid) return json({ nome: sigla, valor_brl: o3.bid, atualizado: o3.create_date, fonte: 'AwesomeAPI' });
      } catch {}
      return erro('Cotação não encontrada agora.');
    }
    if (rota === '/api/web/wiki') {
      const e = login401(); if (e) return e;
      const termo = String(qs.get('q') || '').trim();
      if (!termo) return erro('Informe o termo.');
      const resumoDe = (o: any) => json({ titulo: o?.title || '', resumo: String(o?.extract || '').slice(0, 340), url: o?.content_urls?.desktop?.page || '' });
      let r = await fetch('https://pt.wikipedia.org/api/rest_v1/page/summary/' + encodeURIComponent(termo), { headers: { 'User-Agent': 'JARVIS-web/1.0 github.com/mlk010173/jarvis' } });
      if (r.ok) { const o: any = await r.json().catch(() => null); if (o?.extract) return resumoDe(o); }
      const s = await (await fetch('https://pt.wikipedia.org/w/api.php?action=opensearch&limit=1&format=json&search=' + encodeURIComponent(termo), { headers: { 'User-Agent': 'JARVIS-web/1.0 github.com/mlk010173/jarvis' } })).json();
      const titulo = (s?.[1] || [])[0];
      if (!titulo) return erro('Nada encontrado na Wikipédia.');
      r = await fetch('https://pt.wikipedia.org/api/rest_v1/page/summary/' + encodeURIComponent(titulo), { headers: { 'User-Agent': 'JARVIS-web/1.0 github.com/mlk010173/jarvis' } });
      const o2: any = await r.json().catch(() => null);
      if (!r.ok || !o2?.extract) return erro('Nada encontrado na Wikipédia.');
      return resumoDe(o2);
    }
    if (rota === '/api/web/feriados') {
      const e = login401(); if (e) return e;
      const ano = (qs.get('ano') || String(new Date().getFullYear())).replace(/\D/g, '').slice(0, 4);
      const r = await fetch('https://date.nager.at/api/v3/PublicHolidays/' + ano + '/BR', { headers: { 'User-Agent': 'JARVIS-web/1.0 github.com/mlk010173/jarvis' } });
      if (!r.ok) return erro('Feriados indisponíveis agora.');
      const lista: any[] = await r.json().catch(() => []);
      const nacionais = lista.filter((f: any) => f.global).map((f: any) => ({ data: f.date, nome: f.localName }));
      if (!nacionais.length) return erro('Sem feriados para o ano informado.');
      return json({ ano, feriados: nacionais });
    }
    if (rota === '/api/web/repos') {
      const e = login401(); if (e) return e;
      const r = await fetch('https://api.github.com/repos/mlk010173/jarvis', { headers: { 'User-Agent': 'JARVIS-web/1.0 github.com/mlk010173/jarvis' } });
      const o: any = await r.json().catch(() => null);
      if (!r.ok || !o?.full_name) return erro('Repositório indisponível agora.');
      return json({ nome: o.full_name, estrelas: o.stargazers_count, forks: o.forks_count, issues: o.open_issues_count, atualizado: String(o.updated_at || '').slice(0, 10), url: o.html_url });
    }

    if (rota === '/api/info') return json({ marca: 'JARVIS', limites: { gratis: 100, pro: 5000 }, provedores: [] });
    if (rota === '/api/comercial/planos') return json({ planos: [{ id: 'jarvis', nome: 'JARVIS', publico: 'Versão web aberta do projeto — tudo liberado', preco_centavos: 0, precos: null }] });

// ---------- painéis e conteúdo: servidos pela função jarvisApi2 (mesmo envelope, mesmo banco) ----------
    const PAINEL = ['/api/casa/', '/api/financeiro/', '/api/leads', '/api/logs', '/api/monitor/', '/api/dono/', '/api/fontes', '/api/ui/', '/api/ponte/', '/api/cupons/', '/api/pagamentos/', '/api/novidades', '/api/marketing/', '/api/web/briefing', '/api/download/'];
    if (PAINEL.some((p) => rota === p || rota.startsWith(p)) && !rota.startsWith('/api/logs/ia')) {
      try {
        const r2 = await fetch('https://superagent-6e379590.base44.app/functions/jarvisApi2', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) });
        return new Response(await r2.text(), { status: r2.status, headers: CORS });
      } catch (err: any) {
        return erro('Serviço de painéis indisponível: ' + (err?.message || 'erro'), 502);
      }
    }

    return erro('Rota não disponível no JARVIS.', 404);
  } catch (e) {
    return erro('Erro interno: ' + (e?.message || String(e)), 500);
  }
});
