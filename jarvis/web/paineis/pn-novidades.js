'use strict';
// cópia de app/public/paineis/pn-novidades.js (scripts/copiar-visual-app.js): edite no app e copie de novo
// Novidades: o que mudou em cada versão (as mesmas notas do changelog do cofre do JARVIS, que o bot também publica no Discord).
// Quando a versão muda, aparece uma faixa clara no topo uma vez ("JARVIS 1.8 chegou") com o atalho para a lista completa.
(() => {
  const P = window.JARVIS_PAINEIS; if (!P) return;
  const { el, svg, caixa, btn, pill } = P.util;
  const CHAVE = 'jarvis.novidades.vista';
  const vista = () => { try { return localStorage.getItem(CHAVE); } catch { return null; } };
  const marcarVista = (v) => { try { if (v) localStorage.setItem(CHAVE, v); } catch { /* ok */ } window.JARVIS_NAV?.selo('novidades', null); faixa?.remove(); };
  let faixa = null;

  async function render(ctx) {
    const d = await ctx.host.novidades();
    if (!d?.versoes?.length) { ctx.corpo.append(P.util.vazio('sparkles', 'Sem novidades ainda', 'As melhorias de cada versão aparecem aqui.')); return; }
    ctx.corpo.append(...d.versoes.map((v, i) => caixa(`Versão ${v.versao}`, i ? 'clock' : 'sparkles', { sub: [v.data, v.resumo].filter(Boolean).join(' · '), acoes: i === 0 ? pill('Atual', 'ok') : null },
      el('div', { class: 'pn-nov-secoes' }, v.secoes.map((s) => el('section', { class: 'pn-nov-sec' }, el('b', { text: s.titulo }), el('ul', {}, s.itens.map((t) => el('li', { text: t })))))))));
    marcarVista(d.atual);
  }
  P.registrar({ id: 'novidades', titulo: 'Novidades', sub: 'O que mudou em cada versão do JARVIS', ic: 'sparkles', precisaPc: false, render });

  async function avisar() {
    const host = P.host?.(); if (!host?.novidades) return;
    let d; try { d = await host.novidades(); } catch { return; }
    if (!d?.atual || vista() === d.atual) return;
    window.JARVIS_NAV?.selo('novidades', 'Novo', 'info');
    const v = d.versoes[0];
    faixa = el('div', { class: 'pn-faixa-nov', role: 'status', 'data-sem-icone': true },
      el('span', { class: 'pn-ic' }, svg('sparkles')),
      el('div', {}, el('b', { text: `JARVIS ${v.versao} chegou` }), el('span', { text: v.resumo || 'Veja o que mudou nesta versão.' })),
      btn('Ver novidades', { pri: true, peq: true, onclick: () => { P.abrir('novidades'); window.JARVIS_NAV?.marcar('novidades'); marcarVista(d.atual); } }),
      el('button', { type: 'button', class: 'pn-faixa-x', 'aria-label': 'Fechar aviso', title: 'Fechar', onclick: () => marcarVista(d.atual) }, '×'));
    document.body.append(faixa);
  }
  // no app, espera o "Iniciar sistema" (na tela de início a faixa ficava solta por cima); no JARVIS Web não há essa tela
  const telaDeInicio = () => { const b = document.getElementById('boot'); return !!b && getComputedStyle(b).display !== 'none' && !b.classList.contains('hide') && !b.classList.contains('oculto'); };
  if (telaDeInicio()) document.addEventListener('jarvis:iniciado', () => setTimeout(avisar, 3500), { once: true });
  else setTimeout(avisar, 3500);
})();
