// JARVIS — MOTOR DE TAREFAS AUTÔNOMAS (v1.3.7, 22/10/2026). Função dedicada. v1.3.7: ferramentas de engenharia web (espelhar site, varrer segredos, publicar no GitHub Pages).
// Envelope igual ao core ({rota, metodo, corpo, token}), mesmo banco, isolamento por conta.
// Toda ferramenta e toda chamada de IA (planejamento e verificação) é executada pelo CORE via chamada
// interna autenticada — nada duplicado, e as IAs seguem caindo no monitor de IA do core.
import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

const CORS: Record<string, string> = { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Methods': 'POST, OPTIONS', 'Access-Control-Allow-Headers': 'Content-Type', 'Content-Type': 'application/json; charset=utf-8' };
const json = (obj: unknown, status = 200) => new Response(JSON.stringify(obj), { status, headers: CORS });
const erro = (msg: string, status = 400) => json({ erro: msg }, status);
const ratos = new Map<string, { n: number; reset: number }>();
function rateLimit(chave: string): boolean { const agora = Date.now(); const r = ratos.get(chave); if (!r || r.reset < agora) { ratos.set(chave, { n: 1, reset: agora + 60000 }); return true; } r.n++; return r.n <= 120; }
const hostPermitido = (u: any) => { let h: string; try { h = new URL(String(u || '')).hostname; } catch { return false; } if (!/^https:/.test(String(u || ''))) return false; if (/^(localhost|.*\.local)$/i.test(h)) return false; if (/^(10\.|127\.|192\.168\.|169\.254\.|0\.)/.test(h)) return false; const m172 = h.match(/^172\.(\d+)\./); if (m172 && +m172[1] >= 16 && +m172[1] <= 31) return false; if (h === '::1' || h === '[::1]' || h === '::') return false; return true; };
const limpaSegredo = (s: any) => String(s ?? '').replace(/sk-[A-Za-z0-9_*-]{3,}/g, '[removido]').replace(/nvapi-[A-Za-z0-9_*-]{3,}/g, '[removido]').replace(/gsk_[A-Za-z0-9_*]{3,}/g, '[removido]').replace(/Bearer\s+[A-Za-z0-9._*-]{6,}/g, '[removido]').replace(/AIza[A-Za-z0-9_*-]{8,}/g, '[removido]');
const sanitizaExec = (ex: any) => { const limpaP = (p: any) => ({ ...p, nome: limpaSegredo(p.nome), resumo_entrada: p.resumo_entrada ? limpaSegredo(p.resumo_entrada) : null, resumo_saida: p.resumo_saida ? limpaSegredo(p.resumo_saida) : null, erro: p.erro ? limpaSegredo(p.erro) : null, refs: (p.refs || []).filter((u: any) => /^https:\/\//.test(String(u))).slice(0, 6) }); return { ...ex, ia_final: ex.ia_final ? limpaSegredo(ex.ia_final) : null, modelo_final: ex.modelo_final ? limpaSegredo(ex.modelo_final) : null, falhas: (ex.falhas || []).map((x: any) => ({ id: x.id, erro: limpaSegredo(x.erro) })), passos: (ex.passos || []).map(limpaP) }; };

const b64u8 = (b: Uint8Array) => { let out = ''; for (const x of b) out += String.fromCharCode(x); return btoa(out); };
const b64txt = (t: string) => b64u8(new TextEncoder().encode(t));
// padrões de segredo que o GitHub Push Protection bloqueia (o site_publicar recusa antes do push)
const PADROES_SEGREDO: any[][] = [[/[ps]k\.eyJ[A-Za-z0-9._-]{15,}/, 'Mapbox'], [/sk-[A-Za-z0-9_-]{20,}/, 'OpenAI'], [/AIza[A-Za-z0-9_-]{20,}/, 'Google'], [/ghp_[A-Za-z0-9]{30,}/, 'GitHub PAT'], [/github_pat_[A-Za-z0-9_]{30,}/, 'GitHub PAT'], [/nvapi-[A-Za-z0-9_-]{20,}/, 'NVIDIA'], [/gsk_[A-Za-z0-9]{20,}/, 'Groq'], [/xox[baprs]-[A-Za-z0-9-]{10,}/, 'Slack'], [/AKIA[0-9A-Z]{16}/, 'AWS']];
const refsDe = (t: string): string[] => { const a = new Set<string>(); for (const m of t.matchAll(/["'`]+((?:\.{1,2}\.|)\/[^"'`\s]*)["'`]/g)) a.add(m[1]); for (const m of t.matchAll(/url\(([^)]+)\)/g)) a.add(m[1].replace(/^['"]|['"]$/g, '')); return [...a].slice(0, 200); };
const alvoDe = (ref: string, de: string, host: string): string | null => {
  ref = String(ref || '').trim().split('#')[0].split('?')[0];
  if (!ref) return null;
  if (ref.startsWith('https://' + host + '/')) ref = ref.slice(('https://' + host + '/').length);
  else if (ref === 'https://' + host) ref = 'index.html';
  else if (ref.startsWith('http') || ref.startsWith('//') || ref.startsWith('data:')) return null;
  if (!ref) return null;
  let rel: string;
  if (ref.startsWith('/')) rel = ref.slice(1);
  else { const partes = (de.includes('/') ? de.slice(0, de.lastIndexOf('/') + 1) : '').split('/').filter((x) => x !== ''); for (const p of ref.split('/')) { if (p === '..') partes.pop(); else if (p && p !== '.') partes.push(p); } rel = partes.join('/'); }
  if (!rel || rel.startsWith('..') || !/^[A-Za-z0-9_\-./]+$/.test(rel)) return null;
  return rel;
};

// catálogo central de ferramentas: onde='nuvem' executa no core; sensível exige aprovação humana
const CATALOGO_FERRAMENTAS: any[] = [
  { id: 'pesquisar', nome: 'Pesquisa na web', onde: 'nuvem', sensivel: false, limite_ms: 20000, tentativas: 2, args: '{q: termo}', descricao: 'Busca na internet (Bing com fallback DuckDuckGo) e devolve títulos, links e resumos reais.' },
  { id: 'abrir', nome: 'Abrir página', onde: 'nuvem', sensivel: false, limite_ms: 20000, tentativas: 2, args: '{url: endereço https público}', descricao: 'Lê o texto de uma página web pública (bloqueia http e rede interna).' },
  { id: 'clima', nome: 'Clima', onde: 'nuvem', sensivel: false, limite_ms: 15000, tentativas: 2, args: '{cidade}', descricao: 'Previsão do tempo real (MET.no) de qualquer cidade.' },
  { id: 'moeda', nome: 'Câmbio', onde: 'nuvem', sensivel: false, limite_ms: 15000, tentativas: 2, args: '{de, para} (ex.: USD e BRL)', descricao: 'Cotação de moedas ao vivo.' },
  { id: 'cripto', nome: 'Cripto', onde: 'nuvem', sensivel: false, limite_ms: 15000, tentativas: 2, args: '{moeda} (bitcoin, ethereum…)', descricao: 'Preço de criptomoedas ao vivo.' },
  { id: 'wiki', nome: 'Wikipédia', onde: 'nuvem', sensivel: false, limite_ms: 15000, tentativas: 2, args: '{termo}', descricao: 'Resumo da Wikipédia em português.' },
  { id: 'feriados', nome: 'Feriados', onde: 'nuvem', sensivel: false, limite_ms: 15000, tentativas: 2, args: '{ano}', descricao: 'Feriados nacionais do Brasil do ano pedido.' },
  { id: 'github_stats', nome: 'GitHub do projeto', onde: 'nuvem', sensivel: false, limite_ms: 15000, tentativas: 2, args: '{}', descricao: 'Estatísticas reais do repositório GitHub mlk010173/jarvis.' },
  { id: 'novidades', nome: 'Novidades', onde: 'nuvem', sensivel: false, limite_ms: 10000, tentativas: 1, args: '{}', descricao: 'Histórico de versões do JARVIS.' },
  { id: 'memoria_salvar', nome: 'Salvar na memória', onde: 'nuvem', sensivel: false, limite_ms: 8000, tentativas: 1, args: '{texto}', descricao: 'Guarda um fato na memória da conta para conversas futuras.' },
  { id: 'memoria_buscar', nome: 'Buscar na memória', onde: 'nuvem', sensivel: false, limite_ms: 8000, tentativas: 1, args: '{termo}', descricao: 'Procura fatos guardados na memória da conta.' },
  { id: 'memoria_apagar', nome: 'Apagar memória', onde: 'nuvem', sensivel: true, limite_ms: 8000, tentativas: 1, args: '{}', descricao: 'APAGA toda a memória da conta. AÇÃO SENSÍVEL: exige aprovação humana antes de executar.' },
  { id: 'site_espelhar', nome: 'Espelhar site', onde: 'motor', sensivel: false, limite_ms: 11000, tentativas: 2, args: '{url: endereço https do site}', descricao: 'Espelha o frontend público de um site (páginas, JS, CSS, imagens, fontes) dentro do JARVIS e guarda o espelho na conta. Sites grandes continuam nas execuções seguintes.' },
  { id: 'site_segredos', nome: 'Varrer segredos', onde: 'motor', sensivel: false, limite_ms: 6000, tentativas: 1, args: '{} (varre o último espelho)', descricao: 'Varre o espelho salvo procurando tokens e chaves (Mapbox, OpenAI, Google, GitHub, AWS, Slack, NVIDIA, Groq) — o que o GitHub bloqueia no push. Devolve arquivo e tipo, nunca o segredo inteiro.' },
  { id: 'site_publicar', nome: 'Publicar no GitHub Pages', onde: 'motor', sensivel: true, limite_ms: 11000, tentativas: 2, args: '{repo: nome do repositório novo, descricao?}', descricao: 'Publica o último espelho como repositório novo no GitHub com GitHub Pages (cria repo, envia arquivos com .nojekyll e ativa o Pages). AÇÃO SENSÍVEL: exige aprovação humana e um token do GitHub conectado em /api/fontes/github.' },
];

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { status: 204, headers: CORS });
  let body: any = {};
  try { body = await req.json(); } catch { return erro('Corpo JSON inválido.'); }
  const rotaCompleta = String(body.rota || '');
  const rota = rotaCompleta.split('?')[0].replace(/\/+$/, '') || '/';
  const metodo = String(body.metodo || 'GET').toUpperCase();
  const corpo = body.corpo || {};
  const token = String(body.token || '');
  const base44 = createClientFromRequest(req);
  const db: any = (base44 as any).asServiceRole ?? base44;
  const f = (r: any, k: string) => r?.[k] ?? r?.data?.[k];
  const norm = async (ent: string) => { const r = await db.entities[ent].list({}); return Array.isArray(r) ? r : (r?.items || r?.data || []); };
  const sessaoValida = async () => { const s = (await norm('JarvisSessao')).find((x: any) => f(x, 'token') === token && Number(f(x, 'expira')) > Date.now()); if (!s) return null; return (await norm('JarvisConta')).find((c: any) => String(f(c, 'email') || '').toLowerCase() === String(f(s, 'email'))); };
  const dadoGet = async (email: string, chave: string, padrao: any) => { const r = (await norm('JarvisDado')).find((d: any) => f(d, 'email') === email && f(d, 'chave') === chave); if (!r) return padrao; try { return JSON.parse(f(r, 'valor')); } catch { return padrao; } };
  const dadoSet = async (email: string, chave: string, valor: any) => { const r = (await norm('JarvisDado')).find((d: any) => f(d, 'email') === email && f(d, 'chave') === chave); if (r) await db.entities.JarvisDado.update(r.id, { valor: JSON.stringify(valor) }); else await db.entities.JarvisDado.create({ email, chave, valor: JSON.stringify(valor) }); };
  try {
    if (!rateLimit(token || rota)) return erro('Muitas requisições. Aguarde um instante.', 429);
    const auth = await sessaoValida();
    const login401 = () => (auth ? null : erro('Faça login.', 401));
    const email = auth ? String(f(auth, 'email')) : '';
    if (rota === '/health') return json({ ok: true, servico: 'jarvisTarefas', versao: '1.3.7', ferramentas: CATALOGO_FERRAMENTAS.map((x: any) => x.id) });
    const e401 = login401(); if (e401) return e401;

    // ---------- memória controlada: consultar, salvar, apagar (isolada por conta) ----------
    const itensMemoria = () => { try { const m = f(auth, 'memoria') ? JSON.parse(f(auth, 'memoria')) : null; return (m?.itens || m || []); } catch { return []; } };
    const salvarMemoria = async (itens: any[]) => { await db.entities.JarvisConta.update(auth.id, { memoria: JSON.stringify({ itens: itens.slice(-40) }) }); };
    if (rota === '/api/memoria') {
      const itens = itensMemoria();
      if (metodo === 'GET') return json({ itens });
      if (metodo === 'POST') { const txt = String(corpo?.texto || '').trim().slice(0, 400); if (!txt) return erro('Informe o texto.', 400); itens.push({ texto: txt, ts: new Date().toISOString(), projeto: String(corpo?.projeto_id || '') }); await salvarMemoria(itens); return json({ ok: true, total: itens.length }, 201); }
      if (metodo === 'DELETE') { await salvarMemoria([]); return json({ ok: true }); }
    }

    // ---------- fonte GitHub (token BYOK da conta, usado pela ferramenta site_publicar) ----------
    if (rota === '/api/fontes/github') {
      if (metodo === 'GET') { const fgh: any = await dadoGet(email, 'fonte:github', null); return json({ conectado: !!fgh?.token, login: fgh?.login || null, final: fgh?.final || null }); }
      if (metodo === 'DELETE') { await dadoSet(email, 'fonte:github', null); return json({ ok: true }); }
      if (metodo === 'PUT') {
        const tokG = String(corpo?.token || '').trim();
        if (!tokG) return erro('Informe o token no corpo {"token":"ghp_..."}', 400);
        const rT = await fetch('https://api.github.com/user', { headers: { Authorization: 'Bearer ' + tokG, 'User-Agent': 'jarvis-motor', Accept: 'application/vnd.github+json' } });
        if (!rT.ok) return erro('Token inválido ou sem permissão (GitHub respondeu ' + rT.status + ').', 400);
        const jT: any = await rT.json();
        await dadoSet(email, 'fonte:github', { token: tokG, login: jT.login, final: '…' + tokG.slice(-4), em: new Date().toISOString() });
        return json({ ok: true, login: jT.login, aviso: 'Token salvo na sua conta do JARVIS (padrão BYOK, igual às chaves de IA).' });
      }
      return erro('Método não suportado.', 405);
    }

    // ---------- chamada interna ao CORE (nenhuma duplicação de código) ----------
    const API_PROPRIA = 'https://superagent-6e379590.base44.app/functions/jarvisApi';
    const chamarCore = async (r: string): Promise<any> => {
      const resp = await fetch(API_PROPRIA, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ rota: r, metodo: 'GET', token }) });
      const j: any = await resp.json().catch(() => null);
      if (!resp.ok || !j || j.erro) throw new Error(String(j?.erro || ('rota interna falhou (' + resp.status + ')')).slice(0, 200));
      return j;
    };
    // IA (planejamento e verificação) com fila e fallback do CORE — e cada chamada cai no monitor de IA
    const iaPerguntar = async (prompt: string, pid: string): Promise<string> => {
      const resp = await fetch(API_PROPRIA, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ rota: '/api/projetos/' + encodeURIComponent(pid) + '/testar', metodo: 'POST', corpo: { mensagens: [{ role: 'user', content: prompt }], personalidade: 'direto' }, token }) });
      const j: any = await resp.json().catch(() => null);
      if (!resp.ok || !j || j.erro) throw new Error(String(j?.erro || ('IA indisponível (' + resp.status + ')')).slice(0, 200));
      return String(j.resposta || '');
    };
    const rodarFerrTarefa = async (idF: string, args: any, t: any): Promise<string> => {
      const a2: any = args || {};
      const fmt = (j: any) => String(typeof j === 'object' ? (j.texto || j.resumo || JSON.stringify(j)) : j).slice(0, 800);
      switch (idF) {
        case 'pesquisar': { const j = await chamarCore('/api/web/pesquisar?q=' + encodeURIComponent(String(a2.q || ''))); const rs = (j.resultados || []).slice(0, 6); if (!rs.length) throw new Error('Nada encontrado.'); return 'Resultados da busca:\n' + rs.map((x: any, i: number) => (i + 1) + '. ' + x.titulo + ' — ' + x.url + (x.resumo ? ' | ' + x.resumo : '')).join('\n'); }
        case 'abrir': { const j = await chamarCore('/api/web/abrir?url=' + encodeURIComponent(String(a2.url || ''))); return 'Página "' + (j.titulo || a2.url) + '":\n' + String(j.texto || '').slice(0, 1200); }
        case 'clima': { const j = await chamarCore('/api/web/clima?cidade=' + encodeURIComponent(String(a2.cidade || 'Vitória'))); if (j.configurado === false) throw new Error(String(j.mensagem || 'clima indisponível')); return 'Clima em ' + j.cidade + ': ' + j.descricao + ', ' + j.temperatura + '°C (mín ' + j.minima + ', máx ' + j.maxima + '), umidade ' + j.umidade + '%, vento ' + j.vento + ' km/h.'; }
        case 'moeda': return fmt(await chamarCore('/api/web/moeda?de=' + encodeURIComponent(String(a2.de || 'USD')) + '&para=' + encodeURIComponent(String(a2.para || 'BRL'))));
        case 'cripto': return fmt(await chamarCore('/api/web/cripto?moeda=' + encodeURIComponent(String(a2.moeda || 'bitcoin'))));
        case 'wiki': return fmt(await chamarCore('/api/web/wiki?termo=' + encodeURIComponent(String(a2.termo || ''))));
        case 'feriados': return fmt(await chamarCore('/api/web/feriados?ano=' + encodeURIComponent(String(a2.ano || new Date().getFullYear()))));
        case 'github_stats': { const j = await chamarCore('/api/web/repos'); return 'Repo ' + j.nome + ': ' + j.estrelas + ' estrelas, ' + j.forks + ' forks, ' + j.issues + ' issues, atualizado ' + j.atualizado + '.'; }
        case 'novidades': { const j = await chamarCore('/api/novidades'); return 'Versão atual do JARVIS: ' + j.atual + '. Últimas: ' + j.versoes.slice(0, 3).map((v: any) => v.versao + ' — ' + v.resumo.slice(0, 60)).join(' | '); }
        case 'memoria_salvar': { const txt = String(a2.texto || '').trim().slice(0, 400); if (!txt) throw new Error('Texto vazio.'); const itens = itensMemoria(); itens.push({ texto: txt, ts: new Date().toISOString(), projeto: String(t?.projeto_id || '') }); await salvarMemoria(itens); return 'Salvo na memória da conta (' + itens.length + ' itens no total).'; }
        case 'memoria_buscar': { const termo = String(a2.termo || '').toLowerCase(); const ach = itensMemoria().filter((x: any) => String(x.texto || '').toLowerCase().includes(termo)); return ach.length ? 'Encontrado na memória:\n' + ach.slice(-8).map((x: any) => '• ' + x.texto).join('\n') : 'Nada na memória com "' + termo + '".'; }
        case 'memoria_apagar': { await salvarMemoria([]); return 'Memória da conta apagada por tarefa aprovada.'; }
        case 'site_espelhar': {
          const urlE = String(a2.url || '').trim();
          if (!hostPermitido(urlE)) throw new Error('Informe a URL https pública do site (http e rede interna são bloqueados).');
          const uE: any = new URL(urlE);
          const hostE = uE.hostname;
          const est: any = (await dadoGet(email, 'espelho:' + hostE, null)) || { host: hostE, base: uE.origin, arquivos: {}, fila: [(uE.pathname === '/' || !uE.pathname ? 'index.html' : uE.pathname.replace(/^\//, ''))], paginas: 0, completo: false, truncado: false };
          const t0E = Date.now(); let nE = 0;
          while (est.fila.length && nE < 40 && Date.now() - t0E < 9000) {
            const alvo = String(est.fila.shift());
            if (est.arquivos[alvo]) continue;
            if (Object.keys(est.arquivos).length >= 300) { est.truncado = true; break; }
            try {
              const rE = await fetch(est.base + '/' + alvo, { headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/128.0 Safari/537.36' } });
              if (!rE.ok) { est.arquivos[alvo] = { erro: rE.status }; continue; }
              const tipoE = String(rE.headers.get('content-type') || '');
              const bufE = new Uint8Array(await rE.arrayBuffer());
              const extE = (alvo.split('.').pop() || '').toLowerCase();
              const ehTexto = ['html', 'js', 'css', 'json', 'svg', 'txt', 'webmanifest', 'mjs', 'xml', 'map'].includes(extE) || tipoE.includes('html') || tipoE.includes('css') || tipoE.includes('javascript') || tipoE.includes('json');
              if (bufE.length > 1500 * 1024) { est.arquivos[alvo] = { erro: 'grande demais' }; continue; }
              const caminhoE = tipoE.includes('html') && !/\.[A-Za-z0-9]{1,8}$/.test(alvo) ? alvo.replace(/\/+$/, '') + '/index.html' : alvo;
              if (ehTexto) {
                const txtE = new TextDecoder().decode(bufE);
                if (txtE.length > 900 * 1024) { est.arquivos[alvo] = { erro: 'grande demais' }; continue; }
                est.arquivos[alvo] = { t: 'txt', c: txtE, caminho: caminhoE };
                if (tipoE.includes('html')) est.paginas++;
                for (const ref of refsDe(txtE)) { const al = alvoDe(ref, caminhoE, hostE); if (al && !est.arquivos[al] && !est.fila.includes(al) && est.fila.length < 500) est.fila.push(al); }
              } else {
                est.arquivos[alvo] = bufE.length <= 400 * 1024 ? { t: 'bin', c: b64u8(bufE), n: bufE.length } : { t: 'bin', c: '', n: bufE.length };
              }
              nE++;
            } catch { est.arquivos[alvo] = { erro: 'falhou' }; }
          }
          if (!est.fila.length) est.completo = true;
          if (JSON.stringify(est).length > 2600000) { est.truncado = true; est.fila = []; }
          await dadoSet(email, 'espelho:' + hostE, est);
          await dadoSet(email, 'espelho:ultimo', { host: hostE, em: new Date().toISOString() });
          const totalE = Object.keys(est.arquivos).length;
          return (est.completo || est.truncado ? 'Espelho de ' + hostE + (est.truncado ? ' PARCIAL (limite de tamanho)' : ' COMPLETO') + ': ' + totalE + ' arquivos, ' + est.paginas + ' página(s) HTML.' : 'Espelho de ' + hostE + ' em andamento: ' + totalE + ' arquivos baixados, ' + est.fila.length + ' na fila — execute esta etapa de novo para continuar.');
        }
        case 'site_segredos': {
          const ultS: any = await dadoGet(email, 'espelho:ultimo', null);
          const hostS = String(a2.host || ultS?.host || '');
          if (!hostS) throw new Error('Nenhum espelho salvo ainda — use site_espelhar primeiro.');
          const estS: any = await dadoGet(email, 'espelho:' + hostS, null);
          if (!estS) throw new Error('Espelho de ' + hostS + ' não encontrado — rode site_espelhar de novo.');
          const achados: any[] = [];
          for (const it of Object.entries(estS.arquivos)) { const aS = it[0]; const mS: any = it[1]; if (mS?.t !== 'txt') continue; for (const pS of PADROES_SEGREDO) { const mSn = String(mS.c).match(pS[0]); if (mSn) achados.push({ arquivo: aS, tipo: pS[1], trecho: mSn[0].slice(0, 5) + '…[removido]' }); } }
          return achados.length ? 'ATENÇÃO: ' + achados.length + ' possível(is) segredo(s) no espelho de ' + hostS + ':\n' + achados.slice(0, 10).map((x: any) => '- ' + x.arquivo + ' → ' + x.tipo + ' (' + x.trecho + ')').join('\n') + '\nA publicação (site_publicar) recusa arquivos com segredos.' : 'Nenhum segredo encontrado no espelho de ' + hostS + ' (' + Object.keys(estS.arquivos).length + ' arquivos verificados).';
        }
        case 'site_publicar': {
          const repoP = String(a2.repo || '').trim().replace(/[^A-Za-z0-9._-]/g, '-').slice(0, 60);
          if (!repoP) throw new Error('Informe o nome do repositório (args.repo).');
          const fonteG: any = await dadoGet(email, 'fonte:github', null);
          if (!fonteG?.token) throw new Error('Sem token do GitHub conectado: envie PUT /api/fontes/github com {"token":"ghp_..."} primeiro.');
          const ultP: any = await dadoGet(email, 'espelho:ultimo', null);
          if (!ultP?.host) throw new Error('Nenhum espelho salvo — use site_espelhar primeiro.');
          const estP: any = await dadoGet(email, 'espelho:' + ultP.host, null);
          if (!estP) throw new Error('Espelho de ' + ultP.host + ' não encontrado.');
          const gh = async (metodoG: string, caminhoG: string, corpoG?: any) => { const rG = await fetch('https://api.github.com' + caminhoG, { method: metodoG, headers: { Authorization: 'Bearer ' + fonteG.token, Accept: 'application/vnd.github+json', 'Content-Type': 'application/json', 'User-Agent': 'jarvis-motor' }, body: corpoG ? JSON.stringify(corpoG) : undefined }); const jG: any = await rG.json().catch(() => null); return { ok: rG.ok, status: rG.status, j: jG }; };
          const crG = await gh('POST', '/user/repos', { name: repoP, description: String(a2.descricao || 'Espelho de ' + ultP.host + ' publicado pelo JARVIS').slice(0, 120), has_pages: true, private: false });
          if (!crG.ok && crG.status !== 422) throw new Error('GitHub recusou criar o repo (' + crG.status + '): ' + String(crG.j?.message || '').slice(0, 120));
          const donoP = String(fonteG.login || crG.j?.owner?.login || '');
          if (!donoP) throw new Error('Não consegui identificar o dono do token — reconecte em /api/fontes/github.');
          const pubP: any = (await dadoGet(email, 'publicacao:' + repoP, null)) || { enviados: [] };
          const enviar = async (caminhoV: string, conteudoV: string) => { const rV = await gh('PUT', '/repos/' + donoP + '/' + repoP + '/contents/' + caminhoV, { message: 'espelho: ' + caminhoV, content: conteudoV }); if (!rV.ok && rV.status !== 422 && !String(rV.j?.message || '').includes('sha')) throw new Error('Falhou ao enviar ' + caminhoV + ' (' + rV.status + '): ' + String(rV.j?.message || '').slice(0, 100)); };
          const t0P = Date.now();
          if (!pubP.enviados.includes('.nojekyll')) { await enviar('.nojekyll', b64txt('')); pubP.enviados.push('.nojekyll'); }
          const itensP: any[] = Object.entries(estP.arquivos).filter((it) => it[1] && !it[1].erro && !pubP.enviados.includes(it[0]));
          let enviadosAgora = 0;
          for (const it of itensP) {
            if (Date.now() - t0P > 9000 || enviadosAgora >= 12) break;
            const aP = it[0]; const mP: any = it[1];
            if (mP.t === 'txt') { for (const pT of PADROES_SEGREDO) { if (pT[0].test(String(mP.c))) throw new Error('Segredo do tipo ' + pT[1] + ' em ' + aP + ' — publicação bloqueada (o GitHub recusaria o push). Use site_segredos para ver e remova o segredo.'); } await enviar(mP.caminho || aP, b64txt(String(mP.c))); }
            else if (mP.c) { await enviar(aP, String(mP.c)); }
            pubP.enviados.push(aP); enviadosAgora++;
          }
          const totalP = Object.keys(estP.arquivos).filter((aT) => estP.arquivos[aT] && !estP.arquivos[aT].erro).length;
          const pendP = totalP - pubP.enviados.filter((aX) => aX !== '.nojekyll').length;
          if (pendP > 0) { await dadoSet(email, 'publicacao:' + repoP, pubP); return 'Publicação de ' + repoP + ' em andamento: ' + pubP.enviados.filter((aX) => aX !== '.nojekyll').length + '/' + totalP + ' arquivos enviados — execute esta etapa de novo para continuar.'; }
          const pgP = await gh('POST', '/repos/' + donoP + '/' + repoP + '/pages', { source: { branch: 'main', path: '/' } });
          if (!pgP.ok && pgP.status !== 409 && pgP.status !== 422) throw new Error('Falhou ao ativar Pages (' + pgP.status + '): ' + String(pgP.j?.message || '').slice(0, 120));
          let urlP = String(pgP.j?.html_url || '');
          if (!urlP) { const gpP = await gh('GET', '/repos/' + donoP + '/' + repoP + '/pages'); urlP = String(gpP.j?.html_url || ('https://' + donoP + '.github.io/' + repoP + '/')); }
          return 'PUBLICADO: ' + totalP + ' arquivos em https://github.com/' + donoP + '/' + repoP + ' — GitHub Pages: ' + urlP + ' (espelho de ' + ultP.host + ', demora ~1 min para estar no ar).';
        }
        default: throw new Error('Ferramenta "' + idF + '" não existe no catálogo.');
      }
    };

    // ---------- passos de execução (mesmo formato do log de execução v1.3.5 do chat) ----------
    const novoPassoT = (t: any, tipo: string, nome: string, dados: any = {}) => { t.seq = (t.seq || 0) + 1; const pp: any = { step_id: t.id + '-' + t.seq, sequencia: t.seq, tipo, nome: String(nome).slice(0, 120), estado: 'executando', inicio: new Date().toISOString(), fim: null, duracao_ms: null, provedor: dados.provedor || null, modelo: dados.modelo || null, ferramenta: dados.ferramenta || null, resumo_entrada: dados.resumo_entrada ? String(dados.resumo_entrada).slice(0, 200) : null, resumo_saida: null, tokens_entrada: null, tokens_saida: null, erro: null, refs: [] }; t.passos.push(pp); return pp; };
    const fecharPassoT = (pp: any, dados: any = {}) => { pp.fim = new Date().toISOString(); pp.duracao_ms = Date.now() - Date.parse(pp.inicio); if (dados.resumo_saida !== undefined) pp.resumo_saida = limpaSegredo(String(dados.resumo_saida).slice(0, 240)); if (dados.erro) { pp.estado = 'falhou'; pp.erro = limpaSegredo(String(dados.erro).slice(0, 200)); } else pp.estado = 'concluida'; if (Array.isArray(dados.refs)) pp.refs = dados.refs.slice(0, 6); };
    const salvarTarefa = async (t: any) => { try { await dadoSet(email, 'tarefa:' + t.id, t); } catch { } };
    const indexTarefa = async (t: any) => { try { const idx = await dadoGet(email, 'tarefas', []); const limpo = idx.filter((x: any) => x.id !== t.id); limpo.push({ id: t.id, objetivo: t.objetivo, estado: t.estado, criado_em: t.criado_em, resumo: (t.resumo || '').slice(0, 200) }); await dadoSet(email, 'tarefas', limpo.slice(-30)); } catch { } };

    if (rota === '/api/tarefas') {
      if (metodo === 'GET') { const idx = await dadoGet(email, 'tarefas', []); return json({ tarefas: idx.slice().reverse() }); }
      if (metodo === 'POST') {
        const objetivo = String(corpo?.objetivo || '').trim().slice(0, 400);
        if (!objetivo) return erro('Informe o objetivo da tarefa.', 400);
        const pid = String(corpo?.projeto_id || '');
        const id = 't-' + crypto.randomUUID();
        const t: any = { id, email, projeto_id: pid, objetivo, estado: 'planejando', aprovada: false, criado_em: new Date().toISOString(), inicio: null, fim: null, duracao_ms: null, seq: 0, plano: { etapas: [] }, passos: [], falhas: [], resumo: null, verificacao: null };
        let planoBruto: any = corpo?.plano || null;
        if (!planoBruto) {
          const pPl = novoPassoT(t, 'modelo', 'Plano de execução (IA, fila com fallback no core)');
          try {
            const catalogoTxt = CATALOGO_FERRAMENTAS.map((x: any) => '- ' + x.id + ' ' + x.args + ': ' + x.descricao).join('\n');
            const planoTexto = await iaPerguntar('Monte um plano de até 6 etapas para cumprir este objetivo usando SOMENTE as ferramentas da lista.\n\nOBJETIVO: ' + objetivo + '\n\nFERRAMENTAS:\n' + catalogoTxt + '\n\nResponda APENAS com JSON válido, sem texto fora dele: {"etapas":[{"id":"e1","ferramenta":"pesquisar","args":{"q":"..."},"depende_de":[]}]}\nSe nenhuma ferramenta ajudar, responda {"etapas":[]}', pid);
            fecharPassoT(pPl, { resumo_saida: planoTexto.slice(0, 120) });
            try { const mPl = planoTexto.match(/\{[\s\S]*\}/); planoBruto = mPl ? JSON.parse(mPl[0]) : null; } catch { planoBruto = null; }
          } catch (err: any) { fecharPassoT(pPl, { erro: err?.message || 'falhou ao planejar' }); t.falhas.push({ id: 'planejador', erro: (err?.message || 'falhou').slice(0, 160) }); }
          if (!planoBruto?.etapas?.length) { t.estado = 'falhou'; t.resumo = 'Planejamento falhou: ' + (t.falhas[0]?.erro || 'a IA não devolveu um plano JSON válido.') + (planoBruto ? ' (plano sem etapas)' : ''); await salvarTarefa(t); await indexTarefa(t); return json({ tarefa: sanitizaExec(t) }, 200); }
        }
        const etapas: any[] = []; let invalida = '';
        (planoBruto.etapas || []).slice(0, 8).forEach((et: any, i: number) => {
          const cat = CATALOGO_FERRAMENTAS.find((x: any) => x.id === et.ferramenta);
          if (!cat) { invalida = 'Ferramenta "' + et.ferramenta + '" não existe no catálogo.'; return; }
          etapas.push({ id: String(et.id || 'e' + (i + 1)), ferramenta: String(et.ferramenta), args: et.args || {}, depende_de: (et.depende_de || []).map(String), status: 'pendente', tentativas: 0, resultado: null, erro: null, sensivel: !!cat.sensivel, limite_ms: Math.min(Number(et.limite_ms || cat.limite_ms || 20000), 30000), duracao_ms: null });
        });
        if (invalida || !etapas.length) { t.estado = 'falhou'; t.resumo = invalida || 'Plano sem etapas.'; await salvarTarefa(t); await indexTarefa(t); return json({ tarefa: sanitizaExec(t) }, 200); }
        t.plano = { etapas }; t.estado = 'executando'; t.inicio = new Date().toISOString();
        await salvarTarefa(t); await indexTarefa(t);
        return json({ tarefa: sanitizaExec(t) }, 201);
      }
    }
    const mTar = rota.match(/^\/api\/tarefas\/([A-Za-z0-9-]+)(\/rodar|\/cancelar|\/aprovar)?$/);
    if (mTar) {
      const t = await dadoGet(email, 'tarefa:' + mTar[1], null);
      if (!t) return erro('Tarefa não encontrada.', 404);
      const acao = mTar[2] || '';
      if (acao === '' && metodo === 'DELETE') {
        try { const rows = await norm('JarvisDado'); const rD = rows.find((d: any) => f(d, 'email') === email && f(d, 'chave') === 'tarefa:' + mTar[1]); if (rD) await db.entities.JarvisDado.delete(rD.id); } catch { }
        await dadoSet(email, 'tarefas', (await dadoGet(email, 'tarefas', [])).filter((x: any) => x.id !== mTar[1]));
        return json({ ok: true });
      }
      if (acao === '/cancelar') {
        if (!['concluida', 'falhou', 'cancelada'].includes(t.estado)) {
          for (const et of t.plano.etapas) if (et.status === 'pendente' || et.status === 'executando') et.status = 'cancelada';
          fecharPassoT(novoPassoT(t, 'interno', 'Cancelamento'), { resumo_saida: 'Cancelada pelo usuário; etapas concluídas até aqui foram preservadas' });
          t.estado = 'cancelada'; t.fim = new Date().toISOString(); t.duracao_ms = t.inicio ? Date.now() - Date.parse(t.inicio) : null;
          const feitas = t.plano.etapas.filter((x: any) => x.status === 'concluida').length;
          t.resumo = t.resumo || ('CANCELADA com resultado parcial: ' + feitas + '/' + t.plano.etapas.length + ' etapas concluídas.');
        }
        await salvarTarefa(t); await indexTarefa(t); return json({ tarefa: sanitizaExec(t) });
      }
      if (acao === '/aprovar') {
        if (t.estado !== 'aguardando_aprovacao') return erro('Esta tarefa não está aguardando aprovação.', 400);
        t.aprovada = true; t.estado = 'executando';
        fecharPassoT(novoPassoT(t, 'interno', 'Aprovação humana'), { resumo_saida: 'O usuário aprovou a execução da etapa sensível' });
        await salvarTarefa(t); return json({ tarefa: sanitizaExec(t) });
      }
      if (acao === '/rodar') {
        if (['concluida', 'falhou', 'cancelada', 'parcial'].includes(t.estado)) return json({ tarefa: sanitizaExec(t) });
        const fimChamada = Date.now() + 14000; let executadas = 0;
        while (Date.now() < fimChamada && executadas < 3) {
          const ets = t.plano.etapas;
          const prontas = ets.filter((et: any) => et.status === 'pendente' && (et.depende_de || []).every((d: string) => (ets.find((x: any) => x.id === d) || { status: 'concluida' }).status === 'concluida'));
          if (!prontas.length) break;
          const et = prontas[0];
          if (et.sensivel && !t.aprovada) {
            t.estado = 'aguardando_aprovacao';
            fecharPassoT(novoPassoT(t, 'interno', 'Aprovação necessária'), { resumo_saida: 'A etapa ' + et.id + ' (' + et.ferramenta + ') é sensível: aprove em /api/tarefas/' + t.id + '/aprovar para liberar' });
            await salvarTarefa(t); return json({ tarefa: sanitizaExec(t) });
          }
          et.status = 'executando';
          const pEx = novoPassoT(t, 'ferramenta', 'Ferramenta ' + et.ferramenta, { ferramenta: et.ferramenta, resumo_entrada: JSON.stringify(et.args) });
          const t0 = Date.now(); const maxT = Number(CATALOGO_FERRAMENTAS.find((x: any) => x.id === et.ferramenta)?.tentativas || 2);
          let texto: string | null = null, erroTxt: string | null = null;
          for (let tent = 1; tent <= maxT; tent++) {
            et.tentativas = tent;
            try { const res = await Promise.race([rodarFerrTarefa(et.ferramenta, et.args, t), new Promise((_, rej) => setTimeout(() => rej(new Error('Tempo esgotado (' + et.limite_ms + ' ms)')), et.limite_ms))]); texto = String(res); break; }
            catch (err: any) { erroTxt = (err?.message || 'falhou').slice(0, 200); if (tent < maxT) await new Promise((r2) => setTimeout(r2, 500)); }
          }
          et.duracao_ms = Date.now() - t0;
          if (texto != null) { et.status = 'concluida'; et.resultado = texto.slice(0, 600); const refs = [...texto.matchAll(/https?:\/\/[^\s|]+/g)].map((m2) => m2[0]).filter((u) => hostPermitido(u)).slice(0, 6); fecharPassoT(pEx, { resumo_saida: texto.slice(0, 240), refs }); }
          else { et.status = 'falhou'; et.erro = erroTxt; fecharPassoT(pEx, { erro: erroTxt + (maxT > 1 ? ' (após ' + et.tentativas + ' tentativa(s))' : '') }); }
          executadas++; await salvarTarefa(t);
        }
        const ets = t.plano.etapas;
        const abertas = ets.filter((x: any) => x.status === 'pendente' || x.status === 'executando');
        const prontasAgora = ets.filter((et: any) => et.status === 'pendente' && (et.depende_de || []).every((d: string) => (ets.find((x: any) => x.id === d) || { status: 'concluida' }).status === 'concluida'));
        if (!abertas.length || (!prontasAgora.length && t.estado !== 'aguardando_aprovacao')) {
          const okEt = ets.filter((x: any) => x.status === 'concluida');
          const falEt = ets.filter((x: any) => x.status === 'falhou');
          const evidencias = okEt.map((x: any) => x.id + ' (' + x.ferramenta + '): ' + String(x.resultado || '').slice(0, 180)).join('\n');
          let veredito = ''; let ok = okEt.length > 0 && falEt.length === 0;
          const pVer = novoPassoT(t, 'modelo', 'Verificação por evidências (IA com fallback no core)');
          try {
            const verTexto = await iaPerguntar('Avalie com base SOMENTE nas evidências reais abaixo se o objetivo foi cumprido.\n\nOBJETIVO: ' + t.objetivo + '\nEVIDÊNCIAS:\n' + evidencias + (falEt.length ? '\nETAPAS QUE FALHARAM: ' + falEt.map((x: any) => x.id + ' (' + x.erro + ')').join('; ') : '') + '\n\nResponda na primeira linha SIM ou NÃO e depois resuma em 1 frase.', String(t.projeto_id || ''));
            fecharPassoT(pVer, { resumo_saida: String(verTexto || '').slice(0, 120) });
            if (verTexto) { ok = /^\s*SIM\b/i.test(verTexto); veredito = verTexto.slice(0, 400); }
          } catch (err: any) { fecharPassoT(pVer, { erro: err?.message || 'verificação indisponível', resumo_saida: '' }); t.falhas.push({ id: 'verificador', erro: (err?.message || 'falhou').slice(0, 160) }); }
          if (!veredito) { ok = okEt.length > 0 && falEt.length === 0; veredito = 'Verificação determinística (IA indisponível): ' + okEt.length + ' etapa(s) com evidência real' + (falEt.length ? ', ' + falEt.length + ' falha(s)' : '') + '.'; }
          t.verificacao = veredito;
          t.estado = ok ? 'concluida' : (okEt.length ? 'parcial' : 'falhou');
          t.fim = new Date().toISOString(); t.duracao_ms = t.inicio ? Date.now() - Date.parse(t.inicio) : null;
          t.resumo = t.estado.toUpperCase() + ': ' + okEt.length + '/' + t.plano.etapas.length + ' etapas. ' + veredito.slice(0, 200);
        } else if (t.estado !== 'aguardando_aprovacao') { t.estado = 'executando'; }
        await salvarTarefa(t); await indexTarefa(t);
        return json({ tarefa: sanitizaExec(t) });
      }
      return json({ tarefa: sanitizaExec(t) });
    }
    return erro('Rota não disponível no motor de tarefas.', 404);
  } catch (e) {
    return erro('Erro interno: ' + (e?.message || String(e)), 500);
  }
});
