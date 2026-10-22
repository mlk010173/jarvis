'use strict';
// JARVIS v1.3.5 — Log de execução: painel retrátil com as etapas REAIS do agente (modelo, ferramentas, fallback).
// Módulo puro e testável (tests/web/exec-log.test.js). Sem innerHTML com dados do usuário: só textContent e anchors controlados.
(() => {
  const g = typeof window !== 'undefined' ? window : globalThis;
  if (g.JARVIS_EXEC) return;
  const SEGREDOS = [/sk-[A-Za-z0-9_*-]{3,}/g, /nvapi-[A-Za-z0-9_*-]{3,}/g, /gsk_[A-Za-z0-9_*]{3,}/g, /Bearer\s+[A-Za-z0-9._*-]{6,}/g, /AIza[A-Za-z0-9_*-]{8,}/g];
  const limpaSegredo = (s) => SEGREDOS.reduce((t, r) => t.replace(r, '[removido]'), String(s ?? ''));
  const STATUS = {
    em_andamento: { nome: 'Em andamento', cls: 'st-andamento' },
    concluido: { nome: 'Concluído', cls: 'st-ok' },
    parcial: { nome: 'Parcial', cls: 'st-aviso' },
    falhou: { nome: 'Falhou', cls: 'st-erro' },
    cancelado: { nome: 'Cancelado', cls: 'st-muted' },
  };
  const TIPOS = { modelo: 'Modelo', ferramenta: 'Ferramenta', interno: 'Processamento', verificacao: 'Verificação' };
  const ESTADOS = { executando: 'executando', concluida: 'concluída', falhou: 'falhou' };
  // mescla etapas sem duplicar (mesma step_id mantém a versão mais recente) e devolve em ordem
  function mergePassos(atuais, novos) {
    const mapa = new Map();
    for (const p of [...(atuais || []), ...(novos || [])]) {
      if (!p || !p.step_id) continue;
      const ant = mapa.get(p.step_id);
      const tNovo = Date.parse(p.fim || p.inicio || 0), tAnt = ant ? Date.parse(ant.fim || ant.inicio || 0) : -1;
      if (!ant || tNovo >= tAnt) mapa.set(p.step_id, p);
    }
    return [...mapa.values()].sort((a, b) => (a.sequencia || 0) - (b.sequencia || 0));
  }
  // total de tokens: só soma quando o provedor informou; senão null (honesto)
  function somaTokens(exec) {
    const modelo = (exec?.passos || []).filter((p) => p.tipo === 'modelo' && p.estado === 'concluida');
    const temIn = modelo.some((p) => p.tokens_entrada != null), temOut = modelo.some((p) => p.tokens_saida != null);
    return {
      entrada: temIn ? modelo.reduce((s, p) => s + (p.tokens_entrada || 0), 0) : null,
      saida: temOut ? modelo.reduce((s, p) => s + (p.tokens_saida || 0), 0) : null,
    };
  }
  const durFmt = (ms) => ms == null ? '' : (ms < 1000 ? ms + ' ms' : (Math.round(ms / 100) / 10).toLocaleString('pt-BR') + ' s');
  const horaFmt = (iso) => { try { return iso ? new Date(iso).toLocaleTimeString('pt-BR') : ''; } catch { return ''; } };

  // ---------- painel DOM (retrátil, ao vivo quando pedido) ----------
  function no(tag, cls, txt) { const e = document.createElement(tag); if (cls) e.className = cls; if (txt != null) e.textContent = txt; return e; }
  function painelDOM(exec, opts = {}) {
    const raiz = no('div', 'exec' + (opts.aberto ? ' aberto' : ''));
    raiz.dataset.exec = exec?.execution_id || '';
    const cab = no('button', 'exec-cab'); cab.type = 'button';
    const titulo = no('span', 'exec-titulo', 'Execução');
    const st = no('span', 'exec-status');
    const cont = no('span', 'exec-cont', '');
    const seta = no('span', 'exec-seta', '▾');
    cab.append(titulo, st, cont);
    if (opts.aoVivo && exec?.status === 'em_andamento' && opts.aoParar) {
      const parar = no('button', 'exec-parar', 'Parar'); parar.type = 'button';
      parar.addEventListener('click', (ev) => { ev.stopPropagation(); try { opts.aoParar(); } catch { } });
      cab.append(parar);
    }
    cab.append(seta);
    const corpo = no('div', 'exec-corpo'); const interno = no('div'); corpo.append(interno);
    raiz.append(cab, corpo);
    cab.addEventListener('click', () => { raiz.classList.toggle('aberto'); try { opts.aoAlternar?.(raiz.classList.contains('aberto')); } catch { } });
    const render = (ex) => {
      const info = STATUS[ex?.status] || { nome: ex?.status || '—', cls: 'st-muted' };
      st.textContent = info.nome; st.className = 'exec-status ' + info.cls;
      const passos = ex?.passos || [];
      cont.textContent = passos.length ? passos.length + ' etapa' + (passos.length === 1 ? '' : 's') : '';
      interno.replaceChildren();
      const tok = somaTokens(ex);
      const resumo = no('div', 'exec-resumo');
      const chips = [];
      if (ex?.duracao_ms != null) chips.push('⏱ ' + durFmt(ex.duracao_ms));
      if (ex?.ferramentas?.length) chips.push('🔧 ' + [...new Set(ex.ferramentas)].join(', '));
      if (ex?.modelo_final) chips.push('🤖 ' + ex.modelo_final + (ex.ia_final ? ' · ' + ex.ia_final : ''));
      if (tok.entrada != null || tok.saida != null) chips.push('🔤 tokens: ' + (tok.entrada ?? '—') + ' → ' + (tok.saida ?? '—'));
      if (ex?.falhas?.length) chips.push('⚠ ' + ex.falhas.length + ' falha' + (ex.falhas.length === 1 ? '' : 's') + ' de fallback');
      if (!passos.length && ex?.status === 'em_andamento') chips.push('aguardando as primeiras etapas…');
      for (const c of chips) resumo.append(no('span', 'exec-chip', c));
      interno.append(resumo);
      const lista = no('ol', 'exec-passos');
      for (const p of passos) {
        const item = no('li', 'passo st-' + (p.estado === 'executando' ? 'executando' : p.estado === 'falhou' ? 'falhou' : 'ok'));
        item.append(no('span', 'p-ic', (TIPOS[p.tipo] || '?')[0]));
        const c = no('div', 'p-corpo');
        const l1 = no('div', 'p-linha1');
        l1.append(no('span', 'p-tipo', TIPOS[p.tipo] || p.tipo || 'etapa'));
        if (p.ferramenta) l1.append(no('b', null, p.ferramenta));
        if (p.duracao_ms != null) l1.append(no('span', 'p-dur', durFmt(p.duracao_ms)));
        c.append(l1);
        const meta = [p.provedor, p.modelo, p.inicio ? horaFmt(p.inicio) : ''].filter(Boolean).join(' · ');
        if (meta) c.append(no('div', 'p-meta', meta));
        if (p.tokens_entrada != null || p.tokens_saida != null) c.append(no('div', 'p-meta', 'tokens: ' + (p.tokens_entrada ?? '—') + ' → ' + (p.tokens_saida ?? '—')));
        if (p.resumo_entrada) c.append(no('div', 'p-res', limpaSegredo(p.resumo_entrada)));
        if (p.resumo_saida) c.append(no('div', 'p-res', limpaSegredo(p.resumo_saida)));
        if (p.erro) c.append(no('div', 'p-erro', limpaSegredo(p.erro)));
        if (Array.isArray(p.refs) && p.refs.length) {
          const rf = no('div', 'p-refs');
          for (const u of p.refs.slice(0, 6)) {
            if (!/^https:\/\//.test(String(u))) continue;
            const a = no('a', null, String(u).replace(/^https:\/\//, '').slice(0, 48));
            a.href = String(u); a.target = '_blank'; a.rel = 'noopener noreferrer nofollow';
            rf.append(a);
          }
          if (rf.childNodes.length) c.append(rf);
        }
        item.append(c);
        lista.append(item);
      }
      interno.append(lista);
    };
    render(exec);
    raiz.atualizar = render;
    return raiz;
  }

  g.JARVIS_EXEC = { limpaSegredo, STATUS, TIPOS, ESTADOS, mergePassos, somaTokens, durFmt, horaFmt, painelDOM };
})();
