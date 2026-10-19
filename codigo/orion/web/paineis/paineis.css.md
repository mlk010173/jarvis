# `orion/web/paineis/paineis.css`

> **Fonte:** https://assistanceorion.cloud/orion/web/paineis/paineis.css · baixado em 19/10/2026
> 568 linhas · 56.8 KB · Estilos dos painéis

```css
/* cópia de app/public/paineis/paineis.css (scripts/copiar-visual-app.js): edite no app e copie de novo */
/* ORION 1.7 — barra lateral agrupada e telas dos painéis (o mesmo arquivo no app e no ORION Web).
   Preto com azul neon: a barra é o "trilho" fixo da esquerda; cada painel abre ao lado dela, sobre a área principal. */
:root { --lat-w: 292px; --lat-recolhida: 74px; --topo-app: 64px; --pn-azul: #2E9BFF; --pn-ciano: #00D2FF; --pn-linha: rgba(46, 155, 255, .16); --pn-linha-forte: rgba(46, 155, 255, .4); --pn-texto: #e6f1ff; --pn-mudo: #7f95ae; --pn-fundo: #000; --pn-caixa: #03080f; --pn-ok: #34d399; --pn-aviso: #fbbf24; --pn-erro: #ff5c7a; }

/* ---------- encaixe na tela principal ---------- */
body.com-lateral { padding-left: var(--lat-w); transition: padding-left .28s cubic-bezier(.22, 1, .36, 1); }
body.com-lateral.lat-recolhida { padding-left: var(--lat-recolhida); }
body.com-lateral .modulos-barra { display: none !important; }
body.com-lateral .topbar .brand { display: none; }
body.com-lateral .layout { height: calc(100vh - var(--topo-app)); }
body.com-lateral .mod-palco { left: var(--lat-w); }
body.com-lateral.lat-recolhida .mod-palco { left: var(--lat-recolhida); }

/* enquanto a tela de abertura ou a configuração inicial estão na frente, a barra espera */
body:has(#boot:not(.out)) .lat, body:has(> .ob) .lat { opacity: 0; visibility: hidden; }

/* ---------- painéis da tela principal que minimizam (recolher-paineis.js) ---------- */
.rc-painel { position: relative; }
.rc-min { flex: none; align-self: flex-end; display: grid; place-items: center; width: 28px; height: 28px; margin: -6px 0 -10px; border-radius: 9px; border: 1px solid var(--pn-linha); background: rgba(0, 0, 0, .55); color: #8fc8ff; cursor: pointer; opacity: .6; transition: opacity .2s, border-color .2s; }
.chat-tabs .rc-min { align-self: center; margin: 0 0 0 auto; }
.rc-painel:hover .rc-min, .rc-min:focus-visible { opacity: 1; }
.rc-min:hover { border-color: var(--pn-linha-forte); }
.rc-min svg { width: 15px; height: 15px; }
.rc-trilho { display: none; }
@media (min-width: 981px) {
  .layout.sem-lateral { grid-template-columns: 52px minmax(0, 1fr) minmax(340px, 34%) !important; }
  .layout.sem-chat { grid-template-columns: 250px minmax(0, 1fr) 52px !important; }
  .layout.sem-lateral.sem-chat { grid-template-columns: 52px minmax(0, 1fr) 52px !important; }
  .layout.focus.sem-lateral { grid-template-columns: 52px minmax(0, 1fr) 0 !important; }
  .layout.focus.sem-chat { grid-template-columns: 250px minmax(0, 1fr) 0 !important; }
  .layout.focus.sem-lateral.sem-chat { grid-template-columns: 52px minmax(0, 1fr) 0 !important; }
  .rc-painel.recolhido { padding: 0 !important; overflow: hidden; }
  .rc-painel.recolhido > *:not(.rc-trilho) { display: none !important; }
  .rc-painel.recolhido > .rc-trilho { display: flex; flex-direction: column; align-items: center; gap: 8px; height: 100%; padding: 10px 0; }
  .rc-trilho button { display: grid; place-items: center; width: 34px; height: 34px; border-radius: 10px; border: 1px solid var(--pn-linha); background: rgba(46, 155, 255, .05); color: #8fc8ff; cursor: pointer; transition: border-color .2s, background .2s; }
  .rc-trilho button:hover { border-color: var(--pn-linha-forte); background: rgba(46, 155, 255, .14); color: #fff; }
  .rc-trilho button:focus-visible { outline: 2px solid var(--pn-azul); outline-offset: 2px; }
  .rc-trilho .rc-abrir { color: #00101f; border-color: transparent; background: linear-gradient(135deg, var(--pn-azul), var(--pn-ciano)); margin-bottom: 6px; }
  .rc-trilho svg { width: 16px; height: 16px; }
  .rc-rot { margin-top: auto; writing-mode: vertical-rl; transform: rotate(180deg); font-size: 11px; letter-spacing: .08em; color: var(--pn-mudo); white-space: nowrap; }
}
@media (max-width: 980px) { .rc-min { display: none; } }

/* ---------- barra lateral ---------- */
.lat { position: fixed; z-index: 950; left: 0; top: 0; bottom: 0; width: var(--lat-w); display: grid; grid-template-rows: auto minmax(0, 1fr) auto; color: var(--pn-texto); font-family: 'Geist', ui-sans-serif, 'Segoe UI', sans-serif;
  background: radial-gradient(120% 40% at 0 0, rgba(46, 155, 255, .10), transparent 60%), linear-gradient(180deg, #02070e 0%, #000 55%, #01040a 100%);
  border-right: 1px solid var(--pn-linha); box-shadow: 1px 0 0 rgba(0, 210, 255, .04), 18px 0 50px -40px rgba(46, 155, 255, .7); transition: width .28s cubic-bezier(.22, 1, .36, 1), box-shadow .28s, opacity .5s, visibility .5s; }
.lat-topo { display: flex; align-items: center; gap: 12px; padding: 18px 16px 14px; }
.lat-logo { flex: none; display: grid; place-items: center; width: 40px; height: 40px; border-radius: 12px; border: 1px solid var(--pn-linha-forte); background: radial-gradient(circle at 30% 25%, rgba(46, 155, 255, .35), rgba(0, 16, 31, .9) 70%); box-shadow: 0 0 22px -6px rgba(46, 155, 255, .9), inset 0 1px 0 rgba(160, 210, 255, .2); }
.lat-logo svg { width: 26px; height: 26px; filter: drop-shadow(0 0 6px rgba(46, 155, 255, .9)); }
.lat-marca { min-width: 0; display: grid; line-height: 1.15; }
.lat-marca b { font-size: 16px; font-weight: 750; letter-spacing: .14em; }
.lat-marca small { font-size: 11.5px; color: var(--pn-mudo); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.lat-vivo { margin-left: auto; flex: none; width: 8px; height: 8px; border-radius: 50%; background: var(--pn-ok); box-shadow: 0 0 0 3px rgba(52, 211, 153, .15), 0 0 10px rgba(52, 211, 153, .8); }
.lat-vivo.off { background: #475569; box-shadow: none; }

.lat-rol { overflow-y: auto; overflow-x: hidden; padding: 4px 10px 12px; scrollbar-width: thin; scrollbar-color: rgba(46, 155, 255, .25) transparent; }
.lat-grupo { margin-top: 10px; }
.lat-grupo-cab { display: flex; align-items: center; gap: 8px; width: 100%; padding: 8px 8px 6px; border: 0; background: none; color: #6f86a3; font: 600 10.5px/1 'Geist', sans-serif; letter-spacing: .14em; text-transform: uppercase; cursor: pointer; text-align: left; border-radius: 8px; }
.lat-grupo-cab:hover { color: #a9c6e6; }
.lat-grupo-cab:focus-visible { outline: 2px solid var(--pn-azul); outline-offset: 1px; }
.lat-grupo-cab .lat-seta { margin-left: auto; width: 14px; height: 14px; transition: transform .25s; opacity: .7; }
.lat-grupo.fechado .lat-grupo-cab .lat-seta { transform: rotate(-90deg); }
.lat-grupo-itens { display: grid; gap: 3px; overflow: hidden; }
.lat-grupo.fechado .lat-grupo-itens { display: none; }

.lat-item { position: relative; display: grid; grid-template-columns: 36px minmax(0, 1fr) auto; align-items: center; gap: 11px; width: 100%; padding: 7px 8px; border: 1px solid transparent; border-radius: 13px; background: none; color: inherit; font: inherit; text-align: left; cursor: pointer; text-decoration: none; transition: background .2s, border-color .2s, box-shadow .25s; }
.lat-item:hover { background: rgba(46, 155, 255, .06); border-color: rgba(46, 155, 255, .12); }
.lat-item:focus-visible { outline: 2px solid var(--pn-azul); outline-offset: 1px; }
.lat-ic { display: grid; place-items: center; width: 36px; height: 36px; border-radius: 11px; color: #8fc8ff; border: 1px solid rgba(46, 155, 255, .2); background: linear-gradient(160deg, rgba(46, 155, 255, .10), rgba(46, 155, 255, .02)); transition: background .25s, color .25s, box-shadow .25s; }
.lat-ic .ic, .lat-ic svg { width: 18px; height: 18px; }
.lat-txt { display: grid; min-width: 0; line-height: 1.2; }
.lat-txt b { font-size: 13.5px; font-weight: 600; color: #eaf4ff; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.lat-txt small { margin-top: 2px; font-size: 11.5px; color: var(--pn-mudo); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.lat-fim { display: flex; align-items: center; gap: 6px; }
.lat-fim .lat-seta { width: 15px; height: 15px; color: #6f86a3; transition: transform .25s; }
.lat-item[aria-expanded="true"] .lat-fim .lat-seta { transform: rotate(180deg); color: #a9c6e6; }
.lat-selo { min-width: 20px; height: 20px; padding: 0 6px; border-radius: 99px; display: grid; place-items: center; font-size: 11px; font-weight: 700; color: #1a0007; background: var(--pn-erro); box-shadow: 0 0 12px -2px rgba(255, 92, 122, .9); }
.lat-selo[hidden] { display: none; }
.lat-selo.aviso { color: #1d1300; background: var(--pn-aviso); box-shadow: 0 0 12px -2px rgba(251, 191, 36, .8); }
.lat-selo.info { color: #00101f; background: var(--pn-azul); box-shadow: 0 0 12px -2px rgba(46, 155, 255, .9); }
.lat-item.on { border-color: rgba(46, 155, 255, .38); background: linear-gradient(90deg, rgba(46, 155, 255, .20), rgba(46, 155, 255, .05) 70%, transparent); box-shadow: inset 0 1px 0 rgba(160, 210, 255, .08), 0 0 26px -14px rgba(46, 155, 255, .9); }
.lat-item.on::before { content: ''; position: absolute; left: -10px; top: 10px; bottom: 10px; width: 3px; border-radius: 0 3px 3px 0; background: linear-gradient(180deg, var(--pn-azul), var(--pn-ciano)); box-shadow: 0 0 10px var(--pn-azul); }
.lat-item.on .lat-ic { color: #00101f; border-color: transparent; background: linear-gradient(135deg, var(--pn-azul), var(--pn-ciano)); box-shadow: 0 0 18px -4px rgba(46, 155, 255, .95); }
.lat-filhos { display: grid; gap: 1px; margin: 2px 0 6px 25px; padding-left: 14px; border-left: 1px solid rgba(46, 155, 255, .18); }
.lat-filhos[hidden] { display: none; }
.lat-filho { position: relative; display: flex; align-items: center; gap: 9px; width: 100%; padding: 7px 10px; border: 0; border-radius: 9px; background: none; color: #a7bbd2; font: inherit; font-size: 12.5px; text-align: left; cursor: pointer; }
.lat-filho::before { content: ''; position: absolute; left: -15px; top: 50%; width: 9px; height: 1px; background: rgba(46, 155, 255, .25); }
.lat-filho:hover { color: #fff; background: rgba(46, 155, 255, .07); }
.lat-filho:focus-visible { outline: 2px solid var(--pn-azul); outline-offset: 1px; }
.lat-filho.on { color: #fff; background: rgba(46, 155, 255, .13); }
.lat-filho.on::after { content: ''; position: absolute; left: -18px; top: 50%; width: 7px; height: 7px; margin-top: -3.5px; border-radius: 50%; background: var(--pn-ciano); box-shadow: 0 0 8px var(--pn-ciano); }
.lat-filho .lat-selo { margin-left: auto; }

.lat-pe { display: grid; gap: 8px; padding: 10px 12px 14px; border-top: 1px solid var(--pn-linha); background: linear-gradient(180deg, transparent, rgba(46, 155, 255, .04)); }
.lat-pe-linha { display: flex; align-items: center; gap: 8px; }
.lat-recolher { display: inline-grid; place-items: center; width: 34px; height: 34px; flex: none; border-radius: 10px; border: 1px solid var(--pn-linha); background: rgba(46, 155, 255, .04); color: #8fc8ff; cursor: pointer; transition: border-color .2s, transform .3s; }
.lat-recolher:hover { border-color: var(--pn-linha-forte); }
.lat-recolher svg { width: 17px; height: 17px; transition: transform .3s; }
.lat-ver { font-size: 11px; color: #5b7088; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.lat-ajuda { display: flex; gap: 6px; flex-wrap: wrap; }
.lat-ajuda a { display: inline-flex; align-items: center; gap: 6px; padding: 5px 9px; border-radius: 99px; border: 1px solid var(--pn-linha); color: #a7bbd2; font-size: 11.5px; text-decoration: none; }
.lat-ajuda a:hover { color: #fff; border-color: var(--pn-linha-forte); }
.lat-ajuda svg { width: 13px; height: 13px; color: var(--pn-azul); }

/* recolhida: só ícones; passar o mouse abre por cima (sem empurrar a tela) */
.lat-recolhida .lat { width: var(--lat-recolhida); }
.lat-recolhida .lat .lat-recolher svg { transform: rotate(180deg); }
.lat-recolhida .lat:not(:hover):not(:focus-within) :is(.lat-marca, .lat-vivo, .lat-txt, .lat-fim, .lat-grupo-cab span, .lat-grupo-cab .lat-seta, .lat-filhos, .lat-ver, .lat-ajuda) { display: none; }
.lat-recolhida .lat:not(:hover):not(:focus-within) .lat-item { grid-template-columns: 36px; justify-content: center; padding: 7px 0; }
.lat-recolhida .lat:not(:hover):not(:focus-within) .lat-grupo-cab { justify-content: center; padding: 8px 0 4px; }
.lat-recolhida .lat:not(:hover):not(:focus-within) .lat-grupo-cab::before { content: ''; width: 18px; height: 1px; background: rgba(46, 155, 255, .25); }
.lat-recolhida .lat:not(:hover):not(:focus-within) .lat-grupo.fechado .lat-grupo-itens { display: grid; }
.lat-recolhida .lat:not(:hover):not(:focus-within) .lat-item.on::before { left: -10px; }
.lat-recolhida .lat:not(:hover):not(:focus-within) .lat-topo { justify-content: center; padding-inline: 0; }
.lat-recolhida .lat:not(:hover):not(:focus-within) .lat-pe-linha { justify-content: center; }
.lat-recolhida .lat:hover, .lat-recolhida .lat:focus-within { width: var(--lat-w); box-shadow: 30px 0 80px -30px rgba(0, 0, 0, .95), 18px 0 60px -40px rgba(46, 155, 255, .9); }
.lat-recolhida .lat-item .lat-selo { position: absolute; top: 2px; right: 6px; min-width: 16px; height: 16px; font-size: 10px; }
.lat-recolhida .lat:hover .lat-item .lat-selo, .lat-recolhida .lat:focus-within .lat-item .lat-selo { position: static; min-width: 20px; height: 20px; font-size: 11px; }

/* ---------- palco dos painéis ---------- */
.pn-palco { position: fixed; z-index: 880; top: var(--topo-app); left: var(--lat-w); right: 0; bottom: 0; display: grid; grid-template-rows: auto minmax(0, 1fr); color: var(--pn-texto); font-family: 'Geist', ui-sans-serif, 'Segoe UI', sans-serif;
  background: radial-gradient(70% 50% at 100% 0, rgba(46, 155, 255, .07), transparent 60%), #000; border-top: 1px solid var(--pn-linha); transition: left .28s cubic-bezier(.22, 1, .36, 1); }
.lat-recolhida .pn-palco { left: var(--lat-recolhida); }
.pn-palco[hidden] { display: none; }
.pn-palco.entra { animation: pn-entra .42s cubic-bezier(.22, 1, .36, 1) both; }
@keyframes pn-entra { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: none; } }
.pn-cab { display: flex; align-items: center; flex-wrap: wrap; gap: 14px 18px; padding: 18px 26px 0; }
.pn-cab-ic { display: grid; place-items: center; width: 46px; height: 46px; flex: none; border-radius: 14px; color: #00101f; background: linear-gradient(135deg, var(--pn-azul), var(--pn-ciano)); box-shadow: 0 0 26px -6px rgba(46, 155, 255, .95); }
.pn-cab-ic svg { width: 22px; height: 22px; }
.pn-cab-txt { min-width: 0; }
.pn-cab-txt h1 { margin: 0; font-size: 22px; font-weight: 700; letter-spacing: -.01em; color: #fff; }
.pn-cab-txt p { margin: 3px 0 0; font-size: 13px; color: var(--pn-mudo); }
.pn-cab-acoes { margin-left: auto; display: flex; gap: 8px; flex-wrap: wrap; }
.pn-abas { flex-basis: 100%; display: flex; gap: 4px; padding: 4px; margin-top: 2px; width: max-content; max-width: 100%; overflow-x: auto; border: 1px solid var(--pn-linha); border-radius: 13px; background: rgba(46, 155, 255, .03); }
.pn-aba { display: inline-flex; align-items: center; gap: 7px; padding: 8px 14px; border: 0; border-radius: 9px; background: none; color: #a7bbd2; font: inherit; font-size: 13px; font-weight: 500; white-space: nowrap; cursor: pointer; }
.pn-aba svg { width: 15px; height: 15px; }
.pn-aba:hover { color: #fff; }
.pn-aba.on { color: #00101f; font-weight: 650; background: linear-gradient(135deg, var(--pn-azul), var(--pn-ciano)); box-shadow: 0 0 16px -6px rgba(46, 155, 255, 1); }
.pn-aba:focus-visible { outline: 2px solid var(--pn-azul); outline-offset: 2px; }
.pn-corpo { overflow-y: auto; padding: 18px 26px 40px; scrollbar-width: thin; scrollbar-color: rgba(46, 155, 255, .3) transparent; }

/* o CSS antigo do app deixa títulos em maiúsculas e com espaçamento largo: aqui dentro, não */
html body .pn-palco.pn-palco :is(h1, h2, h3, h4), html body .pn-modal.pn-modal :is(h1, h2, h3, h4), html body .pn-avisos.pn-avisos b { text-transform: none !important; letter-spacing: normal !important; font-family: 'Geist', ui-sans-serif, 'Segoe UI', sans-serif !important; text-shadow: none !important; } /* o tema ORION do app usa !important nos h3 */
html body .pn-palco.pn-palco .pn-caixa > header h3 { font-size: 15px !important; font-weight: 650 !important; color: #fff !important; margin: 0 !important; }
html body .pn-palco.pn-palco .pn-cab-txt h1 { font-size: 22px !important; font-weight: 700 !important; color: #fff !important; margin: 0 !important; }
html body .pn-palco.pn-palco .pn-vazio h2, html body .pn-modal.pn-modal .pn-vazio h2 { font-size: 18px !important; font-weight: 650 !important; color: #fff !important; }
html body .pn-modal.pn-modal .pn-modal-caixa > header h2 { font-size: 18px !important; font-weight: 650 !important; color: #fff !important; margin: 0 !important; }
.pn-graf-vazio { display: grid; place-items: center; height: 150px; font-size: 12.5px; color: var(--pn-mudo); border: 1px dashed rgba(46, 155, 255, .18); border-radius: 12px; }

/* botões próprios (iguais no app e no site) */
.pn-btn { display: inline-flex; align-items: center; justify-content: center; gap: 7px; height: 36px; padding: 0 14px; border-radius: 10px; border: 1px solid var(--pn-linha-forte); background: rgba(46, 155, 255, .06); color: #dcecff; font: inherit; font-size: 13px; font-weight: 550; cursor: pointer; white-space: nowrap; text-decoration: none; transition: background .2s, border-color .2s, box-shadow .25s; }
.pn-btn:hover { background: rgba(46, 155, 255, .14); border-color: var(--pn-azul); }
.pn-btn:focus-visible { outline: 2px solid var(--pn-azul); outline-offset: 2px; }
.pn-btn:disabled { opacity: .45; cursor: not-allowed; }
.pn-btn svg { width: 15px; height: 15px; }
.pn-btn.pri { color: #00101f; border-color: transparent; background: linear-gradient(135deg, var(--pn-azul), var(--pn-ciano)); box-shadow: 0 0 18px -8px rgba(46, 155, 255, 1); }
.pn-btn.pri:hover { box-shadow: 0 0 24px -6px rgba(46, 155, 255, 1); }
.pn-btn.perigo { border-color: rgba(255, 92, 122, .45); color: #ffc2cd; background: rgba(255, 92, 122, .06); }
.pn-btn.perigo:hover { background: rgba(255, 92, 122, .14); border-color: var(--pn-erro); }
.pn-btn.peq { height: 30px; padding: 0 10px; font-size: 12.5px; border-radius: 9px; }
.pn-btn.so-ic { width: 36px; padding: 0; }
.pn-btn.peq.so-ic { width: 30px; }

/* blocos */
.pn-grade { display: grid; gap: 14px; grid-template-columns: repeat(auto-fit, minmax(210px, 1fr)); }
.pn-grade.duas { grid-template-columns: repeat(auto-fit, minmax(340px, 1fr)); }
.pn-kpi { position: relative; overflow: hidden; display: grid; gap: 6px; padding: 16px 18px; border-radius: 16px; border: 1px solid var(--pn-linha); background: linear-gradient(170deg, rgba(46, 155, 255, .08), rgba(3, 8, 15, .9) 60%); }
.pn-kpi small { font-size: 12px; color: var(--pn-mudo); display: flex; align-items: center; gap: 7px; }
.pn-kpi small svg { width: 15px; height: 15px; color: var(--pn-azul); }
.pn-kpi b { font-size: 24px; font-weight: 700; letter-spacing: -.01em; color: #fff; font-variant-numeric: tabular-nums; }
.pn-kpi span { font-size: 12px; color: var(--pn-mudo); }
.pn-kpi.bom b { color: #6ff0bd; } .pn-kpi.ruim b { color: #ff8aa0; } .pn-kpi.alerta b { color: #fcd34d; }
.pn-caixa { margin-top: 16px; padding: 16px 18px; border-radius: 16px; border: 1px solid var(--pn-linha); background: var(--pn-caixa); }
.pn-caixa > header { display: flex; align-items: center; gap: 10px; margin-bottom: 12px; flex-wrap: wrap; }
.pn-caixa > header h3 { margin: 0; font-size: 15px; font-weight: 650; display: flex; align-items: center; gap: 9px; color: #fff; }
.pn-caixa > header h3 svg { width: 17px; height: 17px; color: var(--pn-azul); }
.pn-caixa > header p { margin: 0; flex-basis: 100%; font-size: 12.5px; color: var(--pn-mudo); }
.pn-caixa > header .pn-dir { margin-left: auto; display: flex; gap: 6px; flex-wrap: wrap; }
.pn-nota { font-size: 12.5px; color: var(--pn-mudo); line-height: 1.5; }
.pn-nota a { color: #8fd0ff; }
.pn-linhas { display: grid; gap: 6px; }
.pn-linha { display: grid; grid-template-columns: auto minmax(0, 1fr) auto; align-items: center; gap: 12px; padding: 10px 12px; border-radius: 12px; border: 1px solid rgba(46, 155, 255, .1); background: rgba(46, 155, 255, .025); }
.pn-linha:hover { border-color: rgba(46, 155, 255, .22); }
.pn-linha .pn-ic { display: grid; place-items: center; width: 34px; height: 34px; border-radius: 10px; color: #8fc8ff; border: 1px solid rgba(46, 155, 255, .2); background: rgba(46, 155, 255, .06); }
.pn-linha .pn-ic svg { width: 17px; height: 17px; }
.pn-linha .pn-meio { min-width: 0; display: grid; gap: 2px; }
.pn-linha .pn-meio b { font-size: 13.5px; font-weight: 600; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.pn-linha .pn-meio small { font-size: 12px; color: var(--pn-mudo); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.pn-linha .pn-fim { display: flex; align-items: center; gap: 6px; }
.pn-valor { font-variant-numeric: tabular-nums; font-weight: 650; white-space: nowrap; }
.pn-valor.mais { color: #6ff0bd; } .pn-valor.menos { color: #ff9cb0; }
.pn-pill { display: inline-flex; align-items: center; gap: 5px; height: 22px; padding: 0 9px; border-radius: 99px; font-size: 11.5px; font-weight: 600; border: 1px solid var(--pn-linha); color: #a7bbd2; background: rgba(46, 155, 255, .05); white-space: nowrap; }
.pn-pill.ok { color: #6ff0bd; border-color: rgba(52, 211, 153, .35); background: rgba(52, 211, 153, .08); }
.pn-pill.aviso { color: #fcd34d; border-color: rgba(251, 191, 36, .35); background: rgba(251, 191, 36, .08); }
.pn-pill.erro { color: #ff9cb0; border-color: rgba(255, 92, 122, .4); background: rgba(255, 92, 122, .08); }
.pn-pill.azul { color: #8fd0ff; border-color: var(--pn-linha-forte); background: rgba(46, 155, 255, .1); }

/* formulários */
.pn-form { display: grid; gap: 12px; grid-template-columns: repeat(auto-fit, minmax(170px, 1fr)); align-items: end; }
.pn-form label, .pn-campo { display: grid; gap: 6px; font-size: 12px; color: #a7bbd2; }
.pn-form input, .pn-form select, .pn-form textarea, .pn-campo input, .pn-campo select, .pn-campo textarea, .pn-busca input { width: 100%; height: 38px; padding: 0 12px; border-radius: 10px; border: 1px solid rgba(46, 155, 255, .22); background: #01050b; color: #fff; font: inherit; font-size: 13.5px; outline: none; transition: border-color .2s, box-shadow .2s; box-sizing: border-box; }
.pn-form textarea, .pn-campo textarea { height: auto; min-height: 90px; padding: 10px 12px; resize: vertical; }
.pn-form input:focus, .pn-form select:focus, .pn-form textarea:focus, .pn-campo input:focus, .pn-campo select:focus, .pn-campo textarea:focus, .pn-busca input:focus { border-color: var(--pn-azul); box-shadow: 0 0 0 3px rgba(46, 155, 255, .18); }
.pn-form .larga { grid-column: 1 / -1; }
.pn-form .pn-acoes { display: flex; gap: 8px; flex-wrap: wrap; }
.pn-busca { position: relative; min-width: 200px; flex: 1; max-width: 340px; }
.pn-busca svg { position: absolute; left: 11px; top: 50%; width: 15px; height: 15px; margin-top: -7.5px; color: var(--pn-mudo); }
.pn-busca input { padding-left: 34px; }
.pn-msg { min-height: 1.2em; font-size: 12.5px; margin-top: 8px; }
.pn-msg.ok { color: #6ff0bd; } .pn-msg.erro { color: #ff9cb0; }
.pn-chave { display: inline-flex; align-items: center; gap: 10px; cursor: pointer; font-size: 13px; color: #dcecff; }
.pn-chave input { position: absolute; opacity: 0; width: 1px; height: 1px; }
.pn-chave i { position: relative; width: 38px; height: 22px; flex: none; border-radius: 99px; background: #0d1b2b; border: 1px solid rgba(46, 155, 255, .3); transition: background .2s; }
.pn-chave i::after { content: ''; position: absolute; top: 2px; left: 2px; width: 16px; height: 16px; border-radius: 50%; background: #7f95ae; transition: transform .25s cubic-bezier(.22, 1, .36, 1), background .2s; }
.pn-chave input:checked + i { background: linear-gradient(135deg, var(--pn-azul), var(--pn-ciano)); border-color: transparent; }
.pn-chave input:checked + i::after { transform: translateX(16px); background: #fff; }
.pn-chave input:focus-visible + i { outline: 2px solid var(--pn-azul); outline-offset: 2px; }

/* gráficos (SVG próprios) */
html body svg.pn-graf { width: 100%; height: auto; max-height: 240px; display: block; stroke: none; }
.pn-graf .eixo { fill: #5b7088; font-size: 11px; }
.pn-graf .grade { stroke: rgba(46, 155, 255, .08); }
.pn-barras { display: grid; gap: 9px; }
.pn-barra { display: grid; grid-template-columns: minmax(90px, 160px) minmax(0, 1fr) auto; align-items: center; gap: 12px; font-size: 12.5px; }
.pn-barra > span:first-child { color: #c3d4e8; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.pn-barra .trilho { height: 9px; border-radius: 9px; background: rgba(46, 155, 255, .08); overflow: hidden; }
.pn-barra .trilho i { display: block; height: 100%; border-radius: 9px; background: linear-gradient(90deg, var(--pn-azul), var(--pn-ciano)); box-shadow: 0 0 12px -2px rgba(46, 155, 255, .8); }
.pn-anel { --p: 0; position: relative; width: 108px; height: 108px; border-radius: 50%; display: grid; place-items: center; background: conic-gradient(var(--pn-azul) calc(var(--p) * 1%), rgba(46, 155, 255, .1) 0); }
.pn-anel::before { content: ''; position: absolute; inset: 9px; border-radius: 50%; background: #01050b; }
.pn-anel > * { position: relative; }
.pn-anel b { font-size: 22px; font-weight: 700; }
.pn-anel.quente { background: conic-gradient(var(--pn-erro) calc(var(--p) * 1%), rgba(255, 92, 122, .12) 0); }
.pn-anel.morno { background: conic-gradient(var(--pn-aviso) calc(var(--p) * 1%), rgba(251, 191, 36, .1) 0); }
.pn-aneis { display: flex; gap: 22px; flex-wrap: wrap; align-items: center; }
.pn-anel-rot { display: grid; justify-items: center; gap: 8px; font-size: 12px; color: var(--pn-mudo); }

/* vazio, carregando e "precisa do PC" */
.pn-vazio { display: grid; justify-items: center; text-align: center; gap: 10px; padding: 46px 20px; border: 1px dashed rgba(46, 155, 255, .25); border-radius: 18px; background: radial-gradient(60% 80% at 50% 0, rgba(46, 155, 255, .06), transparent 70%); }
.pn-vazio .pn-vazio-ic { display: grid; place-items: center; width: 56px; height: 56px; border-radius: 16px; color: var(--pn-azul); border: 1px solid var(--pn-linha-forte); background: rgba(46, 155, 255, .08); box-shadow: 0 0 30px -10px rgba(46, 155, 255, .9); }
.pn-vazio .pn-vazio-ic svg { width: 26px; height: 26px; }
.pn-vazio h2 { margin: 6px 0 0; font-size: 18px; color: #fff; }
.pn-vazio p { margin: 0; max-width: 520px; font-size: 13.5px; line-height: 1.55; color: #a7bbd2; }
.pn-vazio .pn-acoes { display: flex; gap: 8px; flex-wrap: wrap; justify-content: center; margin-top: 6px; }
.pn-carregando { display: grid; gap: 12px; }
.pn-carregando i { display: block; height: 64px; border-radius: 14px; background: linear-gradient(90deg, rgba(46, 155, 255, .05), rgba(46, 155, 255, .12), rgba(46, 155, 255, .05)); background-size: 200% 100%; animation: pn-brilho 1.3s linear infinite; }
@keyframes pn-brilho { to { background-position: -200% 0; } }

/* tabela simples */
.pn-tab-rola { overflow-x: auto; }
.pn-tab { width: 100%; border-collapse: collapse; font-size: 13px; }
.pn-tab th { text-align: left; font-weight: 600; font-size: 11.5px; color: var(--pn-mudo); padding: 8px 10px; border-bottom: 1px solid var(--pn-linha); white-space: nowrap; }
.pn-tab td { padding: 9px 10px; border-bottom: 1px solid rgba(46, 155, 255, .07); vertical-align: middle; }
.pn-tab tr:hover td { background: rgba(46, 155, 255, .03); }
.pn-tab td.num { text-align: right; font-variant-numeric: tabular-nums; }

/* logs */
.pn-log { font-family: 'Geist Mono', ui-monospace, Consolas, monospace; font-size: 12px; display: grid; gap: 2px; }
.pn-log div { display: grid; grid-template-columns: 150px 58px minmax(0, 1fr); gap: 10px; padding: 5px 8px; border-radius: 7px; }
.pn-log div:hover { background: rgba(46, 155, 255, .05); }
.pn-log time { color: #5b7088; }
.pn-log .nv { font-weight: 700; }
.pn-log .nv.INFO { color: #8fd0ff; } .pn-log .nv.AVISO { color: #fcd34d; } .pn-log .nv.ERRO { color: #ff9cb0; }
.pn-log span:last-child { color: #c3d4e8; word-break: break-word; }

/* aparelhos (Home Assistant) */
.pn-aparelhos { display: grid; gap: 12px; grid-template-columns: repeat(auto-fill, minmax(230px, 1fr)); }
.pn-ap { display: grid; gap: 10px; padding: 14px; border-radius: 16px; border: 1px solid rgba(46, 155, 255, .14); background: linear-gradient(170deg, rgba(46, 155, 255, .05), rgba(3, 8, 15, .95)); transition: border-color .2s, box-shadow .25s; }
.pn-ap.ligado { border-color: rgba(46, 155, 255, .5); box-shadow: 0 0 28px -14px rgba(46, 155, 255, 1); }
.pn-ap-topo { display: flex; align-items: center; gap: 10px; }
.pn-ap-topo .pn-ic { display: grid; place-items: center; width: 38px; height: 38px; border-radius: 12px; color: #8fc8ff; border: 1px solid rgba(46, 155, 255, .2); background: rgba(46, 155, 255, .06); }
.pn-ap.ligado .pn-ap-topo .pn-ic { color: #00101f; background: linear-gradient(135deg, var(--pn-azul), var(--pn-ciano)); border-color: transparent; }
.pn-ap-topo .pn-ic svg { width: 19px; height: 19px; }
.pn-ap-nome { min-width: 0; display: grid; }
.pn-ap-nome b { font-size: 13.5px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.pn-ap-nome small { font-size: 11.5px; color: var(--pn-mudo); }
.pn-ap-estrela { margin-left: auto; width: 30px; height: 30px; border: 0; border-radius: 9px; background: none; color: #5b7088; cursor: pointer; display: grid; place-items: center; }
.pn-ap-estrela.on { color: #fcd34d; }
.pn-ap-estrela svg { width: 16px; height: 16px; }
.pn-ap-estado { font-size: 20px; font-weight: 700; color: #fff; font-variant-numeric: tabular-nums; }
.pn-ap-acoes { display: flex; gap: 6px; flex-wrap: wrap; align-items: center; }
.pn-ap.ocupado { opacity: .6; pointer-events: none; }

/* componentes (biblioteca) */
.pn-comp-grade { display: grid; gap: 16px; grid-template-columns: repeat(auto-fill, minmax(290px, 1fr)); }
.pn-comp { min-width: 0; display: grid; grid-template-rows: 170px auto; border-radius: 18px; overflow: hidden; border: 1px solid var(--pn-linha); background: var(--pn-caixa); transition: border-color .2s, transform .2s, box-shadow .25s; }
.pn-comp:hover { border-color: var(--pn-linha-forte); box-shadow: 0 18px 40px -26px rgba(46, 155, 255, .8); }
.pn-comp-palco { min-width: 0; position: relative; display: grid; place-items: center; overflow: hidden; background: radial-gradient(80% 90% at 50% 0, rgba(46, 155, 255, .10), transparent 70%), #000; border-bottom: 1px solid rgba(46, 155, 255, .1); }
.pn-comp-palco > div { width: 100%; height: 100%; }
.pn-comp-palco > video, .pn-comp-palco > img { width: 100%; height: 100%; object-fit: cover; display: block; }
.pn-comp.trancado .pn-comp-palco > video, .pn-comp.trancado .pn-comp-palco > img { filter: saturate(.7) brightness(.6); }
.pn-react-palco { border-radius: 16px; overflow: hidden; border: 1px solid rgba(46, 155, 255, .18); background: #000; }
.pn-react-palco > video, .pn-react-palco > img { display: block; width: 100%; max-height: 320px; object-fit: contain; }
.pn-react-blocos { display: grid; gap: 10px; }
.pn-react-sem { display: grid; place-content: center; justify-items: center; gap: 8px; min-height: 170px; height: 100%; padding: 18px; text-align: center; background: radial-gradient(70% 60% at 50% 40%, rgba(46, 155, 255, .16), transparent 70%), linear-gradient(160deg, #04101f, #000); color: #cfe6ff; }
.pn-react-sem svg { width: 34px; height: 34px; color: var(--pn-ciano); filter: drop-shadow(0 0 12px rgba(0, 210, 255, .6)); }
.pn-react-sem b { font-size: 15px; color: #fff; }
.pn-react-sem small { font-size: 12px; color: var(--pn-mudo); }
.pn-bloco { border: 1px solid var(--pn-linha); border-radius: 12px; overflow: hidden; }
.pn-bloco-tit { display: flex; align-items: center; gap: 10px; padding: 8px 8px 8px 14px; border-bottom: 1px solid var(--pn-linha); background: rgba(46, 155, 255, .04); }
.pn-bloco-tit b { flex: 1; min-width: 0; font: 500 12.5px 'Geist Mono', ui-monospace, Consolas, monospace; color: #dcecff; overflow-wrap: anywhere; }
.pn-bloco-tit small { color: var(--pn-mudo); font-size: 12px; }
.pn-bloco .pn-codigo { border: 0; border-radius: 0; max-height: 300px; }
.pn-comp.trancado .pn-comp-palco > div { filter: saturate(.6) brightness(.55); pointer-events: none; }
.pn-comp-cadeado { position: absolute; inset: 0; display: grid; place-items: center; align-content: center; gap: 6px; font-size: 12.5px; color: #dcecff; background: linear-gradient(180deg, transparent, rgba(0, 0, 0, .7)); }
.pn-comp-cadeado svg { width: 22px; height: 22px; color: #fcd34d; }
.pn-comp-info { display: grid; gap: 6px; padding: 12px 14px 14px; }
.pn-comp-info header { display: flex; align-items: center; gap: 8px; }
.pn-comp-info b { font-size: 14px; }
.pn-comp-info p { margin: 0; font-size: 12.5px; color: var(--pn-mudo); line-height: 1.45; }
.pn-comp-info footer { display: flex; gap: 6px; flex-wrap: wrap; margin-top: 4px; }
.pn-filtros { display: flex; gap: 8px; flex-wrap: wrap; align-items: center; margin-bottom: 16px; }
.pn-chip { display: inline-flex; align-items: center; gap: 6px; height: 32px; padding: 0 13px; border-radius: 99px; border: 1px solid var(--pn-linha); background: rgba(46, 155, 255, .03); color: #a7bbd2; font: inherit; font-size: 12.5px; cursor: pointer; }
.pn-chip:hover { color: #fff; border-color: var(--pn-linha-forte); }
.pn-chip.on { color: #00101f; border-color: transparent; background: linear-gradient(135deg, var(--pn-azul), var(--pn-ciano)); font-weight: 600; }
.pn-chip small { opacity: .7; }
.pn-codigo { position: relative; margin: 0; max-height: 340px; overflow: auto; padding: 14px; border-radius: 12px; border: 1px solid var(--pn-linha); background: #01050b; color: #cfe6ff; font: 12px/1.55 'Geist Mono', ui-monospace, Consolas, monospace; white-space: pre; tab-size: 2; }

/* janela de detalhe (dentro do palco) */
.pn-modal { position: fixed; inset: 0; z-index: 990; display: grid; place-items: center; padding: 20px; background: rgba(0, 4, 10, .78); backdrop-filter: blur(6px); }
.pn-modal[hidden] { display: none; }
.pn-modal-caixa { width: min(880px, 100%); max-height: calc(100vh - 40px); overflow: auto; padding: 20px 22px; border-radius: 20px; border: 1px solid var(--pn-linha-forte); background: linear-gradient(180deg, #050d18, #01050b); box-shadow: 0 40px 120px -40px #000, 0 0 60px -30px rgba(46, 155, 255, .9); color: var(--pn-texto); }
.pn-modal-caixa > header { display: flex; align-items: center; gap: 10px; margin-bottom: 14px; }
.pn-modal-caixa > header h2 { margin: 0; font-size: 18px; color: #fff; }
.pn-modal-caixa > header .pn-btn { margin-left: auto; }

/* novidades (changelog) */
.pn-nov-secoes { display: grid; gap: 14px; grid-template-columns: repeat(auto-fit, minmax(240px, 1fr)); }
.pn-nov-sec b { display: block; font-size: 13.5px; color: #fff; margin-bottom: 6px; }
.pn-nov-sec ul { margin: 0; padding-left: 18px; display: grid; gap: 5px; font-size: 13px; line-height: 1.45; color: #c3d4e8; }
.pn-nov-sec li::marker { color: var(--pn-azul); }
/* centralizada na área à direita da barra lateral (sem transform: a animação de entrada usa transform e anularia o translateX) */
.pn-faixa-nov { position: fixed; z-index: 960; top: calc(var(--topo-app) + 12px); left: 16px; right: 16px; margin-inline: auto; display: flex; align-items: center; gap: 14px; max-width: 720px; padding: 12px 12px 12px 14px; border-radius: 16px; border: 1px solid var(--pn-linha-forte); background: linear-gradient(170deg, #071a33, #01050b); box-shadow: 0 24px 60px -24px #000, 0 0 40px -18px rgba(46, 155, 255, 1); color: var(--pn-texto); font-family: 'Geist', ui-sans-serif, 'Segoe UI', sans-serif; animation: pn-entra .45s cubic-bezier(.22, 1, .36, 1) both; }
.pn-faixa-nov .pn-ic { display: grid; place-items: center; width: 38px; height: 38px; flex: none; border-radius: 12px; color: #00101f; background: linear-gradient(135deg, var(--pn-azul), var(--pn-ciano)); }
.pn-faixa-nov .pn-ic svg { width: 18px; height: 18px; }
.pn-faixa-nov > div { flex: 1; min-width: 0; display: grid; gap: 2px; }
.pn-faixa-nov b { font-size: 14px; color: #fff; text-transform: none; letter-spacing: normal; }
.pn-faixa-nov > div span { font-size: 12.5px; color: #a7bbd2; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.pn-faixa-x { width: 30px; height: 30px; flex: none; border: 0; border-radius: 9px; background: none; color: var(--pn-mudo); font-size: 20px; cursor: pointer; }
.pn-faixa-x:hover { color: #fff; background: rgba(46, 155, 255, .1); }
@media (max-width: 640px) { .pn-faixa-nov > div span { white-space: normal; } }

/* avisos que sobem (lembretes) */
.pn-avisos { position: fixed; z-index: 995; right: 18px; bottom: 18px; display: grid; gap: 10px; width: min(380px, calc(100vw - 36px)); }
.pn-aviso { display: grid; grid-template-columns: 38px minmax(0, 1fr) auto; gap: 12px; align-items: start; padding: 13px 14px; border-radius: 16px; border: 1px solid var(--pn-linha-forte); background: linear-gradient(170deg, #071425, #01050b); box-shadow: 0 20px 50px -20px #000, 0 0 40px -20px rgba(46, 155, 255, .9); color: var(--pn-texto); animation: pn-entra .4s cubic-bezier(.22, 1, .36, 1) both; }
.pn-aviso .pn-ic { display: grid; place-items: center; width: 38px; height: 38px; border-radius: 12px; color: #00101f; background: linear-gradient(135deg, var(--pn-azul), var(--pn-ciano)); }
.pn-aviso .pn-ic svg { width: 18px; height: 18px; }
.pn-aviso b { display: block; font-size: 13px; margin-bottom: 3px; }
.pn-aviso p { margin: 0; font-size: 12.5px; line-height: 1.45; color: #c3d4e8; }
.pn-aviso button { width: 28px; height: 28px; border: 0; border-radius: 8px; background: none; color: var(--pn-mudo); cursor: pointer; font-size: 18px; line-height: 1; }

@media (max-width: 1280px) { :root { --lat-w: 264px; } }
@media (max-width: 760px) {
  body.com-lateral, body.com-lateral.lat-recolhida { padding-left: var(--lat-recolhida); }
  .lat { width: var(--lat-recolhida); }
  .pn-palco, .lat-recolhida .pn-palco { left: var(--lat-recolhida); }
  .pn-cab { padding: 14px 16px 0; } .pn-corpo { padding: 14px 16px 30px; }
  .pn-log div { grid-template-columns: 1fr; gap: 2px; }
}
@media (prefers-reduced-motion: reduce) { .lat, body.com-lateral, .pn-palco, .pn-palco.entra, .pn-aviso, .pn-carregando i { transition: none; animation: none; } }

body.lat-recolhida .pn-faixa-nov { left: calc(var(--lat-recolhida) + 16px); }
body:not(.com-lateral) .pn-faixa-nov { left: 16px; }
@media (max-width: 980px) { .pn-faixa-nov { left: 16px; } }
/* a faixa de versão nova centraliza na área de conteúdo: com a barra aberta, recolhida ou sem barra */
body.com-lateral .pn-faixa-nov { left: calc(var(--lat-w) + 16px); }
body.com-lateral.lat-recolhida .pn-faixa-nov { left: calc(var(--lat-recolhida) + 16px); }

/* ---------- Fontes de dados → Projetos ---------- */
.pn-form.pn-proj-form { grid-template-columns: 1fr; align-items: stretch; }
.pn-proj-tit { display: flex; align-items: center; gap: 8px; margin: 10px 0 0; font-size: 14px; font-weight: 650; color: #dcecff; }
.pn-proj-tit svg { width: 16px; height: 16px; color: var(--pn-azul); }
.pn-proj-lista { display: grid; gap: 10px; }
.pn-proj-lista:empty { display: none; }
.pn-proj-item { display: grid; gap: 10px; padding: 12px; border-radius: 14px; border: 1px solid rgba(46, 155, 255, .16); background: rgba(46, 155, 255, .03); }
.pn-proj-linha { display: grid; gap: 10px; grid-template-columns: repeat(auto-fit, minmax(160px, 1fr)); align-items: end; }
.pn-proj-linha > .pn-btn.so-ic { justify-self: end; }
.pn-proj-form .pn-acoes { justify-content: flex-end; margin-top: 6px; }
.pn-proj-form .pn-chave { align-self: center; }
.lat-grupo[hidden] { display: none !important; }

/* ---------- avisos rápidos por cima dos painéis e do editor de sites (antes ficavam escondidos atrás do painel) ---------- */
.toasts { z-index: 1000 !important; }

/* ---------- Leads e clientes ---------- */
.pn-palco [hidden], .pn-modal [hidden], .ld-editor [hidden] { display: none !important; } /* .pn-form label/div usam display:grid e passavam por cima do hidden */
.ld-busca-form { grid-template-columns: minmax(170px, 1.3fr) minmax(170px, 1.3fr) minmax(150px, .9fr) minmax(90px, .5fr) auto; }
.ld-linha-op { display: flex; flex-wrap: wrap; gap: 14px; align-items: center; margin-top: 12px; }
.ld-google { display: flex; align-items: center; gap: 8px; flex-wrap: wrap; margin-top: 12px; padding-top: 12px; border-top: 1px dashed rgba(46, 155, 255, .16); font-size: 12.5px; color: var(--pn-mudo); }
.ld-google > svg { width: 15px; height: 15px; color: var(--pn-azul); flex: none; }
.ld-importar { display: grid; grid-template-columns: minmax(0, 1fr) auto; gap: 8px; }
.ld-importar input { width: 100%; height: 38px; padding: 0 12px; border-radius: 10px; border: 1px solid rgba(46, 155, 255, .22); background: #01050b; color: var(--pn-texto); font: inherit; font-size: 13px; outline: none; }
.ld-importar input:focus { border-color: var(--pn-azul); box-shadow: 0 0 0 3px rgba(46, 155, 255, .18); }
.ld-importar ~ div:not(:empty), .ld-importar ~ .pn-nota { margin-top: 10px; }
.ld-res { display: grid; gap: 8px; }
.ld-card { display: grid; grid-template-columns: minmax(0, 1fr) auto; align-items: center; gap: 8px 14px; padding: 12px 14px; border-radius: 14px; border: 1px solid rgba(46, 155, 255, .12); background: rgba(46, 155, 255, .025); transition: border-color .2s, background .2s; }
.ld-card.clicavel { cursor: pointer; }
.ld-card.clicavel:hover { border-color: var(--pn-linha-forte); background: rgba(46, 155, 255, .05); }
.ld-card:focus-visible { outline: 2px solid var(--pn-azul); outline-offset: 2px; }
.ld-info { min-width: 0; display: grid; gap: 5px; }
.ld-card h4 { margin: 0; font-size: 14px; font-weight: 650; color: #fff; display: flex; align-items: center; gap: 8px; flex-wrap: wrap; }
.ld-card h4 > span:first-child { min-width: 0; overflow: hidden; text-overflow: ellipsis; }
.ld-meta { display: flex; flex-wrap: wrap; gap: 3px 14px; font-size: 12px; color: var(--pn-mudo); }
.ld-meta span, .ld-meta a { display: inline-flex; align-items: center; gap: 5px; min-width: 0; }
.ld-meta a { color: #8fd0ff; text-decoration: none; }
.ld-meta a:hover { text-decoration: underline; }
.ld-meta svg { width: 13px; height: 13px; color: var(--pn-azul); flex: none; }
.ld-acoes { display: flex; gap: 6px; align-items: center; justify-content: flex-end; flex-wrap: wrap; }
.ld-nota { display: inline-flex; align-items: center; gap: 4px; color: #fcd34d; font-size: 12.5px; font-weight: 650; }
.ld-nota svg { width: 14px; height: 14px; fill: currentColor; }
.ld-nota small { color: var(--pn-mudo); font-weight: 500; }
.ld-atrib { margin: 6px 0 0; font-size: 11px; color: #5d7590; }
.ld-fonte { margin-top: 12px; }
.ld-filtrar { margin-bottom: 12px; }
.ld-visao { display: inline-flex; gap: 4px; }
.ld-quadro { display: grid; grid-auto-flow: column; grid-auto-columns: minmax(220px, 1fr); gap: 12px; overflow-x: auto; padding-bottom: 6px; }
.ld-col { display: flex; flex-direction: column; gap: 8px; min-height: 220px; padding: 10px; border-radius: 14px; border: 1px solid var(--pn-linha); background: rgba(46, 155, 255, .02); transition: border-color .15s, background .15s; }
.ld-col.sobre { border-color: var(--pn-azul); background: rgba(46, 155, 255, .09); }
.ld-col > header { display: flex; align-items: center; justify-content: space-between; gap: 8px; padding: 2px 2px 6px; font-size: 12.5px; font-weight: 650; color: #cfe6ff; }
.ld-mini { display: grid; gap: 3px; padding: 10px 11px; border-radius: 11px; border: 1px solid rgba(46, 155, 255, .14); background: #02070e; cursor: grab; }
.ld-mini:hover { border-color: var(--pn-linha-forte); }
.ld-mini:active { cursor: grabbing; }
.ld-mini:focus-visible { outline: 2px solid var(--pn-azul); outline-offset: 1px; }
.ld-mini b { font-size: 13px; color: #fff; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.ld-mini small { font-size: 11.5px; color: var(--pn-mudo); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
/* janela do lead */
.ld-det-topo { display: flex; flex-wrap: wrap; align-items: center; gap: 8px 12px; margin-bottom: 8px; }
.ld-contatos { display: flex; flex-wrap: wrap; gap: 8px; }
.ld-secao { margin-top: 18px; padding-top: 14px; border-top: 1px solid rgba(46, 155, 255, .12); display: grid; gap: 10px; }
.ld-tit { margin: 0; display: flex; align-items: center; gap: 8px; font-size: 14px; font-weight: 650; color: #fff; }
.ld-tit svg { width: 16px; height: 16px; color: var(--pn-azul); flex: none; }
.ld-secao textarea, .ld-ab textarea { width: 100%; min-height: 84px; padding: 10px 12px; border-radius: 10px; border: 1px solid rgba(46, 155, 255, .22); background: #01050b; color: var(--pn-texto); font: inherit; font-size: 13px; resize: vertical; outline: none; }
.ld-secao textarea:focus, .ld-ab textarea:focus { border-color: var(--pn-azul); box-shadow: 0 0 0 3px rgba(46, 155, 255, .18); }
.ld-ab { display: grid; gap: 10px; }
.ld-pontos { margin: 0; padding-left: 18px; font-size: 13px; color: #cfe6ff; display: grid; gap: 4px; }
.ld-hist-novo { display: grid; grid-template-columns: 130px minmax(0, 1fr) auto; gap: 8px; }
.ld-hist-novo select, .ld-hist-novo input { height: 36px; padding: 0 10px; border-radius: 10px; border: 1px solid rgba(46, 155, 255, .22); background: #01050b; color: var(--pn-texto); font: inherit; font-size: 13px; outline: none; }
.ld-hist { display: grid; gap: 6px; max-height: 220px; overflow: auto; }
.ld-hist > div { font-size: 12.5px; color: #cfe6ff; padding: 7px 10px; border-radius: 9px; background: rgba(46, 155, 255, .04); }
.ld-hist time { margin-right: 8px; font-size: 11.5px; color: var(--pn-mudo); font-variant-numeric: tabular-nums; }
.ld-hist b { margin-right: 4px; font-weight: 600; color: #8fd0ff; }
.ld-det { margin-top: 18px; padding-top: 12px; border-top: 1px solid rgba(46, 155, 255, .12); }
.ld-det > summary { cursor: pointer; font-size: 13.5px; font-weight: 650; color: #cfe6ff; margin-bottom: 10px; }
.ld-horario { margin: 10px 0 0; }
.ld-passos { margin: 0 0 14px; padding-left: 20px; display: grid; gap: 6px; font-size: 13px; color: #cfe6ff; }
.ld-passos a { color: #8fd0ff; }
.ld-cod-mini { font: 12px/1.5 'Geist Mono', ui-monospace, Consolas, monospace !important; }
/* seus sites */
.ld-sites { display: grid; gap: 12px; grid-template-columns: repeat(auto-fill, minmax(280px, 1fr)); }
.ld-site { display: grid; gap: 10px; align-content: start; padding: 14px 16px; border-radius: 16px; border: 1px solid var(--pn-linha); background: linear-gradient(170deg, rgba(46, 155, 255, .07), rgba(3, 8, 15, .95) 55%); }
.ld-site > header { display: flex; align-items: center; justify-content: space-between; gap: 10px; }
.ld-site h4 { margin: 0; font-size: 14.5px; font-weight: 650; color: #fff; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.ld-link { display: flex; align-items: center; gap: 6px; min-width: 0; padding: 4px 4px 4px 10px; border-radius: 10px; border: 1px solid var(--pn-linha); background: #01050b; font-size: 12px; color: #8fd0ff; }
.ld-link > span { min-width: 0; flex: 1; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
/* editor do site (tela cheia) */
.ld-editor { position: fixed; inset: 0; z-index: 970; display: grid; grid-template-rows: auto minmax(0, 1fr); color: var(--pn-texto); font-family: 'Geist', ui-sans-serif, 'Segoe UI', sans-serif; background: #000; }
.ld-ed-carregando { display: grid; place-items: center; min-height: 60vh; }
.ld-ed-topo { display: flex; align-items: center; gap: 10px; flex-wrap: wrap; padding: 10px 16px; border-bottom: 1px solid var(--pn-linha); background: rgba(3, 8, 15, .96); }
.ld-ed-nome { flex: 1 1 200px; max-width: 340px; height: 36px; padding: 0 12px; border-radius: 10px; border: 1px solid rgba(46, 155, 255, .22); background: #01050b; color: #fff; font: inherit; font-size: 14px; font-weight: 600; outline: none; }
.ld-ed-nome:focus { border-color: var(--pn-azul); box-shadow: 0 0 0 3px rgba(46, 155, 255, .18); }
.ld-ed-pub { margin-left: auto; display: flex; align-items: center; gap: 8px; flex-wrap: wrap; justify-content: flex-end; }
.ld-ed-pub .ld-link { max-width: 320px; }
.ld-ed-corpo { display: grid; grid-template-columns: 360px minmax(0, 1fr); min-height: 0; }
.ld-ed-lado { display: flex; flex-direction: column; gap: 18px; padding: 16px; border-right: 1px solid var(--pn-linha); overflow: auto; background: #01050b; }
.ld-ed-lado .ld-tit { margin-bottom: 6px; }
.ld-ed-lado textarea { width: 100%; padding: 10px 12px; border-radius: 10px; border: 1px solid rgba(46, 155, 255, .22); background: #000; color: var(--pn-texto); font: inherit; font-size: 13px; resize: vertical; outline: none; }
.ld-ed-lado textarea:focus { border-color: var(--pn-azul); box-shadow: 0 0 0 3px rgba(46, 155, 255, .18); }
.ld-sugestoes { display: flex; flex-wrap: wrap; gap: 6px; margin-top: 12px; }
.ld-sugestoes .pn-chip { height: auto; min-height: 28px; padding: 5px 11px; font-size: 12px; text-align: left; line-height: 1.3; }
.ld-ia-estado { display: flex; align-items: center; gap: 8px; margin-top: 10px; font-size: 12.5px; color: #8fd0ff; }
.ld-gira { flex: none; width: 14px; height: 14px; border-radius: 50%; border: 2px solid rgba(46, 155, 255, .25); border-top-color: var(--pn-ciano); animation: ld-gira .8s linear infinite; }
@keyframes ld-gira { to { transform: rotate(360deg); } }
@media (prefers-reduced-motion: reduce) { .ld-gira { animation-duration: 2.4s; } }
.ld-versoes { display: grid; gap: 6px; }
.ld-versao { display: grid; grid-template-columns: minmax(0, 1fr) auto; align-items: center; gap: 8px; padding: 7px 9px; border-radius: 10px; border: 1px solid rgba(46, 155, 255, .1); font-size: 12px; }
.ld-versao b { display: block; font-weight: 550; color: #cfe6ff; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.ld-versao small { color: var(--pn-mudo); }
.ld-ed-palco { display: grid; grid-template-rows: auto minmax(0, 1fr); min-height: 0; }
.ld-ed-barra { display: flex; align-items: center; justify-content: space-between; gap: 10px; flex-wrap: wrap; padding: 10px 14px; border-bottom: 1px solid var(--pn-linha); }
.ld-ed-barra .pn-abas { margin: 0; }
.ld-aparelhos { display: flex; gap: 6px; }
.ld-ed-tela { min-height: 0; display: grid; padding: 14px; background: radial-gradient(60% 50% at 50% 0, rgba(46, 155, 255, .08), transparent 70%), #000; }
.ld-ed-tela iframe { width: 100%; height: 100%; min-height: 420px; border: 1px solid var(--pn-linha); border-radius: 12px; background: #fff; }
.ld-ed-tela.celular iframe { width: 390px; max-width: 100%; justify-self: center; border-radius: 26px; border: 6px solid #0b1626; }
.ld-ed-codigo { width: 100%; height: 100%; min-height: 420px; padding: 14px; border-radius: 12px; border: 1px solid var(--pn-linha); background: #01050b; color: #cfe6ff; font: 12px/1.55 'Geist Mono', ui-monospace, Consolas, monospace; tab-size: 2; resize: none; outline: none; }
.ld-ed-codigo:focus { border-color: var(--pn-azul); }
@media (max-width: 960px) {
  .ld-busca-form { grid-template-columns: 1fr 1fr; }
  .ld-ed-corpo { display: flex; flex-direction: column; overflow: auto; }
  .ld-ed-lado { flex: none; overflow: visible; border-right: 0; border-bottom: 1px solid var(--pn-linha); }
  .ld-ed-palco { flex: none; height: 82vh; }
  .ld-ed-pub { margin-left: 0; justify-content: flex-start; }
}
@media (max-width: 560px) {
  .ld-busca-form, .ld-importar, .ld-hist-novo { grid-template-columns: 1fr; }
  .ld-card { grid-template-columns: 1fr; }
  .ld-acoes { justify-content: flex-start; }
}

/* ---------- Sites prontos (Componentes) ---------- */
.ex-grade { display: grid; gap: 14px; grid-template-columns: repeat(auto-fill, minmax(280px, 1fr)); }
.ex-card { display: grid; grid-template-rows: auto 1fr auto; gap: 12px; padding: 12px 12px 14px; border-radius: 18px; border: 1px solid var(--pn-linha); background: #02070e; }
.ex-capa { position: relative; display: grid; align-content: end; gap: 2px; height: 150px; padding: 16px; border: 0; border-radius: 12px; cursor: pointer; text-align: left; overflow: hidden; color: #fff; font: inherit;
  background: radial-gradient(70% 90% at 85% 15%, var(--c2), transparent 60%), linear-gradient(150deg, var(--c1), var(--c1) 55%, var(--c3)); }
.ex-capa i { position: absolute; right: -24px; top: -24px; width: 120px; height: 120px; border-radius: 50%; border: 14px solid color-mix(in srgb, var(--c3) 70%, transparent); opacity: .7; }
.ex-capa b { position: relative; font-size: 20px; font-weight: 800; text-shadow: 0 2px 14px rgba(0, 0, 0, .45); }
.ex-capa small { position: relative; font-size: 12.5px; opacity: .9; text-shadow: 0 1px 8px rgba(0, 0, 0, .5); }
.ex-capa:focus-visible { outline: 2px solid var(--pn-azul); outline-offset: 3px; }
.ex-info h4 { margin: 0 0 4px; font-size: 15px; color: #fff; }
.ex-info p { margin: 0 0 8px; }
.ex-tags { display: flex; flex-wrap: wrap; gap: 6px; }
.ex-barra { display: flex; align-items: center; justify-content: space-between; gap: 10px; flex-wrap: wrap; margin-bottom: 10px; }
.ex-quadro { display: block; width: 100%; height: 70vh; border: 1px solid var(--pn-linha); border-radius: 12px; background: #fff; }
.ex-quadro.cel { width: 390px; max-width: 100%; margin: 0 auto; border-radius: 26px; border: 6px solid #0b1626; }

/* ---------- editor do site: abas do lado e Entrega ---------- */
.ld-lado-abas { margin: 0 0 4px; }
.ld-entrega { display: grid; gap: 12px; }
.ld-passo { padding: 14px; border-radius: 14px; border: 1px solid rgba(46, 155, 255, .14); background: rgba(46, 155, 255, .03); display: grid; gap: 10px; }
.ld-passo .pn-nota { margin: 0; }
.ld-passo > .pn-btn, .ld-passo > .pn-pill { justify-self: start; }
.ld-passo-cab { display: flex; align-items: center; gap: 10px; }
.ld-passo-cab b { font-size: 14px; color: #fff; }
.ld-passo-n { display: grid; place-items: center; width: 24px; height: 24px; border-radius: 50%; font-size: 12px; font-weight: 700; color: #00101f; background: linear-gradient(135deg, var(--pn-azul), var(--pn-ciano)); flex: none; }
.ld-checklist { display: grid; gap: 8px; }
.ld-checklist .pn-chave span { font-size: 13px; }
.ld-dns code { font-family: 'Geist Mono', ui-monospace, Consolas, monospace; font-size: 12px; color: #9fe3ff; word-break: break-all; }
.ld-dns td, .ld-dns th { padding: 6px 8px; }
.ld-achados { margin: 0; padding: 0; list-style: none; display: grid; gap: 6px; font-size: 12.5px; color: #cfe6ff; }
.ld-achados li { display: flex; gap: 6px; align-items: flex-start; }
.ld-passo .pn-campo input { height: 36px; }

/* ---------- conversa com o lead ---------- */
.ld-fio { display: grid; gap: 8px; max-height: 260px; overflow: auto; padding: 4px 2px; }
.ld-bolha { max-width: 82%; padding: 9px 12px; border-radius: 14px; font-size: 13px; line-height: 1.45; display: grid; gap: 2px; }
.ld-bolha small { font-size: 11px; opacity: .7; }
.ld-bolha.dele { justify-self: start; background: #0c1726; border: 1px solid rgba(46, 155, 255, .18); border-bottom-left-radius: 4px; }
.ld-bolha.sua { justify-self: end; background: rgba(46, 155, 255, .16); border: 1px solid rgba(46, 155, 255, .35); border-bottom-right-radius: 4px; }
.ld-secao > input { width: 100%; height: 36px; padding: 0 12px; border-radius: 10px; border: 1px solid rgba(46, 155, 255, .22); background: #01050b; color: var(--pn-texto); font: inherit; font-size: 13px; outline: none; }
.ld-secao > input:focus { border-color: var(--pn-azul); box-shadow: 0 0 0 3px rgba(46, 155, 255, .18); }
.ld-sugs { display: grid; gap: 10px; }
.ld-sug { display: grid; gap: 8px; padding: 12px; border-radius: 12px; border: 1px solid rgba(46, 155, 255, .16); background: rgba(46, 155, 255, .03); }
.ld-sug .pn-pill { justify-self: start; }

/* Leads e clientes: mapa dos resultados (pn-leads-mapa.js) */
.ld-vista { display: inline-flex; gap: 6px; }
.ld-mapa-bloco { display: grid; gap: 10px; }
.ld-mapa { height: 460px; border-radius: 14px; overflow: hidden; border: 1px solid rgba(46, 155, 255, .22); background: #05080d; position: relative; }
.ld-mapa .leaflet-container { width: 100%; height: 100%; background: #0a1220; font: inherit; outline: none; }
.ld-mapa .leaflet-tile-pane { filter: invert(1) hue-rotate(205deg) saturate(.6) brightness(.82) contrast(.92); } /* mapa claro do OpenStreetMap vira escuro azulado */
.ld-mapa .pn-msg { margin: 16px; }
.ld-mapa .leaflet-bar a, .ld-mapa .leaflet-bar a:hover { background: #07101d; color: #cfe6ff; border-color: rgba(46, 155, 255, .3); }
.ld-mapa .leaflet-bar a:hover { background: #0c1b31; }
.ld-mapa .leaflet-control-attribution { background: rgba(2, 8, 18, .78); color: #8fa6c2; font-size: 10.5px; }
.ld-mapa .leaflet-control-attribution a { color: #8fd0ff; }
.ld-pin-caixa { background: none; border: 0; }
.ld-pin { display: grid; place-items: center; width: 30px; height: 30px; border-radius: 50% 50% 50% 0; transform: rotate(-45deg); background: #3b4657; border: 2px solid rgba(255, 255, 255, .85); box-shadow: 0 4px 12px rgba(0, 0, 0, .55); transition: transform .15s; }
.ld-pin b { transform: rotate(45deg); font-size: 11px; font-weight: 700; color: #fff; line-height: 1; }
.ld-pin.sem-site { background: linear-gradient(135deg, #2e9bff, #00d2ff); box-shadow: 0 0 14px rgba(46, 155, 255, .85), 0 4px 12px rgba(0, 0, 0, .55); }
.ld-pin.escolhido { transform: rotate(-45deg) scale(1.28); border-color: #fff; box-shadow: 0 0 0 4px rgba(0, 210, 255, .35), 0 0 22px rgba(0, 210, 255, .95); }
.ld-mapa-leg { margin: 0; }
.ld-leg { display: inline-block; width: 10px; height: 10px; border-radius: 50%; background: #6b7688; margin: 0 5px 0 12px; vertical-align: middle; }
.ld-leg.sem-site { background: #2e9bff; box-shadow: 0 0 8px #2e9bff; margin-left: 0; }
.ld-mapa-det:empty { display: none; }
@media (max-width: 720px) { .ld-mapa { height: 340px; } }
@media (prefers-reduced-motion: reduce) { .ld-pin { transition: none; } }

```
