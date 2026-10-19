'use strict';
// JARVIS — landing: menu em pílula, progresso de rolagem, mockup que se alinha ao rolar, módulos com rolagem interativa,
// revelações, brilho que segue o cursor e a tabela de planos lida do painel do dono (sem innerHTML com dados).
(() => {
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => Array.from(r.querySelectorAll(s));
  const reduzir = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const desktop = matchMedia('(min-width: 961px)');

  // link ativo conforme a seção na tela
  const secoes = $$('#nav-links a[href^="#"]').filter((a) => a.getAttribute('href').length > 1).map((a) => ({ a, s: $(a.getAttribute('href')) })).filter((x) => x.s);
  if ('IntersectionObserver' in window) {
    const io = new IntersectionObserver((es) => es.forEach((e) => {
      const alvo = secoes.find((x) => x.s === e.target); if (!alvo) return;
      if (e.isIntersecting) { secoes.forEach((x) => x.a.removeAttribute('aria-current')); alvo.a.setAttribute('aria-current', 'true'); }
      else alvo.a.removeAttribute('aria-current');
    }), { rootMargin: '-45% 0px -50% 0px' });
    secoes.forEach((x) => io.observe(x.s));
  }

  // ---------- rolagem: barra, nav, mockup do hero, módulos ----------
  const frame = $('#hero-frame');
  const steps = $$('#steps .step'), tabs = $$('.stage-tabs button'), shots = $$('#stage-shots > div');
  const titulo = $('#stage-title'), trilho = $('#stage-rail');
  const NOMES = ['JARVIS · Núcleo', 'JARVIS · Mapeamento de Leads', 'JARVIS · Editor & Motion', 'JARVIS · Roteiros'];
  let ativo = 0, pendente = false, palcoVisivel = false;

  // só a demonstração do módulo ativo roda, e só enquanto o palco está na tela
  function tocar() {
    shots.forEach((el, k) => { const c = el._demo; if (!c) return; if (palcoVisivel && k === ativo && desktop.matches) c.play(); else c.pause(); });
  }

  function escolher(i) {
    if (i === ativo) return;
    ativo = i;
    steps.forEach((s, k) => s.classList.toggle('is-active', k === i));
    tabs.forEach((t, k) => t.setAttribute('aria-selected', String(k === i)));
    shots.forEach((im, k) => im.classList.toggle('is-on', k === i));
    if (titulo) titulo.textContent = NOMES[i] || 'JARVIS';
    if (trilho) trilho.style.transform = `scaleX(${(i + 1) / steps.length})`;
    tocar();
  }

  function aoRolar() {
    pendente = false;
    const y = window.scrollY;
    if (frame && !reduzir) {
      const p = Math.max(0, Math.min(1, y / (innerHeight * 0.55)));
      frame.style.setProperty('--p', p.toFixed(3));
    }
    if (desktop.matches && steps.length) {
      const meio = innerHeight * 0.5; let melhor = ativo, dist = Infinity;
      steps.forEach((s, k) => { const r = s.getBoundingClientRect(); const d = Math.abs((r.top + r.bottom) / 2 - meio); if (d < dist) { dist = d; melhor = k; } });
      const area = $('#showcase')?.getBoundingClientRect();
      if (area && area.top < innerHeight * 0.8 && area.bottom > innerHeight * 0.2) escolher(melhor);
    }
  }
  const agendar = () => { if (!pendente) { pendente = true; requestAnimationFrame(aoRolar); } };
  addEventListener('scroll', agendar, { passive: true });
  addEventListener('resize', agendar, { passive: true });
  aoRolar();

  tabs.forEach((t, k) => t.addEventListener('click', () => {
    if (desktop.matches) steps[k]?.scrollIntoView({ behavior: reduzir ? 'auto' : 'smooth', block: 'center' });
    else escolher(k);
  }));

  // ---------- demonstrações ----------
  const palco = $('#showcase');
  if (palco && 'IntersectionObserver' in window) new IntersectionObserver((es) => { palcoVisivel = es[0].isIntersecting; tocar(); }, { rootMargin: '-10% 0px -10% 0px' }).observe(palco);
  desktop.addEventListener?.('change', tocar);
  // no celular, cada módulo traz a própria demonstração (o palco fixo some)
  const moveis = $$('[data-demo-m]'); let moveisOk = false;
  function montarMoveis() {
    if (moveisOk || desktop.matches || !window.JARVIS_DEMOS) return; moveisOk = true;
    moveis.forEach((el) => {
      const c = JARVIS_DEMOS.montar(el, el.dataset.demoM); if (!c) return;
      if ('IntersectionObserver' in window) new IntersectionObserver((es) => es.forEach((e) => (e.isIntersecting ? c.play() : c.pause())), { threshold: 0.4 }).observe(el);
    });
  }
  montarMoveis(); desktop.addEventListener?.('change', montarMoveis);
  window.JARVIS_DEMOS?.autoiniciar();
  tocar();

  // ---------- revelar ao rolar ----------
  const alvos = $$('[data-reveal]');
  if ('IntersectionObserver' in window && !reduzir) {
    // atraso escalonado entre irmãos
    const porPai = new Map();
    alvos.forEach((a) => { const l = porPai.get(a.parentElement) || []; l.push(a); porPai.set(a.parentElement, l); });
    porPai.forEach((lista) => lista.forEach((a, i) => { if (lista.length > 1) a.style.setProperty('--d', (i * 0.09).toFixed(2) + 's'); }));
    const io = new IntersectionObserver((es) => es.forEach((e) => { if (e.isIntersecting) { e.target.classList.add('in'); io.unobserve(e.target); } }), { rootMargin: '0px 0px -8% 0px', threshold: 0.08 });
    alvos.forEach((a) => io.observe(a));
  } else alvos.forEach((a) => a.classList.add('in'));

  // ---------- brilho que segue o cursor ----------
  $$('.spot').forEach((c) => c.addEventListener('pointermove', (e) => {
    const r = c.getBoundingClientRect();
    c.style.setProperty('--mx', (e.clientX - r.left) + 'px'); c.style.setProperty('--my', (e.clientY - r.top) + 'px');
  }, { passive: true }));

  // ---------- planos (lidos do painel do dono) ----------
  const area = $('#planos-area');
  // planos e vitrine já vêm dentro da página (o servidor coloca em #dados-iniciais): nada de esperar outra ida ao servidor
  const INICIAIS = (() => { try { return JSON.parse($('#dados-iniciais')?.textContent || 'null'); } catch { return null; } })();
  const el = (tag, attrs = {}, ...filhos) => {
    const n = document.createElement(tag);
    for (const [k, v] of Object.entries(attrs)) { if (k === 'text') n.textContent = v; else n.setAttribute(k, v); }
    n.append(...filhos); return n;
  };
  const check = () => {
    const s = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    s.setAttribute('viewBox', '0 0 20 20'); s.setAttribute('fill', 'none'); s.setAttribute('stroke', 'currentColor'); s.setAttribute('stroke-width', '1.8'); s.setAttribute('stroke-linecap', 'round'); s.setAttribute('stroke-linejoin', 'round'); s.setAttribute('aria-hidden', 'true');
    const p = document.createElementNS('http://www.w3.org/2000/svg', 'path'); p.setAttribute('d', 'm4.5 10.5 3.5 3.5 7.5-8'); s.append(p); return s;
  };
  const cruz = () => {
    const s = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    s.setAttribute('viewBox', '0 0 20 20'); s.setAttribute('fill', 'none'); s.setAttribute('stroke', 'currentColor'); s.setAttribute('stroke-width', '1.8'); s.setAttribute('stroke-linecap', 'round'); s.setAttribute('aria-hidden', 'true');
    const p = document.createElementNS('http://www.w3.org/2000/svg', 'path'); p.setAttribute('d', 'm5.5 5.5 9 9m0-9-9 9'); s.append(p); return s;
  };
  const reais = (c) => (c / 100).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', minimumFractionDigits: c % 100 ? 2 : 0 });
  const seguro = (u) => (/^https:\/\//.test(u || '') ? u : null);

  // planos: o Free e o plano pago (tudo liberado) em três períodos: mensal, trimestral e vitalício (os preços vêm do servidor)
  const PERIODOS = [
    ['mensal', 'Mensal', () => '/mês', () => 'Use por 1 mês. Renova só se você quiser.'],
    ['trimestral', 'Trimestral', () => '/3 meses', (c) => `Sai por ${reais(Math.round(c / 3))} por mês.`],
    ['vitalicio', 'Vitalício', () => 'uma vez só', () => 'Nunca vence. As atualizações vêm junto.'],
  ];
  let periodo = 'vitalicio';
  const brilho = (card) => card.addEventListener('pointermove', (e) => { const r = card.getBoundingClientRect(); card.style.setProperty('--mx', (e.clientX - r.left) + 'px'); card.style.setProperty('--my', (e.clientY - r.top) + 'px'); }, { passive: true });
  const listaPlano = (destaques) => { const ul = el('ul'); (destaques || []).forEach((d) => { const nao = /^✕\s*/.test(d); ul.append(el('li', nao ? { class: 'nao' } : {}, nao ? cruz() : check(), el('span', { text: d.replace(/^✕\s*/, '') }))); }); return ul; };
  function ctaPago(p, per, checkout) {
    if (checkout && (checkout.pix || checkout.cartao)) return el('a', { class: 'btn btn-block btn-primary', href: 'checkout?plano=' + encodeURIComponent(p.id) + '&ciclo=' + per, text: per === 'vitalicio' ? 'Comprar o Vitalício' : 'Assinar o ' + (PERIODOS.find((x) => x[0] === per) || PERIODOS[0])[1] });
    if (seguro(p.checkout_url)) return el('a', { class: 'btn btn-block btn-primary', href: seguro(p.checkout_url), rel: 'noopener', text: 'Assinar o ' + p.nome });
    return el('a', { class: 'btn btn-block', href: '#planos', 'aria-disabled': 'true', text: 'Pagamento em breve' });
  }
  function desenhar(planos, checkout) {
    area.replaceChildren();
    planos.filter((p) => !(p.preco_centavos > 0)).forEach((p) => {
      const card = el('article', { class: 'plan spot' });
      card.append(el('h3', { text: p.nome }), el('p', { class: 'plan-who', text: p.publico || '' }), el('div', { class: 'plan-price' }, el('strong', { text: 'R$ 0' }), el('small', { text: 'sem cartão' })), listaPlano(p.destaques), el('a', { class: 'btn btn-block', href: '/entrar?volta=comecar#cadastro', text: 'Começar grátis' }));
      area.append(card); brilho(card); card.classList.add('in');
    });
    planos.filter((p) => p.preco_centavos > 0 && p.precos).forEach((p) => {
      const ofertas = PERIODOS.filter(([id]) => p.precos[id] > 0);
      if (!ofertas.length) return;
      if (!ofertas.some((x) => x[0] === periodo)) periodo = ofertas[ofertas.length - 1][0];
      const card = el('article', { class: 'plan plan-pago plan-featured spot' });
      const grupo = el('div', { class: 'periodos', role: 'radiogroup', 'aria-label': 'Período do ' + p.nome });
      const cta = el('div', { class: 'plan-cta' });
      const pintar = () => { grupo.querySelectorAll('.periodo').forEach((b) => { const on = b.dataset.periodo === periodo; b.setAttribute('aria-checked', String(on)); b.tabIndex = on ? 0 : -1; }); cta.replaceChildren(ctaPago(p, periodo, checkout)); };
      const botoes = ofertas.map(([id, nome, por, nota]) => {
        const c = p.precos[id];
        const b = el('button', { type: 'button', role: 'radio', class: 'periodo', 'data-periodo': id, 'aria-checked': 'false' },
          el('b', { text: nome }), el('span', { class: 'periodo-preco' }, el('strong', { text: reais(c) }), el('small', { text: por(c) })), el('small', { class: 'periodo-nota', text: nota(c) }));
        if (id === 'vitalicio' && ofertas.length > 1) b.prepend(el('span', { class: 'periodo-tag', text: 'Melhor custo' }));
        b.addEventListener('click', () => { periodo = id; pintar(); });
        return b;
      });
      botoes.forEach((b, i) => b.addEventListener('keydown', (e) => { if (!['ArrowRight', 'ArrowLeft', 'ArrowDown', 'ArrowUp'].includes(e.key)) return; e.preventDefault(); const n = botoes[(i + (e.key === 'ArrowRight' || e.key === 'ArrowDown' ? 1 : -1) + botoes.length) % botoes.length]; n.focus(); n.click(); }));
      grupo.append(...botoes);
      card.append(el('div', { class: 'plan-pago-cab' }, el('h3', { text: p.nome }), el('p', { class: 'plan-who', text: p.publico || 'Tudo liberado: você só escolhe o período' })), grupo,
        el('p', { class: 'plan-incluso', text: 'Em qualquer período, vem tudo:' }), listaPlano((p.destaques || []).filter((d) => !/^✕/.test(d))), cta);
      pintar(); area.append(card); brilho(card); card.classList.add('in');
    });
  }

  // ---------- vitrine de componentes: React em vídeo (prévias guardadas na VPS) e HTML + CSS funcionando de verdade ----------
  const palcoC = $('#comps-palco');
  if (palcoC) {
    const NIVEL = { free: ['Free', ''], basic: ['Basic', 'badge-blue'], premium: ['Premium', 'badge-warn'] };
    let dados = null, abaC = 'react';
    // vídeo só toca enquanto aparece (e nunca com "reduzir movimento": fica a imagem parada)
    const vistaC = 'IntersectionObserver' in window ? new IntersectionObserver((es) => es.forEach((e) => { if (e.isIntersecting && !reduzir) e.target.play().catch(() => {}); else e.target.pause(); }), { threshold: 0.3 }) : null;
    const legenda = (c) => el('figcaption', {}, el('b', { text: c.nome }), el('span', { class: 'badge ' + (NIVEL[c.nivel] || NIVEL.free)[1], text: (NIVEL[c.nivel] || NIVEL.free)[0] }));
    function pecaReact(base, c) {
      const m = c.video
        ? el('video', { src: base + c.video, ...(c.imagem ? { poster: base + c.imagem } : {}), loop: '', playsinline: '', preload: 'none', 'aria-label': 'Prévia: ' + c.nome })
        : el('img', { src: base + c.imagem, alt: 'Prévia: ' + c.nome, loading: 'lazy' });
      if (c.video) { m.muted = true; if (vistaC) vistaC.observe(m); }
      return el('figure', { class: 'comps-peca' }, m, legenda(c));
    }
    // peça HTML + CSS isolada (Shadow DOM): o CSS dela não mexe na página e encolhe para caber no cartão
    function pecaHtml(base, c) {
      const host = el('div', { class: 'comps-vivo' });
      const raiz = host.attachShadow({ mode: 'open' });
      const st = document.createElement('style');
      st.textContent = base + '\n:host{display:block;width:100%;height:100%}\n.p{position:relative;width:100%;height:100%;overflow:hidden}\n.p>.oc-tema{position:absolute;left:50%;top:50%;display:grid;place-items:center;width:max-content;transform-origin:center;transform:translate(-50%,-50%)}\n' + c.css + (reduzir ? '\n*{animation:none!important;transition:none!important}' : '');
      const p = document.createElement('div'); p.className = 'p';
      const t = document.createElement('div'); t.className = 'oc-tema';
      t.innerHTML = c.html; // HTML fixo da biblioteca do JARVIS (lib/ui-catalogo.js), nunca texto de visitante
      t.querySelectorAll('a').forEach((a) => a.addEventListener('click', (e) => e.preventDefault()));
      p.append(t); raiz.append(st, p);
      const ajustar = () => { t.style.transform = 'translate(-50%,-50%)'; const s = Math.min(1, (p.clientWidth - 16) / (t.offsetWidth || 1), (p.clientHeight - 12) / (t.offsetHeight || 1)); if (s < 1) t.style.transform = 'translate(-50%,-50%) scale(' + s.toFixed(3) + ')'; };
      requestAnimationFrame(ajustar); try { new ResizeObserver(() => requestAnimationFrame(ajustar)).observe(p); } catch { /* fica a primeira medida */ }
      return el('figure', { class: 'comps-peca' }, host, legenda(c));
    }
    function desenharC() {
      if (!dados) return;
      $$('.comps-palco video').forEach((v) => vistaC && vistaC.unobserve(v));
      const lista = abaC === 'react' ? dados.react.map((c) => pecaReact(dados.midia_base, c)) : dados.html.map((c) => pecaHtml(dados.base_css, c));
      palcoC.replaceChildren(...(lista.length ? lista : [el('p', { class: 'comps-aviso', text: 'A vitrine volta em instantes.' })]));
      palcoC.setAttribute('aria-labelledby', 'comps-aba-' + abaC);
    }
    const abasC = $$('.comps-abas [role="tab"]');
    const escolherC = (b) => { abaC = b.dataset.aba; abasC.forEach((x) => { x.setAttribute('aria-selected', String(x === b)); x.tabIndex = x === b ? 0 : -1; }); desenharC(); };
    abasC.forEach((b, i) => {
      b.addEventListener('click', () => escolherC(b));
      b.addEventListener('keydown', (e) => { if (e.key !== 'ArrowRight' && e.key !== 'ArrowLeft') return; const n = abasC[(i + (e.key === 'ArrowRight' ? 1 : -1) + abasC.length) % abasC.length]; n.focus(); escolherC(n); });
    });
    // a página já vem com a vitrine dentro (dados-iniciais); sem eles, busca no servidor
    if (INICIAIS && INICIAIS.vitrine) usarVitrine(INICIAIS.vitrine);
    else fetch('/api/ui/vitrine').then((r) => (r.ok ? r.json() : Promise.reject(new Error(r.status)))).then((j) => {
      usarVitrine(j);
    }).catch(() => { const v = $('#comps-vitrine'); if (v) v.hidden = true; });
    function usarVitrine(j) {
      dados = j;
      for (const k of ['react', 'html', 'free', 'premium']) { const v = j.totais && j.totais[k]; if (v) $$('[data-comps="' + k + '"]').forEach((s) => { s.textContent = String(v); }); }
      desenharC();
    }
  }

  if (area && INICIAIS && INICIAIS.planos) desenhar(INICIAIS.planos.planos || [], INICIAIS.planos.checkout);
  else if (area) {
    fetch('/api/comercial/planos').then((r) => r.json()).then((j) => desenhar(j.planos || [], j.checkout))
      .catch(() => area.replaceChildren(el('p', { class: 'alert alert-warn', text: 'Não consegui carregar os planos agora. Recarregue a página em instantes.' })));
  }
})();
