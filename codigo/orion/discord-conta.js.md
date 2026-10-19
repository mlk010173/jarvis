# `orion/discord-conta.js`

> **Fonte:** https://assistanceorion.cloud/orion/discord-conta.js · baixado em 19/10/2026
> 111 linhas · 8.9 KB · Vínculo Discord (/api/conta/discord*)

```javascript
'use strict';
// "Sincronizar com Discord": o mesmo cartão em Minha conta (site), no ORION Web e nas Configurações do app.
// Conecta a conta ORION ao Discord pela tela de autorização do próprio Discord e mostra os cargos que o plano dá no servidor.
//   ORION_DISCORD_CONTA.montar(alvo, { rotas, oauth | conectar(), classes, selo, avisosDaUrl })
(() => {
  if (window.ORION_DISCORD_CONTA) return;
  const el = (tag, attrs = {}, ...filhos) => { const e = document.createElement(tag); for (const [k, v] of Object.entries(attrs)) { if (v == null || v === false) continue; if (k === 'class') e.className = v; else if (k === 'text') e.textContent = v; else e.setAttribute(k, v === true ? '' : v); } for (const f of filhos) if (f != null && f !== false) e.append(f); return e; };
  const SITE = { estado: '/api/conta/discord', codigo: '/api/conta/discord/codigo', sincronizar: '/api/conta/discord/sincronizar', desvincular: '/api/conta/discord' };
  const NOME_PLANO = { free: 'Free', basic: 'Basic', premium: 'Premium' };
  const LOGO = 'M20.32 4.37a19.8 19.8 0 0 0-4.89-1.52.07.07 0 0 0-.08.04c-.21.38-.44.87-.61 1.25a18.3 18.3 0 0 0-5.49 0 12.6 12.6 0 0 0-.62-1.25.08.08 0 0 0-.08-.04 19.7 19.7 0 0 0-4.89 1.52.07.07 0 0 0-.03.03C.53 9.05-.32 13.58.1 18.06a.08.08 0 0 0 .03.06 19.9 19.9 0 0 0 5.99 3.03.08.08 0 0 0 .08-.03c.46-.63.87-1.3 1.23-1.99a.08.08 0 0 0-.04-.11 13.1 13.1 0 0 1-1.87-.89.08.08 0 0 1-.01-.13l.37-.29a.07.07 0 0 1 .08-.01c3.93 1.79 8.18 1.79 12.07 0a.07.07 0 0 1 .08.01l.37.29a.08.08 0 0 1-.01.13c-.6.35-1.22.65-1.87.89a.08.08 0 0 0-.04.11c.36.7.77 1.36 1.23 1.99a.08.08 0 0 0 .08.03 19.8 19.8 0 0 0 6-3.03.08.08 0 0 0 .03-.06c.5-5.18-.84-9.67-3.55-13.66a.06.06 0 0 0-.03-.03zM8.02 15.33c-1.18 0-2.16-1.08-2.16-2.42s.96-2.42 2.16-2.42c1.21 0 2.18 1.09 2.16 2.42 0 1.34-.96 2.42-2.16 2.42zm7.97 0c-1.18 0-2.16-1.08-2.16-2.42s.96-2.42 2.16-2.42c1.21 0 2.18 1.09 2.16 2.42 0 1.34-.95 2.42-2.16 2.42z';
  const logo = (cls) => { const s = document.createElementNS('http://www.w3.org/2000/svg', 'svg'); s.setAttribute('viewBox', '0 0 24 24'); s.setAttribute('aria-hidden', 'true'); s.setAttribute('class', cls); const p = document.createElementNS('http://www.w3.org/2000/svg', 'path'); p.setAttribute('d', LOGO); p.setAttribute('fill', 'currentColor'); s.append(p); return s; };

  function montar(alvo, opcoes = {}) {
    const rotas = { ...SITE, ...(opcoes.rotas || {}) };
    const cls = { btn: 'btn', pri: 'btn btn-primary', perigo: 'btn btn-sm btn-danger', ...(opcoes.classes || {}) };
    const selo = opcoes.selo || null;
    let estado = null, sonda = 0, relogio = 0;

    async function api(url, metodo = 'GET') {
      const r = await fetch(url, { method: metodo, headers: metodo === 'GET' ? {} : { 'Content-Type': 'application/json' }, body: metodo === 'GET' ? undefined : '{}', credentials: 'same-origin' });
      const j = await r.json().catch(() => ({}));
      if (r.status === 401 && opcoes.aoSairDaConta) opcoes.aoSairDaConta();
      if (!r.ok) throw new Error(j.erro || 'Erro ' + r.status);
      return j;
    }
    const msg = el('p', { class: 'dc-msg', role: 'status', 'aria-live': 'polite' });
    const dizer = (t, tipo) => { msg.className = 'dc-msg' + (tipo ? ' dc-' + tipo : ''); msg.textContent = t || ''; };
    const chips = (e) => el('div', { class: 'dc-cargos' },
      el('span', { class: 'dc-cargos-rot', text: `Plano ${NOME_PLANO[e.plano] || e.plano}${e.vinculado ? '' : ' dá'}:` }),
      ...e.cargos.map((c) => el('span', { class: 'dc-chip' + (/Cliente|Premium/.test(c) ? ' dc-chip-forte' : ''), text: c })));
    const servidor = (e) => el('a', { class: cls.btn, href: e.convite, target: '_blank', rel: 'noopener', text: 'Abrir o servidor' });

    function pintarSelo(e) {
      if (!selo) return;
      selo.textContent = e.vinculado ? 'vinculado' : 'não vinculado';
      selo.className = 'badge' + (e.vinculado ? ' badge-ok' : '');
    }
    function parar() { clearInterval(sonda); clearInterval(relogio); clearTimeout(relogio); sonda = relogio = 0; }

    function desenhar(e) {
      estado = e; pintarSelo(e);
      const corpo = [];
      if (e.vinculado) {
        const desde = e.desde ? new Date(e.desde).toLocaleDateString('pt-BR') : '';
        corpo.push(el('div', { class: 'dc-vinc' }, el('span', { class: 'dc-av' }, logo('dc-av-ic')),
          el('div', {}, el('b', { text: e.discord_nome ? `Vinculado como ${e.discord_nome}` : 'Conta do Discord vinculada' }),
            el('span', { class: 'dc-sub', text: [desde && `desde ${desde}`, /^oauth/.test(e.metodo || '') ? 'pela autorização do Discord' : e.metodo === 'codigo' ? 'por código' : ''].filter(Boolean).join(', ') }))));
        corpo.push(chips(e));
        const sinc = el('button', { type: 'button', class: cls.pri, text: 'Sincronizar com Discord' });
        const sair = el('button', { type: 'button', class: cls.perigo, text: 'Desvincular' });
        sinc.addEventListener('click', async () => {
          sinc.disabled = true; dizer('Conferindo os seus cargos…');
          try { const r = await api(rotas.sincronizar, 'POST'); desenhar(r); dizer(r.bot ? 'Cargos sincronizados com o seu plano.' : 'Vínculo salvo. O bot confere os cargos em poucos minutos.', 'ok'); }
          catch (err) { dizer(err.message, 'erro'); }
          sinc.disabled = false;
        });
        sair.addEventListener('click', async () => {
          if (!confirm('Desvincular a conta do Discord? Os cargos do plano saem do seu perfil no servidor.')) return;
          sair.disabled = true;
          try { desenhar(await api(rotas.desvincular, 'DELETE')); dizer('Conta do Discord desvinculada.', 'ok'); }
          catch (err) { dizer(err.message, 'erro'); sair.disabled = false; }
        });
        corpo.push(el('div', { class: 'dc-acoes' }, sinc, servidor(e), sair));
      } else {
        // um caminho só: a tela de autorização do próprio Discord (como os apps autorizados). Ao voltar, a conta já está vinculada.
        const conectar = opcoes.conectar
          ? el('button', { type: 'button', class: cls.pri + ' dc-entrar' }, logo('dc-ic'), document.createTextNode('Conectar com o Discord'))
          : el('a', { class: cls.pri + ' dc-entrar', href: opcoes.oauth || '/discord/verificar?vincular=1' }, logo('dc-ic'), document.createTextNode('Conectar com o Discord'));
        if (opcoes.conectar) conectar.addEventListener('click', async () => {
          conectar.disabled = true; dizer('Abrindo o Discord no navegador…');
          try {
            await opcoes.conectar();
            dizer('Autorize no Discord e volte aqui: esta tela atualiza sozinha quando a conta for conectada.');
            parar(); sonda = setInterval(async () => { try { const x = await api(rotas.estado); if (x.vinculado) { parar(); desenhar(x); dizer('Pronto: conta conectada e cargos entregues no servidor.', 'ok'); } } catch { /* tenta de novo */ } }, 4000);
            relogio = setTimeout(parar, 10 * 60000);
          } catch (err) { dizer(err.message, 'erro'); }
          conectar.disabled = false;
        });
        corpo.push(el('div', { class: 'dc-grade dc-uma' }, el('div', { class: 'dc-opcao' }, el('b', { text: 'Conectar a conta do Discord' }),
          el('p', { text: 'Você autoriza o ORION na tela oficial do Discord (nome, e-mail e entrar no servidor) e já entra no servidor com os cargos do seu plano. Dá para remover a autorização quando quiser em Configurações → Aplicativos autorizados, no Discord.' }), conectar)), chips(e));
      }
      corpo.push(msg);
      alvo.replaceChildren(...corpo);
    }

    async function carregar() {
      try { desenhar(await api(rotas.estado)); }
      catch (err) { if (selo) { selo.textContent = 'indisponível'; selo.className = 'badge'; } alvo.replaceChildren(el('p', { class: 'dc-msg dc-erro', text: err.message })); }
    }
    // volta do login do Discord (?discord=ok|erro|codigo)
    if (opcoes.avisosDaUrl) {
      const u = new URL(location.href), d = u.searchParams.get('discord');
      if (d) {
        const m = u.searchParams.get('m');
        setTimeout(() => dizer(d === 'ok' ? 'Conta do Discord conectada. Você já está no servidor com os cargos do seu plano.' : 'Não deu para conectar: ' + (m || 'tente de novo.'), d === 'ok' ? 'ok' : 'erro'), 400);
        u.searchParams.delete('discord'); u.searchParams.delete('m'); history.replaceState(null, '', u.pathname + (u.search || '') + u.hash);
      }
    }
    carregar();
    return { recarregar: carregar, estado: () => estado };
  }
  window.ORION_DISCORD_CONTA = { montar };

  // Minha conta (site): monta sozinho na seção #discord
  const sec = document.getElementById('discord');
  if (sec && sec.querySelector('[data-corpo]') && /\/orion\/conta/.test(location.pathname)) {
    montar(sec.querySelector('[data-corpo]'), { oauth: '/discord/verificar', selo: document.getElementById('dc-selo'), avisosDaUrl: true, aoSairDaConta: () => { location.href = '/entrar?volta=/orion/conta%23discord'; } });
    if (location.hash === '#discord') setTimeout(() => sec.scrollIntoView({ behavior: 'smooth', block: 'start' }), 300);
  }
})();

```
