'use strict';
// Rodapé com a marca gigante em pontos "halftone". Porta para JavaScript puro (sem React/build, compatível com a CSP do site)
// do componente "Halftone Wordmark Footer" de kedhareswer (21st.dev). Os pontos se afastam do cursor em molas, esquentam de cor
// quando deslocados e o clique manda um anel de choque pelas letras.
(() => {
  const raiz = document.getElementById('rodape-halftone');
  if (!raiz) return;
  const cfg = { palavra: raiz.dataset.palavra || 'orion', fundo: '#08090A', tinta: '#c9d1da', quente: '#06B6D4', gap: 6, raio: 80, corte: 0.2, grao: 0.5,
    fonte: 'Geist, "Segoe UI Black", "Arial Black", Arial, system-ui, sans-serif', peso: 800 };

  // ----- funções puras do componente original -----
  const hex = (h) => { const m = /^#?([0-9a-f]{3}|[0-9a-f]{6})$/i.exec((h || '').trim()); if (!m) return null; const x = m[1].length === 3 ? m[1].split('').map((c) => c + c).join('') : m[1]; return [parseInt(x.slice(0, 2), 16), parseInt(x.slice(2, 4), 16), parseInt(x.slice(4, 6), 16)]; };
  const raioPonto = (cob, gap) => Math.sqrt(cob < 0 ? 0 : cob > 1 ? 1 : cob) * gap * 0.56;
  const passo = (x, y, vx, vy, hx, hy, px, py, r) => {
    const dx = x - px, dy = y - py, d2 = dx * dx + dy * dy;
    if (r > 0 && d2 < r * r) { const d = Math.sqrt(d2) + 0.001, f = (1 - d / r) * 2.6; vx += (dx / d) * f; vy += (dy / d) * f; }
    vx = (vx + (hx - x) * 0.05) * 0.84; vy = (vy + (hy - y) * 0.05) * 0.84;
    return [x + vx, y + vy, vx, vy];
  };
  const calor = (x, y, hx, hy, span) => (span > 0 ? Math.min(1, Math.hypot(x - hx, y - hy) / span) : 0);

  // ----- estrutura -----
  const canvas = document.createElement('canvas'); canvas.setAttribute('aria-hidden', 'true');
  raiz.prepend(canvas);
  const ctx = canvas.getContext('2d'); if (!ctx) return;
  const reduzir = matchMedia('(prefers-reduced-motion: reduce)').matches;
  let w = 0, h = 0, dpr = 1, px = -1e5, py = -1e5, raf = 0, visivel = true, acordado = true, anel = { x: 0, y: 0, t: -1 };
  let pontos = new Float32Array(0), n = 0, tile = null;
  const tinta = hex(cfg.tinta), quente = hex(cfg.quente);

  function montar() {
    const r = raiz.getBoundingClientRect();
    w = Math.max(1, Math.round(r.width)); h = Math.max(1, Math.round(r.height));
    dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = Math.round(w * dpr); canvas.height = Math.round(h * dpr);
    const mask = document.createElement('canvas'); mask.width = w; mask.height = h;
    const m = mask.getContext('2d', { willReadFrequently: true }); if (!m) return;
    m.font = cfg.peso + ' 100px ' + cfg.fonte;
    const medida = m.measureText(cfg.palavra).width;
    const tam = medida > 0 ? (w * 1.02 / medida) * 100 : 0;
    m.font = cfg.peso + ' ' + tam + 'px ' + cfg.fonte;
    const caixa = m.measureText(cfg.palavra), cap = caixa.actualBoundingBoxAscent || tam * 0.72;
    m.fillStyle = '#000'; m.textBaseline = 'alphabetic';
    m.fillText(cfg.palavra, (w - caixa.width) / 2, h + cap * Math.max(0, Math.min(0.6, cfg.corte)));
    const img = m.getImageData(0, 0, w, h).data;
    const gap = Math.max(3, cfg.gap), cols = Math.ceil(w / gap), lin = Math.ceil(h / gap), tmp = [];
    for (let gy = 0; gy < lin; gy++) for (let gx = 0; gx < cols; gx++) {
      let soma = 0;
      for (let sy = 0; sy < 3; sy++) for (let sx = 0; sx < 3; sx++) {
        const x = Math.min(w - 1, Math.floor(gx * gap + ((sx + 0.5) * gap) / 3)), y = Math.min(h - 1, Math.floor(gy * gap + ((sy + 0.5) * gap) / 3));
        soma += img[(y * w + x) * 4 + 3];
      }
      const cob = soma / (9 * 255); if (cob < 0.06) continue;
      const hx = gx * gap + gap / 2, hy = gy * gap + gap / 2;
      tmp.push(hx, hy, 0, 0, hx, hy, raioPonto(cob, gap));
    }
    pontos = new Float32Array(tmp); n = tmp.length / 7;
    tile = document.createElement('canvas'); tile.width = 256; tile.height = 256;
    const g = tile.getContext('2d');
    if (g) { const id = g.createImageData(256, 256); for (let i = 0; i < id.data.length; i += 4) { const v = Math.random() * 255; id.data[i] = id.data[i + 1] = id.data[i + 2] = v; id.data[i + 3] = Math.random() < 0.5 ? 0 : 255; } g.putImageData(id, 0, 0); }
    acordado = true;
  }

  function desenhar(agora) {
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.fillStyle = cfg.fundo; ctx.fillRect(0, 0, w, h);
    const r = reduzir ? 0 : cfg.raio, idade = anel.t < 0 ? 1e9 : agora - anel.t, rAnel = idade * 0.9;
    let mexendo = false;
    for (let i = 0; i < n; i++) {
      const j = i * 7;
      let x = pontos[j], y = pontos[j + 1], vx = pontos[j + 2], vy = pontos[j + 3];
      const hx = pontos[j + 4], hy = pontos[j + 5];
      if (!reduzir) {
        if (idade < 900) {
          const dx = hx - anel.x, dy = hy - anel.y, d = Math.sqrt(dx * dx + dy * dy) + 0.001, banda = 1 - Math.min(1, Math.abs(d - rAnel) / 26);
          if (banda > 0) { const f = banda * 3.2 * (1 - idade / 900); vx += (dx / d) * f; vy += (dy / d) * f; }
        }
        const s = passo(x, y, vx, vy, hx, hy, px, py, r);
        x = s[0]; y = s[1]; vx = s[2]; vy = s[3];
        if (Math.abs(vx) + Math.abs(vy) > 0.02 || Math.abs(x - hx) + Math.abs(y - hy) > 0.05) mexendo = true; else { x = hx; y = hy; vx = 0; vy = 0; }
        pontos[j] = x; pontos[j + 1] = y; pontos[j + 2] = vx; pontos[j + 3] = vy;
      }
      const k = calor(x, y, hx, hy, 28);
      ctx.fillStyle = k > 0.02 ? 'rgb(' + Math.round(tinta[0] + (quente[0] - tinta[0]) * k) + ',' + Math.round(tinta[1] + (quente[1] - tinta[1]) * k) + ',' + Math.round(tinta[2] + (quente[2] - tinta[2]) * k) + ')' : cfg.tinta;
      ctx.beginPath(); ctx.arc(x, y, pontos[j + 6], 0, 6.2832); ctx.fill();
    }
    if (tile && cfg.grao > 0) {
      ctx.globalAlpha = Math.min(1, cfg.grao) * 0.09; ctx.globalCompositeOperation = 'overlay';
      const pat = ctx.createPattern(tile, 'repeat'); if (pat) { ctx.fillStyle = pat; ctx.fillRect(0, 0, w, h); }
      ctx.globalAlpha = 1; ctx.globalCompositeOperation = 'source-over';
    }
    acordado = mexendo || idade < 900 || px > -1e4;
  }
  const laco = (agora) => { raf = 0; if (!visivel) return; desenhar(agora); if (acordado) raf = requestAnimationFrame(laco); };
  const acordar = () => { acordado = true; if (!raf && visivel) raf = requestAnimationFrame(laco); };
  const local = (e) => { const b = canvas.getBoundingClientRect(); return [e.clientX - b.left, e.clientY - b.top]; };

  raiz.addEventListener('pointermove', (e) => { const p = local(e); px = p[0]; py = p[1]; acordar(); });
  raiz.addEventListener('pointerleave', () => { px = -1e5; py = -1e5; acordar(); });
  raiz.addEventListener('pointerdown', (e) => { if (reduzir || e.target.closest('a,button')) return; const p = local(e); anel = { x: p[0], y: p[1], t: performance.now() }; acordar(); });
  const voltar = raiz.querySelector('.hwf-up');
  voltar?.addEventListener('click', () => window.scrollTo({ top: 0, behavior: reduzir ? 'auto' : 'smooth' }));

  montar(); desenhar(performance.now()); acordar();
  new ResizeObserver(() => { montar(); acordar(); }).observe(raiz);
  new IntersectionObserver((e) => { visivel = e[0] ? e[0].isIntersecting : true; if (visivel) acordar(); }).observe(raiz);
  document.fonts?.ready.then(() => { montar(); acordar(); });
})();
