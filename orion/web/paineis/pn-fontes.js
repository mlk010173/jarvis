'use strict';
// cópia de app/public/paineis/pn-fontes.js (scripts/copiar-visual-app.js): edite no app e copie de novo
// Painel Fontes de dados: de onde o ORION tira as respostas e o que ele pode usar.
//  Conexões: IAs (fila com failover) e conectores (ferramentas que a IA usa sozinha)
//  Canais: por onde você fala com o ORION e por onde ele te avisa
//  Memória: o que o ORION guardou sobre você e o cofre do Obsidian (segunda memória)
(() => {
  const P = window.ORION_PAINEIS; if (!P) return;
  const { el, svg, num, pill, kpi, caixa, linha, btn, vazio, chave, relativo, campo } = P.util;

  async function conexoes(ctx) {
    const f = await ctx.api('/fontes');
    const ias = f.ias.filter((x) => x.configurado), livres = f.ias.filter((x) => !x.configurado);
    const abrirIas = () => (ctx.host.tipo === 'app' ? ctx.host.abrirConfig?.('cerebro') : ctx.host.abrirIas?.());
    ctx.corpo.append(
      el('div', { class: 'pn-grade' }, kpi('IA respondendo agora', f.ia_atual || 'Nenhuma', ias.length ? `${ias.length} IA(s) na fila` : 'Conecte uma IA grátis', 'brain', f.ia_atual ? 'bom' : 'ruim'), kpi('Conectores ligados', String(f.conectores.filter((c) => c.ativo).length), `de ${f.conectores.length}`, 'plugs'), kpi('Memórias', num(f.memoria.total), 'fatos guardados sobre você', 'book')),
      caixa('IAs (cérebro)', 'brain', { sub: 'O ORION tenta de cima para baixo. Se uma falhar (sem crédito, limite ou fora do ar), a próxima assume com a mesma conversa.', acoes: btn('Gerenciar IAs', { peq: true, ic: 'settings', onclick: abrirIas }) },
        ias.length ? el('div', { class: 'pn-linhas' }, ias.map((x, i) => linha({ ic: 'brain', titulo: `${i + 1}. ${x.nome}`, sub: x.modelo ? 'Modelo: ' + x.modelo : '', fim: [x.fora_do_plano ? pill('Fora do plano', 'aviso') : !x.ligado ? pill('Desligada', '') : x.saude && !x.saude.ok ? pill('Falhou por último', 'erro') : pill('Pronta', 'ok')] }))) : vazio('brain', 'Nenhuma IA conectada', 'O Gemini tem plano grátis: crie a chave em aistudio.google.com/apikey e cole em Cérebro (IAs).', btn('Conectar uma IA', { pri: true, ic: 'plus', onclick: abrirIas })),
        livres.length ? el('p', { class: 'pn-nota', style: 'margin-top:10px', text: 'Também dá para conectar: ' + livres.map((x) => x.nome).join(', ') + '.' }) : null),
      caixa('Conectores', 'plugs', { sub: 'Ferramentas que a IA usa sozinha quando precisa (clima, criação, casa, financeiro…). Desligar aqui vale para todos os agentes.' },
        el('div', { class: 'pn-linhas' }, f.conectores.map((c) => linha({ ic: { casa: 'home', financeiro: 'wallet', clima: 'sun', memoria: 'book', sistema: 'monitor', criacao: 'sparkles', prospeccao: 'pin', web: 'globe' }[c.id] || 'plug', titulo: c.nome, sub: c.descricao, fim: [c.precisa_config ? pill('Precisa configurar', 'aviso') : null, chave('', c.ativo, async (v, i) => { try { await ctx.api('/fontes/conector', { metodo: 'POST', corpo: { id: c.id, ativo: v } }); ctx.toast(`${c.nome} ${v ? 'ligado' : 'desligado'}.`); } catch (e) { i.checked = !v; ctx.toast(e.message, 'bad'); } })] })))));
  }

  async function canais(ctx) {
    const f = await ctx.api('/fontes');
    const ESTADO = { ativo: ['Ativo', 'ok'], conectado: ['Conectado', 'ok'], aguardando: ['Aguardando', 'aviso'], desligado: ['Desligado', ''], link: ['Abrir', 'azul'] };
    const IC = { app: 'monitor', web: 'globe', bandeja: 'bell', casa: 'home', discord: 'chat', email: 'mail' };
    ctx.corpo.append(
      caixa('Por onde o ORION fala com você', 'radio', { sub: 'Os mesmos agentes, a mesma conta. No site, o que depende do PC passa pela conexão da conta.' },
        el('div', { class: 'pn-linhas' }, f.canais.map((c) => linha({ ic: IC[c.id] || 'radio', titulo: c.nome, sub: c.detalhe, fim: c.url ? el('a', { class: 'pn-btn peq', href: c.url, target: '_blank', rel: 'noopener' }, svg(c.id === 'email' ? 'mail' : 'link'), c.id === 'email' ? 'Escrever' : 'Abrir') : pill(...(ESTADO[c.estado] || [c.estado, ''])) })))),
      caixa('Precisa de ajuda?', 'info', {}, el('p', { class: 'pn-nota' }, 'Suporte pelo e-mail ', el('a', { href: 'mailto:assistanceorion.cloud@gmail.com', text: 'assistanceorion.cloud@gmail.com' }), ' ou pela comunidade no ', el('a', { href: 'https://discord.gg/aFHrJ6Vcew', target: '_blank', rel: 'noopener', text: 'Discord do ORION' }), ' (abra um ticket no canal de tickets).')));
  }

  async function memoria(ctx) {
    const f = await ctx.api('/fontes');
    const o = f.obsidian;
    ctx.corpo.append(
      el('div', { class: 'pn-grade' }, kpi('Memórias guardadas', num(f.memoria.total), 'o ORION lembra disso nas conversas', 'book'), kpi('Segunda memória', o?.conectado ? (o.cofre || 'Obsidian') : 'Desligada', o?.conectado ? `${num(o.notas)} notas · ${o.semantica ? 'busca por sentido' : 'busca por palavras'}` : 'Conecte um cofre do Obsidian', 'brain', o?.conectado ? 'bom' : '')),
      caixa('Segunda memória (Obsidian)', 'brain', { sub: 'O ORION lê as notas do seu cofre do Obsidian NESTE PC para responder com o que você já escreveu. As notas não vão para a nuvem do ORION.', acoes: ctx.host.tipo === 'app' ? btn('Configurar', { peq: true, ic: 'settings', onclick: () => ctx.host.abrirConfig?.('memoria') }) : null },
        o?.conectado ? el('div', { class: 'pn-linhas' },
          linha({ ic: 'folder', titulo: 'Cofre: ' + (o.cofre || '—'), sub: o.indexando ? 'Lendo as notas agora…' : o.ultimo ? 'Atualizado ' + relativo(new Date(o.ultimo).toISOString()) : '', fim: o.erro ? pill('Erro: ' + o.erro, 'erro') : pill(o.ativo ? 'Usado nas respostas' : 'Só na busca', o.ativo ? 'ok' : 'azul') }))
          : el('p', { class: 'pn-nota', text: ctx.host.tipo === 'app' ? 'Nenhum cofre conectado. Clique em Configurar e escolha a pasta do seu cofre.' : 'Nenhum cofre conectado no app do PC.' })),
      caixa('O que o ORION lembra sobre você', 'book', { sub: 'Ele guarda quando você pede ("lembra que…") ou quando algo parece importante. Chaves e senhas aparecem mascaradas. Apague o que não quiser que ele use.' },
        f.memoria.itens.length ? el('div', { class: 'pn-linhas' }, f.memoria.itens.map((m) => linha({ ic: 'book', titulo: m.texto, sub: m.em ? 'Guardada ' + relativo(new Date(m.em).toISOString()) : '', fim: btn('', { peq: true, ic: 'trash', titulo: 'Esquecer', onclick: async () => { if (!P.util.confirmar('Esquecer esta memória?')) return; try { await ctx.api('/fontes/memoria/apagar', { metodo: 'POST', corpo: { id: m.id } }); ctx.atualizar(); } catch (e) { ctx.toast(e.message, 'bad'); } } }) })))
          : vazio('book', 'Nenhuma memória ainda', 'Diga, por exemplo: "lembra que eu prefiro respostas curtas" ou "minha loja abre às 9h".')));
  }

  // ---------- Projetos: nome, documentos e APIs de cada projeto (o ORION lê e consulta) ----------
  const AUTH = [['nenhuma', 'Sem chave'], ['bearer', 'Bearer (Authorization: Bearer …)'], ['header', 'Cabeçalho próprio (ex.: x-api-key)'], ['query', 'Parâmetro na URL (ex.: ?key=…)'], ['basic', 'Basic (usuário:senha)']];
  const TIPO_DOC = [['texto', 'Texto (cole aqui)'], ['link', 'Link'], ['arquivo', 'Arquivo ou pasta do PC']];
  function editarProjeto(ctx, p) {
    const app = ctx.host.tipo === 'app';
    const f = p ? JSON.parse(JSON.stringify(p)) : { nome: '', descricao: '', site: '', pasta: '', tags: [], notas: '', docs: [], apis: [] };
    f.tags = f.tags || [];
    const inp = (v, aoMudar, extra = {}) => { const i = el('input', { value: v ?? '', ...extra }); i.addEventListener('input', () => aoMudar(i.value)); return i; };
    const area = (v, aoMudar, linhas = 3, extra = {}) => { const t = el('textarea', { rows: String(linhas), ...extra }); t.value = v ?? ''; t.addEventListener('input', () => aoMudar(t.value)); return t; };
    const sel = (ops, v, aoMudar) => { const s = el('select', {}, ops.map(([k, n]) => el('option', { value: k, selected: k === v ? true : null }, n))); s.addEventListener('change', () => aoMudar(s.value)); return s; };
    const docsBox = el('div', { class: 'pn-proj-lista' }), apisBox = el('div', { class: 'pn-proj-lista' });
    function desenharDocs() {
      docsBox.replaceChildren(...f.docs.map((d, i) => el('div', { class: 'pn-proj-item' },
        el('div', { class: 'pn-proj-linha' }, campo('Título', inp(d.titulo, (v) => { d.titulo = v; }, { placeholder: 'Manual da loja' })), campo('Tipo', sel(TIPO_DOC.filter(([k]) => app || k !== 'arquivo'), d.tipo, (v) => { d.tipo = v; desenharDocs(); })), btn('', { peq: true, ic: 'trash', titulo: 'Remover documento', onclick: () => { f.docs.splice(i, 1); desenharDocs(); } })),
        d.tipo === 'link' ? campo('Link', inp(d.url, (v) => { d.url = v; }, { placeholder: 'https://docs.exemplo.com' }))
          : d.tipo === 'arquivo' ? campo('Caminho no PC', inp(d.caminho, (v) => { d.caminho = v; }, { placeholder: 'C:\\Users\\voce\\Documentos\\manual.md' }))
            : campo('Texto (até 20 mil caracteres)', area(d.conteudo, (v) => { d.conteudo = v; }, 4, { maxlength: '20000', placeholder: 'Cole aqui a documentação, o passo a passo, as regras do projeto…' })))));
    }
    function desenharApis() {
      apisBox.replaceChildren(...f.apis.map((a, i) => el('div', { class: 'pn-proj-item' },
        el('div', { class: 'pn-proj-linha' }, campo('Nome da API', inp(a.nome, (v) => { a.nome = v; }, { placeholder: 'SellTrust' })), campo('Endereço base', inp(a.base, (v) => { a.base = v; }, { placeholder: 'https://api.exemplo.com/v1' })), btn('', { peq: true, ic: 'trash', titulo: 'Remover API', onclick: () => { f.apis.splice(i, 1); desenharApis(); } })),
        el('div', { class: 'pn-proj-linha' }, campo('Autenticação', sel(AUTH, a.auth || 'nenhuma', (v) => { a.auth = v; desenharApis(); })), ['header', 'query'].includes(a.auth) ? campo(a.auth === 'header' ? 'Nome do cabeçalho' : 'Nome do parâmetro', inp(a.campo, (v) => { a.campo = v; }, { placeholder: a.auth === 'header' ? 'x-api-key' : 'key' })) : null, campo('Documentação (link)', inp(a.docs_url, (v) => { a.docs_url = v; }, { placeholder: 'https://docs…' }))),
        a.auth && a.auth !== 'nenhuma' ? (app
          ? el('div', { class: 'pn-proj-linha' }, campo(a.tem_chave ? `Chave (salva: ${a.chave_mascarada || '••••'}; deixe vazio para manter)` : 'Chave da API', inp('', (v) => { a.chave = v; }, { type: 'password', autocomplete: 'new-password', placeholder: a.tem_chave ? '••••' : 'cole a chave' })), a.tem_chave ? P.util.chave('Apagar a chave salva', false, (v) => { a.limpar_chave = v; }) : null)
          : el('p', { class: 'pn-nota', text: a.tem_chave ? `Chave salva no PC (${a.chave_mascarada || '••••'}).` : 'A chave desta API só pode ser colada no app do PC (por segurança, ela não passa pelo site).' })) : null,
        campo('Notas (como usar, limites, rotas importantes)', area(a.notas, (v) => { a.notas = v; }, 2, { maxlength: '600' })))));
    }
    desenharDocs(); desenharApis();
    const salvar = async (ev) => {
      const b = ev.currentTarget; b.disabled = true;
      try {
        const corpo = { ...f, tags: String(f.tagsTxt ?? f.tags.join(', ')).split(',').map((t) => t.trim()).filter(Boolean) };
        delete corpo.tagsTxt; for (const a of corpo.apis) { delete a.tem_chave; delete a.chave_mascarada; if (!a.chave) delete a.chave; }
        for (const d of corpo.docs) delete d.tamanho;
        await ctx.api('/projetos/salvar', { metodo: 'POST', corpo });
        P.util.fecharModal(); ctx.toast(p ? 'Projeto salvo.' : 'Projeto criado. O ORION já sabe dele.'); ctx.atualizar();
      } catch (e) { ctx.toast(e.message, 'bad'); b.disabled = false; }
    };
    P.util.abrirModal(p ? p.nome : 'Novo projeto',
      el('div', { class: 'pn-form pn-proj-form' },
        campo('Nome do projeto', inp(f.nome, (v) => { f.nome = v; }, { maxlength: '80', placeholder: 'Minha loja' })),
        campo('O que é (o ORION usa isso para entender o projeto)', area(f.descricao, (v) => { f.descricao = v; }, 3, { maxlength: '1000', placeholder: 'Loja de… na plataforma…, público…, objetivo…' })),
        el('div', { class: 'pn-proj-linha' }, campo('Site', inp(f.site, (v) => { f.site = v; }, { placeholder: 'https://minhaloja.com' })), app ? campo('Pasta no PC (opcional)', inp(f.pasta, (v) => { f.pasta = v; }, { placeholder: 'C:\\Projetos\\minha-loja' })) : null),
        campo('Etiquetas (separadas por vírgula)', inp(f.tags.join(', '), (v) => { f.tagsTxt = v; }, { placeholder: 'loja, steam, vendas' })),
        el('div', { class: 'pn-proj-tit', role: 'heading', 'aria-level': '3' }, svg('book'), 'Documentos'), docsBox, btn('Adicionar documento', { peq: true, ic: 'plus', onclick: () => { f.docs.push({ tipo: 'texto', titulo: '', conteudo: '' }); desenharDocs(); } }),
        el('div', { class: 'pn-proj-tit', role: 'heading', 'aria-level': '3' }, svg('plug'), 'APIs'), apisBox, btn('Adicionar API', { peq: true, ic: 'plus', onclick: () => { f.apis.push({ nome: '', base: '', auth: 'bearer', campo: '', docs_url: '', notas: '' }); desenharApis(); } }),
        campo('Notas gerais', area(f.notas, (v) => { f.notas = v; }, 3, { maxlength: '4000', placeholder: 'Regras, contatos, o que nunca fazer…' })),
        el('p', { class: 'pn-nota', text: 'As chaves ficam guardadas no cofre do Windows deste PC (criptografadas) e nunca aparecem inteiras. O ORION usa a API só no endereço cadastrado: consulta, cria, altera e apaga quando você pede, e o que altera passa pela confirmação (ou fica nos Logs, no modo "permitir tudo").' }),
        el('div', { class: 'pn-acoes' }, p ? btn('Apagar projeto', { perigo: true, ic: 'trash', onclick: async () => { if (!P.util.confirmar(`Apagar o projeto "${p.nome}" e as chaves dele?`)) return; try { await ctx.api('/projetos/apagar', { metodo: 'POST', corpo: { id: p.id } }); P.util.fecharModal(); ctx.toast('Projeto apagado.'); ctx.atualizar(); } catch (e) { ctx.toast(e.message, 'bad'); } } }) : null, btn(p ? 'Salvar' : 'Criar projeto', { pri: true, ic: 'save', onclick: salvar }))));
  }
  async function projetos(ctx) {
    const { projetos: l } = await ctx.api('/projetos');
    const apis = l.reduce((s, p) => s + p.apis.length, 0), docs = l.reduce((s, p) => s + p.docs.length, 0), semChave = l.reduce((s, p) => s + p.apis.filter((a) => a.auth !== 'nenhuma' && !a.tem_chave).length, 0);
    ctx.corpo.append(
      el('div', { class: 'pn-grade' }, kpi('Projetos', num(l.length), 'o ORION conhece todos', 'folder'), kpi('Documentos', num(docs), 'manuais, regras, links', 'book'), kpi('APIs', num(apis), semChave ? `${semChave} sem chave ainda` : 'todas prontas', 'plug', semChave ? '' : (apis ? 'bom' : ''))),
      caixa('Seus projetos', 'folder', { sub: 'Conte ao ORION sobre cada projeto: o que é, os documentos e as APIs. Ele usa isso nas respostas e consulta os dados ao vivo quando você pede ("quantos pedidos a loja teve hoje?").', acoes: btn('Novo projeto', { pri: true, peq: true, ic: 'plus', onclick: () => editarProjeto(ctx, null) }) },
        l.length ? el('div', { class: 'pn-linhas' }, l.map((p) => linha({ ic: 'folder', titulo: p.nome, sub: [p.descricao ? p.descricao.slice(0, 120) : '', `${p.docs.length} doc(s)`, p.apis.length ? 'APIs: ' + p.apis.map((a) => a.nome).join(', ') : ''].filter(Boolean).join(' · '), fim: [p.apis.some((a) => a.auth !== 'nenhuma' && !a.tem_chave) ? pill('Falta chave', 'aviso') : p.apis.length ? pill('APIs prontas', 'ok') : null, btn('Editar', { peq: true, ic: 'pen', onclick: () => editarProjeto(ctx, p) })], onclick: null })))
          : vazio('folder', 'Nenhum projeto ainda', 'Cadastre a sua loja, o seu canal, um cliente… Com nome, documentos e APIs, o ORION responde sobre eles e busca os dados sozinho.', btn('Criar o primeiro projeto', { pri: true, ic: 'plus', onclick: () => editarProjeto(ctx, null) }))));
  }

  P.registrar({
    id: 'fontes', titulo: 'Fontes de dados', sub: 'Conexões, projetos, canais e memória', ic: 'database', precisaPc: false, // no site sem o PC, mostra as IAs da conta
    abas: [{ id: 'conexoes', nome: 'Conexões', ic: 'plugs' }, { id: 'projetos', nome: 'Projetos', ic: 'folder' }, { id: 'canais', nome: 'Canais', ic: 'radio' }, { id: 'memoria', nome: 'Memória', ic: 'book' }],
    render: (ctx) => {
      if (ctx.aba === 'projetos' && ctx.host.tipo === 'web' && !ctx.host.pc().disponivel) { ctx.corpo.append(vazio('monitor', 'Abra o ORION no seu PC', 'Os projetos ficam guardados no seu computador (com as chaves das APIs no cofre do Windows). Abra o app no PC com a mesma conta para ver e editar aqui.')); return; }
      return ({ conexoes, projetos, canais, memoria }[ctx.aba] || conexoes)(ctx);
    },
  });
})();
