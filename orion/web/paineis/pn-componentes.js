'use strict';
// cópia de app/public/paineis/pn-componentes.js (scripts/copiar-visual-app.js): edite no app e copie de novo
// Painel "Componentes & UI": a biblioteca visual do ORION. Cada peça aparece funcionando (num Shadow DOM, isolada da tela)
// e, se o plano libera, dá para copiar o HTML e o CSS. As peças de outros planos aparecem com cadeado (sem o código).
// A aba "React" traz componentes React + Tailwind selecionados (licença MIT), com prévia em vídeo, guardados na nuvem do ORION.
(() => {
  const P = window.ORION_PAINEIS; if (!P) return;
  const { el, svg, pill, kpi, btn, vazio, busca, abrirModal } = P.util;
  const NIVEL = { free: ['Free', ''], basic: ['Basic', 'azul'], premium: ['Premium', 'aviso'] };
  let cat = '', filtro = '', soLiberados = false;

  // prévia isolada: o CSS da peça não vaza para o ORION e o do ORION não muda a peça
  function previa(base, c) {
    const host = el('div');
    const raiz = host.attachShadow({ mode: 'open' });
    const st = document.createElement('style');
    st.textContent = `${base}\n:host{display:block;width:100%;height:100%}\n.oc-palco{position:relative;width:100%;height:100%;overflow:hidden}\n.oc-palco>.oc-tema{position:absolute;left:50%;top:50%;display:grid;place-items:center;transform-origin:center;width:max-content;transform:translate(-50%,-50%)}\n${c.css}`;
    const palco = document.createElement('div'); palco.className = 'oc-palco';
    const tema = document.createElement('div'); tema.className = 'oc-tema';
    tema.innerHTML = c.html; // HTML fixo do catálogo do ORION (lib/ui-catalogo.js), nunca texto de usuário
    tema.querySelectorAll('a[href="#"]').forEach((a) => a.addEventListener('click', (e) => e.preventDefault()));
    tema.querySelectorAll('form').forEach((f) => f.addEventListener('submit', (e) => e.preventDefault()));
    palco.append(tema); raiz.append(st, palco);
    // peças largas (seções inteiras) encolhem para caber no cartão; a peça mede o próprio tamanho (width: max-content)
    const ajustar = () => { tema.style.transform = 'translate(-50%,-50%)'; const w = tema.offsetWidth, h = tema.offsetHeight, W = palco.clientWidth - 24, H = palco.clientHeight - 24; if (W <= 0 || H <= 0) return; const s = Math.min(1, W / (w || 1), H / (h || 1)); if (s < 1) tema.style.transform = `translate(-50%,-50%) scale(${s.toFixed(3)})`; };
    requestAnimationFrame(ajustar); try { new ResizeObserver(() => requestAnimationFrame(ajustar)).observe(palco); } catch { /* sem ResizeObserver: fica a primeira medida */ }
    return host;
  }
  const codigo = (base, c) => `<!-- ${c.nome} · ORION UI -->\n<div class="oc-tema">\n  ${c.html.replace(/\n/g, '\n  ')}\n</div>\n\n<style>\n${base}\n${c.css}\n</style>`;
  async function copiar(texto, ctx) { try { await navigator.clipboard.writeText(texto); ctx.toast('Código copiado.'); } catch { ctx.toast('Não deu para copiar automaticamente: selecione o código e use Ctrl+C.', 'bad'); } }

  function detalhe(ctx, base, c) {
    const pre = el('pre', { class: 'pn-codigo', tabindex: '0', text: codigo(base, c) });
    abrirModal(c.nome,
      el('div', { style: 'height:260px;border-radius:16px;overflow:hidden;border:1px solid rgba(46,155,255,.18);background:radial-gradient(80% 90% at 50% 0,rgba(46,155,255,.1),transparent 70%),#000' }, previa(base, c)),
      el('p', { class: 'pn-nota', style: 'margin:12px 0', text: c.descricao + ' Cole o bloco inteiro na sua página: as cores ficam nas variáveis de .oc-tema (troque --oc-azul para a sua marca).' }),
      el('div', { style: 'display:flex;gap:8px;flex-wrap:wrap;margin-bottom:10px' }, btn('Copiar HTML + CSS', { pri: true, ic: 'copy', onclick: () => copiar(codigo(base, c), ctx) }), btn('Só o HTML', { ic: 'code', onclick: () => copiar(c.html, ctx) }), btn('Só o CSS', { ic: 'palette', onclick: () => copiar(`${base}\n${c.css}`, ctx) })),
      pre);
  }

  // ---------- aba "React": componentes React + Tailwind selecionados (licença MIT), guardados na nuvem do ORION ----------
  let catR = '', filtroR = '', soLibR = false;
  function midia(base, c, vista) {
    if (c.video) {
      const v = el('video', { src: base + c.video, poster: c.imagem ? base + c.imagem : null, loop: true, playsinline: true, preload: 'none', 'aria-label': 'Prévia de ' + c.nome });
      v.muted = true; if (vista) vista.observe(v); else v.autoplay = true;
      return v;
    }
    // sem imagem de prévia: um cartão com o nome e a categoria (o código continua completo no detalhe)
    return c.imagem ? el('img', { src: base + c.imagem, alt: 'Prévia de ' + c.nome, loading: 'lazy' }) : el('div', { class: 'pn-react-sem', role: 'img', 'aria-label': 'Componente ' + c.nome }, svg('component'), el('b', { text: c.nome }), el('small', { text: c.categoria || 'Componente' }));
  }
  const pacote = (d) => [
    `// ${d.nome}: ${d.credito.biblioteca}, licença ${d.credito.licenca} (${d.credito.copyright})`,
    '// Componente React com Tailwind CSS (padrão shadcn/ui).',
    ...[d.instalar.npm, d.utils?.npm, d.instalar.shadcn].filter(Boolean).map((x) => '// ' + x),
    ...(d.utils ? ['', '// ' + d.utils.caminho, d.utils.conteudo] : []),
    ...d.arquivos.flatMap((a) => ['', '// ' + a.caminho, a.conteudo]),
    ...(d.css ? ['', '/* globals.css */', d.css] : []),
    ...(d.tailwind ? ['', '// tailwind.config (theme.extend)', d.tailwind] : []),
  ].join('\n');
  async function detalheReact(ctx, base, c) {
    let d; try { d = await ctx.nuvem('/ui/pro/' + c.slug); } catch (e) { ctx.toast(e.message, 'bad'); return; }
    const bloco = (titulo, txt, extra) => el('div', { class: 'pn-bloco' }, el('div', { class: 'pn-bloco-tit' }, el('b', { text: titulo }), extra ? el('small', { text: extra }) : null, btn('Copiar', { peq: true, ic: 'copy', onclick: () => copiar(txt, ctx) })), el('pre', { class: 'pn-codigo', tabindex: '0', text: txt }));
    const v = midia(base, d, null);
    abrirModal(d.nome,
      el('div', { class: 'pn-react-palco' }, v),
      el('p', { class: 'pn-nota', style: 'margin:12px 0', text: d.descricao + ' Componente React com Tailwind CSS, no padrão do shadcn/ui: instale as dependências, crie os arquivos nos caminhos indicados e cole o CSS extra no globals.css.' }),
      el('div', { style: 'display:flex;gap:8px;flex-wrap:wrap;margin-bottom:12px' }, btn('Copiar tudo', { pri: true, ic: 'copy', onclick: () => copiar(pacote(d), ctx) }),
        d.docs ? el('a', { class: 'pn-btn', href: d.docs, target: '_blank', rel: 'noopener' }, svg('ext'), 'Documentação original') : null),
      el('div', { class: 'pn-react-blocos' },
        d.instalar.npm ? bloco('Instalar as dependências', d.instalar.npm) : null,
        d.instalar.shadcn ? bloco('Componentes base do shadcn/ui', d.instalar.shadcn) : null,
        d.utils ? bloco(d.utils.caminho, d.utils.conteudo, d.utils.npm) : null,
        d.arquivos.map((a) => bloco(a.caminho, a.conteudo)),
        d.css ? bloco('CSS extra (globals.css)', d.css) : null,
        d.tailwind ? bloco('tailwind.config (theme.extend)', d.tailwind) : null),
      el('p', { class: 'pn-nota', style: 'margin:12px 0 0', text: `${d.credito.biblioteca}, licença ${d.credito.licenca} (${d.credito.copyright}). Pode usar em projetos pessoais e comerciais; mantenha o aviso de licença no projeto.` }));
  }
  async function renderReact(ctx) {
    const r = await ctx.nuvem('/ui/pro');
    const base = (r.servidor || '') + r.midia_base;
    if (!r.total) { ctx.corpo.append(vazio('component', 'Biblioteca React chegando', 'Os componentes React ainda estão sendo preparados. Volte daqui a pouco.')); return; }
    const lista = r.componentes.filter((c) => (!catR || c.categoria === catR) && (!soLibR || c.liberado) && (!filtroR || (c.nome + ' ' + c.descricao + ' ' + c.categoria + ' ' + c.fonte_nome).toLowerCase().includes(filtroR.toLowerCase())));
    const proximo = r.proximo !== undefined ? r.proximo : r.plano === 'free' ? 'basic' : r.plano === 'basic' ? 'premium' : null;
    const b = busca('Buscar componente React', (v) => { filtroR = v; ctx.atualizar(); }); b.querySelector('input').value = filtroR;
    const contaCat = (k) => r.componentes.filter((c) => c.categoria === k).length;
    // os vídeos só tocam enquanto aparecem na tela
    const vista = 'IntersectionObserver' in window ? new IntersectionObserver((es) => es.forEach((x) => { if (x.isIntersecting) x.target.play().catch(() => {}); else x.target.pause(); }), { rootMargin: '120px' }) : null;
    ctx.corpo.append(
      el('div', { class: 'pn-grade' },
        kpi('Seu plano', r.nome_plano, r.logado ? 'conta ORION conectada' : 'entre na sua conta para liberar mais', 'idcard'),
        kpi('Liberados para você', `${r.liberados} de ${r.total}`, proximo ? `${r.niveis[proximo].total - r.liberados} a mais no ${r.niveis[proximo].nome}` : 'você tem a biblioteca inteira', 'component', r.liberados === r.total ? 'bom' : ''),
        kpi('Feitos com', 'React + Tailwind', 'com o comando de instalação e o CSS que falta', 'code')),
      proximo ? el('div', { class: 'pn-caixa', style: 'display:flex;align-items:center;gap:14px;flex-wrap:wrap' }, el('span', { class: 'pn-ic', style: 'display:grid;place-items:center;width:40px;height:40px;border-radius:12px;color:#00101f;background:linear-gradient(135deg,#2E9BFF,#00D2FF)' }, svg('sparkles')), el('div', { style: 'flex:1;min-width:220px' }, el('b', { text: `Libere ${r.niveis[proximo].total - r.liberados} componentes React com o plano ${r.niveis[proximo].nome}` }), el('p', { class: 'pn-nota', style: 'margin:2px 0 0', text: 'Partículas, globo 3D, feixes de luz, campo de IA com pesquisa, entrada de voz e mais. O plano vale no site e no app.' })), el('a', { class: 'pn-btn pri', href: 'https://assistanceorion.cloud/orion/#planos', target: '_blank', rel: 'noopener' }, svg('arrowup'), 'Ver planos')) : null,
      el('div', { class: 'pn-filtros', style: 'margin-top:16px' }, b, el('button', { type: 'button', class: 'pn-chip' + (!catR ? ' on' : ''), onclick: () => { catR = ''; ctx.atualizar(); } }, 'Todos ', el('small', { text: String(r.total) })),
        r.categorias.map((k) => el('button', { type: 'button', class: 'pn-chip' + (catR === k ? ' on' : ''), onclick: () => { catR = k; ctx.atualizar(); } }, k + ' ', el('small', { text: String(contaCat(k)) }))),
        P.util.chave('Só os liberados', soLibR, (v) => { soLibR = v; ctx.atualizar(); })),
      lista.length ? el('div', { class: 'pn-comp-grade' }, lista.map((c) => {
        const palco = el('div', { class: 'pn-comp-palco' }, midia(base, c, vista));
        if (!c.liberado) palco.append(el('div', { class: 'pn-comp-cadeado' }, svg('lock'), el('b', { text: `Plano ${NIVEL[c.nivel][0]}` }), el('small', { text: 'Disponível ao mudar de plano' })));
        return el('article', { class: 'pn-comp pn-comp-react' + (c.liberado ? '' : ' trancado') }, palco,
          el('div', { class: 'pn-comp-info' }, el('header', {}, el('b', { text: c.nome }), pill(NIVEL[c.nivel][0], NIVEL[c.nivel][1])), el('p', { text: c.descricao }),
            el('footer', {}, c.liberado ? btn('Ver e copiar', { peq: true, pri: true, ic: 'code', onclick: () => detalheReact(ctx, base, c) }) : el('a', { class: 'pn-btn peq', href: 'https://assistanceorion.cloud/orion/#planos', target: '_blank', rel: 'noopener' }, svg('lock'), 'Liberar'), pill(c.categoria), pill(c.fonte_nome))));
      })) : vazio('search', 'Nada encontrado', 'Tente outra palavra ou outra categoria.'));
  }

  // ---------- aba "Sites prontos": sites completos de exemplo (negócios fictícios) para ver ao vivo e usar como base ----------
  function verExemplo(e) {
    const quadro = el('iframe', { src: e.previa, title: 'Site de exemplo: ' + e.nome, referrerpolicy: 'no-referrer', class: 'ex-quadro' });
    const tam = el('div', { class: 'ld-aparelhos', role: 'group', 'aria-label': 'Tamanho da tela' });
    const marcar = (cel) => { quadro.classList.toggle('cel', cel); tam.replaceChildren(btn('Computador', { peq: true, ic: 'monitor', pri: !cel, onclick: () => marcar(false) }), btn('Celular', { peq: true, ic: 'phone', pri: cel, onclick: () => marcar(true) })); };
    marcar(false);
    abrirModal(e.nome + ' · ' + e.ramo, el('div', { class: 'ex-barra' }, el('span', { class: 'pn-nota', text: e.estilo }), tam), quadro);
  }
  async function usarExemplo(ctx, e) {
    const sel = el('select', { 'aria-label': 'Lead' }, el('option', { value: '', text: 'Nenhum: só quero o modelo' }));
    const adaptar = el('input', { type: 'checkbox' });
    const msg = el('div', { class: 'pn-msg', role: 'status' });
    abrirModal('Usar "' + e.nome + '" como base',
      el('p', { class: 'pn-nota', text: 'O ORION copia este site para Seus sites. Escolhendo um lead, a IA pode trocar nome, serviços, endereço, horário e WhatsApp pelos dados dele, mantendo o design.' }),
      el('div', { class: 'pn-form' }, el('label', { class: 'larga' }, el('span', { text: 'Lead (opcional)' }), sel)),
      el('label', { class: 'pn-chave', style: 'margin-top:12px' }, adaptar, el('i'), el('span', { text: 'Adaptar os textos para o lead com IA' })),
      el('div', { class: 'pn-acoes', style: 'margin-top:14px' }, btn('Criar meu site', { pri: true, ic: 'sparkles', onclick: async (ev) => {
        const b = ev.currentTarget; b.disabled = true; msg.textContent = 'Copiando o modelo…';
        try {
          const r = await ctx.nuvem('/leads/sites', { metodo: 'POST', corpo: { exemplo: e.slug, lead_id: sel.value || undefined, nome: sel.value ? undefined : e.nome + ' (meu)' } });
          P.util.fecharModal();
          const pedido = sel.value && adaptar.checked ? 'Adapte este site de exemplo para o negócio dos DADOS DO NEGÓCIO: troque o nome, o ramo, os serviços, o endereço, a cidade, o horário, o mapa e o WhatsApp pelos dados reais dele e reescreva os textos para esse negócio. Mantenha a qualidade do design; se o ramo for diferente do exemplo, ajuste cores e ilustração ao ramo. Não invente preços nem depoimentos.' : null;
          if (window.ORION_LEADS) window.ORION_LEADS.editor(r.site.id, pedido ? { pedido } : {}); else ctx.toast('Site criado em Leads e clientes → Seus sites.');
        } catch (er) { msg.className = 'pn-msg erro'; msg.textContent = er.message; b.disabled = false; }
      } })), msg);
    sel.addEventListener('change', () => { adaptar.checked = !!sel.value; });
    try { const r = await ctx.nuvem('/leads'); sel.append(...r.leads.slice(0, 300).map((l) => el('option', { value: l.id, text: l.nome + (l.cidade ? ' · ' + l.cidade : '') }))); } catch { /* sem a lista: segue só com o modelo */ }
  }
  async function renderSites(ctx) {
    const r = await ctx.nuvem('/leads/exemplos/lista');
    if (!r.exemplos.length) { ctx.corpo.append(vazio('layout', 'Sites prontos chegando', 'Os exemplos ainda estão sendo preparados.')); return; }
    const cartoes = r.exemplos.map((e) => el('article', { class: 'ex-card' },
      el('button', { type: 'button', class: 'ex-capa', style: `--c1:${e.cores[0]};--c2:${e.cores[1]};--c3:${e.cores[2]}`, 'aria-label': 'Ver ' + e.nome + ' ao vivo', onclick: () => verExemplo(e) }, el('i'), el('b', { text: e.nome }), el('small', { text: e.ramo })),
      el('div', { class: 'ex-info' }, el('h4', { text: e.nome }), el('p', { class: 'pn-nota', text: e.descricao }), el('div', { class: 'ex-tags' }, pill(e.ramo, 'azul'), pill(e.estilo, ''))),
      el('div', { class: 'pn-acoes' }, btn('Ver ao vivo', { ic: 'eye', onclick: () => verExemplo(e) }), r.pode_usar ? btn('Usar como base', { pri: true, ic: 'sparkles', onclick: () => usarExemplo(ctx, e) }) : el('a', { class: 'pn-btn', href: 'https://assistanceorion.cloud/orion/checkout?plano=premium', target: '_blank', rel: 'noopener' }, svg('lock'), 'Usar no Premium'))));
    ctx.corpo.append(el('section', { class: 'pn-caixa' }, el('header', {}, el('h3', {}, svg('layout'), 'Sites prontos'), el('p', { text: 'Sites completos de exemplo, cada um com uma identidade própria. Veja ao vivo no computador e no celular e use como ponto de partida para um lead: a IA adapta para o negócio dele.' })),
      el('div', { class: 'ex-grade' }, cartoes)));
  }

  async function render(ctx) {
    if (ctx.aba === 'react') return renderReact(ctx);
    if (ctx.aba === 'sites') return renderSites(ctx);
    const r = await ctx.nuvem('/ui/componentes');
    const base = r.base_css;
    const lista = r.componentes.filter((c) => (!cat || c.categoria === cat) && (!soLiberados || c.liberado) && (!filtro || (c.nome + ' ' + c.descricao + ' ' + c.categoria).toLowerCase().includes(filtro.toLowerCase())));
    const proximo = r.proximo !== undefined ? r.proximo : r.plano === 'free' ? 'basic' : r.plano === 'basic' ? 'premium' : null;
    const b = busca('Buscar componente', (v) => { filtro = v; ctx.atualizar(); }); b.querySelector('input').value = filtro;
    const contaCat = (k) => r.componentes.filter((c) => c.categoria === k).length;
    ctx.corpo.append(
      el('div', { class: 'pn-grade' },
        kpi('Seu plano', r.nome_plano, r.logado ? 'conta ORION conectada' : 'entre na sua conta para liberar mais', 'idcard'),
        kpi('Liberados para você', `${r.liberados} de ${r.total}`, proximo ? `${r.niveis[proximo].total - r.liberados} a mais no ${r.niveis[proximo].nome}` : 'você tem a biblioteca inteira', 'component', r.liberados === r.total ? 'bom' : ''),
        kpi('Feitos para o ORION', 'HTML + CSS', 'sem bibliotecas nem JavaScript; funcionam em qualquer site', 'code')),
      proximo ? el('div', { class: 'pn-caixa', style: 'display:flex;align-items:center;gap:14px;flex-wrap:wrap' }, el('span', { class: 'pn-ic', style: 'display:grid;place-items:center;width:40px;height:40px;border-radius:12px;color:#00101f;background:linear-gradient(135deg,#2E9BFF,#00D2FF)' }, svg('sparkles')), el('div', { style: 'flex:1;min-width:220px' }, el('b', { text: `Libere ${r.niveis[proximo].total - r.liberados} componentes com o plano ${r.niveis[proximo].nome}` }), el('p', { class: 'pn-nota', style: 'margin:2px 0 0', text: 'Painéis de HUD, anel de energia, radar, terminal, gráficos e mais. O plano vale no site e no app.' })), el('a', { class: 'pn-btn pri', href: 'https://assistanceorion.cloud/orion/#planos', target: '_blank', rel: 'noopener' }, svg('arrowup'), 'Ver planos')) : null,
      el('div', { class: 'pn-filtros', style: 'margin-top:16px' }, b, el('button', { type: 'button', class: 'pn-chip' + (!cat ? ' on' : ''), onclick: () => { cat = ''; ctx.atualizar(); } }, 'Todos ', el('small', { text: String(r.total) })),
        r.categorias.map((k) => el('button', { type: 'button', class: 'pn-chip' + (cat === k ? ' on' : ''), onclick: () => { cat = k; ctx.atualizar(); } }, k + ' ', el('small', { text: String(contaCat(k)) }))),
        P.util.chave('Só os liberados', soLiberados, (v) => { soLiberados = v; ctx.atualizar(); })),
      lista.length ? el('div', { class: 'pn-comp-grade' }, lista.map((c) => {
        const palco = el('div', { class: 'pn-comp-palco' }, c.liberado ? previa(base, c) : el('div'));
        if (!c.liberado) palco.append(el('div', { class: 'pn-comp-cadeado' }, svg('lock'), el('b', { text: `Plano ${NIVEL[c.nivel][0]}` }), el('small', { text: 'Disponível ao mudar de plano' })));
        return el('article', { class: 'pn-comp' + (c.liberado ? '' : ' trancado') }, palco,
          el('div', { class: 'pn-comp-info' }, el('header', {}, el('b', { text: c.nome }), pill(NIVEL[c.nivel][0], NIVEL[c.nivel][1])), el('p', { text: c.descricao }),
            el('footer', {}, c.liberado ? [btn('Ver e copiar', { peq: true, pri: true, ic: 'code', onclick: () => detalhe(ctx, base, c) }), btn('', { peq: true, ic: 'copy', titulo: 'Copiar código', onclick: () => copiar(codigo(base, c), ctx) })] : el('a', { class: 'pn-btn peq', href: 'https://assistanceorion.cloud/orion/#planos', target: '_blank', rel: 'noopener' }, svg('lock'), 'Liberar'), pill(c.categoria))));
      })) : vazio('search', 'Nada encontrado', 'Tente outra palavra ou outra categoria.'));
  }

  P.registrar({ id: 'componentes', titulo: 'Componentes & UI', sub: 'Biblioteca visual do ORION: copie e use no seu site', ic: 'component', precisaPc: false,
    abas: [{ id: 'react', nome: 'React', ic: 'component' }, { id: 'html', nome: 'HTML + CSS', ic: 'code' }, { id: 'sites', nome: 'Sites prontos', ic: 'layout' }], render });
})();
