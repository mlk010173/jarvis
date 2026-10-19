'use strict';
// Painel do cliente: projetos, IAs, chaves de API, teste e uso. Cada tela tem um "Como funciona?" para iniciantes.
let EU = null;
let PLANO = null; // plano da licença (Free, Basic ou Premium)
const NOME_PLANO = { free: 'Free', basic: 'Basic', premium: 'Premium' };
let IAS = [];
const main = () => document.getElementById('main');
const fmtData = (iso) => (iso ? new Date(iso).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' }) : '—');

// ícones SVG (line-art) para o painel
const SVG = {
  projeto: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="4" width="18" height="16" rx="2"/><path d="M3 9h18M8 4v5"/></svg>',
  ia: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="3.5"/><path d="M12 2v3M12 19v3M2 12h3M19 12h3M5 5l2 2M17 17l2 2M19 5l-2 2M7 17l-2 2"/></svg>',
  raio: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M13 2 4 14h7l-1 8 9-12h-7z"/></svg>',
  plano: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="m12 3 2.6 5.3 5.9.9-4.3 4.1 1 5.8L12 16.9 6.8 19.1l1-5.8L3.5 9.2l5.9-.9z"/></svg>',
  mais: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M12 5v14M5 12h14"/></svg>',
  chat: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M21 12a8 8 0 0 1-11.5 7.2L3 21l1.8-6.5A8 8 0 1 1 21 12z"/></svg>',
  livro: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M4 5a2 2 0 0 1 2-2h12v18H6a2 2 0 0 0-2 2z"/><path d="M4 19a2 2 0 0 1 2-2h12"/></svg>',
};
const svgEl = (s) => { const d = document.createElement('div'); d.innerHTML = s; return d.firstElementChild; };
function orbeEl() { return h('span', { class: 'orbe' }, h('i', { class: 'anel1' }), h('i', { class: 'anel2' }), h('i', { class: 'anel3' }), h('b', { class: 'nucleo' })); }
function kpi(rotulo, svg, valor, pe, extra) {
  return h('div', { class: 'kpi' + (extra?.destaque ? ' destaque' : '') },
    h('div', { class: 'rotulo' }, svgEl(svg), rotulo),
    extra?.anelPct != null
      ? h('div', { class: 'linha-kpi' }, h('div', { class: 'valor', style: 'margin:8px 0 0' }, valor), h('div', { class: 'anel', style: `--p:${extra.anelPct}`, 'aria-hidden': 'true' }, h('span', {}, extra.anelPct + '%')))
      : h('div', { class: 'valor' }, valor),
    pe ? h('div', { class: 'pe' }, pe) : null,
    extra?.barraPct != null ? h('div', { class: 'barra', style: 'margin-top:12px' }, h('i', { style: `width:${extra.barraPct}%` })) : null);
}
function acaoRapida(href, svg, tt, ds) {
  const extra = /^https?:|^\//.test(href) && !href.startsWith('#') ? { target: '_blank', rel: 'noopener' } : {};
  return h('a', { class: 'acao', href, ...extra }, h('span', { class: 'ico' }, svgEl(svg)), h('div', {}, h('div', { class: 'tt' }, tt), h('div', { class: 'ds' }, ds)));
}

function ajuda(titulo, ...conteudo) {
  return h('details', { class: 'ajuda' }, h('summary', {}, titulo), h('div', { class: 'corpo' }, ...conteudo));
}
function tela(titulo, acoes, ...conteudo) {
  const m = main();
  m.replaceChildren(h('div', { class: 'cabecalho' }, h('h1', {}, titulo), acoes ? h('div', { class: 'acoes' }, acoes) : null), ...conteudo.filter(Boolean));
  window.scrollTo(0, 0);
}
function campo(rotulo, dica, input) {
  const id = 'f_' + Math.random().toString(36).slice(2, 8);
  input.id = id;
  return h('div', { class: 'campo' }, h('label', { for: id }, rotulo, dica ? h('span', { class: 'dica' }, dica) : null), input);
}
async function comBotao(btn, fn) {
  btn.disabled = true;
  try { await fn(); } catch (e) { aviso(e.message, 'erro'); if (e.status === 401) location.href = 'entrar'; } finally { btn.disabled = false; }
}

async function iniciar() {
  try { const r = await api('/api/conta/eu'); EU = { ...r.usuario, uso_hoje: r.uso_hoje, limite: r.limite }; } catch { location.href = 'entrar'; return; }
  try { PLANO = await api('/api/conta/plano'); } catch { PLANO = null; }
  document.getElementById('usuario-nome').textContent = EU.nome;
  document.getElementById('sair').addEventListener('click', async (ev) => {
    ev.preventDefault();
    await api('/api/conta/sair', { method: 'POST' }).catch(() => {});
    location.href = 'jarvis/';
  });
  window.addEventListener('hashchange', rota);
  rota();
}

async function rota() {
  const [v, id] = location.hash.slice(1).split('/');
  document.querySelectorAll('[data-menu]').forEach((a) => a.classList.toggle('ativo', a.dataset.menu === (v === 'projeto' ? 'projetos' : v || 'inicio')));
  try {
    IAS = await api('/api/conta/ias');
    if (v === 'projeto' && id) return await verProjeto(id);
    if (v === 'ias') return await verIAs();
    if (v === 'conta') return await verConta();
    if (v === 'projetos') return await verProjetos();
    return await verVisao();
  } catch (e) {
    if (e.status === 401) { location.href = 'entrar'; return; }
    tela('Ops', null, h('p', { class: 'erro' }, e.message), h('a', { class: 'btn', href: '#projetos' }, 'Voltar'));
  }
}

function faixaSemIA() {
  if (IAS.some((i) => i.conectada)) return null;
  return h('div', { class: 'faixa alerta' },
    h('strong', {}, 'Primeiro passo: conecte uma IA. '),
    'Sem isso o seu assistente não consegue responder. O Gemini do Google é grátis e leva 2 minutos. ',
    h('a', { href: '#ias' }, 'Conectar agora →'));
}

// ---------------- Visão geral (início) ----------------
async function verVisao() {
  const projetos = await api('/api/projetos').catch(() => []);
  const conectadas = IAS.filter((i) => i.conectada);
  const limite = EU.limite || 1;
  const pctUso = Math.min(100, Math.round((EU.uso_hoje / limite) * 100));
  const plano = PLANO ? (NOME_PLANO[PLANO.plano] || PLANO.plano) : 'Free';
  const primeiro = (EU.nome || '').split(' ')[0] || 'por aqui';
  const hora = new Date().getHours();
  const saud = hora < 5 ? 'Boa noite' : hora < 12 ? 'Bom dia' : hora < 18 ? 'Boa tarde' : 'Boa noite';
  const projUm = projetos[0];

  const hud = h('div', { class: 'hud' },
    orbeEl(),
    h('div', {}, h('div', { class: 'ola' }, `${saud}, ${primeiro}.`),
      h('div', { class: 'sub' }, conectadas.length ? 'Seus assistentes estão prontos. O que vamos fazer hoje?' : 'Falta um passo: conecte uma IA para o seu assistente começar a responder.')),
    h('div', { class: 'lado' },
      h('div', { style: 'text-align:right' }, h('div', { class: 'peq muted' }, 'Uso de hoje'), h('div', { style: 'font-family:var(--display);font-size:1.1rem;color:var(--titulo)' }, `${EU.uso_hoje} / ${limite}`)),
      h('div', { class: 'anel', style: `--p:${pctUso}` }, h('span', {}, pctUso + '%'))));

  const kpis = h('div', { class: 'kpis' },
    kpi('Projetos', SVG.projeto, String(projetos.length), projetos.length ? 'assistentes criados' : 'crie o primeiro'),
    kpi('IAs conectadas', SVG.ia, `${conectadas.length}`, `de ${IAS.length} disponíveis`, { destaque: true }),
    kpi('Pedidos hoje', SVG.raio, String(EU.uso_hoje), `limite diário: ${limite}`, { barraPct: pctUso }),
    kpi('Plano', SVG.plano, plano, PLANO && PLANO.plano !== 'premium' ? 'ver planos e fazer upgrade' : 'todos os recursos liberados'));

  const acoes = h('div', { class: 'acoes-rapidas' },
    acaoRapida('#projetos', SVG.mais, 'Novo projeto', 'Crie um assistente'),
    acaoRapida('#ias', SVG.ia, 'Conectar IA', conectadas.length ? 'Gerenciar conexões' : 'Comece aqui (grátis)'),
    acaoRapida(projUm ? '#projeto/' + projUm.id : '#projetos', SVG.chat, 'Testar assistente', projUm ? 'Converse com o seu' : 'Crie um projeto antes'),
    acaoRapida('/docs', SVG.livro, 'Documentação da API', 'Colocar no seu site'));

  const chips = h('div', { class: 'chips' }, IAS.map((ia) => h('span', { class: 'chip' + (ia.conectada ? ' on' : '') }, h('span', { class: 'ponto' }), ia.nome)));

  const recentes = projetos.length
    ? h('div', { class: 'grade' }, projetos.slice(0, 6).map((p) => h('a', { class: 'cartao cartao-projeto', href: '#projeto/' + p.id },
      h('h3', {}, p.nome), h('p', { class: 'muted peq' }, p.descricao || 'Sem descrição'),
      h('div', { class: 'peq muted' }, `Assistente: ${p.assistente} · ${p.chaves} chave(s)`))))
    : h('div', { class: 'cartao' }, h('p', { class: 'muted', style: 'margin:0' }, 'Você ainda não tem projetos. ', h('a', { href: '#projetos' }, 'Criar o primeiro →')));

  tela('Início', null,
    faixaSemIA(),
    hud,
    kpis,
    h('div', { class: 'eyebrow', style: 'justify-content:flex-start;margin:4px 0 14px' }, h('span', {}, 'Ações rápidas')),
    acoes,
    h('div', { class: 'eyebrow', style: 'justify-content:flex-start;margin:28px 0 14px' }, h('span', {}, 'Suas IAs')),
    h('div', { class: 'cartao', style: 'margin-bottom:24px' },
      h('div', { class: 'linha', style: 'margin-bottom:12px' }, h('h3', { style: 'margin:0' }, 'Status das IAs'), h('span', { style: 'flex:1' }), h('a', { class: 'btn peq', href: '#ias' }, 'Gerenciar')),
      chips),
    h('div', { class: 'eyebrow', style: 'justify-content:flex-start;margin:28px 0 14px' }, h('span', {}, 'Seus projetos')),
    recentes);
}

// ---------------- Projetos ----------------
async function verProjetos() {
  const lista = await api('/api/projetos');
  const nome = h('input', { maxlength: 80, placeholder: 'Ex.: Atendimento da minha loja' });
  const desc = h('input', { maxlength: 500, placeholder: 'Opcional — para você lembrar do que se trata' });
  const btn = h('button', { class: 'btn prim', type: 'submit' }, 'Criar projeto');
  const form = h('form', { class: 'cartao', style: 'margin-bottom:22px' },
    h('h3', {}, 'Novo projeto'),
    h('div', { class: 'linha' },
      h('div', { class: 'cresce' }, campo('Nome do projeto', null, nome)),
      h('div', { class: 'cresce' }, campo('Descrição', null, desc))),
    btn);
  form.addEventListener('submit', (ev) => {
    ev.preventDefault();
    comBotao(btn, async () => {
      const p = await api('/api/projetos', { method: 'POST', body: { nome: nome.value, descricao: desc.value } });
      aviso('Projeto criado!', 'ok');
      location.hash = 'projeto/' + p.id;
    });
  });

  const cartoes = lista.length
    ? h('div', { class: 'grade' }, lista.map((p) => h('a', { class: 'cartao cartao-projeto', href: '#projeto/' + p.id },
      h('h3', {}, p.nome),
      h('p', { class: 'muted peq' }, p.descricao || 'Sem descrição'),
      h('div', { class: 'peq muted' }, `Assistente: ${p.assistente} · ${p.chaves} chave(s) de API`))))
    : h('p', { class: 'muted' }, 'Você ainda não tem projetos. Crie o primeiro acima.');

  tela('Meus projetos', null,
    faixaSemIA(),
    ajuda('O que é um projeto? (explicação para iniciantes)',
      h('p', {}, 'Um projeto é um assistente com nome e jeito próprios. Exemplo: um projeto "Atendimento da loja" que responde clientes de forma educada, e outro "Ideias de posts" que é criativo e descontraído.'),
      h('ol', {},
        h('li', {}, 'Dê um nome ao projeto e clique em "Criar projeto".'),
        h('li', {}, 'Na tela do projeto, escreva as instruções: como ele deve falar e o que precisa saber.'),
        h('li', {}, 'Use a aba "Testar" para conversar com ele.'),
        h('li', {}, 'Quando estiver bom, gere uma "Chave de API" para colocar no seu site ou bot.'))),
    form, cartoes);
}

async function verProjeto(id) {
  const p = await api('/api/projetos/' + encodeURIComponent(id));
  const abas = [['config', 'Configurar'], ['testar', 'Testar'], ['chaves', 'Chaves de API'], ['uso', 'Uso']];
  const corpo = h('div');
  const botoes = abas.map(([k, rot]) => h('button', { type: 'button', 'data-aba': k, onclick: () => abrir(k) }, rot));
  const abrir = async (k) => {
    botoes.forEach((b) => b.classList.toggle('ativa', b.dataset.aba === k));
    corpo.replaceChildren(h('p', { class: 'muted' }, 'Carregando…'));
    try {
      const render = { config: abaConfig, testar: abaTestar, chaves: abaChaves, uso: abaUso }[k];
      corpo.replaceChildren(await render(p));
    } catch (e) { corpo.replaceChildren(h('p', { class: 'erro' }, e.message)); }
  };
  tela(p.nome, h('a', { class: 'btn peq', href: '#projetos' }, '← Projetos'),
    h('p', { class: 'muted peq', style: 'margin-top:-10px' }, 'ID do projeto: ', h('code', {}, p.id)),
    faixaSemIA(),
    h('div', { class: 'tabs' }, botoes), corpo);
  abrir('config');
}

function abaConfig(p) {
  const nome = h('input', { maxlength: 80, value: p.nome });
  const desc = h('input', { maxlength: 500, value: p.descricao || '' });
  const assistente = h('input', { maxlength: 60, value: p.assistente || '' });
  const instr = h('textarea', { maxlength: 6000, rows: 9, placeholder: 'Ex.: Você é o atendente da Loja X. Seja educado e objetivo. Nossos horários são de 9h às 18h. Se não souber a resposta, peça para o cliente chamar no WhatsApp (11) 99999-9999.' });
  instr.value = p.instrucoes || '';

  // Ordem das IAs: só as conectadas; as marcadas são usadas na ordem mostrada
  const conectadas = IAS.filter((i) => i.conectada);
  let ordem = [...p.provedores.filter((x) => conectadas.some((c) => c.id === x)), ...conectadas.map((c) => c.id).filter((x) => !p.provedores.includes(x))];
  const marcadas = new Set(p.provedores.length ? p.provedores : conectadas.map((c) => c.id));
  const caixaOrdem = h('div');
  const desenharOrdem = () => caixaOrdem.replaceChildren(...(ordem.length ? ordem.map((id, i) => {
    const ia = IAS.find((x) => x.id === id);
    const chk = h('input', { type: 'checkbox', 'aria-label': 'Usar ' + ia.nome });
    chk.checked = marcadas.has(id);
    chk.addEventListener('change', () => { chk.checked ? marcadas.add(id) : marcadas.delete(id); });
    const mover = (d) => { const j = i + d; if (j < 0 || j >= ordem.length) return; [ordem[i], ordem[j]] = [ordem[j], ordem[i]]; desenharOrdem(); };
    return h('div', { class: 'ordem-ia' }, chk, h('span', { class: 'nome' }, `${i + 1}. ${ia.nome}`),
      h('button', { type: 'button', class: 'btn peq', onclick: () => mover(-1), 'aria-label': 'Subir' }, '↑'),
      h('button', { type: 'button', class: 'btn peq', onclick: () => mover(1), 'aria-label': 'Descer' }, '↓'));
  }) : [h('p', { class: 'muted peq' }, 'Nenhuma IA conectada ainda. ', h('a', { href: '#ias' }, 'Conectar uma IA'))]));
  desenharOrdem();

  const salvar = h('button', { class: 'btn prim', type: 'submit' }, 'Salvar alterações');
  const excluir = h('button', { class: 'btn perigo', type: 'button' }, 'Excluir projeto');
  const form = h('form', {},
    ajuda('Como configurar o seu assistente (para iniciantes)',
      h('ul', {},
        h('li', {}, h('strong', {}, 'Nome do assistente: '), 'como ele se apresenta (ex.: "Luna, atendente da Loja X").'),
        h('li', {}, h('strong', {}, 'Instruções: '), 'escreva como se estivesse explicando o trabalho para um funcionário novo: o jeito de falar, o que ele pode e não pode dizer, preços, horários, políticas de troca.'),
        h('li', {}, h('strong', {}, 'Ordem das IAs: '), 'a primeira marcada responde. Se ela falhar ou acabar o limite grátis, a próxima assume sozinha.')),
      h('p', {}, 'Dica: depois de salvar, vá na aba "Testar" e faça as perguntas que seus clientes fariam.')),
    h('div', { class: 'cartao' },
      h('div', { class: 'linha' },
        h('div', { class: 'cresce' }, campo('Nome do projeto', null, nome)),
        h('div', { class: 'cresce' }, campo('Nome do assistente', 'Como ele se apresenta', assistente))),
      campo('Descrição', 'Só para você', desc),
      campo('Instruções (personalidade e conhecimento)', 'Quanto mais detalhe, melhores as respostas', instr),
      h('label', {}, 'Ordem das IAs', h('span', { class: 'dica' }, 'Marque quais usar e ordene com as setas')),
      caixaOrdem,
      h('div', { class: 'linha', style: 'margin-top:18px' }, salvar, h('span', { style: 'flex:1' }), excluir)));
  form.addEventListener('submit', (ev) => {
    ev.preventDefault();
    comBotao(salvar, async () => {
      const novo = await api('/api/projetos/' + p.id, { method: 'PUT', body: {
        nome: nome.value, descricao: desc.value, assistente: assistente.value, instrucoes: instr.value,
        provedores: ordem.filter((x) => marcadas.has(x)),
      } });
      Object.assign(p, novo);
      document.querySelector('.cabecalho h1').textContent = novo.nome;
      aviso('Salvo!', 'ok');
    });
  });
  excluir.addEventListener('click', () => {
    if (!confirm(`Excluir o projeto "${p.nome}"? As chaves de API dele param de funcionar. Não dá para desfazer.`)) return;
    comBotao(excluir, async () => {
      await api('/api/projetos/' + p.id, { method: 'DELETE' });
      aviso('Projeto excluído.', 'ok');
      location.hash = 'projetos';
    });
  });
  return form;
}

function abaTestar(p) {
  const historico = [];
  const msgs = h('div', { class: 'msgs', 'aria-live': 'polite' },
    h('p', { class: 'muted peq', style: 'text-align:center' }, `Converse com "${p.assistente}". Isso conta no seu limite diário.`));
  const entrada = h('input', { placeholder: 'Escreva uma mensagem…', maxlength: 8000, autocomplete: 'off' });
  const enviar = h('button', { class: 'btn prim', type: 'submit' }, 'Enviar');
  const limpar = h('button', { class: 'btn', type: 'button' }, 'Limpar');
  const form = h('form', {}, entrada, enviar, limpar);
  const add = (cls, txt, via) => { const el = h('div', { class: 'msg ' + cls }, txt, via ? h('span', { class: 'via' }, via) : null); msgs.append(el); msgs.scrollTop = msgs.scrollHeight; return el; };
  limpar.addEventListener('click', () => { historico.length = 0; msgs.replaceChildren(); entrada.focus(); });
  form.addEventListener('submit', (ev) => {
    ev.preventDefault();
    const t = entrada.value.trim();
    if (!t) return;
    entrada.value = '';
    historico.push({ role: 'user', content: t });
    add('user', t);
    const pensando = add('assistant', 'Pensando…');
    comBotao(enviar, async () => {
      try {
        const r = await api('/api/projetos/' + p.id + '/testar', { method: 'POST', body: { mensagens: historico.slice(-20) } });
        pensando.remove();
        historico.push({ role: 'assistant', content: r.resposta });
        const falhou = r.tentativas_falhas?.length ? ` (antes tentou: ${r.tentativas_falhas.map((f) => f.ia).join(', ')})` : '';
        add('assistant', r.resposta, `via ${r.ia_nome} · ${r.modelo}${falhou}`);
      } catch (e) {
        pensando.remove();
        historico.pop();
        add('erro-msg', e.message);
      }
      entrada.focus();
    });
  });
  setTimeout(() => entrada.focus(), 50);
  return h('div', {},
    ajuda('Para que serve o teste?',
      h('p', {}, 'Aqui você conversa com o assistente exatamente como seus clientes vão conversar pelo site ou bot. Se a resposta não ficar boa, volte em "Configurar", melhore as instruções e teste de novo.')),
    h('div', { class: 'cartao chat' }, msgs, form));
}

async function abaChaves(p) {
  const lista = await api('/api/projetos/' + p.id + '/chaves');
  const caixa = h('div');
  const nome = h('input', { maxlength: 60, placeholder: 'Ex.: Site da loja' });
  const criar = h('button', { class: 'btn prim', type: 'submit' }, 'Gerar nova chave');
  const novaArea = h('div');
  const form = h('form', { class: 'linha', style: 'margin-bottom:18px' }, h('div', { class: 'cresce' }, nome), criar);
  form.addEventListener('submit', (ev) => {
    ev.preventDefault();
    comBotao(criar, async () => {
      const r = await api('/api/projetos/' + p.id + '/chaves', { method: 'POST', body: { nome: nome.value } });
      nome.value = '';
      const valor = h('div', { class: 'chave-nova', id: 'chave-nova' }, r.chave);
      novaArea.replaceChildren(h('div', { class: 'faixa sucesso' },
        h('p', {}, h('strong', {}, 'Sua chave foi criada. Copie e guarde agora: '), 'por segurança ela não aparece de novo.'),
        valor,
        h('div', { class: 'linha', style: 'margin-top:10px' }, h('button', { class: 'btn peq', type: 'button', onclick: () => copiar(r.chave) }, 'Copiar chave'))));
      caixa.replaceChildren(tabela(await api('/api/projetos/' + p.id + '/chaves')));
    });
  });
  const tabela = (itens) => itens.length ? h('table', { class: 'tabela' },
    h('thead', {}, h('tr', {}, h('th', {}, 'Nome'), h('th', {}, 'Chave'), h('th', {}, 'Criada'), h('th', {}, 'Último uso'), h('th', {}, ''))),
    h('tbody', {}, itens.map((c) => {
      const rev = h('button', { class: 'btn peq perigo', type: 'button' }, 'Revogar');
      rev.addEventListener('click', () => {
        if (!confirm(`Revogar a chave "${c.nome}"? Tudo que usa essa chave para de funcionar na hora.`)) return;
        comBotao(rev, async () => { await api(`/api/projetos/${p.id}/chaves/${c.id}`, { method: 'DELETE' }); caixa.replaceChildren(tabela(await api('/api/projetos/' + p.id + '/chaves'))); aviso('Chave revogada.', 'ok'); });
      });
      return h('tr', {}, h('td', {}, c.nome), h('td', {}, h('code', {}, c.prefixo)), h('td', {}, fmtData(c.criado_em)), h('td', {}, fmtData(c.ultimo_uso)),
        h('td', {}, c.revogada ? h('span', { class: 'selo breve' }, 'Revogada') : rev));
    }))) : h('p', { class: 'muted' }, 'Nenhuma chave ainda.');
  caixa.replaceChildren(tabela(lista));
  return h('div', {},
    ajuda('O que é uma chave de API? (para iniciantes)',
      h('p', {}, 'É como uma senha que deixa outro programa (o seu site, um bot do Discord, uma automação) conversar com este assistente.'),
      h('ol', {},
        h('li', {}, 'Dê um nome para lembrar onde vai usar (ex.: "Site da loja") e clique em "Gerar nova chave".'),
        h('li', {}, 'Copie a chave na hora: ela só aparece uma vez.'),
        h('li', {}, 'Entregue a chave para quem vai programar a integração, junto com o link da ', h('a', { href: '/docs', target: '_blank', rel: 'noopener' }, 'Documentação da API'), '.'),
        h('li', {}, 'Se a chave vazar, clique em "Revogar" e gere outra.')),
      h('p', {}, h('strong', {}, 'Importante: '), 'nunca coloque a chave em código que roda no navegador do cliente (ela ficaria visível). Use sempre no servidor.')),
    form, novaArea, h('div', { class: 'cartao' }, caixa));
}

async function abaUso(p) {
  const u = await api('/api/projetos/' + p.id + '/uso');
  const pct = Math.min(100, Math.round((u.uso_hoje_conta / u.limite) * 100));
  return h('div', {},
    ajuda('Como funciona o limite?',
      h('p', {}, `Cada mensagem respondida conta 1 pedido. Seu plano (${u.plano}) permite ${u.limite} pedidos por dia somando todos os projetos. O contador zera à meia-noite (horário de Brasília).`)),
    h('div', { class: 'cartao', style: 'margin-bottom:18px' },
      h('h3', {}, `Hoje: ${u.uso_hoje_conta} de ${u.limite} pedidos (${pct}%)`),
      h('div', { style: 'height:10px;background:#0b0916;border-radius:99px;overflow:hidden;border:1px solid var(--borda)' },
        h('div', { style: `height:100%;width:${pct}%;background:linear-gradient(90deg,var(--roxo),var(--ciano))` }))),
    h('div', { class: 'cartao' }, h('h3', {}, 'Últimos 30 dias deste projeto'),
      u.dias.length ? h('table', { class: 'tabela' }, h('thead', {}, h('tr', {}, h('th', {}, 'Dia'), h('th', {}, 'Pedidos'))),
        h('tbody', {}, u.dias.map((d) => h('tr', {}, h('td', {}, d.dia.split('-').reverse().join('/')), h('td', {}, d.requisicoes)))))
        : h('p', { class: 'muted' }, 'Ainda sem uso.')));
}

// ---------------- Minhas IAs ----------------
async function verIAs() {
  const itens = IAS.map((ia) => {
    const chave = h('input', { type: 'password', autocomplete: 'off', placeholder: ia.conectada ? `Conectada (${ia.final_chave}) — cole outra para trocar` : 'Cole a chave aqui' });
    const modelo = h('input', { placeholder: `Padrão: ${ia.modelo_padrao}`, value: ia.modelo || '' });
    const salvar = h('button', { class: 'btn prim peq', type: 'button' }, ia.conectada ? 'Salvar' : 'Conectar');
    const testar = h('button', { class: 'btn peq', type: 'button', disabled: !ia.conectada }, 'Testar');
    const remover = h('button', { class: 'btn peq perigo', type: 'button', disabled: !ia.conectada }, 'Desconectar');
    const status = h('span', { class: 'peq muted' });
    salvar.addEventListener('click', () => comBotao(salvar, async () => {
      await api('/api/conta/ias/' + ia.id, { method: 'PUT', body: { chave: chave.value, modelo: modelo.value } });
      aviso(`${ia.nome} salvo! Testando…`, 'ok');
      const t = await api('/api/conta/ias/' + ia.id + '/testar', { method: 'POST' });
      aviso(t.ok ? `${ia.nome}: ${t.msg}` : `${ia.nome} salvo, mas o teste falhou: ${t.msg}`, t.ok ? 'ok' : 'erro');
      rota();
    }));
    testar.addEventListener('click', () => comBotao(testar, async () => {
      status.textContent = 'Testando…';
      const t = await api('/api/conta/ias/' + ia.id + '/testar', { method: 'POST' });
      status.textContent = (t.ok ? '✓ ' : '✗ ') + t.msg;
      status.style.color = t.ok ? 'var(--verde)' : 'var(--vermelho)';
    }));
    remover.addEventListener('click', () => {
      if (!confirm(`Desconectar ${ia.nome}?`)) return;
      comBotao(remover, async () => { await api('/api/conta/ias/' + ia.id, { method: 'DELETE' }); aviso('Desconectada.', 'ok'); rota(); });
    });
    return h('div', { class: 'cartao ia-item' },
      h('div', { class: 'topo-ia' }, h('h3', { style: 'margin:0' }, ia.nome),
        h('span', { class: 'selo ' + (ia.gratis ? 'gratis' : 'pago') }, ia.gratis ? 'Tem plano grátis' : 'Pago'),
        ia.conectada ? h('span', { class: 'selo ok' }, 'Conectada') : null,
        h('a', { href: ia.site, target: '_blank', rel: 'noopener noreferrer', class: 'peq', style: 'margin-left:auto' }, 'Pegar a chave →')),
      h('div', { class: 'linha' }, h('div', { class: 'cresce' }, chave), h('div', { style: 'width:220px' }, modelo)),
      h('div', { class: 'linha' }, salvar, testar, remover, status));
  });
  tela('Minhas IAs', null,
    ajuda('Como conectar uma IA grátis (passo a passo para iniciantes)',
      h('p', {}, 'O assistente usa uma "IA" (como o ChatGPT) para pensar. Você conecta a sua própria conta da IA colando uma chave. Recomendamos começar pelo Gemini, que é grátis:'),
      h('ol', {},
        h('li', {}, 'Clique em "Pegar a chave →" no cartão do Gemini (abre o site do Google).'),
        h('li', {}, 'Entre com a sua conta Google.'),
        h('li', {}, 'Clique em "Create API key" (Criar chave de API) e depois em copiar.'),
        h('li', {}, 'Volte aqui, cole a chave no campo do Gemini e clique em "Conectar".'),
        h('li', {}, 'Pronto! Aparece "Funcionando". Se quiser mais garantia, conecte também o Groq e o OpenRouter (também grátis).')),
      h('p', {}, h('strong', {}, 'Segurança: '), 'suas chaves ficam guardadas criptografadas e nunca aparecem inteiras de novo. O campo "modelo" é opcional: deixe em branco para usar o padrão.')),
    h('div', { style: 'display:grid;gap:14px' }, itens));
}

// ---------------- Conta ----------------
async function verConta() {
  const r = await api('/api/conta/eu');
  const atual = h('input', { type: 'password', autocomplete: 'current-password' });
  const nova = h('input', { type: 'password', autocomplete: 'new-password', minlength: 8 });
  const btn = h('button', { class: 'btn prim', type: 'submit' }, 'Trocar senha');
  const form = h('form', { class: 'cartao' }, h('h3', {}, 'Trocar senha'), campo('Senha atual', null, atual), campo('Nova senha', 'Pelo menos 8 caracteres', nova), btn);
  form.addEventListener('submit', (ev) => {
    ev.preventDefault();
    comBotao(btn, async () => { await api('/api/conta/senha', { method: 'POST', body: { atual: atual.value, nova: nova.value } }); atual.value = nova.value = ''; aviso('Senha trocada! As outras sessões foram desconectadas.', 'ok'); });
  });
  tela('Minha conta', null,
    h('div', { class: 'cartao', style: 'margin-bottom:18px' },
      h('p', {}, h('strong', {}, 'Nome: '), r.usuario.nome),
      h('p', {}, h('strong', {}, 'E-mail: '), r.usuario.email),
      h('p', {}, h('strong', {}, 'Plano: '), PLANO ? (NOME_PLANO[PLANO.plano] || PLANO.plano) : 'Free', ` · ${r.uso_hoje}/${r.limite} pedidos hoje`),
      h('p', { class: 'muted peq', style: 'margin:0' }, 'Cliente desde ', fmtData(r.usuario.criado_em), '. ', h('a', { href: 'jarvis/conta.html' }, 'Licenças e modo de uso'), ' · ', h('a', { href: 'jarvis/#planos' }, 'Ver planos'), '.')),
    form);
}

document.addEventListener('DOMContentLoaded', iniciar);
