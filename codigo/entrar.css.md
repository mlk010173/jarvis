# `entrar.css`

> **Fonte:** https://assistanceorion.cloud/entrar.css · baixado em 19/10/2026
> 111 linhas · 10.7 KB · Estilos da página de login

```css
/* Entrar / criar conta: à esquerda o anel de energia do app (o mesmo ORION), à direita o cartão com feixes de luz correndo pela borda. */
body.au { min-height: 100vh; margin: 0; background: #000; color: var(--text); font-family: var(--font); overflow-x: hidden; }
.au-fundo { position: fixed; inset: 0; pointer-events: none; z-index: 0;
  background: radial-gradient(700px 520px at 28% 46%, rgba(18, 82, 200, .26), transparent 70%), radial-gradient(600px 500px at 85% 20%, rgba(0, 210, 255, .07), transparent 70%),
    linear-gradient(rgba(46, 155, 255, .06) 1px, transparent 1px) 0 0 / 46px 46px, linear-gradient(90deg, rgba(46, 155, 255, .06) 1px, transparent 1px) 0 0 / 46px 46px;
  -webkit-mask-image: radial-gradient(ellipse 85% 80% at 50% 50%, #000 40%, transparent 100%); mask-image: radial-gradient(ellipse 85% 80% at 50% 50%, #000 40%, transparent 100%); }
.au-voltar { position: fixed; z-index: 3; top: 20px; right: 22px; display: inline-flex; align-items: center; gap: 6px; padding: 8px 14px; border-radius: 999px; border: 1px solid var(--line-2); color: var(--text-2); font-size: 13.5px; background: rgba(0, 0, 0, .5); }
.au-voltar:hover { color: #fff; border-color: var(--blue); }
.au-voltar svg { width: 15px; height: 15px; fill: none; stroke: currentColor; stroke-width: 2; stroke-linecap: round; stroke-linejoin: round; }
.au-grade { position: relative; z-index: 1; min-height: 100vh; display: grid; grid-template-columns: minmax(0, 1.05fr) minmax(0, 1fr); }

/* ---------- lado da marca ---------- */
.au-marca { display: flex; flex-direction: column; justify-content: center; gap: 28px; padding: 48px clamp(28px, 6vw, 96px); border-right: 1px solid rgba(46, 155, 255, .12); }
.au-logo { display: inline-flex; align-items: center; gap: 12px; color: #fff; font-weight: 650; letter-spacing: .32em; font-size: 17px; }
.au-anel { position: relative; width: min(380px, 70vw); aspect-ratio: 1; margin: -10px 0 -20px -24px; }
.au-anel canvas { position: absolute; inset: 0; width: 100%; height: 100%; }
.au-anel-rot { position: absolute; left: 50%; top: 55.5%; transform: translate(-50%, -50%); font: 500 11px var(--mono); letter-spacing: .5em; color: #8fd0ff; text-shadow: 0 0 14px rgba(46, 155, 255, .9); }
.au-frase { margin: 0; font-size: clamp(30px, 3.4vw, 46px); line-height: 1.05; letter-spacing: -.03em; font-weight: 650; }
.au-frase span { background: var(--grad); -webkit-background-clip: text; background-clip: text; color: transparent; }
.au-fatos { list-style: none; margin: 0; padding: 0; display: grid; gap: 14px; max-width: 470px; }
.au-fatos li { display: grid; grid-template-columns: 36px 1fr; gap: 14px; align-items: start; }
.au-fatos svg { width: 36px; height: 36px; padding: 8px; border-radius: 11px; fill: none; stroke: #2E9BFF; stroke-width: 1.8; stroke-linecap: round; stroke-linejoin: round; border: 1px solid rgba(46, 155, 255, .4); background: rgba(46, 155, 255, .08); box-shadow: 0 0 18px -8px rgba(46, 155, 255, .9); }
.au-fatos span { display: grid; gap: 4px; color: var(--muted); font-size: 14px; line-height: 1.5; }
.au-fatos b { color: var(--text); font-weight: 600; font-size: 15px; }

/* ---------- cartão ---------- */
.au-lado { display: grid; place-items: center; padding: 48px 24px; }
.au-card { position: relative; width: min(440px, 100%); padding: 32px 28px 28px; border-radius: 22px; border: 1px solid rgba(46, 155, 255, .2); overflow: hidden;
  background: linear-gradient(180deg, rgba(8, 16, 30, .82), rgba(2, 5, 11, .92)); -webkit-backdrop-filter: blur(16px); backdrop-filter: blur(16px);
  box-shadow: 0 30px 80px -40px rgba(0, 90, 255, .7), inset 0 1px 0 rgba(120, 190, 255, .08); animation: au-entra .7s cubic-bezier(.16, 1, .3, 1) both; }
@keyframes au-entra { from { opacity: 0; transform: translateY(14px); } }
/* feixes de luz correndo pela borda (um por lado, um depois do outro) */
.au-feixe { position: absolute; pointer-events: none; filter: blur(1px); opacity: .85; }
.au-feixe.f1, .au-feixe.f3 { height: 2px; width: 45%; background: linear-gradient(90deg, transparent, #00D2FF, #fff, transparent); }
.au-feixe.f2, .au-feixe.f4 { width: 2px; height: 45%; background: linear-gradient(180deg, transparent, #00D2FF, #fff, transparent); }
.au-feixe.f1 { top: 0; left: -45%; animation: au-f1 6s ease-in-out infinite; }
.au-feixe.f2 { right: 0; top: -45%; animation: au-f2 6s ease-in-out infinite 1.5s; }
.au-feixe.f3 { bottom: 0; right: -45%; animation: au-f3 6s ease-in-out infinite 3s; }
.au-feixe.f4 { left: 0; bottom: -45%; animation: au-f4 6s ease-in-out infinite 4.5s; }
@keyframes au-f1 { 0% { left: -45%; } 30%, 100% { left: 100%; } }
@keyframes au-f2 { 0% { top: -45%; } 30%, 100% { top: 100%; } }
@keyframes au-f3 { 0% { right: -45%; } 30%, 100% { right: 100%; } }
@keyframes au-f4 { 0% { bottom: -45%; } 30%, 100% { bottom: 100%; } }
.au-cab h1 { margin: 0 0 6px; font-size: 28px; letter-spacing: -.02em; }
.au-cab .lead { margin: 0 0 24px; color: var(--muted); font-size: 15px; line-height: 1.5; }

/* abas com marcador que desliza */
.au-abas.tabs { position: relative; display: grid; grid-template-columns: 1fr 1fr; padding: 4px; margin-bottom: 20px; border-radius: 999px; border: 1px solid rgba(46, 155, 255, .2); background: rgba(0, 0, 0, .45); }
.au-abas.tabs button { position: relative; z-index: 1; height: 40px; border: 0; background: none; color: var(--muted); font: 500 14.5px var(--font); cursor: pointer; border-radius: 999px; box-shadow: none; transition: color .25s; }
.au-abas.tabs button.ativa { color: #fff; background: none; box-shadow: none; }
.au-aba-marca { position: absolute; top: 4px; bottom: 4px; left: 4px; width: calc(50% - 4px); border-radius: 999px; background: linear-gradient(135deg, rgba(31, 107, 255, .35), rgba(0, 210, 255, .2)); box-shadow: inset 0 0 0 1px rgba(46, 155, 255, .55), 0 0 22px -8px rgba(46, 155, 255, .9); transition: transform .45s cubic-bezier(.16, 1, .3, 1); }
.au-abas[data-lado="cadastro"] .au-aba-marca { transform: translateX(100%); }

/* Google */
.au-google { display: flex; align-items: center; justify-content: center; gap: 10px; height: 46px; border-radius: 12px; border: 1px solid rgba(255, 255, 255, .16); background: rgba(255, 255, 255, .04); color: #fff; font-weight: 600; font-size: 14.5px; transition: border-color .2s, background .2s; }
.au-google:hover { border-color: rgba(255, 255, 255, .35); background: rgba(255, 255, 255, .08); }
.au-google svg { width: 19px; height: 19px; }

/* campos */
.au-campo { display: grid; gap: 8px; margin-bottom: 14px; }
.au-campo label { font-size: 13.5px; font-weight: 500; color: var(--text-2); }
.au-entrada { position: relative; display: block; }
.au-entrada > svg { position: absolute; left: 13px; top: 50%; width: 17px; height: 17px; transform: translateY(-50%); fill: none; stroke: var(--muted); stroke-width: 1.8; stroke-linecap: round; stroke-linejoin: round; transition: stroke .2s; pointer-events: none; }
.au-entrada input { width: 100%; height: 48px; padding: 0 44px 0 44px; border-radius: 12px; border: 1px solid rgba(46, 155, 255, .2); background: rgba(0, 0, 0, .5); color: #fff; font: 15px var(--font); transition: border-color .2s, box-shadow .2s, background .2s; }
.au-entrada input::placeholder { color: #4f6177; }
.au-entrada input:focus { outline: none; border-color: #2E9BFF; background: rgba(2, 10, 22, .8); box-shadow: 0 0 0 3px rgba(46, 155, 255, .18), 0 0 24px -8px rgba(46, 155, 255, .9); }
.au-entrada:focus-within > svg { stroke: #2E9BFF; }
.au-olho { position: absolute; right: 8px; top: 50%; transform: translateY(-50%); width: 32px; height: 32px; display: grid; place-items: center; border: 0; border-radius: 8px; background: none; color: var(--muted); cursor: pointer; }
.au-olho:hover, .au-olho[aria-pressed="true"] { color: #fff; }
.au-olho svg { width: 18px; height: 18px; fill: none; stroke: currentColor; stroke-width: 1.8; stroke-linecap: round; stroke-linejoin: round; }
.au-forca { display: grid; grid-template-columns: repeat(4, 1fr); gap: 6px; margin-top: 4px; }
.au-forca i { height: 4px; border-radius: 4px; background: rgba(255, 255, 255, .08); transition: background .3s, box-shadow .3s; }
.au-forca[data-n="1"] i:nth-child(-n+1) { background: #f87171; }
.au-forca[data-n="2"] i:nth-child(-n+2) { background: #fbbf24; }
.au-forca[data-n="3"] i:nth-child(-n+3) { background: #2E9BFF; }
.au-forca[data-n="4"] i { background: #34d399; box-shadow: 0 0 10px -2px rgba(52, 211, 153, .8); }

/* botão principal */
.au-botao { position: relative; width: 100%; height: 50px; margin-top: 6px; display: flex; align-items: center; justify-content: center; gap: 10px; border: 0; border-radius: 13px; overflow: hidden; cursor: pointer;
  color: #00101f; font: 650 15.5px var(--font); background: var(--grad); box-shadow: 0 0 0 1px rgba(0, 210, 255, .35), 0 12px 34px -12px rgba(46, 155, 255, .95); transition: transform .15s, filter .2s; }
.au-botao::after { content: ''; position: absolute; inset: 0; background: linear-gradient(100deg, transparent 30%, rgba(255, 255, 255, .45) 50%, transparent 70%); transform: translateX(-100%); transition: transform .7s; }
.au-botao:hover { filter: brightness(1.08); }
.au-botao:hover::after { transform: translateX(100%); }
.au-botao:active { transform: scale(.985); }
.au-botao:disabled { opacity: .65; cursor: wait; }
.au-botao svg { width: 18px; height: 18px; fill: none; stroke: currentColor; stroke-width: 2.2; stroke-linecap: round; stroke-linejoin: round; transition: transform .3s; }
.au-botao:hover svg { transform: translateX(3px); }
.au-nota { margin: 14px 0 0; color: var(--muted); font-size: 12.5px; text-align: center; line-height: 1.5; }
.au-card .erro { color: #fca5a5; font-size: 13.5px; min-height: 0; }
.au-card .erro:not(:empty) { margin: 2px 0 8px; }
.au-card .divider { margin: 20px 0; }

@media (max-width: 960px) {
  .au-grade { grid-template-columns: 1fr; }
  .au-marca { border-right: 0; padding: 72px 24px 0; align-items: center; text-align: center; gap: 14px; }
  .au-anel { width: 210px; margin: -6px auto -14px; }
  .au-fatos { display: none; }
  .au-lado { padding: 24px 16px 48px; }
}
@media (prefers-reduced-motion: reduce) { .au-feixe, .au-card { animation: none; } .au-feixe { display: none; } }
.au-nota a { color: #8fd0ff; }

/* esqueci a senha */
.au-esqueci { display: block; margin: 12px auto 0; padding: 4px 8px; border: 0; background: transparent; color: var(--muted); font: inherit; font-size: 13.5px; cursor: pointer; border-radius: 6px; }
.au-esqueci:hover { color: var(--text); text-decoration: underline; text-underline-offset: 3px; }
.au-esqueci:focus-visible { outline: 2px solid var(--cyan); outline-offset: 2px; }
.au-ok { margin: 4px 0 12px; padding: 10px 12px; border: 1px solid rgba(52, 211, 153, .35); border-radius: 10px; background: rgba(52, 211, 153, .08); color: var(--ok); font-size: 13.5px; line-height: 1.45; }
.au-discord { margin-top: 10px; }
.au-google[hidden] { display: none; }
.au-google[hidden] + .au-discord { margin-top: 0; }

```
