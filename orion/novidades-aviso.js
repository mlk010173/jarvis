'use strict';
// Aviso de versão nova no site: "ORION X chegou" no canto da tela, uma vez por versão (some ao fechar ou ao abrir as novidades).
// Só aparece nos primeiros 30 dias depois da versão, para não virar enfeite fixo.
(() => {
  if (/\/orion\/novidades/.test(location.pathname)) return;
  const CHAVE = 'orion.novidades.vista';
  const ler = () => { try { return localStorage.getItem(CHAVE); } catch { return null; } };
  const gravar = (v) => { try { localStorage.setItem(CHAVE, v); } catch { /* sem armazenamento */ } };
  const svg = (d, w = 1.8) => { const s = document.createElementNS('http://www.w3.org/2000/svg', 'svg'); s.setAttribute('viewBox', '0 0 24 24'); s.setAttribute('fill', 'none'); s.setAttribute('stroke', 'currentColor'); s.setAttribute('stroke-width', w); s.setAttribute('stroke-linecap', 'round'); s.setAttribute('stroke-linejoin', 'round'); s.setAttribute('aria-hidden', 'true'); for (const x of d) { const p = document.createElementNS('http://www.w3.org/2000/svg', 'path'); p.setAttribute('d', x); s.append(p); } return s; };
  const diasDesde = (br) => { const m = String(br || '').match(/^(\d{2})\/(\d{2})\/(\d{4})$/); if (!m) return 0; return (Date.now() - new Date(+m[3], +m[2] - 1, +m[1]).getTime()) / 86400000; };

  fetch('/api/novidades', { cache: 'no-cache' }).then((r) => r.json()).then((j) => {
    const v = (j.versoes || [])[0];
    if (!v || !j.atual || ler() === j.atual || diasDesde(v.data) > 30) return;
    if (!document.querySelector('link[href="/orion/novidades.css"]')) document.head.append(Object.assign(document.createElement('link'), { rel: 'stylesheet', href: '/orion/novidades.css' }));
    const url = '/orion/novidades#v' + j.atual.replace(/\./g, '-');
    const caixa = document.createElement('aside');
    caixa.className = 'nv-aviso'; caixa.setAttribute('role', 'status'); caixa.setAttribute('aria-label', 'Versão nova do ORION');
    const ic = document.createElement('span'); ic.className = 'nv-aviso-ic'; ic.append(svg(['M12 3l1.9 5.1L19 10l-5.1 1.9L12 17l-1.9-5.1L5 10l5.1-1.9z', 'M19 17l.8 2.2L22 20l-2.2.8L19 23l-.8-2.2L16 20l2.2-.8z']));
    const txt = document.createElement('span'); txt.className = 'nv-aviso-txt';
    const t = document.createElement('b'); t.textContent = `ORION ${j.atual} chegou`;
    const s = document.createElement('span'); s.textContent = v.resumo || 'Veja o que mudou nesta versão.';
    txt.append(t, s);
    const ver = document.createElement('a'); ver.className = 'btn btn-sm btn-primary'; ver.href = url; ver.textContent = 'Ver novidades';
    const x = document.createElement('button'); x.type = 'button'; x.className = 'nv-aviso-x'; x.setAttribute('aria-label', 'Fechar aviso'); x.append(svg(['M6 6l12 12M18 6L6 18'], 2));
    const fechar = () => { gravar(j.atual); caixa.remove(); };
    x.addEventListener('click', (e) => { e.stopPropagation(); fechar(); });
    ver.addEventListener('click', () => gravar(j.atual));
    caixa.addEventListener('click', (e) => { if (matchMedia('(max-width: 560px)').matches && !e.target.closest('button')) { gravar(j.atual); location.href = url; } });
    caixa.append(ic, txt, ver, x);
    setTimeout(() => document.body.append(caixa), 1800);
  }).catch(() => { /* sem aviso */ });
})();
