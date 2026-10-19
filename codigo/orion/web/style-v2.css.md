# `orion/web/style-v2.css`

> **Fonte:** https://assistanceorion.cloud/orion/web/style-v2.css · baixado em 19/10/2026
> 332 linhas · 25.3 KB · Refinamentos visuais

```css
/* cópia de app/public/style-v2.css (scripts/copiar-visual-app.js): edite no app e copie de novo */
/* =================== v2: painel da loja, contas, IAs, áudio =================== */
.stat-hoje span { font-family: var(--font-hud); font-size: 12px; color: var(--green); letter-spacing: .06em; white-space: nowrap; }
.stat-hoje { cursor: pointer; }
.audio-banner {
  position: fixed; top: 74px; left: 50%; transform: translateX(-50%); z-index: 40;
  display: flex; align-items: center; gap: 12px; padding: 10px 14px;
  background: #1d1208; border: 1px solid rgba(255,182,72,.6); border-radius: var(--radius); color: #ffe2b8;
  box-shadow: 0 10px 30px rgba(0,0,0,.45); font-size: 15px;
}
.audio-banner svg { color: var(--amber); }

/* abas do painel direito */
.chat-tabs { display: flex; border-bottom: 1px solid var(--line); }
.ctab { flex: 1; background: none; border: 0; border-bottom: 2px solid transparent; padding: 11px 10px; color: var(--muted); cursor: pointer; font-family: var(--font-hud); font-size: 11px; letter-spacing: .2em; text-transform: uppercase; }
.ctab.active { color: var(--accent); border-bottom-color: var(--accent); background: rgba(var(--accent-rgb), .04); }
.view { display: none; flex-direction: column; flex: 1; min-height: 0; }
.view.active { display: flex; }

/* painel da loja */
.painel { flex: 1; overflow-y: auto; padding: 14px 16px 18px; display: flex; flex-direction: column; gap: 16px; }
.kpis { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; }
.kpi { border: 1px solid var(--line); border-radius: var(--radius); padding: 10px 12px; background: rgba(2,10,18,.45); position: relative; overflow: hidden; }
.kpi::after { content: ''; position: absolute; left: 0; top: 0; bottom: 0; width: 2px; background: var(--accent); opacity: .7; }
.kpi .k { font-family: var(--font-hud); font-size: 9.5px; letter-spacing: .22em; color: var(--muted); text-transform: uppercase; }
.kpi .v { font-family: var(--font-hud); font-weight: 700; font-size: clamp(15px, 1.35vw, 20px); color: #eafaff; margin: 4px 0 2px; letter-spacing: .03em; }
.kpi .s { font-size: 13px; color: var(--text-dim); }
.up { color: var(--green); }
.down { color: var(--red); }
.p-sec h4 { margin: 0 0 8px; font-family: var(--font-hud); font-weight: 500; font-size: 10.5px; letter-spacing: .24em; color: var(--muted); text-transform: uppercase; display: flex; justify-content: space-between; }
.chart { width: 100%; height: 150px; display: block; }
.chart .cbar { fill: rgba(var(--accent-rgb), .5); }
.chart .cbar.today { fill: var(--accent); }
.chart .gasto { fill: none; stroke: var(--amber); stroke-width: 1.6; }
.chart .gdot { fill: var(--amber); }
.chart text { fill: var(--muted); font-size: 9px; font-family: var(--font-mono); }
.chart .grid { stroke: rgba(var(--accent-rgb), .08); }
.legend { display: flex; gap: 14px; font-size: 12px; color: var(--muted); margin-top: 4px; }
.legend i { display: inline-block; width: 10px; height: 10px; border-radius: 2px; margin-right: 5px; vertical-align: -1px; }
.plist { display: flex; flex-direction: column; gap: 4px; }
.prow { display: flex; gap: 10px; align-items: center; font-size: 14px; padding: 5px 8px; border-radius: var(--radius); background: rgba(255,255,255,.015); }
.prow .n { flex: 1; min-width: 0; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.prow .q { font-family: var(--font-mono); font-size: 12px; color: var(--accent); white-space: nowrap; }
.prow .q.warn { color: var(--amber); }
.prow .q.bad { color: var(--red); }
.fontes { display: flex; flex-direction: column; gap: 7px; }
.fonte { display: flex; gap: 8px; align-items: flex-start; font-size: 13px; color: var(--text-dim); }
.fonte b { color: var(--text); font-weight: 600; min-width: 92px; }
.fonte .txt { flex: 1; min-width: 0; }
.dot { width: 8px; height: 8px; border-radius: 50%; flex: none; margin-top: 6px; background: var(--muted); }
.dot.ok { background: var(--green); box-shadow: 0 0 8px var(--green); }
.dot.rodando { background: var(--accent); box-shadow: 0 0 8px var(--accent); animation: blink 1s infinite; }
.dot.erro, .dot.bad { background: var(--red); box-shadow: 0 0 8px var(--red); }
.dot.desligado, .dot.off, .dot.aguardando { background: #3b5566; }
.dot.warn { background: var(--amber); box-shadow: 0 0 8px var(--amber); }
.progress { height: 4px; background: rgba(var(--accent-rgb), .1); border-radius: 4px; overflow: hidden; margin-top: 4px; }
.progress i { display: block; height: 100%; background: var(--accent); transition: width .6s; }
.link-btn { background: none; border: 0; color: var(--accent); cursor: pointer; padding: 0; font: inherit; text-decoration: underline; }

/* mensagens: IA que respondeu, avisos */
.via { font-family: var(--font-mono); font-size: 10px; letter-spacing: 0; padding: 1px 6px; border: 1px solid var(--line); border-radius: 999px; color: var(--text-dim); text-transform: none; }
.notice { font-size: 12.5px; color: var(--amber); margin-bottom: 6px; }
.bubble table { border-collapse: collapse; margin: .5em 0; font-size: .9em; display: block; overflow-x: auto; max-width: 100%; }
.bubble th { background: rgba(var(--accent-rgb), .08); text-align: left; }

/* legendas grandes */
body.big-captions .subtitle { font-size: 30px; line-height: 1.3; -webkit-line-clamp: 5; min-height: 80px; max-width: 900px; }

/* diálogo largo e telas novas */
.dlg-wide { max-width: 900px; }
#settingsForm .tab-body { height: min(640px, 66vh); }
.foot-note { font-size: 13px; color: var(--muted); }
.dlg label.narrow { max-width: 320px; }
.help-box { border: 1px solid var(--line); border-radius: var(--radius); padding: 8px 12px; background: rgba(2,10,18,.35); font-size: 14px; color: var(--text-dim); }
.help-box summary { cursor: pointer; color: var(--text); font-weight: 600; }
.help-box ol { margin: 8px 0 4px; padding-left: 20px; line-height: 1.55; }
.help-box a, .help a { color: var(--accent); }
.help-box code { font-family: var(--font-mono); font-size: 12px; color: var(--accent); }
.ia-list { display: flex; flex-direction: column; gap: 8px; }
.ia-row { display: grid; grid-template-columns: 30px 1fr auto; gap: 12px; align-items: center; padding: 10px 12px; border: 1px solid var(--line); border-radius: var(--radius); background: rgba(2,10,18,.4); }
.ia-row.off { opacity: .55; }
.ia-row.atual { border-color: var(--accent); box-shadow: 0 0 14px rgba(var(--accent-rgb), .12); }
.ia-ord { font-family: var(--font-hud); font-weight: 700; font-size: 16px; color: var(--accent); text-align: center; }
.ia-top { display: flex; align-items: center; gap: 8px; flex-wrap: wrap; }
.ia-top b { font-size: 16px; }
.ia-top .dot { margin-top: 0; }
.ia-st { font-size: 13px; color: var(--muted); }
.ia-fields { display: grid; grid-template-columns: 1fr 210px; gap: 8px; margin-top: 8px; }
.ia-fields.one { grid-template-columns: 1fr; }
.ia-fields input { width: 100%; }
.ia-actions { display: flex; align-items: center; gap: 6px; }
.ia-actions .mini-btn { width: 28px; height: 28px; }
.ia-note { font-size: 13px; color: var(--text-dim); margin-top: 6px; line-height: 1.45; }
.ia-note code { color: var(--accent); font-family: var(--font-mono); font-size: 12px; }
.ia-note a { color: var(--accent); }
.ia-rec { font-size: 11px; font-weight: 600; padding: 2px 8px; border-radius: 999px; color: #00101f; background: linear-gradient(90deg, #2E9BFF, #00D2FF); }
.ia-motivo { font-size: 12.5px; color: var(--text-dim); margin: 4px 0 2px; }
.ia-recbar { display: flex; align-items: center; justify-content: space-between; gap: 14px; flex-wrap: wrap; padding: 12px 14px; margin-bottom: 12px; border-radius: 14px; border: 1px solid rgba(46, 155, 255, .3); background: rgba(46, 155, 255, .06); }
.ia-recbar div { display: grid; gap: 4px; min-width: 0; }
.ia-recbar b { font-size: 14px; }
.ia-recbar span { font-size: 12.5px; color: var(--text-dim); line-height: 1.45; }
.ia-recbar em { font-style: normal; font-size: 12.5px; color: var(--accent); }
.acc-card { border: 1px solid var(--line); border-radius: var(--radius); padding: 12px 14px; display: flex; flex-direction: column; gap: 10px; background: rgba(2,10,18,.35); }
.acc-head { display: flex; align-items: center; justify-content: space-between; gap: 10px; }
.acc-head b { font-size: 16px; }
.acc-st { font-size: 13px; color: var(--muted); text-align: right; }
.acc-st.ok { color: var(--green); }
.acc-st.bad { color: var(--red); }
.pw { display: flex; gap: 6px; align-items: center; }
.pw input { flex: 1; min-width: 0; }
.pw .mini-btn { width: 36px; height: 38px; }
a.ghost-btn { text-decoration: none; }
.audio-test { display: flex; gap: 14px; align-items: center; justify-content: space-between; padding: 12px 14px; border: 1px solid rgba(255,182,72,.35); border-radius: var(--radius); background: rgba(255,182,72,.05); }
.audio-test b { color: #ffe2b8; }
.audio-test .help { margin-top: 4px; }
.audio-test .primary-btn { flex: none; }
.toggle.on.wake-on { color: var(--green); border-color: var(--green); background: rgba(93,255,169,.08); }
.toast.venda { border-left-color: var(--green); background: #071a12; font-size: 15.5px; }
.toast.venda b { color: var(--green); font-family: var(--font-hud); letter-spacing: .08em; }
@media (max-width: 1180px) { .stat-ram { display: none; } }
@media (max-width: 900px) {
  .ia-fields { grid-template-columns: 1fr; }
  .ia-row { grid-template-columns: 24px 1fr; }
  .ia-actions { grid-column: 1 / -1; }
  .audio-test { flex-direction: column; align-items: flex-start; }
}

/* layout responsivo (janelas médias) */
.layout { grid-template-columns: 250px minmax(0, 1fr) minmax(340px, 34%); }
.layout.focus { grid-template-columns: 250px minmax(0, 1fr) 0; }
.hud-stats { min-width: 0; }
.voice-controls { gap: 14px; flex-wrap: wrap; justify-content: center; }
@media (max-width: 1280px) { .stat-ram { display: none; } .voice-controls { gap: 10px; } .toggle { width: 66px; } }
@media (max-width: 1180px) {
  .layout { grid-template-columns: 200px minmax(0, 1fr) minmax(300px, 38%); }
  .layout.focus { grid-template-columns: 200px minmax(0, 1fr) 0; }
}
@media (max-width: 1100px) {
  .layout { grid-template-columns: 170px minmax(0, 1fr) minmax(290px, 37%); gap: 12px; padding: 12px; }
  .layout.focus { grid-template-columns: 170px minmax(0, 1fr) 0; }
  .hud-stats .stat:first-child { display: none; }
  .brand-name { letter-spacing: .18em; font-size: 15px; }
  .topbar { gap: 14px; }
  #date { display: none; }
  .agent .ds { display: none; }
  .toggle { width: 58px; font-size: 10px; letter-spacing: .08em; }
}
@media (max-width: 900px) {
  .layout, .layout.focus { grid-template-columns: 1fr; }
}

.dlg small a { color: var(--accent); }

/* notificações animadas (estilo UTMify) */
.notifs { position: fixed; top: 76px; right: 18px; z-index: 45; display: flex; flex-direction: column; gap: 10px; width: min(380px, calc(100vw - 32px)); pointer-events: none; }
.notif {
  pointer-events: auto; display: flex; gap: 12px; align-items: flex-start; padding: 12px 14px;
  background: linear-gradient(135deg, rgba(10, 26, 41, .97), rgba(5, 14, 23, .97));
  border: 1px solid var(--line-strong); border-left: 3px solid var(--accent); border-radius: 10px;
  box-shadow: 0 12px 34px rgba(0, 0, 0, .5), 0 0 24px rgba(var(--accent-rgb), .12);
  animation: notifIn .45s cubic-bezier(.2, 1.3, .4, 1); cursor: pointer;
}
.notif.saindo { animation: notifOut .4s ease forwards; }
.notif .ni { flex: none; width: 38px; height: 38px; border-radius: 50%; display: grid; place-items: center; font-size: 19px; background: rgba(var(--accent-rgb), .12); border: 1px solid rgba(var(--accent-rgb), .35); }
.notif .nt { flex: 1; min-width: 0; }
.notif .nh { display: flex; justify-content: space-between; gap: 8px; font-family: var(--font-hud); font-size: 9.5px; letter-spacing: .2em; color: var(--muted); text-transform: uppercase; margin-bottom: 3px; }
.notif .nm { font-size: 15.5px; line-height: 1.4; color: #eafaff; font-weight: 500; }
.notif.venda { border-left-color: var(--green); }
.notif.venda .ni { background: rgba(93, 255, 169, .12); border-color: rgba(93, 255, 169, .4); }
.notif.marco { border-left-color: var(--amber); box-shadow: 0 12px 34px rgba(0, 0, 0, .5), 0 0 30px rgba(255, 182, 72, .25); }
@keyframes notifIn { from { opacity: 0; transform: translateX(40px) scale(.96); } }
@keyframes notifOut { to { opacity: 0; transform: translateX(40px); } }
.chip.chip-resumo { border-color: var(--accent); color: #eafaff; background: rgba(var(--accent-rgb), .14); font-weight: 600; }

/* ===== anexos no chat (fotos, vídeos, arquivos) ===== */
.composer { position: relative; }
.comp-btn { width: 40px; height: 44px; flex: none; display: grid; place-items: center; border-radius: var(--radius); border: 1px solid var(--line); background: rgba(2, 10, 18, .6); color: var(--text-dim); cursor: pointer; transition: .18s; }
.comp-btn:hover { color: var(--accent); border-color: var(--line-strong); }
.pendentes { display: flex; flex-wrap: wrap; gap: 8px; padding: 10px 12px 0; border-top: 1px solid var(--line); background: rgba(2, 10, 18, .5); }
.pend { position: relative; display: flex; align-items: center; gap: 8px; max-width: 220px; padding: 4px 28px 4px 4px; border: 1px solid var(--line-strong); border-radius: 8px; background: rgba(var(--accent-rgb), .06); font-size: 13px; }
.pend img, .pend .pend-ico { width: 44px; height: 44px; border-radius: 6px; object-fit: cover; flex: none; display: grid; place-items: center; background: rgba(0, 0, 0, .3); font-size: 20px; }
.pend .pend-nome { min-width: 0; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.pend .pend-st { font-size: 11px; color: var(--muted); }
.pend.erro { border-color: rgba(255, 84, 112, .5); }
.pend.erro .pend-st { color: var(--red); }
.pend .pend-x { position: absolute; top: 4px; right: 4px; width: 20px; height: 20px; border: 0; border-radius: 50%; background: rgba(0, 0, 0, .5); color: #fff; cursor: pointer; display: grid; place-items: center; font-size: 12px; }
.pend .spin { width: 10px; height: 10px; border: 1.5px solid var(--accent); border-top-color: transparent; border-radius: 50%; display: inline-block; animation: spin .7s linear infinite; vertical-align: -1px; }
.chat.arrastando { outline: 2px dashed var(--accent); outline-offset: -6px; }
.drop-hint { display: none; position: absolute; inset: 60px 14px 80px; border-radius: 10px; background: rgba(2, 10, 18, .85); color: var(--accent); font-family: var(--font-hud); letter-spacing: .15em; font-size: 12px; text-transform: uppercase; place-items: center; text-align: center; padding: 20px; pointer-events: none; z-index: 5; }
.chat.arrastando .drop-hint { display: grid; }
.msg-anexos { display: flex; flex-wrap: wrap; gap: 6px; margin-bottom: 6px; justify-content: flex-end; }
.msg.bot .msg-anexos { justify-content: flex-start; margin: 4px 0 8px; }
.msg-anexos a.foto { display: block; border-radius: 8px; overflow: hidden; border: 1px solid var(--line-strong); }
.msg-anexos a.foto img { display: block; max-width: 220px; max-height: 220px; object-fit: cover; }
.msg.bot .msg-anexos a.foto img { max-width: 100%; max-height: 420px; object-fit: contain; background: #000; }
.msg.bot .msg-anexos a.foto { max-width: 100%; }
.arq { display: inline-flex; align-items: center; gap: 10px; padding: 8px 12px; border: 1px solid var(--line-strong); border-radius: 8px; background: rgba(var(--accent-rgb), .06); color: var(--text); text-decoration: none; font-size: 14px; }
.arq:hover { border-color: var(--accent); }
.arq .arq-ico { font-size: 20px; }
.arq b { display: block; font-weight: 600; }
.arq small { color: var(--muted); }
.arq svg { color: var(--accent); }
.progresso { font-size: 13px; color: var(--accent); margin-bottom: 6px; display: flex; align-items: center; gap: 8px; }
.progresso .spin { width: 10px; height: 10px; border: 1.5px solid currentColor; border-top-color: transparent; border-radius: 50%; animation: spin .7s linear infinite; }
.bubble img.md-img { max-width: 100%; border-radius: 8px; margin: 6px 0; }
.claude-conta { margin-top: 8px; padding: 8px 10px; border-radius: var(--radius); border: 1px solid var(--line); font-size: 13.5px; line-height: 1.45; color: var(--text-dim); display: flex; flex-wrap: wrap; gap: 8px; align-items: center; justify-content: space-between; }
.claude-conta.ok { border-color: rgba(93, 255, 169, .45); color: #c9ffe2; }
.claude-conta.bad { border-color: rgba(255, 182, 72, .5); color: #ffe2b8; }
@media (max-width: 1100px) { .comp-btn { width: 34px; } }

/* meta do dia no painel */
.meta-box { border: 1px solid var(--line); border-radius: var(--radius); padding: 10px 12px; background: rgba(2, 10, 18, .45); }
.meta-barra { height: 10px; border-radius: 10px; background: rgba(var(--accent-rgb), .1); overflow: hidden; border: 1px solid var(--line); }
.meta-barra i { display: block; height: 100%; background: linear-gradient(90deg, rgba(var(--accent-rgb), .6), var(--green)); box-shadow: 0 0 12px var(--green); transition: width .8s; }
.meta-txt { font-size: 13px; color: var(--text-dim); margin-top: 6px; }

/* ---------- Diagnóstico ---------- */
.ctab-dot { display: inline-block; width: 7px; height: 7px; border-radius: 50%; background: var(--red); box-shadow: 0 0 6px var(--red); margin-left: 4px; vertical-align: middle; }
.ctab-dot.hidden { display: none; }
.diag-resumo { display: flex; align-items: center; gap: 10px; flex-wrap: wrap; padding: 12px 14px; border: 1px solid var(--line); background: rgba(var(--accent-rgb), .04); font-size: 15px; font-weight: 600; }
.diag-resumo.bad { border-color: rgba(255, 84, 112, .45); }
.diag-resumo.warn { border-color: rgba(255, 182, 72, .4); }
.diag-resumo .ghost-btn { margin-left: auto; font-size: 13px; padding: 6px 10px; }
.diag-item { display: flex; gap: 10px; align-items: flex-start; padding: 9px 0; border-top: 1px solid rgba(var(--accent-rgb), .07); }
.diag-item:first-of-type { border-top: 0; }
.diag-item .dot { margin-top: 6px; flex: none; }
.diag-txt { flex: 1; min-width: 0; display: flex; flex-direction: column; gap: 2px; font-size: 13px; }
.diag-txt b { color: var(--text); font-weight: 600; font-size: 14px; }
.diag-txt .d { color: var(--text-dim); overflow-wrap: anywhere; }
.diag-txt .r { color: var(--amber); }
.diag-item.erro .diag-txt .r { color: #ff8da0; }
.diag-item.off .diag-txt .r, .diag-item.ok .diag-txt .r { color: var(--muted); }
.diag-item .ghost-btn { flex: none; font-size: 12px; padding: 5px 9px; align-self: center; }
.mini-btn.spin svg { animation: girar 1s linear infinite; }
@keyframes girar { to { transform: rotate(360deg); } }
@media (max-width: 640px) { .diag-item { flex-wrap: wrap; } .diag-item .ghost-btn { margin-left: 18px; } }

/* ---------- Reabastecimento ---------- */
.alerta-box { border-color: rgba(255, 84, 112, .55) !important; box-shadow: 0 0 18px rgba(255, 84, 112, .15); }
.alerta-txt { color: #ff8da0; font-size: 13px; margin: 2px 0 8px; }
.ok-txt { color: var(--green); font-size: 12px; }
.warn-txt { color: var(--amber); font-size: 12px; }
.p-sub { font-size: 12px; color: var(--muted); margin: 10px 0 4px; text-transform: uppercase; letter-spacing: .08em; }
.prow small { color: var(--muted); }
.p-sec .row-btns { margin-top: 10px; display: flex; gap: 10px; align-items: center; flex-wrap: wrap; }

/* ---------- Modo pensar ---------- */
#btnPensar.on { color: var(--amber); border-color: rgba(255, 182, 72, .6); box-shadow: 0 0 10px rgba(255, 182, 72, .35); background: rgba(255, 182, 72, .08); }

/* ---------- Player de música (Spotify via Windows) ---------- */
.music-card {
  position: absolute; left: 14px; bottom: 14px; z-index: 5;
  display: flex; align-items: center; gap: 12px;
  width: 340px; max-width: calc(100% - 28px); padding: 10px 12px 10px 10px;
  background: var(--panel); border: 1px solid var(--line); border-radius: 10px;
  backdrop-filter: blur(10px); box-shadow: 0 0 24px rgba(var(--accent-rgb), .08);
  transition: opacity .3s, border-color .3s, box-shadow .3s;
}
.music-card:hover { border-color: var(--line-strong); }
.music-card.vazio { opacity: .55; }
.music-card.tocando { border-color: rgba(30, 215, 96, .45); box-shadow: 0 0 26px rgba(30, 215, 96, .12); }
.mc-capa { position: relative; flex: 0 0 56px; width: 56px; height: 56px; border-radius: 6px; overflow: hidden; background: rgba(var(--accent-rgb), .06); display: grid; place-items: center; }
.mc-capa img { position: absolute; inset: 0; width: 100%; height: 100%; object-fit: cover; display: none; }
.mc-capa.tem img { display: block; }
.mc-capa.tem .mc-sem-capa { display: none; }
.mc-sem-capa { width: 24px; height: 24px; color: var(--muted); }
.mc-info { flex: 1; min-width: 0; }
.mc-titulo { font-family: var(--font-ui); font-weight: 700; font-size: 15px; color: var(--text); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.mc-artista { font-family: var(--font-ui); font-size: 13px; color: var(--text-dim); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.mc-barra { margin-top: 6px; height: 3px; border-radius: 3px; background: rgba(var(--accent-rgb), .12); overflow: hidden; }
.mc-barra i { display: block; height: 100%; width: 0; background: #1ed760; transition: width 1s linear; }
.mc-botoes { display: flex; align-items: center; gap: 4px; }
.mc-botoes button { display: grid; place-items: center; width: 30px; height: 30px; border: 0; border-radius: 50%; background: transparent; color: var(--text-dim); cursor: pointer; transition: color .2s, background .2s, transform .1s; }
.mc-botoes button:hover { color: var(--text); background: rgba(var(--accent-rgb), .1); }
.mc-botoes button:active { transform: scale(.92); }
.mc-botoes svg { width: 16px; height: 16px; }
.mc-botoes .mc-play { width: 36px; height: 36px; background: #1ed760; color: #04120a; }
.mc-botoes .mc-play:hover { background: #3be477; color: #04120a; }
.mc-botoes .mc-play svg { fill: currentColor; stroke: none; }
.mc-botoes #mcPrev svg, .mc-botoes #mcNext svg { fill: currentColor; }
@media (max-width: 1280px) { .music-card { width: 290px; } }

/* ---------- Aparência (temas) ---------- */
body { background: radial-gradient(1200px 800px at 50% 40%, var(--bg-glow, #0a1a2a) 0%, var(--bg) 60%) fixed, var(--bg); }
.topbar { background: linear-gradient(180deg, rgba(var(--panel-rgb, 7, 20, 32), .88), rgba(var(--panel-rgb, 7, 20, 32), .4)); }
.brand-name { color: var(--text); }
.msg.user .bubble { color: var(--text); }
body.sem-grade .bg-grid, body.sem-scan .bg-vignette { display: none; }
body.sem-brilho *, body.sem-brilho *::before, body.sem-brilho *::after { text-shadow: none !important; }
body.sem-brilho :is(.panel, .kpi, .p-sec, .music-card, .badge, .brand-mark, .brand-mark span, .mic-btn, .send-btn, .ia-row, .acc-card, .tema) { box-shadow: none !important; }
body.cantos-redondos { --radius: 10px; }
body.cantos-redondos :is(.panel, .dlg, .kpi, .p-sec, .ghost-btn, .primary-btn, .mini-btn, .icon-btn, .comp-btn, .toggle, .send-btn, .badge, .bubble, .ctab, .acc-card, .conn, .ia-row, .notif, .toast, .composer, .composer textarea, .prow, .diag-resumo, .chip, .tema) { border-radius: 12px; }
body.cantos-redondos :is(input:not([type=checkbox]):not([type=range]):not([type=color]), select, textarea) { border-radius: 8px; }

.temas { display: grid; grid-template-columns: repeat(auto-fill, minmax(118px, 1fr)); gap: 10px; margin: 6px 0 14px; }
.tema { display: flex; flex-direction: column; gap: 8px; align-items: flex-start; padding: 10px; border: 1px solid var(--line); background: var(--t-bg); border-radius: var(--radius); cursor: pointer; color: var(--text); text-align: left; transition: border-color .2s, transform .1s; }
.tema:hover { border-color: var(--t-cor); }
.tema:active { transform: scale(.98); }
.tema.on { border-color: var(--t-cor); box-shadow: 0 0 0 1px var(--t-cor), 0 0 16px color-mix(in srgb, var(--t-cor) 35%, transparent); }
.tema b { font-size: 13px; font-weight: 600; }
.tema-amostra { display: flex; gap: 4px; width: 100%; }
.tema-amostra i { height: 8px; border-radius: 4px; flex: 1; background: var(--t-cor); }
.tema-amostra i:nth-child(2) { opacity: .55; }
.tema-amostra i:nth-child(3) { opacity: .25; }
input[type=color] { width: 100%; height: 38px; padding: 3px; border: 1px solid var(--line); background: transparent; border-radius: var(--radius); cursor: pointer; }
label output { float: right; color: var(--accent); font-family: var(--font-mono); font-size: 12px; }

/* ---------- Player no canto superior esquerdo ---------- */
.topbar .brand { min-width: 0; flex: 0 0 auto; }
.topbar .music-card {
  position: static; flex: 0 1 300px; width: 300px; min-width: 210px; height: 46px; max-width: none;
  padding: 4px 6px 4px 4px; gap: 9px; border-radius: 8px; z-index: auto;
  background: rgba(var(--accent-rgb), .04); box-shadow: none; backdrop-filter: none;
}
.topbar .music-card.tocando { box-shadow: 0 0 18px rgba(30, 215, 96, .1); }
.topbar .mc-capa { flex: 0 0 38px; width: 38px; height: 38px; border-radius: 5px; }
.topbar .mc-sem-capa { width: 18px; height: 18px; }
.topbar .mc-titulo { font-size: 13px; line-height: 1.2; }
.topbar .mc-artista { font-size: 11px; line-height: 1.2; }
.topbar .mc-barra { margin-top: 4px; height: 2px; }
.topbar .mc-botoes { gap: 2px; }
.topbar .mc-botoes button { width: 26px; height: 26px; }
.topbar .mc-botoes svg { width: 14px; height: 14px; }
.topbar .mc-botoes .mc-play { width: 30px; height: 30px; }
@media (max-width: 1700px) { .topbar .stat-ram { display: none; } }
@media (max-width: 1450px) { .topbar .hud-stats .stat:not(.core-stat):not(.stat-hoje) { display: none; } .topbar { gap: 18px; } }
@media (max-width: 1250px) { .topbar .brand-sub { display: none; } .topbar .music-card { flex-basis: 230px; width: 230px; } }
@media (max-width: 980px) { .topbar .music-card { display: none; } }

/* Edição cliente: esconde o que é do negócio/PC do dono (loja, vendas, estoque, pastas, Claude Code) */
.ed-cliente .so-pessoal, .ed-cliente .so-pessoal-aba { display: none !important; }

```
