'use strict';
// Menu em pílula compartilhado (landing e tutoriais): abrir/fechar no celular, sombra ao rolar, barra de progresso
// e botões que sabem se você está conectado (Minha conta / Sair). A sessão é um cookie HttpOnly: quem a encerra é o servidor.
(() => {
  const nav = document.getElementById('nav'), toggle = document.getElementById('nav-toggle');
  if (!nav) return;
  toggle?.addEventListener('click', () => {
    const aberto = nav.classList.toggle('is-open');
    toggle.setAttribute('aria-expanded', String(aberto));
    toggle.setAttribute('aria-label', aberto ? 'Fechar menu' : 'Abrir menu');
  });
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape') nav.classList.remove('is-open'); });
  nav.addEventListener('click', (e) => { if (e.target.closest('#nav-links a')) { nav.classList.remove('is-open'); toggle?.setAttribute('aria-expanded', 'false'); } });

  const barra = document.getElementById('scrollbar');
  let pendente = false;
  const aoRolar = () => {
    pendente = false;
    const y = window.scrollY, h = document.documentElement.scrollHeight - innerHeight;
    if (barra) barra.style.transform = `scaleX(${h > 0 ? Math.min(1, y / h) : 0})`;
    nav.classList.toggle('is-scrolled', y > 24);
  };
  addEventListener('scroll', () => { if (!pendente) { pendente = true; requestAnimationFrame(aoRolar); } }, { passive: true });
  addEventListener('resize', aoRolar, { passive: true });
  aoRolar();

  // sessão
  const entrar = document.getElementById('nav-entrar'), cta = document.getElementById('nav-cta');
  const sair = async (e) => {
    e.preventDefault();
    try { await fetch('/api/conta/sair', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{}', credentials: 'same-origin' }); } catch {}
    location.reload();
  };
  fetch('/api/conta/sessao', { credentials: 'same-origin' }).then((r) => r.json()).then((s) => {
    if (!s.logado) return;
    if (cta) { cta.textContent = 'Minha conta'; cta.href = 'conta.html'; }
    if (entrar && window.ORION_CHIP) entrar.replaceWith(window.ORION_CHIP(s));
    else if (entrar) { entrar.textContent = 'Sair'; entrar.href = '#'; entrar.addEventListener('click', sair); entrar.title = 'Conectado como ' + s.email; }
    const lista = document.getElementById('nav-links');
    if (lista) {
      const mc = document.createElement('a'); mc.href = 'conta.html'; mc.textContent = 'Minha conta'; mc.className = 'so-mobile';
      const sr = document.createElement('a'); sr.href = '#'; sr.textContent = 'Sair'; sr.className = 'so-mobile'; sr.addEventListener('click', sair);
      lista.append(mc, sr);
    }
    document.querySelectorAll('[data-cta-conta]').forEach((a) => { a.textContent = 'Ir para a minha conta'; a.href = 'conta.html'; });
  }).catch(() => {});
})();
