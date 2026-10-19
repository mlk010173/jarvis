'use strict';
// cópia de app/public/paineis/pn-monitor.js (scripts/copiar-visual-app.js): edite no app e copie de novo

// Painel Monitoramento: saúde do PC (CPU, memória, disco, bateria, programas pesados), atividade no computador
// (minutos ativos por hora e por dia, só neste PC) e lembretes de bem-estar (pausa, água, postura, hora de dormir).
(() => {
  const P = window.ORION_PAINEIS; if (!P) return;
  const { el, svg, num, minutos, pill, kpi, caixa, linha, btn, vazio, chave, campo, barras, colunas, anel } = P.util;
  let timer = 0;

  async function saude(ctx) {
    const s = await ctx.api('/monitor/saude');
    const disco = s.disco?.totalGB ? ((s.disco.totalGB - s.disco.livreGB) / s.disco.totalGB) * 100 : null;
    const nota = s.nota;
    ctx.corpo.append(
      el('div', { class: 'pn-grade' },
        kpi('Saúde geral', nota + '/100', nota >= 85 ? 'Tudo em ordem' : nota >= 65 ? 'Vale dar uma olhada' : 'Precisa de atenção', 'heart', nota >= 85 ? 'bom' : nota >= 65 ? 'alerta' : 'ruim'),
        kpi('Ligado há', s.ligado_horas >= 48 ? Math.round(s.ligado_horas / 24) + ' dias' : s.ligado_horas + ' h', s.computador || '', 'clock'),
        kpi('Memória livre', (s.ramLivreGB ?? '-') + ' GB', `de ${s.ramTotalGB ?? '-'} GB`, 'cpu'),
        s.bateria ? kpi('Bateria', s.bateria.pct + '%', s.bateria.carregando ? 'Carregando' : 'Na bateria', 'battery', s.bateria.pct <= 15 && !s.bateria.carregando ? 'ruim' : '') : kpi('ORION usando', s.orion_mb + ' MB', 'memória do próprio ORION', 'orbit')),
      el('div', { class: 'pn-grade duas' },
        caixa('Agora', 'gauge', { sub: s.cpuModelo ? `${s.cpuModelo} · ${s.nucleos} núcleos` : '' }, el('div', { class: 'pn-aneis' }, anel('Processador', s.cpu), anel('Memória', s.ram), disco != null ? anel(`Disco C: (${s.disco.livreGB} GB livres)`, disco) : null)),
        caixa('Programas que mais usam memória', 'list', {}, s.processos.length ? barras(s.processos.map((p) => ({ nome: p.nome + (p.instancias > 1 ? ` (${p.instancias})` : ''), valor: p.mb })), (v) => num(v) + ' MB') : el('p', { class: 'pn-nota', text: 'A lista de programas só aparece no Windows.' }))),
      caixa('Avisos', 'alert', {}, s.alertas.length ? el('div', { class: 'pn-linhas' }, s.alertas.map((a) => linha({ ic: 'alert', titulo: a }))) : el('p', { class: 'pn-nota', text: 'Nenhum problema encontrado agora. Atualiza sozinho a cada 5 segundos enquanto esta tela está aberta.' })));
    clearInterval(timer);
    timer = setInterval(() => { if (!ctx.vivo() || ctx.aba !== 'saude') return clearInterval(timer); ctx.atualizar(); }, 5000);
  }

  async function atividade(ctx) {
    clearInterval(timer);
    const r = await ctx.api('/monitor/atividade');
    const horas = r.por_hora.map((v, h) => ({ rotulo: String(h).padStart(2, '0'), valor: v }));
    const semana = r.semana.map((d) => ({ rotulo: new Date(d.dia + 'T12:00:00').toLocaleDateString('pt-BR', { weekday: 'short' }).replace('.', ''), valor: d.minutos }));
    if (!r.ligado) {
      ctx.corpo.append(vazio('activity', 'O registro de atividade está desligado', 'Ligue para ver quanto tempo você passa no PC por dia e por hora. Fica só neste computador.', btn('Ligar o registro', { pri: true, ic: 'power', onclick: async () => { await ctx.api('/monitor/bemestar', { metodo: 'POST', corpo: { monitor: true } }); ctx.recarregar(); } })));
      return;
    }
    ctx.corpo.append(
      el('div', { class: 'pn-grade' },
        kpi('Hoje no PC', minutos(r.minutos), r.primeiro ? `de ${r.primeiro} a ${r.ultimo}` : 'Sem atividade ainda', 'clock'),
        kpi('Sessão mais longa', minutos(r.maior_sessao), `${r.sessoes.length} sessão(ões) hoje`, 'activity', r.maior_sessao >= 120 ? 'alerta' : ''),
        kpi('Média da semana', minutos(r.media_semana) + '/dia', 'últimos 7 dias', 'calendar'),
        kpi('Agora', r.agora ? (r.agora.ativo ? 'Usando o PC' : 'Ausente') : 'Aguardando', r.sequencia_min ? `há ${minutos(r.sequencia_min)} seguidos` : r.registrando ? 'atualiza a cada 30 s' : 'o registro começa ao abrir o ORION', 'monitor', r.agora?.ativo ? 'bom' : '')),
      el('div', { class: 'pn-grade duas' },
        caixa('Por hora (hoje)', 'barchart', { sub: 'Minutos usando o PC em cada hora.' }, colunas(horas, { saltoRotulo: 3, fmt: (v) => v + ' min', rotulo: 'Minutos ativos por hora' })),
        caixa('Últimos 7 dias', 'calendar', {}, colunas(semana, { fmt: (v) => minutos(v), rotulo: 'Minutos ativos por dia' }))),
      caixa('Programas mais usados hoje', 'layers', { sub: r.apps_ligado ? 'Só o nome do programa em primeiro plano; nunca o título da janela nem o conteúdo.' : 'Desligado. Ligue em Bem-estar → "Registrar o programa em uso" se quiser ver esta lista.' },
        r.apps.length ? barras(r.apps.map((a) => ({ nome: a.nome, valor: a.minutos })), (v) => minutos(v)) : el('p', { class: 'pn-nota', text: r.apps_ligado ? 'Ainda sem dados hoje.' : 'Nada registrado.' })),
      caixa('Sessões de hoje', 'list', {}, r.sessoes.length ? el('div', { class: 'pn-linhas' }, r.sessoes.slice().reverse().map((s) => linha({ ic: 'clock', titulo: `${s.inicio} até ${s.fim}`, fim: pill(minutos(s.minutos), s.minutos >= 120 ? 'aviso' : 'azul') }))) : el('p', { class: 'pn-nota', text: 'Uma sessão termina quando você fica 5 minutos longe do teclado e do mouse.' })));
  }

  async function bemestar(ctx) {
    clearInterval(timer);
    const c = await ctx.api('/monitor/bemestar');
    const salvar = async (patch, msg) => { try { await ctx.api('/monitor/bemestar', { metodo: 'POST', corpo: patch }); ctx.toast(msg || 'Salvo.'); } catch (e) { ctx.toast(e.message, 'bad'); } };
    const sel = (opcoes, valor, chaveCfg) => { const s = el('select', {}, opcoes.map(([v, t]) => el('option', { value: String(v), text: t }))); s.value = String(valor); s.addEventListener('change', () => salvar({ [chaveCfg]: Number(s.value) })); return s; };
    const dormir = el('input', { type: 'time', value: c.dormir || '' }); dormir.addEventListener('change', () => salvar({ dormir: dormir.value || '' }));
    const ultimo = (k) => (c.ultimos?.[k] ? 'último aviso ' + P.util.relativo(new Date(c.ultimos[k]).toISOString()) : 'ainda não avisou');
    ctx.corpo.append(
      caixa('Lembretes', 'heart', { sub: 'O ORION avisa na tela, perto do relógio do Windows e (se você quiser) falando. Só conta o tempo em que você está mexendo no PC.' },
        el('div', { class: 'pn-linhas' },
          linha({ ic: 'coffee', titulo: 'Pausa depois de muito tempo seguido', sub: ultimo('pausa'), fim: sel([[0, 'Desligado'], [25, '25 min (pomodoro)'], [45, '45 min'], [50, '50 min'], [60, '1 hora'], [90, '1 h 30'], [120, '2 horas']], c.pausa, 'pausa') }),
          linha({ ic: 'droplet', titulo: 'Beber água', sub: ultimo('agua'), fim: sel([[0, 'Desligado'], [30, 'A cada 30 min'], [45, 'A cada 45 min'], [60, 'A cada 1 hora'], [90, 'A cada 1 h 30'], [120, 'A cada 2 horas']], c.agua, 'agua') }),
          linha({ ic: 'posture', titulo: 'Postura', sub: 'A cada 45 minutos de uso', fim: chave('', c.postura, (v) => salvar({ postura: v })) }),
          linha({ ic: 'bed', titulo: 'Hora de desligar', sub: 'Um aviso por noite depois deste horário (vazio = desligado)', fim: dormir }),
          linha({ ic: 'volume', titulo: 'Falar os lembretes', sub: 'Com a voz do ORION, quando a janela estiver aberta', fim: chave('', c.falar, (v) => salvar({ falar: v })) }))),
      caixa('Privacidade do monitoramento', 'shield', { sub: 'Tudo isto fica só neste PC (por 60 dias) e não vai para a nuvem nem para a inteligência coletiva.' },
        el('div', { class: 'pn-linhas' },
          linha({ ic: 'activity', titulo: 'Registrar o tempo de uso do PC', sub: 'Minutos com teclado ou mouse em uso. Necessário para os lembretes.', fim: chave('', c.monitor, (v) => salvar({ monitor: v }, v ? 'Registro ligado.' : 'Registro desligado.')) }),
          linha({ ic: 'layers', titulo: 'Registrar o programa em uso', sub: 'Só o nome do programa (ex.: chrome). Nunca títulos de janelas.', fim: chave('', c.apps, (v) => salvar({ apps: v }, v ? 'Vou anotar o nome do programa em uso.' : 'Não anoto mais os programas.')) })),
        ctx.host.tipo === 'app' ? el('div', { style: 'margin-top:12px' }, btn('Apagar o histórico de atividade', { perigo: true, ic: 'trash', onclick: async () => { if (!P.util.confirmar('Apagar todo o histórico de atividade deste PC?')) return; await ctx.api('/monitor/atividade/apagar', { metodo: 'POST', corpo: {} }); ctx.toast('Histórico apagado.'); } })) : el('p', { class: 'pn-nota', text: 'Para apagar o histórico, use o app no PC.' })));
  }

  P.registrar({
    id: 'monitor', titulo: 'Monitoramento', sub: 'Saúde, atividade e bem-estar', ic: 'heart', precisaPc: true,
    abas: [{ id: 'saude', nome: 'Saúde do PC', ic: 'gauge' }, { id: 'atividade', nome: 'Atividade', ic: 'activity' }, { id: 'bemestar', nome: 'Bem-estar', ic: 'heart' }],
    render: (ctx) => ({ saude, atividade, bemestar }[ctx.aba] || saude)(ctx),
  });
})();
