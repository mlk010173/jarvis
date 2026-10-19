'use strict';
// Área do cliente: plano da conta e PCs conectados. Não existe chave de licença: o app entra com este mesmo e-mail e senha.
(() => {
  const $ = (s) => document.querySelector(s);
  const el = (tag, attrs = {}, ...filhos) => { const e = document.createElement(tag); for (const [k, v] of Object.entries(attrs)) { if (k === 'class') e.className = v; else if (k === 'text') e.textContent = v; else e.setAttribute(k, v); } for (const f of filhos) if (f != null) e.append(f); return e; };
  async function api(url, metodo = 'GET', corpo) {
    const r = await fetch(url, { method: metodo, headers: corpo ? { 'Content-Type': 'application/json' } : {}, body: corpo ? JSON.stringify(corpo) : undefined, credentials: 'same-origin' });
    const j = await r.json().catch(() => ({}));
    if (r.status === 401) { location.href = '../entrar?volta=/orion/conta'; throw new Error('login'); }
    if (!r.ok) throw new Error(j.erro || 'Erro ' + r.status);
    return j;
  }
  const MOD = { editor: 'Editor de vídeo', transcritor: 'Transcritor', roteiros: 'Roteiros', mapa: 'Mapeamento de Leads', central: 'Central de automação' };
  const data = (s) => (s ? new Date(s).toLocaleDateString('pt-BR') : 'sem vencimento');
  const aviso = (msg, erro) => {
    const a = el('div', { class: 'alert ' + (erro ? 'alert-err' : 'alert-ok'), style: 'margin-bottom:14px', text: msg });
    $('#area').prepend(a); setTimeout(() => a.remove(), 6000);
  };

  async function carregar() {
    const [eu, ass] = await Promise.all([api('/api/conta/eu'), api('/api/conta/assinatura')]);
    // conta nova que ainda não fez a configuração inicial: primeiro configura, depois vê as informações
    if (eu.configurado === false && !new URLSearchParams(location.search).has('pular')) { location.replace('comecar.html'); return; }
    $('#ola').textContent = `Olá, ${eu.nome || eu.usuario?.nome || ''}. Aqui estão o plano da sua conta e os PCs conectados a ela.`;
    const area = $('#area'); area.replaceChildren();
    const l = ass.limites || {};

    // plano da conta
    const plano = el('div', { class: 'lic-card' });
    plano.append(el('div', { class: 'lic-head' }, el('h2', { text: `Plano ${ass.plano.nome}` }), el('span', { class: 'badge ' + (ass.plano.pago ? 'badge-ok' : ''), text: ass.plano.pago ? 'ativo' : 'grátis' })));
    plano.append(el('div', { class: 'lic-meta', text: ass.plano.pago ? `${ass.expira_em ? 'Vence em ' + data(ass.expira_em) : 'Vitalício, não vence'} · até ${ass.max_pcs} PC${ass.max_pcs > 1 ? 's' : ''}` : `Sem cartão e sem vencimento · ${ass.max_pcs} PC por vez` }));
    plano.append(el('ul', { class: 'conta-lista' },
      el('li', { text: 'Módulos: ' + ((l.modulos || []).map((m) => MOD[m] || m).join(', ') || '—') }),
      el('li', { text: 'IAs ao mesmo tempo: ' + (l.ias_max ? l.ias_max : 'sem limite') }),
      el('li', { text: 'Exportação de vídeo: ' + ({ '720p': 'até 720p com marca d’água', '1080p': 'até 1080p', '4k': '4K ilimitada' }[l.export_max] || '—') })));
    const acoes = el('div', { class: 'actions', style: 'margin-top:14px' });
    if (ass.plano.id !== 'premium') acoes.append(el('a', { class: 'btn btn-primary', href: '../#planos', text: ass.plano.pago ? 'Mudar de plano' : 'Fazer upgrade' }));
    // mensal ou trimestral: renova (soma ao que falta) ou passa para o vitalício; o vitalício não precisa de nada
    if (ass.plano.pago && ass.expira_em) acoes.append(el('a', { class: 'btn', href: '/orion/checkout?plano=' + encodeURIComponent(ass.plano.id), text: 'Renovar ou mudar o período' }), el('a', { class: 'btn', href: '/orion/checkout?plano=' + encodeURIComponent(ass.plano.id) + '&ciclo=vitalicio', text: 'Passar para o vitalício' }));
    plano.append(acoes);
    // renovação automática (Pix Automático): mostra o estado e deixa cancelar; o plano vale até o fim do período já pago
    fetch('/api/pagamentos/pix-automatico', { credentials: 'same-origin' }).then((r) => (r.ok ? r.json() : null)).then((pa) => {
      const a = pa && pa.assinatura;
      if (a && ['ativo', 'atrasado', 'aguardando_pagamento'].includes(a.status)) {
        const nomeEstado = { ativo: 'ligada', atrasado: 'com o débito atrasado (o banco ainda vai tentar de novo)', aguardando_pagamento: 'autorizada, aguardando o primeiro débito' }[a.status];
        const caixa = el('div', { class: 'conta-pa', style: 'margin-top:14px' }, el('p', { class: 'hint', text: `Renovação automática por Pix Automático (${a.ciclo === 'trimestral' ? 'a cada 3 meses' : 'todo mês'}): ${nomeEstado}.` }));
        const bt = el('button', { class: 'btn', type: 'button', text: 'Cancelar a renovação automática' });
        bt.addEventListener('click', async () => {
          if (!confirm('Cancelar a renovação automática? O Premium continua valendo até o fim do período já pago.')) return;
          bt.disabled = true;
          try { const r = await fetch('/api/pagamentos/pix-automatico/' + encodeURIComponent(a.id) + '/cancelar', { method: 'POST', credentials: 'same-origin' }); if (!r.ok) throw new Error((await r.json().catch(() => ({}))).erro || 'Não consegui cancelar agora.'); caixa.replaceChildren(el('p', { class: 'hint', text: 'Renovação automática cancelada. O Premium vale até o fim do período já pago.' })); }
          catch (e) { bt.disabled = false; alert(e.message); }
        });
        caixa.append(bt); plano.append(caixa);
      } else if (pa && pa.disponivel && ass.plano.pago && ass.expira_em) {
        plano.append(el('p', { class: 'hint', style: 'margin-top:12px' }, 'Quer que renove sozinho? ', el('a', { href: '/orion/checkout?plano=' + encodeURIComponent(ass.plano.id) + '&metodo=pixauto', text: 'Ligar o Pix Automático' })));
      }
    }).catch(() => {});
    area.append(plano);

    // PCs da conta
    const pcs = el('div', { class: 'lic-card' });
    pcs.append(el('div', { class: 'lic-head' }, el('h2', { text: `PCs conectados (${ass.pcs.length} de ${ass.max_pcs})` })));
    const ul = el('ul', { class: 'pc-list' });
    if (!ass.pcs.length) ul.append(el('li', { text: 'Nenhum PC conectado ainda. Instale o app e entre com este e-mail e senha.' }));
    for (const d of ass.pcs) {
      const rm = el('button', { class: 'btn btn-sm btn-danger', type: 'button', text: 'Liberar este PC' });
      rm.disabled = !ass.pode_liberar_pc;
      rm.addEventListener('click', async () => { if (!confirm('Liberar este PC? Você só pode fazer isso 1 vez a cada 30 dias e o app dele precisará entrar de novo.')) return; try { await api(`/api/conta/pcs/${d.id}/liberar`, 'POST', {}); await carregar(); } catch (e) { aviso(e.message, true); } });
      ul.append(el('li', {}, el('span', { text: `${d.nome_pc || 'PC sem nome'} · conectado em ${data(d.criado_em)} · visto ${data(d.ultimo_contato)}` }), rm));
    }
    pcs.append(ul);
    if (!ass.pode_liberar_pc && ass.pcs.length) pcs.append(el('p', { class: 'hint', style: 'margin-top:10px', text: 'A troca de PC já foi usada nos últimos 30 dias. Precisa trocar antes? Fale com o suporte.' }));
    area.append(pcs);
  }
  $('#sair').addEventListener('click', async (e) => { e.preventDefault(); try { await api('/api/conta/sair', 'POST', {}); } catch {} location.href = '../'; });
  carregar().catch((e) => { if (e.message !== 'login') $('#ola').textContent = e.message; });
})();
