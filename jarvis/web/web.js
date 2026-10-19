'use strict';
// JARVIS Web: a mesma tela do app (anel de energia, agentes, conversa, voz, modo de personalidade, melhorador de prompt, clima),
// rodando no navegador com as IAs da conta (fila com failover no servidor). O que roda no PC (editor, mapeamento, transcritor…)
// é aberto no app pela conexão da conta (aba "Meu PC").
(() => {
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];
  const el = (tag, attrs = {}, ...filhos) => { const e = document.createElement(tag); for (const [k, v] of Object.entries(attrs)) { if (v == null || v === false) continue; if (k === 'class') e.className = v; else if (k === 'text') e.textContent = v; else if (k.startsWith('on')) e.addEventListener(k.slice(2), v); else e.setAttribute(k, v === true ? '' : v); } for (const f of filhos.flat()) if (f != null && f !== false) e.append(f instanceof Node ? f : document.createTextNode(String(f))); return e; };
  const esc = (s) => String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  const icones = (r) => { try { window.JARVIS_ICONES?.montar(r); } catch { /* sem ícones */ } };
  const local = { get: (k, p) => { try { const v = localStorage.getItem('jarvis.web.' + k); return v == null ? p : JSON.parse(v); } catch { return p; } }, set: (k, v) => { try { localStorage.setItem('jarvis.web.' + k, JSON.stringify(v)); } catch { /* só nesta aba */ } } };
  async function api(url, metodo = 'GET', corpo) {
    const r = await fetch(url, { method: metodo, headers: corpo ? { 'Content-Type': 'application/json' } : {}, body: corpo ? JSON.stringify(corpo) : undefined, credentials: 'same-origin' });
    const j = await r.json().catch(() => ({}));
    if (r.status === 401 && !url.includes('/ponte/')) { location.href = '../../entrar?volta=/jarvis/app'; throw new Error('login'); }
    if (!r.ok) throw Object.assign(new Error(j.erro || 'Erro ' + r.status), { status: r.status });
    return j;
  }
  function toast(texto, tipo = '', ms = 4500) {
    const t = el('div', { class: 'toast ' + tipo, text: texto });
    $('#toasts').append(t); setTimeout(() => t.classList.add('out'), ms); setTimeout(() => t.remove(), ms + 400);
  }
  const CORES = ['#2E9BFF', '#34d399', '#fbbf24', '#a78bfa', '#f472b6', '#22d3ee', '#fb923c'];
  const S = { agentes: [], agenteId: null, ias: [], plano: null, busy: false, falando: false, ouvindo: false, voz: local.get('voz', true), continua: local.get('continua', false), legendas: local.get('legendas', false), modo: local.get('modo', 'equilibrado'), modos: [], pc: null, erroAte: 0 };

  // ---------- relógio ----------
  const relogio = () => { const d = new Date(); $('#clock').textContent = d.toLocaleTimeString('pt-BR'); $('#date').textContent = d.toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'short' }).replace(/^\w/, (c) => c.toUpperCase()); };
  relogio(); setInterval(relogio, 1000);

  // ---------- anel de energia + estado ----------
  let orb = null; let nivel = 0;
  const iniciarOrb = () => { if (!window.Orb || orb) return; orb = new window.Orb($('#orb')); orb.setModo('anel'); orb.setColor('#2E9BFF'); };
  function estado() {
    let st = 'idle', rot = 'ONLINE', cls = '';
    if (S.ouvindo) { st = 'listening'; rot = 'OUVINDO'; cls = 'blink'; }
    else if (S.falando) { st = 'speaking'; rot = 'FALANDO'; }
    else if (S.busy) { st = 'thinking'; rot = 'PROCESSANDO'; cls = 'thinking blink'; }
    else if (Date.now() < S.erroAte) { st = 'error'; rot = 'FALHA'; cls = 'error'; }
    orb?.setState(st);
    $('#stateText').textContent = rot; $('#stateText').className = 'state-text ' + cls;
    $('#micBtn').classList.toggle('listening', S.ouvindo);
    const parar = S.busy || S.falando;
    const b = $('#sendBtn'); b.classList.toggle('stop', parar); b.title = parar ? 'Interromper (Esc)' : 'Enviar (Enter)';
    b.replaceChildren(el('span', { 'data-ic': parar ? 'x' : 'send' })); icones(b);
  }
  // nível de "voz" para o anel e a onda: simulado (a voz do navegador não expõe o áudio)
  let fase = 0;
  function animar() {
    fase += 0.05;
    const alvo = S.falando ? 0.35 + 0.3 * Math.abs(Math.sin(fase * 2.3)) * Math.abs(Math.sin(fase * 0.7 + 1)) : S.ouvindo ? 0.15 + 0.15 * Math.abs(Math.sin(fase * 3)) : 0;
    nivel += (alvo - nivel) * 0.25;
    orb?.setLevel(nivel);
    desenharOnda();
    requestAnimationFrame(animar);
  }
  const onda = $('#onda'), g = onda.getContext('2d');
  function desenharOnda() {
    const dpr = Math.min(2, devicePixelRatio || 1), w = onda.clientWidth, h = onda.clientHeight;
    if (!w) return;
    if (onda.width !== w * dpr) { onda.width = w * dpr; onda.height = h * dpr; }
    g.setTransform(dpr, 0, 0, dpr, 0, 0); g.clearRect(0, 0, w, h);
    const n = 34, larg = w / n;
    for (let i = 0; i < n; i++) {
      const v = nivel > 0.02 ? nivel * (0.45 + 0.55 * Math.abs(Math.sin(i * 0.7 + fase * 3))) : 0.06 + 0.04 * Math.sin(i * 0.45 + fase);
      const alt = Math.max(2, v * (h - 6));
      g.fillStyle = '#2E9BFF'; g.globalAlpha = 0.35 + v * 0.65;
      g.fillRect(i * larg + 1, (h - alt) / 2, Math.max(1, larg - 2), alt);
    }
    g.globalAlpha = 1;
    $('#audioSt').textContent = S.falando ? 'VOZ' : S.ouvindo ? 'MICROFONE' : 'EM ESPERA';
    $('#teleAudio').classList.toggle('vivo', S.falando || S.ouvindo);
  }

  // ---------- legenda ----------
  let legendaT = 0;
  function legenda(texto, tipo = '') {
    const s = $('#subtitle'); s.textContent = texto; s.className = 'subtitle ' + tipo;
    clearTimeout(legendaT); if (texto && !S.falando) legendaT = setTimeout(() => { if (!S.falando && !S.ouvindo) s.textContent = ''; }, 9000);
  }
  const legendaDe = (t) => (S.legendas ? t.slice(-320) : (t.split(/(?<=[.!?…])\s+/).filter(Boolean).pop() || '').slice(0, 220));

  // ---------- voz (navegador) ----------
  const temVoz = 'speechSynthesis' in window;
  const vozes = () => (temVoz ? speechSynthesis.getVoices().filter((v) => /^pt/i.test(v.lang)) : []);
  function vozEscolhida() {
    const lista = vozes(); const salva = local.get('vozNome', '');
    return lista.find((v) => v.name === salva) || (S.vozConta ? lista.find((v) => new RegExp('microsoft.*' + S.vozConta, 'i').test(v.name)) : null) || lista.find((v) => /microsoft.*(antonio|francisca|thalita)/i.test(v.name)) || lista.find((v) => /google/i.test(v.name) && /BR/i.test(v.lang)) || lista.find((v) => v.lang === 'pt-BR') || lista[0] || null;
  }
  function limparParaFala(t) { return String(t).replace(/```[\s\S]*?```/g, ' (código na tela) ').replace(/[*_#>`]/g, '').replace(/\[([^\]]+)\]\([^)]+\)/g, '$1').replace(/https?:\/\/\S+/g, 'link').slice(0, 1800); }
  function falar(texto, aoAcabar) {
    if (!temVoz || !S.voz || !texto) { aoAcabar?.(); return; }
    speechSynthesis.cancel();
    const partes = limparParaFala(texto).match(/[^.!?…]+[.!?…]*\s*/g) || [texto];
    const v = vozEscolhida(); let i = 0;
    S.falando = true; estado();
    const proxima = () => {
      if (i >= partes.length || !S.falando) { S.falando = false; estado(); aoAcabar?.(); return; }
      const frase = partes[i++].trim(); if (!frase) return proxima();
      const u = new SpeechSynthesisUtterance(frase);
      if (v) u.voice = v; u.lang = v?.lang || 'pt-BR'; u.rate = Number(local.get('vel', 1.05));
      u.onstart = () => { if (!S.legendas) legenda(frase); };
      u.onend = proxima; u.onerror = () => { S.falando = false; estado(); aoAcabar?.(); };
      speechSynthesis.speak(u);
    };
    proxima();
  }
  const pararFala = () => { if (temVoz) speechSynthesis.cancel(); S.falando = false; estado(); };
  if (temVoz) speechSynthesis.onvoiceschanged = () => preencherVozes();

  // ---------- microfone (reconhecimento de voz do navegador) ----------
  const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
  let rec = null;
  function ouvir() {
    if (!SR) { toast('Este navegador não reconhece voz. Use o Chrome ou o Edge.', 'bad'); return; }
    if (S.ouvindo) { rec?.stop(); return; }
    pararFala();
    rec = new SR(); rec.lang = 'pt-BR'; rec.interimResults = true; rec.continuous = false;
    let final = '';
    rec.onresult = (e) => { let parcial = ''; for (const r of e.results) { if (r.isFinal) final = r[0].transcript; else parcial += r[0].transcript; } legenda(final || parcial, 'heard'); };
    rec.onerror = (e) => { if (e.error === 'not-allowed') toast('Permita o microfone para este site (ícone ao lado do endereço).', 'bad', 7000); };
    rec.onend = () => { S.ouvindo = false; estado(); if (final.trim()) enviar(final.trim(), { voz: true }); };
    S.ouvindo = true; estado();
    try { rec.start(); } catch { S.ouvindo = false; estado(); }
  }
  $('#micBtn').addEventListener('click', ouvir);
  document.addEventListener('keydown', (e) => {
    if (e.ctrlKey && e.code === 'Space') { e.preventDefault(); ouvir(); }
    if (e.key === 'Escape') { pararFala(); rec?.abort?.(); if (S.ac) S.ac.abort(); }
  });

  // ---------- botões de voz ----------
  const sincBotoes = () => { $('#btnVoice').classList.toggle('on', S.voz); $('#btnLoop').classList.toggle('on', S.continua); $('#btnCaptions').classList.toggle('on', S.legendas); document.body.classList.toggle('legendas-grandes', S.legendas); };
  $('#btnVoice').addEventListener('click', () => { S.voz = !S.voz; local.set('voz', S.voz); if (!S.voz) pararFala(); sincBotoes(); });
  $('#btnLoop').addEventListener('click', () => { S.continua = !S.continua; local.set('continua', S.continua); sincBotoes(); });
  $('#btnCaptions').addEventListener('click', () => { S.legendas = !S.legendas; local.set('legendas', S.legendas); sincBotoes(); });
  $('#btnLayout').addEventListener('click', () => { const on = $('#layout').classList.toggle('focus'); local.set('foco', on); });
  if (local.get('foco', false)) $('#layout').classList.add('focus');

  // ---------- modo de personalidade ----------
  const menuModo = el('div', { class: 'modo-menu', role: 'menu', hidden: true }); document.body.append(menuModo);
  const nomeCurto = (n) => String(n || '').replace(/\s*\(.*\)$/, '');
  const pintarModo = () => { const m = S.modos.find((x) => x.id === S.modo); $('#modoRot').textContent = m ? nomeCurto(m.nome) : 'Modo'; };
  function escolherModo(m) { S.modo = m.id; local.set('modo', m.id); pintarModo(); legenda(m.exemplo); falar(m.exemplo); desenharModosConfig(); }
  $('#btnModo').addEventListener('click', (e) => {
    e.stopPropagation();
    if (!menuModo.hidden) { menuModo.hidden = true; return; }
    menuModo.replaceChildren(el('div', { class: 'modo-menu-cab', text: 'Jeito de falar' }), ...S.modos.map((m) => el('button', { type: 'button', role: 'menuitemradio', 'aria-checked': String(m.id === S.modo), class: m.id === S.modo ? 'on' : '', onclick: () => { menuModo.hidden = true; escolherModo(m); } }, el('b', { text: m.nome }), el('small', { text: m.resumo }))));
    menuModo.hidden = false;
    const r = $('#btnModo').getBoundingClientRect();
    menuModo.style.left = Math.max(12, Math.min(innerWidth - 300, r.left + r.width / 2 - 140)) + 'px';
    menuModo.style.top = Math.max(12, r.top - menuModo.offsetHeight - 10) + 'px';
  });
  document.addEventListener('click', (e) => { if (!menuModo.hidden && !menuModo.contains(e.target)) menuModo.hidden = true; });

  // ---------- agentes (projetos da conta) ----------
  const agente = () => S.agentes.find((a) => a.id === S.agenteId) || S.agentes[0];
  const corDe = (a) => CORES[Math.max(0, S.agentes.indexOf(a)) % CORES.length];
  function desenharAgentes() {
    $('#agentList').replaceChildren(...S.agentes.map((a) => {
      const item = el('div', { class: 'agent' + (a.id === S.agenteId ? ' active' : ''), role: 'button', tabindex: '0', onclick: (e) => { if (!e.target.closest('.edit')) escolherAgente(a.id); }, onkeydown: (e) => { if (e.key === 'Enter') escolherAgente(a.id); } },
        el('div', { class: 'ico', text: (a.assistente || a.nome || '?').trim().charAt(0).toUpperCase() }),
        el('div', { class: 'meta' }, el('div', { class: 'nm', text: a.nome }), el('div', { class: 'ds', text: a.descricao || a.assistente || 'Assistente' })),
        el('button', { class: 'edit', type: 'button', title: 'Editar agente', onclick: () => abrirEditor(a) }, el('span', { 'data-ic': 'pen' })));
      item.style.setProperty('--c', corDe(a));
      return item;
    }));
    icones($('#agentList'));
  }
  function escolherAgente(id) { S.agenteId = id; local.set('agente', id); desenharAgentes(); desenharConversa(); const a = agente(); $('#agentName').textContent = (a?.assistente || a?.nome || 'JARVIS').toUpperCase(); }
  const PADRAO = { nome: 'JARVIS', assistente: 'JARVIS', descricao: 'Assistente pessoal: conversa, pesquisa e organiza', instrucoes: 'Você é o JARVIS, um assistente pessoal de IA em português do Brasil. Responda de forma clara, útil e direta, como numa conversa por voz: frases curtas, sem enrolação. Use listas quando ajudarem. Se faltar informação importante, pergunte. Não invente fatos.' };
  async function carregarAgentes() {
    S.agentes = await api('/api/projetos');
    if (!S.agentes.length) { await api('/api/projetos', 'POST', PADRAO); S.agentes = await api('/api/projetos'); }
    const salvo = local.get('agente', null);
    S.agenteId = S.agentes.some((a) => a.id === salvo) ? salvo : (S.agentes.find((a) => a.nome === 'JARVIS') || S.agentes[0]).id;
    escolherAgente(S.agenteId);
  }

  // ---------- conversa ----------
  const conversa = (id) => local.get('conv.' + id, []);
  const guardarConversa = (id, l) => local.set('conv.' + id, l.slice(-60));
  const hora = (ts) => new Date(ts || Date.now()).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
  // markdown simples e seguro (tudo escapado antes)
  function md(t) {
    let h = esc(t);
    h = h.replace(/```(\w*)\n?([\s\S]*?)```/g, (_, _l, c) => `<pre><code>${c}</code></pre>`);
    h = h.replace(/`([^`\n]+)`/g, '<code>$1</code>').replace(/\*\*([^*\n]+)\*\*/g, '<b>$1</b>').replace(/(^|[\s(])\*([^*\n]+)\*(?=[\s).,!?]|$)/g, '$1<i>$2</i>');
    h = h.replace(/\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)/g, '<a href="$2" target="_blank" rel="noopener noreferrer">$1</a>');
    const linhas = h.split('\n'); const out = []; let lista = null;
    for (const l of linhas) {
      const m = l.match(/^\s*(?:[-*•]|\d+[.)])\s+(.*)$/);
      if (m) { if (!lista) { lista = /^\s*\d/.test(l) ? 'ol' : 'ul'; out.push(`<${lista}>`); } out.push(`<li>${m[1]}</li>`); continue; }
      if (lista) { out.push(`</${lista}>`); lista = null; }
      const tit = l.match(/^#{1,4}\s+(.*)$/);
      if (tit) out.push(`<p><b>${tit[1]}</b></p>`); else if (l.trim()) out.push(`<p>${l}</p>`);
    }
    if (lista) out.push(`</${lista}>`);
    return out.join('');
  }
  function bolha(m) {
    const a = agente();
    if (m.role === 'user') return el('div', { class: 'msg user' }, el('div', { class: 'who' }, el('span', { class: 'tm', text: hora(m.ts) }), ' Você'), el('div', { class: 'bubble', text: m.texto }));
    const b = el('div', { class: 'msg bot' + (m.erro ? ' erro' : '') },
      el('div', { class: 'who' }, (a?.assistente || 'JARVIS') + ' ', el('span', { class: 'tm', text: hora(m.ts) }), m.ia_nome ? el('span', { class: 'via', text: 'via ' + m.ia_nome }) : null),
      el('div', { class: 'bubble' }, (m.falhas || []).length ? el('div', { class: 'notices' }, el('div', { class: 'notice', text: m.falhas.map((f) => `${f.nome || f.ia} falhou (${f.erro})`).join(' · ') + ' — a próxima IA assumiu com a mesma conversa.' })) : null, el('div', { class: 'content' })),
      m.erro ? null : el('div', { class: 'msg-actions' }, el('button', { type: 'button', title: 'Ouvir de novo', onclick: () => falar(m.texto) }, el('span', { 'data-ic': 'volume' })), el('button', { type: 'button', title: 'Copiar', onclick: () => navigator.clipboard.writeText(m.texto).then(() => toast('Copiado.')) }, el('span', { 'data-ic': 'copy' }))));
    b.style.setProperty('--c', corDe(a));
    if (m.erro) $('.content', b).textContent = m.texto; else $('.content', b).innerHTML = md(m.texto);
    return b;
  }
  function desenharConversa() {
    const a = agente(); const lista = conversa(a.id); const caixa = $('#messages');
    $('#convTitle').textContent = lista.find((m) => m.role === 'user')?.texto.slice(0, 48) || 'Nova conversa';
    if (!lista.length) caixa.replaceChildren(el('div', { class: 'welcome' }, el('div', { class: 'welcome-k', text: (a.assistente || 'JARVIS').toUpperCase() }), el('p', { text: a.descricao || 'Assistente pessoal: conversa, pesquisa e organiza.' }), el('p', { class: 'muted', text: 'Fale pelo microfone ou digite abaixo.' })));
    else caixa.replaceChildren(...lista.map(bolha));
    icones(caixa); caixa.scrollTop = caixa.scrollHeight;
    desenharAtalhos();
  }
  const ATALHOS = ['Escreva um roteiro de 30 segundos para Reels', 'Ideias de post para o meu Instagram', 'Me ajude a responder um cliente', 'Resuma este texto em tópicos', 'Monte um plano de estudos de 7 dias'];
  function desenharAtalhos() { $('#quick').replaceChildren(...ATALHOS.map((t) => el('button', { type: 'button', class: 'chip', onclick: () => enviar(t) }, t))); }

  async function enviar(texto, o = {}) {
    texto = String(texto || '').trim(); if (!texto) return;
    if (S.busy) return;
    pararFala();
    const a = agente(); const lista = conversa(a.id);
    document.dispatchEvent(new CustomEvent('jarvis:pedido', { detail: { texto, voz: !!o.voz } })); // contador anônimo (host-web.js): só o tipo do pedido
    lista.push({ role: 'user', texto, ts: Date.now() }); guardarConversa(a.id, lista); desenharConversa();
    legenda(o.voz ? texto : '', o.voz ? 'heard' : '');
    const pensando = el('div', { class: 'msg bot pensando' }, el('div', { class: 'bubble' }, el('i', { class: 'spin' }), ' Pensando…'));
    $('#messages').append(pensando); $('#messages').scrollTop = 1e9;
    S.busy = true; estado();
    const mensagens = lista.filter((m) => !m.erro).slice(-30).map((m) => ({ role: m.role, content: m.texto }));
    try {
      const r = await api(`/api/projetos/${a.id}/testar`, 'POST', { mensagens, personalidade: S.modo });
      const nomes = Object.fromEntries(S.ias.map((i) => [i.id, i.nome]));
      lista.push({ role: 'assistant', texto: r.resposta, ia_nome: r.ia_nome, ts: Date.now(), falhas: (r.tentativas_falhas || []).map((f) => ({ ...f, nome: nomes[f.ia], erro: String(f.erro).slice(0, 80) })) });
      $('#provBadge').textContent = r.ia_nome || '--';
      S.busy = false; guardarConversa(a.id, lista); desenharConversa();
      if (S.legendas || !S.voz) legenda(legendaDe(r.resposta));
      falar(r.resposta, () => { if (S.continua && o.voz) setTimeout(ouvir, 400); });
    } catch (e) {
      S.busy = false; if (e.message === 'login') return;
      lista.push({ role: 'assistant', erro: true, texto: e.status === 400 && /IA/.test(e.message) ? 'Nenhuma IA conectada ainda. Abra a aba "Minhas IAs" e conecte uma (o Gemini é grátis).' : e.message, ts: Date.now() }); if (e.status === 400) mostrarAba('ias');
      guardarConversa(a.id, lista); desenharConversa(); S.erroAte = Date.now() + 2600; setTimeout(estado, 2700);
    }
    estado();
  }
  const input = $('#input');
  const ajustar = () => { input.style.height = 'auto'; input.style.height = Math.min(160, input.scrollHeight) + 'px'; };
  input.addEventListener('input', ajustar);
  input.addEventListener('keydown', (e) => { if (e.key === 'Enter' && !e.shiftKey && !e.isComposing) { e.preventDefault(); $('#composer').requestSubmit(); } });
  $('#composer').addEventListener('submit', (e) => { e.preventDefault(); if ((S.busy || S.falando) && !input.value.trim()) { pararFala(); return; } const t = input.value; input.value = ''; ajustar(); fecharMelhorador(); enviar(t); });
  $('#btnNewChat').addEventListener('click', () => { const a = agente(); if (conversa(a.id).length && !confirm('Começar uma conversa nova com este agente? A atual será apagada deste navegador.')) return; guardarConversa(a.id, []); desenharConversa(); });

  // ---------- melhorador de prompt (o mesmo do app) ----------
  const caixaPm = el('div', { class: 'pm-caixa', hidden: true }); $('#composer').before(caixaPm);
  const fecharMelhorador = () => { caixaPm.hidden = true; caixaPm.replaceChildren(); };
  async function melhorar() {
    const texto = input.value.trim(); if (texto.length < 3) { input.focus(); input.placeholder = 'Escreva o pedido e clique na varinha para melhorar…'; return; }
    const b = $('#btnMelhorar'); b.disabled = true; b.classList.add('girando');
    caixaPm.hidden = false; caixaPm.replaceChildren(el('div', { class: 'pm-cab' }, el('span', { 'data-ic': 'wand' }), el('b', { text: 'Melhorando o seu pedido…' })), el('div', { class: 'pm-carregando' }, el('i'), el('i'), el('i'))); icones(caixaPm);
    try {
      const r = await api('/api/web/melhorar-prompt', 'POST', { texto });
      const area = el('textarea', { class: 'pm-texto', rows: '5' }); area.value = r.prompt;
      caixaPm.replaceChildren(el('div', { class: 'pm-cab' }, el('span', { 'data-ic': 'wand' }), el('b', { text: 'Pedido melhorado' }), el('small', { text: r.ia ? 'por ' + r.ia : '' }), el('button', { type: 'button', class: 'mini-btn pm-x', title: 'Descartar', onclick: fecharMelhorador }, '×')),
        r.mudancas?.length ? el('div', { class: 'pm-mudancas' }, r.mudancas.map((m) => el('span', { text: m }))) : null, area,
        el('div', { class: 'pm-acoes' }, el('button', { type: 'button', class: 'primary-btn', onclick: () => { input.value = area.value; fecharMelhorador(); $('#composer').requestSubmit(); } }, 'Usar e enviar'),
          el('button', { type: 'button', class: 'ghost-btn', onclick: () => { input.value = area.value; ajustar(); fecharMelhorador(); input.focus(); } }, 'Usar no campo'),
          el('button', { type: 'button', class: 'ghost-btn', onclick: () => { fecharMelhorador(); input.focus(); } }, 'Manter o meu')));
      icones(caixaPm);
    } catch (e) { if (e.message !== 'login') { caixaPm.replaceChildren(el('div', { class: 'pm-cab' }, el('span', { 'data-ic': 'alert' }), el('b', { text: e.message }), el('button', { type: 'button', class: 'mini-btn pm-x', onclick: fecharMelhorador }, '×'))); icones(caixaPm); } }
    b.disabled = false; b.classList.remove('girando');
  }
  $('#btnMelhorar').addEventListener('click', melhorar);
  input.addEventListener('keydown', (e) => { if (e.altKey && (e.key === 'm' || e.key === 'M')) { e.preventDefault(); melhorar(); } });

  // ---------- editor de agente ----------
  const dlgA = $('#dlgAgent'); let editando = null;
  function abrirEditor(a) {
    editando = a || null;
    $('#agentDlgTitle').textContent = a ? 'Editar agente' : 'Novo agente';
    $('#gerTitulo').textContent = a ? 'Melhorar com IA' : 'Deixe a IA escrever o agente';
    $('#gerar').lastChild.textContent = a ? 'Otimizar instruções' : 'Gerar com IA';
    $('#gerTexto').value = ''; $('#pNome').value = a?.nome || ''; $('#pAssistente').value = a?.assistente || ''; $('#pDescricao').value = a?.descricao || ''; $('#pInstrucoes').value = a?.instrucoes || '';
    $('#edExcluir').hidden = !a || S.agentes.length < 2; $('#edErro').hidden = true;
    dlgA.showModal();
  }
  $('#btnNewAgent').addEventListener('click', () => abrirEditor(null));
  $('#btnEditAgent').addEventListener('click', () => abrirEditor(agente()));
  $('#gerar').addEventListener('click', async () => {
    const b = $('#gerar'), erro = $('#edErro'); erro.hidden = true;
    const pedido = $('#gerTexto').value.trim() || (editando ? 'Melhore as instruções' : '');
    if (pedido.length < 8) { erro.textContent = 'Descreva em pelo menos uma frase o que o agente deve fazer.'; erro.hidden = false; return; }
    b.disabled = true;
    try {
      const r = await api('/api/projetos/assistente', 'POST', { acao: editando ? 'otimizar' : 'criar', texto: pedido, nome: $('#pNome').value, assistente: $('#pAssistente').value, instrucoes: $('#pInstrucoes').value });
      const p = r.projeto; if (p.nome) $('#pNome').value = p.nome; if (p.assistente) $('#pAssistente').value = p.assistente; if (p.descricao) $('#pDescricao').value = p.descricao; $('#pInstrucoes').value = p.instrucoes;
    } catch (e) { if (e.message !== 'login') { erro.textContent = e.message; erro.hidden = false; } }
    b.disabled = false;
  });
  $('#agentForm').addEventListener('submit', async (e) => {
    if (e.submitter?.value !== 'save') return;
    e.preventDefault();
    const corpo = { nome: $('#pNome').value.trim(), assistente: $('#pAssistente').value.trim() || 'Assistente', descricao: $('#pDescricao').value.trim(), instrucoes: $('#pInstrucoes').value };
    try { const salvo = editando ? await api('/api/projetos/' + editando.id, 'PUT', corpo) : await api('/api/projetos', 'POST', corpo); S.agentes = await api('/api/projetos'); dlgA.close(); escolherAgente(salvo.id); toast('Agente salvo.'); }
    catch (err) { if (err.message !== 'login') { $('#edErro').textContent = err.message; $('#edErro').hidden = false; } }
  });
  $('#edExcluir').addEventListener('click', async () => {
    if (!editando || !confirm(`Excluir o agente "${editando.nome}"? Isso não pode ser desfeito.`)) return;
    try { await api('/api/projetos/' + editando.id, 'DELETE'); local.set('conv.' + editando.id, []); S.agentes = await api('/api/projetos'); dlgA.close(); escolherAgente(S.agentes[0].id); } catch (e) { if (e.message !== 'login') { $('#edErro').textContent = e.message; $('#edErro').hidden = false; } }
  });

  // ---------- abas da direita ----------
  function mostrarAba(v) { $$('.chat-tabs .ctab').forEach((b) => b.classList.toggle('active', b.dataset.view === v)); $$('.chat .view').forEach((x) => x.classList.toggle('active', x.dataset.view === v)); }
  $$('.chat-tabs .ctab').forEach((b) => b.addEventListener('click', () => mostrarAba(b.dataset.view)));

  // ---------- minhas IAs (fila) ----------
  const NOME_PLANO = { free: 'Free', basic: 'Basic', premium: 'Premium' };
  const conectadas = () => S.ias.filter((i) => i.conectada).sort((a, b) => a.ordem - b.ordem);
  function desenharIas() {
    const fila = $('#fila'), lista = conectadas(), limite = S.plano?.limites?.ias_max ?? null;
    $('#iasContagem').textContent = limite ? `${lista.length} de ${limite}` : `${lista.length} conectada${lista.length === 1 ? '' : 's'}`;
    $('#filaVazia').hidden = lista.length > 0;
    fila.replaceChildren(...lista.map((ia, i) => {
      const res = el('div', { class: 'web-res', hidden: true });
      const mover = (d) => async () => { const ordem = lista.map((x) => x.id); const j = i + d; [ordem[i], ordem[j]] = [ordem[j], ordem[i]]; try { await api('/api/conta/ias-ordem', 'PUT', { ordem }); await carregarIas(); } catch (e) { toast(e.message, 'bad'); } };
      return el('li', { class: 'ia-row' },
        el('div', { class: 'web-ia-nome' }, el('span', { class: 'web-pos', text: String(i + 1) }), el('div', {}, el('b', { text: ia.nome }), ia.recomendacao ? el('span', { class: 'web-rec', title: ia.recomendacao.motivo, text: `nº ${ia.recomendacao.posicao} recomendada` }) : null, el('small', { text: `${ia.modelo || ia.modelo_padrao} · chave ${ia.final_chave}` }))),
        el('div', { class: 'web-ia-acoes' },
          el('button', { type: 'button', class: 'mini-btn', title: 'Subir na fila', disabled: i === 0, onclick: mover(-1) }, '↑'),
          el('button', { type: 'button', class: 'mini-btn', title: 'Descer na fila', disabled: i === lista.length - 1, onclick: mover(1) }, '↓'),
          el('button', { type: 'button', class: 'ghost-btn', onclick: async (e) => { const b = e.currentTarget; b.disabled = true; res.hidden = false; res.className = 'web-res'; res.textContent = 'Testando…'; try { const r = await api(`/api/conta/ias/${ia.id}/testar`, 'POST', {}); res.className = 'web-res ' + (r.ok ? 'bom' : 'ruim'); res.textContent = r.msg; } catch (er) { res.className = 'web-res ruim'; res.textContent = er.message; } b.disabled = false; } }, 'Testar'),
          el('button', { type: 'button', class: 'ghost-btn', onclick: async () => { if (!confirm(`Remover a chave de ${ia.nome} do servidor?`)) return; try { await api('/api/conta/ias/' + ia.id, 'DELETE'); await carregarIas(); } catch (er) { toast(er.message, 'bad'); } } }, 'Remover')),
        res);
    }));
    // ordem recomendada (da melhor para a pior): a fila pode ser posta nela com um clique
    const pos = (i) => i.recomendacao?.posicao || 99;
    const recFila = [...lista].sort((a, b) => pos(a) - pos(b));
    const foraDeOrdem = lista.length > 1 && recFila.some((x, k) => x.id !== lista[k].id);
    const box = $('#iasRec'); if (box) box.replaceChildren(el('span', { text: 'Ordem recomendada, da melhor para a pior: ' + [...S.ias].sort((a, b) => pos(a) - pos(b)).map((i) => i.nome.replace(/s*(.*)$/, '')).join(' → ') }), foraDeOrdem ? el('button', { type: 'button', class: 'ghost-btn', onclick: async () => { try { await api('/api/conta/ias-ordem', 'PUT', { ordem: recFila.map((x) => x.id) }); await carregarIas(); toast('Fila na ordem recomendada.'); } catch (e) { toast(e.message, 'bad'); } } }, 'Usar a ordem recomendada') : null);
    const sel = $('#cIa'), livres = S.ias.filter((i) => !i.conectada).sort((a, b) => pos(a) - pos(b));
    sel.replaceChildren(...livres.map((i) => el('option', { value: i.id, text: `${i.recomendacao ? 'nº ' + i.recomendacao.posicao + ' · ' : ''}${i.nome}${i.gratis ? ' (tem plano grátis)' : ''}` })));
    const cheio = !!limite && lista.length >= limite;
    $('#cOk').disabled = cheio || !livres.length;
    const erro = $('#cErro');
    if (cheio) { erro.textContent = `O plano ${NOME_PLANO[S.plano.plano] || S.plano.plano} conecta até ${limite} IA${limite > 1 ? 's' : ''} ao mesmo tempo. Remova uma ou mude de plano.`; erro.hidden = false; } else erro.hidden = true;
    linkIa();
  }
  function linkIa() { const motivo = $('#cMotivo'), escolhida = S.ias.find((i) => i.id === $('#cIa').value); if (motivo) motivo.textContent = escolhida?.recomendacao?.motivo || ''; const t = $('#cTut'); if (t && window.JARVIS_IAS_TUTORIAL) t.replaceChildren(window.JARVIS_IAS_TUTORIAL.montar($('#cIa').value, { onde: 'nuvem', aberto: !S.ias.some((i) => i.conectada) })); const ia = S.ias.find((i) => i.id === $('#cIa').value), c = $('#cLink'); c.replaceChildren(); if (ia) c.append('Pegue a chave em ', el('a', { href: ia.site, target: '_blank', rel: 'noopener', text: new URL(ia.site).host }), '.'); }
  $('#cIa').addEventListener('change', linkIa);
  $('#conectar').addEventListener('submit', async (e) => {
    e.preventDefault(); const erro = $('#cErro'), b = $('#cOk'); erro.hidden = true; b.disabled = true;
    try { await api('/api/conta/ias/' + $('#cIa').value, 'PUT', { chave: $('#cChave').value.trim(), modelo: $('#cModelo').value.trim() }); $('#cChave').value = ''; $('#cModelo').value = ''; await carregarIas(); toast('IA conectada.'); }
    catch (err) { if (err.message !== 'login') { erro.textContent = err.message; erro.hidden = false; } b.disabled = false; }
  });
  async function carregarIas() {
    [S.ias, S.plano] = await Promise.all([api('/api/conta/ias'), api('/api/conta/plano')]);
    desenharIas();
    const p = conectadas()[0]; $('#provBadge').textContent = p ? p.nome.replace(/\s*\(.*\)$/, '') : 'sem IA';
    if (!p) { $('#provBadge').classList.add('warn'); }
  }

  // ---------- meu PC (conexão pela conta) e módulos ----------
  async function sondarPc() {
    const antes = !!S.pc;
    try { const r = await api('/api/ponte/apps'); S.pc = (r.apps || [])[0] || null; } catch { S.pc = null; }
    const b = $('#pcBadge'); b.textContent = S.pc ? (S.pc.nome || 'conectado') : 'desligado'; b.classList.toggle('ok', !!S.pc);
    b.title = S.pc ? `JARVIS ${S.pc.versao} ligado na sua conta` : 'Nenhum JARVIS Desktop ligado na sua conta agora';
    if (antes !== !!S.pc) document.dispatchEvent(new CustomEvent('jarvis:pc', { detail: S.pc }));
  }
  // módulos do PC (editor, mapa…): abrem no app do computador pela conexão da conta
  async function abrirModuloNoPc(modulo, nome) {
    if (!S.pc) { toast('Esse módulo roda no app do PC. Abra o JARVIS no computador e entre com a sua conta: ele aparece em "Meu PC".', 'warn', 8000); mostrarAba('pc'); return false; }
    try { await api('/api/ponte/comando', 'POST', { metodo: 'POST', rota: '/modulo/abrir', corpo: { modulo } }); toast(`Abrindo "${nome}" no seu PC…`); return true; }
    catch (err) { toast(err.message, 'bad', 7000); return false; }
  }
  $$('.modulos-barra a[data-modulo]').forEach((a) => a.addEventListener('click', (e) => { e.preventDefault(); abrirModuloNoPc(a.dataset.modulo, a.textContent.trim()); }));

  // ---------- clima ----------
  async function clima(forcar) {
    const caixa = $('#clima'), cidade = local.get('cidade', '');
    const cab = (st) => el('div', { class: 'tele-cab' }, el('span', { 'data-ic': 'sun' }), el('b', { text: 'Clima' }), st ? el('span', { class: 'tele-st', text: st }) : null);
    if (!cidade) { caixa.replaceChildren(cab(), el('small', { class: 'tele-nota', text: 'Clique aqui e diga a sua cidade.' })); icones(caixa); return; }
    try {
      const c = await api('/api/web/clima?cidade=' + encodeURIComponent(cidade) + (forcar ? '&forcar=1' : ''));
      if (!c.configurado) { caixa.replaceChildren(cab(), el('small', { class: 'tele-nota', text: c.mensagem })); }
      else {
        const n = (v) => (v == null ? '-' : Math.round(v) + '°');
        caixa.replaceChildren(cab(c.cidade.toUpperCase()), el('div', { class: 'tele-clima-corpo' }, el('span', { class: 'tele-clima-ic', 'data-ic': c.icone }), el('b', { class: 'tele-temp', text: n(c.temperatura) }),
          el('span', { class: 'tele-clima-txt' }, el('span', { text: c.descricao }), el('small', { text: `${n(c.minima)} / ${n(c.maxima)} · ${c.umidade ?? '-'}% · ${Math.round(c.vento ?? 0)} km/h` }))));
      }
    } catch (e) { caixa.replaceChildren(cab(), el('small', { class: 'tele-nota', text: e.message })); }
    icones(caixa);
  }
  $('#clima').addEventListener('click', () => {
    const atual = local.get('cidade', '');
    const nova = prompt('Sua cidade (para o clima):', atual || '');
    if (nova == null) return;
    local.set('cidade', nova.trim().slice(0, 80)); clima(true);
  });

  // ---------- configurações (voz e jeito) ----------
  function preencherVozes() {
    const sel = $('#sVoz'); const lista = vozes(); const atual = vozEscolhida();
    sel.replaceChildren(...(lista.length ? lista.map((v) => el('option', { value: v.name, text: `${v.name.replace(/^Microsoft\s+/, '').replace(/\s+Online.*$/, '')} (${v.lang})` })) : [el('option', { value: '', text: 'Sem vozes em português neste navegador' })]));
    if (atual) sel.value = atual.name;
  }
  function desenharModosConfig() {
    $('#sModos').replaceChildren(...S.modos.map((m) => el('button', { type: 'button', class: 'pf-modo' + (m.id === S.modo ? ' on' : ''), onclick: () => escolherModo(m) }, el('b', { text: m.nome }), el('small', { text: m.resumo }), el('q', { text: m.exemplo }))));
  }
  $('#btnSettings').addEventListener('click', () => { preencherVozes(); const v = Number(local.get('vel', 1.05)); $('#sVel').value = v; $('#sVelOut').textContent = v.toFixed(2) + 'x'; desenharModosConfig(); $('#dlgSettings').showModal(); });
  $('#sVoz').addEventListener('change', (e) => local.set('vozNome', e.target.value));
  $('#sVel').addEventListener('input', (e) => { local.set('vel', Number(e.target.value)); $('#sVelOut').textContent = Number(e.target.value).toFixed(2) + 'x'; });
  $('#sTestar').addEventListener('click', () => { const v = S.voz; S.voz = true; falar('Olá! Esta é a voz do JARVIS no navegador.'); S.voz = v; });

  // ---------- para a barra lateral e os painéis (host-web.js) ----------
  window.JARVIS_WEB = {
    pc: () => S.pc, plano: () => S.plano?.plano || 'free', api, toast, falar: (t) => { const v = S.voz; S.voz = true; falar(t); S.voz = v; },
    mostrarAba, abrirConfig: () => $('#btnSettings').click(), abrirModulo: abrirModuloNoPc, sondarPc,
    foco: (on) => { $('#layout').classList.toggle('focus', on); local.set('foco', on); }, emFoco: () => $('#layout').classList.contains('focus'),
    cidade: () => local.get('cidade', ''), ias: () => S.ias,
  };

  function aplicarPreferenciasDaConta(p) {
    if (local.get('modo', null) == null && p.personalidade) S.modo = p.personalidade;
    if (local.get('voz', null) == null && typeof p.falar === 'boolean') S.voz = p.falar;
    if (local.get('continua', null) == null && typeof p.continua === 'boolean') S.continua = p.continua;
    if (!local.get('cidade', '') && p.cidade) local.set('cidade', p.cidade);
    if (local.get('coletiva', null) == null && typeof p.coletiva === 'boolean') local.set('coletiva', p.coletiva);
    if (p.voz) S.vozConta = p.voz;
    sincBotoes();
  }

  // ---------- início ----------
  (async () => {
    iniciarOrb(); animar(); sincBotoes(); estado();
    try {
      const sessao = await api('/api/conta/sessao');
      if (!sessao.logado) { location.href = '../../entrar?volta=/jarvis/app'; return; }
      // configuração inicial da conta (feita no site, um passo por vez, ou no app): o que este navegador ainda não escolheu vem dela
      const pref = await api('/api/conta/preferencias').catch(() => null);
      if (pref && pref.configurado === false) { location.replace('/jarvis/comecar?volta=/jarvis/app'); return; }
      aplicarPreferenciasDaConta(pref?.dados || {});
      if (window.JARVIS_CHIP) $('#contaTopo').replaceWith(window.JARVIS_CHIP(sessao));
      const [, , pers] = await Promise.all([carregarAgentes(), carregarIas(), api('/api/web/personalidades').catch(() => ({ modos: [] }))]);
      S.modos = pers.modos || []; pintarModo();
      sondarPc(); setInterval(sondarPc, 20000); clima(); setInterval(() => clima(), 15 * 60000);
      const a = agente(), h = new Date().getHours(), g = h < 5 ? 'Boa noite' : h < 12 ? 'Bom dia' : h < 18 ? 'Boa tarde' : 'Boa noite';
      legenda(`${g}, ${String(sessao.nome || '').split(' ')[0] || 'tudo certo'}. ${a?.assistente || 'JARVIS'} online. Em que posso ajudar?`);
    } catch (e) { if (e.message !== 'login') toast(e.message, 'bad', 8000); }
    icones(document);
  })();
})();
