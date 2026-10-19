'use strict';
// cópia de app/public/paineis/pn-leads.js (scripts/copiar-visual-app.js): edite no app e copie de novo

// Painel Leads e clientes (app e JARVIS Web; os dados ficam na nuvem, iguais nos dois):
//  Buscar        Google Maps (ou OpenStreetMap) por ramo e cidade, só quem não tem site; importar pelo link do Maps
//  Seus leads    funil em lista ou quadro (arrastar entre etapas), WhatsApp, próximo contato, CSV
//  Seus clientes quem fechou: venda, mensalidade e o site de cada um
//  Seus sites    sites inteiros programados pela IA: pedir mudanças em português, código, versões e publicação
// IA: no app, a IA do próprio PC (Claude Code, Gemini...) responde e a nuvem confere; no JARVIS Web, as IAs da conta.
(() => {
  const P = window.JARVIS_PAINEIS; if (!P) return;
  const { el, svg, num, reais, data, dataHora, relativo, pill, kpi, caixa, btn, vazio, carregando, chave, campo, busca, abrirModal, fecharModal, confirmar } = P.util;
  const SITE = 'https://mlk010173.github.io/jarvis';
  // o mapa dos resultados (Leaflet + pn-leads-mapa.js) só carrega quando a pessoa abre a visão "Mapa"; fica ao lado deste arquivo
  const BASE_PAINEL = ((document.currentScript && document.currentScript.src) || '').replace(/[^/]*$/, '');
  let mapaPronto = null;
  function carregarMapa() {
    if (window.JarvisMapaLeads && window.L) return Promise.resolve();
    if (mapaPronto) return mapaPronto;
    const script = (src) => new Promise((ok, falha) => { const s = document.createElement('script'); s.src = BASE_PAINEL + src; s.onload = ok; s.onerror = () => falha(new Error('O mapa não carregou. Atualize a página e tente de novo.')); document.head.append(s); });
    if (!document.querySelector('link[data-ld-leaflet]')) { const c = document.createElement('link'); c.rel = 'stylesheet'; c.href = BASE_PAINEL + 'leaflet/leaflet.css'; c.dataset.ldLeaflet = '1'; document.head.append(c); }
    mapaPronto = script('leaflet/leaflet.js').then(() => script('pn-leads-mapa.js')).catch((e) => { mapaPronto = null; throw e; });
    return mapaPronto;
  }
  const ETAPAS = [['novo', 'Novo'], ['contatado', 'Contatado'], ['negociando', 'Negociando'], ['cliente', 'Cliente'], ['perdido', 'Perdido']];
  const NOME = Object.fromEntries(ETAPAS);
  const COR = { novo: 'azul', contatado: '', negociando: 'aviso', cliente: 'ok', perdido: 'erro' };
  const ESTILOS = [['', 'Automático (combina com o ramo)'], ['moderno', 'Moderno e limpo'], ['elegante', 'Elegante'], ['vibrante', 'Vibrante'], ['minimalista', 'Minimalista'], ['escuro', 'Escuro premium'], ['aconchegante', 'Aconchegante']];
  const SUGESTOES = ['Deixe o visual mais moderno', 'Troque as cores por uma paleta mais marcante', 'Adicione uma galeria de fotos', 'Adicione perguntas frequentes', 'Adicione uma tabela de serviços com espaços para eu preencher os preços', 'Melhore o texto do topo para vender mais', 'Deixe o botão do WhatsApp fixo no canto', 'Revise tudo para ficar perfeito no celular'];

  // o que fica entre uma aba e outra (e entre aberturas do painel)
  const LS = 'jarvis.leads.v1';
  const mem = (() => { let m = {}; try { m = JSON.parse(localStorage.getItem(LS) || '{}'); } catch { m = {}; } return { form: { segmento: '', local: '', fonte: 'google', so_sem_site: true, raio_km: 5, ...(m.form || {}) }, filtro: m.filtro || 'ativos', visao: m.visao || 'lista', vista: m.vista === 'lista' ? 'lista' : 'mapa', busca: null, texto: '' }; })();
  const guardar = () => { try { localStorage.setItem(LS, JSON.stringify({ form: mem.form, filtro: mem.filtro, visao: mem.visao, vista: mem.vista })); } catch { /* sem armazenamento */ } };

  const nv = (ctx, caminho = '', o) => ctx.nuvem('/leads' + caminho, o);
  const post = (ctx, caminho, corpo) => nv(ctx, caminho, { metodo: 'POST', corpo: corpo || {} });
  const put = (ctx, caminho, corpo) => nv(ctx, caminho, { metodo: 'PUT', corpo: corpo || {} });
  const zap = (numero, texto) => `https://wa.me/55${String(numero || '').replace(/\D/g, '')}${texto ? '?text=' + encodeURIComponent(texto) : ''}`;
  const linkA = (href, texto, opcoes = {}) => el('a', { class: opcoes.classe || null, href, target: '_blank', rel: 'noopener noreferrer', title: opcoes.titulo || null, 'aria-label': opcoes.titulo || null }, opcoes.ic ? svg(opcoes.ic) : null, texto || null);
  const nota = (n, qtd) => (n == null ? null : el('span', { class: 'ld-nota', title: 'Nota no Google' }, svg('star'), String(Number(n).toFixed(1)).replace('.', ','), qtd != null ? el('small', { text: ` (${num(qtd)})` }) : null));
  const hoje = () => P.util.hojeISO();
  const centavos = (txt) => { const s = String(txt || '').trim(); if (!s) return null; const v = Number(s.replace(/[^\d,.-]/g, '').replace(/\.(?=\d{3}(\D|$))/g, '').replace(',', '.')); return Number.isFinite(v) ? Math.round(v * 100) : null; };
  const reaisCampo = (c) => (c == null ? '' : (c / 100).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }));
  function baixar(nome, conteudo, tipo) {
    const a = el('a', { href: URL.createObjectURL(new Blob([conteudo], { type: tipo })), download: nome });
    document.body.append(a); a.click(); setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 2000);
  }
  const copiar = (ctx, texto, aviso = 'Copiado.') => navigator.clipboard.writeText(texto).then(() => ctx.toast(aviso)).catch(() => ctx.toast('Não consegui copiar. Selecione e copie à mão.', 'bad'));
  const sitePill = (s) => (!s ? null : s.removido ? pill('Retirado', 'erro') : s.permanente && s.no_ar ? pill('No ar', 'ok') : s.no_ar ? pill('Prévia no ar', 'azul') : pill('Rascunho', ''));

  // IA: no app tenta a IA do PC (a nuvem monta o pedido e confere a resposta); sem IA no PC, usa as IAs da conta na nuvem
  async function rodarIA(ctx, corpo) {
    if (ctx.host.tipo !== 'app') return post(ctx, '/ia/executar', corpo);
    let erroLocal;
    try {
      const ped = await post(ctx, '/ia/pedido', corpo);
      const r = await ctx.api('/leads/ia', { metodo: 'POST', corpo: { sistema: ped.sistema, prompt: ped.prompt, max_tokens: ped.max_tokens } });
      return await post(ctx, '/ia/salvar', { ...corpo, resposta: r.resposta, ia: r.ia });
    } catch (e) { if (!/Nenhuma IA/i.test(e.message || '')) throw e; erroLocal = e; }
    // as IAs do PC não responderam: tenta as IAs da conta (as mesmas do JARVIS Web)
    try { return await post(ctx, '/ia/executar', corpo); }
    catch (e) { throw /Nenhuma IA conectada/i.test(e.message || '') ? erroLocal : e; }
  }
  // "A IA está trabalhando… 23 s" enquanto espera
  function progresso(alvo, texto) {
    const t0 = Date.now(), s = el('span');
    alvo.replaceChildren(el('div', { class: 'ld-ia-estado', role: 'status' }, el('i', { class: 'ld-gira', 'aria-hidden': 'true' }), el('span', { text: texto + ' ' }), s));
    const tick = () => { s.textContent = Math.round((Date.now() - t0) / 1000) + ' s'; };
    tick(); const t = setInterval(tick, 1000);
    return () => { clearInterval(t); alvo.replaceChildren(); };
  }

  // ---------- trava do plano ----------
  function bloqueado(ctx) {
    ctx.corpo.append(vazio('target', 'Leads e clientes é do plano Premium', 'Ache negócios sem site no Google Maps, organize o funil de vendas, acompanhe os clientes e crie sites completos com IA para mostrar a cada um.',
      linkA(SITE + '/jarvis/checkout?plano=premium', 'Ver o Premium', { classe: 'pn-btn pri', ic: 'rocket' })));
  }

  // ---------- Buscar ----------
  function linhaGoogle(ctx, est, aoMudar) {
    const g = est.google || {};
    const txt = !g.disponivel ? 'Buscando pelo OpenStreetMap, grátis e sem chave. Para ver nota e telefone de mais negócios, use a sua chave do Google.'
      : g.propria ? 'Google Maps com a sua chave (sem limite do JARVIS).'
        : g.cota == null ? 'Google Maps pela conta do JARVIS, sem limite nesta conta.'
          : `Google Maps pela conta do JARVIS: ${num(g.usado || 0)} de ${num(g.cota)} consultas este mês.`;
    return el('div', { class: 'ld-google' }, svg('globe'), el('span', { text: txt }), btn(g.propria ? 'Trocar ou remover minha chave' : 'Usar minha chave do Google', { peq: true, onclick: () => modalChave(ctx, g, aoMudar) }));
  }
  function modalChave(ctx, g, aoMudar) {
    const inp = el('input', { type: 'password', placeholder: 'AIza…', autocomplete: 'off', spellcheck: 'false' });
    const msg = el('div', { class: 'pn-msg', role: 'status' });
    const salvar = btn('Salvar chave', { pri: true, ic: 'lock', onclick: async () => {
      salvar.disabled = true; msg.className = 'pn-msg'; msg.textContent = 'Testando a chave no Google…';
      try { await put(ctx, '/conta', { google_chave: inp.value.trim() }); fecharModal(); ctx.toast('Chave salva. As buscas no Google Maps usam a sua conta.'); aoMudar(); }
      catch (e) { msg.className = 'pn-msg erro'; msg.textContent = e.message; salvar.disabled = false; }
    } });
    abrirModal('Sua chave do Google Maps',
      el('p', { class: 'pn-nota', text: 'Com a sua chave, as buscas não usam a cota do JARVIS e são cobradas na sua conta do Google Cloud (o Google dá uma quantidade grátis por mês).' }),
      el('ol', { class: 'ld-passos' },
        el('li', {}, 'Entre em ', linkA('https://console.cloud.google.com/', 'console.cloud.google.com'), ' e crie um projeto (ou use um que você já tem).'),
        el('li', { text: 'Em "APIs e serviços", abra a Biblioteca e ative a "Places API (New)". O Google pede um cartão para ligar o faturamento.' }),
        el('li', { text: 'Em "APIs e serviços → Credenciais", crie uma chave de API e restrinja o uso à "Places API (New)".' }),
        el('li', { text: 'Cole a chave aqui. Ela fica cifrada na nuvem do JARVIS e nunca mais aparece na tela.' })),
      el('div', { class: 'pn-form' }, campo('Chave de API do Google', inp, 'larga')),
      el('div', { class: 'pn-acoes', style: 'margin-top:12px' }, salvar, g.propria ? btn('Remover minha chave', { perigo: true, ic: 'trash', onclick: async () => { try { await put(ctx, '/conta', { limpar: true }); fecharModal(); ctx.toast('Sua chave foi removida.'); aoMudar(); } catch (e) { msg.className = 'pn-msg erro'; msg.textContent = e.message; } } }) : null),
      msg);
  }

  function cartaoResultado(ctx, it) {
    const box = el('article', { class: 'ld-card' });
    const montar = () => {
      const s = it.salvo;
      const acoes = s
        ? [pill(NOME[s.status] || 'Salvo', COR[s.status]), btn('Abrir', { peq: true, onclick: () => abrirLead(ctx, s.id) })]
        : [btn('Salvar lead', { peq: true, pri: true, ic: 'plus', onclick: async (e) => { e.currentTarget.disabled = true; try { const r = await post(ctx, '', it); it.salvo = { id: r.lead.id, status: r.lead.status }; montar(); ctx.toast(r.repetido ? 'Esse já estava nos seus leads.' : 'Lead salvo em Novo.'); } catch (er) { ctx.toast(er.message, 'bad'); montar(); } } })];
      if (it.whatsapp) acoes.push(linkA(zap(it.whatsapp), null, { classe: 'pn-btn peq so-ic', ic: 'chat', titulo: 'Abrir no WhatsApp' }));
      if (it.maps_url) acoes.push(linkA(it.maps_url, null, { classe: 'pn-btn peq so-ic', ic: 'pin', titulo: 'Ver no Google Maps' }));
      const meta = [it.categoria, it.km != null ? String(it.km).replace('.', ',') + ' km' : null, it.cidade].filter(Boolean).join(' · ');
      box.replaceChildren(
        el('div', { class: 'ld-info' },
          el('h4', {}, el('span', { text: it.nome }), it.site_url ? pill('Tem site', '') : it.instagram ? pill('Só Instagram', 'aviso') : pill('Sem site', 'ok'), nota(it.nota, it.avaliacoes)),
          el('div', { class: 'ld-meta' }, meta ? el('span', { text: meta }) : null, it.telefone ? el('span', {}, svg('phone'), it.telefone) : null, it.instagram ? el('span', {}, svg('camera'), it.instagram) : null, it.site_url ? linkA(it.site_url, new URL(it.site_url).hostname.replace(/^www\./, ''), { ic: 'globe' }) : null),
          it.endereco ? el('div', { class: 'ld-meta' }, el('span', {}, svg('pin'), it.endereco)) : null),
        el('div', { class: 'ld-acoes' }, acoes));
    };
    montar();
    return box;
  }

  async function buscar(ctx, est) {
    const f = mem.form, g = est.google || {};
    if (!g.disponivel && f.fonte === 'google') f.fonte = 'osm';
    const seg = el('input', { value: f.segmento, placeholder: 'barbearia, pizzaria, dentista…', 'aria-label': 'Tipo de negócio', maxlength: '80' });
    const loc = el('input', { value: f.local, placeholder: 'Mauá, SP', 'aria-label': 'Cidade ou bairro', maxlength: '120' });
    const fonte = el('select', { 'aria-label': 'Onde buscar' }, el('option', { value: 'google', text: 'Google Maps', disabled: !g.disponivel }), el('option', { value: 'osm', text: 'OpenStreetMap (grátis)' }));
    fonte.value = f.fonte;
    const raio = el('select', { 'aria-label': 'Raio' }, [2, 5, 10, 15].map((k) => el('option', { value: String(k), text: k + ' km' }))); raio.value = String(f.raio_km);
    const raioCampo = campo('Raio', raio); raioCampo.hidden = fonte.value !== 'osm';
    fonte.addEventListener('change', () => { raioCampo.hidden = fonte.value !== 'osm'; });
    const msg = el('div', { class: 'pn-msg', role: 'status' });
    const area = el('div');
    const ir = btn('Buscar', { pri: true, ic: 'search' });
    async function fazer(pagina) {
      f.segmento = seg.value.trim(); f.local = loc.value.trim(); f.fonte = fonte.value; f.raio_km = Number(raio.value); guardar();
      if (f.local.length < 2) { msg.className = 'pn-msg erro'; msg.textContent = 'Diga a cidade ou o bairro.'; loc.focus(); return; }
      ir.disabled = true; msg.className = 'pn-msg'; msg.textContent = pagina ? 'Carregando mais…' : 'Buscando…';
      try {
        const r = await post(ctx, '/buscar', { segmento: f.segmento, local: f.local, fonte: f.fonte, so_sem_site: f.so_sem_site, raio_km: f.raio_km, pagina });
        if (pagina && mem.busca) { const ja = new Set(mem.busca.itens.map((i) => i.ref)); mem.busca = { ...r, itens: [...mem.busca.itens, ...r.itens.filter((i) => !ja.has(i.ref))], total: mem.busca.total + r.total, sem_site: mem.busca.sem_site + r.sem_site }; }
        else mem.busca = r;
        msg.textContent = '';
        if (r.google) est.google = r.google;
        mostrar();
      } catch (e) { msg.className = 'pn-msg erro'; msg.textContent = e.message; }
      ir.disabled = false;
    }
    ir.addEventListener('click', () => fazer());
    for (const i of [seg, loc]) i.addEventListener('keydown', (e) => { if (e.key === 'Enter') fazer(); });

    // mapa dos resultados: pins numerados (azul = sem site), círculo do raio e o negócio escolhido embaixo
    function blocoMapa(r) {
      const tela = el('div', { class: 'ld-mapa', role: 'application', 'aria-label': 'Mapa dos resultados' }, carregando(3));
      const det = el('div', { class: 'ld-mapa-det' }, el('p', { class: 'pn-nota', text: 'Toque num pin para ver o negócio e salvar como lead.' }));
      const semPonto = r.itens.filter((i) => !Number.isFinite(i.lat) || !Number.isFinite(i.lon)).length;
      carregarMapa().then(() => {
        if (!tela.isConnected) return; // a pessoa já trocou de tela
        tela.replaceChildren();
        mem.mapa = window.JarvisMapaLeads.montar(tela, r.itens, { centro: r.centro, raio_km: r.raio_km, aoEscolher: (it) => det.replaceChildren(it ? cartaoResultado(ctx, it) : el('p', { class: 'pn-nota', text: 'Toque num pin para ver o negócio.' })) });
      }).catch((e) => tela.replaceChildren(el('p', { class: 'pn-msg erro', text: e.message })));
      return el('div', { class: 'ld-mapa-bloco' }, tela,
        el('p', { class: 'pn-nota ld-mapa-leg' }, el('span', { class: 'ld-leg sem-site' }), 'sem site ', el('span', { class: 'ld-leg' }), 'já tem site', semPonto ? ` · ${num(semPonto)} sem endereço no mapa` : ''), det);
    }

    function mostrar() {
      if (mem.mapa) { mem.mapa.destruir(); mem.mapa = null; }
      const r = mem.busca;
      if (!r) { area.replaceChildren(); return; }
      const faltam = r.itens.filter((i) => !i.salvo);
      const vista = el('div', { class: 'ld-vista', role: 'group', 'aria-label': 'Como ver os resultados' },
        ...[['mapa', 'Mapa', 'pin'], ['lista', 'Lista', 'list']].map(([id, nome, ic]) => btn(nome, { peq: true, ic, pri: mem.vista === id, onclick: () => { if (mem.vista !== id) { mem.vista = id; guardar(); mostrar(); } } })));
      const titulo = `${num(r.itens.length)} ${f.so_sem_site ? 'sem site' : 'negócios'} em ${String(r.local).split(',').slice(0, 2).join(',')}`;
      const salvarTodos = faltam.length ? btn(`Salvar os ${Math.min(100, faltam.length)} que faltam`, { ic: 'plus', onclick: async (e) => {
        e.currentTarget.disabled = true;
        try { const x = await post(ctx, '/lote', { itens: faltam.slice(0, 100) }); const por = new Map(x.leads.map((l) => [l.ref, l])); for (const i of r.itens) if (por.has(i.ref)) i.salvo = { id: por.get(i.ref).id, status: por.get(i.ref).status }; ctx.toast(`${x.salvos} lead(s) salvo(s) em Novo${x.repetidos ? `, ${x.repetidos} já estavam salvos` : ''}.`); mostrar(); }
        catch (er) { ctx.toast(er.message, 'bad'); mostrar(); }
      } }) : null;
      const csv = btn('Planilha', { ic: 'download', titulo: 'Baixar os resultados em CSV', onclick: () => baixarCsv(r.itens, 'busca-' + (f.segmento || 'negocios')) });
      area.replaceChildren(caixa(titulo, 'list', { sub: `${num(r.total)} encontrados no ${r.fonte === 'google' ? 'Google Maps' : 'OpenStreetMap'}, ${num(r.sem_site)} sem site próprio.`, acoes: [r.itens.length ? vista : null, salvarTodos, csv] },
        r.itens.length ? (mem.vista === 'mapa' ? blocoMapa(r) : el('div', { class: 'ld-res' }, r.itens.map((it) => cartaoResultado(ctx, it)))) : el('p', { class: 'pn-nota', text: f.so_sem_site ? 'Todos os negócios encontrados já têm site. Tente outro ramo, outra cidade ou desligue "Só quem não tem site".' : 'Nada encontrado. Tente outro ramo ou outra cidade.' }),
        r.proxima ? el('div', { style: 'margin-top:12px' }, btn('Carregar mais', { ic: 'refresh', onclick: () => fazer(r.proxima) })) : null,
        el('p', { class: 'pn-nota ld-fonte', text: r.aviso || '' }), r.fonte === 'google' ? el('p', { class: 'ld-atrib', text: 'Dados do Google Maps' }) : el('p', { class: 'ld-atrib', text: 'Dados do OpenStreetMap (ODbL)' })));
    }

    // importar pelo link
    const imp = el('input', { placeholder: 'Link do Google Maps ou "nome do negócio, cidade"', 'aria-label': 'Link do Google Maps ou nome do negócio', maxlength: '2000' });
    const impRes = el('div');
    const impBtn = btn('Importar', { ic: 'download', desligado: !g.disponivel, onclick: async () => {
      if (imp.value.trim().length < 3) { imp.focus(); return; }
      impBtn.disabled = true; impRes.replaceChildren(el('p', { class: 'pn-nota', text: 'Procurando no Google Maps…' }));
      try { const r = await post(ctx, '/importar', { texto: imp.value.trim() }); impRes.replaceChildren(cartaoResultado(ctx, r.item)); if (r.google) est.google = r.google; }
      catch (e) { impRes.replaceChildren(el('p', { class: 'pn-msg erro', text: e.message })); }
      impBtn.disabled = false;
    } });
    imp.addEventListener('keydown', (e) => { if (e.key === 'Enter') impBtn.click(); });

    ctx.corpo.append(
      caixa('Buscar negócios', 'search', { sub: 'Escolha o ramo e a cidade. O JARVIS mostra quem ainda não tem site, com telefone, WhatsApp, nota no Google e o link do Maps.' },
        el('div', { class: 'pn-form ld-busca-form' }, campo('Ramo do negócio', seg), campo('Cidade ou bairro', loc), campo('Onde buscar', fonte), raioCampo, el('div', { class: 'pn-acoes' }, ir)),
        el('div', { class: 'ld-linha-op' }, chave('Só quem não tem site', f.so_sem_site, (v) => { f.so_sem_site = v; guardar(); }),
          window.JARVIS_MODULOS ? btn('Ver no mapa', { peq: true, ic: 'pin', titulo: 'Mapa do OpenStreetMap neste PC', onclick: () => { P.fechar(); window.JARVIS_MODULOS.abrir('/mapa.html'); } }) : null),
        msg, linhaGoogle(ctx, est, () => ctx.recarregar())),
      area,
      caixa('Importar do Google Maps', 'pin', { sub: 'No Google Maps, abra o negócio, toque em Compartilhar e copie o link. Ou escreva o nome e a cidade.' },
        el('div', { class: 'ld-importar' }, imp, impBtn), g.disponivel ? null : el('p', { class: 'pn-nota', text: 'Precisa do Google Maps ligado (chave do JARVIS ou a sua).' }), impRes));
    mostrar();
  }

  function baixarCsv(lista, nome) {
    const cols = [['nome', 'Nome'], ['status', 'Etapa'], ['categoria', 'Ramo'], ['cidade', 'Cidade'], ['endereco', 'Endereço'], ['telefone', 'Telefone'], ['whatsapp', 'WhatsApp'], ['instagram', 'Instagram'], ['email', 'E-mail'], ['site_url', 'Site'], ['nota', 'Nota no Google'], ['avaliacoes', 'Avaliações'], ['maps_url', 'Google Maps'], ['proximo_contato', 'Próximo contato'], ['valor_centavos', 'Venda (R$)'], ['mensalidade_centavos', 'Mensalidade (R$)'], ['notas', 'Anotações']];
    const cel = (v) => { const s = String(v ?? ''); return /[;"\n\r]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s; };
    const valor = (l, k) => (k === 'status' ? NOME[l.status] || '' : /centavos$/.test(k) ? (l[k] == null ? '' : (l[k] / 100).toFixed(2).replace('.', ',')) : k === 'nota' && l.nota != null ? String(l.nota).replace('.', ',') : l[k]);
    const csv = '﻿' + [cols.map((c) => c[1]).join(';'), ...lista.map((l) => cols.map(([k]) => cel(valor(l, k))).join(';'))].join('\r\n');
    baixar(`${String(nome).normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^\w-]+/g, '-').toLowerCase()}-${hoje()}.csv`, csv, 'text/csv;charset=utf-8');
  }

  // ---------- Seus leads ----------
  async function abrirZap(ctx, l, texto, opcoes = {}) {
    window.open(zap(l.whatsapp, texto || 'Olá! Tudo bem?'), '_blank', 'noopener');
    try {
      await post(ctx, `/${l.id}/historico`, opcoes.enviada ? { tipo: 'voce', texto } : { tipo: 'whatsapp', texto: 'Conversa aberta no WhatsApp.' });
      if (l.status === 'novo') { await put(ctx, '/' + l.id, { status: 'contatado' }); ctx.toast(`${l.nome} foi para Contatado.`); ctx.atualizar(); }
    } catch { /* o WhatsApp já abriu; o registro é extra */ }
  }
  function cartaoLead(ctx, l) {
    const atrasado = l.proximo_contato && l.proximo_contato <= hoje() && ['novo', 'contatado', 'negociando'].includes(l.status);
    const meta = [l.categoria, l.cidade].filter(Boolean).join(' · ');
    return el('article', { class: 'ld-card clicavel', tabindex: '0', role: 'button', 'aria-label': 'Abrir ' + l.nome, onclick: (e) => { if (!e.target.closest('a,button')) abrirLead(ctx, l.id); }, onkeydown: (e) => { if (e.key === 'Enter' && e.target === e.currentTarget) abrirLead(ctx, l.id); } },
      el('div', { class: 'ld-info' },
        el('h4', {}, el('span', { text: l.nome }), pill(NOME[l.status], COR[l.status]), l.site ? (l.site.no_ar ? pill('Site no ar', 'ok') : pill('Site criado', '')) : null, atrasado ? pill(l.proximo_contato < hoje() ? 'Retorno atrasado' : 'Retornar hoje', 'aviso') : null, nota(l.nota, l.avaliacoes)),
        el('div', { class: 'ld-meta' }, meta ? el('span', { text: meta }) : null, l.telefone ? el('span', {}, svg('phone'), l.telefone) : null, l.proximo_contato && !atrasado ? el('span', {}, svg('calendar'), 'Retornar em ' + data(l.proximo_contato)) : null, el('span', { text: 'Atualizado ' + relativo(l.atualizado_em) }))),
      el('div', { class: 'ld-acoes' }, l.whatsapp ? btn('', { peq: true, ic: 'chat', titulo: 'Abrir no WhatsApp', onclick: () => abrirZap(ctx, l) }) : null, btn('Abrir', { peq: true, onclick: () => abrirLead(ctx, l.id) })));
  }
  function quadro(ctx, lista) {
    const cols = ETAPAS.map(([id, nome]) => {
      const itens = lista.filter((l) => l.status === id);
      const col = el('section', { class: 'ld-col', 'data-etapa': id, 'aria-label': nome },
        el('header', {}, el('span', { text: nome }), pill(num(itens.length), COR[id])),
        itens.map((l) => el('div', { class: 'ld-mini', draggable: 'true', tabindex: '0', role: 'button', 'aria-label': `${l.nome}, ${nome}. Enter abre.`, 'data-id': l.id,
          ondragstart: (e) => { e.dataTransfer.setData('text/plain', l.id); e.dataTransfer.effectAllowed = 'move'; },
          onclick: () => abrirLead(ctx, l.id), onkeydown: (e) => { if (e.key === 'Enter') abrirLead(ctx, l.id); } },
        el('b', { text: l.nome }), el('small', { text: [l.categoria, l.cidade].filter(Boolean).join(' · ') || ' ' }),
        l.status === 'cliente' && l.mensalidade_centavos ? el('small', { text: reais(l.mensalidade_centavos) + ' por mês' }) : null)));
      col.addEventListener('dragover', (e) => { e.preventDefault(); col.classList.add('sobre'); });
      col.addEventListener('dragleave', () => col.classList.remove('sobre'));
      col.addEventListener('drop', async (e) => {
        e.preventDefault(); col.classList.remove('sobre');
        const lid = e.dataTransfer.getData('text/plain'); const l = lista.find((x) => x.id === lid);
        if (!l || l.status === id) return;
        try { await put(ctx, '/' + lid, { status: id }); ctx.toast(`${l.nome}: ${nome}.`); ctx.atualizar(); } catch (er) { ctx.toast(er.message, 'bad'); }
      });
      return col;
    });
    return el('div', { class: 'ld-quadro' }, cols);
  }
  async function leads(ctx) {
    const r = await nv(ctx, '');
    const rs = r.resumo, pe = rs.por_etapa;
    const ativos = pe.novo + pe.contatado + pe.negociando;
    const trabalhados = pe.contatado + pe.negociando + pe.cliente + pe.perdido;
    ctx.corpo.append(el('div', { class: 'pn-grade' },
      kpi('No funil', num(ativos), `${num(pe.novo)} novos, ${num(pe.negociando)} negociando`, 'filter'),
      kpi('Retornar hoje', num(rs.retornar_hoje), rs.retornar_hoje ? 'Contatos marcados para hoje ou atrasados' : 'Nenhum retorno pendente', 'calendar', rs.retornar_hoje ? 'alerta' : ''),
      kpi('Clientes', num(pe.cliente), trabalhados ? `${Math.round((pe.cliente / trabalhados) * 100)}% dos leads trabalhados` : 'Feche o primeiro', 'users', pe.cliente ? 'bom' : ''),
      kpi('Sites criados', num(rs.sites), 'Em Seus sites', 'globe')));
    if (!rs.total) {
      ctx.corpo.append(vazio('target', 'Nenhum lead ainda', 'Busque negócios sem site na aba Buscar e salve os que interessam. Eles aparecem aqui, prontos para você abordar.', btn('Buscar negócios', { pri: true, ic: 'search', onclick: () => ctx.trocarAba('buscar') }), btn('Criar lead à mão', { ic: 'plus', onclick: () => modalNovo(ctx) })));
      return;
    }
    const filtros = [['ativos', 'No funil', ativos], ...ETAPAS.map(([id, n]) => [id, n, pe[id]]), ['todos', 'Todos', rs.total]];
    const lista = el('div');
    const desenhar = () => {
      const t = mem.texto.toLowerCase();
      const base = r.leads.filter((l) => (mem.filtro === 'todos' ? true : mem.filtro === 'ativos' ? ['novo', 'contatado', 'negociando'].includes(l.status) : l.status === mem.filtro))
        .filter((l) => !t || [l.nome, l.categoria, l.cidade, l.telefone, l.notas].some((x) => String(x || '').toLowerCase().includes(t)));
      if (mem.visao === 'quadro') { lista.replaceChildren(quadro(ctx, r.leads.filter((l) => !t || [l.nome, l.categoria, l.cidade].some((x) => String(x || '').toLowerCase().includes(t))))); return; }
      lista.replaceChildren(base.length ? el('div', { class: 'ld-res' }, base.map((l) => cartaoLead(ctx, l))) : el('p', { class: 'pn-nota', text: 'Nenhum lead neste filtro.' }));
    };
    const chips = el('div', { class: 'pn-filtros' }, filtros.map(([id, n, qtd]) => el('button', { type: 'button', class: 'pn-chip' + (mem.filtro === id ? ' on' : ''), 'aria-pressed': String(mem.filtro === id), onclick: () => { mem.filtro = id; guardar(); chips.querySelectorAll('.pn-chip').forEach((c) => { const on = c.dataset.id === id; c.classList.toggle('on', on); c.setAttribute('aria-pressed', String(on)); }); desenhar(); }, 'data-id': id }, n, el('small', { text: num(qtd) }))));
    chips.hidden = mem.visao === 'quadro';
    const visao = el('div', { class: 'ld-visao', role: 'group', 'aria-label': 'Ver como' },
      [['lista', 'Lista', 'list'], ['quadro', 'Quadro', 'kanban']].map(([id, n, ic]) => btn(n, { ic, peq: true, pri: mem.visao === id, onclick: () => { mem.visao = id; guardar(); ctx.atualizar(); } })));
    ctx.corpo.append(caixa('Seus leads', 'filter', { sub: mem.visao === 'quadro' ? 'Arraste os cartões entre as etapas. Clique para abrir.' : 'Clique em um lead para ver os dados, anotar, abordar com IA ou criar o site.', acoes: [visao, btn('Novo lead', { ic: 'plus', onclick: () => modalNovo(ctx) }), btn('Planilha', { ic: 'download', titulo: 'Baixar os leads em CSV', onclick: () => baixarCsv(r.leads, 'leads') })] },
      el('div', { class: 'ld-filtrar' }, busca('Procurar por nome, ramo, cidade ou telefone', (v) => { mem.texto = v; desenhar(); })), chips, lista));
    desenhar();
  }
  function modalNovo(ctx) {
    const f = {};
    const inp = (k, rotulo, extra = {}) => { const i = el('input', { 'aria-label': rotulo, ...extra }); i.addEventListener('input', () => { f[k] = i.value; }); return campo(rotulo, i, extra.larga ? 'larga' : null); };
    const msg = el('div', { class: 'pn-msg', role: 'status' });
    abrirModal('Novo lead',
      el('div', { class: 'pn-form' }, inp('nome', 'Nome do negócio', { larga: true, maxlength: '120' }), inp('categoria', 'Ramo', { maxlength: '80' }), inp('cidade', 'Cidade', { maxlength: '80' }), inp('telefone', 'Telefone', { maxlength: '30' }), inp('whatsapp', 'WhatsApp (com DDD)', { maxlength: '20' }), inp('instagram', 'Instagram', { maxlength: '80' }), inp('endereco', 'Endereço', { larga: true, maxlength: '200' })),
      el('div', { class: 'pn-acoes', style: 'margin-top:14px' }, btn('Salvar lead', { pri: true, ic: 'plus', onclick: async () => { try { const r = await post(ctx, '', f); fecharModal(); ctx.toast('Lead criado.'); ctx.atualizar(); abrirLead(ctx, r.lead.id); } catch (e) { msg.className = 'pn-msg erro'; msg.textContent = e.message; } } })), msg);
  }

  // ---------- janela do lead ----------
  async function abrirLead(ctx, id) {
    abrirModal('Carregando…', carregando(2));
    let d;
    try {
      d = await nv(ctx, '/' + id);
      if (d.lead.google_desatualizado) { try { const g = await post(ctx, `/${id}/google`); d.lead = g.lead; } catch { /* segue com a cópia que já tem */ } }
    } catch (e) { abrirModal('Lead', el('p', { class: 'pn-msg erro', text: e.message })); return; }
    const l = d.lead;
    const msg = el('div', { class: 'pn-msg', role: 'status' });
    const avisar = (t, erro) => { msg.className = 'pn-msg ' + (erro ? 'erro' : 'ok'); msg.textContent = t; };
    const mudar = async (patch, texto) => { try { const r = await put(ctx, '/' + id, patch); Object.assign(l, r.lead); avisar(texto || 'Salvo.'); ctx.atualizar(); return true; } catch (e) { avisar(e.message, true); return false; } };

    const etapa = el('select', { 'aria-label': 'Etapa' }, ETAPAS.map(([v, n]) => el('option', { value: v, text: n }))); etapa.value = l.status;
    const prox = el('input', { type: 'date', value: l.proximo_contato || '', 'aria-label': 'Próximo contato' });
    const valores = el('div', { class: 'pn-form', hidden: l.status !== 'cliente' });
    const venda = el('input', { inputmode: 'decimal', placeholder: '0,00', value: reaisCampo(l.valor_centavos), 'aria-label': 'Valor da venda' });
    const mensal = el('input', { inputmode: 'decimal', placeholder: '0,00', value: reaisCampo(l.mensalidade_centavos), 'aria-label': 'Mensalidade' });
    valores.append(campo('Venda (R$)', venda), campo('Mensalidade (R$)', mensal), el('div', { class: 'pn-acoes' }, btn('Salvar valores', { onclick: () => mudar({ valor_centavos: centavos(venda.value), mensalidade_centavos: centavos(mensal.value) }, 'Valores salvos.') })));
    etapa.addEventListener('change', async () => { if (await mudar({ status: etapa.value }, 'Etapa: ' + NOME[etapa.value] + '.')) valores.hidden = etapa.value !== 'cliente'; else etapa.value = l.status; });
    prox.addEventListener('change', () => mudar({ proximo_contato: prox.value || null }, prox.value ? 'Retorno marcado para ' + data(prox.value) + '.' : 'Retorno desmarcado.'));

    const contatos = el('div', { class: 'ld-contatos' },
      l.whatsapp ? btn('WhatsApp', { pri: true, ic: 'chat', onclick: () => abrirZap(ctx, l) }) : null,
      l.telefone ? linkA('tel:' + l.telefone.replace(/[^\d+]/g, ''), l.telefone, { classe: 'pn-btn', ic: 'phone' }) : null,
      l.instagram ? linkA('https://www.instagram.com/' + l.instagram.replace(/^@/, '') + '/', l.instagram, { classe: 'pn-btn', ic: 'camera' }) : null,
      l.email ? linkA('mailto:' + l.email, l.email, { classe: 'pn-btn', ic: 'mail' }) : null,
      l.site_url ? linkA(l.site_url, 'Site atual', { classe: 'pn-btn', ic: 'globe' }) : null,
      l.maps_url ? linkA(l.maps_url, 'Google Maps', { classe: 'pn-btn', ic: 'pin' }) : null);

    // dados editáveis
    const dados = {};
    const cmp = (k, rotulo, larga) => { const i = el('input', { value: l[k] || '', 'aria-label': rotulo }); i.addEventListener('input', () => { dados[k] = i.value; }); return campo(rotulo, i, larga ? 'larga' : null); };
    const notas = el('textarea', { rows: '3', 'aria-label': 'Anotações', placeholder: 'O que você sabe do cliente, o que combinaram, objeções…' }); notas.value = l.notas || '';
    const blocoDados = el('details', { class: 'ld-det' }, el('summary', { text: 'Dados do negócio' }),
      el('div', { class: 'pn-form' }, cmp('nome', 'Nome', true), cmp('categoria', 'Ramo'), cmp('cidade', 'Cidade'), cmp('telefone', 'Telefone'), cmp('whatsapp', 'WhatsApp'), cmp('instagram', 'Instagram'), cmp('email', 'E-mail'), cmp('site_url', 'Site atual'), cmp('endereco', 'Endereço', true)),
      l.horario ? el('p', { class: 'pn-nota ld-horario', text: 'Horário: ' + l.horario.replace(/\n/g, ' · ') }) : null,
      el('div', { class: 'pn-acoes', style: 'margin-top:10px' }, btn('Salvar dados', { onclick: () => mudar(dados, 'Dados salvos.') }), l.origem === 'google' ? btn('Atualizar pelo Google', { ic: 'refresh', onclick: async () => { try { const g = await post(ctx, `/${id}/google`); Object.assign(l, g.lead); avisar('Dados atualizados pelo Google Maps.'); ctx.atualizar(); } catch (e) { avisar(e.message, true); } } }) : null));

    // abordagem com IA
    const abArea = el('div', { class: 'ld-ab' });
    const abBtn = btn('Escrever a abordagem com IA', { ic: 'wand', onclick: async () => {
      abBtn.disabled = true; const parar = progresso(abArea, 'A IA está escrevendo a abordagem…');
      try {
        const r = await rodarIA(ctx, { tipo: 'abordagem', lead_id: id }); parar();
        const a = r.abordagem; const txt = el('textarea', { rows: '5', 'aria-label': 'Mensagem de WhatsApp' }); txt.value = a.mensagem;
        abArea.replaceChildren(
          a.resumo ? el('p', { class: 'pn-nota', text: a.resumo }) : null,
          a.pontos.length ? el('ul', { class: 'ld-pontos' }, a.pontos.map((p) => el('li', { text: p }))) : null,
          campo('Mensagem (pode editar)', txt, 'pn-campo'),
          el('div', { class: 'pn-acoes' }, l.whatsapp ? btn('Enviar no WhatsApp', { pri: true, ic: 'chat', onclick: () => abrirZap(ctx, l, txt.value) }) : null, btn('Copiar', { ic: 'copy', onclick: () => copiar(ctx, txt.value) })),
          a.seguimento ? el('p', { class: 'pn-nota', text: 'Se não responder em 3 dias: ' + a.seguimento }) : null,
          a.ia ? el('p', { class: 'ld-atrib', text: 'Escrito por ' + a.ia }) : null);
      } catch (e) { parar(); abArea.replaceChildren(el('p', { class: 'pn-msg erro', text: e.message })); }
      abBtn.disabled = false;
    } });

    // sites deste lead
    const sites = el('div', { class: 'ld-res' }, d.sites.map((s) => el('div', { class: 'ld-card' }, el('div', { class: 'ld-info' }, el('h4', {}, el('span', { text: s.nome }), sitePill(s)), el('div', { class: 'ld-meta' }, el('span', { text: 'Atualizado ' + relativo(s.atualizado_em) }), s.no_ar ? el('span', { text: num(s.visitas) + ' visita(s)' }) : null)), el('div', { class: 'ld-acoes' }, btn('Abrir editor', { peq: true, ic: 'code', onclick: () => { fecharModal(); abrirEditor(ctx, s.id); } })))));

    // histórico
    const histTipo = el('select', { 'aria-label': 'Tipo de registro' }, [['nota', 'Anotação'], ['whatsapp', 'WhatsApp'], ['ligacao', 'Ligação'], ['email', 'E-mail'], ['visita', 'Visita']].map(([v, n]) => el('option', { value: v, text: n })));
    const histTxt = el('input', { placeholder: 'O que aconteceu?', 'aria-label': 'Registro', maxlength: '2000' });
    const ROT = { criado: 'Criado', etapa: 'Etapa', nota: 'Anotação', whatsapp: 'WhatsApp', ligacao: 'Ligação', email: 'E-mail', visita: 'Visita', site: 'Site', lead: 'O lead disse', voce: 'Você mandou' };
    const hist = el('div', { class: 'ld-hist' }, d.historico.map((h) => el('div', {}, el('time', { text: dataHora(h.em) }), el('b', { text: ROT[h.tipo] || h.tipo }), h.texto ? ' ' + h.texto : '')));
    const addHist = async () => {
      if (!histTxt.value.trim() && histTipo.value === 'nota') { histTxt.focus(); return; }
      try { await post(ctx, `/${id}/historico`, { tipo: histTipo.value, texto: histTxt.value }); hist.prepend(el('div', {}, el('time', { text: dataHora(new Date().toISOString()) }), el('b', { text: ROT[histTipo.value] }), histTxt.value ? ' ' + histTxt.value : '')); histTxt.value = ''; ctx.atualizar(); }
      catch (e) { avisar(e.message, true); }
    };
    histTxt.addEventListener('keydown', (e) => { if (e.key === 'Enter') addHist(); });

    abrirModal(l.nome,
      el('div', { class: 'ld-det-topo' }, pill(NOME[l.status], COR[l.status]), el('span', { class: 'pn-nota', text: [l.categoria, l.cidade].filter(Boolean).join(' · ') }), nota(l.nota, l.avaliacoes), l.origem === 'google' ? el('span', { class: 'ld-atrib', text: 'Google Maps' }) : null),
      l.endereco ? el('p', { class: 'pn-nota', style: 'margin:0 0 10px', text: l.endereco }) : null,
      contatos,
      el('div', { class: 'pn-form', style: 'margin-top:14px' }, campo('Etapa', etapa), campo('Próximo contato', prox)),
      valores,
      secaoConversa(ctx, l, d, avisar, mudar),
      el('div', { class: 'ld-secao' }, el('div', { class: 'ld-tit', role: 'heading', 'aria-level': '3' }, svg('wand'), 'Abordagem'), el('div', { class: 'pn-acoes' }, abBtn), abArea),
      el('div', { class: 'ld-secao' }, el('div', { class: 'ld-tit', role: 'heading', 'aria-level': '3' }, svg('globe'), 'Site'), d.sites.length ? sites : el('p', { class: 'pn-nota', text: 'A IA monta um site completo com os dados deste negócio. Depois você pede mudanças em português e publica o link para mostrar ao cliente.' }), el('div', { class: 'pn-acoes' }, btn(d.sites.length ? 'Criar outro site com IA' : 'Criar site com IA', { pri: !d.sites.length, ic: 'sparkles', onclick: () => modalCriarSite(ctx, l) }))),
      el('div', { class: 'ld-secao' }, el('div', { class: 'ld-tit', role: 'heading', 'aria-level': '3' }, svg('pen'), 'Anotações'), notas, el('div', { class: 'pn-acoes', style: 'margin-top:8px' }, btn('Salvar anotações', { onclick: () => mudar({ notas: notas.value }, 'Anotações salvas.') }))),
      el('div', { class: 'ld-secao' }, el('div', { class: 'ld-tit', role: 'heading', 'aria-level': '3' }, svg('clock'), 'Histórico'), el('div', { class: 'ld-hist-novo' }, histTipo, histTxt, btn('Registrar', { onclick: addHist })), hist),
      blocoDados,
      msg,
      el('div', { class: 'pn-acoes', style: 'margin-top:16px;justify-content:flex-end' }, btn('Apagar lead', { perigo: true, ic: 'trash', onclick: async () => { if (!confirmar(`Apagar ${l.nome}? Os sites dele continuam em Seus sites.`)) return; try { await nv(ctx, '/' + id, { metodo: 'DELETE' }); fecharModal(); ctx.toast('Lead apagado.'); ctx.atualizar(); } catch (e) { avisar(e.message, true); } } })));
  }

  // ---------- Seus clientes ----------
  async function clientes(ctx) {
    const r = await nv(ctx, '?status=cliente');
    const rs = r.resumo, lista = r.leads;
    const noAr = lista.filter((l) => l.site?.no_ar).length;
    ctx.corpo.append(el('div', { class: 'pn-grade' },
      kpi('Clientes', num(lista.length), lista.length ? 'Fecharam com você' : 'Ainda nenhum', 'users', lista.length ? 'bom' : ''),
      kpi('Vendido', reais(rs.vendido_centavos), 'Soma das vendas', 'banknote'),
      kpi('Mensalidades', reais(rs.mensal_centavos), 'Por mês (manutenção, hospedagem…)', 'repeat'),
      kpi('Sites no ar', num(noAr), `de ${num(lista.length)} cliente(s)`, 'globe')));
    if (!lista.length) { ctx.corpo.append(vazio('users', 'Nenhum cliente ainda', 'Quando um lead fechar, abra o lead e mude a etapa para Cliente (ou arraste no quadro). Ele aparece aqui com o valor da venda e da mensalidade.', btn('Ver seus leads', { pri: true, ic: 'filter', onclick: () => ctx.trocarAba('leads') }))); return; }
    const linhas = lista.map((l) => el('tr', {},
      el('td', {}, el('b', { text: l.nome }), el('div', { class: 'pn-nota', text: [l.categoria, l.cidade].filter(Boolean).join(' · ') })),
      el('td', { text: l.fechado_em ? data(l.fechado_em) : '—' }),
      el('td', { class: 'num', text: l.valor_centavos != null ? reais(l.valor_centavos) : '—' }),
      el('td', { class: 'num', text: l.mensalidade_centavos != null ? reais(l.mensalidade_centavos) : '—' }),
      el('td', {}, l.site ? sitePill(l.site) : pill('Sem site', '')),
      el('td', {}, el('div', { class: 'ld-acoes' }, l.whatsapp ? btn('', { peq: true, ic: 'chat', titulo: 'WhatsApp', onclick: () => abrirZap(ctx, l) }) : null, l.site ? btn('', { peq: true, ic: 'code', titulo: 'Abrir o site no editor', onclick: () => abrirEditor(ctx, l.site.id) }) : null, btn('Abrir', { peq: true, onclick: () => abrirLead(ctx, l.id) })))));
    ctx.corpo.append(caixa('Seus clientes', 'users', { acoes: [btn('Planilha', { ic: 'download', onclick: () => baixarCsv(lista, 'clientes') })] },
      el('div', { class: 'pn-tab-rola' }, el('table', { class: 'pn-tab' }, el('thead', {}, el('tr', {}, ['Cliente', 'Fechado em', 'Venda', 'Mensalidade', 'Site', ''].map((t) => el('th', { text: t })))), el('tbody', {}, linhas)))));
  }

  // ---------- Seus sites ----------
  async function sites(ctx) {
    const r = await nv(ctx, '/sites/lista');
    const acoes = [btn('Criar site com IA', { pri: true, ic: 'sparkles', onclick: () => modalCriarSite(ctx, null) }), btn('Sites prontos', { ic: 'layout', titulo: 'Exemplos prontos para usar como base', onclick: () => { P.abrir('componentes', 'sites'); window.JARVIS_NAV?.marcar('componentes', 'sites'); } }), btn('Colar código', { ic: 'code', titulo: 'Criar a partir de um HTML que você já tem', onclick: () => modalColar(ctx) })];
    if (!r.sites.length) {
      ctx.corpo.append(vazio('globe', 'Nenhum site ainda', 'Abra um lead e clique em "Criar site com IA", ou descreva um negócio aqui. A IA programa o site inteiro; você pede mudanças em português, mexe no código se quiser e publica o link.', ...acoes));
      return;
    }
    const cards = r.sites.map((s) => el('article', { class: 'ld-site' },
      el('header', {}, el('h4', { text: s.nome }), sitePill(s)),
      el('div', { class: 'ld-meta' }, s.lead ? el('span', {}, svg('target'), s.lead.nome) : el('span', { text: 'Sem lead' }), el('span', { text: 'Atualizado ' + relativo(s.atualizado_em) }), s.slug ? el('span', {}, svg('eye'), num(s.visitas) + ' visita(s)') : null, s.no_ar && !s.permanente && s.expira_em ? el('span', { text: 'Prévia até ' + data(s.expira_em) }) : null),
      s.no_ar ? el('div', { class: 'ld-link' }, el('span', { text: s.url }), btn('', { peq: true, ic: 'copy', titulo: 'Copiar o link', onclick: () => copiar(ctx, s.url, 'Link copiado.') }), linkA(s.url, null, { classe: 'pn-btn peq so-ic', ic: 'link', titulo: 'Abrir o site' })) : null,
      el('div', { class: 'pn-acoes' }, btn('Abrir editor', { pri: true, ic: 'code', onclick: () => abrirEditor(ctx, s.id) }), btn('', { ic: 'trash', perigo: true, titulo: 'Apagar o site', onclick: async () => { if (!confirmar(`Apagar o site "${s.nome}"? O link publicado também sai do ar.`)) return; try { await nv(ctx, '/sites/' + s.id, { metodo: 'DELETE' }); ctx.toast('Site apagado.'); ctx.atualizar(); } catch (e) { ctx.toast(e.message, 'bad'); } } }))));
    ctx.corpo.append(caixa('Seus sites', 'globe', { sub: `Prévias ficam no ar por ${r.limites.dias_previa} dias. Quando o cliente aprovar, coloque no ar de vez (até ${r.limites.permanentes}) ou baixe o index.html para a hospedagem dele.`, acoes }, el('div', { class: 'ld-sites' }, cards)));
  }
  async function modalCriarSite(ctx, lead) {
    const estilo = el('select', { 'aria-label': 'Estilo' }, ESTILOS.map(([v, n]) => el('option', { value: v, text: n })));
    const desc = el('textarea', { rows: '4', 'aria-label': 'Informações para a IA', maxlength: '2000', placeholder: lead ? 'Opcional: serviços, diferenciais, cores da marca, links de fotos, o que destacar… A IA não inventa preços nem depoimentos.' : 'Nome, ramo e cidade do negócio, serviços, diferenciais, cores, links de fotos… A IA não inventa preços nem depoimentos.' });
    const nome = el('input', { 'aria-label': 'Nome do site', maxlength: '120', placeholder: 'Ex.: Barbearia do Zé' });
    let escolhido = lead;
    const seletor = el('select', { 'aria-label': 'Lead' }, el('option', { value: '', text: 'Nenhum: vou descrever o negócio' }));
    const estado = el('div'), msg = el('div', { class: 'pn-msg', role: 'status' });
    const ir = btn('Criar com IA', { pri: true, ic: 'sparkles', onclick: async () => {
      const lid = escolhido ? escolhido.id : seletor.value || null;
      if (!lid && desc.value.trim().length < 10) { msg.className = 'pn-msg erro'; msg.textContent = 'Escolha um lead ou descreva o negócio (nome, ramo e cidade).'; desc.focus(); return; }
      ir.disabled = true; msg.textContent = '';
      const parar = progresso(estado, 'A IA está programando o site… costuma levar de 30 segundos a 2 minutos.');
      try { const r = await rodarIA(ctx, { tipo: 'site', lead_id: lid, estilo: estilo.value || undefined, descricao: desc.value.trim() || undefined, nome: nome.value.trim() || undefined }); parar(); fecharModal(); ctx.toast('Site criado.'); ctx.atualizar(); abrirEditor(ctx, r.site.id); }
      catch (e) { parar(); msg.className = 'pn-msg erro'; msg.textContent = e.message; ir.disabled = false; }
    } });
    abrirModal(lead ? 'Criar o site de ' + lead.nome : 'Criar site com IA',
      el('div', { class: 'pn-form' }, lead ? null : campo('Lead (opcional)', seletor, 'larga'), lead ? null : campo('Nome do site', nome), campo('Estilo', estilo, lead ? 'larga' : null), campo(lead ? 'Informações extras' : 'Sobre o negócio', desc, 'larga')),
      el('p', { class: 'pn-nota', text: lead ? 'A IA usa os dados do lead (endereço, telefone, horário, nota no Google) e o que os clientes elogiam, sem copiar avaliações.' : 'Com um lead escolhido, a IA usa os dados dele. Sem lead, ela usa a sua descrição.' }),
      el('div', { class: 'pn-acoes', style: 'margin-top:12px' }, ir), estado, msg);
    if (!lead) { try { const r = await nv(ctx, ''); seletor.append(...r.leads.slice(0, 300).map((l) => el('option', { value: l.id, text: `${l.nome}${l.cidade ? ' · ' + l.cidade : ''}` }))); } catch { /* sem a lista, segue sem lead */ } seletor.addEventListener('change', () => { escolhido = null; }); }
  }
  function modalColar(ctx) {
    const nome = el('input', { 'aria-label': 'Nome do site', maxlength: '120' });
    const cod = el('textarea', { rows: '10', class: 'ld-cod-mini', 'aria-label': 'Código HTML', spellcheck: 'false', placeholder: '<!doctype html>\n<html lang="pt-BR">…</html>' });
    const msg = el('div', { class: 'pn-msg', role: 'status' });
    abrirModal('Criar a partir de um código',
      el('div', { class: 'pn-form' }, campo('Nome do site', nome, 'larga'), campo('Código HTML completo', cod, 'larga')),
      el('div', { class: 'pn-acoes', style: 'margin-top:12px' }, btn('Criar site', { pri: true, ic: 'plus', onclick: async () => { try { const r = await post(ctx, '/sites', { nome: nome.value, html: cod.value }); fecharModal(); ctx.atualizar(); abrirEditor(ctx, r.site.id); } catch (e) { msg.className = 'pn-msg erro'; msg.textContent = e.message; } } })), msg);
  }

  // ---------- editor do site (tela cheia) ----------
  let editorAberto = null;
  async function abrirEditor(ctx, id, opcoes = {}) {
    editorAberto?.fechar();
    const raiz = el('div', { class: 'ld-editor', role: 'dialog', 'aria-modal': 'true', 'aria-label': 'Editor do site', 'data-sem-icone': true });
    document.body.append(raiz);
    raiz.append(el('div', { class: 'ld-ed-carregando' }, carregando(3)));
    let s, lead, tela = 'previa', aparelho = 'pc', ocupado = false;
    const fechar = () => { raiz.remove(); document.removeEventListener('keydown', teclas); editorAberto = null; ctx.atualizar(); };
    const teclas = (e) => { if (e.key === 'Escape' && !ocupado && !document.querySelector('.pn-modal:not([hidden])')) fechar(); };
    document.addEventListener('keydown', teclas);
    editorAberto = { fechar };
    try { const r = await nv(ctx, '/sites/' + id); s = r.site; lead = r.lead; }
    catch (e) { raiz.replaceChildren(el('div', { class: 'ld-ed-carregando' }, vazio('alert', 'Não deu para abrir o site', e.message, btn('Fechar', { onclick: fechar })))); return; }

    const nomeInp = el('input', { class: 'ld-ed-nome', value: s.nome, 'aria-label': 'Nome do site', maxlength: '120' });
    nomeInp.addEventListener('change', async () => { try { const r = await put(ctx, '/sites/' + id, { nome: nomeInp.value }); s = r.site; } catch (er) { ctx.toast(er.message, 'bad'); } });
    const estadoPub = el('div', { class: 'ld-ed-pub' });
    // o isolamento vem da própria resposta da nuvem (CSP sandbox, origem opaca); o atributo sandbox no iframe faria alguns
    // navegadores embutidos recusarem a prévia
    const novoIframe = (src) => el('iframe', { title: 'Prévia do site', referrerpolicy: 'no-referrer', src });
    let iframe = novoIframe('about:blank');
    const codigo = el('textarea', { class: 'ld-ed-codigo', spellcheck: 'false', 'aria-label': 'Código HTML do site', wrap: 'off' });
    const telaBox = el('div', { class: 'ld-ed-tela' });
    const pedido = el('textarea', { rows: '4', maxlength: '2000', 'aria-label': 'O que mudar no site', placeholder: 'Ex.: troque as cores para verde e dourado, aumente o título e adicione uma seção de perguntas frequentes.' });
    const iaEstado = el('div'), iaMsg = el('div', { class: 'pn-msg', role: 'status' });
    const versoes = el('div', { class: 'ld-versoes' });
    const pedirBtn = btn('Pedir à IA', { pri: true, ic: 'wand' });

    function aplicar(novo) {
      s = novo; codigo.value = s.html;
      // um iframe novo a cada versão: trocar só o src de uma página isolada não recarrega em alguns navegadores embutidos
      const f2 = novoIframe(s.previa_url); if (iframe.isConnected) iframe.replaceWith(f2); iframe = f2;
      versoes.replaceChildren(...(s.versoes.length ? s.versoes.map((v) => el('div', { class: 'ld-versao' }, el('div', {}, el('b', { text: v.pedido || 'Versão anterior' }), el('small', { text: dataHora(v.em) })), btn('Voltar', { peq: true, titulo: 'Voltar para esta versão', onclick: async () => { if (ocupado || !confirmar('Voltar para esta versão? A atual também fica guardada.')) return; try { const r = await post(ctx, `/sites/${id}/versao`, { n: v.n }); aplicar(r.site); ctx.toast('Versão restaurada.'); } catch (er) { ctx.toast(er.message, 'bad'); } } }))) : [el('p', { class: 'pn-nota', text: 'As versões anteriores aparecem aqui a cada mudança.' })]));
      publicacao();
      if (lado === 'entrega') desenharEntrega();
    }
    function publicacao() {
      const bts = [];
      if (s.removido) bts.push(pill('Retirado pela moderação', 'erro'));
      else if (!s.no_ar) bts.push(btn('Publicar prévia', { pri: true, ic: 'rocket', titulo: 'Link que vale 30 dias, para mostrar ao cliente', onclick: () => publicar(false) }));
      else {
        bts.push(el('div', { class: 'ld-link' }, el('span', { text: s.url }), btn('', { peq: true, ic: 'copy', titulo: 'Copiar o link', onclick: () => copiar(ctx, s.url, 'Link copiado.') }), linkA(s.url, null, { classe: 'pn-btn peq so-ic', ic: 'link', titulo: 'Abrir o site' })));
        if (lead?.whatsapp) bts.push(btn('Enviar ao cliente', { ic: 'chat', onclick: () => abrirZap(ctx, lead, `Olá! Montei uma prévia do site da ${lead.nome}. Dá uma olhada: ${s.url}`) }));
        if (!s.permanente) bts.push(btn('Colocar no ar de vez', { ic: 'check', titulo: 'Sem prazo e sem o selo de prévia', onclick: () => publicar(true) }));
        bts.push(btn('Tirar do ar', { ic: 'power', onclick: async () => { if (!confirmar('Tirar o site do ar? O link para de abrir.')) return; try { const r = await post(ctx, `/sites/${id}/despublicar`); aplicar(r.site); ctx.toast('Site fora do ar.'); } catch (er) { ctx.toast(er.message, 'bad'); } } }));
      }
      bts.push(btn('', { ic: 'download', titulo: 'Baixar o index.html', onclick: () => baixar('index.html', s.html, 'text/html;charset=utf-8') }));
      estadoPub.replaceChildren(sitePill(s), ...bts);
    }
    async function publicar(permanente) {
      try { const r = await post(ctx, `/sites/${id}/publicar`, { permanente }); aplicar(r.site); ctx.toast(permanente ? 'Site no ar de vez.' : 'Prévia publicada por 30 dias.'); }
      catch (er) {
        ctx.toast(er.message, 'bad');
        if (er.status === 422) { try { const rv = await post(ctx, `/sites/${id}/revisar`); s = { ...s, revisao: rv.revisao }; trocarLado('entrega'); } catch { /* segue com o aviso */ } }
      }
    }
    async function pedirIA(texto) {
      const t = String(texto || pedido.value).trim();
      if (t.length < 3) { pedido.focus(); return; }
      ocupado = true; pedirBtn.disabled = true; pedido.disabled = true; iaMsg.textContent = '';
      const parar = progresso(iaEstado, 'A IA está mudando o site…');
      try { const r = await rodarIA(ctx, { tipo: 'editar', site_id: id, pedido: t }); parar(); aplicar(r.site); pedido.value = ''; iaMsg.className = 'pn-msg ok'; iaMsg.textContent = r.site.ia ? 'Pronto. Feito com ' + r.site.ia + '.' : 'Pronto.'; }
      catch (e) { parar(); iaMsg.className = 'pn-msg erro'; iaMsg.textContent = e.message; }
      ocupado = false; pedirBtn.disabled = false; pedido.disabled = false;
    }
    pedirBtn.addEventListener('click', () => pedirIA());
    pedido.addEventListener('keydown', (e) => { if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) pedirIA(); });
    const salvarCod = btn('Salvar código', { pri: true, ic: 'save', onclick: async () => { try { const r = await put(ctx, '/sites/' + id, { html: codigo.value, pedido: 'Código editado à mão' }); aplicar(r.site); ctx.toast('Código salvo.'); trocarTela('previa'); } catch (er) { ctx.toast(er.message, 'bad'); } } });
    const abas = el('div', { class: 'pn-abas', role: 'tablist' });
    const aparelhos = el('div', { class: 'ld-aparelhos', role: 'group', 'aria-label': 'Tamanho da tela' });
    function trocarTela(t) {
      tela = t;
      abas.replaceChildren(...[['previa', 'Prévia', 'eye'], ['codigo', 'Código', 'code']].map(([v, n, ic]) => el('button', { type: 'button', role: 'tab', class: 'pn-aba' + (tela === v ? ' on' : ''), 'aria-selected': String(tela === v), onclick: () => trocarTela(v) }, svg(ic), n)));
      aparelhos.replaceChildren(...(tela === 'previa' ? [['pc', 'Computador', 'monitor'], ['cel', 'Celular', 'phone']].map(([v, n, ic]) => btn(n, { peq: true, ic, pri: aparelho === v, onclick: () => { aparelho = v; trocarTela('previa'); } })) : [salvarCod]));
      telaBox.className = 'ld-ed-tela' + (tela === 'previa' && aparelho === 'cel' ? ' celular' : '');
      telaBox.replaceChildren(tela === 'previa' ? iframe : codigo);
    }

    // ---------- lado esquerdo em abas: IA, Entrega (passo a passo depois de pronto) e Versões ----------
    const ladoAbas = el('div', { class: 'pn-abas ld-lado-abas', role: 'tablist' });
    const ladoCorpo = el('div');
    let lado = opcoes.lado || 'ia';
    const entregaBox = el('div', { class: 'ld-entrega' });
    let estadoConta = null;
    nv(ctx, '/estado').then((e) => { estadoConta = e; if (lado === 'entrega') desenharEntrega(); }).catch(() => {});
    const passo = (n, titulo, texto, ...conteudo) => el('section', { class: 'ld-passo' }, el('div', { class: 'ld-passo-cab' }, el('span', { class: 'ld-passo-n', text: String(n) }), el('b', { text: titulo })), texto ? el('p', { class: 'pn-nota', text: texto }) : null, ...conteudo);
    const caixaLink = (url) => el('div', { class: 'ld-link' }, el('span', { text: url }), btn('', { peq: true, ic: 'copy', titulo: 'Copiar o link', onclick: () => copiar(ctx, url, 'Link copiado.') }), linkA(url, null, { classe: 'pn-btn peq so-ic', ic: 'link', titulo: 'Abrir' }));
    const SEV = { critico: ['Crítico', 'erro'], alto: ['Alto', 'erro'], medio: ['Médio', 'aviso'], baixo: ['Baixo', ''] };
    function desenharEntrega() {
      const vc = !!estadoConta?.vercel?.conectada, rev = s.revisao;
      const chaveLocal = 'jarvis.leads.entrega.' + id; let feito = {}; try { feito = JSON.parse(localStorage.getItem(chaveLocal) || '{}'); } catch { feito = {}; }
      const marcar = (k, v) => { feito[k] = v; try { localStorage.setItem(chaveLocal, JSON.stringify(feito)); } catch { /* sem armazenamento */ } };
      const itens = [['material', 'Pegar logo, fotos e textos reais do cliente'], ['dados', 'Conferir serviços, horário, endereço e WhatsApp'], ['valor', 'Combinar valor, forma de pagamento e mensalidade'], ['ajustes', 'Aplicar os pedidos de mudança do cliente']];
      const dominioInp = el('input', { 'aria-label': 'Domínio do cliente', placeholder: 'barbeariadoze.com.br', value: s.dominio || '' });
      const dnsBox = el('div');
      const mostrarDns = (dns, okDom) => dnsBox.replaceChildren(el('p', { class: 'pn-nota', text: okDom ? 'Domínio funcionando: o site já abre por ele, com HTTPS.' : 'No painel onde o domínio foi registrado (registro.br: Domínio → DNS → Editar zona), crie estes registros. A propagação leva de minutos a algumas horas.' }),
        el('table', { class: 'pn-tab ld-dns' }, el('thead', {}, el('tr', {}, ['Tipo', 'Nome', 'Valor'].map((x) => el('th', { text: x })))), el('tbody', {}, (dns || []).map((d) => el('tr', {}, el('td', { text: d.tipo }), el('td', { text: d.nome }), el('td', {}, el('code', { text: d.valor })))))),
        okDom ? pill('Domínio ativo', 'ok') : btn('Verificar o domínio', { ic: 'refresh', onclick: async () => { try { const r = await nv(ctx, `/sites/${id}/dominio`); mostrarDns(r.dns, r.ok); ctx.toast(r.ok ? 'Domínio ativo.' : 'Ainda não: o DNS pode levar algumas horas.'); } catch (e) { ctx.toast(e.message, 'bad'); } } }));
      if (s.dominio && s.oficial_em) mostrarDns(dnsDe(s.dominio), false);
      const revBox = el('div', { class: 'ld-rev' }, rev ? [el('p', { class: 'pn-nota' }, rev.nivel === 'ok' ? 'Revisão sem problemas.' : rev.nivel === 'atencao' ? 'Revisão com avisos (não impedem a publicação).' : 'Revisão com problemas que impedem a publicação oficial.', ' ', el('small', { text: dataHora(rev.em) })),
        rev.achados.length ? el('ul', { class: 'ld-achados' }, rev.achados.map((a) => el('li', {}, pill(SEV[a.sev]?.[0] || a.sev, SEV[a.sev]?.[1] || ''), ' ', a.texto))) : null,
        rev.achados.length ? btn('Corrigir com IA', { ic: 'wand', onclick: () => { trocarLado('ia'); pedirIA('Corrija estes problemas de segurança e qualidade do site, mantendo o visual e o conteúdo: ' + rev.achados.map((a) => a.texto).join(' ')); } }) : null] : null);
      entregaBox.replaceChildren(
        passo(1, 'Mostrar só para o lead', 'Prévia com link difícil de adivinhar, fora do Google, por 30 dias. A demonstração não passa pela revisão de segurança.', s.no_ar ? caixaLink(s.url) : null,
          el('div', { class: 'pn-acoes' }, s.no_ar ? null : btn('Publicar prévia', { pri: true, ic: 'rocket', onclick: () => publicar(false) }), lead?.whatsapp && s.no_ar ? btn('Enviar ao lead', { ic: 'chat', onclick: () => abrirZap(ctx, lead, `Olá! Montei uma prévia do site da ${lead.nome}. Dá uma olhada: ${s.url}`) }) : null)),
        passo(2, 'Fechou negócio?', 'Marque o lead como cliente e combine o que falta antes de publicar de vez.',
          lead ? (lead.status === 'cliente' ? pill('Já é cliente', 'ok') : btn('Marcar como cliente', { ic: 'users', onclick: async () => { try { await put(ctx, '/' + lead.id, { status: 'cliente' }); lead.status = 'cliente'; ctx.toast(lead.nome + ' agora é cliente. Coloque o valor em Seus clientes.'); desenharEntrega(); } catch (e) { ctx.toast(e.message, 'bad'); } } })) : null,
          el('div', { class: 'ld-checklist' }, itens.map(([k, txt]) => chave(txt, !!feito[k], (v) => marcar(k, v))))),
        passo(3, 'Demonstração grátis na Vercel', 'Endereço .vercel.app com HTTPS, de graça, para o cliente ver o site como vai ficar.', s.vercel_url ? caixaLink(s.vercel_url) : null,
          el('div', { class: 'pn-acoes' }, vc ? btn(s.vercel_url ? 'Atualizar a demonstração' : 'Publicar demonstração na Vercel', { pri: !s.vercel_url, ic: 'rocket', onclick: (e) => publicarVercel(false, '', e.currentTarget) }) : btn('Conectar a Vercel', { pri: true, ic: 'link', onclick: () => conectarVercel(ctx, () => nv(ctx, '/estado').then((x) => { estadoConta = x; desenharEntrega(); })) }))),
        passo(4, 'Domínio próprio', 'O cliente registra o domínio no nome dele em registro.br (cerca de R$ 40 por ano). Depois digite o domínio aqui: na publicação oficial o JARVIS liga o domínio ao site e mostra o que configurar.', campo('Domínio do cliente', dominioInp, 'pn-campo'), dnsBox),
        passo(5, 'Publicação oficial', 'Antes de publicar de vez, o JARVIS faz a revisão de segurança do código.', revBox,
          el('div', { class: 'pn-acoes' }, btn('Revisar agora', { ic: 'shield', onclick: async () => { try { const r = await post(ctx, `/sites/${id}/revisar`); s = { ...s, revisao: r.revisao }; desenharEntrega(); } catch (e) { ctx.toast(e.message, 'bad'); } } }),
            vc ? btn('Publicar oficial na Vercel', { pri: true, ic: 'check', onclick: (e) => publicarVercel(true, dominioInp.value.trim(), e.currentTarget) }) : null,
            !s.permanente ? btn('No ar de vez pelo JARVIS', { ic: 'globe', titulo: 'Fica em mlk010173.github.io/jarvis/s/…, sem prazo', onclick: () => publicar(true) }) : pill('No ar de vez pelo JARVIS', 'ok'))));
      try { window.JARVIS_ICONES?.montar(entregaBox); } catch { /* sem ícones */ }
      async function publicarVercel(oficial, dominio, botao) {
        if (oficial && !dominio && !confirmar('Publicar oficial sem domínio próprio? O site fica no endereço .vercel.app.')) return;
        if (botao) botao.disabled = true;
        const parar = progresso(dnsBox, oficial ? 'Revisando e publicando na Vercel…' : 'Publicando a demonstração na Vercel…');
        try {
          const r = await post(ctx, `/sites/${id}/vercel`, { oficial, dominio: dominio || undefined });
          parar(); aplicar(r.site); trocarLado('entrega');
          ctx.toast(oficial ? 'Site oficial publicado.' : 'Demonstração no ar: ' + r.vercel.url);
          if (r.vercel.dns) mostrarDns(r.vercel.dns, r.vercel.dominio_ok);
        } catch (e) {
          parar(); ctx.toast(e.message, 'bad'); if (botao) botao.disabled = false;
          if (e.status === 422) { try { const rv = await post(ctx, `/sites/${id}/revisar`); s = { ...s, revisao: rv.revisao }; desenharEntrega(); } catch { /* segue */ } }
        }
      }
    }
    const dnsDe = (dominio) => (dominio.split('.').length === (/\.(com|net|org|art|blog|eco|emp|ind|med|adv|arq|eng|nom|tur|vet)\.br$/.test(dominio) ? 3 : 2) ? [{ tipo: 'A', nome: '@ (o próprio domínio)', valor: '76.76.21.21' }, { tipo: 'CNAME', nome: 'www', valor: 'cname.vercel-dns.com' }] : [{ tipo: 'CNAME', nome: dominio.split('.')[0], valor: 'cname.vercel-dns.com' }]);
    function trocarLado(qual) {
      lado = qual;
      ladoAbas.replaceChildren(...[['ia', 'IA', 'wand'], ['entrega', 'Entrega', 'rocket'], ['versoes', 'Versões', 'clock']].map(([v, n, ic]) => el('button', { type: 'button', role: 'tab', class: 'pn-aba' + (lado === v ? ' on' : ''), 'aria-selected': String(lado === v), onclick: () => trocarLado(v) }, svg(ic), n)));
      if (qual === 'entrega') desenharEntrega();
      ladoCorpo.replaceChildren(qual === 'ia' ? ladoIA : qual === 'entrega' ? entregaBox : ladoVersoes);
    }
    const ladoIA = el('section', {}, el('div', { class: 'ld-tit', role: 'heading', 'aria-level': '3' }, svg('wand'), 'Peça mudanças à IA'), el('p', { class: 'pn-nota', text: 'Escreva como falaria com um programador. A IA reescreve o site inteiro e guarda a versão anterior.' }), pedido, el('div', { class: 'pn-acoes', style: 'margin-top:8px' }, pedirBtn), iaEstado, iaMsg,
      el('div', { class: 'ld-sugestoes' }, SUGESTOES.map((x) => el('button', { type: 'button', class: 'pn-chip', onclick: () => { if (!ocupado) pedirIA(x); } }, x))),
      el('p', { class: 'pn-nota', style: 'margin-top:14px', text: 'As fotos ilustrativas são geradas por IA e trazem uma marca pequena no canto. Para usar as fotos do cliente, peça "use estas fotos: <links das imagens>".' }));
    const ladoVersoes = el('section', {}, el('div', { class: 'ld-tit', role: 'heading', 'aria-level': '3' }, svg('clock'), 'Versões'), versoes);

    raiz.replaceChildren(
      el('header', { class: 'ld-ed-topo' }, btn('Voltar', { ic: 'chevleft', onclick: () => { if (!ocupado || confirmar('A IA ainda está trabalhando. Sair mesmo assim?')) fechar(); } }), nomeInp, lead ? el('span', { class: 'pn-nota' }, 'Lead: ', el('b', { text: lead.nome })) : null, estadoPub),
      el('div', { class: 'ld-ed-corpo' },
        el('aside', { class: 'ld-ed-lado' }, ladoAbas, ladoCorpo),
        el('section', { class: 'ld-ed-palco' }, el('div', { class: 'ld-ed-barra' }, abas, aparelhos), telaBox)));
    trocarTela('previa');
    aplicar(s);
    trocarLado(lado);
    try { window.JARVIS_ICONES?.montar(raiz); } catch { /* sem ícones */ }
    if (opcoes.pedido) pedirIA(opcoes.pedido);
  }

  // ---------- conversa com o lead: o que ele respondeu e as respostas sugeridas pela IA ----------
  function secaoConversa(ctx, l, d, avisar, mudar) {
    const bolha = (tipo, texto) => el('div', { class: 'ld-bolha ' + (tipo === 'lead' ? 'dele' : 'sua') }, el('small', { text: tipo === 'lead' ? l.nome : 'Você' }), el('span', { text: texto }));
    const fio = el('div', { class: 'ld-fio', 'aria-live': 'polite' }, d.historico.filter((h) => (h.tipo === 'lead' || h.tipo === 'voce') && h.texto).reverse().map((h) => bolha(h.tipo, h.texto)));
    const msg = el('textarea', { rows: '3', maxlength: '2000', 'aria-label': 'O que o lead respondeu', placeholder: 'Cole aqui o que o lead respondeu no WhatsApp' });
    const contexto = el('input', { maxlength: '800', 'aria-label': 'Informações para a resposta', placeholder: 'Opcional: preço, prazo ou o que você quer oferecer' });
    const area = el('div', { class: 'ld-ab' });
    const ir = btn('Sugerir respostas', { pri: true, ic: 'wand', onclick: async () => {
      const texto = msg.value.trim(); if (!texto) { msg.focus(); return; }
      ir.disabled = true;
      try { await post(ctx, `/${l.id}/historico`, { tipo: 'lead', texto }); fio.append(bolha('lead', texto)); msg.value = ''; } catch (e) { avisar(e.message, true); }
      const parar = progresso(area, 'A IA está pensando na resposta…');
      try {
        const r = (await rodarIA(ctx, { tipo: 'responder', lead_id: l.id, mensagem: texto, contexto: contexto.value.trim() || undefined })).resposta; parar();
        const sites = d.sites || [];
        area.replaceChildren(
          r.entendimento ? el('p', { class: 'pn-nota' }, el('b', { text: 'O que ele quis dizer: ' }), r.entendimento) : null,
          el('div', { class: 'ld-sugs' }, r.sugestoes.map((s2) => { const txt = el('textarea', { rows: '3', 'aria-label': 'Resposta sugerida' }); txt.value = s2.texto; return el('div', { class: 'ld-sug' }, s2.tom ? pill(s2.tom, 'azul') : null, txt, el('div', { class: 'pn-acoes' }, l.whatsapp ? btn('Enviar no WhatsApp', { pri: true, ic: 'chat', onclick: () => { abrirZap(ctx, l, txt.value, { enviada: true }); fio.append(bolha('voce', txt.value)); } }) : null, btn('Copiar', { ic: 'copy', onclick: () => copiar(ctx, txt.value) }))); })),
          r.proximo_passo ? el('p', { class: 'pn-nota' }, el('b', { text: 'Próximo passo: ' }), r.proximo_passo) : null,
          el('div', { class: 'pn-acoes' },
            r.etapa_sugerida && r.etapa_sugerida !== l.status ? btn('Mover para ' + NOME[r.etapa_sugerida], { ic: 'filter', onclick: async (e) => { if (await mudar({ status: r.etapa_sugerida }, 'Etapa: ' + NOME[r.etapa_sugerida] + '.')) e.currentTarget.disabled = true; } }) : null,
            r.pedido_site && sites.length ? btn('Aplicar no site: ' + r.pedido_site.slice(0, 60), { ic: 'code', onclick: () => { fecharModal(); abrirEditor(ctx, sites[0].id, { pedido: r.pedido_site }); } }) : null,
            r.pedido_site && !sites.length ? el('span', { class: 'pn-nota', text: 'Ele pediu: ' + r.pedido_site + ' (crie o site primeiro).' }) : null),
          r.ia ? el('p', { class: 'ld-atrib', text: 'Sugerido por ' + r.ia }) : null);
      } catch (e) { parar(); area.replaceChildren(el('p', { class: 'pn-msg erro', text: e.message })); }
      ir.disabled = false;
    } });
    // o fio fica sempre na tela (escondido enquanto vazio) para a primeira mensagem aparecer na hora
    const dica = el('p', { class: 'pn-nota', text: 'Quando o lead responder, cole a mensagem aqui: o JARVIS entende, sugere três respostas e, se ele pedir mudança no site, aplica para você.' });
    const sincronizar = () => { const tem = fio.childElementCount > 0; fio.hidden = !tem; dica.hidden = tem; if (tem) fio.scrollTop = fio.scrollHeight; };
    new MutationObserver(sincronizar).observe(fio, { childList: true });
    sincronizar();
    return el('div', { class: 'ld-secao' }, el('div', { class: 'ld-tit', role: 'heading', 'aria-level': '3' }, svg('chat'), 'Conversa'),
      dica, fio, msg, contexto, el('div', { class: 'pn-acoes' }, ir), area);
  }
  function conectarVercel(ctx, depois) {
    const inp = el('input', { type: 'password', autocomplete: 'off', spellcheck: 'false', placeholder: 'token da Vercel' });
    const msg = el('div', { class: 'pn-msg', role: 'status' });
    abrirModal('Conectar a Vercel',
      el('p', { class: 'pn-nota', text: 'A Vercel hospeda sites de graça com HTTPS. O JARVIS publica o site na sua conta da Vercel: a demonstração num endereço .vercel.app e, depois, o site oficial com o domínio do cliente.' }),
      el('ol', { class: 'ld-passos' }, el('li', {}, 'Crie uma conta grátis em ', linkA('https://vercel.com/signup', 'vercel.com'), ' (dá para entrar com o e-mail ou o GitHub).'), el('li', {}, 'Abra ', linkA('https://vercel.com/account/tokens', 'vercel.com/account/tokens'), ', clique em Create, dê um nome (ex.: JARVIS) e escolha a validade.'), el('li', { text: 'Copie o token e cole aqui. Ele fica cifrado na nuvem do JARVIS e nunca aparece de novo na tela.' })),
      el('div', { class: 'pn-form' }, campo('Token da Vercel', inp, 'larga')),
      el('div', { class: 'pn-acoes', style: 'margin-top:12px' }, btn('Conectar', { pri: true, ic: 'link', onclick: async (e) => { const b = e.currentTarget; b.disabled = true; msg.className = 'pn-msg'; msg.textContent = 'Conferindo na Vercel…'; try { await put(ctx, '/conta', { vercel_token: inp.value.trim() }); fecharModal(); ctx.toast('Vercel conectada.'); depois?.(); } catch (er) { msg.className = 'pn-msg erro'; msg.textContent = er.message; b.disabled = false; } } })), msg);
  }
  // outros painéis (Componentes → Sites prontos) abrem o editor por aqui
  const ctxSolto = () => { const h = P.host(); return { host: h, nuvem: (c, o) => h.nuvem(c, o), api: (c, o) => h.api(c, o), toast: (x, tp) => h.toast(x, tp), atualizar: () => {}, recarregar: () => {}, trocarAba: () => {} }; };
  window.JARVIS_LEADS = { editor: (id, opcoes) => abrirEditor(ctxSolto(), id, opcoes), conectarVercel: (depois) => conectarVercel(ctxSolto(), depois) };

  // ---------- registro ----------
  P.registrar({
    id: 'leads', titulo: 'Leads e clientes', sub: 'Ache negócios sem site, feche clientes e crie sites com IA', ic: 'target',
    abas: [{ id: 'buscar', nome: 'Buscar', ic: 'search' }, { id: 'leads', nome: 'Seus leads', ic: 'filter' }, { id: 'clientes', nome: 'Seus clientes', ic: 'users' }, { id: 'sites', nome: 'Seus sites', ic: 'globe' }],
    render: async (ctx) => {
      const est = await nv(ctx, '/estado');
      if (!est.liberado) return bloqueado(ctx);
      return ({ buscar, leads, clientes, sites }[ctx.aba] || buscar)(ctx, est);
    },
  });
})();
