# `orion/ias-tutorial.js`

> **Fonte:** https://assistanceorion.cloud/orion/ias-tutorial.js · baixado em 19/10/2026
> 55 linhas · 5.8 KB · Tutorial de chaves de IA (Gemini, Groq, OpenRouter...)

```javascript
'use strict';
// Passo a passo para pegar a chave de cada IA (site: começar e ORION Web; app: Configurações → Cérebro).
// Aparece aberto na primeira vez que a pessoa precisa colocar uma chave. Mesmo arquivo no site e no app (copiar-visual-app.js).
//   ORION_IAS_TUTORIAL.montar(id, { onde: 'pc' | 'nuvem', aberto: true }) → elemento pronto
(() => {
  if (window.ORION_IAS_TUTORIAL) return;
  const D = {
    gemini: { nome: 'Gemini (Google)', site: 'https://aistudio.google.com/apikey', gratis: true, formato: 'AIza…',
      passos: ['Abra o Google AI Studio e entre com a sua conta Google.', 'Se aparecer, aceite os termos de uso.', 'Clique em "Create API key" (Criar chave de API) e escolha um projeto (ou deixe ele criar um).', 'Copie a chave que aparece e cole aqui.'],
      dica: 'Grátis, com limite diário generoso. É a melhor para começar.' },
    groq: { nome: 'Groq', site: 'https://console.groq.com/keys', gratis: true, formato: 'gsk_…',
      passos: ['Abra o console da Groq e entre com Google, GitHub ou e-mail.', 'Clique em "Create API Key" e dê um nome (ex.: ORION).', 'Copie a chave na hora (ela só aparece uma vez) e cole aqui.'],
      dica: 'Grátis e muito rápida. Boa como segunda IA da fila.' },
    openrouter: { nome: 'OpenRouter', site: 'https://openrouter.ai/keys', gratis: true, formato: 'sk-or-…',
      passos: ['Abra o OpenRouter e entre (Google, GitHub ou e-mail).', 'Na página de chaves, clique em "Create Key".', 'Copie a chave e cole aqui.'],
      dica: 'Tem modelos gratuitos (os que terminam em ":free"); o ORION escolhe sozinho.' },
    mistral: { nome: 'Mistral', site: 'https://console.mistral.ai/api-keys', gratis: true, formato: '',
      passos: ['Crie a conta no console da Mistral.', 'Escolha o plano gratuito "Experiment" (ele confirma o seu telefone).', 'Em API Keys, clique em "Create new key", copie e cole aqui.'],
      dica: 'Plano grátis para testes, com limite por minuto.' },
    deepseek: { nome: 'DeepSeek', site: 'https://platform.deepseek.com/api_keys', gratis: false, formato: 'sk-…',
      passos: ['Crie a conta na plataforma da DeepSeek.', 'Coloque um pouco de crédito (é barato).', 'Em API keys, clique em "Create new API key", copie e cole aqui.'],
      dica: 'Pago por uso, mas custa centavos.' },
    openai: { nome: 'OpenAI (ChatGPT)', site: 'https://platform.openai.com/api-keys', gratis: false, formato: 'sk-…',
      passos: ['Entre na plataforma da OpenAI com a sua conta.', 'Em Billing, coloque crédito (a assinatura do ChatGPT Plus não vale para a API).', 'Em API keys, clique em "Create new secret key", copie e cole aqui.'],
      dica: 'Pago por uso.' },
    anthropic: { nome: 'Claude (Anthropic)', site: 'https://console.anthropic.com/settings/keys', gratis: false, formato: 'sk-ant-…',
      passos: ['Entre no Console da Anthropic.', 'Em Billing, coloque crédito (a assinatura Claude Pro não vale para a API).', 'Em API Keys, clique em "Create Key", copie e cole aqui.'],
      dica: 'Pago por uso.' },
  };
  D['claude-api'] = D.anthropic;
  const css = `.ia-tut{margin:10px 0 4px;padding:12px 14px;border-radius:12px;border:1px solid rgba(46,155,255,.35);background:rgba(46,155,255,.06);font-size:13.5px;line-height:1.5}
  .ia-tut summary{cursor:pointer;font-weight:600;list-style:none;display:flex;align-items:center;gap:8px}.ia-tut summary::-webkit-details-marker{display:none}
  .ia-tut summary::before{content:'';width:7px;height:7px;border-right:2px solid currentColor;border-bottom:2px solid currentColor;transform:rotate(-45deg);transition:transform .2s;flex:none}
  .ia-tut[open] summary::before{transform:rotate(45deg)}
  .ia-tut ol{margin:10px 0 8px;padding-left:22px}.ia-tut li{margin:3px 0}
  .ia-tut .ia-tut-acoes{display:flex;flex-wrap:wrap;align-items:center;gap:10px;margin-top:6px}
  .ia-tut .ia-tut-link{display:inline-flex;align-items:center;gap:6px;padding:6px 12px;border-radius:9px;background:rgba(46,155,255,.18);border:1px solid rgba(46,155,255,.45);color:inherit;text-decoration:none;font-weight:600}
  .ia-tut .ia-tut-link:hover{background:rgba(46,155,255,.3)}.ia-tut small{opacity:.75}.ia-tut .ia-tut-selo{font-size:11.5px;padding:2px 8px;border-radius:999px;border:1px solid rgba(52,211,153,.45);color:#34d399}
  .ia-tut .ia-tut-selo.pago{border-color:rgba(251,191,36,.45);color:#fbbf24}`;
  function estilo() { if (!document.getElementById('ia-tut-css')) { const s = document.createElement('style'); s.id = 'ia-tut-css'; s.textContent = css; document.head.appendChild(s); } }
  const el = (tag, attrs = {}, ...fs) => { const e = document.createElement(tag); for (const [k, v] of Object.entries(attrs)) { if (v == null || v === false) continue; if (k === 'class') e.className = v; else if (k === 'text') e.textContent = v; else e.setAttribute(k, v === true ? '' : v); } for (const f of fs.flat()) if (f != null) e.append(f instanceof Node ? f : document.createTextNode(String(f))); return e; };
  function montar(id, { onde = 'pc', aberto = false, nota = true } = {}) {
    estilo();
    const d = D[id];
    if (!d) return el('div');
    const host = (() => { try { return new URL(d.site).host; } catch { return d.site; } })();
    return el('details', { class: 'ia-tut', open: aberto },
      el('summary', {}, `Não tenho a chave do ${d.nome}: como pegar`, el('span', { class: 'ia-tut-selo' + (d.gratis ? '' : ' pago'), text: d.gratis ? 'grátis' : 'pago' })),
      el('ol', {}, d.passos.map((p) => el('li', { text: p }))),
      el('div', { class: 'ia-tut-acoes' }, el('a', { class: 'ia-tut-link', href: d.site, target: '_blank', rel: 'noopener', text: 'Abrir ' + host }), el('small', { text: d.dica })),
      el('small', { text: (d.formato ? `A chave começa com ${d.formato}. ` : '') + (!nota ? '' : onde === 'pc' ? 'Ela fica só no seu PC, protegida pelo Windows.' : 'Ela fica cifrada no servidor e só a sua conta usa.') }));
  }
  window.ORION_IAS_TUTORIAL = { montar, dados: D };
})();

```
