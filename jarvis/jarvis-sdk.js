// JARVIS SDK — integra o chat e as ferramentas do JARVIS em qualquer site ou app.
// Uso básico:
//   const jv = new JarvisSDK({ token: 'SEU_TOKEN_DE_SESSAO' });   // opcional: backend
//   await jv.clima('Vitória');                                     // ferramentas reais
//   const p = await jv.criarProjeto('Meu assistente');             // projeto (IA própria)
//   const r = await jv.chat([{ role: 'user', content: 'oi' }], p.id, 'agente'); // modo Agente pesquisa na internet
(function () {
  'use strict';
  function JarvisSDK(opts) {
    opts = opts || {};
    this.backend = opts.backend || (localStorage.getItem('jarvis.api') || 'https://jarvis-backend-7949.onrender.com/bridge');
    this.token = opts.token || localStorage.getItem('jarvis.sessao') || null;
  }
  JarvisSDK.prototype.chamar = function (rota, metodo, corpo) {
    return fetch(this.backend, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ rota: rota, metodo: metodo || 'GET', corpo: corpo || {}, token: this.token }),
    }).then(function (r) {
      return r.json().then(function (j) {
        if (!r.ok) throw new Error(j.erro || 'Erro ' + r.status);
        if (j.token) { JarvisSDK.prototype.token = j.token; try { localStorage.setItem('jarvis.sessao', j.token); } catch (e) {} }
        return j;
      });
    });
  };
  /* ---------- conta ---------- */
  JarvisSDK.prototype.entrar = function (email, senha) { return this.chamar('/api/conta/entrar', 'POST', { email: email, senha: senha }); };
  JarvisSDK.prototype.cadastro = function (nome, email, senha) { return this.chamar('/api/conta/cadastro', 'POST', { nome: nome, email: email, senha: senha }); };
  JarvisSDK.prototype.plano = function () { return this.chamar('/api/conta/plano'); };
  /* ---------- ferramentas reais (sem IA) ---------- */
  JarvisSDK.prototype.clima = function (cidade) { return this.chamar('/api/web/clima?cidade=' + encodeURIComponent(cidade || '')); };
  JarvisSDK.prototype.moeda = function (de, para) { return this.chamar('/api/web/moeda?de=' + (de || 'USD') + '&para=' + (para || 'BRL')); };
  JarvisSDK.prototype.cripto = function (id) { return this.chamar('/api/web/cripto?id=' + (id || 'bitcoin')); };
  JarvisSDK.prototype.wiki = function (q) { return this.chamar('/api/web/wiki?q=' + encodeURIComponent(q)); };
  JarvisSDK.prototype.feriados = function (ano) { return this.chamar('/api/web/feriados' + (ano ? '?ano=' + ano : '')); };
  JarvisSDK.prototype.noticias = function () { return this.chamar('/api/web/briefing'); };
  JarvisSDK.prototype.pesquisar = function (q) { return this.chamar('/api/web/pesquisar?q=' + encodeURIComponent(q)); };
  JarvisSDK.prototype.abrir = function (url) { return this.chamar('/api/web/abrir?url=' + encodeURIComponent(url)); };
  JarvisSDK.prototype.ferramentas = function () { return this.chamar('/api/mcp/ferramentas'); };
  JarvisSDK.prototype.executar = function (ferramenta, args) { return this.chamar('/api/mcp/executar', 'POST', { ferramenta: ferramenta, args: args || {} }); };
  /* ---------- IA conectada da conta ---------- */
  JarvisSDK.prototype.criarProjeto = function (nome, instrucoes, assistente) {
    return this.chamar('/api/projetos', 'POST', { nome: nome, instrucoes: instrucoes || '', assistente: assistente || 'JARVIS' });
  };
  JarvisSDK.prototype.projetos = function () { return this.chamar('/api/projetos'); };
  /* personalidade: serio | amigavel | professor | tecnico | agente (agente pesquisa na internet sozinho) */
  JarvisSDK.prototype.chat = function (mensagens, projetoId, personalidade) {
    return this.chamar('/api/projetos/' + projetoId + '/testar', 'POST', { mensagens: mensagens, personalidade: personalidade || 'amigavel' });
  };
  if (typeof window !== 'undefined') window.JarvisSDK = JarvisSDK;
  if (typeof module !== 'undefined' && module.exports) module.exports = JarvisSDK;
})();
