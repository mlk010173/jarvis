import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';
// JARVIS – backend real do site (Base44 backend function)
// Rotas da API do JARVIS: contas, sessões, preferências, projetos, clima, moedas, cripto, wiki,
// feriados, GitHub, briefing (notícias reais), casa (Home Assistant real), financeiro, leads,
// logs, monitor, negócio e biblioteca de componentes de UI. Tudo real: sem chave é erro honesto.
const CORS = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Content-Type': 'application/json; charset=utf-8',
};
const json = (obj, status = 200) => new Response(JSON.stringify(obj), { status, headers: CORS });
const erro = (msg, status = 400) => json({ erro: msg }, status);
// ---------- cripto real (PBKDF2-SHA256, 60k iterações, salt aleatório) ----------
const hex = (b) => [...new Uint8Array(b)].map((x) => x.toString(16).padStart(2, '0')).join('');
const unhex = (h) => new Uint8Array((h.match(/../g) || []).map((x) => parseInt(x, 16)));
async function hashSenha(senha, saltHex) {
    const key = await crypto.subtle.importKey('raw', new TextEncoder().encode(senha), 'PBKDF2', false, ['deriveBits']);
    const bits = await crypto.subtle.deriveBits({ name: 'PBKDF2', hash: 'SHA-256', salt: unhex(saltHex), iterations: 60000 }, key, 256);
    return hex(bits);
}
// ---------- limite real por token (anti-abuso) ----------
const ratos = new Map();
function rateLimit(chave) {
    const agora = Date.now();
    const r = ratos.get(chave);
    if (!r || r.reset < agora) {
        ratos.set(chave, { n: 1, reset: agora + 60000 });
        return true;
    }
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
const PRECO_1M_USD = [[/gpt-4o-mini/, 0.15, 0.6], [/gpt-4o\b/, 2.5, 10], [/^o\d/, 1.25, 10], [/claude-3-5-haiku/, 0.8, 4], [/claude.*haiku/, 1, 5], [/claude.*sonnet/, 3, 15], [/gemini-2.0-flash/, 0.1, 0.4], [/gemini/, 0.3, 1.2], [/deepseek/, 0.14, 0.28], [/mistral-small/, 0.2, 0.6], [/grok/, 0.5, 2]]; // entrada, saída por 1M tokens (estimativa)
const OBS = { log: [] };
const RL = new Map();
const mesAtual = () => new Date().toISOString().slice(0, 7);
const custoUsd = (modelo, tin, tout) => {
    const p = PRECO_1M_USD.find((x) => x[0].test(String(modelo || '')));
    if (!p)
        return 0; // modelos free e desconhecidos: 0
    return (Number(tin || 0) / 1e6) * p[1] + (Number(tout || 0) / 1e6) * p[2];
};
function registrarObs(ev) {
    ev.mes = mesAtual();
    OBS.log.push(ev);
    if (OBS.log.length > 800)
        OBS.log.splice(0, OBS.log.length - 800);
}
function rlPermitir(chave, max, janelaMs = 60e3) {
    const agora = Date.now();
    const lista = (RL.get(chave) || []).filter((t) => agora - t < janelaMs);
    if (lista.length >= max)
        return false;
    lista.push(agora);
    RL.set(chave, lista);
    return true;
}
// guarda SSRF: só endereços https públicos
const hostPermitido = (u) => {
    let h;
    try {
        h = new URL(String(u || '')).hostname;
    }
    catch {
        return false;
    }
    if (!/^https:/.test(String(u || '')))
        return false;
    if (/^(localhost|.*\.local)$/i.test(h))
        return false;
    if (/^(10\.|127\.|192\.168\.|169\.254\.|0\.)/.test(h))
        return false;
    const m172 = h.match(/^172\.(\d+)\./);
    if (m172 && +m172[1] >= 16 && +m172[1] <= 31)
        return false;
    if (h === '::1' || h === '[::1]' || h === '::')
        return false;
    return true;
};
// BYOK cifrado em repouso: AES-256-GCM com chave mestra do ambiente (sem chave => texto puro e estado honesto)
const CHAVE_MESTRA = (typeof Deno !== 'undefined' && Deno.env) ? (Deno.env.get('JARVIS_MASTER_KEY') || '') : '';
const b64 = (b) => btoa(String.fromCharCode(...new Uint8Array(b)));
const deB64 = (s) => Uint8Array.from(atob(s), (ch) => ch.charCodeAt(0));
async function chaveCripto(raw) { return crypto.subtle.importKey('raw', raw, 'AES-GCM', false, ['encrypt', 'decrypt']); }
async function cifra(texto) {
    if (!CHAVE_MESTRA)
        return texto;
    try {
        const chaveRaw = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(CHAVE_MESTRA));
        const iv = crypto.getRandomValues(new Uint8Array(12));
        const cr = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, await chaveCripto(chaveRaw), new TextEncoder().encode(texto));
        return 'enc1:' + b64(iv) + ':' + b64(cr);
    }
    catch {
        return texto;
    }
}
async function decifra(v) {
    const s = String(v ?? '');
    if (!s.startsWith('enc1:'))
        return s;
    if (!CHAVE_MESTRA)
        throw new Error('Chave de IA cifrada, mas JARVIS_MASTER_KEY não está configurada no ambiente.');
    try {
        const [_, ivS, dS] = s.split(':');
        const chaveRaw = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(CHAVE_MESTRA));
        const pt = await crypto.subtle.decrypt({ name: 'AES-GCM', iv: deB64(ivS) }, await chaveCripto(chaveRaw), deB64(dS));
        return new TextDecoder().decode(pt);
    }
    catch {
        throw new Error('Não foi possível decifrar a chave de IA.');
    }
}
// ---------- catálogo de provedores de IA (BYOK: a conta traz a própria chave) ----------
const CATALOGO_IAS = [
    { id: 'gemini', nome: 'Google Gemini', tipo: 'gemini', site: 'https://aistudio.google.com/apikey', gratis: true, modelo_padrao: 'gemini-2.0-flash', recomendacao: { posicao: 1, motivo: 'Plano gratuito generoso do Google e respostas rápidas — comece por aqui.' } },
    { id: 'openai', nome: 'OpenAI', tipo: 'openai', site: 'https://platform.openai.com/api-keys', gratis: false, modelo_padrao: 'gpt-4o-mini', base: 'https://api.openai.com/v1', recomendacao: { posicao: 2, motivo: 'A mais usada do mercado, ótima qualidade no modelo mini.' } },
    { id: 'anthropic', nome: 'Anthropic Claude', tipo: 'anthropic', site: 'https://console.anthropic.com/settings/keys', gratis: false, modelo_padrao: 'claude-3-5-haiku-latest', recomendacao: { posicao: 3, motivo: 'Excelente escrita e raciocínio.' } },
    { id: 'groq', nome: 'Groq', tipo: 'openai', site: 'https://console.groq.com/keys', gratis: true, base: 'https://api.groq.com/openai/v1', modelo_padrao: 'llama-3.3-70b-versatile', recomendacao: { posicao: 4, motivo: 'Grátis e absurdamente rápido (Llama).' } },
    { id: 'openrouter', nome: 'OpenRouter', tipo: 'openai', site: 'https://openrouter.ai/keys', gratis: true, base: 'https://openrouter.ai/api/v1', modelo_padrao: 'meta-llama/llama-3.3-70b-instruct:free', recomendacao: { posicao: 5, motivo: 'Uma chave, dezenas de modelos (inclusive gratuitos).' } },
    { id: 'deepseek', nome: 'DeepSeek', tipo: 'openai', site: 'https://platform.deepseek.com/api_keys', gratis: false, base: 'https://api.deepseek.com/v1', modelo_padrao: 'deepseek-chat', recomendacao: { posicao: 6, motivo: 'Custo baixo e bom raciocínio.' } },
    { id: 'mistral', nome: 'Mistral', tipo: 'openai', site: 'https://console.mistral.ai/api-keys', gratis: false, base: 'https://api.mistral.ai/v1', modelo_padrao: 'mistral-small-latest', recomendacao: { posicao: 7, motivo: 'Modelos europeus, preço justo.' } },
    { id: 'ollama', nome: 'Ollama (local no seu PC)', tipo: 'openai', site: 'https://ollama.com', gratis: true, base: 'http://127.0.0.1:11434/v1', modelo_padrao: 'llama3.2', recomendacao: { posicao: 8, motivo: 'Grátis e privado, mas só funciona com o Ollama rodando na MESMA máquina do backend (app do PC). No site em nuvem o 127.0.0.1 é o servidor, não o seu PC.' } },
];
const iaCatalogo = (id) => CATALOGO_IAS.find((x) => x.id === id);
// monitor de execuções (estilo Langfuse): latência, tokens, custo estimado e erro de cada chamada
async function chamarIA(ia, mensagens, rotulo = 'chat') {
    const t0 = Date.now();
    try {
        const r = await chamarIAInterna(ia, mensagens);
        registrarObs({ quando: t0, rotulo, provedor: ia.id || '?', modelo: r.modelo || ia.modelo || '?', ms: Date.now() - t0, ok: true, tokens_in: r.tokens_in || 0, tokens_out: r.tokens_out || 0, custo_usd: custoUsd(r.modelo, r.tokens_in, r.tokens_out), erro: null });
        return r;
    }
    catch (err) {
        registrarObs({ quando: t0, rotulo, provedor: ia.id || '?', modelo: ia.modelo || '?', ms: Date.now() - t0, ok: false, tokens_in: 0, tokens_out: 0, custo_usd: 0, erro: String(err?.message || err || 'erro').slice(0, 200) });
        throw err;
    }
}
async function chamarIAInterna(ia, mensagens) {
    const cat = iaCatalogo(ia.id) || { tipo: 'openai', base: 'https://api.openai.com/v1', modelo_padrao: 'gpt-4o-mini', nome: 'IA' };
    const modelo = ia.modelo || cat.modelo_padrao;
    const sys = mensagens.filter((m) => m.role === 'system').map((m) => m.content).join('\n');
    const conversa = mensagens.filter((m) => m.role !== 'system');
    if (cat.tipo === 'gemini') {
        const r = await fetch('https://generativelanguage.googleapis.com/v1beta/models/' + modelo + ':generateContent?key=' + encodeURIComponent(ia.chave), {
            method: 'POST', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ systemInstruction: sys ? { parts: [{ text: sys }] } : undefined, contents: conversa.map((m) => ({ role: m.role === 'assistant' ? 'model' : 'user', parts: [{ text: m.content }] })) }),
        });
        const j = await r.json().catch(() => ({}));
        if (!r.ok)
            throw new Error(j?.error?.message || 'Gemini recusou (status ' + r.status + ').');
        const resposta = ((j.candidates?.[0]?.content?.parts) || []).map((p) => p.text || '').join('').trim();
        if (!resposta)
            throw new Error('Gemini não devolveu texto.');
        return { texto: resposta, ia: cat.nome, modelo: j.model || modelo, tokens_in: j?.usageMetadata?.promptTokenCount ?? j?.usage?.input_tokens ?? j?.usage?.prompt_tokens ?? 0, tokens_out: j?.usageMetadata?.candidatesTokenCount ?? j?.usage?.output_tokens ?? j?.usage?.completion_tokens ?? 0 };
    }
    if (cat.tipo === 'anthropic') {
        const r = await fetch('https://api.anthropic.com/v1/messages', {
            method: 'POST', headers: { 'Content-Type': 'application/json', 'x-api-key': ia.chave, 'anthropic-version': '2023-06-01' },
            body: JSON.stringify({ model: modelo, max_tokens: 1024, system: sys || undefined, messages: conversa.map((m) => ({ role: m.role === 'assistant' ? 'assistant' : 'user', content: m.content })) }),
        });
        const j = await r.json().catch(() => ({}));
        if (!r.ok)
            throw new Error(j?.error?.message || 'Claude recusou (status ' + r.status + ').');
        const resposta = (j.content || []).map((b) => b.text || '').join('').trim();
        if (!resposta)
            throw new Error('Claude não devolveu texto.');
        return { texto: resposta, ia: cat.nome, modelo: j.model || modelo, tokens_in: j?.usageMetadata?.promptTokenCount ?? j?.usage?.input_tokens ?? j?.usage?.prompt_tokens ?? 0, tokens_out: j?.usageMetadata?.candidatesTokenCount ?? j?.usage?.output_tokens ?? j?.usage?.completion_tokens ?? 0 };
    }
    const base = cat.base || 'https://api.openai.com/v1';
    const r = await fetch(base + '/chat/completions', {
        method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + ia.chave },
        body: JSON.stringify({ model: modelo, messages: mensagens.slice(-24), max_tokens: 1024 }),
    });
    const j = await r.json().catch(() => ({}));
    if (!r.ok)
        throw new Error(j?.error?.message || j?.error || 'IA recusou (status ' + r.status + ').');
    const resposta = (j.choices?.[0]?.message?.content || '').trim();
    if (!resposta)
        throw new Error('A IA não devolveu texto.');
    return { texto: resposta, ia: cat.nome, modelo: j.model || modelo, tokens_in: j?.usageMetadata?.promptTokenCount ?? j?.usage?.input_tokens ?? j?.usage?.prompt_tokens ?? 0, tokens_out: j?.usageMetadata?.candidatesTokenCount ?? j?.usage?.output_tokens ?? j?.usage?.completion_tokens ?? 0 };
}
// ---------- ferramentas do modo agente: pesquisa e leitura reais ----------
const decodificar = (t) => String(t || '').replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&#x27;|&#39;/g, "'").replace(/&#(\d+);/g, (_, n) => String.fromCharCode(Number(n)));
async function pesquisarWeb(q) {
    const UA = { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/128.0 Safari/537.36', 'Accept-Language': 'pt-BR,pt;q=0.9,en;q=0.8' };
    // 1) Bing
    try {
        const r = await fetch('https://www.bing.com/search?q=' + encodeURIComponent(q) + '&setlang=pt', { headers: UA });
        if (r.ok) {
            const html = await r.text();
            const resultados = [];
            for (const bloco of html.split('class="b_algo"').slice(1, 8)) {
                const mA = /<h2><a[^>]*href="([^"]+)"[^>]*>([\s\S]*?)<\/a>/.exec(bloco);
                if (!mA)
                    continue;
                let url = decodificar(mA[1]);
                const mU = /u=a1([A-Za-z0-9_-]+)/.exec(url);
                if (mU) {
                    try {
                        let b = mU[1].replace(/-/g, '+').replace(/_/g, '/');
                        while (b.length % 4)
                            b += '=';
                        url = atob(b);
                    }
                    catch { }
                }
                const titulo = decodificar(mA[2].replace(/<[^>]+>/g, '')).trim();
                const mS = /<p[^>]*>([\s\S]*?)<\/p>/.exec(bloco);
                const resumo = mS ? decodificar(mS[1].replace(/<[^>]+>/g, '')).trim().slice(0, 240) : '';
                if (titulo && /^https?:\/\//.test(url) && url.indexOf('bing.com') === -1 && !resultados.some((x) => x.url === url))
                    resultados.push({ titulo, url, resumo });
                if (resultados.length >= 6)
                    break;
            }
            if (resultados.length)
                return { resultados, fonte: 'Bing' };
        }
    }
    catch { }
    // 2) DuckDuckGo (html e lite)
    for (const u of ['https://html.duckduckgo.com/html/?q=', 'https://lite.duckduckgo.com/lite/?q=']) {
        try {
            const r = await fetch(u + encodeURIComponent(q), { headers: UA });
            if (!r.ok)
                continue;
            const html = await r.text();
            const resultados = [];
            for (const m of html.matchAll(/<a[^>]*class="result__a"[^>]*href="([^"]+)"[^>]*>([\s\S]*?)<\/a>/g)) {
                let url = decodificar(m[1]);
                const mU = /uddg=([^&]+)/.exec(url);
                if (mU) {
                    try {
                        url = decodeURIComponent(mU[1]);
                    }
                    catch { }
                }
                if (url.startsWith('//'))
                    url = 'https:' + url;
                const titulo = decodificar(m[2].replace(/<[^>]+>/g, '')).trim();
                if (titulo && url && !resultados.some((x) => x.titulo === titulo))
                    resultados.push({ titulo, url, resumo: '' });
                if (resultados.length >= 6)
                    break;
            }
            const snacks = [...html.matchAll(/class="result__snippet"[^>]*>([\s\S]*?)<\/a>/g)].map((m) => decodificar(m[1].replace(/<[^>]+>/g, '')).trim());
            resultados.forEach((x, i) => { x.resumo = (snacks[i] || '').slice(0, 240); });
            if (resultados.length)
                return { resultados, fonte: 'DuckDuckGo' };
        }
        catch { }
    }
    throw new Error('A busca não respondeu agora. Tente de novo.');
}
async function abrirWeb(url) {
    if (!hostPermitido(String(url || '')))
        throw new Error('Só endereços https públicos são permitidos (rede interna e http são bloqueados).');
    const r = await fetch(url, { headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/128.0 Safari/537.36' } });
    if (!r.ok)
        throw new Error('A página respondeu status ' + r.status + '.');
    const html = (await r.text()).slice(0, 2 * 1024 * 1024);
    const titulo = decodificar((html.match(/<title[^>]*>([\s\S]*?)<\/title>/i) || [])[1] || '').trim();
    const texto = html.replace(/<script[\s\S]*?<\/script>/gi, ' ').replace(/<style[\s\S]*?<\/style>/gi, ' ').replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
    return { titulo, texto: texto.slice(0, 4000), url };
}
async function rodarFerramenta(nome, arg) {
    if (nome === 'PESQUISAR') {
        const r = await pesquisarWeb(arg);
        return r.resultados.map((x, i) => (i + 1) + '. ' + x.titulo + ' — ' + x.url + (x.resumo ? ' | ' + x.resumo : '')).join('\n');
    }
    if (nome === 'ABRIR') {
        const p = await abrirWeb(arg);
        return (p.titulo ? p.titulo + '\n' : '') + p.texto;
    }
    throw new Error('Ferramenta desconhecida: ' + nome);
}
// ---------- notícias reais (RSS públicos do Brasil, cache de 10 min, com cadeia de fontes) ----------
let noticias = null;
const limpa = (t) => t.replace(/<!\[CDATA\[|\]\]>/g, '').replace(/<[^>]+>/g, '').trim();
async function rss(url, fonteFixa) {
    const r = await fetch(url, { headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/128.0 Safari/537.36 JARVIS-web/1.0' } });
    if (!r.ok)
        return [];
    const xml = await r.text();
    const itens = [];
    for (const m of xml.matchAll(/<item>([\s\S]*?)<\/item>/g)) {
        if (itens.length >= 8)
            break;
        const b = m[1];
        const titulo = limpa(b.match(/<title>([\s\S]*?)<\/title>/)?.[1] || '');
        const link = limpa(b.match(/<link>([\s\S]*?)<\/link>/)?.[1] || '');
        const pub = limpa(b.match(/<pubDate>([\s\S]*?)<\/pubDate>/)?.[1] || '') || limpa(b.match(/<published>([\s\S]*?)<\/published>/)?.[1] || '');
        if (!titulo || !link)
            continue;
        const fonteTag = limpa(b.match(/<source[^>]*>([\s\S]*?)<\/source>/)?.[1] || '');
        const sep = titulo.lastIndexOf(' - ');
        const fonte = fonteFixa || fonteTag || (sep > 0 ? titulo.slice(sep + 3) : 'Notícias');
        itens.push({ titulo: fonteFixa ? titulo : (sep > 0 ? titulo.slice(0, sep) : titulo), link, fonte, quando: pub ? new Date(pub).toISOString() : new Date().toISOString() });
    }
    return itens;
}
async function manchetes() {
    if (noticias && Date.now() - noticias.quando < 600000)
        return noticias.itens;
    let itens = [];
    try {
        itens = await rss('https://news.google.com/rss?hl=pt-BR&gl=BR&ceid=BR:pt-419', '');
    }
    catch { }
    if (!itens.length) {
        try {
            itens = await rss('https://feeds.bbci.co.uk/portuguese/rss.xml', 'BBC Brasil');
        }
        catch { }
    }
    if (!itens.length) {
        try {
            itens = await rss('https://g1.globo.com/rss/g1/', 'G1');
        }
        catch { }
    }
    if (itens.length)
        noticias = { quando: Date.now(), itens };
    return itens;
}
// ---------- biblioteca de componentes de UI (HTML + CSS reais, tudo liberado) ----------
const BASE_CSS = `.oc-tema{--c1:#2E9BFF;--c2:#7c5cff;--fundo:#0d1220;--carta:#151c30;--texto:#e8ecf6;--borda:rgba(46,155,255,.16);--ok:#2ecc8f;--aviso:#ffb454;--ruim:#ff5c7a;--raio:14px;font-family:system-ui,-apple-system,'Segoe UI',Roboto,sans-serif;color:var(--texto);background:var(--fundo);border-radius:var(--raio);padding:18px;box-sizing:border-box}
.oc-tema *{box-sizing:border-box}
.oc-tema a{color:var(--c1);text-decoration:none}`;
const COMPONENTES = [
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
export const handler = async (req) => {
    if (req.method === 'OPTIONS')
        return new Response(null, { status: 204, headers: CORS });
    let body = {};
    try {
        body = await req.json();
    }
    catch {
        return erro('Corpo JSON inválido.');
    }
    // ---------- servidor MCP oficial (JSON-RPC 2.0, spec modelcontextprotocol.io) ----------
    if (body && body.jsonrpc === '2.0' && body.method) {
        const idR = body.id === undefined ? null : body.id;
        const rcp = (obj) => new Response(JSON.stringify(Object.assign({ jsonrpc: '2.0' }, idR !== null ? { id: idR } : {}, obj)), { status: 200, headers: CORS });
        const rcpErr = (code, msg) => rcp({ error: { code, message: msg } });
        const bearerMcp = String(req.headers.get('authorization') || '').replace(/^Bearer\s+/i, '');
        const dbMcp = createClientFromRequest(req).asServiceRole ?? createClientFromRequest(req);
        const normMcp = async (ent) => { const r = await dbMcp.entities[ent].list({}); return Array.isArray(r) ? r : (r?.items || r?.data || []); };
        const fMcp = (r, k) => r?.[k] ?? r?.data?.[k];
        const chaveProjetoOk = bearerMcp ? (await normMcp('JarvisProjeto')).find((x) => { try {
            return (JSON.parse(fMcp(x, 'chaves') || '[]') || []).some((k) => k.valor === bearerMcp);
        }
        catch {
            return false;
        } }) : null;
        const tokMcp = String(body.params?.token || '');
        const sessMcp = tokMcp ? (await normMcp('JarvisSessao')).find((s) => fMcp(s, 'token') === tokMcp && Number(fMcp(s, 'expira')) > Date.now()) : null;
        if (!chaveProjetoOk && !sessMcp && body.method !== 'ping')
            return rcpErr(-32001, 'Envie Authorization: Bearer SUA_CHAVE de projeto ou params.token da conta.');
        const m = String(body.method || '');
        if (m === 'initialize')
            return rcp({ result: { protocolVersion: '2024-11-05', serverInfo: { name: 'jarvis', version: VERSAO }, capabilities: { tools: {} } } });
        if (m === 'ping')
            return rcp({ result: {} });
        if (m === 'tools/list')
            return rcp({ result: { tools: [
                        { name: 'pesquisar_web', description: 'Busca na internet (Bing com fallback DuckDuckGo) e devolve títulos, links e resumos.', inputSchema: { type: 'object', properties: { consulta: { type: 'string' } }, required: ['consulta'] } },
                        { name: 'abrir_url', description: 'Abre uma página https pública e devolve o texto principal (rede interna bloqueada).', inputSchema: { type: 'object', properties: { url: { type: 'string' } }, required: ['url'] } },
                        { name: 'clima', description: 'Previsão do tempo de uma cidade (MET.no).', inputSchema: { type: 'object', properties: { cidade: { type: 'string' } }, required: ['cidade'] } },
                        { name: 'moeda', description: 'Cotação entre duas moedas (AwesomeAPI/BCE).', inputSchema: { type: 'object', properties: { de: { type: 'string' }, para: { type: 'string' } }, required: ['de', 'para'] } },
                    ] } });
        if (m === 'tools/call') {
            const nome = String(body.params?.name || ''), args = body.params?.arguments || {};
            try {
                if (nome === 'pesquisar_web')
                    return rcp({ result: { content: [{ type: 'text', text: JSON.stringify(await pesquisarWeb(String(args.consulta || ''))) }] } });
                if (nome === 'abrir_url') {
                    const p = await abrirWeb(String(args.url || ''));
                    return rcp({ result: { content: [{ type: 'text', text: (p.titulo ? p.titulo + '\n' : '') + p.texto }] } });
                }
                if (nome === 'clima') {
                    const geo = await (await fetch('https://geocoding-api.open-meteo.com/v1/search?count=1&language=pt&name=' + encodeURIComponent(String(args.cidade || '')))).json().catch(() => ({}));
                    const g = geo?.results?.[0];
                    if (!g)
                        return rcpErr(-32002, 'Cidade não encontrada.');
                    const w = await (await fetch('https://api.met.no/weatherapi/locationforecast/2.0/compact?lat=' + g.latitude + '&lon=' + g.longitude, { headers: { 'User-Agent': 'jarvis-site' } })).json().catch(() => ({}));
                    const d = w?.properties?.timeseries?.[0]?.data;
                    return rcp({ result: { content: [{ type: 'text', text: JSON.stringify({ cidade: g.name, agora: d?.instant?.details, proximas_horas: (w?.properties?.timeseries || []).slice(1, 7).map((t) => ({ hora: t.time, ...t.data?.next_1_hours?.summary })) }) }] } });
                }
                if (nome === 'moeda') {
                    const de = String(args.de || 'USD'), para = String(args.para || 'BRL');
                    const r = await (await fetch('https://economia.awesomeapi.com.br/json/last/' + de + '-' + para)).json().catch(() => ({}));
                    const o = r?.[de + para];
                    if (!o)
                        return rcpErr(-32002, 'Par não disponível.');
                    return rcp({ result: { content: [{ type: 'text', text: JSON.stringify({ de, para, valor: o.bid, atualizado: o.create_date, fonte: 'AwesomeAPI' }) }] } });
                }
                return rcpErr(-32602, 'Ferramenta desconhecida: ' + nome);
            }
            catch (err) {
                return rcpErr(-32003, String(err?.message || err || 'falhou'));
            }
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
    const db = base44.asServiceRole ?? base44;
    const f = (r, k) => r?.[k] ?? r?.data?.[k];
    const norm = async (ent) => {
        const r = await db.entities[ent].list({});
        return Array.isArray(r) ? r : (r?.items || r?.data || []);
    };
    const contaPor = async (email) => (await norm('JarvisConta')).find((c) => String(f(c, 'email') || '').toLowerCase() === email);
    const sessaoValida = async () => {
        const s = (await norm('JarvisSessao')).find((x) => f(x, 'token') === token && Number(f(x, 'expira')) > Date.now());
        if (!s)
            return null;
        return await contaPor(String(f(s, 'email')));
    };
    const publicaConta = (c) => ({ id: c?.id || '', nome: f(c, 'nome') || '', email: f(c, 'email') || '', plano: 'premium', criado_em: f(c, 'created_date') || '' });
    const publicaProjeto = (p) => ({ id: p?.id || '', usuario_id: 'jarvis', nome: f(p, 'nome') || '', descricao: '', assistente: f(p, 'assistente') || 'JARVIS', instrucoes: f(p, 'instrucoes') || '', provedores: [], criado_em: f(p, 'criado_em') || f(p, 'created_date') || '' });
    // dados por conta (leads, finanças, monitor, casa…): JSON guardado por chave
    const dadoGet = async (email, chave, padrao) => {
        const r = (await norm('JarvisDado')).find((d) => f(d, 'email') === email && f(d, 'chave') === chave);
        if (!r)
            return padrao;
        try {
            return JSON.parse(f(r, 'valor'));
        }
        catch {
            return padrao;
        }
    };
    const dadoSet = async (email, chave, valor) => {
        const r = (await norm('JarvisDado')).find((d) => f(d, 'email') === email && f(d, 'chave') === chave);
        if (r)
            await db.entities.JarvisDado.update(r.id, { valor: JSON.stringify(valor) });
        else
            await db.entities.JarvisDado.create({ email, chave, valor: JSON.stringify(valor) });
    };
    // registro técnico por conta (nível INFO/AVISO/ERRO, sem chaves nem senhas)
    const logAdd = async (email, nivel, texto) => {
        await db.entities.JarvisLog.create({ email, nivel: nivel.toUpperCase().slice(0, 10), texto: String(texto).slice(0, 500), em: new Date().toISOString() });
        const todos = (await norm('JarvisLog')).filter((l) => f(l, 'email') === email);
        if (todos.length > 400)
            for (const antigo of todos.sort((a, b) => String(f(b, 'em')).localeCompare(String(f(a, 'em')))).slice(400))
                await db.entities.JarvisLog.delete(antigo.id);
    };
    try {
        if (!rateLimit(token || rota))
            return erro('Muitas requisições. Aguarde um instante.', 429);
        const auth = await sessaoValida();
        const login401 = () => (auth ? null : erro('Faça login.', 401));
        const email = auth ? String(f(auth, 'email')) : '';
        // ---------- conta ----------
        if (rota === '/api/conta/cadastro' && metodo === 'POST') {
            if (!rlPermitir('cad:' + ip, 10))
                return erro('Muitas tentativas; aguarde um minuto.', 429);
            const emailN = String(corpo.email || '').trim().toLowerCase();
            const senha = String(corpo.senha || '');
            if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(emailN))
                return erro('E-mail inválido.');
            if (senha.length < 8)
                return erro('A senha precisa de pelo menos 8 caracteres.');
            if (await contaPor(emailN))
                return erro('E-mail já cadastrado. Faça login.', 409);
            const salt = hex(crypto.getRandomValues(new Uint8Array(16)));
            const hash = await hashSenha(senha, salt);
            const conta = await db.entities.JarvisConta.create({ email: emailN, nome: String(corpo.nome || emailN.split('@')[0]).slice(0, 60), hash, salt });
            const tok = crypto.randomUUID() + crypto.randomUUID();
            await db.entities.JarvisSessao.create({ token: tok, email: emailN, expira: Date.now() + 30 * 864e5 });
            await logAdd(emailN, 'INFO', 'Conta criada.');
            return json({ ok: true, token: tok, usuario: publicaConta(conta) }, 201);
        }
        if (rota === '/api/conta/entrar' && metodo === 'POST') {
            if (!rlPermitir('ent:' + ip, 12))
                return erro('Muitas tentativas; aguarde um minuto.', 429);
            const emailN = String(corpo.email || '').trim().toLowerCase();
            const conta = await contaPor(emailN);
            const hash = conta ? await hashSenha(String(corpo.senha || ''), f(conta, 'salt')) : '';
            if (!conta || hash !== f(conta, 'hash'))
                return erro('E-mail ou senha incorretos.', 401);
            const tok = crypto.randomUUID() + crypto.randomUUID();
            await db.entities.JarvisSessao.create({ token: tok, email: emailN, expira: Date.now() + 30 * 864e5 });
            await logAdd(emailN, 'INFO', 'Login no site.');
            return json({ ok: true, token: tok, usuario: publicaConta(conta) });
        }
        if (rota === '/api/conta/sair' && metodo === 'POST') {
            for (const s of await norm('JarvisSessao'))
                if (f(s, 'token') === token)
                    await db.entities.JarvisSessao.delete(s.id);
            return json({ ok: true });
        }
        if (rota === '/api/conta/sessao')
            return auth ? json({ logado: true, usuario: publicaConta(auth) }) : json({ logado: false });
        if (rota === '/api/conta/eu')
            return login401() || json({ usuario: publicaConta(auth) });
        if (rota === '/api/conta/plano' || rota === '/api/conta/assinatura')
            return login401() || json(PLANO);
        if (rota === '/api/conta/senha' && metodo === 'PUT') {
            const e = login401();
            if (e)
                return e;
            const senha = String(corpo.senha || corpo.nova || '');
            if (senha.length < 8)
                return erro('A senha precisa de pelo menos 8 caracteres.');
            const salt = hex(crypto.getRandomValues(new Uint8Array(16)));
            await db.entities.JarvisConta.update(auth.id, { salt, hash: await hashSenha(senha, salt) });
            await logAdd(email, 'INFO', 'Senha alterada.');
            return json({ ok: true });
        }
        if (rota === '/api/conta/preferencias') {
            const e = login401();
            if (e)
                return e;
            if (metodo === 'PUT') {
                await db.entities.JarvisConta.update(auth.id, { preferencias: JSON.stringify(corpo) });
                return json({ ok: true });
            }
            const p = f(auth, 'preferencias');
            return json(p ? JSON.parse(p) : { configurado: false, dados: {} });
        }
        if (rota === '/api/conta/memoria') {
            const e = login401();
            if (e)
                return e;
            if (metodo === 'PUT') {
                await db.entities.JarvisConta.update(auth.id, { memoria: JSON.stringify(corpo) });
                return json({ ok: true });
            }
            if (metodo === 'DELETE') {
                await db.entities.JarvisConta.update(auth.id, { memoria: '' });
                return json({ ok: true });
            }
            const m = f(auth, 'memoria');
            return json(m ? JSON.parse(m) : {});
        }
        // ---------- IAs da conta (fila BYOK: a conta traz a própria chave) ----------
        const mIa = rota.match(/^\/api\/conta\/ias\/([^/]+)(\/testar)?$/);
        if (rota === '/api/conta/ias' || rota === '/api/conta/ias-ordem' || mIa) {
            const e = login401();
            if (e)
                return e;
            const fila = await dadoGet(email, 'ias', []);
            const salvarIas = async () => dadoSet(email, 'ias', fila);
            if (rota === '/api/conta/ias' && metodo === 'GET') {
                return json(CATALOGO_IAS.map((cat) => {
                    const ligada = fila.find((i) => i.id === cat.id);
                    return { id: cat.id, nome: cat.nome, tipo: cat.tipo, site: cat.site, gratis: !!cat.gratis, modelo_padrao: cat.modelo_padrao, conectada: !!ligada, ordem: ligada ? fila.indexOf(ligada) : 999, modelo: ligada ? ligada.modelo : null, final_chave: ligada ? (ligada.final || null) : null, recomendacao: cat.recomendacao };
                }));
            }
            if (rota === '/api/conta/ias-ordem' && metodo === 'PUT') {
                const ordem = corpo.ordem || [];
                fila.sort((a, b) => (ordem.indexOf(a.id) === -1 ? 99 : ordem.indexOf(a.id)) - (ordem.indexOf(b.id) === -1 ? 99 : ordem.indexOf(b.id)));
                await salvarIas();
                return json({ ok: true });
            }
            if (mIa) {
                const cat = iaCatalogo(mIa[1]);
                if (!cat)
                    return erro('Provedor desconhecido.', 404);
                const ligada = fila.find((i) => i.id === cat.id);
                if (mIa[2] === '/testar' && metodo === 'POST') {
                    if (!ligada)
                        return erro('Conecte a chave primeiro.', 400);
                    try {
                        await chamarIA({ ...ligada, chave: await decifra(ligada.chave) }, [{ role: 'user', content: 'Responda apenas: ok' }], 'testar');
                        return json({ ok: true, msg: cat.nome + ' respondeu — chave válida.' });
                    }
                    catch (err) {
                        return json({ ok: false, msg: err.message || 'Falhou.' });
                    }
                }
                if (metodo === 'PUT') {
                    const chave = String(corpo.chave || '').trim();
                    if (!chave)
                        return erro('Informe a chave.', 400);
                    const chaveC = await cifra(chave);
                    if (ligada) {
                        ligada.chave = chaveC;
                        ligada.final = '…' + chave.slice(-4);
                        ligada.modelo = String(corpo.modelo || ligada.modelo || cat.modelo_padrao);
                    }
                    else
                        fila.push({ id: cat.id, chave: chaveC, final: '…' + chave.slice(-4), modelo: String(corpo.modelo || cat.modelo_padrao), ordem: fila.length });
                    await salvarIas();
                    return json({ ok: true });
                }
                if (metodo === 'DELETE') {
                    const nova = fila.filter((i) => i.id !== cat.id);
                    await dadoSet(email, 'ias', nova);
                    return json({ ok: true });
                }
            }
            return erro('Método não suportado.', 405);
        }
        // ---------- projetos (assistentes) ----------
        if (rota === '/api/projetos' && metodo === 'GET') {
            const e = login401();
            if (e)
                return e;
            const meus = (await norm('JarvisProjeto')).filter((p) => f(p, 'email') === email)
                .sort((a, b) => String(f(a, 'criado_em')).localeCompare(String(f(b, 'criado_em'))));
            return json(meus.map(publicaProjeto));
        }
        if (rota === '/api/projetos' && metodo === 'POST') {
            const e = login401();
            if (e)
                return e;
            const nome = String(corpo.nome || '').slice(0, 60) || 'Novo assistente';
            const chavePub = 'jarvis_sk_' + Array.from(crypto.getRandomValues(new Uint8Array(18))).map((b) => b.toString(16).padStart(2, '0')).join('');
            const p = await db.entities.JarvisProjeto.create({ email, nome, assistente: String(corpo.assistente || 'JARVIS').slice(0, 60), instrucoes: String(corpo.instrucoes || '').slice(0, 4000), criado_em: new Date().toISOString(), chaves: JSON.stringify([{ id: '1', nome: 'padrão', valor: chavePub, criado: new Date().toISOString() }]) });
            return json(publicaProjeto(p), 201);
        }
        if (rota === '/api/projetos/apagar' && metodo === 'POST') {
            const e = login401();
            if (e)
                return e;
            const p = (await norm('JarvisProjeto')).find((x) => x.id === String(corpo.id || '') && f(x, 'email') === email);
            if (!p)
                return erro('Projeto não encontrado.', 404);
            await db.entities.JarvisProjeto.delete(p.id);
            return json({ ok: true });
        }
        if (rota === '/api/projetos/salvar' && metodo === 'POST') {
            const e = login401();
            if (e)
                return e;
            const id = String(corpo.id || '');
            const meus = (await norm('JarvisProjeto')).filter((p) => f(p, 'email') === email);
            const p = id ? meus.find((x) => x.id === id) : null;
            if (id && !p)
                return erro('Projeto não encontrado.', 404);
            const dados = { nome: String(corpo.nome ?? f(p, 'nome') ?? 'Projeto').slice(0, 60), assistente: String(corpo.assistente ?? f(p, 'assistente') ?? 'JARVIS').slice(0, 60), instrucoes: String(corpo.instrucoes ?? f(p, 'instrucoes') ?? '').slice(0, 4000) };
            if (p) {
                await db.entities.JarvisProjeto.update(p.id, dados);
                return json(publicaProjeto({ ...p, ...dados }));
            }
            const novo = await db.entities.JarvisProjeto.create({ email, ...dados, criado_em: new Date().toISOString() });
            return json(publicaProjeto(novo), 201);
        }
        if (rota.startsWith('/api/projetos/')) {
            const e = login401();
            if (e)
                return e;
            const idProj = rota.split('/')[3];
            const subProj = rota.split('/')[4] || '';
            const p = (await norm('JarvisProjeto')).find((x) => x.id === idProj && f(x, 'email') === email);
            if (!p)
                return erro('Projeto não encontrado.', 404);
            if (subProj === 'testar' && metodo === 'POST') {
                const fila = await dadoGet(email, 'ias', []);
                if (!fila.length)
                    return erro('Nenhuma IA conectada. Configure em Minhas IAs (o Gemini tem plano grátis).', 400);
                let memItens = [];
                try {
                    const m = f(auth, 'memoria') ? JSON.parse(f(auth, 'memoria')) : null;
                    memItens = (m?.itens || m || []).slice(-12);
                }
                catch { }
                const mem = memItens.map((m) => m.texto || String(m)).join(' | ');
                const agente = String(corpo.personalidade || '') === 'agente';
                const ferramentas = 'FERRAMENTAS (use quando precisar de dados ao vivo, no formato exato): {PESQUISAR:termo} busca na internet; {ABRIR:url} lê uma página. Responda APENAS com a chamada da ferramenta quando for usar. Sem dados de internet, responda direto.';
                const persona = { serio: 'Seja direto e profissional.', amigavel: 'Seja amigável e leve.', professor: 'Explique passo a passo com exemplos.', tecnico: 'Seja preciso e denso.', direto: 'Responda curto, só o essencial.' };
                const sistema = [
                    f(p, 'instrucoes') || '',
                    'Você é ' + (f(p, 'assistente') || 'JARVIS') + ', assistente pessoal do usuário, respondendo sempre em português do Brasil.',
                    persona[corpo.personalidade] || 'Seja útil e natural.',
                    agente ? 'Modo Agente: você PODE usar as ferramentas sempre que a pergunta precisar de informação atual da internet.' : '',
                    ferramentas,
                    mem ? 'Lembranças do usuário: ' + mem : '',
                ].filter(Boolean).join(' ');
                const falhas = [];
                for (const iaBruta of fila) {
                    const ia = { ...iaBruta, chave: await decifra(iaBruta.chave) };
                    try {
                        let mensagens = [{ role: 'system', content: sistema }].concat((corpo.mensagens || []).slice(-24));
                        let resposta = null, iaUsada = null;
                        for (let rodada = 0; rodada < 4; rodada++) {
                            const r = await chamarIA(ia, mensagens);
                            const uso = /\{(PESQUISAR|ABRIR):([^}]+)\}/.exec(r.texto);
                            if (!uso) {
                                resposta = r.texto;
                                iaUsada = r.ia;
                                break;
                            }
                            try {
                                const resultado = await rodarFerramenta(uso[1], uso[2].trim());
                                mensagens.push({ role: 'assistant', content: r.texto });
                                mensagens.push({ role: 'user', content: 'RESULTADO DA FERRAMENTA ' + uso[1] + ' (use para responder em português, sem repetir o resultado cru):\n' + resultado.slice(0, 3000) });
                            }
                            catch (err) {
                                resposta = 'A ferramenta falhou: ' + (err.message || 'erro') + '.';
                                iaUsada = r.ia;
                                break;
                            }
                        }
                        if (resposta)
                            return json({ resposta, ia_nome: iaUsada, tentativas_falhas: falhas });
                    }
                    catch (err) {
                        falhas.push({ id: ia.id, erro: err.message || 'falhou' });
                    }
                }
                return erro('Todas as IAs falharam: ' + (falhas.map((x) => x.erro).join(' | ') || 'sem resposta.'), 502);
            }
            if (metodo === 'PUT') {
                const dados = { nome: String(corpo.nome ?? f(p, 'nome')).slice(0, 60), assistente: String(corpo.assistente ?? f(p, 'assistente')).slice(0, 60), instrucoes: String(corpo.instrucoes ?? f(p, 'instrucoes')).slice(0, 4000) };
                await db.entities.JarvisProjeto.update(p.id, dados);
                return json(publicaProjeto({ ...p, ...dados }));
            }
            if (metodo === 'DELETE') {
                await db.entities.JarvisProjeto.delete(p.id);
                return json({ ok: true });
            }
            return erro('Método não suportado.', 405);
        }
        // ---------- conteúdo real (sem provedor de IA: respostas honestas) ----------
        if (rota === '/api/projetos/assistente') {
            const e = login401();
            if (e)
                return e;
            const fila = await dadoGet(email, 'ias', []);
            if (!fila.length)
                return erro('Criar projeto com IA requer uma IA conectada em Minhas IAs.', 501);
            const acao = corpo.acao === 'otimizar' ? 'melhorar' : 'criar';
            const pedido = String(corpo.texto || '').slice(0, 4000);
            if (!pedido)
                return erro('Descreva o assistente que quer criar.', 400);
            try {
                const r = await chamarIA({ ...fila[0], chave: await decifra(fila[0].chave) }, [
                    { role: 'system', content: 'Você cria definições de assistentes para o JARVIS. Responda SOMENTE com JSON válido: {"nome": "", "assistente": "", "descricao": "", "instrucoes": ""} — nomes curtos, instruções em português.' },
                    { role: 'user', content: 'Ação: ' + acao + '. Pedido do usuário: ' + pedido },
                ]);
                const j = JSON.parse((r.texto.match(/\{[\s\S]*\}/) || [r.texto])[0]);
                return json({ projeto: { nome: String(j.nome || corpo.nome || 'Assistente').slice(0, 60), assistente: String(j.assistente || 'Assistente').slice(0, 60), descricao: String(j.descricao || '').slice(0, 300), instrucoes: String(j.instrucoes || '').slice(0, 4000) }, ia: r.ia });
            }
            catch (err) {
                return erro('A IA não conseguiu criar o projeto agora: ' + (err.message || 'erro'), 502);
            }
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
            const e = login401();
            if (e)
                return e;
            const q = String(qs.get('q') || corpo.q || '').trim();
            if (!q)
                return erro('Informe o que pesquisar.', 400);
            try {
                return json(await pesquisarWeb(q));
            }
            catch (err) {
                return erro(err.message || 'A busca falhou.', 502);
            }
        }
        if (rota === '/api/web/abrir') {
            const e = login401();
            if (e)
                return e;
            try {
                return json(await abrirWeb(String(qs.get('url') || corpo.url || '')));
            }
            catch (err) {
                return erro(err.message || 'Não consegui abrir.', 400);
            }
        }
        if (rota === '/api/voz/config') {
            const e = login401();
            if (e)
                return e;
            let voz = await dadoGet(email, 'voz', null);
            if (!voz)
                voz = { chave: '', voz_id: '21m00Tcm4TlvDq8ikWAM', on: false };
            if (metodo === 'PUT') {
                if (corpo.chave !== undefined)
                    voz.chave = String(corpo.chave).trim();
                if (corpo.voz_id !== undefined)
                    voz.voz_id = String(corpo.voz_id).trim();
                if (corpo.on !== undefined)
                    voz.on = Boolean(corpo.on);
                await dadoSet(email, 'voz', voz);
            }
            return json({ on: voz.on, voz_id: voz.voz_id, tem_chave: !!voz.chave, padrao: '21m00Tcm4TlvDq8ikWAM' });
        }
        if (rota === '/api/voz/vozes') {
            const e = login401();
            if (e)
                return e;
            const voz = await dadoGet(email, 'voz', { chave: '' });
            if (!voz.chave)
                return erro('Configure a chave da ElevenLabs primeiro (/voz chave SUA_CHAVE).', 400);
            const r = await fetch('https://api.elevenlabs.io/v1/voices', { headers: { 'xi-api-key': voz.chave } });
            const j = await r.json().catch(() => null);
            if (!r.ok || !j?.voices)
                return erro('ElevenLabs não respondeu (chave correta?).', 502);
            return json({ vozes: j.voices.map((v) => ({ id: v.voice_id, nome: v.name, idiomas: v.labels?.language || '' })) });
        }
        if (rota === '/api/voz/elevenlabs' && metodo === 'POST') {
            const e = login401();
            if (e)
                return e;
            const texto = String(corpo.texto || '').slice(0, 2000);
            if (!texto)
                return erro('Sem texto para falar.', 400);
            const voz = await dadoGet(email, 'voz', { chave: '', voz_id: '21m00Tcm4TlvDq8ikWAM', on: false });
            if (!voz.chave)
                return erro('Voz de estúdio sem chave: use /voz chave SUA_CHAVE (crie grátis em 11labs.io).', 400);
            const r = await fetch('https://api.elevenlabs.io/v1/text-to-speech/' + encodeURIComponent(voz.voz_id) + '?output_format=mp3_44100_128', {
                method: 'POST', headers: { 'xi-api-key': voz.chave, 'Content-Type': 'application/json', 'Accept': 'audio/mpeg' },
                body: JSON.stringify({ text: texto, model_id: 'eleven_multilingual_v2' }),
            });
            if (!r.ok) {
                const j = await r.json().catch(() => null);
                return erro('ElevenLabs recusou: ' + (j?.detail?.message || ('status ' + r.status)), 502);
            }
            const buf = new Uint8Array(await r.arrayBuffer());
            let bin = '';
            for (const b of buf)
                bin += String.fromCharCode(b);
            return json({ ok: true, formato: 'mp3', audio_base64: btoa(bin) });
        }
        // ---------- v1.3.3: saúde, capacidades, monitor, SDK v1, estados honestos ----------
        if (rota === '/api/health')
            return json({ ok: true, versao: VERSAO, backend: 'base44-deno', quando: new Date().toISOString() });
        if (rota === '/api/capabilities')
            return json({
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
        if (rota === '/api/conta/verificar-login')
            return json({ logado: !!auth, email: auth ? String(f(auth, 'email')) : null });
        if (rota === '/api/logs/ia') {
            const e = login401();
            if (e)
                return e;
            return json({ total: OBS.log.length, execucoes: OBS.log.slice(-120).reverse().map((ev) => ({ quando: new Date(ev.quando).toISOString(), rotulo: ev.rotulo, provedor: ev.provedor, modelo: ev.modelo, ms: ev.ms, ok: ev.ok, erro: ev.erro || null, tokens_in: ev.tokens_in, tokens_out: ev.tokens_out, custo_usd: Math.round(ev.custo_usd * 1e6) / 1e6 })) });
        }
        if (rota === '/api/logs/ia/resumo') {
            const e = login401();
            if (e)
                return e;
            const doMes = OBS.log.filter((ev) => ev.mes === mesAtual());
            const porModelo = {};
            for (const ev of doMes) {
                porModelo[ev.modelo] = porModelo[ev.modelo] || { chamadas: 0, erros: 0, ms_total: 0, tokens: 0, custo_usd: 0 };
                porModelo[ev.modelo].chamadas += 1;
                porModelo[ev.modelo].erros += ev.ok ? 0 : 1;
                porModelo[ev.modelo].ms_total += ev.ms;
                porModelo[ev.modelo].tokens += (ev.tokens_in || 0) + (ev.tokens_out || 0);
                porModelo[ev.modelo].custo_usd += ev.custo_usd || 0;
            }
            return json({ mes: mesAtual(), execucoes: doMes.length, por_modelo: porModelo });
        }
        if (rota === '/api/composio/mcp')
            return erro('Composio não está configurado neste backend: defina COMPOSIO_API_KEY no ambiente (hub Composio, 250+ apps). Enquanto ausente, use o MCP oficial em POST /mcp com Bearer de projeto.', 501);
        if (rota === '/api/email/caixa' || rota === '/api/email/ler')
            return erro('Conector de e-mail não configurado: requer credenciais IMAP/SMTP autorizadas pelo dono da conta.', 501);
        // SDK público v1 (chave de projeto, sem token de conta)
        if (rota === '/api/v1/chat' && metodo === 'POST') {
            const bearer = String(req.headers.get('authorization') || '').replace(/^Bearer\s+/i, '');
            if (!bearer)
                return erro('Envie Authorization: Bearer SUA_CHAVE de projeto (veja a chave em Devtools ou /api/v1/projeto).', 401);
            if (!rlPermitir('v1:' + bearer.slice(-10), 20))
                return erro('Muitas chamadas seguidas; aguarde um minuto.', 429);
            let projV1 = null;
            for (const x of await norm('JarvisProjeto')) {
                try {
                    if ((JSON.parse(f(x, 'chaves') || '[]') || []).some((k) => k.valor === bearer)) {
                        projV1 = x;
                        break;
                    }
                }
                catch { }
            }
            if (!projV1)
                return erro('Chave ausente, errada ou revogada.', 401);
            const donoV1 = String(f(projV1, 'email'));
            const filaV1 = await dadoGet(donoV1, 'ias', []);
            if (!filaV1.length)
                return erro('O dono do projeto não tem IA conectada.', 501);
            const sistemaV1 = [String(f(projV1, 'instrucoes') || ''), 'Você é ' + (f(projV1, 'assistente') || 'JARVIS') + '. Responda sempre em português do Brasil.'].filter(Boolean).join(' ');
            const falhasV1 = [];
            for (const iaBruta of filaV1) {
                try {
                    const r = await chamarIA({ ...iaBruta, chave: await decifra(iaBruta.chave) }, [{ role: 'system', content: sistemaV1 }].concat((corpo.mensagens || []).slice(-24)), 'sdk-v1');
                    return json({ resposta: r.texto, modelo: r.modelo, ia: r.ia, projeto: f(projV1, 'nome') });
                }
                catch (err) {
                    falhasV1.push({ id: iaBruta.id, erro: String(err?.message || err).slice(0, 200) });
                }
            }
            return erro('Todas as IAs falharam: ' + falhasV1.map((x) => x.erro).join(' | '), 502);
        }
        if (rota === '/api/v1/projeto') {
            const bearer = String(req.headers.get('authorization') || '').replace(/^Bearer\s+/i, '');
            if (!bearer)
                return erro('Envie Authorization: Bearer SUA_CHAVE de projeto.', 401);
            let projV1 = null;
            for (const x of await norm('JarvisProjeto')) {
                try {
                    if ((JSON.parse(f(x, 'chaves') || '[]') || []).some((k) => k.valor === bearer)) {
                        projV1 = x;
                        break;
                    }
                }
                catch { }
            }
            if (!projV1)
                return erro('Chave ausente, errada ou revogada.', 401);
            return json({ nome: f(projV1, 'nome'), assistente: f(projV1, 'assistente'), criado_em: f(projV1, 'criado_em') });
        }
        // chaves de projeto (dono vê mascaradas; cria/revoga)
        if (rota.startsWith('/api/projetos/') && rota.split('/')[4] === 'chaves') {
            const e = login401();
            if (e)
                return e;
            const idProj = rota.split('/')[3];
            const p = (await norm('JarvisProjeto')).find((x) => x.id === idProj && f(x, 'email') === email);
            if (!p)
                return erro('Projeto não encontrado.', 404);
            let lista = [];
            try {
                lista = JSON.parse(f(p, 'chaves') || '[]') || [];
            }
            catch { }
            if (metodo === 'GET')
                return json({ chaves: lista.map((k) => ({ id: k.id, nome: k.nome, final: '…' + String(k.valor).slice(-4), criado: k.criado })) });
            if (metodo === 'POST') {
                const nova = { id: String(Date.now()), nome: String(corpo.nome || 'chave ' + (lista.length + 1)).slice(0, 30), valor: 'jarvis_sk_' + Array.from(crypto.getRandomValues(new Uint8Array(18))).map((b) => b.toString(16).padStart(2, '0')).join(''), criado: new Date().toISOString() };
                lista.push(nova);
                await db.entities.JarvisProjeto.update(p.id, { chaves: JSON.stringify(lista) });
                return json({ ok: true, chave: nova.valor, aviso: 'Guarde agora: a chave completa não é mostrada de novo.' }, 201);
            }
            if (metodo === 'DELETE') {
                const nova = lista.filter((k) => k.id !== String(corpo.id || ''));
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
            const e = login401();
            if (e)
                return e;
            const nomeF = String(corpo.ferramenta || ''), a = corpo.args || {};
            try {
                if (nomeF === 'pesquisar')
                    return json(await pesquisarWeb(String(a.q || '')));
                if (nomeF === 'abrir')
                    return json(await abrirWeb(String(a.url || '')));
                return json({ erro: 'Ferramenta desconhecida: ' + nomeF, sugestao: 'GET /api/mcp/ferramentas' });
            }
            catch (err) {
                return erro(err.message || 'Ferramenta falhou.', 400);
            }
        }
        if (rota === '/api/web/clima') {
            const e = login401();
            if (e)
                return e;
            const cidade = String(qs.get('cidade') || '').trim();
            if (!cidade)
                return json({ configurado: false, mensagem: 'Informe a sua cidade nas preferências.' });
            const geo = await (await fetch('https://geocoding-api.open-meteo.com/v1/search?count=1&language=pt&name=' + encodeURIComponent(cidade))).json();
            const g = geo?.results?.[0];
            if (!g)
                return json({ configurado: false, mensagem: 'Cidade não encontrada.' });
            const respM = await fetch(`https://api.met.no/weatherapi/locationforecast/2.0/compact?lat=${g.latitude}&lon=${g.longitude}`, { headers: { 'User-Agent': 'JARVIS-web/1.0 github.com/mlk010173/jarvis' } });
            const txtM = await respM.text();
            let m = null;
            try {
                m = JSON.parse(txtM);
            }
            catch {
                m = null;
            }
            const serie = m?.properties?.timeseries;
            if (!respM.ok || !serie?.length)
                return json({ configurado: false, mensagem: 'Previsão indisponível agora.' });
            const detalhe = serie[0].data.instant.details;
            const simbolo = String(serie[0].data.next_1_hours?.summary?.symbol_code || serie[0].data.next_12_hours?.summary?.symbol_code || '');
            const temps = serie.slice(0, 13).map((t) => t.data.instant.details.air_temperature);
            const ic = simbolo.includes('thunder') ? 'zap' : simbolo.includes('snow') ? 'snow' : (simbolo.includes('rain') || simbolo.includes('sleet')) ? 'rain' : simbolo.includes('cloud') ? 'cloud' : 'sun';
            const desc = ic === 'zap' ? 'Tempestade' : ic === 'snow' ? 'Neve' : ic === 'rain' ? 'Chuva' : ic === 'cloud' ? 'Nublado' : 'Céu limpo';
            return json({ configurado: true, cidade: g.name, icone: ic, descricao: desc, temperatura: detalhe.air_temperature, minima: Math.round(Math.min(...temps) * 10) / 10, maxima: Math.round(Math.max(...temps) * 10) / 10, umidade: detalhe.relative_humidity, vento: Math.round(detalhe.wind_speed * 36) / 10 });
        }
        if (rota === '/api/web/moeda') {
            const e = login401();
            if (e)
                return e;
            const de = (qs.get('de') || 'USD').toUpperCase().slice(0, 4);
            const para = (qs.get('para') || 'BRL').toUpperCase().slice(0, 4);
            if (!/^[A-Z]{3,4}$/.test(de) || !/^[A-Z]{3,4}$/.test(para))
                return erro('Moeda inválida (use USD, EUR, BRL…).');
            const UA = { headers: { 'User-Agent': 'JARVIS-web/1.0 github.com/mlk010173/jarvis' } };
            try {
                const r = await fetch('https://economia.awesomeapi.com.br/json/last/' + de + '-' + para, UA);
                const o = (await r.json().catch(() => null))?.[de + para];
                if (r.ok && o?.bid)
                    return json({ de, para, valor: o.bid, titulo: o.name, atualizado: o.create_date, fonte: 'AwesomeAPI' });
            }
            catch { }
            try {
                const r2 = await fetch('https://api.frankfurter.dev/v1/latest?base=' + de + '&symbols=' + para, UA);
                const o2 = await r2.json().catch(() => null);
                if (r2.ok && o2?.rates?.[para])
                    return json({ de, para, valor: o2.rates[para], titulo: de + '/' + para, atualizado: o2.date, fonte: 'BCE/Frankfurter' });
            }
            catch { }
            return erro('Cotação não encontrada agora.');
        }
        if (rota === '/api/web/cripto') {
            const e = login401();
            if (e)
                return e;
            const mapaC = { bitcoin: 'BTC', ethereum: 'ETH', solana: 'SOL', cardano: 'ADA', dogecoin: 'DOGE' };
            const id = String(qs.get('id') || 'bitcoin').toLowerCase();
            const sigla = mapaC[id];
            if (!sigla)
                return erro('Cripto não suportada (bitcoin, ethereum, solana, cardano, dogecoin).');
            const UA = { headers: { 'User-Agent': 'JARVIS-web/1.0 github.com/mlk010173/jarvis' } };
            try {
                const r = await fetch('https://api.coingecko.com/api/v3/simple/price?ids=' + id + '&vs_currencies=brl', UA);
                const o = await r.json().catch(() => null);
                if (r.ok && o?.[id]?.brl)
                    return json({ nome: sigla, valor_brl: o[id].brl, atualizado: new Date().toISOString().slice(0, 19), fonte: 'CoinGecko' });
            }
            catch { }
            try {
                const r2 = await fetch('https://api.coinbase.com/v2/exchange-rates?currency=' + sigla, UA);
                const o2 = await r2.json().catch(() => null);
                const v2 = o2?.data?.rates?.BRL;
                if (r2.ok && v2)
                    return json({ nome: sigla, valor_brl: Math.round(Number(v2) * 100) / 100, atualizado: new Date().toISOString().slice(0, 19), fonte: 'Coinbase' });
            }
            catch { }
            try {
                const r3 = await fetch('https://economia.awesomeapi.com.br/json/last/' + sigla + '-BRL', UA);
                const o3 = (await r3.json().catch(() => null))?.[sigla + 'BRL'];
                if (r3.ok && o3?.bid)
                    return json({ nome: sigla, valor_brl: o3.bid, atualizado: o3.create_date, fonte: 'AwesomeAPI' });
            }
            catch { }
            return erro('Cotação não encontrada agora.');
        }
        if (rota === '/api/web/wiki') {
            const e = login401();
            if (e)
                return e;
            const termo = String(qs.get('q') || '').trim();
            if (!termo)
                return erro('Informe o termo.');
            const resumoDe = (o) => json({ titulo: o?.title || '', resumo: String(o?.extract || '').slice(0, 340), url: o?.content_urls?.desktop?.page || '' });
            let r = await fetch('https://pt.wikipedia.org/api/rest_v1/page/summary/' + encodeURIComponent(termo), { headers: { 'User-Agent': 'JARVIS-web/1.0 github.com/mlk010173/jarvis' } });
            if (r.ok) {
                const o = await r.json().catch(() => null);
                if (o?.extract)
                    return resumoDe(o);
            }
            const s = await (await fetch('https://pt.wikipedia.org/w/api.php?action=opensearch&limit=1&format=json&search=' + encodeURIComponent(termo), { headers: { 'User-Agent': 'JARVIS-web/1.0 github.com/mlk010173/jarvis' } })).json();
            const titulo = (s?.[1] || [])[0];
            if (!titulo)
                return erro('Nada encontrado na Wikipédia.');
            r = await fetch('https://pt.wikipedia.org/api/rest_v1/page/summary/' + encodeURIComponent(titulo), { headers: { 'User-Agent': 'JARVIS-web/1.0 github.com/mlk010173/jarvis' } });
            const o2 = await r.json().catch(() => null);
            if (!r.ok || !o2?.extract)
                return erro('Nada encontrado na Wikipédia.');
            return resumoDe(o2);
        }
        if (rota === '/api/web/feriados') {
            const e = login401();
            if (e)
                return e;
            const ano = (qs.get('ano') || String(new Date().getFullYear())).replace(/\D/g, '').slice(0, 4);
            const r = await fetch('https://date.nager.at/api/v3/PublicHolidays/' + ano + '/BR', { headers: { 'User-Agent': 'JARVIS-web/1.0 github.com/mlk010173/jarvis' } });
            if (!r.ok)
                return erro('Feriados indisponíveis agora.');
            const lista = await r.json().catch(() => []);
            const nacionais = lista.filter((f) => f.global).map((f) => ({ data: f.date, nome: f.localName }));
            if (!nacionais.length)
                return erro('Sem feriados para o ano informado.');
            return json({ ano, feriados: nacionais });
        }
        if (rota === '/api/web/repos') {
            const e = login401();
            if (e)
                return e;
            const r = await fetch('https://api.github.com/repos/mlk010173/jarvis', { headers: { 'User-Agent': 'JARVIS-web/1.0 github.com/mlk010173/jarvis' } });
            const o = await r.json().catch(() => null);
            if (!r.ok || !o?.full_name)
                return erro('Repositório indisponível agora.');
            return json({ nome: o.full_name, estrelas: o.stargazers_count, forks: o.forks_count, issues: o.open_issues_count, atualizado: String(o.updated_at || '').slice(0, 10), url: o.html_url });
        }
        if (rota === '/api/web/briefing') {
            // manchetes públicas e reais do Brasil (Google News, BBC Brasil, G1)
            const itens = await manchetes();
            return json({ itens });
        }
        // ---------- casa inteligente: integração REAL com Home Assistant ----------
        if (rota.startsWith('/api/casa/')) {
            const e = login401();
            if (e)
                return e;
            const cfg = await dadoGet(email, 'casa', { url: '', token: '' });
            const haPede = async (caminho, metodoHA = 'GET', corpoHA) => {
                const r = await fetch(String(cfg.url).replace(/\/+$/, '') + caminho, { method: metodoHA, headers: { Authorization: 'Bearer ' + cfg.token, 'Content-Type': 'application/json' }, body: corpoHA ? JSON.stringify(corpoHA) : undefined });
                return r;
            };
            if (rota === '/api/casa/estado') {
                if (!cfg.url || !cfg.token)
                    return json({ configurado: false, ok: false, erro: null });
                try {
                    const r = await haPede('/api/');
                    const o = await r.json().catch(() => null);
                    return json({ configurado: true, ok: r.ok && o?.message === 'API running.', erro: r.ok ? null : 'Sem resposta do Home Assistant (status ' + r.status + ').' });
                }
                catch {
                    return json({ configurado: true, ok: false, erro: 'Não consegui alcançar o endereço informado.' });
                }
            }
            if (rota === '/api/casa/conectar' && metodo === 'POST') {
                const url = String(corpo.url || '').trim();
                const tokenHA = String(corpo.token || '').trim();
                if (!/^https?:\/\/.+/i.test(url))
                    return erro('Informe o endereço completo (começando com http).');
                if (!tokenHA)
                    return erro('Informe o token de acesso longo do Home Assistant.');
                try {
                    const r = await fetch(url.replace(/\/+$/, '') + '/api/', { headers: { Authorization: 'Bearer ' + tokenHA } });
                    if (!r.ok)
                        return erro('O Home Assistant recusou (status ' + r.status + '). Confira o token.');
                    await dadoSet(email, 'casa', { url, token: tokenHA });
                    await logAdd(email, 'INFO', 'Casa conectada ao Home Assistant.');
                    return json({ ok: true });
                }
                catch {
                    return erro('Não consegui alcançar o endereço informado.');
                }
            }
            if (rota === '/api/casa/desconectar' && metodo === 'POST') {
                await dadoSet(email, 'casa', { url: '', token: '' });
                return json({ ok: true });
            }
            if (!cfg.url || !cfg.token)
                return erro('Conecte o Home Assistant primeiro (painel Casa).');
            if (rota === '/api/casa/aparelhos') {
                const r = await haPede('/api/states');
                if (!r.ok)
                    return erro('Sem resposta do Home Assistant (status ' + r.status + ').');
                const estados = await r.json().catch(() => []);
                const favs = await dadoGet(email, 'casa.favoritos', {});
                const grupos = { light: 'Luzes', switch: 'Tomadas', climate: 'Climatização', media_player: 'Mídia', cover: 'Portões e cortinas', fan: 'Ventilação', lock: 'Fechaduras', sensor: 'Sensores', binary_sensor: 'Sensores', vacuum: 'Robôs', humidifier: 'Umidade', water_heater: 'Água quente' };
                const acoesDe = (dominio) => {
                    const base = { toggle: { id: 'toggle', nome: 'Ligar/Apagar', pri: true }, turn_on: { id: 'turn_on', nome: 'Acender' }, turn_off: { id: 'turn_off', nome: 'Apagar' } };
                    if (dominio === 'light')
                        return [base.toggle, base.turn_on, base.turn_off];
                    if (dominio === 'switch' || dominio === 'fan' || dominio === 'humidifier')
                        return [base.toggle, base.turn_on, base.turn_off];
                    if (dominio === 'media_player')
                        return [{ id: 'media_play_pause', nome: 'Pausar/Tocar', pri: true }, base.turn_on, base.turn_off];
                    if (dominio === 'cover')
                        return [{ id: 'open_cover', nome: 'Abrir' }, { id: 'close_cover', nome: 'Fechar' }, base.toggle];
                    if (dominio === 'vacuum')
                        return [{ id: 'start', nome: 'Começar', pri: true }, { id: 'trigger', nome: 'Localizar' }];
                    return [];
                };
                const aparelhos = estados
                    .filter((x) => grupos[String(x.entity_id || '').split('.')[0]] && !['unavailable', 'unknown'].includes(String(x.state)))
                    .map((x) => ({
                    id: x.entity_id, nome: x.attributes?.friendly_name || x.entity_id, dominio: String(x.entity_id).split('.')[0],
                    grupo: grupos[String(x.entity_id).split('.')[0]], estado: x.state, unidade: x.attributes?.unit_of_measurement || '',
                    brilho: x.attributes?.brightness, temperatura_atual: x.attributes?.current_temperature ?? x.attributes?.temperature,
                    acoes: acoesDe(String(x.entity_id).split('.')[0]), favorito: !!favs[x.entity_id],
                }));
                const busca = String(qs.get('busca') || '').toLowerCase();
                return json({ aparelhos: aparelhos.filter((a) => !busca || String(a.nome).toLowerCase().includes(busca)) });
            }
            if (rota === '/api/casa/rotinas') {
                const r = await haPede('/api/states');
                if (!r.ok)
                    return erro('Sem resposta do Home Assistant.');
                const estados = await r.json().catch(() => []);
                const mapa = { scene: 'Cenas', script: 'Scripts', automation: 'Automações' };
                const rotinas = estados
                    .filter((x) => mapa[String(x.entity_id || '').split('.')[0]] && !['unavailable', 'unknown'].includes(String(x.state)))
                    .map((x) => ({ id: x.entity_id, nome: x.attributes?.friendly_name || x.entity_id, grupo: mapa[String(x.entity_id).split('.')[0]] }));
                return json({ rotinas });
            }
            if (rota === '/api/casa/acao' && metodo === 'POST') {
                const id = String(corpo.id || '');
                const acao = String(corpo.acao || '');
                const dominio = id.split('.')[0];
                let servico = acao;
                let dados = { entity_id: id };
                if (acao === 'set_brilho') {
                    servico = 'turn_on';
                    dados = { entity_id: id, brightness_percentage: Number(corpo.valor) || 60 };
                }
                else if (acao === 'set_temp' && dominio === 'climate') {
                    servico = 'set_temperature';
                    dados = { entity_id: id, temperature: Number(corpo.valor) };
                }
                const r = await haPede('/api/services/' + dominio + '/' + servico, 'POST', dados);
                if (!r.ok)
                    return erro('O Home Assistant recusou a ação (status ' + r.status + ').');
                await new Promise((ok) => setTimeout(ok, 300));
                const r2 = await haPede('/api/states/' + id);
                const aparelho = r2.ok ? await r2.json().catch(() => null) : null;
                await logAdd(email, 'INFO', 'Casa: ' + id + ' → ' + acao + '.');
                return json({ ok: true, aparelho: aparelho ? { id: aparelho.entity_id, estado: aparelho.state } : null });
            }
            if (rota === '/api/casa/favorito' && metodo === 'POST') {
                const favs = await dadoGet(email, 'casa.favoritos', {});
                const id = String(corpo.id || '');
                if (corpo.favorito)
                    favs[id] = true;
                else
                    delete favs[id];
                await dadoSet(email, 'casa.favoritos', favs);
                return json({ ok: true });
            }
        }
        // ---------- financeiro: dados reais da conta ----------
        if (rota.startsWith('/api/financeiro/')) {
            const e = login401();
            if (e)
                return e;
            const fin = await dadoGet(email, 'financas', { contas: [], lancamentos: [], faturas: [], investimentos: [], meta: { categorias: ['Moradia', 'Mercado', 'Alimentação', 'Transporte', 'Saúde', 'Educação', 'Lazer', 'Outros'] } });
            const idNovo = () => crypto.randomUUID();
            const salvar = async () => dadoSet(email, 'financas', fin);
            const limpar = (caminho, campo) => {
                if (caminho === '/api/financeiro/' + campo && corpo && corpo.id && Object.keys(corpo).length === 1) {
                    const antes = fin[campo].length;
                    fin[campo] = fin[campo].filter((x) => x.id !== corpo.id);
                    if (fin[campo].length !== antes) {
                        salvar();
                        return json({ ok: true });
                    }
                }
                return null;
            };
            const r1 = limpar(rota, 'contas');
            if (r1)
                return r1;
            const r2 = limpar(rota, 'lancamentos');
            if (r2)
                return r2;
            const r3 = limpar(rota, 'faturas');
            if (r3)
                return r3;
            const r4 = limpar(rota, 'investimentos');
            if (r4)
                return r4;
            const r5 = limpar(rota, 'meta');
            if (r5)
                return r5;
            const centavos = (t) => { const s = String(t ?? '').trim().replace(/[^\d,.-]/g, '').replace(/\.(?=\d{3}(\D|$))/g, '').replace(',', '.'); const v = Number(s); return Number.isFinite(v) ? Math.round(v * 100) : null; };
            if (rota === '/api/financeiro/meta') {
                if (metodo === 'POST' && Array.isArray(corpo.categorias)) {
                    fin.meta = { ...fin.meta, ...corpo };
                    await salvar();
                    return json(fin.meta);
                }
                return json(fin.meta);
            }
            if (rota === '/api/financeiro/contas') {
                if (metodo === 'POST') {
                    if (corpo.id) {
                        const c = fin.contas.find((x) => x.id === corpo.id);
                        if (!c)
                            return erro('Conta não encontrada.', 404);
                        Object.assign(c, { nome: String(corpo.nome ?? c.nome).slice(0, 60), tipo: String(corpo.tipo ?? c.tipo) });
                    }
                    else {
                        if (!corpo.nome)
                            return erro('Informe o nome da conta.');
                        fin.contas.push({ id: idNovo(), nome: String(corpo.nome).slice(0, 60), tipo: String(corpo.tipo || 'conta') });
                    }
                    await salvar();
                    return json({ ok: true, contas: fin.contas });
                }
                return json({ contas: fin.contas });
            }
            if (rota === '/api/financeiro/lancamentos') {
                if (metodo === 'POST') {
                    if (corpo.id) {
                        const l = fin.lancamentos.find((x) => x.id === corpo.id);
                        if (!l)
                            return erro('Lançamento não encontrado.', 404);
                        Object.assign(l, { descricao: String(corpo.descricao ?? l.descricao).slice(0, 120), valor: centavos(corpo.valor) ?? l.valor, dia: String(corpo.dia ?? l.dia), categoria: String(corpo.categoria ?? l.categoria ?? ''), conta_id: String(corpo.conta_id ?? l.conta_id ?? '') });
                        await salvar();
                        return json({ ok: true });
                    }
                    const valor = centavos(corpo.valor);
                    if (!corpo.descricao || valor == null)
                        return erro('Informe a descrição e o valor.');
                    fin.lancamentos.push({ id: idNovo(), descricao: String(corpo.descricao).slice(0, 120), valor, dia: String(corpo.dia || new Date().toISOString().slice(0, 10)), categoria: String(corpo.categoria || ''), conta_id: String(corpo.conta_id || '') });
                    await salvar();
                    return json({ ok: true });
                }
                const conta = String(qs.get('conta') || '');
                const mes = String(qs.get('mes') || '');
                let lista = fin.lancamentos;
                if (conta)
                    lista = lista.filter((l) => l.conta_id === conta);
                if (mes)
                    lista = lista.filter((l) => String(l.dia).startsWith(mes));
                lista = [...lista].sort((a, b) => String(b.dia).localeCompare(String(a.dia)));
                return json({ lancamentos: lista });
            }
            if (rota === '/api/financeiro/faturas') {
                if (metodo === 'POST') {
                    if (corpo.id && Object.keys(corpo).length === 1) {
                        fin.faturas = fin.faturas.filter((x) => x.id !== corpo.id);
                        await salvar();
                        return json({ ok: true });
                    }
                    const valor = centavos(corpo.valor);
                    if (corpo.id) {
                        const fat = fin.faturas.find((x) => x.id === corpo.id);
                        if (!fat)
                            return erro('Fatura não encontrada.', 404);
                        Object.assign(fat, { descricao: String(corpo.descricao ?? fat.descricao), valor: valor ?? fat.valor, vencimento: String(corpo.vencimento ?? fat.vencimento), categoria: String(corpo.categoria ?? fat.categoria ?? ''), conta_id: String(corpo.conta_id ?? fat.conta_id ?? ''), paga_em: corpo.paga_em ? String(corpo.paga_em) : fat.paga_em });
                    }
                    else {
                        if (!corpo.descricao || valor == null)
                            return erro('Informe a descrição e o valor.');
                        fin.faturas.push({ id: idNovo(), descricao: String(corpo.descricao).slice(0, 80), valor, vencimento: String(corpo.vencimento || new Date().toISOString().slice(0, 10)), categoria: String(corpo.categoria || ''), conta_id: String(corpo.conta_id || ''), paga_em: null });
                    }
                    await salvar();
                    return json({ ok: true });
                }
                return json({ faturas: fin.faturas });
            }
            if (rota === '/api/financeiro/investimentos') {
                if (metodo === 'POST') {
                    if (corpo.id && Object.keys(corpo).length === 1) {
                        fin.investimentos = fin.investimentos.filter((x) => x.id !== corpo.id);
                        await salvar();
                        return json({ ok: true });
                    }
                    const aplicado = centavos(corpo.aplicado) ?? 0, atual = centavos(corpo.atual) ?? aplicado;
                    if (corpo.id) {
                        const i = fin.investimentos.find((x) => x.id === corpo.id);
                        if (!i)
                            return erro('Investimento não encontrado.', 404);
                        Object.assign(i, { nome: String(corpo.nome ?? i.nome), tipo: String(corpo.tipo ?? i.tipo), aplicado, atual, obs: String(corpo.obs ?? i.obs ?? '') });
                    }
                    else {
                        if (!corpo.nome)
                            return erro('Informe o nome do investimento.');
                        fin.investimentos.push({ id: idNovo(), nome: String(corpo.nome).slice(0, 80), tipo: String(corpo.tipo || 'Renda fixa'), aplicado, atual, obs: String(corpo.obs || '') });
                    }
                    await salvar();
                    return json({ ok: true });
                }
                return json({ investimentos: fin.investimentos });
            }
            if (rota === '/api/financeiro/importar' && metodo === 'POST') {
                const texto = String(corpo.texto || '');
                const contaId = String(corpo.conta_id || '');
                const criados = [];
                for (const b of texto.split(/\r?\n/)) {
                    const linha = b.trim();
                    if (!linha)
                        continue;
                    const m = linha.match(/^(\d{1,2})\/(\d{1,2})(?:\/(\d{2,4}))?\s+(.+)$/);
                    let dia = null, descricao = '', valor = null;
                    if (m) {
                        const ano = m[3] ? (m[3].length === 2 ? '20' + m[3] : m[3]) : String(new Date().getFullYear());
                        dia = `${ano}-${m[2].padStart(2, '0')}-${m[1].padStart(2, '0')}`;
                        descricao = m[4];
                    }
                    else {
                        const m2 = linha.match(/^(.+?)\s+(-?R\$)?\s*([\d.,]+)$/);
                        if (m2) {
                            descricao = m2[1];
                            dia = new Date().toISOString().slice(0, 10);
                        }
                        else
                            continue;
                    }
                    const num = linha.match(/-?[\d.,]+\d$/);
                    if (num) {
                        valor = centavos(num[0]);
                        if (String(num[0]).trim().startsWith('-') && valor)
                            valor = -Math.abs(valor);
                    }
                    if (descricao && valor)
                        criados.push({ id: idNovo(), descricao: descricao.slice(0, 120).replace(/[-+]?[\d.,]+\d$/, '').trim() || descricao.slice(0, 120), valor, dia: dia || new Date().toISOString().slice(0, 10), categoria: '', conta_id: contaId });
                }
                if (!criados.length)
                    return erro('Não consegui ler lançamentos nesse arquivo. Confira se é OFX ou CSV do banco.');
                fin.lancamentos.push(...criados);
                await salvar();
                await logAdd(email, 'INFO', 'Extrato importado: ' + criados.length + ' lançamento(s).');
                return json({ ok: true, criados: criados.length });
            }
            if (rota === '/api/financeiro/resumo') {
                const mes = String(qs.get('mes') || new Date().toISOString().slice(0, 7));
                const doMes = fin.lancamentos.filter((l) => String(l.dia).startsWith(mes));
                const entradas = doMes.filter((l) => l.valor > 0).reduce((s, l) => s + l.valor, 0);
                const saidas = doMes.filter((l) => l.valor < 0).reduce((s, l) => s - l.valor, 0);
                const hoje = new Date().toISOString().slice(0, 10);
                const abertas = fin.faturas.filter((x) => !x.paga_em);
                const meses = [];
                const agora = new Date();
                for (let i = 5; i >= 0; i--) {
                    const d = new Date(agora.getFullYear(), agora.getMonth() - i, 1);
                    const mm = d.toISOString().slice(0, 7);
                    const lm = fin.lancamentos.filter((l) => String(l.dia).startsWith(mm));
                    meses.push({ mes: mm, entradas: lm.filter((x) => x.valor > 0).reduce((s, x) => s + x.valor, 0), saidas: lm.filter((x) => x.valor < 0).reduce((s, x) => s - x.valor, 0) });
                }
                return json({
                    mes, saldo_contas: 0, contas: fin.contas.length, cartoes: 0, saldo_mes: entradas - saidas, entradas, saidas,
                    faturas_total: abertas.reduce((s, x) => s + x.valor, 0), faturas_abertas: abertas.length,
                    faturas_atrasadas: abertas.filter((x) => String(x.vencimento) < hoje).length,
                    proximas: [...abertas].sort((a, b) => String(a.vencimento).localeCompare(String(b.vencimento))).slice(0, 4),
                    investido: fin.investimentos.reduce((s, i) => s + i.aplicado, 0),
                    investimentos_atual: fin.investimentos.reduce((s, i) => s + i.atual, 0),
                    meses,
                });
            }
        }
        // ---------- leads: CRM real da conta ----------
        if (rota === '/api/leads' || rota.startsWith('/api/leads/')) {
            const e = login401();
            if (e)
                return e;
            const crm = await dadoGet(email, 'leads', { leads: [], sites: [] });
            const salvar = () => dadoSet(email, 'leads', crm);
            const resumo = () => {
                const pe = { novo: 0, contatado: 0, negociando: 0, cliente: 0, perdido: 0 };
                for (const l of crm.leads)
                    pe[l.status] = (pe[l.status] || 0) + 1;
                return { por_etapa: pe, total: crm.leads.length, sites: crm.sites.length, retornar_hoje: 0 };
            };
            if (rota === '/api/leads' && metodo === 'GET')
                return json({ leads: crm.leads, resumo: resumo() });
            if (rota === '/api/leads' && metodo === 'POST') {
                if (!corpo.nome)
                    return erro('Informe o nome do cliente.');
                crm.leads.push({ id: crypto.randomUUID(), nome: String(corpo.nome).slice(0, 80), categoria: String(corpo.categoria || ''), cidade: String(corpo.cidade || ''), telefone: String(corpo.telefone || ''), notas: String(corpo.notas || ''), status: 'novo', criado_em: new Date().toISOString(), site: null, google: null });
                await salvar();
                await logAdd(email, 'INFO', 'Lead criado: ' + corpo.nome + '.');
                return json({ ok: true, leads: crm.leads, resumo: resumo() });
            }
            if (rota === '/api/leads/ia' && metodo === 'POST')
                return erro('Nenhuma IA conectada.', 501);
            if (rota === '/api/leads/ia/executar' && metodo === 'POST')
                return erro('Nenhuma IA conectada.', 501);
            if (rota === '/api/leads/ia/salvar' && metodo === 'POST')
                return erro('Nenhuma IA conectada.', 501);
            if (rota === '/api/leads/exemplos/lista')
                return json({ exemplos: [], pode_usar: true });
            if (rota === '/api/leads/sites' && metodo === 'GET')
                return json({ sites: crm.sites });
            if (rota === '/api/leads/sites' && metodo === 'POST') {
                const nome = String(corpo.nome || 'Site do cliente').slice(0, 80);
                const site = { id: crypto.randomUUID(), nome, lead_id: String(corpo.lead_id || ''), no_ar: false, criado_em: new Date().toISOString() };
                crm.sites.push(site);
                await salvar();
                return json({ ok: true, site });
            }
            const idLead = rota.split('/')[3];
            const lead = crm.leads.find((l) => l.id === idLead);
            if (idLead && rota.endsWith('/google'))
                return lead ? json({ lead: { ...lead, google_desatualizado: true } }) : erro('Lead não encontrado.', 404);
            if (!lead)
                return erro('Lead não encontrado.', 404);
            if (rota === '/api/leads/' + idLead && metodo === 'GET')
                return json({ lead });
            if (rota === '/api/leads/' + idLead && metodo === 'PUT') {
                for (const k of ['nome', 'categoria', 'cidade', 'telefone', 'notas', 'status'])
                    if (corpo[k] !== undefined)
                        lead[k] = String(corpo[k]).slice(0, k === 'notas' ? 4000 : 80);
                await salvar();
                return json({ lead });
            }
            if (rota === '/api/leads/' + idLead && metodo === 'DELETE') {
                crm.leads = crm.leads.filter((l) => l.id !== idLead);
                await salvar();
                return json({ ok: true });
            }
            return erro('Método não suportado.', 405);
        }
        // ---------- logs ----------
        if (rota === '/api/logs' || rota === '/api/logs/eventos') {
            const e = login401();
            if (e)
                return e;
            if (rota === '/api/logs/eventos') {
                const eventos = (await norm('JarvisLog')).filter((l) => f(l, 'email') === email).slice(-150).reverse()
                    .map((l) => ({ tipo: 'Conexão com o site', texto: f(l, 'texto'), quando: f(l, 'em') }));
                return json({ eventos });
            }
            const nivel = String(qs.get('nivel') || '').toUpperCase();
            const busca = String(qs.get('busca') || '').toLowerCase();
            const linhas = (await norm('JarvisLog')).filter((l) => f(l, 'email') === email).slice(-400).reverse()
                .filter((l) => (!nivel || String(f(l, 'nivel')).toUpperCase() === nivel) && (!busca || String(f(l, 'texto')).toLowerCase().includes(busca)))
                .map((l) => ({ em: f(l, 'em'), nivel: f(l, 'nivel'), msg: f(l, 'texto') }));
            const contagem = { INFO: 0, AVISO: 0, ERRO: 0 };
            const dia = Date.now() - 864e5;
            for (const l of (await norm('JarvisLog')).filter((x) => f(x, 'email') === email && new Date(String(f(x, 'em'))).getTime() > dia))
                contagem[String(f(l, 'nivel')).toUpperCase()] = (contagem[String(f(l, 'nivel')).toUpperCase()] || 0) + 1;
            return json({ linhas, contagem });
        }
        // ---------- monitor ----------
        if (rota.startsWith('/api/monitor/')) {
            const e = login401();
            if (e)
                return e;
            const bem = await dadoGet(email, 'bemestar', { dormir: '23:00', pausas: true, beber_agua: false, ultimos: {} });
            if (rota === '/api/monitor/saude')
                return json({ nota: 100, ligado_horas: 0, computador: 'JARVIS Web (sem o app do PC)', ramLivreGB: null, ramTotalGB: null, cpuModelo: null, nucleos: null, bateria: null, processos: [], alertas: ['Os dados do computador aparecem com o app do JARVIS instalado no PC — o site não lê o seu computador.'] });
            if (rota === '/api/monitor/atividade')
                return json({ ligado: false, minutos: 0, primeiro: null, ultimo: null, por_hora: Array(24).fill(0), semana: [] });
            if (rota === '/api/monitor/atividade/apagar' && metodo === 'POST')
                return json({ ok: true });
            if (rota === '/api/monitor/bemestar') {
                if (metodo === 'POST') {
                    for (const k of ['dormir', 'pausas', 'beber_agua', 'postura'])
                        if (corpo[k] !== undefined)
                            bem[k] = corpo[k];
                    await dadoSet(email, 'bemestar', bem);
                    return json(bem);
                }
                return json(bem);
            }
        }
        // ---------- negócio (dono): números reais do JARVIS ----------
        if (rota === '/api/dono/negocio') {
            const e = login401();
            if (e)
                return e;
            const contas = (await norm('JarvisConta')).length;
            const sessoes = (await norm('JarvisSessao')).filter((s) => Number(f(s, 'expira')) > Date.now()).length;
            const projetos = (await norm('JarvisProjeto')).length;
            return json({
                faturamento: 0, vendas: 0, cadastros: contas, gasto_anuncios: 0, gasto_meta: 0, gasto_google: 0,
                reembolsos: 0, taxas: 0, comissoes: 0, lucro: 0, margem_pct: null, roi_pct: null, investimento: 0,
                serie: [], custos: { mensal_total: 0, itens: [] }, meta: { configurado: false },
                extras_jarvis: { contas: contas, sessoes_ativas: sessoes, projetos: projetos },
            });
        }
        if (rota.startsWith('/api/dono/custos/'))
            return login401() || erro('Nenhum custo cadastrado no JARVIS.', 404);
        // ---------- fontes e memória ----------
        if (rota === '/api/fontes') {
            const e = login401();
            if (e)
                return e;
            const m = f(auth, 'memoria');
            let memoria = {};
            try {
                memoria = m ? JSON.parse(m) : {};
            }
            catch {
                memoria = {};
            }
            const itens = (memoria.dados || memoria.itens || []).slice(0, 50);
            return json({
                ia_atual: null, ias: [],
                conectores: [
                    { id: 'clima', nome: 'Clima', configurado: true, detalhe: 'Previsão real via MET.no' },
                    { id: 'memoria', nome: 'Memória', configurado: itens.length > 0, detalhe: itens.length ? itens.length + ' lembrança(s)' : 'Nenhuma lembrança ainda' },
                    { id: 'casa', nome: 'Casa', configurado: (await dadoGet(email, 'casa', { url: '' })).url !== '', detalhe: 'Home Assistant' },
                ],
                canais: [
                    { id: 'web', nome: 'Site JARVIS', detalhe: 'Este site, com a sua conta', url: 'https://mlk010173.github.io/jarvis/', estado: 'ativo' },
                    { id: 'app', nome: 'App do PC', detalhe: 'Requer o aplicativo instalado no computador', url: '', estado: 'desligado' },
                ],
                memoria: { total: itens.length, itens: itens.map((x) => ({ texto: x.texto || String(x), em: x.em || null })) },
                obsidian: { conectado: false },
            });
        }
        if (rota === '/api/fontes/conector' && metodo === 'POST') {
            const e = login401();
            if (e)
                return e;
            if (String(corpo.id || '') === 'clima' && corpo.cidade) {
                const prefs = await dadoGet(email, 'preferencias.clima', {});
                prefs.cidade = String(corpo.cidade).slice(0, 80);
                await dadoSet(email, 'preferencias.clima', prefs);
                return json({ ok: true });
            }
            return erro('Este conector não está ativo no JARVIS.');
        }
        if (rota === '/api/fontes/memoria/apagar' && metodo === 'POST') {
            const e = login401();
            if (e)
                return e;
            await db.entities.JarvisConta.update(auth.id, { memoria: '' });
            await logAdd(email, 'INFO', 'Memória apagada a pedido da conta.');
            return json({ ok: true });
        }
        // ---------- biblioteca de componentes de UI (designer) ----------
        if (rota === '/api/ui/componentes') {
            const comps = COMPONENTES.map((c) => ({ ...c, liberado: true }));
            const categorias = [...new Set(comps.map((c) => c.categoria))];
            return json({ base_css: BASE_CSS, nome_plano: 'Premium', logado: !!auth, liberados: comps.length, total: comps.length, plano: 'premium', proximo: null, niveis: { free: { nome: 'Free', total: 4 }, basic: { nome: 'Basic', total: 4 }, premium: { nome: 'Premium', total: comps.length } }, categorias, componentes: comps });
        }
        if (rota === '/api/ui/pro')
            return json({ total: 0, componentes: [], plano: 'premium', proximo: null, servidor: '', midia_base: '' });
        if (rota.startsWith('/api/ui/pro/'))
            return erro('A biblioteca React ainda não tem componentes prontos no JARVIS.', 404);
        // ---------- ponte com o app do PC, pagamentos e cupons: sem nada escondido ----------
        if (rota === '/api/ponte/apps')
            return json({ apps: [] });
        if (rota === '/api/ponte/comando')
            return login401() || erro('O app do PC não está conectado. A ponte exige o aplicativo instalado no computador.', 404);
        if (rota === '/api/cupons/validar')
            return erro('Nenhum cupom ativo no JARVIS (tudo já está liberado).', 404);
        if (rota.startsWith('/api/pagamentos/'))
            return login401() || erro('Pagamentos não estão ativos no JARVIS: todos os recursos já estão liberados.', 404);
        // ---------- públicas ----------
        if (rota === '/api/info')
            return json({ marca: 'JARVIS', limites: { gratis: 100, pro: 5000 }, provedores: [] });
        if (rota === '/api/comercial/planos')
            return json({ planos: [{ id: 'jarvis', nome: 'JARVIS', publico: 'Versão web aberta do projeto — tudo liberado', preco_centavos: 0, precos: null }] });
        if (rota === '/api/novidades')
            return json({
                gerado: new Date().toISOString(), atual: '1.3.3',
                versoes: [
                    {
                        versao: '1.3.3', data: '2026-10-21', resumo: 'Segurança e paridade total: monitor de IA, SSRF guard, rate limit, MCP oficial JSON-RPC, SDK v1 com chave de projeto e capacidades honestas.',
                        secoes: [
                            { titulo: 'Novo', itens: [
                                    'Monitor de execuções de IA: latência, tokens, custo estimado e erros por modelo (/api/logs/ia e /api/logs/ia/resumo)',
                                    'Servidor MCP oficial (JSON-RPC 2.0) em POST /mcp com Bearer de projeto ou token de conta',
                                    'SDK público v1: cada projeto ganha chave jarvis_sk_… para /api/v1/chat e /api/v1/projeto',
                                    'Rotas /api/health e /api/capabilities: o site descobre o que o backend realmente suporta',
                                    'Guarda anti-SSRF no ABRIR: rede interna, http e localhost bloqueados',
                                    'Rate limit por IP em cadastro/login e por chave no chat público (429 honesto)',
                                    'Ollama no catálogo com aviso honesto de quando funciona',
                                    'Chaves de IA (BYOK) cifradas em repouso com AES-256-GCM quando JARVIS_MASTER_KEY existe no ambiente',
                                ] },
                            { titulo: 'Corrigido', itens: ['Busca do modo Agente agora começa no Bing (DuckDuckGo como reserva) após bloqueios de IP'] },
                        ],
                    },
                    {
                        versao: '1.3.0', data: '2026-10-21', resumo: 'IA real no chat com 7 provedores, modo Agente com internet, voz ElevenLabs, MCP e SDK.',
                        secoes: [
                            { titulo: 'Novo', itens: [
                                    'IA de verdade no chat: conecte Google Gemini (tem plano grátis), OpenAI, Claude, Groq, DeepSeek, OpenRouter ou Mistral em Minhas IAs',
                                    'Modo Agente: a IA pesquisa na internet (DuckDuckGo) e abre páginas quando precisa — comandos /pesquisar e /abrir',
                                    'Voz ElevenLabs opcional: /voz on ativa a voz de estúdio com sua chave (11labs.io)',
                                    'MCP: catálogo de ferramentas em /api/mcp/ferramentas e execução em /api/mcp/executar',
                                    'SDK do JARVIS para integrar o chat em qualquer site (jarvis-sdk.js)',
                                    'Fila de IAs: se uma falha, a próxima assume automaticamente',
                                    'Memória da conta entra na conversa com a IA',
                                ] },
                        ],
                    },
                    {
                        versao: '1.2.0', data: '2026-10-21', resumo: 'JARVIS completo: painéis com dados reais e plano Premium liberado para todos.',
                        secoes: [
                            { titulo: 'Novo', itens: [
                                    'Plano Premium liberado para todas as contas: nada de trava entre Free, Basic e Premium',
                                    'Painel Casa: integração real com Home Assistant — luzes, tomadas, climatização e rotinas com o seu servidor',
                                    'Painel Financeiro: contas, lançamentos, faturas, investimentos, metas e importação de extrato OFX/CSV',
                                    'Painel Leads: CRM com funil (novo, contatado, negociando, cliente, perdido) e anotações',
                                    'Painel Logs: eventos e registro técnico reais da sua conta',
                                    'Painel Monitor: lembretes de bem-estar configuráveis (dormir, pausas, água)',
                                    'Painel Negócio: números reais do JARVIS (contas, sessões e projetos)',
                                    'Painel Briefing: manchetes reais do Brasil atualizadas (Google Notícias) com clima do seu dia',
                                    'Painel Componentes & UI: biblioteca HTML+CSS completa para copiar e usar, tudo liberado',
                                    'Painel Fontes: conexões e memória da conta, com apagar memória de verdade',
                                ] },
                            { titulo: 'Melhorias', itens: [
                                    'Comandos de voz agora falam a resposta de volta (voz em tempo real com /clima, /moeda, /cripto…)',
                                    'Modo de conversa contínua funciona com os comandos reais: pergunta e resposta por voz sem parar',
                                    'Voz: aviso claro quando o navegador não suporta microfone (use Chrome ou Edge)',
                                ] },
                        ],
                    },
                    {
                        versao: '1.1.0', data: '2026-10-19', resumo: 'Comandos reais no chat e fim da simulação.',
                        secoes: [
                            { titulo: 'Novo', itens: [
                                    'Comandos reais com dados ao vivo: /clima [cidade], /moeda, /cripto, /wiki, /feriados, /github, /ajuda',
                                    'Clima real via MET.no e Open-Meteo',
                                    'Cotações com plano B automático: AwesomeAPI → Banco Central Europeu; CoinGecko → Coinbase',
                                    'Wikipédia em português integrada ao chat',
                                    'Feriados nacionais do Brasil (Nager)',
                                    'Estatísticas do repositório no GitHub',
                                ] },
                            { titulo: 'Correções', itens: [
                                    'Removida a API falsa (pages-shim): tudo agora vem do backend real',
                                    'Sem simulação: o que não existe responde com erro honesto em vez de dado inventado',
                                ] },
                        ],
                    },
                    {
                        versao: '1.0.0', data: '2026-10-19', resumo: 'Do espelho do ORION para o JARVIS: rebrand e backend de verdade.',
                        secoes: [
                            { titulo: 'Novo', itens: [
                                    'Novo nome: ORION Web virou JARVIS (repo mlk010173/jarvis, site jarvis no Pages)',
                                    'Backend real com função jarvisApi e banco de dados persistido',
                                    'Cadastro e login reais com senha protegida por PBKDF2-SHA256 (60 mil iterações, salt único)',
                                    'Sessões de 30 dias com token, logout e troca de senha',
                                    'Projetos/assistentes salvos por conta, com proteção contra acesso de outros usuários',
                                    'Preferências e memória da conta gravadas no banco',
                                    'Limite anti-abuso de 120 requisições por minuto',
                                ] },
                            { titulo: 'Removido', itens: [
                                    'Ligações ao site oficial antigo: suporte agora nas Issues do repositório JARVIS',
                                ] },
                        ],
                    },
                    {
                        versao: '0.9.0', data: '2026-10-19', resumo: 'Nasceu como espelho do ORION Web, auditado e publicado no GitHub.',
                        secoes: [
                            { titulo: 'Novo', itens: [
                                    'Espelho completo do site: 80 arquivos e 14 páginas com caminhos relativos',
                                    'Publicação no GitHub Pages com endereço próprio',
                                    'Deploy automático com GitHub Actions: validação de sintaxe JS e links a cada envio',
                                ] },
                            { titulo: 'Segurança', itens: [
                                    'Auditoria: nenhuma chave de API exposta; cabeçalhos CSP e HSTS verificados',
                                    'Testes de carga contra XSS no chat e bloqueio de IDOR confirmado',
                                ] },
                        ],
                    },
                ],
            });
        if (rota === '/api/marketing/publico')
            return json({ ga4: null, gads: null });
        if (rota === '/api/download/info' || rota === '/api/download/instalador')
            return erro('O download do instalador não faz parte do JARVIS (é um projeto web).', 404);
        return erro('Rota não disponível no JARVIS.', 404);
    }
    catch (e) {
        return erro('Erro interno: ' + (e?.message || String(e)), 500);
    }
};