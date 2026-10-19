# `orion/web/paineis/pn-logs.js`

> **Fonte:** https://assistanceorion.cloud/orion/web/paineis/pn-logs.js · baixado em 19/10/2026
> 41 linhas · 3.6 KB · Painel Logs

```javascript
'use strict';
// cópia de app/public/paineis/pn-logs.js (scripts/copiar-visual-app.js): edite no app e copie de novo
// Painel Logs: eventos recentes do ORION (lembretes, conexão com o site, vendas…) e o registro técnico do app,
// com filtro por nível e busca. Chaves, tokens e senhas aparecem mascarados.
(() => {
  const P = window.ORION_PAINEIS; if (!P) return;
  const { el, svg, num, pill, kpi, caixa, btn, vazio, busca, dataHora, relativo } = P.util;
  const est = { nivel: '', busca: '' };

  function baixar(nome, texto) {
    const a = el('a', { href: URL.createObjectURL(new Blob([texto], { type: 'text/plain;charset=utf-8' })), download: nome });
    document.body.append(a); a.click(); setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 1000);
  }

  async function eventos(ctx) {
    const r = await ctx.api('/logs/eventos');
    ctx.corpo.append(caixa('Eventos recentes', 'activity', { sub: 'O que aconteceu no ORION desde que ele abriu (os 150 mais recentes ficam na memória).' },
      r.eventos.length ? el('div', { class: 'pn-linhas' }, r.eventos.map((e) => P.util.linha({ ic: { Lembrete: 'bell', 'Conexão com o site': 'link', Venda: 'cart', 'Navegação': 'layers', 'Sincronização': 'refresh', 'Atualização': 'download' }[e.rotulo] || 'zap', titulo: e.rotulo, sub: e.resumo || '—', fim: el('small', { class: 'pn-nota', title: dataHora(e.em), text: relativo(e.em) }) })))
        : vazio('activity', 'Nenhum evento ainda', 'Lembretes, pedidos vindos do site e outros acontecimentos aparecem aqui enquanto o ORION está aberto.')));
  }

  async function tecnico(ctx) {
    const q = new URLSearchParams({ linhas: '400' }); if (est.nivel) q.set('nivel', est.nivel); if (est.busca) q.set('busca', est.busca);
    const r = await ctx.api('/logs?' + q);
    const nivel = (n, rot) => el('button', { type: 'button', class: 'pn-chip' + (est.nivel === n ? ' on' : ''), onclick: () => { est.nivel = n; ctx.atualizar(); } }, rot);
    const b = busca('Buscar no registro', (v) => { est.busca = v; ctx.atualizar(); }); b.querySelector('input').value = est.busca;
    ctx.acoes(btn('Baixar', { ic: 'download', titulo: 'Baixar o que está na tela', onclick: () => baixar(`orion-registro-${P.util.hojeISO()}.txt`, r.linhas.slice().reverse().map((l) => `${l.em} [${l.nivel}] ${l.msg}`).join('\n')) }));
    ctx.corpo.append(
      el('div', { class: 'pn-grade' }, kpi('Informações (24 h)', num(r.contagem.INFO), '', 'info'), kpi('Avisos (24 h)', num(r.contagem.AVISO), '', 'alert', r.contagem.AVISO ? 'alerta' : ''), kpi('Erros (24 h)', num(r.contagem.ERRO), r.contagem.ERRO ? 'veja abaixo ou rode o Diagnóstico' : 'nenhum', 'ban', r.contagem.ERRO ? 'ruim' : 'bom')),
      el('div', { class: 'pn-filtros', style: 'margin-top:16px' }, nivel('', 'Tudo'), nivel('ERRO', 'Erros'), nivel('AVISO', 'Avisos'), nivel('INFO', 'Informações'), b),
      caixa('Registro técnico', 'terminal', { sub: `${r.linhas.length} linha(s), da mais nova para a mais antiga. Chaves e senhas aparecem mascaradas.` },
        r.linhas.length ? el('div', { class: 'pn-log', role: 'log' }, r.linhas.map((l) => el('div', {}, el('time', { datetime: l.em, text: dataHora(l.em) }), el('span', { class: 'nv ' + l.nivel, text: l.nivel }), el('span', { text: l.msg })))) : el('p', { class: 'pn-nota', text: 'Nada encontrado com esse filtro.' })));
  }

  P.registrar({
    id: 'logs', titulo: 'Logs', sub: 'Eventos e rastreamento técnico', ic: 'terminal', precisaPc: true,
    abas: [{ id: 'eventos', nome: 'Eventos', ic: 'activity' }, { id: 'tecnico', nome: 'Registro técnico', ic: 'terminal' }],
    render: (ctx) => (ctx.aba === 'tecnico' ? tecnico : eventos)(ctx),
  });
})();

```
