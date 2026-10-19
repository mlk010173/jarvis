'use strict';
// Tutoriais: cada cartão traz a demonstração animada do passo (toca ao passar o mouse ou tocar); filtros por categoria.
(() => {
  const cartoes = Array.from(document.querySelectorAll('.tut'));
  const tocar = (cartao, ligar) => {
    const el = cartao.querySelector('[data-demo]'), c = el?._demo; if (!c) return;
    cartao.classList.toggle('tocando', ligar);
    if (ligar) c.play(); else { c.pause(); c.poster(); }
  };
  const iniciar = () => {
    if (!window.JARVIS_DEMOS) return;
    cartoes.forEach((cartao) => {
      const el = cartao.querySelector('[data-demo]'); if (!el) return; // cartão só de texto (sem demonstração)
      JARVIS_DEMOS.montar(el, el.dataset.demo);
      cartao.addEventListener('pointerenter', (e) => { if (e.pointerType === 'mouse') tocar(cartao, true); });
      cartao.addEventListener('pointerleave', (e) => { if (e.pointerType === 'mouse') tocar(cartao, false); });
      cartao.addEventListener('focus', () => tocar(cartao, true));
      cartao.addEventListener('blur', () => tocar(cartao, false));
      // toque: alterna a demonstração (e só uma de cada vez)
      cartao.addEventListener('click', (e) => {
        if (e.target.closest('a,button')) return;
        if (matchMedia('(hover: hover)').matches) return;
        const ligar = !cartao.classList.contains('tocando');
        cartoes.forEach((o) => { if (o !== cartao && o.classList.contains('tocando')) tocar(o, false); });
        tocar(cartao, ligar);
      });
    });
  };
  iniciar();

  // filtros
  const botoes = Array.from(document.querySelectorAll('.tut-filtros button'));
  botoes.forEach((b) => b.addEventListener('click', () => {
    botoes.forEach((x) => x.classList.toggle('on', x === b));
    const f = b.dataset.filtro;
    cartoes.forEach((c) => { const mostrar = f === 'todos' || c.dataset.cat === f; c.hidden = !mostrar; if (!mostrar) tocar(c, false); });
  }));
})();
