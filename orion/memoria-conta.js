'use strict';
// Minha conta → Memória do ORION: o texto que a pessoa escreve sobre si (vale só para a conta dela).
(() => {
  const caixa = document.getElementById('mem-texto');
  if (!caixa) return;
  const btn = document.getElementById('mem-salvar'), selo = document.getElementById('mem-selo'), conta = document.getElementById('mem-conta'), msg = document.getElementById('mem-msg');
  let salvo = '';
  const dizer = (t, erro) => { msg.textContent = t || ''; msg.style.color = erro ? 'var(--danger, #f87171)' : ''; };
  const contar = () => { conta.textContent = `${caixa.value.length} / 6000`; btn.disabled = caixa.value.trim() === salvo.trim(); };
  const pintar = (j) => {
    salvo = j.texto || '';
    selo.textContent = salvo ? 'ativa' : 'vazia';
    selo.className = 'badge' + (salvo ? ' badge-ok' : '');
    if (j.atualizado_em) dizer('Atualizada em ' + new Date(j.atualizado_em).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' }) + '.');
  };
  async function api(metodo, corpo) {
    const r = await fetch('/api/conta/memoria', { method: metodo, credentials: 'same-origin', headers: corpo ? { 'Content-Type': 'application/json' } : {}, body: corpo ? JSON.stringify(corpo) : undefined });
    const j = await r.json().catch(() => ({}));
    if (r.status === 401) { location.href = '../entrar?volta=/orion/conta%23memoria'; throw new Error('login'); }
    if (!r.ok) throw new Error(j.erro || 'Erro ' + r.status);
    return j;
  }
  api('GET').then((j) => { caixa.value = j.texto || ''; pintar(j); contar(); }).catch((e) => { if (e.message !== 'login') { selo.textContent = 'indisponível'; dizer(e.message, true); } });
  caixa.addEventListener('input', contar);
  btn.addEventListener('click', async () => {
    btn.disabled = true; dizer('Salvando…');
    try { const j = await api('PUT', { texto: caixa.value }); pintar(j); dizer(j.texto ? 'Memória salva. O ORION já usa nas próximas conversas.' : 'Memória apagada.'); }
    catch (e) { if (e.message !== 'login') dizer(e.message, true); }
    contar();
  });
})();
