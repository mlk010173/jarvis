# `orion/web/paineis/pn-financeiro.js`

> **Fonte:** https://assistanceorion.cloud/orion/web/paineis/pn-financeiro.js · baixado em 19/10/2026
> 184 linhas · 22.6 KB · Painel Financeiro

```javascript
'use strict';
// cópia de app/public/paineis/pn-financeiro.js (scripts/copiar-visual-app.js): edite no app e copie de novo

// Painel Financeiro: saldos das contas, gastos e entradas (com importação de extrato OFX/CSV), faturas a pagar e investimentos.
// Os dados ficam no app do PC; no ORION Web a tela é a mesma, pela conexão da conta.
(() => {
  const P = window.ORION_PAINEIS; if (!P) return;
  const { el, svg, reais, data, mesAtual, nomeMes, pill, kpi, caixa, linha, btn, vazio, campo, busca, barras, colunas, abrirModal, fecharModal, confirmar } = P.util;
  let meta = null;
  const pegarMeta = async (api) => (meta = meta || await api('/financeiro/meta'));
  const mesMais = (m, n) => { const [y, mm] = m.split('-').map(Number); const d = new Date(Date.UTC(y, mm - 1 + n, 1)); return d.toISOString().slice(0, 7); };
  const estado = { mes: mesAtual(), conta: '', categoria: '', busca: '' };
  const aviso = () => el('p', { class: 'pn-nota', text: 'O ORION organiza e lembra dos seus números. Não é consultoria financeira nem de investimentos. Os dados ficam só no seu PC.' });
  const ICONE_CAT = { Moradia: 'home', Mercado: 'cart', 'Alimentação': 'coffee', Transporte: 'pin', 'Saúde': 'heart', 'Educação': 'book', Lazer: 'smile', Assinaturas: 'repeat', Compras: 'tag', 'Contas da casa': 'bulb', 'Impostos e taxas': 'receipt', Trabalho: 'idcard', Renda: 'banknote', 'Transferências': 'share', Investimentos: 'trend', Outros: 'info' };

  // ---------- formulários ----------
  function msgBox() { return el('div', { class: 'pn-msg', role: 'status' }); }
  async function salvarCom(ctx, caminho, corpo, msg, aoSalvar) {
    msg.className = 'pn-msg'; msg.textContent = 'Salvando…';
    try { const r = await ctx.api(caminho, { metodo: 'POST', corpo }); fecharModal(); ctx.toast('Salvo.'); aoSalvar?.(r); ctx.recarregar(); }
    catch (e) { msg.className = 'pn-msg erro'; msg.textContent = e.message; }
  }
  const selectDe = (opcoes, valor, vazioTxt) => { const s = el('select', {}, vazioTxt != null ? el('option', { value: '', text: vazioTxt }) : null, opcoes.map(([v, t]) => el('option', { value: v, text: t }))); s.value = valor ?? ''; return s; };
  const valorTxt = (c) => (c ? (Math.abs(c) / 100).toFixed(2).replace('.', ',') : '');

  async function formConta(ctx, c = {}) {
    const m = await pegarMeta(ctx.api);
    const nome = el('input', { maxlength: '60', value: c.nome || '', placeholder: 'Ex.: Nubank, Carteira' });
    const tipo = selectDe(Object.entries(m.tipos_conta), c.tipo || 'corrente');
    const saldo = el('input', { inputmode: 'decimal', value: c.saldo_inicial != null ? (c.saldo_inicial / 100).toFixed(2).replace('.', ',') : '', placeholder: '0,00' });
    const msg = msgBox();
    abrirModal(c.id ? 'Editar conta' : 'Nova conta',
      el('div', { class: 'pn-form' }, campo('Nome', nome), campo('Tipo', tipo), campo('Saldo inicial (R$)', saldo)),
      el('p', { class: 'pn-nota', text: 'O saldo da conta = saldo inicial + os lançamentos dela. Para cartão de crédito, use o valor da fatura atual como negativo.' }),
      el('div', { class: 'pn-form' }, el('div', { class: 'pn-acoes larga' }, btn('Salvar conta', { pri: true, ic: 'save', onclick: () => salvarCom(ctx, '/financeiro/contas/salvar', { id: c.id, nome: nome.value, tipo: tipo.value, saldo_inicial: saldo.value || 0 }, msg) }))), msg);
  }
  async function formLancamento(ctx, l = {}, tipoPadrao = 'gasto') {
    const m = await pegarMeta(ctx.api); const contas = (await ctx.api('/financeiro/contas')).contas;
    const tipo = selectDe([['gasto', 'Gasto (saída)'], ['entrada', 'Entrada (receita)']], l.valor > 0 ? 'entrada' : l.valor < 0 ? 'gasto' : tipoPadrao);
    const descricao = el('input', { maxlength: '120', value: l.descricao || '', placeholder: 'Ex.: Mercado do mês' });
    const valor = el('input', { inputmode: 'decimal', value: valorTxt(l.valor), placeholder: '0,00' });
    const dia = el('input', { type: 'date', value: l.dia || P.util.hojeISO() });
    const categoria = selectDe(m.categorias.map((x) => [x, x]), l.categoria || '', 'Automática (pelo nome)');
    const conta = selectDe(contas.map((c) => [c.id, c.nome]), l.conta_id || '', 'Sem conta');
    const msg = msgBox();
    abrirModal(l.id ? 'Editar lançamento' : tipoPadrao === 'entrada' ? 'Nova entrada' : 'Novo gasto',
      el('div', { class: 'pn-form' }, campo('Tipo', tipo), campo('Descrição', descricao, 'larga'), campo('Valor (R$)', valor), campo('Data', dia), campo('Categoria', categoria), campo('Conta', conta)),
      el('div', { class: 'pn-form' }, el('div', { class: 'pn-acoes larga' }, btn('Salvar', { pri: true, ic: 'save', onclick: () => salvarCom(ctx, '/financeiro/lancamentos/salvar', { id: l.id, tipo: tipo.value, descricao: descricao.value, valor: valor.value, dia: dia.value, categoria: categoria.value, conta_id: conta.value || null }, msg) }))), msg);
  }
  async function formImportar(ctx) {
    const contas = (await ctx.api('/financeiro/contas')).contas;
    const conta = selectDe(contas.map((c) => [c.id, c.nome]), contas[0]?.id || '', 'Sem conta');
    const arquivo = el('input', { type: 'file', accept: '.ofx,.csv,.txt,text/csv,application/x-ofx' });
    const msg = msgBox();
    abrirModal('Importar extrato do banco',
      el('p', { class: 'pn-nota', text: 'No app ou site do seu banco, exporte o extrato em OFX (Money) ou CSV e escolha o arquivo aqui. Lançamentos repetidos são ignorados, então pode importar o mesmo período de novo sem medo.' }),
      el('div', { class: 'pn-form' }, campo('Conta do extrato', conta), campo('Arquivo (.ofx ou .csv)', arquivo)),
      el('div', { class: 'pn-form' }, el('div', { class: 'pn-acoes larga' }, btn('Importar', { pri: true, ic: 'upload', onclick: async () => {
        const f = arquivo.files?.[0]; if (!f) { msg.className = 'pn-msg erro'; msg.textContent = 'Escolha o arquivo do extrato.'; return; }
        if (f.size > 2 * 1024 * 1024) { msg.className = 'pn-msg erro'; msg.textContent = 'Arquivo grande demais (máximo 2 MB).'; return; }
        const buf = await f.arrayBuffer();
        let texto = new TextDecoder('utf-8').decode(buf); if (texto.includes('�')) texto = new TextDecoder('windows-1252').decode(buf);
        msg.className = 'pn-msg'; msg.textContent = 'Importando…';
        try { const r = await ctx.api('/financeiro/importar', { metodo: 'POST', corpo: { texto, conta_id: conta.value || null, formato: /\.csv$/i.test(f.name) ? 'csv' : /\.ofx$/i.test(f.name) ? 'ofx' : '' } }); fecharModal(); ctx.toast(`${r.novos} lançamento(s) novo(s) de ${r.lidos} lido(s)${r.repetidos ? `; ${r.repetidos} já estavam lançados` : ''}.`); ctx.recarregar(); }
        catch (e) { msg.className = 'pn-msg erro'; msg.textContent = e.message; }
      } }))), msg);
  }
  async function formFatura(ctx, f = {}) {
    const m = await pegarMeta(ctx.api); const contas = (await ctx.api('/financeiro/contas')).contas;
    const descricao = el('input', { maxlength: '80', value: f.descricao || '', placeholder: 'Ex.: Cartão Nubank, Internet, Aluguel' });
    const valor = el('input', { inputmode: 'decimal', value: valorTxt(f.valor), placeholder: '0,00' });
    const venc = el('input', { type: 'date', value: f.vencimento || P.util.hojeISO() });
    const categoria = selectDe(m.categorias.map((x) => [x, x]), f.categoria || '', 'Automática (pelo nome)');
    const conta = selectDe(contas.map((c) => [c.id, c.nome]), f.conta_id || '', 'Pagar de qualquer conta');
    const rec = el('input', { type: 'checkbox' }); rec.checked = !!f.recorrente;
    const msg = msgBox();
    abrirModal(f.id ? 'Editar fatura' : 'Nova fatura',
      el('div', { class: 'pn-form' }, campo('Descrição', descricao, 'larga'), campo('Valor (R$)', valor), campo('Vencimento', venc), campo('Categoria', categoria), campo('Conta que paga', conta)),
      el('label', { class: 'pn-chave', style: 'margin-top:12px' }, rec, el('i'), el('span', { text: 'Repete todo mês (ao pagar, a do próximo mês já aparece)' })),
      el('div', { class: 'pn-form', style: 'margin-top:12px' }, el('div', { class: 'pn-acoes larga' }, btn('Salvar fatura', { pri: true, ic: 'save', onclick: () => salvarCom(ctx, '/financeiro/faturas/salvar', { id: f.id, descricao: descricao.value, valor: valor.value, vencimento: venc.value, categoria: categoria.value, conta_id: conta.value || null, recorrente: rec.checked }, msg) }))), msg);
  }
  async function formPagar(ctx, f) {
    const contas = (await ctx.api('/financeiro/contas')).contas;
    const conta = selectDe(contas.map((c) => [c.id, c.nome]), f.conta_id || contas[0]?.id || '', 'Sem conta');
    const dia = el('input', { type: 'date', value: P.util.hojeISO() });
    const lancar = el('input', { type: 'checkbox' }); lancar.checked = true;
    const msg = msgBox();
    abrirModal(`Pagar "${f.descricao}"`,
      el('p', { class: 'pn-nota', text: `${reais(f.valor)} com vencimento em ${data(f.vencimento)}.` }),
      el('div', { class: 'pn-form' }, campo('Pago com a conta', conta), campo('Data do pagamento', dia)),
      el('label', { class: 'pn-chave', style: 'margin-top:12px' }, lancar, el('i'), el('span', { text: 'Lançar como gasto na conta escolhida' })),
      el('div', { class: 'pn-form', style: 'margin-top:12px' }, el('div', { class: 'pn-acoes larga' }, btn('Marcar como paga', { pri: true, ic: 'check', onclick: () => salvarCom(ctx, '/financeiro/faturas/pagar', { id: f.id, conta_id: conta.value || null, dia: dia.value, lancar: lancar.checked }, msg) }))), msg);
  }
  async function formInvest(ctx, i = {}) {
    const m = await pegarMeta(ctx.api);
    const nome = el('input', { maxlength: '60', value: i.nome || '', placeholder: 'Ex.: Tesouro Selic 2029' });
    const tipo = selectDe(Object.entries(m.tipos_invest), i.tipo || 'renda_fixa');
    const aplicado = el('input', { inputmode: 'decimal', value: valorTxt(i.aplicado), placeholder: '0,00' });
    const atual = el('input', { inputmode: 'decimal', value: valorTxt(i.atual), placeholder: 'igual ao aplicado' });
    const obs = el('input', { maxlength: '200', value: i.obs || '', placeholder: 'Opcional: corretora, vencimento…' });
    const msg = msgBox();
    abrirModal(i.id ? 'Atualizar investimento' : 'Novo investimento',
      el('div', { class: 'pn-form' }, campo('Nome', nome, 'larga'), campo('Tipo', tipo), campo('Valor aplicado (R$)', aplicado), campo('Valor atual (R$)', atual), campo('Observação', obs, 'larga')),
      el('p', { class: 'pn-nota', text: 'Atualize o valor atual quando conferir no banco ou na corretora. O ORION não busca cotações nem recomenda onde investir.' }),
      el('div', { class: 'pn-form' }, el('div', { class: 'pn-acoes larga' }, btn('Salvar', { pri: true, ic: 'save', onclick: () => salvarCom(ctx, '/financeiro/investimentos/salvar', { id: i.id, nome: nome.value, tipo: tipo.value, aplicado: aplicado.value, atual: atual.value, obs: obs.value }, msg) }))), msg);
  }
  async function apagar(ctx, caminho, id, texto) { if (!confirmar(texto)) return; try { await ctx.api(caminho, { metodo: 'POST', corpo: { id } }); ctx.toast('Apagado.'); ctx.recarregar(); } catch (e) { ctx.toast(e.message, 'bad'); } }
  const situacao = (f) => (f.situacao === 'paga' ? pill('Paga em ' + data(f.paga_em), 'ok') : f.situacao === 'atrasada' ? pill('Atrasada', 'erro') : f.situacao === 'vence_logo' ? pill('Vence logo', 'aviso') : pill('Em aberto', 'azul'));

  // ---------- abas ----------
  async function saldos(ctx) {
    const [r, c] = await Promise.all([ctx.api('/financeiro/resumo?mes=' + mesAtual()), ctx.api('/financeiro/contas')]);
    ctx.acoes(btn('Nova conta', { ic: 'plus', onclick: () => formConta(ctx) }));
    const inv = r.investimentos_atual - r.investido;
    ctx.corpo.append(
      el('div', { class: 'pn-grade' },
        kpi('Saldo nas contas', reais(r.saldo_contas), r.contas ? `${r.contas} conta(s)${r.cartoes ? ` · cartões ${reais(r.cartoes)}` : ''}` : 'Nenhuma conta ainda', 'wallet', r.saldo_contas < 0 ? 'ruim' : ''),
        kpi('Resultado de ' + nomeMes(r.mes).split(' ')[0].toLowerCase(), reais(r.saldo_mes, true), `entradas ${reais(r.entradas)} · saídas ${reais(r.saidas)}`, 'trend', r.saldo_mes >= 0 ? 'bom' : 'ruim'),
        kpi('Faturas em aberto', reais(r.faturas_total), r.faturas_abertas ? `${r.faturas_abertas} fatura(s)${r.faturas_atrasadas ? `, ${r.faturas_atrasadas} atrasada(s)` : ''}` : 'Tudo pago', 'receipt', r.faturas_atrasadas ? 'ruim' : r.faturas_abertas ? 'alerta' : 'bom'),
        kpi('Investimentos', reais(r.investimentos_atual), r.investido ? `aplicado ${reais(r.investido)} · ${reais(inv, true)}` : 'Nenhum cadastrado', 'piggy', inv > 0 ? 'bom' : inv < 0 ? 'ruim' : '')),
      el('div', { class: 'pn-grade duas' },
        caixa('Entradas e saídas', 'barchart', { sub: 'Últimos 6 meses (transferências entre contas não entram).' }, colunas(r.meses.map((x) => ({ rotulo: nomeMes(x.mes).slice(0, 3), entradas: x.entradas, saidas: x.saidas })), { chaves: ['entradas', 'saidas'], cores: ['#2E9BFF', '#ff5c7a'], fmt: (v, k) => (k === 'entradas' ? 'Entradas ' : 'Saídas ') + reais(v), rotulo: 'Entradas e saídas por mês' })),
        caixa('Próximas faturas', 'calendar', { acoes: btn('Ver todas', { peq: true, onclick: () => ctx.trocarAba('faturas') }) }, r.proximas.length ? el('div', { class: 'pn-linhas' }, r.proximas.map((f) => linha({ ic: 'receipt', titulo: f.descricao, sub: 'Vence ' + data(f.vencimento), fim: [situacao(f), el('b', { class: 'pn-valor', text: reais(f.valor) })] }))) : el('p', { class: 'pn-nota', text: 'Nada vencendo nos próximos 10 dias.' }))),
      caixa('Contas', 'wallet', { acoes: btn('Nova conta', { peq: true, ic: 'plus', onclick: () => formConta(ctx) }) },
        c.contas.length ? el('div', { class: 'pn-linhas' }, c.contas.map((x) => linha({ ic: x.tipo === 'cartao' ? 'card' : x.tipo === 'carteira' ? 'banknote' : 'wallet', titulo: x.nome, sub: x.tipo_nome, fim: [el('b', { class: 'pn-valor ' + (x.saldo < 0 ? 'menos' : ''), text: reais(x.saldo) }), btn('', { peq: true, ic: 'pen', titulo: 'Editar ' + x.nome, onclick: () => formConta(ctx, x) }), btn('', { peq: true, ic: 'trash', titulo: 'Arquivar ' + x.nome, onclick: () => apagar(ctx, '/financeiro/contas/arquivar', x.id, `Arquivar a conta "${x.nome}"? Os lançamentos dela continuam no histórico.`) })] })))
          : vazio('wallet', 'Cadastre a primeira conta', 'Conta corrente, poupança, carteira ou cartão. Depois é só lançar os gastos (ou pedir para o ORION: "anota um gasto de 50 reais no mercado").', btn('Nova conta', { pri: true, ic: 'plus', onclick: () => formConta(ctx) }))),
      aviso());
  }

  async function gastos(ctx) {
    await pegarMeta(ctx.api);
    const q = new URLSearchParams({ mes: estado.mes }); if (estado.conta) q.set('conta', estado.conta); if (estado.categoria) q.set('categoria', estado.categoria); if (estado.busca) q.set('busca', estado.busca);
    const [r, l, c] = await Promise.all([ctx.api('/financeiro/resumo?mes=' + estado.mes), ctx.api('/financeiro/lancamentos?' + q), ctx.api('/financeiro/contas')]);
    ctx.acoes(btn('Importar extrato', { ic: 'upload', onclick: () => formImportar(ctx) }), btn('Nova entrada', { ic: 'arrowup', onclick: () => formLancamento(ctx, {}, 'entrada') }), btn('Novo gasto', { ic: 'plus', pri: true, onclick: () => formLancamento(ctx, {}, 'gasto') }));
    const fContas = selectDe(c.contas.map((x) => [x.id, x.nome]), estado.conta, 'Todas as contas'); fContas.addEventListener('change', () => { estado.conta = fContas.value; ctx.recarregar(); });
    const fCat = selectDe(meta.categorias.map((x) => [x, x]), estado.categoria, 'Todas as categorias'); fCat.addEventListener('change', () => { estado.categoria = fCat.value; ctx.recarregar(); });
    const b = busca('Buscar na descrição', (v) => { estado.busca = v; ctx.recarregar(); }); b.querySelector('input').value = estado.busca;
    const mudarMes = (n) => { estado.mes = mesMais(estado.mes, n); ctx.recarregar(); };
    ctx.corpo.append(
      el('div', { class: 'pn-filtros' }, btn('', { ic: 'chevleft', titulo: 'Mês anterior', onclick: () => mudarMes(-1) }), el('b', { text: nomeMes(estado.mes), style: 'min-width:150px;text-align:center' }), btn('', { ic: 'chevright', titulo: 'Próximo mês', onclick: () => mudarMes(1) }), el('div', { class: 'pn-form', style: 'flex:1;grid-template-columns:repeat(auto-fit,minmax(150px,1fr))' }, fContas, fCat), b),
      el('div', { class: 'pn-grade' }, kpi('Entradas', reais(r.entradas), `${r.lancamentos} lançamento(s) no mês`, 'arrowup', 'bom'), kpi('Saídas', reais(r.saidas), r.por_categoria[0] ? `maior: ${r.por_categoria[0].categoria}` : '', 'arrowdown', 'ruim'), kpi('Resultado', reais(r.saldo_mes, true), r.entradas ? `${Math.round((r.saidas / r.entradas) * 100)}% das entradas foram gastas` : '', 'trend', r.saldo_mes >= 0 ? 'bom' : 'ruim')),
      el('div', { class: 'pn-grade duas' },
        caixa('Para onde foi o dinheiro', 'pie', { sub: 'Gastos do mês por categoria.' }, r.por_categoria.length ? barras(r.por_categoria.map((x) => ({ nome: x.categoria, valor: x.total })), (v) => reais(v)) : el('p', { class: 'pn-nota', text: 'Nenhum gasto lançado neste mês.' })),
        caixa('Lançamentos', 'list', { sub: l.lancamentos.length >= 400 ? 'Mostrando os 400 mais recentes.' : `${l.lancamentos.length} no filtro atual.` },
          l.lancamentos.length ? el('div', { class: 'pn-linhas' }, l.lancamentos.map((x) => linha({ ic: ICONE_CAT[x.categoria] || 'info', titulo: x.descricao, sub: `${data(x.dia)} · ${x.categoria}${x.conta_nome ? ' · ' + x.conta_nome : ''}`, fim: [el('b', { class: 'pn-valor ' + (x.valor > 0 ? 'mais' : 'menos'), text: reais(x.valor, true) }), btn('', { peq: true, ic: 'pen', titulo: 'Editar', onclick: () => formLancamento(ctx, x) }), btn('', { peq: true, ic: 'trash', titulo: 'Apagar', onclick: () => apagar(ctx, '/financeiro/lancamentos/apagar', x.id, `Apagar "${x.descricao}" (${reais(x.valor)})?`) })] })))
            : vazio('list', 'Nada lançado aqui', 'Lance um gasto, importe o extrato do banco ou fale com o ORION: "gastei 35 reais no almoço".', btn('Novo gasto', { pri: true, ic: 'plus', onclick: () => formLancamento(ctx) }), btn('Importar extrato', { ic: 'upload', onclick: () => formImportar(ctx) })))),
      aviso());
  }

  async function faturas(ctx) {
    const r = await ctx.api('/financeiro/faturas');
    ctx.acoes(btn('Nova fatura', { ic: 'plus', pri: true, onclick: () => formFatura(ctx) }));
    const abertas = r.faturas.filter((f) => !f.paga_em), pagas = r.faturas.filter((f) => f.paga_em);
    const total = abertas.reduce((s, f) => s + f.valor, 0), atras = abertas.filter((f) => f.situacao === 'atrasada');
    const item = (f) => linha({ ic: 'receipt', titulo: f.descricao, sub: `${f.paga_em ? 'Venceu' : 'Vence'} ${data(f.vencimento)}${f.categoria ? ' · ' + f.categoria : ''}${f.recorrente ? ' · todo mês' : ''}`, classe: f.situacao === 'atrasada' ? 'atrasada' : '',
      fim: [situacao(f), el('b', { class: 'pn-valor', text: reais(f.valor) }), !f.paga_em ? btn('Pagar', { peq: true, ic: 'check', onclick: () => formPagar(ctx, f) }) : null, btn('', { peq: true, ic: 'pen', titulo: 'Editar', onclick: () => formFatura(ctx, f) }), btn('', { peq: true, ic: 'trash', titulo: 'Apagar', onclick: () => apagar(ctx, '/financeiro/faturas/apagar', f.id, `Apagar a fatura "${f.descricao}"?`) })] });
    ctx.corpo.append(
      el('div', { class: 'pn-grade' }, kpi('Em aberto', reais(total), `${abertas.length} fatura(s)`, 'receipt', abertas.length ? 'alerta' : 'bom'), kpi('Atrasadas', String(atras.length), atras.length ? reais(atras.reduce((s, f) => s + f.valor, 0)) : 'Nenhuma', 'alert', atras.length ? 'ruim' : 'bom'), kpi('Pagas (45 dias)', String(pagas.length), pagas.length ? reais(pagas.reduce((s, f) => s + f.valor, 0)) : '', 'check')),
      caixa('A pagar', 'calendar', { sub: 'O ORION avisa (na tela, na bandeja e pela voz) um dia antes do vencimento e no dia.' }, abertas.length ? el('div', { class: 'pn-linhas' }, abertas.map(item)) : vazio('receipt', 'Nenhuma fatura em aberto', 'Cadastre as contas fixas (aluguel, internet, cartão) e marque "repete todo mês" para não esquecer nenhuma.', btn('Nova fatura', { pri: true, ic: 'plus', onclick: () => formFatura(ctx) }))),
      pagas.length ? caixa('Pagas recentemente', 'check', {}, el('div', { class: 'pn-linhas' }, pagas.map(item))) : null,
      aviso());
  }

  async function investimentos(ctx) {
    const r = await ctx.api('/financeiro/investimentos');
    ctx.acoes(btn('Novo investimento', { ic: 'plus', pri: true, onclick: () => formInvest(ctx) }));
    const ap = r.investimentos.reduce((s, i) => s + i.aplicado, 0), at = r.investimentos.reduce((s, i) => s + i.atual, 0);
    const porTipo = new Map(); for (const i of r.investimentos) porTipo.set(i.tipo_nome, (porTipo.get(i.tipo_nome) || 0) + i.atual);
    ctx.corpo.append(
      el('div', { class: 'pn-grade' }, kpi('Valor atual', reais(at), `${r.investimentos.length} investimento(s)`, 'piggy'), kpi('Aplicado', reais(ap), '', 'banknote'), kpi('Rendimento', reais(at - ap, true), ap ? `${(((at - ap) / ap) * 100).toLocaleString('pt-BR', { maximumFractionDigits: 2 })}% sobre o aplicado` : '', 'trend', at - ap > 0 ? 'bom' : at - ap < 0 ? 'ruim' : '')),
      r.investimentos.length ? el('div', { class: 'pn-grade duas' },
        caixa('Carteira', 'list', {}, el('div', { class: 'pn-linhas' }, r.investimentos.map((i) => linha({ ic: 'trend', titulo: i.nome, sub: `${i.tipo_nome}${i.obs ? ' · ' + i.obs : ''} · atualizado ${P.util.relativo(i.atualizado_em)}`, fim: [el('span', { class: 'pn-valor ' + (i.rendimento > 0 ? 'mais' : i.rendimento < 0 ? 'menos' : ''), text: i.rendimento_pct != null ? `${i.rendimento_pct > 0 ? '+' : ''}${i.rendimento_pct.toLocaleString('pt-BR')}%` : '' }), el('b', { class: 'pn-valor', text: reais(i.atual) }), btn('', { peq: true, ic: 'pen', titulo: 'Atualizar', onclick: () => formInvest(ctx, i) }), btn('', { peq: true, ic: 'trash', titulo: 'Apagar', onclick: () => apagar(ctx, '/financeiro/investimentos/apagar', i.id, `Apagar "${i.nome}"?`) })] })))),
        caixa('Por tipo', 'pie', {}, barras([...porTipo].map(([nome, valor]) => ({ nome, valor })).sort((a, b) => b.valor - a.valor), (v) => reais(v))))
        : vazio('piggy', 'Acompanhe seus investimentos', 'Cadastre o que você já tem (Tesouro, CDB, ações, reserva) com o valor aplicado e o valor atual para ver o total num lugar só.', btn('Novo investimento', { pri: true, ic: 'plus', onclick: () => formInvest(ctx) })),
      aviso());
  }

  P.registrar({
    id: 'financeiro', titulo: 'Financeiro', sub: 'Saldos, gastos, faturas e investimentos', ic: 'wallet', precisaPc: true,
    abas: [{ id: 'saldos', nome: 'Saldos', ic: 'wallet' }, { id: 'gastos', nome: 'Gastos', ic: 'list' }, { id: 'faturas', nome: 'Faturas', ic: 'receipt' }, { id: 'investimentos', nome: 'Investimentos', ic: 'piggy' }],
    render: (ctx) => ({ saldos, gastos, faturas, investimentos }[ctx.aba] || saldos)(ctx),
  });
})();

```
