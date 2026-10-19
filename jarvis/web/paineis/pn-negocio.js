'use strict';
// cópia de app/public/paineis/pn-negocio.js (scripts/copiar-visual-app.js): edite no app e copie de novo
// Painel "Negócio" (só aparece para a conta do dono e da equipe): faturamento, gasto com anúncios da Meta, lucro e ROI,
// contas a pagar com vencimento e onde cada projeto está hospedado. Os dados vêm da nuvem (/api/dono/negocio), a mesma
// conta do painel do dono em mlk010173.github.io/jarvis/admin; o que altera (marcar como pago) a nuvem só aceita do dono.
(() => {
  const P = window.JARVIS_PAINEIS; if (!P) return;
  const { el, svg, reais, num, data, kpi, caixa, linha, btn, pill, vazio, colunas } = P.util;
  const PER = [['hoje', 'Hoje'], ['7d', '7 dias'], ['30d', '30 dias'], ['mes', 'Este mês'], ['mespassado', 'Mês passado'], ['90d', '90 dias']];
  let periodo = '30d';
  const ADMIN = 'https://mlk010173.github.io/jarvis/admin';
  const pct = (n) => (n == null ? '—' : n.toLocaleString('pt-BR', { maximumFractionDigits: 1 }) + '%');
  const roas = (r) => (r == null ? '—' : r.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + 'x');
  const quando = (c) => (c.dias_para_vencer == null ? 'sem data' : c.dias_para_vencer < 0 ? `venceu há ${-c.dias_para_vencer} d` : c.dias_para_vencer === 0 ? 'vence hoje' : c.dias_para_vencer === 1 ? 'vence amanhã' : `em ${c.dias_para_vencer} dias`);
  const SIT = { vencido: ['Vencido', 'erro'], vence_logo: ['Vence logo', 'aviso'], proximo: ['Próximo', 'azul'], em_dia: ['Em dia', 'ok'], sem_data: ['Sem data', ''], inativo: ['Inativo', ''] };
  const CICLO = { mensal: 'por mês', trimestral: 'a cada 3 meses', semestral: 'a cada 6 meses', anual: 'por ano', uso: 'por uso', unico: 'único' };
  const linkAdmin = (aba, texto) => el('a', { class: 'pn-btn peq', href: `${ADMIN}#${aba}`, target: '_blank', rel: 'noopener' }, svg('link'), texto);

  async function dados(ctx) { return ctx.nuvem('/dono/negocio?periodo=' + periodo); }

  async function resumo(ctx) {
    const d = await dados(ctx), m = d.meta;
    const chips = el('div', { class: 'pn-filtros' }, PER.map(([v, n]) => el('button', { type: 'button', class: 'pn-chip' + (periodo === v ? ' on' : ''), onclick: () => { periodo = v; ctx.atualizar(); } }, n)));
    const serie = d.serie.map((s) => ({ rotulo: s.rotulo, faturamento: s.faturamento, gasto: s.gasto || 0 }));
    ctx.corpo.append(
      chips,
      el('div', { class: 'pn-grade' },
        kpi('Faturamento', reais(d.faturamento), `${num(d.vendas)} venda(s) · ${num(d.cadastros)} cadastro(s)`, 'trend'),
        kpi('Anúncios', reais(d.gasto_anuncios), `Meta ${reais(d.gasto_meta ?? d.gasto_anuncios)} · Google ${reais(d.gasto_google || 0)}`, 'megaphone'),
        kpi('Lucro', reais(d.lucro), `margem ${pct(d.margem_pct)}`, 'banknote', d.lucro < 0 ? 'ruim' : 'bom'),
        kpi('ROI', pct(d.roi_pct), `sobre ${reais(d.investimento)} (anúncios + custos)`, 'piggy', d.roi_pct != null && d.roi_pct < 0 ? 'ruim' : 'bom')),
      caixa('Faturamento e gasto com anúncios', 'barchart', { sub: 'Azul: faturamento. Rosa: gasto com anúncios (Meta e Google).' }, colunas(serie, { chaves: ['faturamento', 'gasto'], cores: ['#2E9BFF', '#f472b6'], fmt: (v) => reais(v), rotulo: 'Faturamento e gasto', saltoRotulo: serie.length > 16 ? Math.ceil(serie.length / 12) : 0 })),
      caixa('Para onde foi o dinheiro', 'wallet', {},
        el('div', { class: 'pn-linhas' },
          linha({ ic: 'trend', titulo: 'Faturamento', fim: el('b', { class: 'pn-valor', text: reais(d.faturamento) }) }),
          linha({ ic: 'rotate', titulo: 'Reembolsos', fim: el('b', { class: 'pn-valor', text: reais(-d.reembolsos) }) }),
          linha({ ic: 'card', titulo: 'Taxas do pagamento', fim: el('b', { class: 'pn-valor', text: reais(-d.taxas) }) }),
          d.comissoes ? linha({ ic: 'share', titulo: 'Comissões de afiliados', fim: el('b', { class: 'pn-valor', text: reais(-d.comissoes) }) }) : null,
          linha({ ic: 'megaphone', titulo: 'Anúncios (Meta)', fim: el('b', { class: 'pn-valor', text: reais(-(d.gasto_meta ?? d.gasto_anuncios)) }) }),
          d.gasto_google ? linha({ ic: 'megaphone', titulo: 'Anúncios (Google)', fim: el('b', { class: 'pn-valor', text: reais(-d.gasto_google) }) }) : null,
          linha({ ic: 'server', titulo: 'Custos fixos do período', sub: `${reais(d.custos.mensal_total)} por mês, proporcional aos dias`, fim: el('b', { class: 'pn-valor', text: reais(-d.custos_fixos) }) }),
          linha({ ic: 'banknote', titulo: 'Lucro', classe: d.lucro < 0 ? 'neg' : 'pos', fim: el('b', { class: 'pn-valor', text: reais(d.lucro) }) }))),
      caixa('Meta Ads', 'megaphone', { sub: m.configurado ? `${m.conta_nome || 'act_' + m.conta}${m.sincronizado_em ? ' · atualizado ' + P.util.relativo(m.sincronizado_em) : ''}` : 'Conecte a conta de anúncios no painel do dono para ver gasto, ROAS e CPA.', acoes: linkAdmin('negocio', m.configurado ? 'Abrir no painel' : 'Conectar') },
        m.erro ? el('p', { class: 'pn-nota', style: 'color:#ff8fa3', text: m.erro }) : null,
        m.configurado ? el('div', { class: 'pn-grade' }, kpi('Impressões', num(m.impressoes), `CTR ${pct(m.ctr_pct)}`, 'eye'), kpi('Cliques no link', num(m.cliques_link), `CPC ${m.cpc != null ? reais(m.cpc) : '—'}`, 'link'), kpi('Cadastros', num(m.cadastros), `custo ${m.custo_cadastro != null ? reais(m.custo_cadastro) : '—'}`, 'users'), kpi('Vendas dos anúncios', num(m.vendas), `receita ${reais(m.receita)}`, 'cart')) : null,
        d.campanhas.length ? el('div', { class: 'pn-linhas', style: 'margin-top:10px' }, d.campanhas.slice(0, 6).map((c) => linha({ ic: 'megaphone', titulo: c.nome || c.id, sub: `${num(c.impressoes)} impressões · ${num(c.cadastros)} cadastro(s) · ${num(c.vendas)} venda(s)`, fim: [el('b', { class: 'pn-valor', text: reais(c.gasto) }), pill('ROAS ' + roas(c.roas), c.roas == null ? '' : c.roas >= 2 ? 'ok' : c.roas >= 1 ? 'aviso' : 'erro')] }))) : null),
      d.custos.proximos.length ? caixa('Próximos vencimentos', 'calendar', { acoes: btn('Ver contas', { peq: true, ic: 'receipt', onclick: () => ctx.trocarAba('contas') }) },
        el('div', { class: 'pn-linhas' }, d.custos.proximos.slice(0, 5).map((c) => linha({ ic: 'receipt', titulo: c.nome, sub: `${c.fornecedor || ''}${c.vence_em ? ' · ' + data(c.vence_em) : ''}`, fim: [el('b', { class: 'pn-valor', text: reais(c.valor_centavos) }), pill(quando(c), (SIT[c.situacao] || ['', ''])[1])] })))) : null);
  }

  async function contas(ctx) {
    const d = await dados(ctx);
    const lista = d.lista_custos.filter((c) => c.ativo);
    const mensal = lista.reduce((s, c) => s + c.mensal_centavos, 0);
    const pagar = (c) => async () => {
      if (!P.util.confirmar(`Marcar "${c.nome}" (${reais(c.valor_centavos)}) como pago? O próximo vencimento avança ${CICLO[c.ciclo] === 'por mês' ? '1 mês' : CICLO[c.ciclo]}.`)) return;
      try { const n = await ctx.nuvem(`/dono/custos/${c.id}/pago`, { metodo: 'POST', corpo: {} }); ctx.toast(n.vence_em ? `Pago. Próximo vencimento: ${data(n.vence_em)}.` : 'Pagamento registrado.'); ctx.atualizar(); } catch (e) { ctx.toast(e.message, 'bad'); }
    };
    ctx.corpo.append(
      el('div', { class: 'pn-grade' }, kpi('Custo fixo por mês', reais(mensal), `${reais(mensal * 12)} por ano`, 'calendar'), kpi('Vencidos', num(lista.filter((c) => c.situacao === 'vencido').length), 'pague para não sair do ar', 'alert', lista.some((c) => c.situacao === 'vencido') ? 'ruim' : ''), kpi('Vencem logo', num(lista.filter((c) => c.situacao === 'vence_logo').length), 'nos próximos dias', 'clock')),
      caixa('Contas a pagar', 'receipt', { sub: 'Hospedagens, domínios e assinaturas do negócio. Para adicionar ou mudar valores, use o painel do dono.', acoes: linkAdmin('custos', 'Gerenciar') },
        lista.length ? el('div', { class: 'pn-linhas' }, lista.map((c) => linha({
          ic: { hospedagem: 'server', dominio: 'globe', assinatura: 'repeat', plataforma: 'store', ferramenta: 'plug', variavel: 'activity' }[c.categoria] || 'receipt',
          titulo: c.nome, sub: [c.fornecedor, `${reais(c.valor_centavos)} ${CICLO[c.ciclo] || ''}`, c.vence_em ? 'vence ' + data(c.vence_em) : '', c.renovacao_auto ? 'renova sozinho' : 'renovação manual'].filter(Boolean).join(' · '),
          fim: [pill(quando(c), (SIT[c.situacao] || ['', ''])[1]), c.url ? el('a', { class: 'pn-btn peq', href: c.url, target: '_blank', rel: 'noopener', title: 'Abrir o painel para pagar' }, svg('link')) : null, d.pode_editar && c.vence_em ? btn('Paguei', { peq: true, onclick: pagar(c) }) : null],
        }))) : vazio('receipt', 'Nenhuma conta cadastrada', 'Cadastre no painel do dono: Custos & hospedagem.', linkAdmin('custos', 'Abrir o painel'))));
  }

  async function hospedagem(ctx) {
    const d = await dados(ctx);
    const grupos = {};
    for (const c of d.lista_custos) if (c.ativo && c.hospeda) (grupos[c.fornecedor || c.nome] ||= []).push(c);
    ctx.corpo.append(Object.keys(grupos).length
      ? Object.entries(grupos).map(([forn, itens]) => caixa(forn, 'server', {}, el('div', { class: 'pn-linhas' }, itens.map((c) => linha({ ic: 'server', titulo: c.hospeda, sub: `${c.nome}${c.vence_em ? ' · vence ' + data(c.vence_em) : ''}`, fim: c.url ? el('a', { class: 'pn-btn peq', href: c.url, target: '_blank', rel: 'noopener' }, svg('link'), 'Painel') : null })))))
      : vazio('server', 'Nada mapeado ainda', 'No painel do dono, preencha "O que fica hospedado aqui" em cada custo.', linkAdmin('custos', 'Abrir o painel')));
  }

  P.registrar({
    id: 'negocio', titulo: 'Negócio', sub: 'Anúncios, lucro, contas a pagar e hospedagem', ic: 'trend', precisaPc: false,
    abas: [{ id: 'resumo', nome: 'Resumo', ic: 'trend' }, { id: 'contas', nome: 'Contas a pagar', ic: 'receipt' }, { id: 'hospedagem', nome: 'Hospedagem', ic: 'server' }],
    render: (ctx) => ({ resumo, contas, hospedagem }[ctx.aba] || resumo)(ctx),
  });
})();
