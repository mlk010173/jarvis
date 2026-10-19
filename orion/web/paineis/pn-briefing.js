'use strict';
// cópia de app/public/paineis/pn-briefing.js (scripts/copiar-visual-app.js): edite no app e copie de novo

// Painel Briefing (usado no ORION Web; no app, o item abre o briefing falado da janela): clima da sua cidade e as manchetes
// do momento, com foto, resumo e "Ouvir o briefing" na voz do ORION.
(() => {
  const P = window.ORION_PAINEIS; if (!P) return;
  const { el, svg, caixa, btn, vazio, relativo } = P.util;

  async function render(ctx) {
    const [n, c] = await Promise.all([ctx.host.briefing(), ctx.host.clima().catch(() => null)]);
    const itens = n.itens || [];
    const hora = new Date().getHours(), saud = hora < 12 ? 'Bom dia' : hora < 18 ? 'Boa tarde' : 'Boa noite';
    const ouvir = () => ctx.host.falar(`${saud}. ${c?.configurado ? `Em ${c.cidade}, ${Math.round(c.temperatura)} graus, ${c.descricao}. ` : ''}Estas são as principais notícias de agora. ` + itens.slice(0, 6).map((x, i) => `${i + 1}. ${x.titulo}.`).join(' '));
    ctx.acoes(btn('Ouvir o briefing', { ic: 'volume', pri: true, onclick: ouvir }));
    const capa = itens[0];
    ctx.corpo.append(
      el('div', { class: 'pn-grade duas' },
        c?.configurado ? el('div', { class: 'pn-kpi' }, el('small', {}, svg('sun'), 'Clima em ' + c.cidade), el('b', { text: Math.round(c.temperatura) + '°' }), el('span', { text: `${c.descricao} · mín. ${Math.round(c.minima)}° · máx. ${Math.round(c.maxima)}° · umidade ${c.umidade ?? '-'}%` }))
          : el('div', { class: 'pn-kpi' }, el('small', {}, svg('sun'), 'Clima'), el('b', { text: '—' }), el('span', { text: c?.mensagem || 'Diga a sua cidade no painel de clima da tela do chat.' })),
        el('div', { class: 'pn-kpi' }, el('small', {}, svg('newspaper'), 'Manchetes'), el('b', { text: String(itens.length) }), el('span', { text: `de ${(n.fontes || []).join(', ')} · ${n.em ? 'atualizado ' + relativo(n.em) : ''}` }))),
      capa ? el('a', { class: 'pn-caixa', href: capa.link, target: '_blank', rel: 'noopener noreferrer', style: 'display:grid;grid-template-columns:minmax(0,1fr) minmax(0,1.3fr);gap:18px;text-decoration:none;color:inherit;align-items:center' },
        capa.imagem && ctx.host.imagensExternas !== false ? el('img', { src: capa.imagem, alt: '', loading: 'lazy', referrerpolicy: 'no-referrer', style: 'width:100%;aspect-ratio:16/9;object-fit:cover;border-radius:12px;background:#02070e' }) : el('div', { style: 'aspect-ratio:16/9;border-radius:12px;background:radial-gradient(circle at 30% 30%,rgba(46,155,255,.4),#000 70%)' }),
        el('div', {}, el('small', { class: 'pn-nota', text: capa.fonte + (capa.quando ? ' · ' + relativo(new Date(capa.quando).toISOString()) : '') }), el('h2', { style: 'margin:6px 0 8px;font-size:20px;line-height:1.25;color:#fff', text: capa.titulo }), capa.resumo ? el('p', { class: 'pn-nota', style: 'font-size:13.5px', text: capa.resumo }) : null)) : null,
      itens.length > 1 ? caixa('Mais notícias', 'newspaper', {}, el('div', { class: 'pn-linhas' }, itens.slice(1).map((x) => el('a', { class: 'pn-linha', href: x.link, target: '_blank', rel: 'noopener noreferrer', style: 'text-decoration:none;color:inherit' }, el('span', { class: 'pn-ic' }, svg('newspaper')), el('div', { class: 'pn-meio' }, el('b', { text: x.titulo }), el('small', { text: x.resumo || x.fonte })), el('div', { class: 'pn-fim' }, el('small', { class: 'pn-nota', text: x.fonte })))))) : null,
      !itens.length ? vazio('newspaper', 'Sem notícias agora', 'As fontes não responderam. Tente de novo em alguns minutos.') : null,
      el('p', { class: 'pn-nota', style: 'margin-top:14px', text: 'Manchetes públicas de veículos brasileiros. Agenda e e-mails ainda não entram no briefing: virão com a conexão com o Google.' }));
  }

  P.registrar({ id: 'briefing', titulo: 'Briefing', sub: 'Notícias, clima e o resumo do dia', ic: 'newspaper', precisaPc: false, render });
})();
