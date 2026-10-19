# `orion/discord-conta.css`

> **Fonte:** https://assistanceorion.cloud/orion/discord-conta.css · baixado em 19/10/2026
> 33 linhas · 3.1 KB · Estilos do widget Discord

```css
/* "Sincronizar com Discord" — o mesmo cartão no site, no ORION Web e no app (valores de reserva quando o tema não define as variáveis) */
.dc-card .lic-head h2 { display: inline-flex; align-items: center; }
.dc-logo { display: inline-block; flex: none; width: 24px; height: 24px; margin-right: 10px; color: #5865F2; }
.dc-grade { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 12px; }
.dc-grade.dc-uma { grid-template-columns: minmax(0, 1fr); max-width: 560px; margin-bottom: 14px; }
.dc-opcao { display: grid; align-content: start; gap: 8px; padding: 16px; border: 1px solid var(--line, rgba(46, 155, 255, .16)); border-radius: 14px; background: rgba(255, 255, 255, .02); }
.dc-opcao b { color: var(--text, #eaf4ff); font-size: 15px; }
.dc-opcao p { margin: 0; color: var(--muted, #8aa0b8); font-size: 13.5px; line-height: 1.5; }
.dc-opcao > .btn, .dc-opcao > button, .dc-opcao > a { justify-self: start; margin-top: 4px; }
.dc-entrar { display: inline-flex; align-items: center; gap: 8px; }
.dc-entrar.btn-primary, .dc-entrar.primary-btn { background: #5865F2; color: #fff; box-shadow: 0 8px 26px -10px rgba(88, 101, 242, .9); }
.dc-entrar.btn-primary:hover, .dc-entrar.primary-btn:hover { background: #4752c4; }
.dc-ic { width: 18px; height: 18px; flex: none; }
.dc-codigo { display: grid; gap: 8px; margin-top: 6px; padding-top: 12px; border-top: 1px dashed var(--line, rgba(46, 155, 255, .2)); }
.dc-codigo[hidden] { display: none; }
.dc-cod { justify-self: start; padding: 10px 16px; font: 600 26px/1 var(--mono, ui-monospace, Consolas, monospace); letter-spacing: .2em; color: #8fd0ff; border: 1px dashed rgba(46, 155, 255, .55); border-radius: 10px; background: rgba(46, 155, 255, .07); user-select: all; }
.dc-codigo code { font-family: var(--mono, ui-monospace, Consolas, monospace); font-size: .95em; color: var(--text, #eaf4ff); }
.dc-sub { display: block; color: var(--muted, #8aa0b8); font-size: 12.5px; }
p.dc-sub { margin: 0; }
.dc-cargos { display: flex; flex-wrap: wrap; align-items: center; gap: 6px; }
.dc-cargos-rot { margin-right: 4px; color: var(--muted, #8aa0b8); font-size: 13px; }
.dc-chip { display: inline-flex; align-items: center; height: 24px; padding: 0 10px; border-radius: 999px; border: 1px solid var(--line-2, rgba(255, 255, 255, .14)); color: var(--text-2, #c9d8e8); font-size: 12px; }
.dc-chip-forte { color: #8fd0ff; border-color: rgba(46, 155, 255, .5); background: rgba(46, 155, 255, .1); }
.dc-vinc { display: flex; align-items: center; gap: 12px; padding: 12px 14px; border: 1px solid rgba(88, 101, 242, .45); border-radius: 14px; background: rgba(88, 101, 242, .09); }
.dc-vinc b { display: block; color: var(--text, #eaf4ff); }
.dc-av { display: grid; place-items: center; width: 38px; height: 38px; flex: none; border-radius: 50%; background: #5865F2; color: #fff; }
.dc-av-ic { width: 22px; height: 22px; }
.dc-acoes { display: flex; flex-wrap: wrap; gap: 8px; align-items: center; }
.dc-msg { margin: 0; min-height: 1em; font-size: 13px; color: var(--muted, #8aa0b8); }
.dc-msg.dc-ok { color: var(--ok, #34d399); }
.dc-msg.dc-erro { color: var(--err, #f87171); }
@media (max-width: 720px) { .dc-grade { grid-template-columns: minmax(0, 1fr); } }

```
