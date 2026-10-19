'use strict';
// Ponte site → app (protocolo v1). Dois caminhos:
//  1. PELA CONTA (preferido): o app com a conta conectada escuta a nuvem; o site da mesma conta manda o pedido por /api/ponte/comando.
//     Não depende da permissão de rede local do navegador e não pede código.
//  2. DIRETO (127.0.0.1): o app só aceita este site (origem exata), pede um código de 6 dígitos que aparece NO PC e entrega um token
//     de 12 h preso a esta origem (fica só nesta aba, em sessionStorage).
// Nos dois casos o app só executa uma lista fechada de ações, com as mesmas confirmações.
(() => {
  const raiz = document.getElementById('app-pc');
  if (!raiz) return;
  const PORTA_PADRAO = [3950];                  // o instalador usa a 3950; as outras só entram se o cliente pedir (cada porta fechada vira um aviso no console do navegador)
  const PORTAS_EXTRAS = [3951, 3952, 3953, 3954, 3900];
  const CHAVE = 'orion_ponte';
  const MODULOS = [['nucleo', 'Núcleo (voz)'], ['editor', 'Editor & Motion'], ['mapa', 'Mapeamento de Leads'], ['transcritor', 'Transcritor'], ['roteiros', 'Roteiros'], ['central', 'Central de automação']];
  const el = (tag, attrs = {}, ...filhos) => { const e = document.createElement(tag); for (const [k, v] of Object.entries(attrs)) { if (k === 'class') e.className = v; else if (k === 'text') e.textContent = v; else e.setAttribute(k, v); } for (const f of filhos) if (f != null) e.append(f); return e; };
  const mb = (b) => (b >= 1073741824 ? (b / 1073741824).toFixed(1) + ' GB' : (b / 1048576).toFixed(b < 10485760 ? 1 : 0) + ' MB');

  const corpo = raiz.querySelector('[data-corpo]');
  let app = null;            // { porta, versao, edicao } (direto) ou { pc, nome, versao, edicao } (pela conta)
  let via = 'local';         // 'conta' | 'local'
  let sonda = 0;
  let sessao = null;         // { porta, token, expira }
  try { sessao = JSON.parse(sessionStorage.getItem(CHAVE) || 'null'); if (sessao && sessao.expira < Date.now()) sessao = null; } catch { sessao = null; }
  const guardar = () => { try { sessao ? sessionStorage.setItem(CHAVE, JSON.stringify(sessao)) : sessionStorage.removeItem(CHAVE); } catch {} };

  const base = () => `http://127.0.0.1:${app.porta}/ponte/v1`;
  async function chamarConta(metodo, rota, corpoJson) {
    const r = await fetch('/api/ponte/comando', { method: 'POST', credentials: 'same-origin', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ pc: app.pc, metodo, rota, corpo: corpoJson }), signal: AbortSignal.timeout(30000) });
    const j = await r.json().catch(() => ({}));
    if (!r.ok) throw new Error(j.erro || 'Erro ' + r.status);
    return j;
  }
  async function chamar(metodo, rota, corpoJson, comToken = true) {
    if (via === 'conta') return chamarConta(metodo, rota, corpoJson);
    const h = { 'Content-Type': 'application/json' };
    if (comToken && sessao) h.Authorization = 'Bearer ' + sessao.token;
    const r = await fetch(base() + rota, { method: metodo, headers: h, body: corpoJson === undefined ? undefined : JSON.stringify(corpoJson), signal: AbortSignal.timeout(20000) });
    const j = await r.json().catch(() => ({}));
    if (r.status === 401 && comToken && sessao) { sessao = null; guardar(); throw Object.assign(new Error('A conexão com o app expirou. Conecte de novo.'), { expirou: true }); }
    if (!r.ok) throw new Error(j.erro || 'Erro ' + r.status);
    return j;
  }

  // ---- app ligado em algum PC desta conta (conexão pela conta)
  async function porConta() {
    try { const r = await fetch('/api/ponte/apps', { credentials: 'same-origin' }); if (!r.ok) return null; const j = await r.json(); return (j.apps || [])[0] || null; } catch { return null; }
  }
  // o navegador bloqueou o acesso do site a apps deste PC? (Chrome: "Apps neste dispositivo" / "Rede local")
  async function bloqueioDoNavegador() {
    for (const nome of ['loopback-network', 'local-network-access', 'local-network']) { try { if ((await navigator.permissions.query({ name: nome })).state === 'denied') return true; } catch { /* permissão desconhecida neste navegador */ } }
    return false;
  }
  // ---- descobrir o app: tenta as portas em paralelo
  async function descobrir(portas) {
    const tentativas = portas.map(async (porta) => {
      const r = await fetch(`http://127.0.0.1:${porta}/ponte/v1/ola`, { signal: AbortSignal.timeout(1500) });
      const j = await r.json().catch(() => ({}));
      if (r.status === 403 && j.erro) throw Object.assign(new Error(j.erro), { desligada: true, porta });
      if (!r.ok || j.app !== 'orion') throw new Error('não é o ORION');
      return { porta, versao: j.versao, edicao: j.edicao };
    });
    try { return await Promise.any(tentativas); }
    catch (e) { const d = (e.errors || []).find((x) => x.desligada); if (d) throw d; return null; }
  }

  // ---- telas
  const limpar = () => corpo.replaceChildren();
  const aviso = (cls, texto) => el('div', { class: 'alert ' + cls, text: texto, style: 'margin-bottom:14px' });
  const botao = (texto, fn, cls = 'btn btn-sm') => { const b = el('button', { type: 'button', class: cls, text: texto }); b.addEventListener('click', async () => { b.disabled = true; try { await fn(b); } finally { b.disabled = false; } }); return b; };

  function telaProcurando() { limpar(); corpo.append(el('p', { class: 'hint', text: 'Procurando o ORION neste PC…' })); }

  function telaFechado(msg, bloqueado) {
    limpar();
    corpo.append(aviso('alert-warn', msg || 'Ainda não encontrei o ORION ligado neste PC.'));
    corpo.append(el('ol', { class: 'steps-list' },
      el('li', { text: 'Abra o ORION pelo menu Iniciar (ainda não instalou? Baixe logo abaixo).' }),
      el('li', { text: 'No app, entre com esta mesma conta: Configurações → Conta e site. Assim o site e o app se encontram pela sua conta, sem código e sem depender do navegador.' }),
      el('li', { text: 'Pronto: em alguns segundos o app aparece aqui sozinho.' })));
    if (bloqueado) corpo.append(el('p', { class: 'hint', style: 'margin-top:10px', text: 'Quer também a conexão direta (mais rápida)? O seu navegador está bloqueando este site de falar com apps do PC. Para liberar: clique no ícone à esquerda do endereço do site → Configurações do site → "Apps neste dispositivo" (ou "Rede local") → Permitir, e recarregue a página.' }));
    corpo.append(el('div', { class: 'actions', style: 'margin-top:12px' }, botao('Procurar de novo', () => iniciar(false), 'btn btn-sm btn-primary'), botao('Procurar em outras portas', () => iniciar(true))));
    // continua procurando pela conta enquanto esta tela estiver aberta
    const minha = ++sonda;
    const tentar = async () => { if (minha !== sonda) return; if (document.hidden) return setTimeout(tentar, 5000); const c = await porConta(); if (minha !== sonda) return; if (c) { via = 'conta'; app = c; telaConectado().catch(() => {}); } else setTimeout(tentar, 5000); };
    setTimeout(tentar, 5000);
  }

  function telaAchado() {
    sonda++;
    limpar();
    corpo.append(el('div', { class: 'app-estado' }, el('span', { class: 'badge badge-ok', text: 'ORION encontrado' }), el('span', { class: 'hint', text: `versão ${app.versao} · edição ${app.edicao} · porta ${app.porta}` })));
    corpo.append(el('p', { class: 'hint', style: 'margin:12px 0', text: 'Conecte para ver o estado do app e abrir módulos por aqui. O ORION vai mostrar um código de 6 dígitos no seu PC para você aprovar.' }));
    corpo.append(botao('Conectar ao app', pedirCodigo, 'btn btn-primary'));
  }

  async function pedirCodigo() {
    const r = await chamar('POST', '/parear/iniciar', {}, false);
    limpar();
    const campo = el('input', { type: 'text', inputmode: 'numeric', maxlength: '7', autocomplete: 'one-time-code', placeholder: '000 000', class: 'input', style: 'max-width:180px;font:600 22px var(--mono);letter-spacing:.15em;text-align:center' });
    const msg = el('div', { class: 'hint', style: 'margin-top:8px' });
    const confirmar = botao('Confirmar', async () => {
      try {
        const j = await chamar('POST', '/parear/confirmar', { pedido: r.pedido, codigo: campo.value }, false);
        sessao = { porta: app.porta, token: j.token, expira: j.expira_em }; guardar();
        await telaConectado();
      } catch (e) { msg.className = 'hint'; msg.style.color = 'var(--err)'; msg.textContent = e.message; }
    }, 'btn btn-primary');
    campo.addEventListener('keydown', (e) => { if (e.key === 'Enter') confirmar.click(); });
    corpo.append(
      el('p', { text: 'Olhe o seu PC: o ORION mostrou um código de 6 dígitos na janela do app e na bandeja do Windows (perto do relógio). Digite-o aqui.' }),
      el('div', { class: 'actions', style: 'margin-top:10px;align-items:center' }, campo, confirmar, botao('Cancelar', async () => telaAchado())),
      msg, el('p', { class: 'hint', style: 'margin-top:8px', text: `O código vale ${Math.round(r.segundos / 60)} minutos. Se não foi você quem pediu, ignore: nada acontece sem o código.` }));
    campo.focus();
  }

  async function telaConectado() {
    sonda++;
    limpar();
    let est;
    try { est = await chamar('GET', '/estado'); } catch (e) { if (e.expirou) return telaAchado(); if (via === 'conta') { via = 'local'; return telaFechado(e.message); } throw e; }
    const topo = el('div', { class: 'app-estado' }, el('span', { class: 'badge badge-ok', text: via === 'conta' ? 'Conectado pela sua conta' + (app.nome ? ' · ' + app.nome : '') : 'Conectado' }),
      el('span', { class: 'hint', text: `IA atual: ${est.ia ? est.ia.nome : 'nenhuma configurada'} · conta: ${est.licenca.ativa ? 'plano ' + (est.licenca.plano_nome || est.licenca.plano) : 'Free'} · ligado há ${est.app.online_ha_min} min` }));
    if (via === 'local') topo.append(botao('Desconectar', async () => { try { await chamar('POST', '/desconectar', {}); } catch {} sessao = null; guardar(); telaAchado(); }));
    else topo.append(botao('Atualizar', () => telaConectado()));
    corpo.append(topo);

    // módulos
    const resp = el('div', { class: 'hint', style: 'margin-top:10px;min-height:1.4em' });
    const grade = el('div', { class: 'app-grade' });
    for (const [id, nome] of MODULOS) grade.append(botao(nome, async () => {
      try { await chamar('POST', '/modulo/abrir', { modulo: id }); resp.style.color = 'var(--ok)'; resp.textContent = `Abrindo "${nome}" no seu PC…`; }
      catch (e) { resp.style.color = 'var(--err)'; resp.textContent = e.message; }
    }));
    corpo.append(el('h3', { text: 'Abrir no seu PC', class: 'app-h' }), grade, resp);

    // limpeza segura (plano → confirmação)
    const limpezaBox = el('div', { class: 'app-box' });
    corpo.append(el('h3', { text: 'Limpeza segura', class: 'app-h' }), el('p', { class: 'hint', text: 'Só apaga arquivos temporários do próprio ORION. Você vê o plano e confirma antes.' }), limpezaBox,
      botao('Ver o que dá para limpar', async () => {
        limpezaBox.replaceChildren();
        try {
          const { plano } = await chamar('GET', '/central/limpeza');
          const linhas = plano.filter((p) => p.arquivos > 0);
          if (!linhas.length) { limpezaBox.append(el('p', { class: 'hint', text: 'Nada para limpar agora.' })); return; }
          const marcas = new Map();
          const lista = el('div', { class: 'app-lista' });
          for (const p of linhas) {
            const cx = el('input', { type: 'checkbox' }); cx.checked = p.risco === 'seguro'; marcas.set(p.id, cx);
            lista.append(el('label', { class: 'check' }, cx, el('span', { text: `${p.nome} — ${p.arquivos} arquivo(s), ${mb(p.bytes)}${p.risco === 'confirmar' ? ' (apaga arquivos seus: confira)' : ''}` })));
          }
          const res = el('div', { class: 'hint' });
          limpezaBox.append(lista, botao('Limpar selecionados', async () => {
            const ids = [...marcas].filter(([, c]) => c.checked).map(([id]) => id);
            if (!ids.length) { res.textContent = 'Marque pelo menos uma categoria.'; return; }
            if (!confirm('Limpar agora os itens marcados? Isso não pode ser desfeito.')) return;
            try { const r = await chamar('POST', '/central/limpeza', { ids, confirmar: true }); res.style.color = 'var(--ok)'; res.textContent = `Pronto: ${r.apagados} arquivo(s) apagado(s), ${mb(r.bytes)} liberados.`; }
            catch (e) { res.style.color = 'var(--err)'; res.textContent = e.message; }
          }, 'btn btn-sm btn-primary'), res);
        } catch (e) { limpezaBox.append(el('p', { class: 'hint', style: 'color:var(--err)', text: e.message })); }
      }));

    // organizar Downloads (só move para a pasta "Organizado"; dá para desfazer)
    const orgBox = el('div', { class: 'app-box' });
    corpo.append(el('h3', { text: 'Organizar Downloads', class: 'app-h' }), el('p', { class: 'hint', text: 'Separa os arquivos da pasta Downloads por tipo e mês, dentro de uma pasta “Organizado”. Nunca apaga nada e dá para desfazer.' }), orgBox,
      botao('Ver o plano', async () => {
        orgBox.replaceChildren();
        try {
          const { plano } = await chamar('GET', '/central/organizar?alvo=downloads');
          if (!plano.total) { orgBox.append(el('p', { class: 'hint', text: 'Nada para organizar agora (arquivos baixados na última hora ficam de fora).' })); return; }
          const porCat = {}; for (const m of plano.movimentos) porCat[m.categoria] = (porCat[m.categoria] || 0) + 1;
          const res = el('div', { class: 'hint' });
          orgBox.append(el('p', { text: `${plano.total} arquivo(s), ${mb(plano.bytes)}: ${Object.entries(porCat).map(([c, n]) => `${c} (${n})`).join(', ')}.` }),
            botao('Organizar agora', async () => {
              if (!confirm('Mover os arquivos para a pasta “Organizado” dentro de Downloads? Você pode desfazer depois.')) return;
              try { const r = await chamar('POST', '/central/organizar', { alvo: 'downloads', confirmar: true }); res.style.color = r.integro ? 'var(--ok)' : 'var(--warn)'; res.textContent = `Pronto: ${r.resultado.movidos} de ${r.esperado} arquivo(s) movidos${r.integro ? '' : ' (alguns não puderam ser movidos)'}.`; }
              catch (e) { res.style.color = 'var(--err)'; res.textContent = e.message; }
            }, 'btn btn-sm btn-primary'),
            botao('Desfazer a última organização', async () => { try { const r = await chamar('POST', '/central/organizar/desfazer', {}); res.style.color = 'var(--ok)'; res.textContent = `Desfeito: ${r.resultado.revertidos ?? r.resultado.movidos ?? 0} arquivo(s) voltaram.`; } catch (e) { res.style.color = 'var(--err)'; res.textContent = e.message; } }),
            res);
        } catch (e) { orgBox.append(el('p', { class: 'hint', style: 'color:var(--err)', text: e.message })); }
      }));

    // corte automático de silêncios (só vídeos de pastas que o usuário aprovou no app)
    const cutBox = el('div', { class: 'app-box' });
    corpo.append(el('h3', { text: 'Cortar silêncios de um vídeo', class: 'app-h' }), el('p', { class: 'hint', text: 'Escolha um vídeo de uma pasta que você aprovou no app (Configurações → Conta e site). O ORION remove os silêncios e salva o resultado no próprio app, em Vídeos.' }), cutBox,
      botao('Listar vídeos', async () => {
        cutBox.replaceChildren();
        try {
          const r = await chamar('GET', '/editor/videos');
          if (!r.pastas) { cutBox.append(el('p', { class: 'hint', text: 'Nenhuma pasta aprovada ainda. No app: Configurações → Conta e site → “Pastas de vídeo aprovadas”.' })); return; }
          if (!r.videos.length) { cutBox.append(el('p', { class: 'hint', text: 'Não achei vídeos nas pastas aprovadas.' })); return; }
          const sel = el('select', { class: 'input', style: 'max-width:100%' }, ...r.videos.map((v) => el('option', { value: v.id, text: `${v.nome} (${mb(v.bytes)})` })));
          const res = el('div', { class: 'hint', style: 'margin-top:8px' });
          cutBox.append(sel, el('div', { class: 'actions', style: 'margin-top:10px' }, botao('Cortar silêncios', async () => {
            if (!confirm('Cortar os silêncios deste vídeo agora? O original não é alterado.')) return;
            res.style.color = ''; res.textContent = 'Analisando o áudio…';
            try {
              const j = await chamar('POST', '/editor/autocut', { id: sel.value, confirmar: true });
              if (!j.job) { res.textContent = j.mensagem || 'Nada para cortar.'; return; }
              res.textContent = `Cortando ${j.silencios} silêncio(s) (${j.removidoSeg} s)…`;
              for (let i = 0; i < 240; i++) {
                await new Promise((ok) => setTimeout(ok, 2500));
                const e = await chamar('GET', '/estado'); const t = e.trabalhos.find((x) => x.id === (j.job.id || j.job));
                if (t) { res.textContent = `${t.msg || 'Processando'} (${Math.round(t.pct || 0)}%)`; if (t.estado === 'pronto' || t.estado === 'concluido') { res.style.color = 'var(--ok)'; res.textContent = 'Pronto! O vídeo cortado está no ORION, em Vídeos. Abra o Editor para ver.'; return; } if (t.estado === 'erro') throw new Error(t.msg || 'O corte falhou.'); }
              }
              res.textContent = 'Ainda processando. Acompanhe no app.';
            } catch (e) { res.style.color = 'var(--err)'; res.textContent = e.message; }
          }, 'btn btn-sm btn-primary')), res);
        } catch (e) { cutBox.append(el('p', { class: 'hint', style: 'color:var(--err)', text: e.message })); }
      }));

    // diagnóstico
    const diagBox = el('div', { class: 'app-box' });
    corpo.append(el('h3', { text: 'Diagnóstico', class: 'app-h' }), diagBox, botao('Executar diagnóstico', async () => {
      diagBox.replaceChildren(el('p', { class: 'hint', text: 'Verificando…' }));
      try {
        const { itens } = await chamar('GET', '/diagnostico');
        diagBox.replaceChildren(el('ul', { class: 'app-diag' }, ...itens.map((i) => el('li', {}, el('span', { class: 'badge ' + ({ ok: 'badge-ok', aviso: 'badge-warn', erro: 'badge-err' }[i.estado] || ''), text: i.estado }), el('span', { text: ` ${i.nome}: ${i.detalhe}` })))));
      } catch (e) { diagBox.replaceChildren(el('p', { class: 'hint', style: 'color:var(--err)', text: e.message })); }
    }));
  }

  async function iniciar(extras = false) {
    telaProcurando();
    // 1º pela conta (não depende do navegador); 2º direto no 127.0.0.1
    const conta = await porConta();
    if (conta) { via = 'conta'; app = conta; try { return await telaConectado(); } catch (e) { corpo.append(aviso('alert-err', e.message)); return; } }
    via = 'local';
    try { app = await descobrir(extras ? PORTAS_EXTRAS : PORTA_PADRAO); }
    catch (e) { if (e.desligada) return telaFechado('O app foi encontrado, mas a conexão com o site está desligada nele. No ORION: Configurações → Conta e site → ligue "Deixar o site do ORION ver o estado do app".'); app = null; }
    if (!app) return telaFechado(null, await bloqueioDoNavegador());
    if (sessao && sessao.porta === app.porta) { try { return await telaConectado(); } catch (e) { if (!e.expirou) { corpo.append(aviso('alert-err', e.message)); } } }
    sessao = null; guardar(); telaAchado();
  }
  iniciar(false);
})();
