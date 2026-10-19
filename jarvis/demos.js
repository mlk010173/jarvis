'use strict';
// JARVIS — demonstrações animadas (DOM, CSS e canvas; sem imagens). Cada demonstração é um roteiro em laço:
// reinicia o estado → encena os passos → fica no quadro final. O quadro final também serve de "pôster" quando a demonstração está parada.
// Uso: const d = JARVIS_DEMOS.montar(elemento, 'autocut'); d.play(); d.pause();
(() => {
  const reduzir = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const ABORT = Symbol('abort');
  const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
  const h = (tag, cls, txt) => { const e = document.createElement(tag); if (cls) e.className = cls; if (txt != null) e.textContent = txt; return e; };
  const add = (pai, ...fs) => { fs.forEach((f) => f && pai.append(f)); return pai; };
  const svgNS = 'http://www.w3.org/2000/svg';
  const svg = (tag, attrs = {}) => { const e = document.createElementNS(svgNS, tag); for (const [k, v] of Object.entries(attrs)) e.setAttribute(k, v); return e; };
  const aleatorio = (() => { let s = 7; return () => { s = (s * 16807) % 2147483647; return (s - 1) / 2147483646; }; })(); // determinístico: a mesma "forma de onda" sempre

  // Controlador de um roteiro em laço. fn(esp) encena um ciclo; esp(ms) espera e aborta se a demonstração for pausada.
  function laco(root, fn) {
    let rodando = false, id = 0, preparado = false, posterEmCurso = null;
    const instante = () => Promise.resolve();
    // quadro final, sem animar. Duas chamadas ao mesmo tempo (ex.: montar + a troca de cena do filme) dividiam o mesmo
    // roteiro e escreviam cada letra duas vezes ("bbaarrbbeeaarriiaass"): a segunda espera a primeira.
    const poster = () => posterEmCurso || (posterEmCurso = (async () => {
      root.classList.add('demo-quieto');
      try { await fn(instante, true); } catch (e) { if (e !== ABORT) console.error(e); }
      preparado = true;
      requestAnimationFrame(() => requestAnimationFrame(() => root.classList.remove('demo-quieto')));
    })().finally(() => { posterEmCurso = null; }));
    return {
      poster,
      get preparado() { return preparado; },
      get on() { return rodando; },
      play() {
        if (rodando || reduzir) return;
        rodando = true; const meu = ++id;
        (async () => {
          const esp = (ms) => sleep(ms).then(() => { if (!rodando || meu !== id) throw ABORT; });
          try { while (rodando && meu === id) await fn(esp); } catch (e) { if (e !== ABORT) console.error(e); }
        })();
      },
      pause() { rodando = false; id++; },
    };
  }
  const digitar = async (el, texto, esp, passo = 42) => { el.textContent = ''; for (const c of texto) { el.textContent += c; await esp(passo); } };
  const tempo = (s) => `${Math.floor(s / 60)}:${String(Math.round(s % 60)).padStart(2, '0')}`;

  // ================= corte automático =================
  function autocut(root) {
    root.classList.add('da');
    const topo = h('div', 'da-top');
    const arq = add(h('div', 'da-file'), h('i'), h('span', null, 'video-setup.mp4'));
    const dur = add(h('div', 'da-dur'), h('span', null, 'duração'), h('b', null, '2:41'));
    add(topo, arq, dur);
    const tl = h('div', 'da-tl'), reg = h('div', 'da-ruler'), trk = h('div', 'da-trk'), faixa = h('div', 'da-track'), ph = h('div', 'da-ph');
    const plano = [['f', 14], ['s', 6], ['f', 10], ['s', 9], ['f', 18], ['s', 5], ['f', 12], ['s', 8], ['f', 9], ['s', 4], ['f', 15]];
    const segs = plano.map(([t, w]) => {
      const s = h('div', 'da-seg ' + (t === 'f' ? 'fala' : 'sil')); s.style.setProperty('--w', w);
      const barras = Math.max(3, Math.round(w * 1.1));
      for (let i = 0; i < barras; i++) { const b = h('i'); b.style.setProperty('--h', Math.round(18 + aleatorio() * 70) + '%'); s.append(b); }
      faixa.append(s); return s;
    });
    add(trk, faixa, ph); add(tl, reg, trk);
    const rodape = h('div', 'da-foot'), btn = h('div', 'da-btn', 'Cortar automaticamente'), stats = h('div', 'da-stats');
    const c1 = h('span', null, '5 cortes'), c2 = h('span', null, '−0:47 de silêncio'); add(stats, c1, c2);
    add(rodape, btn, stats);
    add(root, topo, tl, rodape);
    const total = plano.reduce((a, [, w]) => a + w, 0);
    const reset = () => {
      segs.forEach((s) => s.classList.remove('marcado', 'cortado'));
      ph.classList.remove('on'); ph.style.transition = 'none'; ph.style.left = '0%';
      btn.classList.remove('press'); c1.classList.remove('on'); c2.classList.remove('on');
      dur.lastChild.textContent = '2:41'; dur.lastChild.classList.remove('ok');
    };
    return laco(root, async (esp) => {
      reset(); await esp(700);
      void ph.offsetWidth; ph.style.transition = ''; ph.classList.add('on'); ph.style.left = '100%';
      for (let i = 0; i < segs.length; i++) { await esp((plano[i][1] / total) * 2200); if (plano[i][0] === 's') segs[i].classList.add('marcado'); }
      await esp(500); ph.classList.remove('on'); btn.classList.add('press'); await esp(260);
      segs.forEach((s, i) => { if (plano[i][0] === 's') s.classList.add('cortado'); });
      for (let s = 161; s >= 114; s -= 4) { dur.lastChild.textContent = tempo(s); await esp(40); }
      dur.lastChild.textContent = '1:54'; dur.lastChild.classList.add('ok');
      btn.classList.remove('press'); c1.classList.add('on'); await esp(220); c2.classList.add('on');
      await esp(2800);
    });
  }

  // ================= texto em motion =================
  function motion(root) {
    root.classList.add('dm');
    const prompt = h('div', 'dm-prompt'), caixa = h('div', 'dm-box'), btn = h('div', 'dm-btn', 'Criar com IA');
    add(prompt, caixa, btn);
    const palco = h('div', 'dm-stage'), chao = h('div', 'dm-floor'), titulo = h('div', 'dm-title'), sub = h('div', 'dm-sub'), tag = h('div', 'dm-tag', 'motion · 3D');
    add(palco, chao, titulo, sub, tag);
    add(root, prompt, palco);
    const ideias = [
      ['intro tech com o título MEU SETUP', 'MEU SETUP', 'EPISÓDIO 12 · PC GAMER'],
      ['botão pulsando LINK NA BIO', 'LINK NA BIO', 'TOQUE E ACESSE'],
      ['título 3D com o meu nome JARVIS', 'JARVIS', 'ASSISTENTE PESSOAL DE IA'],
    ];
    let k = 0, proximo = 0;
    const montar = (txt) => { titulo.replaceChildren(); let i = 0; for (const c of txt) { const s = h('span', c === ' ' ? 'sp' : null, c === ' ' ? '' : c); s.style.setProperty('--i', i++); titulo.append(s); } };
    return laco(root, async (esp, quadroFinal) => {
      k = quadroFinal ? 0 : proximo++ % ideias.length; const [fala, tit, legenda] = ideias[k];
      sub.classList.remove('on'); titulo.replaceChildren(); titulo.classList.remove('glitch'); btn.classList.remove('press');
      await esp(500); await digitar(caixa, fala, esp, 38); await esp(350);
      btn.classList.add('press'); await esp(240); btn.classList.remove('press');
      montar(tit); sub.textContent = legenda;
      await esp(1100); sub.classList.add('on'); await esp(500);
      titulo.classList.add('glitch'); await esp(450); titulo.classList.remove('glitch');
      await esp(2300);
    });
  }

  // ================= motion com IA: uma frase vira um anúncio animado =================
  // As cenas usam os mesmos elementos do Motion do app (título com zoom e brilho, contador, partículas, botão de chamada),
  // desenhados num canvas a partir do tempo t: o mesmo t gera sempre o mesmo quadro. Embaixo, a linha do tempo com as cenas.
  function anuncio(root) {
    root.classList.add('dm', 'dan');
    const prompt = h('div', 'dm-prompt'), caixa = h('div', 'dm-box'), btn = h('div', 'dm-btn', 'Criar com IA');
    add(prompt, caixa, btn);
    const tela = h('div', 'dan-tela'), cv = h('canvas'), gerando = add(h('div', 'dan-gerando'), h('i'), h('span', null, 'Montando as cenas'));
    add(tela, cv, h('div', 'dm-tag', 'motion · 1080p'), gerando);
    const CENAS = [['Gancho', 0, 1.6], ['Título', 1.6, 3.4], ['Contador', 3.4, 5.6], ['Chamada', 5.6, 7.6]], DUR = 7.6;
    const linha = h('div', 'dan-linha'), cabeca = h('i', 'dan-cabeca');
    const clipes = CENAS.map(([nome, a, b]) => { const c = h('span', 'dan-clipe', nome); c.style.flex = String(b - a); linha.append(c); return c; });
    linha.append(cabeca);
    add(root, prompt, tela, linha);
    const IDEIAS = [
      { pedido: 'anúncio da minha hamburgueria: combo duplo por R$ 29,90', cores: ['#FF5A1F', '#FFC53D'], gancho: 'FOME?', titulo: ['COMBO', 'DUPLO'], pre: 'SÓ HOJE', num: 29.9, dec: 2, antes: 'R$ ', depois: '', chamada: 'PEÇA AGORA', rodape: 'entrega em 30 minutos' },
      { pedido: 'promoção da loja: 40% off só neste fim de semana', cores: ['#2E9BFF', '#00E0FF'], gancho: 'CORRE!', titulo: ['FIM DE', 'SEMANA'], pre: 'ATÉ', num: 40, dec: 0, antes: '', depois: '% OFF', chamada: 'LINK NA BIO', rodape: 'até domingo, 23h59' },
      { pedido: 'intro do meu canal de games, episódio novo toda sexta', cores: ['#8B5CF6', '#00D2FF'], gancho: 'PREPARA', titulo: ['GAME', 'NIGHT'], pre: 'EPISÓDIO', num: 12, dec: 0, antes: '#', depois: '', chamada: 'INSCREVA-SE', rodape: 'toda sexta, 19h' },
    ];
    const ctx = cv.getContext('2d');
    let W = 0, H = 0, U = 1, raf = 0, ultimo = { t: 4.75, I: IDEIAS[0], vazio: false };
    const cl = (x, a = 0, b = 1) => Math.max(a, Math.min(b, x));
    const fase = (t, a, b) => cl((t - a) / (b - a));
    const eOut = (x) => 1 - Math.pow(1 - x, 3);
    const eBack = (x) => { const c1 = 1.70158, c3 = c1 + 1; return 1 + c3 * Math.pow(x - 1, 3) + c1 * Math.pow(x - 1, 2); };
    const semente = (i) => { const x = Math.sin(i * 12.9898 + 4.1) * 43758.5453; return x - Math.floor(x); }; // sem estado: a mesma partícula fica no mesmo lugar a cada quadro
    const rgba = (hex, a) => { const n = parseInt(hex.slice(1), 16); return `rgba(${n >> 16},${(n >> 8) & 255},${n & 255},${a})`; };
    const fonte = (peso, tam) => { ctx.font = `${peso} ${tam * U}px Geist, "Segoe UI", sans-serif`; };
    const gradX = (x0, x1, cores) => { const g = ctx.createLinearGradient(x0, 0, x1, 0); cores.forEach((c, i) => g.addColorStop(i / (cores.length - 1), c)); return g; };
    function medirTela() {
      const r = tela.getBoundingClientRect(); if (!r.width || !r.height) return false;
      const dpr = Math.min(2, window.devicePixelRatio || 1), w = Math.round(r.width * dpr), hh = Math.round(r.height * dpr);
      if (cv.width !== w || cv.height !== hh) { cv.width = w; cv.height = hh; }
      W = w; H = hh; U = Math.min(W / 640, H / 360); return true;
    }
    // texto centralizado com degradê e brilho
    function palavra(t, x, y, tam, peso, cores, brilho, alfa = 1, esp = 0) {
      ctx.save(); fonte(peso, tam); ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.letterSpacing = esp * U + 'px'; ctx.globalAlpha *= alfa;
      const w = ctx.measureText(t).width; ctx.fillStyle = gradX(x - w / 2, x + w / 2, cores);
      if (brilho) { ctx.shadowColor = brilho; ctx.shadowBlur = 26 * U; }
      ctx.fillText(t, x, y); ctx.restore(); return w;
    }
    function fundo(t, I, forca = 1) {
      ctx.fillStyle = '#02050b'; ctx.fillRect(-40, -40, W + 80, H + 80);
      const [c1, c2] = I.cores;
      let g = ctx.createRadialGradient(W * (0.5 + 0.2 * Math.sin(t * 0.9)), H * 0.42, 0, W * 0.5, H * 0.42, Math.max(W, H) * 0.62);
      g.addColorStop(0, rgba(c1, (0.3 + 0.08 * Math.sin(t * 4)) * forca)); g.addColorStop(1, rgba(c1, 0)); ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
      g = ctx.createRadialGradient(W * 0.15, H, 0, W * 0.15, H, Math.max(W, H) * 0.5); g.addColorStop(0, rgba(c2, 0.18 * forca)); g.addColorStop(1, rgba(c2, 0)); ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
      // chão em perspectiva andando para a frente
      const hz = H * 0.66, fx = W / 2;
      ctx.save(); ctx.strokeStyle = rgba(c2, 0.22 * forca); ctx.lineWidth = Math.max(1, U * 0.8); ctx.beginPath();
      for (let i = -12; i <= 12; i++) { ctx.moveTo(fx + i * W * 0.012, hz); ctx.lineTo(fx + i * W * 0.16, H + 10); }
      for (let k = 0; k < 9; k++) { const p = ((k + (t * 1.4) % 1) / 9), y = hz + (H - hz) * p * p; ctx.moveTo(0, y); ctx.lineTo(W, y); }
      ctx.stroke(); ctx.restore();
      g = ctx.createLinearGradient(0, hz - 30 * U, 0, hz + 18 * U); g.addColorStop(0, 'rgba(2,5,11,0)'); g.addColorStop(0.6, 'rgba(2,5,11,.85)'); g.addColorStop(1, 'rgba(2,5,11,0)'); ctx.fillStyle = g; ctx.fillRect(0, hz - 30 * U, W, 48 * U);
    }
    function particulas(t, I, n, sobe) {
      ctx.save();
      for (let i = 0; i < n; i++) {
        const a = semente(i * 3), b = semente(i * 3 + 1), c = semente(i * 3 + 2);
        const x = W * a, y = (H * (1 - ((b + t * sobe * (0.05 + c * 0.08)) % 1)));
        ctx.globalAlpha = 0.25 + 0.6 * c; ctx.fillStyle = c > 0.5 ? I.cores[1] : '#ffffff';
        ctx.beginPath(); ctx.arc(x, y, (0.6 + 1.6 * c) * U, 0, 6.2832); ctx.fill();
      }
      ctx.restore();
    }
    // 1 · gancho: a palavra cai de perto da câmera, com tremor e um feixe de luz cruzando
    function cenaGancho(t, I) {
      const p = eBack(fase(t, 0, 0.5)), sai = eOut(fase(t, 1.32, 1.6));
      const esc = (2.6 - 1.6 * p) * (1 + sai * 0.9), cx = W / 2, cy = H * 0.44;
      for (let e = 2; e >= 1; e--) { // ecos
        ctx.save(); ctx.translate(cx, cy); ctx.scale(esc * (1 + e * 0.16), esc * (1 + e * 0.16));
        palavra(I.gancho, 0, 0, 74, 800, [I.cores[0], I.cores[1]], null, (0.16 / e) * fase(t, 0.05, 0.4) * (1 - sai)); ctx.restore();
      }
      ctx.save(); ctx.translate(cx, cy); ctx.scale(esc, esc);
      palavra(I.gancho, 0, 0, 74, 800, ['#ffffff', I.cores[1]], I.cores[0], fase(t, 0, 0.18) * (1 - sai), -2); ctx.restore();
      const f = fase(t, 0.45, 1.05); // feixe
      if (f > 0 && f < 1) {
        ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.translate(-W * 0.3 + f * W * 1.6, 0); ctx.rotate(0.35);
        const g = ctx.createLinearGradient(-40 * U, 0, 40 * U, 0); g.addColorStop(0, 'rgba(255,255,255,0)'); g.addColorStop(0.5, 'rgba(255,255,255,.35)'); g.addColorStop(1, 'rgba(255,255,255,0)');
        ctx.fillStyle = g; ctx.fillRect(-40 * U, -H, 80 * U, H * 3); ctx.restore();
      }
    }
    // 2 · título: duas linhas entram dos lados com rastro, e um anel de luz se desenha atrás
    function cenaTitulo(t, I) {
      const cx = W / 2, cy = H * 0.43, R = 118 * U, pa = eOut(fase(t, 0.05, 0.9));
      ctx.save(); ctx.translate(cx, cy); ctx.rotate(-1.4 + t * 0.6); ctx.strokeStyle = I.cores[1]; ctx.lineWidth = 3 * U; ctx.lineCap = 'round';
      ctx.shadowColor = I.cores[1]; ctx.shadowBlur = 22 * U; ctx.beginPath(); ctx.arc(0, 0, R, 0, 6.2832 * pa * 0.86); ctx.stroke();
      ctx.globalAlpha = 0.4; ctx.lineWidth = 1.5 * U; ctx.setLineDash([10 * U, 14 * U]); ctx.beginPath(); ctx.arc(0, 0, R * 1.22, 0, 6.2832 * pa); ctx.stroke(); ctx.restore();
      particulas(t, I, 46, 1);
      I.titulo.forEach((txt, i) => {
        const p = eOut(fase(t, 0.08 + i * 0.14, 0.62 + i * 0.14)), lado = i ? 1 : -1, x = cx + lado * (1 - p) * W * 0.7, y = cy + (i ? 40 : -34) * U;
        const cores = i ? [I.cores[0], I.cores[1]] : ['#ffffff', '#d7e3f0'];
        for (let k = 3; k >= 1; k--) palavra(txt, x + lado * k * (1 - p) * 60 * U, y, 66, 800, cores, null, 0.12 * (1 - p) * (4 - k), -1);
        palavra(txt, x, y, 66, 800, cores, i ? I.cores[0] : null, fase(t, 0.08 + i * 0.14, 0.3 + i * 0.14), -1);
      });
    }
    // 3 · contador: o número cresce, estoura em partículas e solta ondas de choque
    function cenaContador(t, I) {
      const cx = W / 2, cy = H * 0.45, v = I.num * eOut(fase(t, 0.15, 1.0));
      const txt = I.antes + v.toFixed(I.dec).replace('.', ',') + I.depois;
      const bump = Math.sin(Math.PI * fase(t, 1.0, 1.3)) * 0.14;
      palavra(I.pre, cx, cy - 66 * U, 20, 600, ['#ffffff', I.cores[1]], null, eOut(fase(t, 0, 0.35)), 6);
      for (let k = 0; k < 2; k++) { // ondas de choque
        const f = fase(t, 1.0 + k * 0.16, 1.9 + k * 0.16); if (f <= 0 || f >= 1) continue;
        ctx.save(); ctx.strokeStyle = rgba(k ? I.cores[1] : I.cores[0], 1 - f); ctx.lineWidth = (5 - 3 * f) * U; ctx.beginPath(); ctx.ellipse(cx, cy, W * 0.55 * eOut(f), H * 0.42 * eOut(f), 0, 0, 6.2832); ctx.stroke(); ctx.restore();
      }
      const fb = fase(t, 1.0, 2.1); // estouro
      if (fb > 0 && fb < 1) {
        ctx.save(); ctx.globalCompositeOperation = 'lighter';
        for (let i = 0; i < 48; i++) {
          const a = (i / 48) * 6.2832 + i * 0.37, s = 0.45 + ((i * 37) % 11) / 11, d = eOut(fb) * s * W * 0.42, x = cx + Math.cos(a) * d, y = cy + Math.sin(a) * d * 0.7;
          ctx.strokeStyle = rgba(i % 3 ? I.cores[1] : '#ffffff', (1 - fb) * 0.9); ctx.lineWidth = 2 * U;
          ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x - Math.cos(a) * 16 * U * (1 - fb), y - Math.sin(a) * 11 * U * (1 - fb)); ctx.stroke();
        }
        ctx.restore();
      }
      ctx.save(); ctx.translate(cx, cy + 8 * U); ctx.scale(1 + bump, 1 + bump);
      palavra(txt, 0, 0, 104, 800, ['#ffffff', I.cores[1], I.cores[0]], I.cores[0], eOut(fase(t, 0.05, 0.3)), -3); ctx.restore();
      palavra(I.rodape, cx, cy + 82 * U, 17, 500, ['#c9d6e6', '#ffffff'], null, eOut(fase(t, 1.2, 1.6)), 1);
    }
    // 4 · chamada: botão entra com pulo, pulsa, recebe um brilho e um toque
    function cenaChamada(t, I) {
      const cx = W / 2, cy = H * 0.47, p = eBack(fase(t, 0, 0.45)), pulso = 1 + 0.035 * Math.sin(t * 9) * fase(t, 0.5, 0.8);
      const bw = 270 * U, bh = 66 * U;
      ctx.save(); ctx.translate(cx, cy); ctx.scale(p * pulso, p * pulso);
      ctx.shadowColor = I.cores[0]; ctx.shadowBlur = 40 * U; ctx.beginPath(); ctx.roundRect(-bw / 2, -bh / 2, bw, bh, bh / 2); ctx.fillStyle = gradX(-bw / 2, bw / 2, [I.cores[0], I.cores[1]]); ctx.fill();
      ctx.shadowBlur = 0; ctx.save(); ctx.clip();
      for (const ini of [0.55, 1.35]) { const f = fase(t, ini, ini + 0.55); if (f > 0 && f < 1) { ctx.save(); ctx.translate(-bw * 0.7 + f * bw * 1.4, 0); ctx.rotate(0.4); const g = ctx.createLinearGradient(-22 * U, 0, 22 * U, 0); g.addColorStop(0, 'rgba(255,255,255,0)'); g.addColorStop(0.5, 'rgba(255,255,255,.75)'); g.addColorStop(1, 'rgba(255,255,255,0)'); ctx.fillStyle = g; ctx.fillRect(-22 * U, -bh * 2, 44 * U, bh * 4); ctx.restore(); } }
      ctx.restore();
      fonte(800, 27); ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.letterSpacing = 2 * U + 'px'; ctx.fillStyle = '#04111c'; ctx.fillText(I.chamada, 0, 1 * U);
      ctx.restore();
      const ft = fase(t, 1.0, 1.6); // toque
      if (ft > 0 && ft < 1) { ctx.save(); ctx.strokeStyle = `rgba(255,255,255,${1 - ft})`; ctx.lineWidth = 2.5 * U; ctx.beginPath(); ctx.arc(cx + bw * 0.28, cy + 4 * U, 8 * U + ft * 46 * U, 0, 6.2832); ctx.stroke(); ctx.restore(); }
      palavra(I.rodape, cx, cy + 66 * U, 17, 500, ['#c9d6e6', '#ffffff'], null, eOut(fase(t, 0.5, 1.0)), 1);
      particulas(t + 3, I, 30, 1.6);
    }
    function quadro(t, I, vazio) {
      ultimo = { t, I, vazio };
      if (!medirTela()) return;
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      if (vazio) { fundo(0, I, 0.35); return; }
      const tremor = t < 1.6 ? (1 - fase(t, 0.1, 0.8)) * 7 * U : 0;
      ctx.translate(Math.sin(t * 93) * tremor, Math.cos(t * 71) * tremor);
      fundo(t, I);
      if (t < 1.6) cenaGancho(t, I); else if (t < 3.4) cenaTitulo(t - 1.6, I); else if (t < 5.6) cenaContador(t - 3.4, I); else cenaChamada(t - 5.6, I);
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      for (const c of [0, 1.6, 3.4, 5.6]) { const f = 1 - fase(t, c, c + 0.2); if (t >= c && f > 0) { ctx.fillStyle = `rgba(255,255,255,${0.32 * f})`; ctx.fillRect(0, 0, W, H); } } // corte com flash
      const g = ctx.createRadialGradient(W / 2, H / 2, Math.min(W, H) * 0.3, W / 2, H / 2, Math.max(W, H) * 0.72); g.addColorStop(0, 'rgba(0,0,0,0)'); g.addColorStop(1, 'rgba(0,0,0,.7)'); ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
      cabeca.style.left = (t / DUR) * 100 + '%';
      clipes.forEach((c, i) => c.classList.toggle('on', t >= CENAS[i][1] && (t < CENAS[i][2] || i === CENAS.length - 1)));
    }
    if ('ResizeObserver' in window) new ResizeObserver(() => quadro(ultimo.t, ultimo.I, ultimo.vazio)).observe(tela);
    document.fonts?.load('800 40px Geist').then(() => quadro(ultimo.t, ultimo.I, ultimo.vazio)).catch(() => {});
    // toca o anúncio em tempo real; esp() mede a duração e interrompe tudo se a demonstração for pausada
    function tocar(I, esp) {
      const ini = performance.now();
      const passo = () => { const t = Math.min(DUR, (performance.now() - ini) / 1000); quadro(t, I); if (t < DUR) raf = requestAnimationFrame(passo); };
      cancelAnimationFrame(raf); raf = requestAnimationFrame(passo);
      return esp(DUR * 1000 + 900).finally(() => cancelAnimationFrame(raf));
    }
    let proximo = 0;
    return laco(root, async (esp, quadroFinal) => {
      const I = IDEIAS[quadroFinal ? 0 : proximo++ % IDEIAS.length];
      btn.classList.remove('press'); gerando.classList.remove('on');
      if (quadroFinal) { caixa.textContent = I.pedido; clipes.forEach((c) => c.classList.add('pronto')); quadro(4.75, I); return; }
      clipes.forEach((c) => c.classList.remove('pronto', 'on')); cabeca.style.left = '0%'; caixa.textContent = ''; quadro(0, I, true);
      await esp(450); await digitar(caixa, I.pedido, esp, 30); await esp(320);
      btn.classList.add('press'); await esp(220); btn.classList.remove('press');
      gerando.classList.add('on');
      for (const c of clipes) { await esp(240); c.classList.add('pronto'); }
      await esp(260); gerando.classList.remove('on');
      await tocar(I, esp);
    });
  }

  // ================= detecção de setup =================
  function setup(root) {
    root.classList.add('ds');
    const els = [['mon', 'MONITOR', 20, 11, 46, 40], ['pc', 'GABINETE', 72, 15, 14, 44], ['kb', 'TECLADO MECÂNICO', 22, 69, 42, 10], ['ms', 'MOUSE', 70, 70, 5, 9]];
    add(root, h('div', 'ds-desk'));
    els.forEach(([c]) => add(root, h('div', 'ds-el ds-' + c)));
    const scan = h('div', 'ds-scan'); root.append(scan);
    const boxes = els.map(([, nome, x, y, w, hh]) => {
      const b = h('div', 'ds-bx'); b.style.cssText = `left:${x - 1.5}%;top:${y - 3}%;width:${w + 3}%;height:${hh + 6}%`; add(b, h('b', null, nome)); root.append(b); return b;
    });
    const stat = h('div', 'ds-stat'); add(stat, h('i'), h('span', null, 'escaneando o vídeo…')); root.append(stat);
    const msg = stat.lastChild;
    return laco(root, async (esp) => {
      boxes.forEach((b) => b.classList.remove('on')); scan.classList.remove('on'); scan.style.transition = 'none'; stat.classList.remove('ok'); msg.textContent = 'escaneando o vídeo…';
      await esp(600); void scan.offsetWidth; scan.style.transition = ''; scan.classList.add('on');
      const ordem = [0, 1, 2, 3];
      await esp(500); boxes[ordem[0]].classList.add('on'); await esp(420); boxes[ordem[1]].classList.add('on'); await esp(520); boxes[ordem[2]].classList.add('on'); await esp(250); boxes[ordem[3]].classList.add('on');
      await esp(500); stat.classList.add('ok'); msg.textContent = '4 peças encontradas — chamadas criadas';
      await esp(3200);
    });
  }

  // ================= núcleo de voz: o mesmo anel de energia da tela do app =================
  // o anel (orb.js) só desenha enquanto a demonstração está tocando; parada, fica o último quadro
  function anelDoApp(cv, centro = 0.5) {
    if (!window.Orb) return null;
    const o = new window.Orb(cv); o.setModo('anel'); o.setColor('#2E9BFF'); o.setCentro(centro);
    o._pi = setTimeout(() => o.pausar(), 900); // desenha alguns quadros (pôster) e para até a demonstração tocar
    return o;
  }
  function voz(root) {
    root.classList.add('dv');
    const cv = h('canvas'); root.append(cv);
    const status = h('div', 'dv-status'); add(status, h('i'), h('span', null, 'JARVIS · pronto')); root.append(status);
    const log = h('div', 'dv-log'); root.append(log);
    const bar = h('div', 'dv-bar');
    const mic = svg('svg', { viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', 'stroke-width': '1.8', 'stroke-linecap': 'round', 'stroke-linejoin': 'round' });
    mic.append(svg('rect', { x: 9, y: 3, width: 6, height: 11, rx: 3 }), svg('path', { d: 'M5 11a7 7 0 0 0 14 0M12 18v3' }));
    const fala = h('span'); add(bar, mic, fala); root.append(bar);
    const st = status.lastChild;
    const orb = anelDoApp(cv, 0.47);
    let nivel = 0.12, raf = 0;
    const pulsar = () => { raf = 0; if (!orb || orb.parado) return; orb.setLevel(Math.max(0, nivel + (Math.random() - 0.5) * nivel * 0.9)); raf = requestAnimationFrame(pulsar); };
    const itens = ['Editor aberto', 'video-setup.mp4 carregado', '5 silêncios cortados'];
    const c = laco(root, async (esp) => {
      log.replaceChildren(); fala.textContent = ''; st.textContent = 'JARVIS · ouvindo'; orb?.setState('listening'); nivel = 0.75;
      await esp(700); await digitar(fala, 'abre o editor e corta os silêncios do vídeo', esp, 36);
      nivel = 0.2; orb?.setState('thinking'); st.textContent = 'JARVIS · executando'; await esp(500);
      orb?.setState('speaking'); nivel = 0.45;
      for (const t of itens) { const s = h('span', null, t); log.append(s); void s.offsetWidth; s.classList.add('on'); await esp(650); }
      st.textContent = 'JARVIS · pronto'; orb?.setState('idle'); nivel = 0.12; await esp(3000);
    });
    const play = c.play.bind(c), pause = c.pause.bind(c), poster = c.poster.bind(c);
    return { get on() { return c.on; }, get preparado() { return c.preparado; }, poster, play() { if (reduzir) return; if (orb) { clearTimeout(orb._pi); orb.retomar(); } if (!raf) raf = requestAnimationFrame(pulsar); play(); }, pause() { pause(); setTimeout(() => { if (!c.on) orb?.pausar(); }, 400); } };
  }

  // ================= mapeamento de leads: igual à tela do app (busca, mapa escuro com radar e a lista de leads com status) =================
  function mapa(root) {
    root.classList.add('dmp');
    const ico = (d) => { const s = svg('svg', { viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', 'stroke-width': '1.8', 'stroke-linecap': 'round', 'stroke-linejoin': 'round', 'aria-hidden': 'true' }); s.append(svg('path', { d })); return s; };
    // números do topo
    const kpis = h('div', 'dmp-kpis');
    const kpi = (nome) => { const k = add(h('div', 'dmp-kpi'), h('small', null, nome), h('b', null, '0')); kpis.append(k); return k.lastChild; };
    const kMapa = kpi('No mapa'), kSem = kpi('Sem site'), kCont = kpi('Com contato'), kAbord = kpi('Contatados');
    // busca (coluna da esquerda)
    const busca = add(h('div', 'dmp-busca'), add(h('h5'), ico('M11 4a7 7 0 1 0 0 14 7 7 0 0 0 0-14zM20 20l-4-4'), document.createTextNode('Buscar negócios')));
    const seg = h('div', 'dmp-campo'), cid = h('div', 'dmp-campo');
    const chips = add(h('div', 'dmp-chips'), ...['restaurantes', 'barbearias', 'academias', 'pet shops'].map((t) => h('span', null, t)));
    const raio = add(h('div', 'dmp-raio-lin'), h('small', null, 'Raio da busca'), h('em', null, '5 km')); const trilho = add(h('div', 'dmp-trilho'), h('i'));
    const btn = add(h('div', 'dmp-btn'), ico('M11 4a7 7 0 1 0 0 14 7 7 0 0 0 0-14zM20 20l-4-4'), document.createTextNode('Buscar no mapa'));
    add(busca, h('small', null, 'Segmento'), seg, chips, h('small', null, 'Cidade ou bairro'), cid, raio, trilho, btn);
    // mapa escuro (centro)
    const mp = h('div', 'dmp-mapa');
    const s = svg('svg', { viewBox: '0 0 100 80', preserveAspectRatio: 'xMidYMid slice' });
    s.append(svg('path', { d: 'M0 62 Q22 52 40 60 T80 54 T100 58 L100 80 L0 80 Z', fill: 'rgba(41,216,255,.07)' })); // mar
    [['M0 18 L100 30', .9], ['M0 44 L100 36', .9], ['M24 0 L36 80', .9], ['M70 0 L62 80', .9], ['M0 8 Q50 22 100 10', .5], ['M48 0 L50 80', .5], ['M12 0 L18 62', .4], ['M86 0 L92 62', .4], ['M0 30 L100 22', .4], ['M0 52 Q50 46 100 50', .5]]
      .forEach(([d, w]) => s.append(svg('path', { d, stroke: 'rgba(160,200,230,.16)', 'stroke-width': w, fill: 'none' })));
    [['Santos', 44, 34], ['Gonzaga', 58, 50], ['Ponta da Praia', 74, 60], ['Vila Belmiro', 26, 22]].forEach(([t, x, y]) => { const tx = svg('text', { x, y, fill: 'rgba(170,200,225,.45)', 'font-size': 2.6, 'text-anchor': 'middle', 'font-family': 'Geist, sans-serif' }); tx.textContent = t; s.append(tx); });
    mp.append(s);
    const radar = h('div', 'dmp-radar'); const anelR = h('div', 'dmp-anel'); mp.append(anelR, radar);
    const vazio = add(h('div', 'dmp-vazio'), ico('M12 21s-7-6.2-7-12a7 7 0 0 1 14 0c0 5.8-7 12-7 12zM12 11.5a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5z'), h('b', null, 'Escolha um segmento e uma cidade'), h('span', null, 'O JARVIS procura negócios sem site e com contato.'));
    mp.append(vazio);
    const posicoes = [[40, 40], [55, 34], [48, 55], [63, 46], [32, 58], [70, 38], [52, 66], [44, 28]];
    const pins = posicoes.map(([x, y]) => { const p = h('div', 'dmp-pin'); p.style.left = x + '%'; p.style.top = y + '%'; mp.append(p); return p; });
    // leads (direita)
    const leads = add(h('div', 'dmp-leads'), add(h('h5'), ico('M16 19v-1a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v1M9 10a3 3 0 1 0 0-6 3 3 0 0 0 0 6zM22 19v-1a4 4 0 0 0-3-3.9M16 4.1a3 3 0 0 1 0 5.8'), document.createTextNode('Leads')));
    const filtros = add(h('div', 'dmp-filtros'), ...['Todos', 'Novo', 'Contatado', 'Fechado'].map((t, i) => h('span', i === 0 ? 'on' : null, t)));
    leads.append(filtros);
    const nomes = [['Barbearia Aurora', 'barbearia · 0,8 km'], ['Corte Fino', 'barbearia · 1,4 km'], ['Navalha de Ouro', 'barbearia · 2,1 km'], ['Estilo Gonzaga', 'barbearia · 2,9 km']];
    const linhas = nomes.map(([n, t]) => { const r = h('div', 'dmp-lead'); const sit = h('em', 'novo', 'Novo'); add(r, add(h('div'), h('b', null, n), h('small', null, t)), sit); leads.append(r); return { r, sit }; });
    add(root, kpis, busca, mp, leads);
    const contar = async (el, alvo, esp) => { const de = Number(el.textContent) || 0; for (let v = de; v <= alvo; v++) { el.textContent = String(v); await esp(55); } };
    return laco(root, async (esp) => {
      [kMapa, kSem, kCont, kAbord].forEach((k) => { k.textContent = '0'; }); seg.textContent = ''; cid.textContent = ''; btn.classList.remove('press');
      chips.querySelectorAll('span').forEach((c) => c.classList.remove('on')); radar.classList.remove('on'); anelR.classList.remove('on'); vazio.classList.remove('sai');
      pins.forEach((p) => p.classList.remove('on', 'contato')); linhas.forEach(({ r, sit }) => { r.classList.remove('on'); sit.className = 'novo'; sit.textContent = 'Novo'; });
      await esp(500); chips.children[1].classList.add('on'); await digitar(seg, 'barbearias', esp, 45); await esp(200); await digitar(cid, 'Santos, SP', esp, 45);
      await esp(250); btn.classList.add('press'); await esp(260); btn.classList.remove('press');
      vazio.classList.add('sai'); anelR.classList.add('on'); radar.classList.add('on'); await esp(600);
      for (let i = 0; i < pins.length; i++) { pins[i].classList.add('on'); kMapa.textContent = String(i + 1); if (linhas[i]) linhas[i].r.classList.add('on'); await esp(330); }
      await contar(kSem, 6, esp); await contar(kCont, 5, esp);
      await esp(500); linhas[0].sit.className = 'contatado'; linhas[0].sit.textContent = 'Contatado'; pins[0].classList.add('contato'); kAbord.textContent = '1';
      await esp(3000);
    });
  }

  // ================= transcritor =================
  function transcrever(root) {
    root.classList.add('dt');
    const esq = h('div', 'dt-esq'), arq = add(h('div', 'dt-file'), h('b', null, 'reuniao.mp3'), h('span', null, '1:02:14'));
    const onda = h('div', 'dt-wave'); const barras = [];
    for (let i = 0; i < 30; i++) { const b = h('i'); b.style.setProperty('--h', Math.round(14 + aleatorio() * 76) + '%'); onda.append(b); barras.push(b); }
    const prog = h('div', 'dt-prog'), pi = h('i'); prog.append(pi);
    add(esq, arq, onda, prog);
    const dir = h('div', 'dt-dir'), txt = h('div', 'dt-txt');
    const falas = [['0:00', 'Bem-vindos à reunião de planejamento.'], ['0:07', 'Primeiro ponto: o lançamento do plano premium.'], ['0:15', 'Depois, a campanha de vídeos curtos.']];
    const lin = falas.map(([t, f]) => { const l = h('div', 'dt-lin'); add(l, h('small', null, t), document.createTextNode(f)); txt.append(l); return l; });
    const res = h('div', 'dt-res'); const ul = h('ul'); ['Plano premium em novembro', 'Campanha de vídeos curtos'].forEach((t) => ul.append(h('li', null, t)));
    const fmt = h('div', 'dt-fmt'); const fs = ['TXT', 'PDF', 'SRT'].map((t) => { const s = h('span', null, t); fmt.append(s); return s; });
    add(res, h('b', null, 'Resumo e tarefas'), ul, fmt);
    add(dir, txt, res); add(root, esq, dir);
    return laco(root, async (esp) => {
      lin.forEach((l) => l.classList.remove('on')); res.classList.remove('on'); fs.forEach((s) => s.classList.remove('on')); barras.forEach((b) => b.classList.remove('tocada')); pi.style.transition = 'none'; pi.style.width = '0%';
      await esp(500); void pi.offsetWidth; pi.style.transition = 'width 4s linear'; pi.style.width = '100%';
      let li = 0;
      for (let i = 0; i < barras.length; i++) { barras[i].classList.add('tocada'); if (i === 3 + li * 9 && li < lin.length) lin[li++].classList.add('on'); await esp(130); }
      await esp(300); res.classList.add('on'); await esp(500);
      for (const s of fs) { s.classList.add('on'); await esp(380); }
      await esp(2600);
    });
  }

  // ================= roteiro =================
  function roteiro(root) {
    root.classList.add('dr');
    const form = h('div', 'dr-form');
    const f1 = add(h('div'), h('small', null, 'Formato'), document.createTextNode('Reels · 30 s')); const f2 = add(h('div'), h('small', null, 'Estrutura'), document.createTextNode('Gancho → oferta'));
    const tema = add(h('div', 'tema'), h('small', null, 'Tema do vídeo'), h('span')); const btn = h('div', 'dr-btn', 'Gerar roteiro');
    add(form, f1, f2, tema, btn);
    const saida = h('div', 'dr-out');
    const g = add(h('div', 'dr-gancho'), h('small', null, 'GANCHO · 3 PRIMEIROS SEGUNDOS'), h('span'));
    const cenas = [['CENA 1 · 0–10 s', 'FALA', 'Sabe aquele vídeo que fica horas na edição?', 'EDIÇÃO', 'zoom rápido + legenda animada'], ['CENA 2 · 10–30 s', 'FALA', 'Eu digito e o JARVIS monta tudo.', 'MOSTRAR', 'o editor cortando os silêncios']];
    const cs = cenas.map(([t, a, ta, b, tb]) => { const c = h('div', 'dr-cena'); add(c, h('small', null, t), add(h('p'), h('b', null, a + ': '), document.createTextNode(ta)), add(h('p'), h('b', null, b + ': '), document.createTextNode(tb))); return c; });
    const ac = add(h('div', 'dr-acoes'), h('span', null, 'Copiar roteiro'), h('span', null, 'Teleprompter'));
    add(saida, g, ...cs, ac); add(root, form, saida);
    return laco(root, async (esp) => {
      [g, ...cs, ac].forEach((x) => x.classList.remove('on')); tema.lastChild.textContent = ''; g.lastChild.textContent = ''; btn.classList.remove('press');
      await esp(500); await digitar(tema.lastChild, 'meu setup gamer', esp, 40); await esp(300);
      btn.classList.add('press'); await esp(260); btn.classList.remove('press');
      g.classList.add('on'); await digitar(g.lastChild, 'Editei em minutos — e foi uma IA.', esp, 24);
      for (const c of cs) { await esp(380); c.classList.add('on'); }
      await esp(500); ac.classList.add('on'); await esp(2800);
    });
  }

  // ================= chaves de IA =================
  function tokens(root) {
    root.classList.add('dk');
    const a = h('div', 'dk-card'); const ab = h('div', 'dk-btn', 'Criar chave'); const chave = h('div', 'dk-chave', 'AIzaSy…Xq4');
    add(a, h('h4', null, '1 · aistudio.google.com'), ab, chave);
    const seta = h('div', 'dk-seta'), bola = h('i'); seta.append(bola);
    const b = h('div', 'dk-card'); const campo = add(h('div', 'dk-campo'), h('span', null, 'Gemini'), h('span', null, 'cole aqui'));
    const lock = add(h('div', 'dk-lock'), h('span', null, 'só no seu PC'));
    add(b, h('h4', null, '2 · JARVIS · Cérebro (IAs)'), campo, lock);
    add(root, a, seta, b);
    const val = campo.lastChild;
    return laco(root, async (esp) => {
      chave.classList.remove('on'); ab.classList.remove('press'); bola.classList.remove('go'); campo.classList.remove('cheio'); val.textContent = 'cole aqui'; lock.classList.remove('on');
      await esp(700); ab.classList.add('press'); await esp(280); ab.classList.remove('press'); chave.classList.add('on');
      await esp(900); void bola.offsetWidth; bola.classList.add('go'); await esp(1000);
      campo.classList.add('cheio'); val.textContent = '••••••••••••••••••••'; await esp(500); lock.classList.add('on');
      await esp(3200);
    });
  }

  // ================= central de automação =================
  function central(root) {
    root.classList.add('dc');
    const kp = h('div', 'dc-kpis'); const mk = (nome, v) => { const d = h('div', 'dc-kpi'); const b = h('b', null, v), i = h('i'), s = h('s'); i.append(s); add(d, h('small', null, nome), b, i); kp.append(d); return { b, s }; };
    const cpu = mk('Processador', '13%'), ram = mk('Memória', '72%'), dsc = mk('Disco livre', '183 GB');
    const lista = h('div', 'dc-lista'); const cab = add(h('h4'), h('span', null, 'Limpeza segura'), h('em', null, '0 MB'));
    const itens = [['Arquivos temporários', '120 MB'], ['Prévias do editor', '64 MB'], ['Restos de renderização', '20 MB']].map(([n, m]) => { const l = h('div', 'dc-it'); add(l, h('i'), h('div', null, n), h('span', null, m)); lista.append(l); return l; });
    lista.prepend(cab); add(root, kp, lista);
    const em = cab.lastChild;
    return laco(root, async (esp) => {
      itens.forEach((l) => l.classList.remove('on')); em.textContent = '0 MB'; cpu.s.style.width = '13%'; ram.s.style.width = '72%'; dsc.s.style.width = '60%';
      await esp(500); cpu.s.style.width = '42%'; cpu.b.textContent = '42%'; await esp(700); cpu.s.style.width = '18%'; cpu.b.textContent = '18%'; ram.s.style.width = '64%'; ram.b.textContent = '64%'; await esp(500);
      let tot = 0; const mbs = [120, 64, 20];
      for (let i = 0; i < itens.length; i++) { itens[i].classList.add('on'); tot += mbs[i]; em.textContent = tot + ' MB liberados'; await esp(650); }
      dsc.s.style.width = '62%'; dsc.b.textContent = '183,2 GB'; await esp(3000);
    });
  }

  // ================= editor: três demonstrações em rodízio =================
  function editor(root) {
    const caixa = h('div', 'de'); root.append(caixa);
    const defs = [['Corte automático', autocut], ['Texto em motion', motion], ['Detectar setup', setup]];
    const kids = defs.map(([, f]) => { const d = h('div', 'demo'); caixa.append(d); return { el: d, c: f(d) }; });
    const tabs = h('div', 'de-tabs'); tabs.setAttribute('role', 'tablist');
    const bs = defs.map(([nome], i) => { const b = h('button', null, nome); b.type = 'button'; b.setAttribute('role', 'tab'); b.addEventListener('click', () => { mostrar(i); if (rodando) agendar(); }); tabs.append(b); return b; });
    root.append(tabs);
    let atual = -1, rodando = false, timer = 0;
    function mostrar(i) {
      if (i === atual) return; atual = i;
      kids.forEach((k, j) => { k.el.classList.toggle('vis', j === i); if (j === i) { rodando ? k.c.play() : k.c.poster(); } else k.c.pause(); });
      bs.forEach((b, j) => b.setAttribute('aria-selected', String(j === i)));
    }
    const agendar = () => { clearTimeout(timer); timer = setTimeout(() => { mostrar((atual + 1) % kids.length); agendar(); }, 11500); };
    mostrar(0);
    return {
      get on() { return rodando; }, get preparado() { return true; },
      poster: async () => { for (const k of kids) await k.c.poster(); },
      play() { if (rodando || reduzir) return; rodando = true; kids[atual].c.play(); agendar(); },
      pause() { rodando = false; clearTimeout(timer); kids.forEach((k) => k.c.pause()); },
    };
  }

  // ================= fila de IAs em círculo (failover): logos das IAs e o anel do JARVIS no centro =================
  function failover(root) {
    root.classList.add('df');
    const CX = 50, CY = 45, RX = 30, RY = 34; // porcentagens do quadro (16:10): RX em % da largura, RY em % da altura
    const nomes = ['OpenAI', 'Claude', 'Gemini', 'Ollama', 'Groq', 'DeepSeek'];
    const pos = nomes.map((_, i) => { const a = (-90 + i * 60) * Math.PI / 180; return [CX + RX * Math.cos(a), CY + RY * Math.sin(a)]; });
    const s = svg('svg', { viewBox: '0 0 100 100', preserveAspectRatio: 'none', class: 'df-svg' });
    const anel = svg('ellipse', { cx: CX, cy: CY, rx: RX, ry: RY, class: 'df-anel' }); s.append(anel);
    const linhas = pos.map(([x, y]) => { const l = svg('line', { x1: CX, y1: CY, x2: x, y2: y, class: 'df-linha' }); s.append(l); return l; });
    root.append(s);
    // centro: o mesmo anel de energia da tela do app
    const cvCentro = h('canvas');
    const nucleo = add(h('div', 'df-core df-core-anel'), cvCentro, h('small', null, 'contexto da tarefa'));
    nucleo.style.left = CX + '%'; nucleo.style.top = CY + '%'; root.append(nucleo);
    const orb = anelDoApp(cvCentro, 0.5);
    let pulso = 0; const pulsar = () => { pulso = 0; if (!orb || orb.parado) return; orb.setLevel(0.18 + Math.random() * 0.2); pulso = requestAnimationFrame(pulsar); };
    // cada IA: o logo dela (sem o nome escrito) e o estado embaixo
    const logo = (nome) => {
      const L = window.JARVIS_IA_LOGOS?.[nome];
      if (!L) return h('b', null, nome);
      const sv = svg('svg', { viewBox: '0 0 24 24', class: 'df-logo', role: 'img', 'aria-label': nome });
      const t = svg('title'); t.textContent = nome; sv.append(t, svg('path', { d: L.d, fill: L.cor, 'fill-rule': 'evenodd' }));
      return sv;
    };
    const nos = nomes.map((n, i) => { const e = add(h('div', 'df-no df-no-logo'), logo(n), h('small', null, 'pronta')); e.title = n; e.style.left = pos[i][0] + '%'; e.style.top = pos[i][1] + '%'; root.append(e); return e; });
    const pkt = h('div', 'df-pkt'); pkt.style.left = CX + '%'; pkt.style.top = CY + '%'; root.append(pkt);
    const pedido = h('div', 'df-pedido'), prog = h('div', 'df-prog'), pi = h('i'); prog.append(pi);
    const barra = add(h('div', 'df-stat'), h('i'), h('span', null, 'aguardando pedido')); const msg = barra.lastChild;
    add(root, pedido, prog, barra);
    const estado = (i, cls, sub) => { nos[i].classList.remove('on', 'err', 'ok'); if (cls) nos[i].classList.add(cls); nos[i].lastChild.textContent = sub; };
    const linha = (i, cls) => { linhas[i].classList.remove('on', 'err'); if (cls) linhas[i].classList.add(cls); };
    const mover = (x, y) => { pkt.style.left = x + '%'; pkt.style.top = y + '%'; };
    const reset = () => {
      nos.forEach((_, i) => { estado(i, '', 'pronta'); linha(i, ''); });
      pkt.classList.remove('on'); pkt.style.transition = 'none'; mover(CX, CY); void pkt.offsetWidth; pkt.style.transition = '';
      pi.style.transition = 'none'; pi.style.width = '0%'; barra.className = 'df-stat'; msg.textContent = 'aguardando pedido'; pedido.textContent = '';
      orb?.setState('idle');
    };
    // uma tentativa: o contexto sai do núcleo, a IA trabalha e (opcionalmente) falha no meio do caminho
    const tentar = async (esp, i, falha, ate) => {
      orb?.setState('thinking');
      pkt.classList.add('on'); mover(CX + (pos[i][0] - CX) * 0.66, CY + (pos[i][1] - CY) * 0.7); await esp(650); // o pacote para antes do cartão, sem cobrir o logo
      estado(i, 'on', 'respondendo…'); linha(i, 'on'); barra.className = 'df-stat'; msg.textContent = nomes[i] + ' está respondendo';
      void pi.offsetWidth; pi.style.transition = 'width 1.1s linear'; pi.style.width = ate + '%'; await esp(1150);
      if (!falha) return;
      estado(i, 'err', falha); linha(i, 'err'); barra.className = 'df-stat falhou'; msg.textContent = nomes[i] + ': ' + falha + ' — trocando de IA';
      await esp(500); mover(CX, CY); await esp(700); pkt.classList.remove('on'); await esp(250);
    };
    const c = laco(root, async (esp) => {
      reset(); await esp(600); await digitar(pedido, 'Escreva o roteiro da campanha de lançamento', esp, 30); await esp(300);
      await tentar(esp, 0, 'sem crédito', 42);
      await tentar(esp, 1, 'limite de uso', 68);
      await tentar(esp, 2, null, 100);
      estado(2, 'ok', 'concluído'); barra.className = 'df-stat ok'; msg.textContent = 'Pronto: Gemini terminou sem perder nada do contexto'; orb?.setState('speaking');
      await esp(3200);
    });
    const play = c.play.bind(c), pause = c.pause.bind(c), poster = c.poster.bind(c);
    return { get on() { return c.on; }, get preparado() { return c.preparado; }, poster, play() { if (reduzir) return; if (orb) { clearTimeout(orb._pi); orb.retomar(); } if (!pulso) pulso = requestAnimationFrame(pulsar); play(); }, pause() { pause(); setTimeout(() => { if (!c.on) orb?.pausar(); }, 400); } };
  }

  // ================= do lead ao site =================
  function leadsite(root) {
    root.classList.add('dl');
    const lead = h('div', 'dl-lead');
    add(lead, add(h('div', 'dl-lead-topo'), h('i', 'dl-pino'), h('b', null, 'Studio Fit Pro'), h('small', null, '1,2 km')),
      add(h('div', 'dl-tags'), h('em', 'ruim', 'sem site'), h('em', 'bom', 'WhatsApp')));
    const barras = [['Presença online', 12, 'ruim'], ['Potencial com site', 88, ''], ['Chance de fechar', 74, '']].map(([n, v, c]) => {
      const b = add(h('div', 'dl-barra ' + c), h('span', null, n), add(h('div', 'dl-trilho'), h('i')), h('b', null, v + '%'));
      b.dataset.v = v; return b;
    });
    const analise = add(h('div', 'dl-analise'), h('small', null, 'Análise da IA'), ...barras);
    const gerar = h('div', 'dl-gerar', 'Criar o site');
    const col = add(h('div', 'dl-col'), lead, analise, gerar);
    const url = h('span', 'dl-url');
    const nav = add(h('div', 'dl-s-topo'), add(h('span', 'dl-logo'), h('i'), h('b', null, 'Studio Fit Pro')), add(h('span', 'dl-nav'), h('i'), h('i'), h('i')));
    const tit = h('b', 'dl-h1');
    const hero = add(h('div', 'dl-hero'), tit, h('i', 'dl-l1'), h('i', 'dl-l2'), add(h('span', 'dl-zap'), h('i'), h('span', null, 'Agendar aula grátis')));
    const cards = add(h('div', 'dl-cards'), ...['Musculação', 'Funcional', 'Avaliação'].map((n) => add(h('div', 'dl-card'), h('i'), h('b', null, n), h('span'))));
    const mapa = add(h('div', 'dl-mapa'), h('i', 'dl-mapa-pino'), h('span', null, 'Rua das Flores, 120, Santos'));
    const site = add(h('div', 'dl-site'), nav, hero, cards, mapa);
    const nav2 = add(h('div', 'dl-nav-bar'), h('i'), h('i'), h('i'), url);
    const janela = add(h('div', 'dl-janela'), nav2, site);
    const envio = add(h('div', 'dl-envio'), h('i'), h('span', null, 'Prévia enviada no WhatsApp do cliente'));
    add(root, col, janela, envio);
    return laco(root, async (esp) => {
      [lead, analise, gerar, nav, hero, cards, mapa, envio].forEach((x) => x.classList.remove('on')); gerar.classList.remove('press');
      barras.forEach((b) => { b.querySelector('i').style.width = '0'; }); tit.textContent = ''; url.textContent = '';
      await esp(400); lead.classList.add('on'); await esp(700);
      analise.classList.add('on');
      for (const b of barras) { await esp(260); b.querySelector('i').style.width = b.dataset.v + '%'; }
      await esp(900); gerar.classList.add('on'); await esp(300); gerar.classList.add('press'); await esp(250); gerar.classList.remove('press');
      await digitar(url, 'mlk010173.github.io/jarvis/s/k3x9fd2a', esp, 24);
      nav.classList.add('on'); await esp(350); hero.classList.add('on'); await digitar(tit, 'Treine forte, perto de casa', esp, 38);
      await esp(250); cards.classList.add('on'); await esp(350); mapa.classList.add('on'); await esp(700); envio.classList.add('on'); await esp(3200);
    });
  }

  // ================= apresentação do produto (topo do site): as demonstrações em sequência, como um filme =================
  // Cada cena roda o próprio roteiro; a troca é um corte com zoom e desfoque. Embaixo, a legenda da cena e a barra de progresso.
  function filme(root) {
    root.classList.add('dfm');
    const cenas = [
      ['Fale', 'um comando de voz e o PC executa', voz, 7600],
      ['Encontre clientes', 'negócios sem site, no mapa', mapa, 8200],
      ['Entregue o site', 'a IA programa o site e você manda a prévia', leadsite, 9600],
      ['Anime', 'uma frase vira um anúncio em motion', anuncio, 12000],
      ['Roteirize', 'o roteiro com gancho, pronto para virar vídeo', roteiro, 8000],
    ];
    const palco = h('div', 'dfm-palco'); root.append(palco);
    const kids = cenas.map(([, , f]) => { const d = h('div', 'demo'); palco.append(d); return { el: d, c: f(d) }; });
    const leg = h('div', 'dfm-leg'), legT = h('b'), legS = h('span'); add(leg, legT, legS);
    const barras = h('div', 'dfm-barras');
    const bs = cenas.map(([nome]) => { const b = add(h('button', 'dfm-b'), h('i')); b.type = 'button'; b.setAttribute('aria-label', 'Ver: ' + nome); barras.append(b); return b; });
    add(root, add(h('div', 'dfm-base'), leg, barras));
    let atual = -1, rodando = false, timer = 0;
    function mostrar(i) {
      atual = i;
      kids.forEach((k, j) => { k.el.classList.toggle('vis', j === i); if (j === i) { if (rodando) k.c.play(); else k.c.poster(); } else k.c.pause(); });
      legT.textContent = cenas[i][0]; legS.textContent = cenas[i][1];
      leg.classList.remove('on'); void leg.offsetWidth; leg.classList.add('on');
      bs.forEach((b, j) => { b.classList.toggle('feita', j < i); b.classList.remove('agora'); b.style.setProperty('--dur', cenas[i][3] + 'ms'); });
      void barras.offsetWidth; bs[i].classList.add('agora');
    }
    const agendar = () => { clearTimeout(timer); timer = setTimeout(() => { mostrar((atual + 1) % kids.length); agendar(); }, cenas[atual][3]); };
    bs.forEach((b, j) => b.addEventListener('click', () => { mostrar(j); if (rodando) agendar(); }));
    mostrar(0);
    return {
      get on() { return rodando; }, get preparado() { return true; },
      poster: async () => { for (const k of kids) await k.c.poster(); },
      play() { if (rodando || reduzir) return; rodando = true; root.classList.add('rodando'); mostrar(atual); agendar(); },
      pause() { rodando = false; root.classList.remove('rodando'); clearTimeout(timer); kids.forEach((k) => k.c.pause()); },
    };
  }

  const CATALOGO = { autocut, motion, anuncio, setup, voz, mapa, transcrever, roteiro, tokens, central, editor, failover, leadsite, filme };
  function montar(el, nome) {
    if (el._demo) return el._demo;
    const f = CATALOGO[nome]; if (!f) return null;
    el.classList.add('demo'); el.setAttribute('role', 'img'); el.setAttribute('aria-label', el.getAttribute('aria-label') || 'Demonstração animada do JARVIS');
    const c = f(el); el._demo = c; c.poster();
    return c;
  }

  // Autoplay por visibilidade: [data-demo][data-autoplay] roda enquanto estiver na tela.
  function autoiniciar(raiz = document) {
    raiz.querySelectorAll('[data-demo]').forEach((el) => {
      const c = montar(el, el.dataset.demo); if (!c) return;
      if (el.hasAttribute('data-autoplay') && 'IntersectionObserver' in window) {
        new IntersectionObserver((es) => es.forEach((e) => (e.isIntersecting ? c.play() : c.pause())), { threshold: 0.35 }).observe(el);
      }
    });
  }
  window.JARVIS_DEMOS = { montar, autoiniciar };
})();
