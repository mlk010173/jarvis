'use strict';
// Primeiros passos depois de criar a conta (a mesma configuração inicial do app): um passo de cada vez, e no fim está tudo configurado.
// Boas-vindas → você → personalidade → voz → gostos (cidade, notícias, briefing) → objetivos → instalar o app → conectar o app
// → chave de IA → privacidade → plano → pronto. Cada resposta é gravada na conta ao avançar: vale no ORION Web e o app puxa ao entrar com a conta.
// ?volta= leva de volta para onde a pessoa estava (ex.: o ORION Web) no fim.
// O ORION tem um modo só (híbrido: site + app juntos). O progresso fica neste navegador (dá para sair e voltar).
(() => {
  const $ = (s) => document.querySelector(s);
  const el = (tag, attrs = {}, ...filhos) => { const e = document.createElement(tag); for (const [k, v] of Object.entries(attrs)) { if (v == null || v === false) continue; if (k === 'class') e.className = v; else if (k === 'text') e.textContent = v; else if (k.startsWith('on')) e.addEventListener(k.slice(2), v); else e.setAttribute(k, v === true ? '' : v); } for (const f of filhos.flat()) if (f != null && f !== false) e.append(f instanceof Node ? f : document.createTextNode(String(f))); return e; };
  const NS = 'http://www.w3.org/2000/svg';
  const ic = (d) => { const s = document.createElementNS(NS, 'svg'); s.setAttribute('viewBox', '0 0 24 24'); s.setAttribute('aria-hidden', 'true'); s.innerHTML = d; return s; };
  const I = {
    hibrido: '<path d="M7 7h10a4 4 0 0 1 0 8H9M7 7l3-3M7 7l3 3M17 17H7a4 4 0 0 1 0-8"/>',
    desktop: '<rect x="3" y="5" width="18" height="14" rx="2"/><path d="M3 9h18M7 7h.01M10 7h.01"/>',
    motor: '<rect x="3" y="4" width="18" height="12" rx="2"/><path d="M8 20h8M12 16v4"/><circle cx="12" cy="10" r="1.6"/>',
    web: '<circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3c3 3 3 15 0 18M12 3c-3 3-3 15 0 18"/>',
    baixar: '<path d="M12 3v12M7 10l5 5 5-5M5 21h14"/>', ok: '<path d="m5 12 5 5 9-10"/>', cadeado: '<rect x="4" y="11" width="16" height="10" rx="2"/><path d="M8 11V8a4 4 0 0 1 8 0v3"/>',
    chave: '<circle cx="8" cy="15" r="4"/><path d="m11 12 9-9M17 6l2 2M15 8l2 2"/>', som: '<path d="M11 5 6 9H3v6h3l5 4zM15.5 8.5a5 5 0 0 1 0 7M18.5 5.5a9 9 0 0 1 0 13"/>', estrela: '<path d="m12 3 2.7 5.6 6.1.9-4.4 4.3 1 6.1L12 17l-5.4 2.9 1-6.1-4.4-4.3 6.1-.9z"/>',
  };
  async function api(url, metodo = 'GET', corpo) {
    const r = await fetch(url, { method: metodo, headers: corpo ? { 'Content-Type': 'application/json' } : {}, body: corpo ? JSON.stringify(corpo) : undefined, credentials: 'same-origin' });
    const j = await r.json().catch(() => ({}));
    if (r.status === 401 && !url.includes('/ponte/')) { location.href = '../entrar?volta=' + encodeURIComponent('comecar.html' + location.search); throw new Error('login'); }
    if (!r.ok) throw Object.assign(new Error(j.erro || 'Erro ' + r.status), { status: r.status, dados: j });
    return j;
  }
  const VOLTA = (() => { const v = new URLSearchParams(location.search).get('volta') || ''; return /^\/orion\/(?!comecar)[\w\-\/.]*(\?[\w\-=&.%]*)?$/.test(v) ? v : ''; })(); // só páginas do ORION
  const VOZES = [['antonio', 'Antonio', 'Masculina, grave e calma'], ['francisca', 'Francisca', 'Feminina, clara e firme'], ['thalita', 'Thalita', 'Feminina, jovem e leve']];
  const CHAVE = 'orion.comecar.v2';
  const ler = () => { try { return JSON.parse(localStorage.getItem(CHAVE) || '{}'); } catch { return {}; } };
  const gravar = () => { try { localStorage.setItem(CHAVE, JSON.stringify({ passo: atual, feito: st.feito })); } catch { /* sem armazenamento */ } };

  const st = { pref: { dados: {} }, rascunho: {}, modosFala: [], objetivos: [], assuntos: [], eu: null, plano: null, planos: [], ias: [], download: null, app: null, feito: ler().feito || {} };
  // um modo só (híbrido): sempre site + app
  const usaApp = () => true;
  const usaWeb = () => true;
  const primeiroNome = () => String(st.eu?.nome || '').trim().split(/\s+/)[0] || 'você';
  const tratamento = () => String((st.pref.dados || {}).tratamento || '').trim() || primeiroNome();
  // chave liga/desliga com explicação (igual à configuração inicial do app)
  const chave = (rot, valor, aoMudar, desc) => { const c = el('input', { type: 'checkbox', checked: !!valor }); c.addEventListener('change', () => aoMudar(c.checked)); return el('label', { class: 'cm-chave' }, c, el('i'), el('span', {}, el('b', { text: rot }), desc ? el('small', { text: desc }) : null)); };
  // amostra da voz pelo próprio navegador (procura a voz Microsoft com o mesmo nome; sem ela, a voz em português que houver)
  function ouvir(id, texto) {
    try {
      if (!('speechSynthesis' in window)) return;
      const vs = speechSynthesis.getVoices().filter((v) => /^pt/i.test(v.lang));
      const u = new SpeechSynthesisUtterance(texto); u.lang = 'pt-BR';
      u.voice = vs.find((v) => new RegExp('microsoft.*' + id, 'i').test(v.name)) || vs.find((v) => v.lang === 'pt-BR') || vs[0] || null;
      speechSynthesis.cancel(); speechSynthesis.speak(u);
    } catch { /* sem voz neste navegador */ }
  }

  const titulo = (t, sub) => [el('h1', { id: 'cmTitulo', text: t }), sub ? el('p', { class: 'cm-sub', text: sub }) : null];

  // ---------- passos ----------
  const PASSOS = [
    { id: 'boas', nome: 'Boas-vindas', montar() {
      const tela = el('canvas', { 'aria-hidden': 'true' });
      setTimeout(() => { if (window.Orb) { const o = new window.Orb(tela); o.setModo('anel'); o.setColor('#2E9BFF'); o.setState('speaking'); let t = 0; const r = () => { t += .016; o.setLevel(.12 + .1 * Math.sin(t * 1.3)); if (tela.isConnected) requestAnimationFrame(r); }; r(); } }, 30);
      return [el('div', { class: 'cm-boas' }, el('div', { class: 'cm-boas-anel' }, tela), el('div', {},
        ...titulo(`Olá, ${primeiroNome()}. Sua conta está pronta.`, 'Agora eu te guio na configuração, um passo de cada vez. No fim, o ORION fica funcionando do jeito que você escolher.'),
        el('ol', { class: 'cm-lista' },
          el('li', { text: 'Contar como você quer ser chamado, o jeito e a voz do ORION' }),
          el('li', { text: 'Sua cidade, os assuntos das notícias e o que você quer fazer com ele' }),
          el('li', { text: 'Escolher como usar, instalar o app (se for no PC) e ligar uma IA grátis' }))))];
    } },
    { id: 'voce', nome: 'Você', montar() {
      const d = st.pref.dados || {};
      const trat = el('input', { type: 'text', maxlength: 40, placeholder: 'Ex.: ' + primeiroNome(), value: d.tratamento || '', autocomplete: 'off' });
      trat.addEventListener('input', () => { st.rascunho.tratamento = trat.value; });
      st.rascunho.tratamento = trat.value;
      const opcoes = [primeiroNome(), 'Chefe', 'Chefia', 'Senhor', 'Senhora', 'Patrão'].filter((x, i, a) => x && x !== 'você' && a.indexOf(x) === i);
      const chips = el('div', { class: 'cm-chips' }, opcoes.map((c) => el('button', { type: 'button', class: 'cm-chip', onclick: () => { trat.value = c; st.rascunho.tratamento = c; trat.focus(); } }, c)));
      return [...titulo(`Prazer, ${primeiroNome()}. Como devo te chamar?`, 'É assim que o ORION vai falar com você, no site e no app.'), el('label', { class: 'cm-campo' }, 'Como devo te chamar?', trat), chips];
    }, async salvar() { const n = primeiroNome(); await salvarPref({ tratamento: (st.rascunho.tratamento || '').trim() || (n !== 'você' ? n : '') }); } },
    { id: 'jeito', nome: 'Personalidade', montar() {
      const grade = el('div', { class: 'cm-jeitos', role: 'radiogroup', 'aria-label': 'Personalidade do ORION' });
      const escolhido = () => (st.pref.dados || {}).personalidade || 'equilibrado';
      const desenhar = () => grade.replaceChildren(...st.modosFala.map((m) => el('button', { type: 'button', role: 'radio', 'aria-checked': String(escolhido() === m.id), class: 'cm-jeito' + (escolhido() === m.id ? ' on' : ''),
        onclick: async () => { st.pref.dados = { ...(st.pref.dados || {}), personalidade: m.id }; desenhar(); try { await salvarPref({ personalidade: m.id }); } catch { /* tenta de novo no próximo passo */ } } },
        el('b', { text: m.nome }), el('span', { text: m.resumo }), el('q', { text: m.exemplo }))));
      desenhar();
      return [...titulo('Qual é o jeito do ORION?', 'Muda só o tom das respostas (sério, divertido, zueiro...), nunca a qualidade. Dá para trocar quando quiser.'), grade];
    }, async salvar() { if (!(st.pref.dados || {}).personalidade) await salvarPref({ personalidade: 'equilibrado' }); } },
    { id: 'voz', nome: 'Voz', montar() {
      const d = st.pref.dados || {};
      st.rascunho.voz = d.voz || st.rascunho.voz || 'antonio';
      ['falar', 'ouvir_orion', 'continua'].forEach((k) => { if (st.rascunho[k] === undefined) st.rascunho[k] = typeof d[k] === 'boolean' ? d[k] : k !== 'continua'; });
      const grade = el('div', { class: 'cm-jeitos', role: 'radiogroup', 'aria-label': 'Voz do ORION' });
      const desenhar = () => grade.replaceChildren(...VOZES.map(([id, nome, desc]) => el('button', { type: 'button', role: 'radio', 'aria-checked': String(st.rascunho.voz === id), class: 'cm-jeito' + (st.rascunho.voz === id ? ' on' : ''),
        onclick: () => { st.rascunho.voz = id; desenhar(); ouvir(id, `Olá, ${tratamento()}. Esta é a minha voz.`); } },
        el('b', { text: nome }), el('span', { text: desc }), el('small', { class: 'cm-ouvir' }, ic(I.som), 'Ouvir'))));
      desenhar();
      return [...titulo('Como eu falo e ouço', 'Clique numa voz para ouvir. No app do PC a voz é exatamente esta; no navegador eu uso a mais parecida que ele tiver.'), grade,
        el('div', { class: 'cm-chaves' },
          chave('Falar as respostas em voz alta', st.rascunho.falar, (v) => { st.rascunho.falar = v; }),
          chave('Responder quando você disser "ORION"', st.rascunho.ouvir_orion, (v) => { st.rascunho.ouvir_orion = v; }, 'No app do PC o microfone fica esperando a palavra ORION. O microfone só é pedido na primeira vez que você falar comigo.'),
          chave('Conversa contínua', st.rascunho.continua, (v) => { st.rascunho.continua = v; }, 'Depois de responder, eu volto a ouvir sem você clicar.'))];
    }, async salvar() { await salvarPref({ voz: st.rascunho.voz, falar: !!st.rascunho.falar, ouvir_orion: !!st.rascunho.ouvir_orion, continua: !!st.rascunho.continua }); } },
    { id: 'gostos', nome: 'Seus gostos', montar() {
      const d = st.pref.dados || {};
      if (st.rascunho.cidade === undefined) st.rascunho.cidade = d.cidade || '';
      if (!st.rascunho.interesses) st.rascunho.interesses = [...(d.interesses || [])];
      if (st.rascunho.briefing === undefined) st.rascunho.briefing = d.briefing !== false;
      if (!st.rascunho.briefing_hora) st.rascunho.briefing_hora = d.briefing_hora || '18:00';
      const cidade = el('input', { type: 'text', maxlength: 80, placeholder: 'Ex.: Santos - SP', value: st.rascunho.cidade, autocomplete: 'off' });
      cidade.addEventListener('input', () => { st.rascunho.cidade = cidade.value; });
      const clima = el('p', { class: 'cm-msg', 'aria-live': 'polite' });
      const testar = el('button', { type: 'button', class: 'cm-btn cm-sec', onclick: async () => {
        if (!cidade.value.trim()) { clima.textContent = 'Escreva a sua cidade.'; return; }
        clima.textContent = 'Conferindo…';
        try { const c = await api('/api/web/clima?cidade=' + encodeURIComponent(cidade.value.trim())); clima.textContent = c.configurado ? `${c.cidade}${c.regiao ? ', ' + c.regiao : ''}: ${Math.round(c.temperatura)}°, ${String(c.descricao || '').toLowerCase()}` : (c.mensagem || 'Não achei essa cidade.'); }
        catch (e) { clima.textContent = e.message; }
      } }, 'Testar');
      const chips = el('div', { class: 'cm-chips' }, st.assuntos.map((a) => {
        const b = el('button', { type: 'button', class: 'cm-chip' + (st.rascunho.interesses.includes(a) ? ' on' : ''), 'aria-pressed': String(st.rascunho.interesses.includes(a)),
          onclick: () => { const i = st.rascunho.interesses.indexOf(a); if (i >= 0) st.rascunho.interesses.splice(i, 1); else st.rascunho.interesses.push(a); b.classList.toggle('on', i < 0); b.setAttribute('aria-pressed', String(i < 0)); } }, a);
        return b;
      }));
      const hora = el('input', { type: 'time', value: st.rascunho.briefing_hora, class: 'cm-hora' });
      hora.addEventListener('change', () => { st.rascunho.briefing_hora = hora.value || '18:00'; });
      return [...titulo('Do que você gosta?', 'Eu uso isso no clima e no briefing de notícias, no site e no app.'),
        el('label', { class: 'cm-campo' }, 'Sua cidade (para o clima)', el('div', { class: 'cm-lin' }, cidade, testar)), clima,
        el('div', { class: 'cm-campo' }, el('span', { text: 'Assuntos que mais te interessam nas notícias' }), chips),
        el('div', { class: 'cm-chaves' }, chave('Briefing de notícias', st.rascunho.briefing, (v) => { st.rascunho.briefing = v; }, 'No primeiro acesso do dia eu ofereço as principais manchetes, em cartões, narradas.')),
        el('label', { class: 'cm-campo' }, 'Oferecer de novo a partir de', hora)];
    }, async salvar() { await salvarPref({ cidade: (st.rascunho.cidade || '').trim(), interesses: st.rascunho.interesses || [], briefing: !!st.rascunho.briefing, briefing_hora: st.rascunho.briefing_hora || '18:00' }); } },
    { id: 'objetivos', nome: 'Seus objetivos', montar() {
      const d = st.pref.dados || {};
      st.rascunho.objetivos = [...(d.objetivos || [])];
      const chips = el('div', { class: 'cm-chips' }, st.objetivos.map((o) => {
        const b = el('button', { type: 'button', class: 'cm-chip' + (st.rascunho.objetivos.includes(o) ? ' on' : ''), 'aria-pressed': String(st.rascunho.objetivos.includes(o)),
          onclick: () => { const i = st.rascunho.objetivos.indexOf(o); if (i >= 0) st.rascunho.objetivos.splice(i, 1); else st.rascunho.objetivos.push(o); b.classList.toggle('on', i < 0); b.setAttribute('aria-pressed', String(i < 0)); } }, o);
        return b;
      }));
      const sobre = el('textarea', { rows: 4, maxlength: 1500, placeholder: 'Ex.: Tenho uma loja de roupas no Instagram e quero criar vídeos e responder clientes mais rápido.' });
      sobre.value = d.sobre || ''; st.rascunho.sobre = sobre.value;
      sobre.addEventListener('input', () => { st.rascunho.sobre = sobre.value; });
      return [...titulo('O que você quer fazer com o ORION?', 'Marque quantos quiser. Assim ele já começa sabendo como te ajudar.'), chips,
        el('label', { class: 'cm-campo' }, 'Conte um pouco sobre você ou o seu negócio (opcional)', sobre),
        el('p', { class: 'cm-nota' }, ic(I.cadeado), 'Isso vira a Memória do ORION da sua conta (Minha conta → Memória do ORION). Não coloque senhas nem chaves aqui.')];
    }, async salvar() { await salvarPref({ objetivos: st.rascunho.objetivos || [], sobre: st.rascunho.sobre || '' }); } },
    { id: 'instalar', nome: 'Instalar o app', condicao: usaApp, montar() {
      const d = st.download;
      const marcar = el('input', { type: 'checkbox', checked: !!st.feito.instalado });
      marcar.addEventListener('change', () => { st.feito.instalado = marcar.checked; gravar(); desenharTrilho(); });
      return [...titulo('Instale o ORION no seu PC', 'Windows 10 ou 11. O instalador é pequeno e não pede senha de administrador.'),
        el('div', { class: 'cm-baixar' },
          el('span', { class: 'cm-baixar-ic' }, ic(I.baixar)),
          el('div', {}, el('b', { text: 'ORION para Windows' }), el('small', { text: d?.disponivel ? `versão ${d.versao} · ${Math.round(d.bytes / 1048576)} MB` : d ? 'em breve' : 'carregando…' })),
          d?.disponivel ? el('a', { class: 'cm-btn cm-pri', href: '/api/download/instalador', download: '', onclick: () => { st.feito.baixou = true; gravar(); } }, 'Baixar o instalador') : el('span', { class: 'cm-nota', text: 'O instalador ainda não foi publicado.' })),
        el('ol', { class: 'cm-passos' },
          el('li', {}, el('b', { text: 'Abra o ORION-Setup' }), ' que acabou de baixar. Se o Windows mostrar "O Windows protegeu o computador", clique em ', el('b', { text: 'Mais informações → Executar assim mesmo' }), '.'),
          el('li', {}, el('b', { text: 'Siga o instalador' }), ': ele cria o atalho ORION na área de trabalho e no Menu Iniciar.'),
          el('li', {}, 'O ORION abre sozinho com a ', el('b', { text: 'configuração inicial' }), ' (nome, personalidade, voz e câmera). No passo "Sua conta", entre com este mesmo e-mail.')),
        el('label', { class: 'cm-check' }, marcar, el('i'), el('span', { text: 'Já instalei o ORION' }))];
    } },
    { id: 'conectar', nome: 'Conectar o app', condicao: usaApp, montar() {
      const estado = el('div', { class: 'cm-radar' + (st.app ? ' achou' : '') });
      const desenhar = () => estado.replaceChildren(
        el('span', { class: 'cm-radar-ondas', 'aria-hidden': 'true' }, el('i'), el('i'), el('i'), el('b', {}, ic(st.app ? I.ok : I.desktop))),
        st.app ? el('div', {}, el('b', { text: 'ORION conectado à sua conta' }), el('small', { text: `${st.app.nome || 'Seu PC'} · versão ${st.app.versao || '?'}` }))
          : el('div', {}, el('b', { text: 'Procurando o ORION ligado na sua conta…' }), el('small', { text: 'Assim que você entrar no app, ele aparece aqui sozinho.' })));
      desenhar();
      const sonda = async () => {
        if (!estado.isConnected) return;
        try { const r = await api('/api/ponte/apps'); const a = (r.apps || [])[0]; if (a) { st.app = a; st.feito.conectado = true; gravar(); estado.classList.add('achou'); desenhar(); atualizarRodape(); desenharTrilho(); return; } } catch { /* tenta de novo */ }
        setTimeout(sonda, 3000);
      };
      if (!st.app) setTimeout(sonda, 600);
      return [...titulo('Conecte o app à sua conta', 'Com o app ligado na sua conta, o site enxerga o seu PC sem código e sem depender do navegador.'),
        estado,
        el('ol', { class: 'cm-passos' },
          el('li', {}, 'No ORION, na configuração inicial (passo ', el('b', { text: 'Sua conta' }), ') ou em ', el('b', { text: 'Configurações → Conta e site' }), ', entre com ', el('b', { text: st.eu?.email || 'o seu e-mail' }), '.'),
          el('li', { text: 'Criou a conta com o Google? No app, use "Entrar pelo navegador" e aprove aqui no site.' }),
          el('li', { text: 'Pronto: o seu plano vale no app na hora, sem chave para digitar.' }))];
    } },
    { id: 'ia', nome: 'IA grátis', condicao: usaWeb, montar() {
      const conectadas = st.ias.filter((i) => i.conectada);
      const msg = el('p', { class: 'cm-msg' });
      const sel = el('select', {}, st.ias.filter((i) => !i.conectada).map((i) => el('option', { value: i.id, text: i.nome + (i.gratis ? ' · tem plano grátis' : '') })));
      const chave = el('input', { type: 'password', placeholder: 'Cole a chave aqui', autocomplete: 'off', spellcheck: 'false' });
      // passo a passo da IA escolhida (aberto: é a primeira vez que a pessoa precisa de uma chave)
      const tut = el('div', { class: 'cm-tut' });
      const atualizarLink = () => { tut.replaceChildren(window.ORION_IAS_TUTORIAL ? window.ORION_IAS_TUTORIAL.montar(sel.value, { onde: 'nuvem', aberto: !conectadas.length, nota: false }) : ''); };
      sel.addEventListener('change', atualizarLink); atualizarLink();
      const conectar = el('button', { type: 'button', class: 'cm-btn cm-pri', onclick: async () => {
        if (chave.value.trim().length < 10) { msg.textContent = 'Cole a chave completa.'; return; }
        conectar.disabled = true; msg.textContent = 'Conectando e testando…';
        try {
          await api('/api/conta/ias/' + sel.value, 'PUT', { chave: chave.value.trim() });
          const t = await api(`/api/conta/ias/${sel.value}/testar`, 'POST', {}).catch((e) => ({ ok: false, msg: e.message }));
          st.ias = await api('/api/conta/ias'); st.feito.ia = true; gravar();
          msg.textContent = t.ok ? 'Pronto: a IA respondeu e já está na fila do ORION Web.' : 'Chave salva, mas o teste falhou: ' + (t.msg || 'confira a chave.');
          ir(atual, true);
        } catch (e) { msg.textContent = e.message; conectar.disabled = false; }
      } }, 'Conectar');
      return [...titulo('Ligue uma IA grátis', 'O ORION Web usa as suas próprias chaves de IA. O Gemini tem plano grátis e leva 1 minuto.'),
        conectadas.length ? el('div', { class: 'cm-ok' }, ic(I.ok), el('span', { text: 'Conectada: ' + conectadas.map((i) => i.nome).join(', ') })) : null,
        st.ias.some((i) => !i.conectada) ? el('div', { class: 'cm-ia' },
          el('div', { class: 'cm-ia-form' }, el('label', {}, 'IA', sel), el('label', {}, 'Chave da API', chave), conectar), tut, msg) : null,
        el('p', { class: 'cm-nota' }, ic(I.chave), usaApp() ? 'No app para PC, as chaves ficam no cofre do Windows: o próprio app pede na configuração inicial. Esta aqui vale para o ORION Web.' : 'A chave fica cifrada no servidor e só a sua conta usa.')];
    } },
    { id: 'privacidade', nome: 'Privacidade', montar() {
      const d = st.pref.dados || {};
      if (st.rascunho.coletiva === undefined) st.rascunho.coletiva = d.coletiva !== false;
      const linha = (icone, rot, val) => el('li', { class: 'ok' }, ic(icone), el('span', { text: rot }), el('b', { text: val }));
      return [...titulo('O que fica onde', 'Você decide o que sai daqui. Dá para mudar depois em Minha conta e nas Configurações do app.'),
        el('ul', { class: 'cm-resumo' },
          linha(I.cadeado, 'Chaves das IAs do ORION Web', 'cifradas no servidor, só a sua conta usa'),
          linha(I.cadeado, 'Chaves das IAs do app', 'só no cofre do Windows do seu PC'),
          linha(I.ok, 'Suas preferências', 'na sua conta, valem no site e no app'),
          linha(I.ok, 'Conversas', 'onde você conversa e na IA que responde')),
        el('div', { class: 'cm-chaves' }, chave('Ajudar a melhorar o ORION (anônimo)', st.rascunho.coletiva, (v) => { st.rascunho.coletiva = v; }, 'Uma vez por dia vão só números: quantas vezes cada tela foi aberta e de que tipo foram os pedidos. Nunca o que você escreve ou fala, nem o seu nome ou e-mail.')),
        el('p', { class: 'cm-nota' }, 'Dúvidas? Suporte: assistanceorion.cloud@gmail.com, ou a comunidade no Discord do ORION.')];
    }, async salvar() { await salvarPref({ coletiva: !!st.rascunho.coletiva }); try { localStorage.setItem('orion.web.coletiva', JSON.stringify(!!st.rascunho.coletiva)); } catch { /* sem armazenamento */ } } },
    { id: 'plano', nome: 'Plano', montar() {
      const atualId = st.plano?.plano || 'free';
      const preco = (c) => (c ? 'R$ ' + (c / 100).toFixed(2).replace('.', ',') : 'Grátis');
      const cartoes = st.planos.map((p) => el('div', { class: 'cm-plano' + (p.limites?.recomendado ? ' rec' : '') + (p.id === atualId ? ' atual' : '') },
        p.limites?.recomendado ? el('span', { class: 'cm-rec' }, ic(I.estrela), 'Recomendado') : null,
        el('b', { text: p.nome }), el('small', { text: p.publico || '' }),
        el('div', { class: 'cm-preco' }, el('strong', { text: preco(p.preco_centavos) }), p.preco_centavos ? el('span', { text: '/mês' }) : null),
        p.precos && (p.precos.trimestral || p.precos.vitalicio) ? el('small', { class: 'cm-periodos', text: 'Também no ' + [p.precos.trimestral ? `trimestral (${preco(p.precos.trimestral)})` : '', p.precos.vitalicio ? `vitalício (${preco(p.precos.vitalicio)}, uma vez só)` : ''].filter(Boolean).join(' ou ') + '. Tudo liberado em qualquer período.' }) : null,
        el('ul', {}, (p.destaques || []).filter((x) => !/^✕/.test(x)).slice(0, 4).map((x) => el('li', {}, ic(I.ok), x))),
        p.id === atualId ? el('span', { class: 'cm-btn cm-sec cm-atual' }, 'Seu plano atual') : el('a', { class: 'cm-btn ' + (p.limites?.recomendado ? 'cm-pri' : 'cm-sec'), href: '/orion/checkout?plano=' + encodeURIComponent(p.id) }, p.preco_centavos > (st.planos.find((x) => x.id === atualId)?.preco_centavos || 0) ? 'Assinar o ' + p.nome : 'Mudar para ' + p.nome)));
      return [...titulo('Escolha o seu plano', `Você está no ${st.plano?.plano_nome || 'Free'}. Assinar libera o editor, o mapeamento de leads e mais IAs. Dá para continuar no plano atual.`), el('div', { class: 'cm-planos' }, cartoes)];
    } },
    { id: 'pronto', nome: 'Pronto', montar() {
      st.feito.concluido = true; gravar();
      salvarPref({ concluir: true }).catch(() => {}); // a partir daqui, Minha conta e o ORION Web abrem direto
      const d = st.pref.dados || {};
      const jeito = st.modosFala.find((x) => x.id === d.personalidade);
      const voz = VOZES.find(([id]) => id === d.voz);
      const item = (ok, rot, val) => el('li', { class: ok ? 'ok' : '' }, ic(ok ? I.ok : I.estrela), el('span', { text: rot }), el('b', { text: val }));
      const destino = VOLTA && VOLTA !== 'conta.html' ? VOLTA : null;
      return [...titulo(`Tudo pronto, ${tratamento()}.`, 'Esse é o seu ORION. Tudo isso fica na sua conta e vale no site e no app.'),
        el('ul', { class: 'cm-resumo' },
          item(true, 'Vou te chamar de', tratamento()),
          item(!!jeito, 'Personalidade', jeito ? jeito.nome : 'Equilibrado'),
          item(!!voz, 'Voz', voz ? voz[1] + (d.falar === false ? ' (sem falar as respostas)' : '') : 'Antonio'),
          item(!!d.cidade, 'Cidade', d.cidade || 'não informada'),
          item(!!(d.interesses || []).length, 'Assuntos das notícias', (d.interesses || []).length ? d.interesses.join(', ') : 'todos'),
          item(true, 'Briefing de notícias', d.briefing === false ? 'desligado' : 'a partir das ' + (d.briefing_hora || '18:00')),
          item(!!(d.objetivos || []).length, 'Seus objetivos', (d.objetivos || []).length ? d.objetivos.join(', ') : 'nenhum marcado'),
          usaApp() ? item(!!st.app || !!st.feito.instalado, 'App no PC', st.app ? `conectado · ${st.app.nome || 'seu PC'}` : st.feito.instalado ? 'instalado (entre com a conta no app)' : 'falta instalar') : null,
          usaWeb() ? item(st.ias.some((i) => i.conectada), 'IA do ORION Web', st.ias.filter((i) => i.conectada).map((i) => i.nome).join(', ') || 'nenhuma ainda') : null,
          item(true, 'Números anônimos de uso', d.coletiva === false ? 'desligado' : 'ligado'),
          item(true, 'Plano', st.plano?.plano_nome || 'Free')),
        el('div', { class: 'cm-acoes' },
          destino ? el('a', { class: 'cm-btn cm-pri', href: destino }, destino.startsWith('app.html') ? 'Abrir o ORION Web' : 'Continuar de onde parei') : usaWeb() ? el('a', { class: 'cm-btn cm-pri', href: 'app.html' }, 'Abrir o ORION Web') : null,
          el('a', { class: 'cm-btn ' + (destino || usaWeb() ? 'cm-sec' : 'cm-pri'), href: 'conta.html' }, 'Ir para a minha conta'))];
    } },
  ];
  async function salvarPref(campos) { const r = await api('/api/conta/preferencias', 'PUT', campos); st.pref = r; return r; }
  const ativos = () => PASSOS.filter((p) => !p.condicao || p.condicao());
  let atual = ler().passo || 'boas';

  function desenharTrilho() {
    const lista = ativos(), i = Math.max(0, lista.findIndex((p) => p.id === atual));
    $('#trilho').replaceChildren(...lista.map((p, n) => el('li', { class: n === i ? 'on' : n < i ? 'feito' : '' }, el('span', { text: String(n + 1) }), p.nome)));
    $('#barra').style.width = Math.round(((i + 1) / lista.length) * 100) + '%';
  }
  function atualizarRodape() {
    const lista = ativos(), i = lista.findIndex((p) => p.id === atual);
    $('#voltar').hidden = i <= 0;
    const ultimo = i === lista.length - 1;
    $('#seguir').hidden = ultimo;
    $('#seguir').disabled = false;
    $('#seguir').textContent = atual === 'boas' ? 'Começar' : (atual === 'conectar' && !st.app) || (atual === 'ia' && !st.ias.some((i) => i.conectada)) || (atual === 'instalar' && !st.feito.instalado) ? 'Fazer depois' : atual === 'plano' ? 'Continuar no ' + (st.plano?.plano_nome || 'Free') : 'Continuar';
  }
  function ir(id, mesmo) {
    const lista = ativos();
    if (!lista.some((p) => p.id === id)) id = lista[0].id;
    atual = id; gravar();
    const passo = lista.find((p) => p.id === id);
    $('#palco').replaceChildren(el('div', { class: 'cm-passo' + (mesmo ? ' sem-anim' : '') }, ...passo.montar()));
    desenharTrilho(); atualizarRodape();
    if (!mesmo) { window.scrollTo({ top: 0 }); $('#cmTitulo')?.focus?.(); }
  }
  $('#seguir').addEventListener('click', async () => {
    const l = ativos(), i = l.findIndex((p) => p.id === atual);
    const b = $('#seguir');
    if (l[i]?.salvar) {
      b.disabled = true;
      try { await l[i].salvar(); } catch (e) { b.disabled = false; if (e.message !== 'login') { const m = $('#palco .cm-msg-erro') || $('#palco').appendChild(el('p', { class: 'cm-msg cm-msg-erro' })); m.textContent = 'Não consegui salvar: ' + e.message; } return; }
      b.disabled = false;
    }
    if (i < l.length - 1) ir(l[i + 1].id);
  });
  $('#pular')?.addEventListener('click', async (e) => { e.preventDefault(); try { await salvarPref({ concluir: true }); } catch { /* segue mesmo assim */ } location.href = VOLTA || 'conta.html'; });
  $('#voltar').addEventListener('click', () => { const l = ativos(), i = l.findIndex((p) => p.id === atual); if (i > 0) ir(l[i - 1].id); });

  (async () => {
    try {
      const [eu, plano, planos, ias, download, apps, pref, falas] = await Promise.all([api('/api/conta/eu'), api('/api/conta/plano'), api('/api/comercial/planos'), api('/api/conta/ias').catch(() => []), api('/api/download/info').catch(() => null), api('/api/ponte/apps').catch(() => ({ apps: [] })), api('/api/conta/preferencias').catch(() => ({ dados: {} })), api('/api/web/personalidades').catch(() => ({ modos: [] }))]);
      st.pref = pref || { dados: {} }; st.objetivos = pref?.objetivos || []; st.assuntos = pref?.assuntos || []; st.modosFala = falas?.modos || [];
      st.eu = eu.usuario || eu; st.plano = { ...plano, plano_nome: (planos.planos || []).find((p) => p.id === plano.plano)?.nome };
      st.planos = planos.planos || []; st.ias = Array.isArray(ias) ? ias : []; st.download = download; st.app = (apps.apps || [])[0] || null;
      ir(atual, true);
    } catch (e) { if (e.message !== 'login') $('#palco').textContent = e.message; }
  })();
})();
