'use strict';
// cópia de app/public/paineis/nav-lateral.js (scripts/copiar-visual-app.js): edite no app e copie de novo

// Barra lateral do JARVIS (app e JARVIS Web): grupos que recolhem, itens com ícone, título e descrição, submenus,
// selos (ex.: faturas atrasadas) e modo só-ícones (passar o mouse abre por cima). O que cada item faz é o "host" que decide
// (app: janela do PC; web: navegador), pela função aoEscolher(id, aba).
(() => {
  if (window.JARVIS_NAV) return;
  const el = (tag, attrs = {}, ...filhos) => { const e = document.createElement(tag); for (const [k, v] of Object.entries(attrs)) { if (v == null || v === false) continue; if (k === 'class') e.className = v; else if (k === 'text') e.textContent = v; else if (k.startsWith('on')) e.addEventListener(k.slice(2), v); else e.setAttribute(k, v === true ? '' : v); } for (const f of filhos.flat()) if (f != null && f !== false) e.append(f instanceof Node ? f : document.createTextNode(String(f))); return e; };
  const svg = (n) => { try { return window.JARVIS_ICONES.svg(n); } catch { return el('span'); } };
  const local = { get: (k, p) => { try { const v = localStorage.getItem('jarvis.nav.' + k); return v == null ? p : JSON.parse(v); } catch { return p; } }, set: (k, v) => { try { localStorage.setItem('jarvis.nav.' + k, JSON.stringify(v)); } catch { /* fica só nesta sessão */ } } };
  const LOGO = '<svg viewBox="0 0 48 48" aria-hidden="true"><defs><linearGradient id="latLogoG" x1="6" y1="6" x2="42" y2="42" gradientUnits="userSpaceOnUse"><stop offset="0" stop-color="#2E9BFF"/><stop offset="1" stop-color="#00D2FF"/></linearGradient></defs><path d="M40.91 17.84A18 18 0 1 0 40.91 30.16" fill="none" stroke="url(#latLogoG)" stroke-width="3" stroke-linecap="round"/><path d="M24 10.5C25.1 19 29 22.9 37.5 24C29 25.1 25.1 29 24 37.5C22.9 29 19 25.1 10.5 24C19 22.9 22.9 19 24 10.5Z" fill="url(#latLogoG)"/><circle cx="41.6" cy="24" r="2.4" fill="#00D2FF"/></svg>';

  let cfg = null, raiz = null, atual = { id: null, aba: null };
  const botoes = new Map(), filhosDe = new Map(), selos = new Map();

  function montar(opcoes) {
    cfg = opcoes;
    const fechados = new Set(local.get('fechados', []));
    const abertos = new Set(local.get('submenus', []));
    const logo = el('div', { class: 'lat-logo' }); logo.innerHTML = LOGO; // SVG fixo deste arquivo
    const vivo = el('span', { class: 'lat-vivo', title: 'JARVIS online', 'aria-hidden': 'true' });
    const rol = el('nav', { class: 'lat-rol', 'aria-label': 'Navegação do JARVIS' });
    for (const g of opcoes.grupos) {
      const itensBox = el('div', { class: 'lat-grupo-itens', id: 'latg-' + g.id });
      const cab = el('button', { type: 'button', class: 'lat-grupo-cab', 'aria-expanded': String(!fechados.has(g.id)), 'aria-controls': 'latg-' + g.id }, el('span', { text: g.nome }), (() => { const s = svg('chevron'); s.classList.add('lat-seta'); return s; })());
      const grupo = el('section', { class: 'lat-grupo' + (fechados.has(g.id) ? ' fechado' : ''), 'data-grupo': g.id, hidden: g.oculto || null }, cab, itensBox); // oculto: aparece só quando o host liberar (ex.: área do dono)
      cab.addEventListener('click', () => { const fechar = !grupo.classList.contains('fechado'); grupo.classList.toggle('fechado', fechar); cab.setAttribute('aria-expanded', String(!fechar)); const f = new Set(local.get('fechados', [])); if (fechar) f.add(g.id); else f.delete(g.id); local.set('fechados', [...f]); });
      for (const it of g.itens) {
        const temFilhos = Array.isArray(it.filhos) && it.filhos.length;
        const fim = el('span', { class: 'lat-fim' });
        const selo = el('span', { class: 'lat-selo', hidden: true }); fim.append(selo); selos.set(it.id, selo);
        if (temFilhos) { const s = svg('chevron'); s.classList.add('lat-seta'); fim.append(s); }
        const b = el(it.href ? 'a' : 'button', { class: 'lat-item' + (it.classe ? ' ' + it.classe : ''), type: it.href ? null : 'button', href: it.href || null, 'data-id': it.id, title: it.nome + (it.sub ? ' · ' + it.sub : ''), 'aria-expanded': temFilhos ? String(abertos.has(it.id)) : null },
          el('span', { class: 'lat-ic' }, svg(it.ic || 'info')), el('span', { class: 'lat-txt' }, el('b', { text: it.nome }), it.sub ? el('small', { text: it.sub }) : null), fim);
        botoes.set(it.id, b);
        itensBox.append(b);
        if (temFilhos) {
          const lista = el('div', { class: 'lat-filhos', hidden: !abertos.has(it.id), role: 'group', 'aria-label': it.nome });
          for (const f of it.filhos) {
            const fs = el('span', { class: 'lat-selo', hidden: true }); selos.set(it.id + ':' + f.id, fs);
            const fb = el('button', { type: 'button', class: 'lat-filho', 'data-pai': it.id, 'data-aba': f.id }, el('span', { text: f.nome }), fs);
            fb.addEventListener('click', () => escolher(it.id, f.id));
            lista.append(fb);
          }
          filhosDe.set(it.id, lista);
          itensBox.append(lista);
        }
        b.addEventListener('click', (e) => {
          if (it.href && (e.ctrlKey || e.metaKey)) return;
          if (it.href) e.preventDefault();
          if (temFilhos) {
            const lista = filhosDe.get(it.id), abrir = lista.hidden;
            lista.hidden = !abrir; b.setAttribute('aria-expanded', String(abrir));
            const s = new Set(local.get('submenus', [])); if (abrir) s.add(it.id); else s.delete(it.id); local.set('submenus', [...s]);
            if (abrir || atual.id !== it.id) escolher(it.id, atual.id === it.id ? atual.aba : it.filhos[0].id);
            return;
          }
          escolher(it.id, null);
        });
      }
      rol.append(grupo);
    }
    const recolher = el('button', { type: 'button', class: 'lat-recolher', title: 'Recolher ou abrir a barra', 'aria-label': 'Recolher ou abrir a barra lateral' }, svg('sidebar'));
    recolher.addEventListener('click', () => definirRecolhida(!document.body.classList.contains('lat-recolhida'), true));
    const ajuda = el('div', { class: 'lat-ajuda' }, (opcoes.ajuda || []).map((a) => el('a', { href: a.href, target: '_blank', rel: 'noopener', title: a.titulo || a.nome }, svg(a.ic), a.nome)));
    const versao = el('span', { class: 'lat-ver', text: opcoes.versao || '' });
    raiz = el('aside', { class: 'lat', 'aria-label': 'Barra lateral do JARVIS', 'data-sem-icone': true },
      el('div', { class: 'lat-topo' }, logo, el('div', { class: 'lat-marca' }, el('b', { text: opcoes.marca?.nome || 'JARVIS' }), el('small', { text: opcoes.marca?.sub || 'Assistente pessoal de IA' })), vivo),
      rol,
      el('div', { class: 'lat-pe' }, ajuda, el('div', { class: 'lat-pe-linha' }, recolher, versao)));
    document.body.prepend(raiz);
    document.body.classList.add('com-lateral');
    const salva = local.get('recolhida', null);
    document.body.classList.toggle('lat-recolhida', !!(salva == null ? innerWidth < 1180 : salva));
    dispatchEvent(new Event('resize')); // a barra entrou: o anel de energia e o palco dos painéis se ajustam
    addEventListener('resize', () => { if (local.get('recolhida', null) == null) definirRecolhida(innerWidth < 1180, false); });
    return raiz;
  }

  // só avisa (resize) quando a barra muda de fato: o ouvinte de resize acima chama esta função, e o resize sintético
  // de recolher-paineis.js também chega nele; avisar sempre virava recursão infinita sem preferência salva
  function definirRecolhida(sim, guardar) {
    if (guardar) local.set('recolhida', !!sim);
    if (document.body.classList.contains('lat-recolhida') === !!sim) return;
    document.body.classList.toggle('lat-recolhida', !!sim);
    dispatchEvent(new Event('resize'));
  }

  function escolher(id, aba) {
    if (!cfg) return;
    const r = cfg.aoEscolher?.(id, aba);
    if (r !== false) marcar(id, aba);
  }

  // destaca o item (e a aba do submenu) sem executar nada
  function marcar(id, aba = null) {
    atual = { id, aba };
    for (const [k, b] of botoes) b.classList.toggle('on', k === id);
    for (const [pai, lista] of filhosDe) lista.querySelectorAll('.lat-filho').forEach((f) => f.classList.toggle('on', pai === id && f.dataset.aba === aba));
    if (id && aba && filhosDe.has(id) && filhosDe.get(id).hidden) { filhosDe.get(id).hidden = false; botoes.get(id)?.setAttribute('aria-expanded', 'true'); }
  }

  // selo com número ou texto curto ao lado do item (null = some); tipo: '' (vermelho), 'aviso', 'info'
  function selo(id, valor, tipo = '') {
    const s = selos.get(id); if (!s) return;
    if (valor == null || valor === 0 || valor === '') { s.hidden = true; return; }
    s.hidden = false; s.textContent = String(valor); s.className = 'lat-selo' + (tipo ? ' ' + tipo : '');
  }
  const online = (sim) => raiz?.querySelector('.lat-vivo')?.classList.toggle('off', !sim);
  const versao = (t) => { const v = raiz?.querySelector('.lat-ver'); if (v) v.textContent = t; };

  // mostra ou esconde um grupo inteiro (ex.: "Dono do JARVIS" só para a conta do dono)
  const mostrarGrupo = (id, sim) => { const g = raiz?.querySelector(`.lat-grupo[data-grupo="${id}"]`); if (g) g.hidden = !sim; };
  window.JARVIS_NAV = { montar, marcar, selo, online, versao, mostrarGrupo, recolher: definirRecolhida, atual: () => ({ ...atual }) };
})();
