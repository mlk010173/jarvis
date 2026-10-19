'use strict';
// Cartão "Baixar o JARVIS para Windows" da página Minha conta: versão, tamanho e SHA-256 do instalador publicado.
(() => {
  const caixa = document.getElementById('baixar');
  if (!caixa) return;
  const $ = (id) => document.getElementById(id);
  const mb = (b) => (b / 1048576).toFixed(0) + ' MB';
  fetch('/api/download/info').then((r) => r.json()).then((i) => {
    if (!i.disponivel) { $('baixar-versao').textContent = 'em breve'; $('baixar-texto').textContent = 'O instalador ainda não foi publicado. Assim que sair, ele aparece aqui.'; return; }
    $('baixar-versao').textContent = `versão ${i.versao} · ${mb(i.bytes)}`; $('baixar-versao').className = 'badge badge-ok';
    $('baixar-btn').hidden = false;
    const sha = $('baixar-sha'); sha.hidden = false; sha.textContent = 'SHA-256: ' + i.sha256; sha.style.fontFamily = 'var(--mono)'; sha.style.wordBreak = 'break-all';
  }).catch(() => { $('baixar-versao').textContent = 'indisponível'; });
})();
