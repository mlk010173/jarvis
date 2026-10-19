'use strict';
// Liga a barra lateral e os painéis ao JARVIS Web: o que é do PC (Financeiro, Monitoramento, Home Assistant, Logs, Fontes)
// vai pela conexão da conta até o app do computador (POST /api/ponte/comando → /painel/...), o que é da nuvem
// (Componentes, Briefing) vai direto ao servidor. Sem o app ligado, os painéis do PC explicam como conectar.
// Também conta o uso de forma anônima (só categorias, nunca texto) e envia uma vez por dia, se a opção estiver ligada.
(() => {
  if (window.__jarvisHostWeb || !window.JARVIS_NAV || !window.JARVIS_PAINEIS || !window.JARVIS_WEB) return; window.__jarvisHostWeb = true;
  const P = window.JARVIS_PAINEIS, N = window.JARVIS_NAV, W = window.JARVIS_WEB;
  const $ = (s) => document.querySelector(s);
  const local = { get: (k, p) => { try { const v = localStorage.getItem('jarvis.web.' + k); return v == null ? p : JSON.parse(v); } catch { return p; } }, set: (k, v) => { try { localStorage.setItem('jarvis.web.' + k, JSON.stringify(v)); } catch { /* só nesta aba */ } } };

  // ---------- dados ----------
  async function pelaPonte(caminho, o = {}) {
    if (!W.pc()) throw Object.assign(new Error('O JARVIS do seu PC não está ligado na conta agora. Abra o app no computador e entre com a mesma conta.'), { status: 'sem-pc' });
    const r = await fetch('/api/ponte/comando', { method: 'POST', credentials: 'same-origin', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ metodo: o.metodo || 'GET', rota: '/painel' + caminho, corpo: o.corpo }) });
    const j = await r.json().catch(() => ({}));
    if (r.status === 401) { location.href = '../../entrar?volta=/jarvis/app'; throw new Error('login'); }
    if (r.status === 404 && /não está ligado/i.test(j.erro || '')) { W.sondarPc(); }
    if (!r.ok) throw Object.assign(new Error(j.erro || 'Erro ' + r.status), { status: r.status });
    return j;
  }
  // "Fontes de dados" sem o PC: mostra as IAs da conta (as que o JARVIS Web usa)
  function fontesDaConta() {
    const ias = (W.ias() || []).filter((i) => i.conectada).sort((a, b) => a.ordem - b.ordem);
    return {
      edicao: 'web', ia_atual: ias[0]?.nome || null,
      ias: ias.map((i) => ({ id: i.id, nome: i.nome, configurado: true, ligado: true, fora_do_plano: false, modelo: i.modelo || i.modelo_padrao, saude: null })),
      conectores: [], memoria: { total: 0, itens: [] }, obsidian: null,
      canais: [
        { id: 'web', nome: 'JARVIS Web', detalhe: 'Este navegador, com as IAs da sua conta', estado: 'ativo' },
        { id: 'app', nome: 'App do PC', detalhe: 'Voz, módulos e dados do computador', estado: 'desligado' },
        { id: 'discord', nome: 'Comunidade no Discord', detalhe: 'Novidades, tutoriais e suporte', estado: 'link', url: 'https://github.com/mlk010173/jarvis/issues' },
        { id: 'email', nome: 'Suporte por e-mail', detalhe: 'Suporte: GitHub mlk010173/jarvis (Issues)', estado: 'link', url: 'https://github.com/mlk010173/jarvis/issues' },
      ],
    };
  }
  async function api(caminho, o) {
    if (caminho === '/fontes' && !W.pc()) return fontesDaConta();
    return pelaPonte(caminho, o);
  }
  async function nuvem(caminho, o = {}) {
    const r = await fetch('/api' + caminho, { method: o.metodo || 'GET', credentials: 'same-origin', headers: o.corpo ? { 'Content-Type': 'application/json' } : {}, body: o.corpo ? JSON.stringify(o.corpo) : undefined });
    const j = await r.json().catch(() => ({}));
    if (!r.ok) throw Object.assign(new Error(j.erro || 'Erro ' + r.status), { status: r.status });
    return j;
  }

  // ---------- inteligência coletiva (anônima, opcional) ----------
  const CHAVE_OK = /^(recurso|intencao|erro|modulo|pagina|ia|acao):[a-z0-9_-]{1,40}$/;
  const ativa = () => local.get('coletiva', true) !== false;
  const hoje = () => { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`; };
  function contar(chave) {
    if (!ativa() || !CHAVE_OK.test(chave)) return;
    const d = local.get('coletiva.dias', {}), h = hoje(); const b = (d[h] = d[h] || {});
    if (!(chave in b) && Object.keys(b).length >= 300) return;
    b[chave] = Math.min(100000, (b[chave] || 0) + 1);
    for (const k of Object.keys(d).sort().slice(0, -10)) delete d[k];
    local.set('coletiva.dias', d);
  }
  async function enviarLotes() {
    if (!ativa()) { local.set('coletiva.dias', {}); return; }
    const d = local.get('coletiva.dias', {}), h = hoje();
    for (const dia of Object.keys(d).sort()) {
      if (dia >= h || !Object.keys(d[dia] || {}).length) continue;
      try {
        const r = await fetch('/api/coletiva/lote', { method: 'POST', credentials: 'omit', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ protocolo: 1, dia, plataforma: 'web', edicao: 'web', versao: 'web', plano: ['free', 'basic', 'premium'].includes(W.plano()) ? W.plano() : 'free', contadores: d[dia] }) });
        if (r.ok || r.status === 400) delete d[dia]; else break;
      } catch { break; }
    }
    local.set('coletiva.dias', d);
  }
  setTimeout(enviarLotes, 15000);
  // tipo do pedido decidido aqui no navegador (o texto não vai para a contagem)
  const INTENCOES = [['video', /v[ií]deo|editar|corte|legenda|reels|tiktok|shorts|motion/i], ['leads', /lead|prospec|mapeamento/i], ['transcricao', /transcre|transcri/i], ['roteiro', /roteiro|script|narra[cç][aã]o|ideias? de (post|v[ií]deo|conte[uú]do)/i], ['loja', /venda|faturamento|pedido|estoque|produto|cupom|loja/i], ['financas', /gasto|gastei|despesa|fatura|boleto|saldo|investi|or[cç]amento|dinheiro/i], ['casa', /luz|l[aâ]mpada|ar[- ]condicionado|tomada|ventilador|cortina|home assistant/i], ['clima', /clima|vai chover|temperatura/i], ['noticias', /not[ií]cia|manchete|briefing/i], ['imagem', /imagem|foto|logo|arte|banner/i], ['codigo', /c[oó]digo|programa[cç]|javascript|python|html|css|bug|api/i], ['escrita', /e-?mail|mensagem|responder|texto|reda[cç][aã]o|resum/i], ['estudo', /estud|aprender|explica|aula|prova/i], ['pesquisa', /pesquis|procure|busque|quem [eé]|o que [eé]|compar/i]];
  document.addEventListener('jarvis:pedido', (e) => { const t = String(e.detail?.texto || ''); contar('recurso:chat'); contar('recurso:chat_' + (e.detail?.voz ? 'voz' : 'texto')); contar('intencao:' + ((INTENCOES.find(([, re]) => re.test(t)) || ['geral'])[0])); });

  P.configurar({
    tipo: 'web', api, nuvem, contar, imagensExternas: false,
    toast: (t, tipo) => W.toast(t, tipo === 'bad' ? 'bad' : ''),
    falar: (t) => W.falar(t),
    pc: () => (W.pc() ? { disponivel: true } : { disponivel: false }),
    topo: () => Math.round($('.topbar')?.getBoundingClientRect().bottom || 64),
    abrirIas: () => { P.fechar(); W.mostrarAba('ias'); N.marcar('chat'); },
    briefing: () => nuvem('/web/briefing'),
    novidades: () => nuvem('/novidades'),
    clima: async () => { const c = W.cidade(); if (!c) return { configurado: false, mensagem: 'Clique no painel de clima, na tela do chat, e diga a sua cidade.' }; return nuvem('/web/clima?cidade=' + encodeURIComponent(c)); },
    aoFechar: () => N.marcar('chat'),
  });

  const MODULOS = { editor: 'Editor & Motion', mapa: 'Mapeamento de Leads', transcritor: 'Transcritor', roteiros: 'Conteúdo & Roteiros', central: 'Central de Automação' };
  function aoEscolher(id, aba) {
    if (id === 'chat') { P.fechar(); W.foco(false); window.JARVIS_LAYOUT?.recolher('chat', false); W.mostrarAba('conversa'); contar('pagina:chat'); return; }
    if (id === 'orion') { P.fechar(); W.foco(!W.emFoco()); contar('pagina:hud'); if (!W.emFoco()) { N.marcar('chat'); return false; } return; }
    if (id === 'config') { W.abrirConfig(); return false; }
    if (MODULOS[id]) { W.abrirModulo(id, MODULOS[id]); contar('modulo:' + id); return false; }
    if (P.existe(id)) { W.foco(false); P.abrir(id, aba); return; }
    return false;
  }

  N.montar({
    marca: { nome: 'JARVIS', sub: 'Assistente pessoal de IA · Web' },
    grupos: [
      { id: 'visao', nome: 'Visão geral', itens: [
        { id: 'chat', nome: 'Chat', sub: 'Converse, pesquise e execute', ic: 'chat' },
        { id: 'orion', nome: 'JARVIS', sub: 'Voz, HUD e monitor inteligente', ic: 'orbit' },
        { id: 'briefing', nome: 'Briefing', sub: 'Notícias, clima e o resumo do dia', ic: 'newspaper' },
      ] },
      { id: 'vendas', nome: 'Clientes e vendas', itens: [
        { id: 'leads', nome: 'Leads e clientes', sub: 'Mapa, funil, clientes e sites com IA', ic: 'target', filhos: [{ id: 'buscar', nome: 'Buscar no mapa' }, { id: 'leads', nome: 'Seus leads' }, { id: 'clientes', nome: 'Seus clientes' }, { id: 'sites', nome: 'Seus sites' }] },
      ] },
      // só para a conta do dono e da equipe (a nuvem confere em /api/dono/eu)
      { id: 'dono', nome: 'Dono do JARVIS', oculto: true, itens: [
        { id: 'negocio', nome: 'Negócio', sub: 'Anúncios, lucro e contas a pagar', ic: 'trend', filhos: [{ id: 'resumo', nome: 'Resumo' }, { id: 'contas', nome: 'Contas a pagar' }, { id: 'hospedagem', nome: 'Hospedagem' }] },
      ] },
      { id: 'dados', nome: 'Dados e automação', itens: [
        { id: 'fontes', nome: 'Fontes de Dados', sub: 'Conexões, canais e memória', ic: 'database', filhos: [{ id: 'conexoes', nome: 'Conexões' }, { id: 'projetos', nome: 'Projetos' }, { id: 'canais', nome: 'Canais' }, { id: 'memoria', nome: 'Memória' }] },
        { id: 'monitor', nome: 'Monitoramento', sub: 'Saúde, atividade e bem-estar', ic: 'heart', filhos: [{ id: 'saude', nome: 'Saúde do PC' }, { id: 'atividade', nome: 'Atividade' }, { id: 'bemestar', nome: 'Bem-estar' }] },
        { id: 'financeiro', nome: 'Financeiro', sub: 'Saldos, gastos, faturas e investimentos', ic: 'wallet', filhos: [{ id: 'saldos', nome: 'Saldos' }, { id: 'gastos', nome: 'Gastos' }, { id: 'faturas', nome: 'Faturas' }, { id: 'investimentos', nome: 'Investimentos' }] },
        { id: 'casa', nome: 'Home Assistant', sub: 'Rotinas e aparelhos da casa', ic: 'home', filhos: [{ id: 'aparelhos', nome: 'Aparelhos' }, { id: 'rotinas', nome: 'Rotinas' }] },
      ] },
      { id: 'modulos', nome: 'Módulos (no seu PC)', itens: [
        { id: 'editor', nome: 'Editor & Motion', sub: 'Vídeos, legendas e animação', ic: 'film' },
        { id: 'transcritor', nome: 'Transcritor', sub: 'Áudio e vídeo para texto', ic: 'mic' },
        { id: 'roteiros', nome: 'Conteúdo & Roteiros', sub: 'Roteiros, narração e teleprompter', ic: 'pen' },
        { id: 'central', nome: 'Central de Automação', sub: 'Desempenho, limpeza e atalhos', ic: 'gauge' },
      ] },
      { id: 'sistema', nome: 'Sistema', itens: [
        { id: 'logs', nome: 'Logs', sub: 'Eventos e rastreamento técnico', ic: 'terminal', filhos: [{ id: 'eventos', nome: 'Eventos' }, { id: 'tecnico', nome: 'Registro técnico' }] },
        { id: 'config', nome: 'Configurações', sub: 'Preferências, voz e segurança', ic: 'settings' },
        { id: 'novidades', nome: 'Novidades', sub: 'O que mudou em cada versão', ic: 'sparkles' },
      ] },
      { id: 'design', nome: 'Componentes & Design System', itens: [
        { id: 'componentes', nome: 'Componentes & UI', sub: 'React, HTML + CSS e sites prontos', ic: 'component', filhos: [{ id: 'react', nome: 'React' }, { id: 'html', nome: 'HTML + CSS' }, { id: 'sites', nome: 'Sites prontos' }] },
      ] },
    ],
    ajuda: [{ nome: 'Discord', href: 'https://github.com/mlk010173/jarvis/issues', ic: 'chat', titulo: 'Comunidade e suporte no Discord' }, { nome: 'Suporte', href: 'https://github.com/mlk010173/jarvis/issues', ic: 'mail', titulo: 'Suporte: GitHub mlk010173/jarvis (Issues)' }],
    versao: 'JARVIS Web',
    aoEscolher,
  });
  N.marcar('chat');
  // área do dono: a nuvem diz se a conta é do dono ou da equipe
  fetch('/api/dono/eu', { credentials: 'same-origin' }).then((r) => r.json()).then((d) => { if (!d.dono) return; N.mostrarGrupo('dono', true);
    nuvem('/dono/negocio?periodo=hoje').then((n) => { const u = (n.lista_custos || []).filter((c) => c.ativo && (c.situacao === 'vencido' || c.situacao === 'vence_logo')); N.selo('negocio', u.length || null, u.some((c) => c.situacao === 'vencido') ? '' : 'aviso'); N.selo('negocio:contas', u.length || null, u.some((c) => c.situacao === 'vencido') ? '' : 'aviso'); }).catch(() => {});
  }).catch(() => {});

  // PC ligado/desligado: ponto verde, selos de fatura e telas abertas que dependem dele
  async function estadoPc() {
    const pc = W.pc();
    N.online(!!pc); N.versao(pc ? `JARVIS Web · PC ${pc.nome || ''} (${pc.versao || ''})` : 'JARVIS Web · PC desligado');
    if (!pc) { N.selo('financeiro', null); N.selo('financeiro:faturas', null); return; }
    try { const e = await pelaPonte('/estado'); N.selo('financeiro', e.faturas_atrasadas || e.faturas_logo || null, e.faturas_atrasadas ? '' : 'aviso'); N.selo('financeiro:faturas', e.faturas_atrasadas + e.faturas_logo || null, e.faturas_atrasadas ? '' : 'aviso'); } catch { /* sem selo */ }
  }
  document.addEventListener('jarvis:pc', () => { estadoPc(); const a = P.atual(); if (a && ['financeiro', 'monitor', 'casa', 'logs', 'fontes'].includes(a.id)) P.abrir(a.id, a.aba); });
  setTimeout(estadoPc, 2500); setInterval(estadoPc, 180000);
  document.addEventListener('click', (e) => { const b = e.target.closest('.chat-tabs .ctab'); if (b && !P.aberto()) N.marcar('chat'); });

  // "Sincronizar com Discord" nas Configurações do JARVIS Web (o mesmo cartão de Minha conta)
  const dlgCfg = $('#dlgSettings'), alvoDc = $('#sDiscord');
  let dc = null;
  if (dlgCfg && alvoDc && window.JARVIS_DISCORD_CONTA) {
    new MutationObserver(() => { if (!dlgCfg.open) return; if (dc) dc.recarregar(); else dc = window.JARVIS_DISCORD_CONTA.montar(alvoDc, { oauth: '/discord/verificar', classes: { btn: 'ghost-btn', pri: 'primary-btn', perigo: 'ghost-btn' } }); }).observe(dlgCfg, { attributes: true, attributeFilter: ['open'] });
  }

  // opção de privacidade nas Configurações do JARVIS Web
  const caixa = $('#sColetiva');
  if (caixa) { caixa.checked = ativa(); caixa.addEventListener('change', () => { local.set('coletiva', caixa.checked); if (!caixa.checked) local.set('coletiva.dias', {}); }); }
})();
