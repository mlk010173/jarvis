# `orion/web/paineis/paineis.js`

> **Fonte:** https://assistanceorion.cloud/orion/web/paineis/paineis.js · baixado em 19/10/2026
> 158 linhas · 14.7 KB · Núcleo dos painéis (ORION_PAINEIS.registrar)

```javascript
'use strict';
// cópia de app/public/paineis/paineis.js (scripts/copiar-visual-app.js): edite no app e copie de novo

// Núcleo das telas da barra lateral (app e ORION Web): abre um painel ao lado da barra, com cabeçalho, abas e corpo.
// Cada painel se registra com ORION_PAINEIS.registrar({ id, titulo, sub, ic, abas, precisaPc, render(ctx) }).
// O "host" (app ou web) diz como falar com os dados: api() vai para o app do PC (no site, pela conexão da conta) e
// nuvem() vai para o servidor do ORION. Nada aqui usa innerHTML com dados: tudo é montado com elementos.
(() => {
  if (window.ORION_PAINEIS) return;
  const el = (tag, attrs = {}, ...filhos) => { const e = document.createElement(tag); for (const [k, v] of Object.entries(attrs)) { if (v == null || v === false) continue; if (k === 'class') e.className = v; else if (k === 'text') e.textContent = v; else if (k === 'value') e.value = v; else if (k.startsWith('on')) e.addEventListener(k.slice(2), v); else e.setAttribute(k, v === true ? '' : v); } for (const f of filhos.flat()) if (f != null && f !== false) e.append(f instanceof Node ? f : document.createTextNode(String(f))); return e; };
  const svg = (n) => { try { return window.ORION_ICONES.svg(n); } catch { return el('span'); } };
  const NS = 'http://www.w3.org/2000/svg';
  const sv = (tag, attrs = {}, ...filhos) => { const e = document.createElementNS(NS, tag); for (const [k, v] of Object.entries(attrs)) if (v != null) e.setAttribute(k, v); for (const f of filhos.flat()) if (f != null) e.append(f instanceof Node ? f : document.createTextNode(String(f))); return e; };

  // ---------- formatação ----------
  const reais = (c, sinal) => { const v = (Number(c) || 0) / 100; const t = Math.abs(v).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }); return (v < 0 ? '- ' : sinal && v > 0 ? '+ ' : '') + t; };
  const num = (n) => (Number(n) || 0).toLocaleString('pt-BR');
  const data = (d) => { if (!d) return '—'; const [y, m, dd] = String(d).slice(0, 10).split('-'); return `${dd}/${m}/${y}`; };
  const dataHora = (iso) => (iso ? new Date(iso).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' }) : '—');
  const relativo = (iso) => { const s = (Date.now() - new Date(iso).getTime()) / 1000; if (!Number.isFinite(s)) return '—'; if (s < 60) return 'agora'; if (s < 3600) return `há ${Math.floor(s / 60)} min`; if (s < 86400) return `há ${Math.floor(s / 3600)} h`; return `há ${Math.floor(s / 86400)} d`; };
  const minutos = (m) => { m = Math.round(Number(m) || 0); if (m < 60) return m + ' min'; const h = Math.floor(m / 60), r = m % 60; return r ? `${h} h ${r} min` : `${h} h`; };
  const hojeISO = () => { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`; };
  const mesAtual = () => hojeISO().slice(0, 7);
  const nomeMes = (m) => { const [y, mm] = String(m).split('-').map(Number); return new Date(y, mm - 1, 1).toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' }).replace(/^\w/, (c) => c.toUpperCase()); };

  // ---------- peças visuais ----------
  const pill = (texto, tipo = '') => el('span', { class: 'pn-pill' + (tipo ? ' ' + tipo : ''), text: texto });
  const kpi = (rotulo, valor, detalhe, ic, tipo = '') => el('div', { class: 'pn-kpi' + (tipo ? ' ' + tipo : '') }, el('small', {}, ic ? svg(ic) : null, rotulo), el('b', { text: valor }), detalhe ? el('span', { text: detalhe }) : null);
  function caixa(titulo, ic, opcoes = {}, ...conteudo) {
    return el('section', { class: 'pn-caixa' + (opcoes.classe ? ' ' + opcoes.classe : '') },
      el('header', {}, el('h3', {}, ic ? svg(ic) : null, titulo), opcoes.acoes ? el('div', { class: 'pn-dir' }, opcoes.acoes) : null, opcoes.sub ? el('p', { text: opcoes.sub }) : null), ...conteudo);
  }
  const linha = ({ ic, titulo, sub, fim, classe, onclick }) => el('div', { class: 'pn-linha' + (classe ? ' ' + classe : ''), onclick: onclick || null, role: onclick ? 'button' : null, tabindex: onclick ? '0' : null }, el('span', { class: 'pn-ic' }, svg(ic || 'info')), el('div', { class: 'pn-meio' }, el('b', { text: titulo }), sub ? el('small', { text: sub }) : null), el('div', { class: 'pn-fim' }, fim || null));
  const btn = (texto, opcoes = {}) => el('button', { type: 'button', class: 'pn-btn' + (opcoes.pri ? ' pri' : '') + (opcoes.perigo ? ' perigo' : '') + (opcoes.peq ? ' peq' : '') + (!texto ? ' so-ic' : ''), title: opcoes.titulo || null, 'aria-label': !texto ? opcoes.titulo : null, disabled: opcoes.desligado || null, onclick: opcoes.onclick || null }, opcoes.ic ? svg(opcoes.ic) : null, texto || null);
  function vazio(ic, titulo, texto, ...acoes) { return el('div', { class: 'pn-vazio' }, el('div', { class: 'pn-vazio-ic' }, svg(ic)), el('h2', { text: titulo }), texto ? el('p', { text: texto }) : null, acoes.length ? el('div', { class: 'pn-acoes' }, acoes) : null); }
  const carregando = (n = 3) => el('div', { class: 'pn-carregando', 'aria-label': 'Carregando' }, Array.from({ length: n }, () => el('i')));
  function chave(rotulo, ligado, aoMudar) { const i = el('input', { type: 'checkbox' }); i.checked = !!ligado; i.addEventListener('change', () => aoMudar(i.checked, i)); return el('label', { class: 'pn-chave' }, i, el('i'), el('span', { text: rotulo })); }
  function campo(rotulo, input, classe) { return el('label', { class: classe || null }, el('span', { text: rotulo }), input); }
  function busca(placeholder, aoBuscar) { const i = el('input', { type: 'search', placeholder, 'aria-label': placeholder }); let t = 0; i.addEventListener('input', () => { clearTimeout(t); t = setTimeout(() => aoBuscar(i.value.trim()), 250); }); return el('div', { class: 'pn-busca' }, svg('search'), i); }

  // barras horizontais (gastos por categoria, apps mais usados…)
  function barras(itens, fmt = (v) => v) {
    const max = Math.max(1, ...itens.map((x) => x.valor));
    return el('div', { class: 'pn-barras' }, itens.map((x) => el('div', { class: 'pn-barra' }, el('span', { text: x.nome, title: x.nome }), el('div', { class: 'trilho' }, el('i', { style: `width:${Math.max(2, (x.valor / max) * 100).toFixed(1)}%` })), el('b', { class: 'pn-valor', text: fmt(x.valor) }))));
  }
  // colunas (por hora, por mês) com duas séries opcionais
  function colunas(serie, opcoes = {}) {
    const W = 640, H = opcoes.altura || 180, m = { t: 12, r: 8, b: 24, l: 8 };
    const chaves = opcoes.chaves || ['valor'], cores = opcoes.cores || ['#2E9BFF', '#ff5c7a'];
    const max = Math.max(1, ...serie.flatMap((s) => chaves.map((k) => Number(s[k]) || 0)));
    if (!serie.some((s) => chaves.some((k) => Number(s[k]) > 0))) return el('div', { class: 'pn-graf-vazio', text: opcoes.vazio || 'Sem dados neste período ainda.' });
    const iw = W - m.l - m.r, ih = H - m.t - m.b, col = iw / serie.length, bw = Math.max(2, Math.min(28, (col * 0.7) / chaves.length));
    const g = sv('svg', { class: 'pn-graf', viewBox: `0 0 ${W} ${H}`, role: 'img', 'aria-label': opcoes.rotulo || 'Gráfico' });
    for (let k = 1; k <= 3; k++) { const y = m.t + ih - (ih * k) / 3; g.append(sv('line', { class: 'grade', x1: m.l, x2: W - m.r, y1: y, y2: y })); }
    serie.forEach((s, i) => {
      chaves.forEach((k, j) => {
        const v = Number(s[k]) || 0, h = (v / max) * ih, x = m.l + i * col + (col - bw * chaves.length) / 2 + j * bw;
        const r = sv('rect', { x: x.toFixed(1), y: (m.t + ih - h).toFixed(1), width: (bw - 1).toFixed(1), height: Math.max(v ? 2 : 0, h).toFixed(1), rx: Math.min(4, bw / 3), fill: cores[j] });
        r.append(sv('title', {}, `${s.rotulo}: ${opcoes.fmt ? opcoes.fmt(v, k) : v}`));
        g.append(r);
      });
      if (!opcoes.saltoRotulo || i % opcoes.saltoRotulo === 0) g.append(sv('text', { class: 'eixo', x: (m.l + i * col + col / 2).toFixed(1), y: H - 6, 'text-anchor': 'middle' }, s.rotulo));
    });
    return g;
  }
  const anel = (rotulo, pct, txt) => { const p = Math.max(0, Math.min(100, Number(pct) || 0)); return el('div', { class: 'pn-anel-rot' }, el('div', { class: 'pn-anel' + (p >= 90 ? ' quente' : p >= 75 ? ' morno' : ''), style: `--p:${p}` }, el('b', { text: txt || Math.round(p) + '%' })), el('span', { text: rotulo })); };

  // janela por cima (detalhes, formulários)
  const modal = el('div', { class: 'pn-modal', hidden: true, role: 'dialog', 'aria-modal': 'true', 'data-sem-icone': true });
  modal.addEventListener('click', (e) => { if (e.target === modal) fecharModal(); });
  function abrirModal(titulo, ...conteudo) {
    if (!modal.isConnected) document.body.append(modal);
    modal.replaceChildren(el('div', { class: 'pn-modal-caixa' }, el('header', {}, el('h2', { text: titulo }), btn('', { ic: 'x', titulo: 'Fechar', onclick: fecharModal })), ...conteudo));
    modal.hidden = false;
    setTimeout(() => modal.querySelector('input, select, textarea, button')?.focus(), 30);
  }
  function fecharModal() { modal.hidden = true; modal.replaceChildren(); }
  const confirmar = (texto) => window.confirm(texto);

  // avisos que sobem no canto (lembretes de bem-estar, faturas…)
  const avisosBox = el('div', { class: 'pn-avisos', 'aria-live': 'polite', 'data-sem-icone': true });
  function aviso({ titulo = 'ORION', texto, ic = 'bell', ms = 12000 }) {
    if (!avisosBox.isConnected) document.body.append(avisosBox);
    const a = el('div', { class: 'pn-aviso', role: 'status' }, el('span', { class: 'pn-ic' }, svg(ic)), el('div', {}, el('b', { text: titulo }), el('p', { text: texto })), el('button', { type: 'button', title: 'Fechar', 'aria-label': 'Fechar aviso', onclick: () => a.remove() }, '×'));
    avisosBox.append(a); setTimeout(() => a.remove(), ms);
  }

  // ---------- palco e roteamento ----------
  const PAINEIS = new Map();
  let host = { tipo: 'app', api: async () => { throw new Error('sem host'); }, nuvem: async () => { throw new Error('sem host'); }, pc: () => ({ disponivel: true }), toast: () => {}, contar: () => {}, falar: () => {}, aoFechar: () => {} };
  const icCab = el('span', { class: 'pn-cab-ic' }), tit = el('h1'), sub = el('p'), acoesCab = el('div', { class: 'pn-cab-acoes' }), abasBox = el('div', { class: 'pn-abas', role: 'tablist' });
  const corpo = el('div', { class: 'pn-corpo' });
  const palco = el('section', { class: 'pn-palco', hidden: true, 'aria-live': 'polite', 'data-sem-icone': true }, el('header', { class: 'pn-cab' }, icCab, el('div', { class: 'pn-cab-txt' }, tit, sub), acoesCab, abasBox), corpo);
  let atual = null, geracao = 0;

  function posicionar() { try { const t = host.topo?.(); if (Number.isFinite(t)) palco.style.top = t + 'px'; } catch { /* usa o CSS */ } }
  addEventListener('resize', posicionar);

  function registrar(p) { PAINEIS.set(p.id, p); }
  function configurar(h) { host = { ...host, ...h }; }

  async function abrir(id, aba, opcoes = {}) {
    const p = PAINEIS.get(id); if (!p) return false;
    if (!palco.isConnected) document.body.append(palco);
    const mudou = !atual || atual.id !== id;
    const abaOk = p.abas?.some((a) => a.id === aba) ? aba : (atual?.id === id && atual.aba ? atual.aba : p.abas?.[0]?.id || null);
    atual = { id, aba: abaOk };
    posicionar();
    icCab.replaceChildren(svg(p.ic)); tit.textContent = p.titulo; sub.textContent = p.sub || '';
    abasBox.hidden = !p.abas?.length;
    abasBox.replaceChildren(...(p.abas || []).map((a) => el('button', { type: 'button', role: 'tab', class: 'pn-aba' + (a.id === abaOk ? ' on' : ''), 'aria-selected': String(a.id === abaOk), onclick: () => { abrir(id, a.id); window.ORION_NAV?.marcar(id, a.id); } }, a.ic ? svg(a.ic) : null, a.nome)));
    acoesCab.replaceChildren(btn('', { ic: 'refresh', titulo: 'Atualizar', onclick: () => abrir(id, atual.aba) }), btn(host.tipo === 'web' ? 'Voltar ao chat' : 'Voltar ao painel', { ic: 'chat', onclick: () => fechar() }));
    if (palco.hidden || mudou) { palco.hidden = false; palco.classList.remove('entra'); void palco.offsetWidth; palco.classList.add('entra'); }
    document.body.classList.add('com-painel');
    if (mudou) try { host.contar('pagina:' + id); } catch { /* contador nunca atrapalha */ }
    const g = ++geracao, rolagem = corpo.scrollTop;
    if (!opcoes.silencioso) { corpo.replaceChildren(carregando()); corpo.scrollTop = 0; }
    const pcSt = host.pc();
    if (p.precisaPc && !pcSt.disponivel) { corpo.replaceChildren(semPc(pcSt, () => abrir(id, abaOk))); return true; }
    const ctx = {
      corpo: el('div'), aba: abaOk, host, util: U,
      api: (c, o) => host.api(c, o), nuvem: (c, o) => host.nuvem(c, o), toast: (t, tipo) => host.toast(t, tipo),
      recarregar: () => { if (atual?.id === id) abrir(id, atual.aba); },
      atualizar: () => { if (atual?.id === id) abrir(id, atual.aba, { silencioso: true }); }, // sem piscar (dados ao vivo)
      trocarAba: (a) => { abrir(id, a); window.ORION_NAV?.marcar(id, a); },
      acoes: (...b) => acoesCab.prepend(...b.flat().filter(Boolean)),
      vivo: () => g === geracao && atual?.id === id,
    };
    { const c = ctx.corpo, add = Element.prototype.append; c.append = (...n) => add.apply(c, n.flat().filter((x) => x != null && x !== false)); } // blocos opcionais (null) não viram texto
    try {
      await p.render(ctx);
      if (g !== geracao) return true;
      corpo.replaceChildren(ctx.corpo);
      if (opcoes.silencioso) corpo.scrollTop = rolagem;
    } catch (e) {
      if (g !== geracao) return true;
      corpo.replaceChildren(vazio('alert', 'Não deu para carregar agora', e.message || String(e), btn('Tentar de novo', { ic: 'refresh', pri: true, onclick: () => abrir(id, abaOk) })));
    }
    try { window.ORION_ICONES?.montar(corpo); } catch { /* sem ícones */ }
    return true;
  }
  function semPc(st, tentar) {
    return vazio('monitor', 'Abra o ORION no seu PC', st.motivo || 'Esta tela mostra dados que ficam só no seu computador. Abra o app do ORION no PC e entre com a mesma conta: em poucos segundos ela aparece aqui também.',
      el('a', { class: 'pn-btn pri', href: '/orion/conta#baixar' }, svg('download'), 'Baixar o app para PC'), btn('Tentar de novo', { ic: 'refresh', onclick: tentar }));
  }
  function fechar() {
    if (palco.hidden) return;
    palco.hidden = true; atual = null; geracao++;
    document.body.classList.remove('com-painel');
    fecharModal();
    try { host.aoFechar(); } catch { /* ok */ }
  }

  const U = { el, svg, sv, reais, num, data, dataHora, relativo, minutos, hojeISO, mesAtual, nomeMes, pill, kpi, caixa, linha, btn, vazio, carregando, chave, campo, busca, barras, colunas, anel, abrirModal, fecharModal, confirmar, aviso };
  addEventListener('keydown', (e) => { if (e.key === 'Escape' && !modal.hidden) fecharModal(); });
  window.ORION_PAINEIS = { registrar, configurar, abrir, fechar, host: () => host, atual: () => (atual ? { ...atual } : null), aberto: () => !palco.hidden, util: U, existe: (id) => PAINEIS.has(id) };
})();

```
