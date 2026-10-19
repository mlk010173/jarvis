# `orion/mkt.js`

> **Fonte:** https://assistanceorion.cloud/orion/mkt.js · baixado em 19/10/2026
> 94 linhas · 6.4 KB · Scripts de marketing

```javascript
'use strict';
// Marketing no navegador: guarda as UTMs da visita (e o ?ref= de afiliado), conta a visita no painel do dono (anônima: sem cookie e sem IP guardado)
// e, se o dono ligou no painel, carrega GA4, Google Ads e Pixel do Facebook.
// Nada é carregado por padrão: os IDs vêm de /api/marketing/publico (vazio enquanto o dono não configurar).
(() => {
  const CHAVE = 'orion:utm';
  const ler = () => { try { return JSON.parse(localStorage.getItem(CHAVE) || 'null') || {}; } catch { return {}; } };
  const guardar = (o) => { try { localStorage.setItem(CHAVE, JSON.stringify(o)); } catch { /* sem armazenamento: só vale nesta visita */ } };
  const cookie = (n) => { const m = document.cookie.match(new RegExp('(?:^|; )' + n + '=([^;]*)')); return m ? decodeURIComponent(m[1]) : ''; };
  const PARAMS = ['utm_source', 'utm_medium', 'utm_campaign', 'utm_content', 'utm_term', 'utm_id', 'src', 'sck', 'gclid', 'fbclid', 'ref'];

  // 1) origem da visita: o último anúncio clicado nos últimos 30 dias
  const q = new URLSearchParams(location.search), achados = {};
  for (const k of PARAMS) if (q.get(k)) achados[k] = q.get(k).slice(0, 200);
  const salvo = ler();
  if (Object.keys(achados).length) guardar({ ...achados, t: Date.now() });
  else if (salvo.t && Date.now() - salvo.t > 30 * 864e5) guardar({});
  // a mesma origem num cookie: o cadastro pelo Google passa pelo site do Google e a nuvem lê daqui ao criar a conta
  try {
    const o = { ...ler() }; delete o.t;
    const sec = location.protocol === 'https:' ? '; Secure' : '';
    if (Object.keys(o).length) document.cookie = `orion_utm=${encodeURIComponent(JSON.stringify(o))}; Path=/; Max-Age=${30 * 86400}; SameSite=Lax${sec}`;
  } catch { /* sem cookie: só o cadastro por e-mail leva a origem */ }

  function utm() {
    const s = { ...ler() }; delete s.t;
    const fbp = cookie('_fbp'); if (fbp) s.fbp = fbp;
    const fbc = cookie('_fbc') || (s.fbclid ? `fb.1.${Date.now()}.${s.fbclid}` : ''); if (fbc) s.fbc = fbc;
    const ga = cookie('_ga').match(/^GA\d\.\d\.(\d+\.\d+)$/); if (ga) s.ga_cid = ga[1];
    return s;
  }

  // 2) visita para os números do painel: id aleatório deste navegador (não é cookie e não identifica a pessoa)
  try {
    let vid = localStorage.getItem('orion:vid');
    if (!/^[a-z0-9]{16}$/.test(vid || '')) { vid = Array.from(crypto.getRandomValues(new Uint8Array(12)), (b) => (b % 36).toString(36)).join('').padEnd(16, '0').slice(0, 16); localStorage.setItem('orion:vid', vid); }
    const u = utm(); delete u.ip; delete u.ua; delete u.fbp; delete u.fbc; delete u.ga_cid;
    fetch('/api/v', { method: 'POST', keepalive: true, credentials: 'omit', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ c: location.pathname, v: vid, r: document.referrer || '', u }) }).catch(() => {});
  } catch { /* sem armazenamento: a visita não entra nos números */ }

  // 3) tags de terceiros (só se configuradas)
  let cfg = null, pronto = false; const fila = [];
  const depoisDaPagina = (f) => { const ir = () => ('requestIdleCallback' in window ? requestIdleCallback(f, { timeout: 1500 }) : setTimeout(f, 800)); if (document.readyState === 'complete') ir(); else addEventListener('load', ir, { once: true }); };
  const carregar = (src) => depoisDaPagina(() => { const s = document.createElement('script'); s.async = true; s.src = src; document.head.append(s); }); // os eventos ficam na fila (fbq/dataLayer) até o script chegar
  function iniciarGtag(c) {
    window.dataLayer = window.dataLayer || [];
    window.gtag = function gtag() { window.dataLayer.push(arguments); }; // eslint-disable-line prefer-rest-params
    window.gtag('js', new Date());
    if (c.ga4) window.gtag('config', c.ga4);
    if (c.gads) window.gtag('config', c.gads);
    carregar('https://www.googletagmanager.com/gtag/js?id=' + encodeURIComponent(c.ga4 || c.gads));
  }
  function iniciarFb(id) {
    const n = window.fbq = function fbq() { if (n.callMethod) n.callMethod.apply(n, arguments); else n.queue.push(arguments); }; // eslint-disable-line prefer-rest-params
    if (!window._fbq) window._fbq = n;
    n.push = n; n.loaded = true; n.version = '2.0'; n.queue = [];
    carregar('https://connect.facebook.net/en_US/fbevents.js');
    window.fbq('init', id); window.fbq('track', 'PageView');
  }

  // nomes do ORION → nomes de cada plataforma
  function disparar(nome, d) {
    if (!cfg) return;
    const valor = Number(d.valor) || 0, moeda = 'BRL';
    if (window.fbq && cfg.fb) {
      const mapa = { cadastro: ['CompleteRegistration', {}], ver_checkout: ['ViewContent', { value: valor, currency: moeda, content_name: d.plano }], iniciar_compra: ['InitiateCheckout', { value: valor, currency: moeda, content_name: d.plano }], compra: ['Purchase', { value: valor, currency: moeda, content_name: d.plano }] }[nome];
      if (mapa) window.fbq('track', mapa[0], mapa[1], d.id ? { eventID: d.id } : undefined); // o mesmo id vai pelo servidor: o Meta junta os dois
    }
    if (window.gtag) {
      if (cfg.ga4) {
        const mapa = { cadastro: ['sign_up', {}], ver_checkout: ['view_item', { value: valor, currency: moeda }], iniciar_compra: ['begin_checkout', { value: valor, currency: moeda }], compra: ['purchase', { transaction_id: d.id, value: valor, currency: moeda }] }[nome];
        if (mapa) window.gtag('event', mapa[0], mapa[1]);
      }
      if (cfg.gads) {
        const label = nome === 'compra' ? cfg.gads.compra : nome === 'cadastro' ? cfg.gads.cadastro : null;
        if (label) window.gtag('event', 'conversion', { send_to: `${cfg.gads.id}/${label}`, ...(nome === 'compra' ? { value: valor, currency: moeda, transaction_id: d.id } : {}) });
      }
    }
  }
  function evento(nome, d = {}) { const f = () => { try { disparar(nome, d); } catch { /* marketing nunca quebra a página */ } }; if (pronto) f(); else fila.push(f); }

  fetch('/api/marketing/publico', { credentials: 'same-origin' }).then((r) => r.json()).then((c) => {
    cfg = c;
    if (c.ga4 || c.gads) iniciarGtag({ ga4: c.ga4, gads: c.gads?.id });
    if (c.fb) iniciarFb(c.fb);
  }).catch(() => {}).finally(() => { pronto = true; fila.splice(0).forEach((f) => f()); });

  // conta criada pelo Google: a nuvem deixa o id do evento num cookie curto; o navegador dispara o mesmo evento uma vez
  const cad = cookie('orion_cad');
  if (/^cg[a-f0-9]{16}$/.test(cad)) { document.cookie = 'orion_cad=; Path=/; Max-Age=0; SameSite=Lax'; evento('cadastro', { id: cad }); }

  window.ORION_MKT = { utm, evento };
})();

```
