'use strict';
// Página de Novidades: lê /api/novidades (gerado das notas do changelog) e monta a linha do tempo das versões.
// A versão mais nova vem aberta; as anteriores ficam recolhidas. Sem innerHTML com dados.
(() => {
  const lista = document.getElementById('nv-lista');
  if (!lista) return;
  const el = (tag, attrs = {}, ...filhos) => { const e = document.createElement(tag); for (const [k, v] of Object.entries(attrs)) { if (k === 'class') e.className = v; else if (k === 'text') e.textContent = v; else e.setAttribute(k, v); } for (const f of filhos) if (f != null) e.append(f); return e; };

  function versao(v, aberta, atual) {
    const d = el('details', { class: 'nv-versao' + (atual ? ' nv-atual' : ''), id: 'v' + v.versao.replace(/\./g, '-') });
    if (aberta) d.open = true;
    d.append(el('summary', {},
      el('span', { class: 'nv-marca', 'aria-hidden': 'true' }),
      el('span', { class: 'nv-cab' }, el('b', { text: 'JARVIS ' + v.versao }), atual ? el('span', { class: 'badge badge-blue', text: 'versão atual' }) : null, el('span', { class: 'nv-data', text: v.data || '' })),
      v.resumo ? el('span', { class: 'nv-resumo', text: v.resumo }) : null));
    const corpo = el('div', { class: 'nv-corpo' });
    for (const s of v.secoes || []) {
      corpo.append(el('section', { class: 'nv-secao' }, el('h3', { text: s.titulo }), el('ul', {}, ...(s.itens || []).map((t) => el('li', { text: t })))));
    }
    d.append(corpo);
    return d;
  }

  fetch('/api/novidades', { cache: 'no-cache' }).then((r) => r.json()).then((j) => {
    const vs = j.versoes || [];
    if (!vs.length) { lista.replaceChildren(el('p', { class: 'hint', text: 'Ainda não há notas de versão publicadas.' })); return; }
    lista.replaceChildren(...vs.map((v, i) => versao(v, i === 0 || location.hash === '#v' + v.versao.replace(/\./g, '-'), v.versao === j.atual)));
    try { localStorage.setItem('jarvis.novidades.vista', j.atual || vs[0].versao); } catch { /* sem armazenamento */ }
    if (location.hash) document.querySelector(location.hash)?.scrollIntoView({ block: 'start' });
  }).catch(() => lista.replaceChildren(el('p', { class: 'alert alert-warn', text: 'Não consegui carregar as novidades agora. Recarregue a página em instantes.' })));
})();
