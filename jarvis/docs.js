'use strict';
// Documentação: endereço do servidor nos exemplos, botão de copiar, destaque da seção atual e tabela de planos ao vivo.
(() => {
  const BASE = location.origin;
  document.querySelectorAll('code[data-base]').forEach((c) => { c.textContent = c.textContent.replaceAll('{BASE}', BASE); });
  document.querySelectorAll('.dx-body pre').forEach((pre) => {
    const b = document.createElement('button'); b.type = 'button'; b.className = 'dx-copiar'; b.textContent = 'Copiar';
    b.addEventListener('click', () => navigator.clipboard.writeText(pre.querySelector('code').textContent).then(() => { b.textContent = 'Copiado'; setTimeout(() => { b.textContent = 'Copiar'; }, 1500); }).catch(() => {}));
    pre.append(b);
  });

  // seção atual no menu lateral
  const links = [...document.querySelectorAll('.dx-nav a')];
  const alvos = links.map((a) => document.getElementById(a.getAttribute('href').slice(1))).filter(Boolean);
  const marcar = () => {
    let atual = alvos[0];
    for (const t of alvos) if (t.getBoundingClientRect().top < 140) atual = t;
    links.forEach((a) => a.setAttribute('aria-current', String(atual && a.getAttribute('href') === '#' + atual.id)));
  };
  addEventListener('scroll', marcar, { passive: true }); marcar();

  // planos: tabela comparativa a partir de /api/comercial/planos
  const reais = (c) => (c === 0 ? 'Grátis' : 'R$ ' + (c / 100).toFixed(2).replace('.', ',') + '/mês');
  const MOD = { editor: 'Editor de vídeo', transcritor: 'Transcritor', roteiros: 'Roteiros', mapa: 'Mapeamento de Leads', central: 'Central de automação' };
  const sim = (v, txt) => { const td = document.createElement('td'); td.className = v ? 'sim' : 'nao'; td.textContent = v ? (txt || 'Sim') : 'Não'; return td; };
  fetch('/api/comercial/planos').then((r) => r.json()).then(({ planos }) => {
    const alvo = document.getElementById('tabela-planos'); if (!alvo || !planos?.length) return;
    const linhas = [
      ['Preço', (p) => reais(p.preco_centavos)],
      ['Módulos', (p) => (p.limites.modulos || []).map((m) => MOD[m] || m).join(', ')],
      ['IAs ao mesmo tempo', (p) => (p.limites.ias_max ? String(p.limites.ias_max) : 'Sem limite')],
      ['PCs por conta', (p) => String(p.limites.dispositivos || 1)],
      ['Exportação de vídeo', (p) => ({ '720p': '720p com marca d’água', '1080p': 'Até 1080p', '4k': '4K ilimitada' }[p.limites.export_max] || String(p.limites.export_max || '—'))],
      ['Legendas (transcrição)', (p) => (p.limites.transcricao_max_min ? 'Até ' + p.limites.transcricao_max_min + ' min por vídeo' : 'Ilimitadas')],
      ['Identificação de vozes', (p) => sim(!!p.limites.diarizacao)],
      ['Mapeamento de Leads com CSV', (p) => sim(!!(p.limites.modulos || []).includes('mapa') && !p.limites.mapa_somente_ver)],
      ['Vozes ElevenLabs', (p) => sim(!!p.limites.elevenlabs)],
    ];
    const t = document.createElement('table');
    const cab = t.createTHead().insertRow(); cab.append(document.createElement('th'));
    for (const p of planos) { const th = document.createElement('th'); th.textContent = p.nome + (p.limites.recomendado ? ' · recomendado' : ''); cab.append(th); }
    const corpo = t.createTBody();
    for (const [nome, f] of linhas) {
      const tr = corpo.insertRow(); tr.insertCell().textContent = nome;
      for (const p of planos) { const v = f(p); if (v instanceof HTMLElement) tr.append(v); else tr.insertCell().textContent = v; }
    }
    alvo.replaceChildren(t);
  }).catch(() => { const a = document.getElementById('tabela-planos'); if (a) a.textContent = 'Não foi possível carregar os planos agora. Veja os valores na página inicial.'; });
})();
