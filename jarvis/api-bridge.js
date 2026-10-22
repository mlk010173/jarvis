// JARVIS – ponte com o backend real (Base44 backend function).
// Toda chamada /api/* do site vai para functions/jarvisApi, que grava e lê o banco de verdade.
(function () {
  'use strict';
  var PADRAO = 'https://superagent-6e379590.base44.app/functions/jarvisApi';
  // Para usar seu próprio backend (server/server.js deployado): 
  // localStorage.setItem('jarvis.api', 'https://OUTRO-BACKEND/bridge')
  var BACKEND = null; try { BACKEND = localStorage.getItem('jarvis.api') || PADRAO; } catch (e) { BACKEND = PADRAO; }
  try { window.JARVIS_API = BACKEND.replace(/\/bridge$/, ''); } catch (e) {}
  var TOKEN = 'jarvis.sessao';
  var original = window.fetch;
  window.fetch = function (url, opts) {
    var u = String(url);
    var m = /^(?:[a-z]+:\/\/[^\/]+)?(\/api\/[^#]*)/.exec(u);
    if (!m) return original(url, opts);
    var rota = m[1];
    // v1.3.6: rotas do motor de tarefas autonomous na funcao dedicada jarvisTarefas (mesmo envelope e banco)
    var TAREFAS = /^\/api\/(tarefas|memoria)(\/|$)/;
    var alvo = TAREFAS.test(rota) ? 'https://superagent-6e379590.base44.app/functions/jarvisTarefas' : BACKEND;
    var metodo = (opts && opts.method) || 'GET';
    var corpo = null;
    if (opts && opts.body) { try { corpo = JSON.parse(opts.body); } catch (e) { corpo = {}; } }
    var token = null; try { token = localStorage.getItem(TOKEN); } catch (e) {}
    // sem espera infinita: se o servidor não responder em 20s, devolve erro claro (não trava o celular)
    var ctl = (typeof AbortController !== 'undefined') ? new AbortController() : null;
    var tempo = setTimeout(function () { if (ctl) ctl.abort(); }, 20000);
    return original(alvo, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ rota: rota, metodo: metodo, corpo: corpo, token: token }),
      signal: ctl ? ctl.signal : undefined
    }).then(function (r) {
      clearTimeout(tempo);
      return r.text().then(function (t) {
        var j; try { j = JSON.parse(t); } catch (e) { j = { erro: 'Resposta inválida do backend.' }; }
        try {
          if (rota.indexOf('/api/conta/entrar') === 0 || rota.indexOf('/api/conta/cadastro') === 0 || rota.indexOf('/api/conta/verificar-login') === 0) { if (j && j.token) localStorage.setItem(TOKEN, j.token); }
          if (rota.indexOf('/api/conta/sair') === 0) localStorage.removeItem(TOKEN);
        } catch (e) {}
        return new Response(JSON.stringify(j), { status: r.status, headers: { 'Content-Type': 'application/json; charset=utf-8' } });
      });
    }).catch(function (e) {
      clearTimeout(tempo);
      var msg = (e && e.name === 'AbortError') ? 'O servidor demorou demais. Tente de novo em instantes.' : 'Sem conexão com o servidor. Confira sua internet e tente de novo.';
      return new Response(JSON.stringify({ erro: msg }), { status: (e && e.name === 'AbortError') ? 504 : 502, headers: { 'Content-Type': 'application/json; charset=utf-8' } });
    });
  };
})();
