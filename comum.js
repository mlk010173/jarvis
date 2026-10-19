// Funções usadas por todas as páginas
'use strict';

async function api(url, opcoes = {}) {
  const metodo = opcoes.method || 'GET';
  const temCorpo = metodo !== 'GET' && metodo !== 'DELETE';
  const r = await fetch(url, {
    method: metodo,
    headers: temCorpo ? { 'Content-Type': 'application/json' } : {},
    body: temCorpo ? JSON.stringify(opcoes.body || {}) : undefined,
    credentials: 'same-origin',
  });
  const j = await r.json().catch(() => ({}));
  if (!r.ok) { const e = new Error(j.erro || 'Erro ' + r.status); e.status = r.status; throw e; }
  return j;
}

// Cria elementos com segurança (sem innerHTML com dados do usuário)
function h(tag, props, ...filhos) {
  const el = document.createElement(tag);
  for (const [k, v] of Object.entries(props || {})) {
    if (v == null || v === false) continue;
    if (k === 'class') el.className = v;
    else if (k.startsWith('on') && typeof v === 'function') el.addEventListener(k.slice(2), v);
    else if (k === 'value') el.value = v;
    else el.setAttribute(k, v === true ? '' : v);
  }
  for (const f of filhos.flat(Infinity)) if (f != null && f !== false) el.append(f instanceof Node ? f : String(f));
  return el;
}

let toastTimer;
function aviso(msg, tipo = '') {
  let t = document.getElementById('toast');
  if (!t) { t = h('div', { id: 'toast', role: 'status' }); document.body.append(t); }
  t.textContent = msg;
  t.className = 'mostra ' + tipo;
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => { t.className = tipo; }, 3800);
}

async function copiar(txt) {
  try { await navigator.clipboard.writeText(txt); aviso('Copiado!', 'ok'); } catch { aviso('Não deu para copiar. Selecione e use Ctrl+C.', 'erro'); }
}

// Nome do produto e endereço do site (vêm do servidor/.env)
async function aplicarMarca() {
  try {
    const info = await api('/api/info');
    window.INFO = info;
    document.querySelectorAll('[data-marca]').forEach((el) => { el.textContent = info.marca; });
    document.title = document.title.replace(/Orion IA/g, info.marca);
  } catch {}
  document.querySelectorAll('[data-base]').forEach((el) => { el.textContent = el.textContent.replaceAll('{BASE}', location.origin); });
  document.querySelectorAll('[data-copiar]').forEach((b) => b.addEventListener('click', () => {
    const alvo = document.getElementById(b.dataset.copiar);
    if (alvo) copiar(alvo.textContent);
  }));
  return window.INFO;
}

document.addEventListener('DOMContentLoaded', aplicarMarca);
