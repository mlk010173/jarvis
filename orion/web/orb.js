// cópia de app/public/orb.js (scripts/copiar-visual-app.js): edite no app e copie de novo
// Esfera de partículas do ORION — reage ao volume da voz e ao estado (ocioso, ouvindo, pensando, falando)
(function () {
  const STATES = {
    idle:      { spin: 0.18, swirl: 0.0,  jitter: 0.02, color: null },
    listening: { spin: 0.32, swirl: 0.15, jitter: 0.05, color: '#5dffa9' },
    thinking:  { spin: 1.1,  swirl: 1.0,  jitter: 0.06, color: '#ffb648' },
    speaking:  { spin: 0.42, swirl: 0.25, jitter: 0.05, color: null },
    error:     { spin: 0.1,  swirl: 0.0,  jitter: 0.01, color: '#ff5470' },
  };

  const hexToRgb = (h) => {
    const n = parseInt(h.replace('#', ''), 16);
    return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
  };
  const lerp = (a, b, t) => a + (b - a) * t;

  class Orb {
    constructor(canvas) {
      this.canvas = canvas;
      this.ctx = canvas.getContext('2d');
      this.state = 'idle';
      this.base = hexToRgb('#29d8ff');
      this.rgb = [...this.base];
      this.level = 0;        // nível de áudio alvo (0..1)
      this.energy = 0;       // nível suavizado
      this.spectrum = null;  // Uint8Array de frequências
      this.spin = 0.18; this.swirl = 0; this.jitter = 0.02;
      this.modo = 'particulas';
      this.rot = 0; this.t = 0; this.last = performance.now();
      this.sprite = document.createElement('canvas');
      this.spriteKey = '';
      this.resize();
      this.makeParticles();
      new ResizeObserver(() => { this.resize(); this.makeParticles(); }).observe(canvas.parentElement);
      requestAnimationFrame((t) => this.frame(t));
    }

    setColor(hex) { this.base = hexToRgb(hex); }
    setModo(m) { this.modo = m === 'anel' ? 'anel' : 'particulas'; } // 'anel' = visual ORION (preto e azul neon)
    setState(s) { if (STATES[s]) this.state = s; }
    setCentro(fy) { this.centroY = fy; } // altura do centro do anel (fração da altura; padrão 1/1.8)
    pausar() { this.parado = true; } // para de desenhar (ex.: demonstração fora da tela)
    retomar() { if (!this.parado) return; this.parado = false; this.last = performance.now(); requestAnimationFrame((t) => this.frame(t)); }
    setLevel(v) { this.level = Math.max(0, Math.min(1, v)); }
    setSpectrum(arr) { this.spectrum = arr; }

    resize() {
      const r = this.canvas.parentElement.getBoundingClientRect();
      this.dpr = Math.min(window.devicePixelRatio || 1, 2);
      this.w = Math.max(10, r.width); this.h = Math.max(10, r.height);
      this.canvas.width = this.w * this.dpr; this.canvas.height = this.h * this.dpr;
      this.R = Math.min(this.w, this.h) * 0.27;
    }

    makeParticles() {
      const n = Math.round(Math.min(2200, Math.max(900, this.R * 9)));
      const golden = Math.PI * (3 - Math.sqrt(5));
      this.p = new Float32Array(n * 4); // x, y, z, semente
      for (let i = 0; i < n; i++) {
        const y = 1 - (i / (n - 1)) * 2;
        const r = Math.sqrt(1 - y * y);
        const th = golden * i;
        this.p[i * 4] = Math.cos(th) * r;
        this.p[i * 4 + 1] = y;
        this.p[i * 4 + 2] = Math.sin(th) * r;
        this.p[i * 4 + 3] = Math.random() * 1000;
      }
      this.n = n;
    }

    updateSprite() {
      const key = this.rgb.map((v) => Math.round(v / 4)).join(',');
      if (key === this.spriteKey) return;
      this.spriteKey = key;
      const s = 32, c = this.sprite;
      c.width = c.height = s;
      const g = c.getContext('2d');
      const [r, gg, b] = this.rgb.map(Math.round);
      const grad = g.createRadialGradient(s / 2, s / 2, 0, s / 2, s / 2, s / 2);
      grad.addColorStop(0, 'rgba(255,255,255,1)');
      grad.addColorStop(0.18, `rgba(${r},${gg},${b},0.95)`);
      grad.addColorStop(0.45, `rgba(${r},${gg},${b},0.25)`);
      grad.addColorStop(1, `rgba(${r},${gg},${b},0)`);
      g.clearRect(0, 0, s, s);
      g.fillStyle = grad;
      g.fillRect(0, 0, s, s);
    }

    frame(now) {
      if (this.parado || !this.canvas.isConnected) { this.parado = true; return; } // fora da tela ou removido: o laço para (retomar() volta)
      const dt = Math.min(0.05, (now - this.last) / 1000);
      this.last = now;
      this.t += dt;
      const st = STATES[this.state];

      // transições suaves
      const k = 1 - Math.pow(0.02, dt);
      this.spin = lerp(this.spin, st.spin, k);
      this.swirl = lerp(this.swirl, st.swirl, k);
      this.jitter = lerp(this.jitter, st.jitter, k);
      const target = st.color && (this.modo !== 'anel' || this.state === 'error') ? hexToRgb(st.color) : this.base; // no anel a cor fica sempre o azul do tema (menos em erro)
      for (let i = 0; i < 3; i++) this.rgb[i] = lerp(this.rgb[i], target[i], k * 0.8);

      let lv = this.level;
      if (this.state === 'thinking') lv = 0.18 + 0.12 * Math.sin(this.t * 6);
      this.energy = lerp(this.energy, lv, lv > this.energy ? 0.35 : 0.08);
      this.rot += dt * this.spin;

      this.updateSprite();
      this.draw();
      requestAnimationFrame((t) => this.frame(t));
    }

    draw() {
      const { ctx, dpr, w, h } = this;
      const cx = (w / 2) * dpr, cy = (h / 2.1) * dpr;
      const e = this.energy;
      const R = this.R * dpr * (1 + 0.012 * Math.sin(this.t * 1.6) + e * 0.22);
      const [r, g, b] = this.rgb.map(Math.round);
      const col = (a) => `rgba(${r},${g},${b},${a})`;

      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
      if (this.modo === 'anel') return this.drawAnel(cx, h * (this.centroY || 1 / 1.8) * dpr, R * 1.2, e); // um pouco mais abaixo: o visor de estado fica em cima

      // brilho do núcleo
      const glow = ctx.createRadialGradient(cx, cy, 0, cx, cy, R * 1.25);
      glow.addColorStop(0, col(0.16 + e * 0.35));
      glow.addColorStop(0.5, col(0.05 + e * 0.1));
      glow.addColorStop(1, col(0));
      ctx.fillStyle = glow;
      ctx.beginPath(); ctx.arc(cx, cy, R * 1.25, 0, Math.PI * 2); ctx.fill();

      this.drawRings(cx, cy, R, col, e);

      // partículas
      ctx.globalCompositeOperation = 'lighter';
      const rx = 0.38 + Math.sin(this.t * 0.23) * 0.12;
      const cosX = Math.cos(rx), sinX = Math.sin(rx);
      const t = this.t, sw = this.swirl, jit = this.jitter;
      const P = this.p, sprite = this.sprite;
      const baseSize = Math.max(1.1, this.R / 120) * dpr;
      for (let i = 0; i < this.n; i++) {
        let x = P[i * 4], y = P[i * 4 + 1], z = P[i * 4 + 2];
        const seed = P[i * 4 + 3];
        // giro + torção por latitude (efeito "pensando")
        const ang = this.rot + y * sw * Math.sin(t * 1.3) * 1.6;
        const ca = Math.cos(ang), sa = Math.sin(ang);
        let x1 = x * ca - z * sa, z1 = x * sa + z * ca;
        // inclinação
        const y2 = y * cosX - z1 * sinX, z2 = y * sinX + z1 * cosX;
        // ondulação com a voz
        const wave = Math.sin(seed + t * 3.2 + y * 5) * 0.5 + Math.sin(seed * 1.7 + t * 5.1) * 0.5;
        const d = 1 + wave * (jit + e * 0.28);
        const persp = 2.4 / (2.4 - z2);
        const sx = cx + x1 * R * d * persp;
        const sy = cy + y2 * R * d * persp;
        const depth = (z2 + 1) / 2; // 0 (fundo) .. 1 (frente)
        const size = baseSize * (0.7 + depth * 1.5) * (1 + e * 0.5);
        ctx.globalAlpha = 0.18 + depth * 0.7;
        ctx.drawImage(sprite, sx - size * 2, sy - size * 2, size * 4, size * 4);
      }
      ctx.globalAlpha = 1;
      ctx.globalCompositeOperation = 'source-over';
    }

    // ---------- modo "anel de energia" (visual ORION): fios de luz entrelaçados formando um anel que pulsa com a voz ----------
    makeFios() {
      const rnd = (a, b) => a + Math.random() * (b - a);
      this.fios = Array.from({ length: 15 }, (_, i) => ({
        desloc: rnd(-0.05, 0.05), alfa: rnd(0.28, 0.62), largura: rnd(0.7, 1.7), claro: i % 6 === 0,
        ondas: [2, 3, 4, 5, 7].sort(() => Math.random() - 0.5).slice(0, 3).map((k) => ({ k, a: rnd(0.012, 0.05), vel: rnd(0.15, 0.6) * (Math.random() < 0.5 ? -1 : 1), fase: rnd(0, Math.PI * 2) })),
      }));
      this.nos = Array.from({ length: 6 }, () => ({ fio: Math.floor(Math.random() * 15), ang: Math.random() * Math.PI * 2, vel: rnd(0.12, 0.35) * (Math.random() < 0.5 ? -1 : 1) }));
    }

    raioFio(f, th, R, e, t) {
      let r = 1 + f.desloc * (1 + e * 1.6);
      for (const o of f.ondas) r += o.a * (1 + e * 2.4) * Math.sin(o.k * th + o.fase + o.vel * t * (1 + this.swirl * 1.8));
      return R * r;
    }

    drawAnel(cx, cy, R, e) {
      const { ctx, dpr } = this;
      if (!this.fios) this.makeFios();
      const [r, g, b] = this.rgb.map(Math.round);
      const t = this.t, giro = this.rot * 0.35, PASSOS = 168;
      // halo de fundo
      const halo = ctx.createRadialGradient(cx, cy, R * 0.55, cx, cy, R * 1.45);
      halo.addColorStop(0, `rgba(${r},${g},${b},0)`);
      halo.addColorStop(0.62, `rgba(${r},${g},${b},${0.07 + e * 0.12})`);
      halo.addColorStop(1, `rgba(${r},${g},${b},0)`);
      ctx.fillStyle = halo;
      ctx.beginPath(); ctx.arc(cx, cy, R * 1.45, 0, Math.PI * 2); ctx.fill();

      ctx.globalCompositeOperation = 'lighter';
      ctx.lineJoin = 'round';
      for (const f of this.fios) {
        ctx.beginPath();
        for (let i = 0; i <= PASSOS; i++) {
          const th = (i / PASSOS) * Math.PI * 2;
          const rr = this.raioFio(f, th + giro, R, e, t);
          const x = cx + Math.cos(th) * rr, y = cy + Math.sin(th) * rr * 0.96;
          if (i) ctx.lineTo(x, y); else ctx.moveTo(x, y);
        }
        const cor = f.claro ? `${Math.min(255, r + 120)},${Math.min(255, g + 90)},255` : `${r},${g},${b}`;
        ctx.strokeStyle = `rgba(${cor},${f.alfa * 0.13})`;
        ctx.lineWidth = (5 + e * 7) * dpr;
        ctx.stroke();
        ctx.strokeStyle = `rgba(${cor},${Math.min(1, f.alfa + e * 0.25)})`;
        ctx.lineWidth = f.largura * dpr;
        ctx.stroke();
      }
      // pontos de luz correndo pelos fios
      for (const n of this.nos) {
        n.ang += n.vel * 0.016 * (1 + e * 3);
        const f = this.fios[n.fio];
        const rr = this.raioFio(f, n.ang + giro, R, e, t);
        const x = cx + Math.cos(n.ang) * rr, y = cy + Math.sin(n.ang) * rr * 0.96;
        const s = (14 + e * 18) * dpr;
        ctx.globalAlpha = 0.55 + e * 0.45;
        ctx.drawImage(this.sprite, x - s, y - s, s * 2, s * 2);
      }
      ctx.globalAlpha = 1;
      ctx.globalCompositeOperation = 'source-over';
    }

    drawRings(cx, cy, R, col, e) {
      const { ctx, dpr, t } = this;
      ctx.lineCap = 'round';

      // anel de espectro (barras radiais)
      const bars = 96, r0 = R * 1.22;
      const spec = this.spectrum;
      ctx.lineWidth = 2 * dpr;
      for (let i = 0; i < bars; i++) {
        let v;
        if (spec && (this.state === 'speaking' || this.state === 'listening')) {
          const idx = Math.floor((i < bars / 2 ? i : bars - i) / (bars / 2) * spec.length * 0.7);
          v = spec[idx] / 255;
        } else {
          v = 0.05 + 0.04 * Math.sin(t * 2 + i * 0.4) + (this.state === 'thinking' ? 0.1 * Math.max(0, Math.sin(t * 8 - i * 0.35)) : 0);
        }
        const a = (i / bars) * Math.PI * 2 - Math.PI / 2;
        const len = (3 + v * R * 0.32) * (1 + e * 0.3);
        ctx.strokeStyle = col(0.25 + v * 0.6);
        ctx.beginPath();
        ctx.moveTo(cx + Math.cos(a) * r0, cy + Math.sin(a) * r0);
        ctx.lineTo(cx + Math.cos(a) * (r0 + len), cy + Math.sin(a) * (r0 + len));
        ctx.stroke();
      }

      // anel fino com marcações
      const r1 = R * 1.62;
      ctx.lineWidth = 1 * dpr;
      ctx.strokeStyle = col(0.22);
      ctx.beginPath(); ctx.arc(cx, cy, r1, 0, Math.PI * 2); ctx.stroke();
      const rotA = t * 0.08;
      for (let i = 0; i < 120; i++) {
        const a = rotA + (i / 120) * Math.PI * 2;
        const big = i % 10 === 0;
        const l = big ? 9 : 4;
        ctx.strokeStyle = col(big ? 0.55 : 0.22);
        ctx.beginPath();
        ctx.moveTo(cx + Math.cos(a) * r1, cy + Math.sin(a) * r1);
        ctx.lineTo(cx + Math.cos(a) * (r1 + l * dpr), cy + Math.sin(a) * (r1 + l * dpr));
        ctx.stroke();
      }

      // arcos segmentados girando em sentidos opostos
      const r2 = R * 1.76, r3 = R * 1.5;
      const sp = this.state === 'thinking' ? 2.6 : 0.35 + e;
      ctx.lineWidth = 2.5 * dpr;
      for (let i = 0; i < 3; i++) {
        const a0 = -t * sp * 0.6 + i * (Math.PI * 2 / 3);
        ctx.strokeStyle = col(0.55);
        ctx.beginPath(); ctx.arc(cx, cy, r2, a0, a0 + 0.7); ctx.stroke();
      }
      ctx.lineWidth = 1.5 * dpr;
      for (let i = 0; i < 4; i++) {
        const a0 = t * sp * 0.4 + i * (Math.PI / 2);
        ctx.strokeStyle = col(0.35);
        ctx.beginPath(); ctx.arc(cx, cy, r3, a0, a0 + 0.35); ctx.stroke();
      }

      // varredura (pensando)
      if (this.state === 'thinking') {
        const a0 = t * 4;
        const grad = ctx.createConicGradient ? ctx.createConicGradient(a0, cx, cy) : null;
        if (grad) {
          grad.addColorStop(0, col(0.35));
          grad.addColorStop(0.12, col(0));
          grad.addColorStop(1, col(0));
          ctx.fillStyle = grad;
          ctx.beginPath(); ctx.arc(cx, cy, r2, 0, Math.PI * 2); ctx.arc(cx, cy, r3, 0, Math.PI * 2, true); ctx.fill();
        }
      }
    }
  }

  window.Orb = Orb;
})();
