'use strict';
// Conta no topo do site: avatar + e-mail da conta + selo do plano (Free / Basic / Premium). Some quando ninguém está conectado.
// JARVIS_CHIP(sessao) monta o elemento; nas páginas com .shell-top ele entra sozinho nas ações do topo.
(() => {
  const el = (tag, attrs = {}, ...filhos) => { const e = document.createElement(tag); for (const [k, v] of Object.entries(attrs)) { if (v == null || v === false) continue; if (k === 'class') e.className = v; else if (k === 'text') e.textContent = v; else if (k.startsWith('on')) e.addEventListener(k.slice(2), v); else e.setAttribute(k, v === true ? '' : v); } for (const f of filhos.flat()) if (f != null && f !== false) e.append(f instanceof Node ? f : document.createTextNode(String(f))); return e; };
  const hue = (s) => { let h = 7; for (const c of String(s || '')) h = (h * 31 + c.charCodeAt(0)) % 360; return h; };
  function chip(s, opcoes = {}) {
    const plano = String(s.plano || 'free').toLowerCase();
    const nomePlano = opcoes.selo || s.plano_nome || 'Free';
    const a = el('a', { class: 'conta-chip-web', href: opcoes.href || 'conta.html', title: `Conectado como ${s.email} · plano ${nomePlano}`, 'data-plano': opcoes.selo ? 'papel' : plano, style: `--h:${hue(s.email)}` },
      el('span', { class: 'ccw-av', 'aria-hidden': 'true', text: String(s.nome || s.email || '?').trim().charAt(0).toUpperCase() }),
      el('span', { class: 'ccw-email', text: s.email }),
      el('span', { class: 'ccw-plano', text: nomePlano }));
    return a;
  }
  window.JARVIS_CHIP = chip;
  const acoes = document.querySelector('.shell-top .top-actions');
  if (!acoes || acoes.dataset.semChip !== undefined) return;
  fetch('/api/conta/sessao', { credentials: 'same-origin' }).then((r) => r.json()).then((s) => { if (s.logado) acoes.prepend(chip(s)); }).catch(() => {});
})();
