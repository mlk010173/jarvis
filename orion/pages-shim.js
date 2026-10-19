'use strict';
// ORION Web — shim do espelho estático no GitHub Pages.
// O site real (assistanceorion.cloud) tem backend (/api/...) e o app do PC (ponte local).
// Aqui não existe nenhum dos dois: este script intercepta as chamadas de API e devolve
// uma resposta JSON amigável para que a interface abra e se comporte bem, mostrando
// claramente que a nuvem não está disponível neste espelho.
(() => {
  const origFetch = window.fetch.bind(window);
  const EH_API = /^(https?:\/\/[^/]*assistanceorion\.cloud)?\/api\//;
  const AVISO = 'Espelho estático no GitHub Pages: a API da nuvem não está disponível aqui. Acesse o site real em assistanceorion.cloud';
  window.fetch = async (url, opts) => {
    const u = String(url);
    if (EH_API.test(u)) {
      console.info('[orion-pages] API interceptada:', u);
      return new Response(JSON.stringify({ erro: AVISO }), {
        status: 503, headers: { 'Content-Type': 'application/json' }
      });
    }
    return origFetch(url, opts);
  };
  window.addEventListener('DOMContentLoaded', () => {
    try {
      const av = document.createElement('div');
      av.textContent = 'Espelho estático do ORION Web (GitHub Pages) — API, login e app do PC indisponíveis. Site real: assistanceorion.cloud';
      av.style.cssText = 'position:fixed;left:50%;transform:translateX(-50%);bottom:6px;z-index:99999;font:11px/1.4 system-ui,sans-serif;background:rgba(20,20,26,.82);color:#cfd6e4;padding:4px 12px;border-radius:999px;pointer-events:none;opacity:.9';
      document.body.append(av);
    } catch { /* sem corpo */ }
  });
})();
