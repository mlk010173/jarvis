'use strict';
// Checkout: PIX (QR Code + copia e cola) ou cartão de crédito. No cartão, o navegador troca os dados por um token direto na SyncPayments
// (chave pública, só em domínios cadastrados) e o nosso servidor recebe apenas o token: número e CVV nunca passam por aqui.
(() => {
  const $ = (s) => document.querySelector(s);
  const el = (tag, attrs = {}, ...filhos) => { const e = document.createElement(tag); for (const [k, v] of Object.entries(attrs)) { if (k === 'class') e.className = v; else if (k === 'text') e.textContent = v; else e.setAttribute(k, v); } for (const f of filhos) if (f != null) e.append(f); return e; };
  const volta = 'checkout.html' + location.search;
  async function api(url, metodo = 'GET', corpo) {
    const r = await fetch(url, { method: metodo, headers: corpo ? { 'Content-Type': 'application/json' } : {}, body: corpo ? JSON.stringify(corpo) : undefined, credentials: 'same-origin' });
    const j = await r.json().catch(() => ({}));
    if (r.status === 401) { location.href = '../entrar?volta=' + encodeURIComponent(volta); throw new Error('login'); }
    if (!r.ok) throw Object.assign(new Error(j.erro || 'Erro ' + r.status), { status: r.status });
    return j;
  }
  const reais = (c) => (c / 100).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
  const data = (s) => new Date(s).toLocaleDateString('pt-BR');
  const erro = $('#erro');
  const mostrarErro = (m) => { erro.textContent = m; erro.hidden = !m; };

  // máscaras simples
  const so = (v, n) => v.replace(/\D/g, '').slice(0, n);
  $('#cpf').addEventListener('input', (e) => { e.target.value = so(e.target.value, 11).replace(/(\d{3})(\d)/, '$1.$2').replace(/(\d{3})(\d)/, '$1.$2').replace(/(\d{3})(\d{1,2})$/, '$1-$2'); });
  $('#tel').addEventListener('input', (e) => { const d = so(e.target.value, 11); e.target.value = d.length > 6 ? d.replace(/(\d{2})(\d{4,5})(\d{4})$/, '($1) $2-$3') : d.replace(/(\d{2})(\d+)/, '($1) $2'); });
  $('#cc-num').addEventListener('input', (e) => { e.target.value = so(e.target.value, 19).replace(/(\d{4})(?=\d)/g, '$1 '); });
  $('#cc-val').addEventListener('input', (e) => { const d = so(e.target.value, 4); e.target.value = d.length > 2 ? d.slice(0, 2) + '/' + d.slice(2) : d; });
  $('#cc-cvv').addEventListener('input', (e) => { e.target.value = so(e.target.value, 4); });

  // QR Code desenhado como SVG a partir da matriz de módulos (sem innerHTML)
  function desenharQr(texto, alvo = '#qr') {
    const qr = window.qrcode(0, 'M'); qr.addData(texto); qr.make();
    const n = qr.getModuleCount(), margem = 2, NS = 'http://www.w3.org/2000/svg';
    const svg = document.createElementNS(NS, 'svg'); svg.setAttribute('viewBox', `0 0 ${n + margem * 2} ${n + margem * 2}`); svg.setAttribute('shape-rendering', 'crispEdges');
    let d = ''; for (let r = 0; r < n; r++) for (let c = 0; c < n; c++) if (qr.isDark(r, c)) d += `M${c + margem} ${r + margem}h1v1h-1z`;
    const fundo = document.createElementNS(NS, 'rect'); fundo.setAttribute('width', '100%'); fundo.setAttribute('height', '100%'); fundo.setAttribute('fill', '#fff');
    const p = document.createElementNS(NS, 'path'); p.setAttribute('d', d); p.setAttribute('fill', '#000');
    svg.append(fundo, p); $(alvo).replaceChildren(svg);
  }

  let plano = null, timer = 0, falhasSeguidas = 0, metodo = 'pix', metodos = { pix: false, cartao: false }, cupom = null;
  // período: mensal (1 mês), trimestral (3 meses) ou vitalício (pagamento único, não vence); o preço de cada um vem do servidor
  const CICLOS = { mensal: [' /mês', 1], trimestral: [' /3 meses', 3], vitalicio: [' pagamento único', 0] };
  let ciclo = CICLOS[new URLSearchParams(location.search).get('ciclo')] ? new URLSearchParams(location.search).get('ciclo') : 'mensal';
  const precoCiclo = () => (plano.precos && plano.precos[ciclo]) || plano.preco_centavos;
  const precoAtual = () => (cupom ? cupom.preco_final_centavos : precoCiclo());
  // cupom de desconto: validado no servidor; o preço cobrado é sempre o calculado lá (o do período escolhido)
  function mostrarPreco() {
    $('#r-preco').textContent = reais(precoAtual());
    $('#r-per').textContent = CICLOS[ciclo][0];
    const cheio = ciclo === 'trimestral' ? plano.preco_centavos * 3 : precoCiclo();
    const de = $('#r-de'); de.hidden = !(cupom || cheio > precoCiclo()); de.textContent = reais(cupom ? precoCiclo() : cheio);
    const eq = $('#r-equiv'); eq.hidden = ciclo === 'mensal';
    if (ciclo === 'trimestral') eq.textContent = `Sai por ${reais(Math.round(precoAtual() / 3))} por mês.${cheio > precoAtual() ? ` Você economiza ${reais(cheio - precoAtual())} nos 3 meses.` : ''}`;
    if (ciclo === 'vitalicio') eq.textContent = 'Paga uma vez e usa para sempre. As atualizações vêm junto.';
    $('#r-regra').textContent = { mensal: 'Vale por 1 mês, com tudo liberado. Para continuar depois, é só pagar de novo: o novo mês soma ao que já existe. Depois de pagar, abra o app e entre com o mesmo e-mail e senha.', trimestral: 'Vale por 3 meses, com tudo liberado, numa cobrança só. Para continuar depois, é só pagar de novo. Depois de pagar, abra o app e entre com o mesmo e-mail e senha.', vitalicio: 'Pagamento único, com tudo liberado e sem vencimento. Depois de pagar, abra o app e entre com o mesmo e-mail e senha.' }[ciclo];
    document.querySelectorAll('#ck-ciclo button').forEach((b) => b.setAttribute('aria-checked', String(b.dataset.ciclo === ciclo)));
    if (metodo === 'cartao') $('#gerar').textContent = `Pagar ${reais(precoAtual())} no cartão`;
  }
  document.querySelectorAll('#ck-ciclo button').forEach((b) => b.addEventListener('click', () => {
    if (ciclo === b.dataset.ciclo || !plano) return;
    ciclo = b.dataset.ciclo;
    history.replaceState(null, '', '/orion/checkout?plano=' + encodeURIComponent(plano.id) + (ciclo !== 'mensal' ? '&ciclo=' + ciclo : ''));
    if (cupom) aplicarCupom(cupom.codigo, true); else mostrarPreco();
    ajustarPixAuto();
  }));
  function ajustarPixAuto() {
    const b = document.querySelector('#metodos [data-m="pixauto"]'); if (!b) return;
    const pode = ciclo !== 'vitalicio';
    b.disabled = !pode; b.title = pode ? '' : 'O vitalício é um pagamento único: use o PIX.';
    if (!pode && metodo === 'pixauto') trocarMetodo('pix');
  }
  async function aplicarCupom(codigo, silencioso) {
    const msg = $('#cupom-msg'); msg.hidden = true;
    if (!codigo) { cupom = null; mostrarPreco(); return; }
    try {
      cupom = await api('/api/cupons/validar', 'POST', { plano: plano.id, codigo, ciclo });
      msg.className = 'ck-cupom-msg ok'; msg.textContent = `Cupom ${cupom.codigo} aplicado: ${cupom.descricao} (−${reais(cupom.desconto_centavos)}).`; msg.hidden = false;
      $('#cupom').value = cupom.codigo;
    } catch (e) { cupom = null; if (e.message !== 'login' && !silencioso) { msg.className = 'ck-cupom-msg erro'; msg.textContent = e.message; msg.hidden = false; } }
    mostrarPreco();
  }
  $('#cupom-abrir').addEventListener('click', () => { $('#cupom-caixa').hidden = false; $('#cupom-abrir').hidden = true; $('#cupom').focus(); });
  $('#cupom-aplicar').addEventListener('click', () => aplicarCupom($('#cupom').value.trim()));
  $('#cupom').addEventListener('keydown', (e) => { if (e.key === 'Enter') { e.preventDefault(); aplicarCupom($('#cupom').value.trim()); } });
  const parar = () => clearInterval(timer);
  function encerrar(msg, voltarAoForm) {
    parar();
    for (const id of ['#status', '#status2']) { const s = $(id); if (s) { s.replaceChildren(el('span', { text: msg })); s.style.color = 'var(--err)'; } }
    if (voltarAoForm) { $('#proc').hidden = true; $('#form').hidden = false; mostrarErro(msg); }
  }
  function acompanhar(id) {
    parar(); falhasSeguidas = 0;
    timer = setInterval(async () => {
      try {
        const r = await api('/api/pagamentos/' + id); falhasSeguidas = 0;
        if (r.status === 'pago') {
          parar(); for (const b of ['#pix', '#proc', '#form']) $(b).hidden = true; $('#ok').hidden = false;
          $('#ok-texto').textContent = `O plano ${r.plano.nome} da sua conta está ativo${r.expira_em ? ' até ' + data(r.expira_em) : ''}. Abra o app e entre com o seu e-mail e senha: ele já enxerga o novo plano.`;
          if (window.ORION_MKT) window.ORION_MKT.evento('compra', { valor: r.valor_centavos / 100, id: r.id, plano: r.plano.nome });
        } else if (r.status === 'recusado') encerrar(r.metodo === 'cartao' ? 'O banco recusou o pagamento. Confira os dados ou tente outro cartão.' : 'O pagamento foi recusado. Gere um novo PIX para tentar de novo.', r.metodo === 'cartao');
        else if (r.status === 'divergente') encerrar('O valor pago não bate com o plano. Fale com o suporte informando este pagamento.');
        else if (r.status === 'reembolsado') encerrar('Este pagamento foi reembolsado.');
      } catch (e) { if (e.message !== 'login' && ++falhasSeguidas > 6) encerrar('Perdi a conexão com o servidor. Recarregue a página para ver se o pagamento já foi confirmado.'); }
    }, 4000);
  }
  function mostrarPix(r) {
    $('#form').hidden = true; $('#pix').hidden = false;
    desenharQr(r.pix_code); $('#codigo').textContent = r.pix_code;
    $('#copiar').addEventListener('click', () => navigator.clipboard.writeText(r.pix_code).then(() => { $('#copiar').textContent = 'Copiado'; setTimeout(() => { $('#copiar').textContent = 'Copiar'; }, 1600); }).catch(() => {}));
    acompanhar(r.id);
  }

  // ---------- Pix Automático: QR de autorização (uma vez) e acompanhamento até o primeiro débito
  function mostrarPixAuto(r) {
    $('#form').hidden = true; $('#pixauto').hidden = false;
    const desenhar = (x) => { if (!x.qr_code || $('#codigo-pa').dataset.codigo === x.qr_code) return; $('#codigo-pa').dataset.codigo = x.qr_code; desenharQr(x.qr_code, '#qr-pa'); $('#codigo-pa').textContent = x.qr_code; $('#copiar-pa').disabled = false; };
    desenhar(r);
    $('#copiar-pa').addEventListener('click', () => navigator.clipboard.writeText($('#codigo-pa').dataset.codigo || '').then(() => { $('#copiar-pa').textContent = 'Copiado'; setTimeout(() => { $('#copiar-pa').textContent = 'Copiar'; }, 1600); }).catch(() => {}));
    const st = (txt) => $('#status-pa').replaceChildren(el('i'), el('span', { text: txt }));
    parar(); falhasSeguidas = 0;
    timer = setInterval(async () => {
      try {
        const x = await api('/api/pagamentos/pix-automatico/' + r.id); falhasSeguidas = 0;
        desenhar(x);
        if (x.status === 'aguardando_pagamento') st('Autorizado no banco. Aguardando o primeiro débito…');
        else if (x.status === 'ativo') {
          parar(); for (const b of ['#pixauto', '#form']) $(b).hidden = true; $('#ok').hidden = false;
          $('#ok-texto').textContent = `Pix Automático ligado: o Premium da sua conta está ativo${x.expira_em ? ' até ' + data(x.expira_em) : ''} e renova sozinho a cada ${x.ciclo === 'trimestral' ? '3 meses' : 'mês'}. Para cancelar, use Minha conta. Abra o app e entre com o seu e-mail e senha.`;
          if (window.ORION_MKT) window.ORION_MKT.evento('compra', { valor: x.valor_centavos / 100, id: x.id, plano: plano.nome });
        } else if (x.status === 'cancelado') { parar(); $('#status-pa').replaceChildren(el('span', { text: 'A autorização foi cancelada. Volte e escolha de novo a forma de pagamento.' })); $('#status-pa').style.color = 'var(--err)'; }
      } catch (e) { if (e.message !== 'login' && ++falhasSeguidas > 6) { parar(); st('Perdi a conexão com o servidor. Recarregue a página: a sua assinatura continua valendo.'); } }
    }, 4000);
  }

  // ---------- cartão
  async function tokenizar() {
    const num = so($('#cc-num').value, 19), [mm, aa] = $('#cc-val').value.split('/');
    const nomeCartao = $('#cc-nome').value.trim() || $('#nome').value.trim(), cvv = so($('#cc-cvv').value, 4);
    if (num.length < 13) throw new Error('Confira o número do cartão.');
    if (!/^(0[1-9]|1[0-2])$/.test(mm || '') || !/^\d{2}$/.test(aa || '')) throw new Error('Confira a validade do cartão (MM/AA).');
    if (cvv.length < 3) throw new Error('Confira o código de segurança (CVV).');
    let r;
    try {
      r = await fetch(metodos.api_base.replace(/\/+$/, '') + '/api/public/v1/card-tokens', { method: 'POST', headers: { 'Content-Type': 'application/json', 'X-Public-Key': metodos.chave_publica }, body: JSON.stringify({ card: { number: num, holder_name: nomeCartao, expiry_month: mm, expiry_year: '20' + aa, cvv } }) });
    } catch { throw new Error('Não consegui falar com o processador de cartões. Tente de novo ou use o PIX.'); }
    // os dados saem do formulário assim que viram token
    for (const id of ['#cc-num', '#cc-cvv', '#cc-val']) $(id).value = '';
    const j = await r.json().catch(() => ({}));
    if (r.status === 201 && j.data?.token) return { token: j.data.token, brand: j.data.brand, last4: j.data.last4, bin: num.slice(0, 6), mm, ano: '20' + aa };
    if (r.status === 422) throw new Error('Cartão inválido: confira número, validade e CVV.');
    if (r.status === 429) throw new Error('Muitas tentativas seguidas. Aguarde um minuto e tente de novo.');
    throw new Error('O pagamento por cartão não está disponível neste endereço agora. Use o PIX ou fale com o suporte.');
  }

  function trocarMetodo(m) {
    metodo = m;
    document.querySelectorAll('#metodos button').forEach((b) => b.setAttribute('aria-selected', String(b.dataset.m === m)));
    $('#campos-cartao').hidden = m !== 'cartao';
    $('#pa-nota').hidden = m !== 'pixauto';
    document.querySelector('.ck-cupom').hidden = m === 'pixauto'; // o Pix Automático cobra o preço do plano (sem cupom)
    $('#gerar').textContent = m === 'cartao' ? `Pagar ${reais(precoAtual())} no cartão` : m === 'pixauto' ? 'Assinar com Pix Automático' : 'Gerar PIX';
    mostrarErro('');
  }
  document.querySelectorAll('#metodos button').forEach((b) => b.addEventListener('click', () => trocarMetodo(b.dataset.m)));

  $('#form').addEventListener('submit', async (e) => {
    e.preventDefault(); mostrarErro(''); const b = $('#gerar'); b.disabled = true; const antes = b.textContent; b.textContent = metodo === 'cartao' ? 'Processando…' : 'Gerando…';
    try {
      const base = { plano: plano.id, ciclo, nome: $('#nome').value.trim(), cpf: $('#cpf').value, telefone: $('#tel').value, utm: window.ORION_MKT ? window.ORION_MKT.utm() : undefined, cupom: cupom ? cupom.codigo : undefined };
      if (window.ORION_MKT) window.ORION_MKT.evento('iniciar_compra', { valor: precoAtual() / 100, plano: plano.nome });
      if (metodo === 'pixauto') {
        const { cupom: _semCupom, ...semCupom } = base;
        mostrarPixAuto(await api('/api/pagamentos/pix-automatico', 'POST', semCupom));
      } else if (metodo === 'cartao') {
        const t = await tokenizar();
        const r = await api('/api/pagamentos/cartao', 'POST', { ...base, token: t.token, bin: t.bin, last4: t.last4, brand: t.brand, expiry_month: t.mm, expiry_year: t.ano });
        $('#form').hidden = true; $('#proc').hidden = false; acompanhar(r.id);
      } else mostrarPix(await api('/api/pagamentos/pix', 'POST', base));
    } catch (err) { if (err.message !== 'login') mostrarErro(err.message); }
    b.disabled = false; b.textContent = antes;
  });

  (async () => {
    const id = new URLSearchParams(location.search).get('plano') || '';
    try {
      const [{ planos }, ms, eu] = await Promise.all([fetch('/api/comercial/planos').then((r) => r.json()), fetch('/api/pagamentos/metodos').then((r) => r.json()), api('/api/conta/eu')]);
      plano = planos.find((p) => p.id === id); metodos = ms;
      if (!plano || plano.preco_centavos <= 0) { location.replace('../#planos'); return; }
      // só aparecem os períodos que estão à venda
      document.querySelectorAll('#ck-ciclo button').forEach((b) => { b.hidden = !(plano.precos && plano.precos[b.dataset.ciclo] > 0); });
      if (!(plano.precos && plano.precos[ciclo] > 0)) ciclo = 'mensal';
      $('#r-nome').textContent = 'Plano ' + plano.nome; $('#r-selo').hidden = !plano.limites?.recomendado; mostrarPreco();
      $('#r-lista').replaceChildren(...(plano.destaques || []).map((d) => el('li', /^✕/.test(d) ? { class: 'nao' } : {}, el('span', { text: d.replace(/^✕\s*/, '') }))));
      $('#nome').value = eu.usuario?.nome || '';
      if (!ms.pix && !ms.cartao) { $('#form').hidden = true; $('#indisponivel').hidden = false; return; }
      // cartão em análise na SyncPayments: a aba aparece desativada com "em breve" (o PIX segue normal)
      $('#metodos').hidden = !ms.pix && !ms.cartao;
      if (!ms.cartao) { const bc = document.querySelector('#metodos [data-m="cartao"]'); if (bc) { bc.disabled = true; bc.setAttribute('aria-disabled', 'true'); bc.title = 'O pagamento com cartão chega em breve. Por enquanto, use o PIX.'; bc.append(el('small', { class: 'ck-breve', text: 'em breve' })); } }
      // Pix Automático: aparece quando o dono liga (e a SyncPayments liberou); só no mensal e no trimestral
      const bpa = document.querySelector('#metodos [data-m="pixauto"]'); if (bpa) bpa.hidden = !ms.pix_automatico;
      trocarMetodo(new URLSearchParams(location.search).get('metodo') === 'pixauto' && ms.pix_automatico && ciclo !== 'vitalicio' ? 'pixauto' : ms.pix ? 'pix' : 'cartao');
      ajustarPixAuto();
      const cupomUrl = new URLSearchParams(location.search).get('cupom');
      if (cupomUrl) { $('#cupom-caixa').hidden = false; $('#cupom-abrir').hidden = true; await aplicarCupom(cupomUrl.trim(), false); }
      if (window.ORION_MKT) window.ORION_MKT.evento('ver_checkout', { valor: precoCiclo() / 100, plano: plano.nome });
    } catch (e) { if (e.message !== 'login') mostrarErro(e.message); }
  })();
})();
