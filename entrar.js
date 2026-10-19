'use strict';
document.addEventListener('DOMContentLoaded', async () => {
  // Já está logado? Não redireciona sozinho: mostra quem está conectado e deixa escolher (continuar, ou sair e usar outra conta).
  // A sessão é um cookie HttpOnly — só o servidor consegue encerrá-la (POST /api/conta/sair); localStorage não participa.
  const volta = (() => { const v = new URLSearchParams(location.search).get('volta') || ''; return /^\/(?!\/)[\w\-\/.]*(\?[\w\-=&.%]*)?$/.test(v) ? v : ''; })(); // só caminhos do próprio site
  try {
    const s = await api('/api/conta/sessao');
    if (s.logado) {
      document.getElementById('lg-nome').textContent = s.nome;
      document.getElementById('lg-email').textContent = s.email;
      document.getElementById('lg-continuar').href = volta || 'jarvis/conta.html';
      document.getElementById('logado').hidden = false;
      document.getElementById('lg-sair').addEventListener('click', async () => {
        try { await api('/api/conta/sair', { method: 'POST', body: {} }); } catch {}
        document.getElementById('logado').hidden = true;
        (location.hash === '#cadastro' ? document.getElementById('c-nome') : document.getElementById('e-email')).focus();
      });
    }
  } catch {}

  // entrar com Google / Discord / GitHub — cada botão só aparece quando o servidor tem o provedor configurado.
  // Nada de link fixo para fora do site: o destino vem sempre do backend (window.JARVIS_API).
  const qs = new URLSearchParams(location.search);
  const ERROS = { google: 'g-erro', discord: 'd-erro', github: 'gh-erro' };
  const iniciar = (prov) => (window.JARVIS_API || '') + '/api/conta/' + prov + '/iniciar' + (volta ? '?volta=' + encodeURIComponent(volta) : '');
  for (const prov of ['google', 'discord', 'github']) {
    const el = document.getElementById(prov);
    if (!el) continue;
    try {
      const r = await api('/api/conta/' + prov + '/ativo');
      if (r && r.ativo && window.JARVIS_API) {
        el.hidden = false;
        el.href = iniciar(prov);
        // vindo do app pelo botão do provedor: segue direto para a tela dele
        if (qs.get(prov) === '1' && qs.get('erro') !== prov) { location.href = el.href; return; }
      }
    } catch { /* backend fora do ar: o botão fica escondido; o e-mail continua funcionando */ }
  }
  const erroProv = qs.get('erro');
  if (erroProv && ERROS[erroProv]) document.getElementById(ERROS[erroProv]).hidden = false;
  // volta do OAuth: troca o código de uso único por uma sessão de verdade
  if (qs.get('oauth') && qs.get('codigo')) {
    try {
      const r = await api('/api/conta/oauth/resgatar', { method: 'POST', body: { codigo: qs.get('codigo') } });
      try { localStorage.setItem('jarvis.sessao', r.token); } catch { /* sem armazenamento */ }
      location.href = volta || 'jarvis/conta.html'; return;
    } catch { const d = document.getElementById(ERROS[qs.get('oauth')] || 'g-erro'); if (d) d.hidden = false; }
  }
  const fe = document.getElementById('form-entrar');
  const fc = document.getElementById('form-cadastro');
  const ae = document.getElementById('aba-entrar');
  const ac = document.getElementById('aba-cadastro');
  const mostrar = (cad) => {
    fe.hidden = cad; fc.hidden = !cad;
    ae.classList.toggle('ativa', !cad); ac.classList.toggle('ativa', cad);
    ae.setAttribute('aria-selected', String(!cad)); ac.setAttribute('aria-selected', String(cad));
    const abas = document.querySelector('.au-abas'); if (abas) abas.dataset.lado = cad ? 'cadastro' : 'entrar';
    const t = document.getElementById('au-titulo'), sub = document.getElementById('au-sub');
    if (t) t.textContent = cad ? 'Crie a sua conta' : 'Bem-vindo de volta';
    if (sub) sub.textContent = cad ? 'Grátis, sem cartão. Depois eu te guio na configuração, um passo de cada vez.' : 'Entre com o e-mail e a senha da sua conta JARVIS.';
    (cad ? document.getElementById('c-nome') : document.getElementById('e-email')).focus();
  };
  ae.addEventListener('click', () => { history.replaceState(null, '', '#entrar'); mostrar(false); });
  ac.addEventListener('click', () => { history.replaceState(null, '', '#cadastro'); mostrar(true); });
  mostrar(location.hash === '#cadastro');

  const enviar = (form, url, campos, erroEl) => form.addEventListener('submit', async (ev) => {
    ev.preventDefault();
    const btn = form.querySelector('button[type=submit]');
    btn.disabled = true; erroEl.textContent = '';
    try {
      const body = {};
      for (const [k, id] of Object.entries(campos)) body[k] = document.getElementById(id).value;
      // cadastro: leva a origem da visita (UTMs do anúncio) e um id do evento, que o servidor repete na Conversions API (o Meta junta os dois)
      const cadastro = url.includes('cadastro');
      const eid = cadastro ? 'cad_' + Array.from(crypto.getRandomValues(new Uint8Array(9)), (b) => (b % 36).toString(36)).join('') : null;
      if (cadastro && window.JARVIS_MKT) { body.utm = window.JARVIS_MKT.utm(); body.evento_id = eid; }
      const r = await api(url, { method: 'POST', body });
      if (r && r.verificacao) { pedirCodigo(r); btn.disabled = false; return; } // rede nova: falta o código enviado por e-mail
      if (cadastro && window.JARVIS_MKT) { window.JARVIS_MKT.evento('cadastro', { id: eid }); await new Promise((r) => setTimeout(r, 300)); } // dá tempo da tag disparar antes de sair da página
      // conta nova passa pelos primeiros passos, um de cada vez; no fim volta para onde a pessoa estava (ex.: o JARVIS Web)
      location.href = cadastro ? 'jarvis/comecar.html' + (volta && !volta.startsWith('jarvis/comecar.html') ? '?volta=' + encodeURIComponent(volta) : '') : volta || 'jarvis/conta.html';
    } catch (e) {
      erroEl.textContent = e.message;
      btn.disabled = false;
    }
  });
  // verificação de login por e-mail (só aparece quando o dono liga e a rede é nova)
  const fcod = document.getElementById('form-codigo'); let desafio = '';
  function pedirCodigo(r) {
    desafio = r.desafio;
    fe.hidden = true; fc.hidden = true; document.querySelector('.tabs').hidden = true; document.getElementById('bloco-google').hidden = true; fcod.hidden = false;
    document.getElementById('cod-msg').textContent = `Entrada de uma rede nova. Enviamos um código de 6 dígitos para ${r.email}. Ele vale por 10 minutos.`;
    document.getElementById('cod').value = ''; document.getElementById('cod').focus();
  }
  fcod.addEventListener('submit', async (ev) => {
    ev.preventDefault(); const erro = document.getElementById('cod-erro'); erro.textContent = ''; const b = fcod.querySelector('button[type=submit]'); b.disabled = true;
    try { await api('/api/conta/verificar-login', { method: 'POST', body: { desafio, codigo: document.getElementById('cod').value } }); location.href = volta || 'jarvis/conta.html'; }
    catch (e) { erro.textContent = e.message; b.disabled = false; }
  });
  document.getElementById('cod-reenviar').addEventListener('click', async () => {
    const erro = document.getElementById('cod-erro'); erro.textContent = '';
    try { const r = await api('/api/conta/reenviar-codigo', { method: 'POST', body: { desafio } }); document.getElementById('cod-msg').textContent = `Código reenviado para ${r.email}.`; } catch (e) { erro.textContent = e.message; }
  });
  // mostrar/esconder a senha
  document.querySelectorAll('[data-olho]').forEach((b) => b.addEventListener('click', () => {
    const campo = document.getElementById(b.dataset.olho); const ver = campo.type === 'password';
    campo.type = ver ? 'text' : 'password'; b.setAttribute('aria-pressed', String(ver)); b.setAttribute('aria-label', ver ? 'Esconder a senha' : 'Mostrar a senha'); campo.focus();
  }));
  // força da senha (só uma dica visual; quem decide o mínimo é o servidor)
  const cs = document.getElementById('c-senha'), forca = document.querySelector('.au-forca'), forcaTxt = document.getElementById('c-forca');
  cs?.addEventListener('input', () => {
    const v = cs.value; let n = 0;
    if (v.length >= 8) n++; if (v.length >= 12) n++; if (/[a-z]/.test(v) && /[A-Z]/.test(v)) n++; if (/\d/.test(v) && /[^\w]/.test(v)) n++;
    if (v.length < 8) n = v ? 1 : 0;
    if (forca) forca.dataset.n = String(n);
    if (forcaTxt) forcaTxt.textContent = !v ? 'Use pelo menos 8 caracteres, de preferência uma senha que você não usa em outro site.' : v.length < 8 ? `Faltam ${8 - v.length} caractere(s).` : ['', 'Fraca: aumente um pouco.', 'Razoável.', 'Boa senha.', 'Senha forte.'][n];
  });
  // o mesmo anel de energia do app
  const tela = document.getElementById('au-anel');
  if (tela && window.Orb) {
    const anel = new window.Orb(tela); anel.setModo('anel'); anel.setColor('#2E9BFF'); anel.setState('speaking');
    let t = 0; const respirar = () => { t += 0.016; anel.setLevel(0.12 + 0.1 * Math.sin(t * 1.3) + 0.06 * Math.sin(t * 3.1)); requestAnimationFrame(respirar); };
    if (!matchMedia('(prefers-reduced-motion: reduce)').matches) respirar();
  }

  // esqueci a senha: pede o link por e-mail; o link volta para cá com ?redefinir=<token>
  const fes = document.getElementById('form-esqueci'), frd = document.getElementById('form-redefinir'), abas = document.querySelector('.au-abas');
  const soEste = (form) => { const normal = form === fe || form === fc; [fe, fc, fcod, fes, frd].forEach((f) => { f.hidden = f !== form; }); if (abas) abas.hidden = !normal; document.getElementById('bloco-google').hidden = !normal; };
  document.getElementById('ir-esqueci').addEventListener('click', () => {
    soEste(fes); document.getElementById('au-titulo').textContent = 'Criar uma senha nova'; document.getElementById('au-sub').textContent = 'Sem problema: acontece com todo mundo.';
    document.getElementById('r-email').value = document.getElementById('e-email').value; document.getElementById('r-email').focus();
  });
  fes.querySelector('[data-voltar-login]').addEventListener('click', () => { soEste(fe); mostrar(false); });
  fes.addEventListener('submit', async (ev) => {
    ev.preventDefault(); const b = fes.querySelector('button[type=submit]'), erro = document.getElementById('r-erro'), okEl = document.getElementById('r-ok');
    b.disabled = true; erro.textContent = ''; okEl.hidden = true;
    try { const r = await api('/api/conta/senha/esqueci', { method: 'POST', body: { email: document.getElementById('r-email').value } }); okEl.textContent = r.msg; okEl.hidden = false; }
    catch (e) { erro.textContent = e.message; }
    b.disabled = false;
  });
  const tokenReset = new URLSearchParams(location.search).get('redefinir');
  if (tokenReset) {
    soEste(frd); document.getElementById('au-titulo').textContent = 'Senha nova'; document.getElementById('au-sub').textContent = 'Escolha uma senha que você não usa em outro site.';
    history.replaceState(null, '', location.pathname); // o token sai da barra de endereço (e do histórico)
    document.getElementById('n-senha').focus();
    frd.addEventListener('submit', async (ev) => {
      ev.preventDefault(); const b = frd.querySelector('button[type=submit]'), erro = document.getElementById('n-erro');
      const n1 = document.getElementById('n-senha').value, n2 = document.getElementById('n-senha2').value;
      erro.textContent = '';
      if (n1.length < 8) { erro.textContent = 'A senha nova precisa ter pelo menos 8 caracteres.'; return; }
      if (n1 !== n2) { erro.textContent = 'As duas senhas não são iguais.'; return; }
      b.disabled = true;
      try { await api('/api/conta/senha/redefinir', { method: 'POST', body: { token: tokenReset, nova: n1 } }); soEste(fe); mostrar(false); document.getElementById('au-sub').textContent = 'Senha nova salva. Entre com ela agora.'; }
      catch (e) { erro.textContent = e.message; b.disabled = false; }
    });
  }

  enviar(fe, '/api/conta/entrar', { email: 'e-email', senha: 'e-senha' }, document.getElementById('e-erro'));
  enviar(fc, '/api/conta/cadastro', { nome: 'c-nome', email: 'c-email', senha: 'c-senha' }, document.getElementById('c-erro'));
});
