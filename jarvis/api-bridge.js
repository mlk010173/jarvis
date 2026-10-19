// JARVIS – ponte com o backend real (Base44 backend function).
// Toda chamada /api/* do site vai para functions/jarvisApi, que grava e lê o banco de verdade.
(function () {
  'use strict';
  var BACKEND = 'https://superagent-6e379590.base44.app/functions/jarvisApi';
  var TOKEN = 'jarvis.sessao';
  var original = window.fetch;
  window.fetch = function (url, opts) {
    var u = String(url);
    var m = /^(?:[a-z]+:\/\/[^\/]+)?(\/api\/[^#]*)/.exec(u);
    if (!m) return original(url, opts);
    var rota = m[1];
    var metodo = (opts && opts.method) || 'GET';
    var corpo = null;
    if (opts && opts.body) { try { corpo = JSON.parse(opts.body); } catch (e) { corpo = {}; } }
    var token = null; try { token = localStorage.getItem(TOKEN); } catch (e) {}
    return original(BACKEND, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ rota: rota, metodo: metodo, corpo: corpo, token: token })
    }).then(function (r) {
      return r.text().then(function (t) {
        var j; try { j = JSON.parse(t); } catch (e) { j = { erro: 'Resposta inválida do backend.' }; }
        try {
          if (rota.indexOf('/api/conta/entrar') === 0 || rota.indexOf('/api/conta/cadastro') === 0) { if (j && j.token) localStorage.setItem(TOKEN, j.token); }
          if (rota.indexOf('/api/conta/sair') === 0) localStorage.removeItem(TOKEN);
        } catch (e) {}
        return new Response(JSON.stringify(j), { status: r.status, headers: { 'Content-Type': 'application/json; charset=utf-8' } });
      });
    });
  };
})();
