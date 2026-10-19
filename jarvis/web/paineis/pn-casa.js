'use strict';
// cópia de app/public/paineis/pn-casa.js (scripts/copiar-visual-app.js): edite no app e copie de novo

// Painel Home Assistant: aparelhos da casa (luzes, tomadas, ar, cortinas, som, sensores) e rotinas (cenas, scripts e automações).
// A conexão (endereço + token de acesso) é feita só no app do PC; no JARVIS Web dá para usar, mas não reconfigurar.
(() => {
  const P = window.JARVIS_PAINEIS; if (!P) return;
  const { el, svg, pill, kpi, caixa, btn, vazio, campo, busca, linha } = P.util;
  const ICONE = { light: 'bulb', switch: 'toggle', input_boolean: 'toggle', fan: 'fan', cover: 'blinds', climate: 'thermo', media_player: 'tv', vacuum: 'home', button: 'zap', scene: 'sparkles', script: 'routine', automation: 'repeat', sensor: 'activity', binary_sensor: 'radio', lock: 'lock', alarm_control_panel: 'shield' };
  const LIGADO = new Set(['on', 'open', 'playing', 'heat', 'cool', 'heat_cool', 'auto', 'dry', 'fan_only', 'cleaning', 'unlocked']);
  const ESTADO = { on: 'Ligado', off: 'Desligado', open: 'Aberta', closed: 'Fechada', opening: 'Abrindo', closing: 'Fechando', playing: 'Tocando', paused: 'Pausado', idle: 'Parado', standby: 'Em espera', unavailable: 'Indisponível', unknown: 'Sem leitura', locked: 'Trancada', unlocked: 'Destrancada', heat: 'Aquecendo', cool: 'Resfriando', auto: 'Automático', docked: 'Na base', cleaning: 'Limpando', home: 'Em casa', not_home: 'Fora' };
  let filtro = '', dominio = '';

  function conectar(ctx, est = {}) {
    if (ctx.host.tipo !== 'app') return vazio('home', est.configurado ? 'O Home Assistant não respondeu' : 'Conecte o Home Assistant no app do PC', est.erro || 'Por segurança, o endereço e o token da sua casa são configurados só no app do JARVIS no computador (eles não passam pelo site). Depois disso, os aparelhos aparecem aqui também.', btn('Tentar de novo', { ic: 'refresh', onclick: () => ctx.recarregar() }));
    const url = el('input', { value: est.url || '', placeholder: 'http://homeassistant.local:8123', spellcheck: 'false' });
    const token = el('input', { type: 'password', autocomplete: 'off', spellcheck: 'false', placeholder: est.configurado ? 'Deixe vazio para manter o token atual' : 'Cole o token de acesso de longa duração' });
    const msg = el('div', { class: 'pn-msg', role: 'status' });
    const ir = async () => { msg.className = 'pn-msg'; msg.textContent = 'Testando a conexão…'; try { const r = await ctx.api('/casa/conectar', { metodo: 'POST', corpo: { url: url.value, token: token.value } }); ctx.toast(`Conectado a "${r.nome}".`); P.util.fecharModal(); ctx.recarregar(); } catch (e) { msg.className = 'pn-msg erro'; msg.textContent = e.message; } };
    return el('div', {},
      est.configurado && est.erro ? el('div', { style: 'margin-bottom:12px' }, pill('Sem resposta: ' + est.erro, 'erro')) : null,
      caixa('Conectar o Home Assistant', 'home', { sub: 'O JARVIS usa a API oficial do Home Assistant. O token fica guardado no cofre do Windows deste PC.' },
        el('ol', { class: 'pn-nota', style: 'margin:0 0 14px;padding-left:18px;line-height:1.8' },
          el('li', { text: 'No Home Assistant, clique no seu nome (canto de baixo) → aba Segurança.' }),
          el('li', { text: 'Em "Tokens de acesso de longa duração", clique em Criar token, dê o nome JARVIS e copie.' }),
          el('li', { text: 'Cole abaixo junto com o endereço que você usa para abrir o Home Assistant neste PC.' })),
        el('div', { class: 'pn-form' }, campo('Endereço do Home Assistant', url, 'larga'), campo('Token de acesso', token, 'larga'), el('div', { class: 'pn-acoes larga' }, btn('Testar e conectar', { pri: true, ic: 'link', onclick: ir }), est.configurado ? btn('Desconectar', { perigo: true, ic: 'ban', onclick: async () => { if (!P.util.confirmar('Desconectar o Home Assistant deste JARVIS?')) return; await ctx.api('/casa/desconectar', { metodo: 'POST', corpo: {} }); P.util.fecharModal(); ctx.recarregar(); } }) : null)), msg),
      el('p', { class: 'pn-nota', text: 'Fechaduras, alarmes e portões aparecem só para leitura: abrir a casa continua sendo no app do Home Assistant.' }));
  }

  async function agir(ctx, a, acao, valor, cartao) {
    cartao?.classList.add('ocupado');
    try { const r = await ctx.api('/casa/acao', { metodo: 'POST', corpo: { id: a.id, acao, valor } }); ctx.toast(`${a.nome}: ${r.aparelho ? (ESTADO[r.aparelho.estado] || r.aparelho.estado) : 'feito'}.`); setTimeout(() => ctx.atualizar(), 600); }
    catch (e) { ctx.toast(e.message, 'bad'); }
    cartao?.classList.remove('ocupado');
  }
  function cartao(ctx, a) {
    const ligado = LIGADO.has(a.estado);
    const card = el('article', { class: 'pn-ap' + (ligado ? ' ligado' : '') });
    const estrela = el('button', { type: 'button', class: 'pn-ap-estrela' + (a.favorito ? ' on' : ''), title: a.favorito ? 'Tirar dos favoritos' : 'Favoritar', 'aria-pressed': String(!!a.favorito), onclick: async () => { try { await ctx.api('/casa/favorito', { metodo: 'POST', corpo: { id: a.id, ligado: !a.favorito } }); ctx.atualizar(); } catch (e) { ctx.toast(e.message, 'bad'); } } }, svg('star'));
    const valorTxt = a.dominio === 'climate' ? (a.temperatura_atual != null ? a.temperatura_atual + ' °C' : ESTADO[a.estado] || a.estado) : a.unidade ? `${a.estado} ${a.unidade}` : a.dominio === 'light' && ligado && a.brilho != null ? `${a.brilho}%` : (ESTADO[a.estado] || a.estado);
    const acoes = el('div', { class: 'pn-ap-acoes' });
    const principais = a.acoes.filter((x) => ['toggle', 'open_cover', 'close_cover', 'media_play_pause', 'press', 'start', 'trigger', 'turn_on'].includes(x.id)).slice(0, 3);
    for (const x of principais) if (!(x.id === 'turn_on' && a.acoes.some((y) => y.id === 'toggle'))) acoes.append(btn(x.nome, { peq: true, pri: x.id === 'toggle', onclick: () => agir(ctx, a, x.id, null, card) }));
    if (a.dominio === 'light' && a.acoes.length) { const r = el('input', { type: 'range', min: '1', max: '100', value: String(a.brilho || 60), 'aria-label': 'Brilho de ' + a.nome, style: 'flex:1;min-width:90px' }); r.addEventListener('change', () => agir(ctx, a, 'turn_on', Number(r.value), card)); acoes.append(r); }
    if (a.dominio === 'climate' && a.acoes.length) { const t = el('input', { type: 'number', min: '10', max: '35', step: '0.5', value: String(a.temperatura ?? 23), style: 'width:76px;height:30px', 'aria-label': 'Temperatura desejada' }); acoes.append(t, btn('Ajustar', { peq: true, onclick: () => agir(ctx, a, 'set_temperature', Number(t.value), card) }), btn(ligado ? 'Desligar' : 'Ligar', { peq: true, onclick: () => agir(ctx, a, ligado ? 'turn_off' : 'turn_on', null, card) })); }
    if (a.dominio === 'media_player' && a.acoes.length) acoes.append(btn('', { peq: true, ic: 'chevleft', titulo: 'Anterior', onclick: () => agir(ctx, a, 'media_previous_track', null, card) }), btn('', { peq: true, ic: 'chevright', titulo: 'Próxima', onclick: () => agir(ctx, a, 'media_next_track', null, card) }));
    card.append(el('div', { class: 'pn-ap-topo' }, el('span', { class: 'pn-ic' }, svg(ICONE[a.dominio] || 'home')), el('div', { class: 'pn-ap-nome' }, el('b', { text: a.nome, title: a.id }), el('small', { text: a.grupo })), estrela),
      el('div', { class: 'pn-ap-estado', text: valorTxt }), a.midia ? el('small', { class: 'pn-nota', text: a.midia }) : null, a.acoes.length ? acoes : el('small', { class: 'pn-nota', text: a.dominio === 'lock' || a.dominio === 'alarm_control_panel' ? 'Só leitura, por segurança.' : 'Sensor (só leitura).' }));
    return card;
  }

  async function aparelhos(ctx) {
    const est = await ctx.api('/casa/estado');
    if (!est.configurado || !est.ok) { ctx.corpo.append(conectar(ctx, est)); return; }
    const r = await ctx.api('/casa/aparelhos' + (filtro ? '?busca=' + encodeURIComponent(filtro) : ''));
    const grupos = [...new Set(r.aparelhos.map((a) => a.grupo))];
    const lista = r.aparelhos.filter((a) => !dominio || a.grupo === dominio);
    const ligados = r.aparelhos.filter((a) => LIGADO.has(a.estado) && a.acoes.length).length;
    if (ctx.host.tipo === 'app') ctx.acoes(btn('Conexão', { ic: 'settings', onclick: () => { P.util.abrirModal('Conexão com o Home Assistant', conectar(ctx, est)); } }));
    const b = busca('Buscar aparelho', (v) => { filtro = v; ctx.atualizar(); }); b.querySelector('input').value = filtro;
    ctx.corpo.append(
      el('div', { class: 'pn-grade' }, kpi('Casa', est.nome || 'Home Assistant', est.versao ? 'Home Assistant ' + est.versao : '', 'home', 'bom'), kpi('Aparelhos', String(r.total), `${ligados} ligado(s) agora`, 'bulb'), kpi('Favoritos', String(r.aparelhos.filter((a) => a.favorito).length), 'aparecem primeiro', 'star')),
      el('div', { class: 'pn-filtros', style: 'margin-top:16px' }, b, el('button', { type: 'button', class: 'pn-chip' + (!dominio ? ' on' : ''), onclick: () => { dominio = ''; ctx.atualizar(); } }, 'Todos'), grupos.map((g) => el('button', { type: 'button', class: 'pn-chip' + (dominio === g ? ' on' : ''), onclick: () => { dominio = g; ctx.atualizar(); } }, g))),
      lista.length ? el('div', { class: 'pn-aparelhos' }, lista.map((a) => cartao(ctx, a))) : vazio('search', 'Nenhum aparelho encontrado', filtro ? 'Tente outro nome.' : 'O Home Assistant não mostrou aparelhos que o JARVIS controla.'),
      el('p', { class: 'pn-nota', style: 'margin-top:14px', text: 'Dica: peça por voz ou no chat, por exemplo "liga a luz da sala" ou "deixa o ar em 23 graus". Nas Rotinas do JARVIS também há o passo "Casa".' }));
  }

  async function rotinas(ctx) {
    const est = await ctx.api('/casa/estado');
    if (!est.configurado || !est.ok) { ctx.corpo.append(conectar(ctx, est)); return; }
    const r = await ctx.api('/casa/rotinas');
    const por = (g) => r.rotinas.filter((x) => x.grupo === g);
    const bloco = (g, ic, sub) => { const l = por(g); return l.length ? caixa(g, ic, { sub }, el('div', { class: 'pn-linhas' }, l.map((x) => linha({ ic, titulo: x.nome, sub: x.dominio === 'automation' ? (x.estado === 'on' ? 'Ativa' : 'Pausada') + (x.ultimo ? ' · mudou ' + P.util.relativo(x.ultimo) : '') : x.id, fim: x.acoes.map((a) => btn(a.nome, { peq: true, pri: a.id !== 'toggle', onclick: () => agir(ctx, x, a.id) })) })))) : null; };
    ctx.corpo.append(
      r.rotinas.length ? el('div', {}, bloco('Cenas', 'sparkles', 'Um toque deixa vários aparelhos do jeito que você salvou.'), bloco('Scripts', 'routine', 'Sequências criadas no Home Assistant.'), bloco('Automações', 'repeat', '"Executar agora" roda na hora; "Alternar" pausa ou reativa a automação.'))
        : vazio('routine', 'Nenhuma cena, script ou automação', 'Crie no Home Assistant (Configurações → Automações e cenas) e elas aparecem aqui.'),
      el('p', { class: 'pn-nota', style: 'margin-top:14px', text: 'Para juntar a casa com o JARVIS, crie uma rotina em Configurações → Rotinas e adicione o passo "Casa (Home Assistant)". Exemplo: ao dizer "cheguei", acender a luz da sala e falar as notícias.' }));
  }

  P.registrar({
    id: 'casa', titulo: 'Home Assistant', sub: 'Rotinas e aparelhos da casa', ic: 'home', precisaPc: true,
    abas: [{ id: 'aparelhos', nome: 'Aparelhos', ic: 'bulb' }, { id: 'rotinas', nome: 'Rotinas', ic: 'routine' }],
    render: (ctx) => ({ aparelhos, rotinas }[ctx.aba] || aparelhos)(ctx),
  });
})();
