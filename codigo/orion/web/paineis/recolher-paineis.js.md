# `orion/web/paineis/recolher-paineis.js`

> **Fonte:** https://assistanceorion.cloud/orion/web/paineis/recolher-paineis.js · baixado em 19/10/2026
> 59 linhas · 4.3 KB · Recolher/expandir painéis

```javascript
'use strict';
// cópia de app/public/paineis/recolher-paineis.js (scripts/copiar-visual-app.js): edite no app e copie de novo

// Painéis da tela principal que minimizam: o da esquerda (áudio, clima, agentes, novidades, histórico) e o da direita
// (conversa, diagnóstico, HUD). Minimizado, o painel vira um trilho fino com ícones; um clique abre de novo.
// A escolha fica guardada neste computador. O da esquerda já começa minimizado: a barra lateral faz a navegação.
(() => {
  if (window.__orionRecolher) return; window.__orionRecolher = true;
  const layout = document.querySelector('.layout');
  if (!layout) return;
  const lateral = layout.querySelector(':scope > .sidebar'), chat = layout.querySelector(':scope > .chat');
  const svg = (n) => { try { return window.ORION_ICONES.svg(n); } catch { return document.createElement('span'); } };
  const ler = () => { try { return { lateral: true, chat: false, ...JSON.parse(localStorage.getItem('orion.layout.recolhidos') || '{}') }; } catch { return { lateral: true, chat: false }; } };
  const gravar = (e) => { try { localStorage.setItem('orion.layout.recolhidos', JSON.stringify(e)); } catch { /* fica só nesta sessão */ } };
  let estado = ler();

  function montar(painel, chave, nome, atalhos) {
    if (!painel) return;
    painel.classList.add('rc-painel');
    const minimizar = document.createElement('button');
    minimizar.type = 'button'; minimizar.className = 'rc-min rc-min-' + chave;
    minimizar.title = 'Minimizar ' + nome; minimizar.setAttribute('aria-label', 'Minimizar ' + nome);
    minimizar.append(svg(chave === 'lateral' ? 'chevleft' : 'chevright'));
    minimizar.addEventListener('click', () => definir(chave, true));
    // na direita o botão entra na linha das abas; na esquerda fica no topo do painel (os painéis cortam o que sai da borda)
    const abasDoChat = chave === 'chat' ? painel.querySelector('.chat-tabs') : null;
    if (abasDoChat) abasDoChat.append(minimizar); else painel.prepend(minimizar);
    const trilho = document.createElement('div'); trilho.className = 'rc-trilho';
    const abrir = document.createElement('button'); abrir.type = 'button'; abrir.className = 'rc-abrir'; abrir.title = 'Abrir ' + nome; abrir.setAttribute('aria-label', 'Abrir ' + nome);
    abrir.append(svg(chave === 'lateral' ? 'chevright' : 'chevleft'));
    trilho.append(abrir);
    for (const [ic, rotulo, acao] of atalhos) {
      const b = document.createElement('button'); b.type = 'button'; b.className = 'rc-atalho'; b.title = rotulo; b.setAttribute('aria-label', rotulo);
      b.append(svg(ic)); b.addEventListener('click', () => { definir(chave, false); acao?.(); });
      trilho.append(b);
    }
    const rot = document.createElement('span'); rot.className = 'rc-rot'; rot.textContent = nome;
    trilho.append(rot);
    abrir.addEventListener('click', () => definir(chave, false));
    painel.append(trilho);
  }
  function aplicar() {
    layout.classList.toggle('sem-lateral', !!estado.lateral && !!lateral);
    layout.classList.toggle('sem-chat', !!estado.chat && !!chat);
    lateral?.classList.toggle('recolhido', !!estado.lateral);
    chat?.classList.toggle('recolhido', !!estado.chat);
    dispatchEvent(new Event('resize')); // o anel de energia se ajusta ao espaço novo
  }
  function definir(chave, recolher) { estado = { ...estado, [chave]: recolher }; gravar(estado); aplicar(); }
  const aba = (v) => () => document.querySelector(`.chat-tabs .ctab[data-view="${v}"]`)?.click();
  montar(lateral, 'lateral', 'painel de agentes', [['users', 'Agentes'], ['sun', 'Clima e áudio'], ['clock', 'Histórico']]);
  // atalhos do painel da direita = as abas que existirem nele (app: Conversa, Painel da loja, Diagnóstico, HUD; web: Conversa, Minhas IAs, Meu PC)
  const IC = { conversa: 'chat', painel: 'store', diagnostico: 'activity', hud: 'grid', ias: 'brain', pc: 'monitor' };
  const abas = [...document.querySelectorAll('.chat-tabs .ctab')].filter((b) => getComputedStyle(b).display !== 'none').map((b) => [IC[b.dataset.view] || 'layers', b.textContent.trim(), aba(b.dataset.view)]);
  montar(chat, 'chat', 'painel de conversa', abas.length ? abas : [['chat', 'Conversa', aba('conversa')]]);
  aplicar();
  window.ORION_LAYOUT = { recolher: definir, estado: () => ({ ...estado }) };
})();

```
