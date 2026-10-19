# `orion/icones.js`

> **Fonte:** https://assistanceorion.cloud/orion/icones.js · baixado em 19/10/2026
> 196 linhas · 19.9 KB · Biblioteca de ícones SVG (ORION_ICONES)

```javascript
'use strict';
// Ícones vetoriais do ORION (traço de 1,8, pontas arredondadas, grade 24×24, no estilo Lucide). Sem biblioteca externa e sem texto vindo de fora:
// só estas formas fixas, desenhadas em ciano (currentColor) pelo CSS de cada tela.
//   ORION_ICONES.svg('wallet')            → <svg> pronto para anexar
//   ORION_ICONES.montar(raiz)             → troca todo [data-ic="nome"] pelo ícone
//   ORION_ICONES.decorar(raiz, regras)    → coloca ícone no começo de botões, pelo texto (ex.: "Salvar" → disquete)
(() => {
  const NS = 'http://www.w3.org/2000/svg';
  const I = {
    layout: '<rect x="3" y="3" width="7" height="9" rx="1"/><rect x="14" y="3" width="7" height="5" rx="1"/><rect x="14" y="12" width="7" height="9" rx="1"/><rect x="3" y="16" width="7" height="5" rx="1"/>',
    users: '<path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75"/>',
    idcard: '<rect x="3" y="4" width="18" height="16" rx="2"/><circle cx="9" cy="11" r="2.5"/><path d="M5.5 17a3.5 3.5 0 0 1 7 0M14.5 9.5H18M14.5 13H18"/>',
    repeat: '<path d="m17 2 4 4-4 4"/><path d="M3 11v-1a4 4 0 0 1 4-4h14"/><path d="m7 22-4-4 4-4"/><path d="M21 13v1a4 4 0 0 1-4 4H3"/>',
    receipt: '<path d="M4 2v20l3-2 2 2 3-2 3 2 2-2 3 2V2l-3 2-2-2-3 2-3-2-2 2z"/><path d="M8 8h8M8 12h8M8 16h5"/>',
    tag: '<path d="M12.586 2.586A2 2 0 0 0 11.172 2H4a2 2 0 0 0-2 2v7.172a2 2 0 0 0 .586 1.414l8.704 8.704a2.426 2.426 0 0 0 3.42 0l6.58-6.58a2.426 2.426 0 0 0 0-3.42z"/><circle cx="7.5" cy="7.5" r=".6"/>',
    wallet: '<path d="M19 7V4a1 1 0 0 0-1-1H5a2 2 0 0 0 0 4h15a1 1 0 0 1 1 1v4h-3a2 2 0 0 0 0 4h3a1 1 0 0 0 1-1v-2a1 1 0 0 0-1-1"/><path d="M3 5v14a2 2 0 0 0 2 2h15a1 1 0 0 0 1-1v-4"/>',
    megaphone: '<path d="m3 11 18-5v12L3 14v-3z"/><path d="M11.6 16.8a3 3 0 1 1-5.8-1.6"/>',
    shield: '<path d="M12 3 4 6v6c0 5 3.4 8 8 9 4.6-1 8-4 8-9V6z"/><path d="m9 12 2 2 4-4"/>',
    webhook: '<path d="M18 16.98h-5.99c-1.1 0-1.95.94-2.48 1.9A4 4 0 0 1 2 17c.01-.7.2-1.4.57-2"/><path d="m6 17 3.13-5.78c.53-.97.1-2.18-.5-3.1a4 4 0 1 1 6.89-4.06"/><path d="m12 6 3.13 5.73C15.66 12.7 16.9 13 18 13a4 4 0 0 1 0 8"/>',
    plug: '<path d="M12 22v-5"/><path d="M9 8V2"/><path d="M15 8V2"/><path d="M18 8v5a4 4 0 0 1-4 4h-4a4 4 0 0 1-4-4V8Z"/>',
    scroll: '<path d="M8 3h9a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V8"/><path d="M5 8a3 3 0 0 1 3-3"/><path d="M9 9h6M9 13h6M9 17h4"/>',
    logout: '<path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4M16 17l5-5-5-5M21 12H9"/>',
    plus: '<path d="M12 5v14M5 12h14"/>',
    copy: '<rect x="8" y="8" width="14" height="14" rx="2"/><path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2"/>',
    check: '<path d="m4.5 12.5 5 5 10-11"/>',
    x: '<path d="m6 6 12 12M18 6 6 18"/>',
    menu: '<path d="M4 7h16M4 12h16M4 17h10"/>',
    search: '<circle cx="11" cy="11" r="7"/><path d="m21 21-4.3-4.3"/>',
    refresh: '<path d="M3 12a9 9 0 0 1 15-6.7L21 8"/><path d="M21 3v5h-5"/><path d="M21 12a9 9 0 0 1-15 6.7L3 16"/><path d="M8 16H3v5"/>',
    send: '<path d="m22 2-7 20-4-9-9-4z"/><path d="M22 2 11 13"/>',
    save: '<path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"/><path d="M17 21v-8H7v8M7 3v5h8"/>',
    flask: '<path d="M10 2v7.5L4.5 19a2 2 0 0 0 1.8 3h11.4a2 2 0 0 0 1.8-3L14 9.5V2"/><path d="M8.5 2h7M7 16h10"/>',
    zap: '<path d="M13 2 3 14h9l-1 8 10-12h-9z"/>',
    ban: '<circle cx="12" cy="12" r="9"/><path d="m5.6 5.6 12.8 12.8"/>',
    rotate: '<path d="M3 12a9 9 0 1 0 3-6.7L3 8"/><path d="M3 3v5h5"/>',
    unlock: '<rect x="3" y="11" width="18" height="10" rx="2"/><path d="M7 11V7a5 5 0 0 1 9.9-1"/>',
    lock: '<rect x="4" y="11" width="16" height="10" rx="2"/><path d="M8 11V7a4 4 0 0 1 8 0v4"/>',
    mail: '<rect x="3" y="5" width="18" height="14" rx="2"/><path d="m3 7 9 6 9-6"/>',
    globe: '<circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3c3 3 3 15 0 18M12 3c-3 3-3 15 0 18"/>',
    activity: '<path d="M22 12h-4l-3 9L9 3l-3 9H2"/>',
    trend: '<path d="m22 7-8.5 8.5-5-5L2 17"/><path d="M16 7h6v6"/>',
    banknote: '<rect x="2" y="6" width="20" height="12" rx="2"/><circle cx="12" cy="12" r="2.5"/><path d="M6 12h.01M18 12h.01"/>',
    server: '<rect x="2" y="3" width="20" height="7" rx="2"/><rect x="2" y="14" width="20" height="7" rx="2"/><path d="M6 6.5h.01M6 17.5h.01"/>',
    settings: '<path d="M10.39 5.29 L10.62 2.40 L13.38 2.40 L13.61 5.29 A6.9 6.9 0 0 1 15.61 6.12 L17.81 4.23 L19.77 6.19 L17.88 8.39 A6.9 6.9 0 0 1 18.71 10.39 L21.60 10.62 L21.60 13.38 L18.71 13.61 A6.9 6.9 0 0 1 17.88 15.61 L19.77 17.81 L17.81 19.77 L15.61 17.88 A6.9 6.9 0 0 1 13.61 18.71 L13.38 21.60 L10.62 21.60 L10.39 18.71 A6.9 6.9 0 0 1 8.39 17.88 L6.19 19.77 L4.23 17.81 L6.12 15.61 A6.9 6.9 0 0 1 5.29 13.61 L2.40 13.38 L2.40 10.62 L5.29 10.39 A6.9 6.9 0 0 1 6.12 8.39 L4.23 6.19 L6.19 4.23 L8.39 6.12 A6.9 6.9 0 0 1 10.39 5.29Z"/><circle cx="12" cy="12" r="3.1"/>',
    download: '<path d="M12 3v12m0 0-4-4m4 4 4-4"/><path d="M4 17v2a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-2"/>',
    eye: '<path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12z"/><circle cx="12" cy="12" r="3"/>',
    alert: '<path d="M12 3 2 20h20z"/><path d="M12 10v4M12 17h.01"/>',
    link: '<path d="M10 14a4 4 0 0 0 5.7 0l3-3a4 4 0 0 0-5.7-5.7l-1 1"/><path d="M14 10a4 4 0 0 0-5.7 0l-3 3a4 4 0 0 0 5.7 5.7l1-1"/>',
    qr: '<rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><path d="M14 14h3v3h-3zM20 14v.01M14 20h3M20 17v4"/>',
    card: '<rect x="2" y="5" width="20" height="14" rx="2"/><path d="M2 10h20M6 15h4"/>',
    pix: '<path d="M12 3 4 11l3 3 5-5 5 5 3-3z"/><path d="m7 14 5 5 5-5"/>',
    chip: '<rect x="5" y="5" width="14" height="14" rx="2"/><rect x="9" y="9" width="6" height="6"/><path d="M9 2v3M15 2v3M9 19v3M15 19v3M2 9h3M2 15h3M19 9h3M19 15h3"/>',
    sparkles: '<path d="m12 3 1.9 5.1L19 10l-5.1 1.9L12 17l-1.9-5.1L5 10l5.1-1.9z"/><path d="M19 3v4M17 5h4M5 17v4M3 19h4"/>',
    mic: '<rect x="9" y="3" width="6" height="11" rx="3"/><path d="M5 11a7 7 0 0 0 14 0M12 18v3"/>',
    film: '<rect x="3" y="4" width="18" height="16" rx="2"/><path d="M7 4v16M17 4v16M3 9h4M3 15h4M17 9h4M17 15h4"/>',
    pin: '<path d="M12 21s7-6.2 7-11a7 7 0 0 0-14 0c0 4.8 7 11 7 11z"/><circle cx="12" cy="10" r="2.5"/>',
    filetext: '<path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8z"/><path d="M14 3v5h5M9 13h6M9 17h6"/>',
    pen: '<path d="M12 20h9"/><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4z"/>',
    gauge: '<path d="m12 14 4-4"/><path d="M3.3 19a10 10 0 1 1 17.4 0"/>',
    home: '<path d="M3 10.5 12 3l9 7.5"/><path d="M5 9.5V21h14V9.5"/>',
    user: '<circle cx="12" cy="8" r="4"/><path d="M4 21c0-4 3.6-7 8-7s8 3 8 7"/>',
    monitor: '<rect x="3" y="4" width="18" height="12" rx="2"/><path d="M8 20h8M12 16v4"/>',
    palette: '<circle cx="13.5" cy="6.5" r=".6"/><circle cx="17.5" cy="10.5" r=".6"/><circle cx="8.5" cy="7.5" r=".6"/><circle cx="6.5" cy="12.5" r=".6"/><path d="M12 2a10 10 0 0 0 0 20c1.1 0 2-.9 2-2 0-.5-.2-1-.5-1.4-.3-.4-.5-.8-.5-1.3 0-1.1.9-2 2-2h2.4a4 4 0 0 0 4-4C21 6 17 2 12 2z"/>',
    folder: '<path d="M3 7a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>',
    volume: '<path d="M11 5 6 9H3v6h3l5 4z"/><path d="M15.5 8.5a5 5 0 0 1 0 7M18.5 5.5a9 9 0 0 1 0 13"/>',
    power: '<path d="M12 2v10"/><path d="M18.4 6.6a9 9 0 1 1-12.8 0"/>',
    clock: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',
    bell: '<path d="M18 8a6 6 0 0 0-12 0c0 7-3 9-3 9h18s-3-2-3-9z"/><path d="M13.7 21a2 2 0 0 1-3.4 0"/>',
    layers: '<path d="m12 3 9 5-9 5-9-5z"/><path d="m3 13 9 5 9-5"/>',
    info: '<circle cx="12" cy="12" r="9"/><path d="M12 11v5M12 8h.01"/>',
    brain: '<path d="M12 3a4 4 0 0 0-4 4 4 4 0 0 0-3 6.5A4 4 0 0 0 8 20h8a4 4 0 0 0 3-6.5A4 4 0 0 0 16 7a4 4 0 0 0-4-4z"/><path d="M12 3v17"/>',
    store: '<path d="M4 9 5.5 4h13L20 9"/><path d="M4 9a2.5 2.5 0 0 0 5 0 2.5 2.5 0 0 0 5 0 2.5 2.5 0 0 0 5 0 2.5 2.5 0 0 0 1 0"/><path d="M5 12v8h14v-8M10 20v-5h4v5"/>',
    plugs: '<path d="M9 2v6M15 2v6"/><path d="M6 8h12v4a6 6 0 0 1-12 0z"/><path d="M12 18v4"/>',
    upload: '<path d="M12 15V3m0 0L8 7m4-4 4 4"/><path d="M4 17v2a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-2"/>',
    trash: '<path d="M3 6h18M8 6V4a1 1 0 0 1 1-1h6a1 1 0 0 1 1 1v2M6 6l1 14a2 2 0 0 0 2 2h6a2 2 0 0 0 2-2l1-14"/>',
    barchart: '<path d="M3 3v18h18"/><path d="M7.5 16v-4M12 16V8M16.5 16v-7"/>',
    areachart: '<path d="M3 3v18h18"/><path d="M7 16.5 11 11l3 3 5-6.5v9z"/>',
    cart: '<circle cx="9" cy="20" r="1.4"/><circle cx="18" cy="20" r="1.4"/><path d="M2 3h3l2.6 12.4a2 2 0 0 0 2 1.6h8.3a2 2 0 0 0 2-1.5L22 8H6"/>',
    ticket: '<path d="M3 9a3 3 0 0 0 0 6v3a1 1 0 0 0 1 1h16a1 1 0 0 0 1-1v-3a3 3 0 0 0 0-6V6a1 1 0 0 0-1-1H4a1 1 0 0 0-1 1z"/><path d="M13 5v2M13 11v2M13 17v2"/>',
    share: '<circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/><path d="m8.6 13.5 6.8 4M15.4 6.5l-6.8 4"/>',
    scale: '<path d="M12 3v18M6 21h12M5 7h14"/><path d="m5 7-3 7a3 3 0 0 0 6 0zM19 7l-3 7a3 3 0 0 0 6 0z"/>',
    userx: '<circle cx="9" cy="8" r="4"/><path d="M2 21c0-4 3.1-7 7-7 1.7 0 3.2.5 4.4 1.4"/><path d="m17 15 5 5M22 15l-5 5"/>',
    pie: '<path d="M21 12A9 9 0 1 1 12 3v9z"/><path d="M15 3.5A9 9 0 0 1 20.5 9H15z"/>',
    radio: '<circle cx="12" cy="12" r="2"/><path d="M16.2 7.8a6 6 0 0 1 0 8.4M7.8 16.2a6 6 0 0 1 0-8.4M19.1 4.9a10 10 0 0 1 0 14.2M4.9 19.1a10 10 0 0 1 0-14.2"/>',
    newspaper: '<path d="M4 22h16a2 2 0 0 0 2-2V4a2 2 0 0 0-2-2H8a2 2 0 0 0-2 2v16a2 2 0 0 1-4 0v-9h4"/><path d="M10 6h8M10 10h8M10 14h8M10 18h5"/>',
    book: '<path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20V3H6.5A2.5 2.5 0 0 0 4 5.5z"/><path d="M4 19.5A2.5 2.5 0 0 0 6.5 22H20v-5"/><path d="M9 7h7M9 11h5"/>',
    grid: '<rect x="3" y="3" width="7" height="7" rx="1.5"/><rect x="14" y="3" width="7" height="7" rx="1.5"/><rect x="3" y="14" width="7" height="7" rx="1.5"/><rect x="14" y="14" width="7" height="7" rx="1.5"/>',
    wifi: '<path d="M5 12.5a10 10 0 0 1 14 0M8.5 16a5 5 0 0 1 7 0M2 9a14 14 0 0 1 20 0"/><path d="M12 20h.01"/>',
    sun: '<circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/>',
    moon: '<path d="M20 14.5A8 8 0 0 1 9.5 4a8 8 0 1 0 10.5 10.5Z"/>',
    cloud: '<path d="M7 18h10a4 4 0 0 0 .6-7.96A6 6 0 0 0 6.2 9.1 4.5 4.5 0 0 0 7 18Z"/>',
    rain: '<path d="M7 14h10a4 4 0 0 0 .6-7.96A6 6 0 0 0 6.2 5.1 4.5 4.5 0 0 0 7 14Z"/><path d="M8 17l-1 3M12 17l-1 3M16 17l-1 3"/>',
    storm: '<path d="M7 14h10a4 4 0 0 0 .6-7.96A6 6 0 0 0 6.2 5.1 4.5 4.5 0 0 0 7 14Z"/><path d="m12 15-2 4h3l-2 4"/>',
    wind: '<path d="M3 8h11a3 3 0 1 0-3-3M3 12h15a3 3 0 1 1-3 3M3 16h7"/>',
    droplet: '<path d="M12 3s6 6.5 6 11a6 6 0 0 1-12 0c0-4.5 6-11 6-11Z"/>',
    camera: '<path d="M4 7h3l2-3h6l2 3h3a1 1 0 0 1 1 1v11a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V8a1 1 0 0 1 1-1Z"/><circle cx="12" cy="13" r="4"/>',
    wand: '<path d="m4 20 11-11M15 9l2-2M13 7l-1-3M17 11l3 1M18 4l-1 1M20 6l-1 1"/><path d="m13 11 2-2"/>',
    smile: '<circle cx="12" cy="12" r="9"/><path d="M8 14s1.5 2 4 2 4-2 4-2"/><path d="M9 9.5h.01M15 9.5h.01"/>',
    routine: '<path d="M4 6h10M4 12h7M4 18h10"/><circle cx="18" cy="6" r="2"/><path d="m15.5 15.5 2 2 3.5-4"/>',
    calendar: '<rect x="3" y="5" width="18" height="16" rx="2"/><path d="M3 10h18M8 3v4M16 3v4"/>',
    wave: '<path d="M3 12h2l2-6 3 12 3-9 2 6 2-3h4"/>',
    // 1.7: barra lateral, painéis e biblioteca de componentes
    chat: '<path d="M21 12a8 8 0 0 1-11.8 7L3 21l2-6A8 8 0 1 1 21 12z"/><path d="M8.5 12h.01M12 12h.01M15.5 12h.01"/>',
    orbit: '<circle cx="12" cy="12" r="3"/><path d="M19.4 15a8 8 0 1 0-2.1 2.7"/><circle cx="19.4" cy="17.6" r="1.4"/>',
    database: '<ellipse cx="12" cy="5" rx="8" ry="3"/><path d="M4 5v14c0 1.7 3.6 3 8 3s8-1.3 8-3V5"/><path d="M4 12c0 1.7 3.6 3 8 3s8-1.3 8-3"/>',
    heart: '<path d="M19.5 12.6 12 20l-7.5-7.4A4.6 4.6 0 0 1 12 6.3a4.6 4.6 0 0 1 7.5 6.3z"/><path d="M3.5 12h4l1.5-2.5 2.5 5 1.5-2.5h7.5"/>',
    chevron: '<path d="m6 9 6 6 6-6"/>',
    chevleft: '<path d="m15 18-6-6 6-6"/>',
    chevright: '<path d="m9 18 6-6-6-6"/>',
    terminal: '<rect x="3" y="4" width="18" height="16" rx="2"/><path d="m7 9 3 3-3 3M13 15h4"/>',
    rocket: '<path d="M4.5 16.5c-1.5 1.3-2 5-2 5s3.7-.5 5-2c.7-.8.7-2.1-.1-2.9a2.2 2.2 0 0 0-2.9-.1z"/><path d="m12 15-3-3a22 22 0 0 1 2-3.9A12.9 12.9 0 0 1 22 2c0 2.7-.8 7.5-6 11a22 22 0 0 1-4 2z"/><path d="M9 12H4s.6-3 2-4c1.6-1.1 5 0 5 0M12 15v5s3-.6 4-2c1.1-1.6 0-5 0-5"/>',
    cpu: '<rect x="5" y="5" width="14" height="14" rx="2"/><rect x="9" y="9" width="6" height="6" rx="1"/><path d="M9 2v3M15 2v3M9 19v3M15 19v3M2 9h3M2 15h3M19 9h3M19 15h3"/>',
    battery: '<rect x="2" y="7" width="17" height="10" rx="2"/><path d="M22 11v2M6 10v4M10 10v4"/>',
    list: '<path d="M8 6h13M8 12h13M8 18h13M3.5 6h.01M3.5 12h.01M3.5 18h.01"/>',
    filter: '<path d="M3 4h18l-7 8.5V19l-4 2v-8.5z"/>',
    play: '<path d="M7 4v16l13-8z"/>',
    coffee: '<path d="M17 8h1a4 4 0 0 1 0 8h-1"/><path d="M3 8h14v9a4 4 0 0 1-4 4H7a4 4 0 0 1-4-4z"/><path d="M7 2v2M11 2v2M15 2v2"/>',
    bulb: '<path d="M9 18h6M10 22h4"/><path d="M12 2a7 7 0 0 0-4 12.7c.6.5 1 1.3 1 2.1V17h6v-.2c0-.8.4-1.6 1-2.1A7 7 0 0 0 12 2z"/>',
    thermo: '<path d="M14 14.8V4a2 2 0 0 0-4 0v10.8a4 4 0 1 0 4 0z"/>',
    fan: '<circle cx="12" cy="12" r="2"/><path d="M12 10c0-4 1-7 4-7s3 4-2 7M14 12c4 0 7 1 7 4s-4 3-7-2M12 14c0 4-1 7-4 7s-3-4 2-7M10 12c-4 0-7-1-7-4s4-3 7 2"/>',
    blinds: '<path d="M3 3h18M5 3v15M19 3v15M5 7h14M5 11h14M5 15h14"/><circle cx="12" cy="20" r="1.5"/>',
    tv: '<rect x="2" y="5" width="20" height="13" rx="2"/><path d="m8 2 4 3 4-3M7 22h10"/>',
    toggle: '<rect x="2" y="7" width="20" height="10" rx="5"/><circle cx="16" cy="12" r="3"/>',
    star: '<path d="m12 3 2.8 5.7 6.2.9-4.5 4.4 1 6.2L12 17.3 6.5 20.2l1-6.2L3 9.6l6.2-.9z"/>',
    phone: '<path d="M5 4h4l2 5-2.5 1.5a11 11 0 0 0 5 5L15 13l5 2v4a2 2 0 0 1-2 2A16 16 0 0 1 3 6a2 2 0 0 1 2-2"/>',
    target: '<circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="5"/><circle cx="12" cy="12" r="1.5"/>',
    kanban: '<rect x="3" y="4" width="5" height="16" rx="1.5"/><rect x="10" y="4" width="5" height="10" rx="1.5"/><rect x="17" y="4" width="4" height="13" rx="1.5"/>',
    bed: '<path d="M2 20V6M2 16h20v4M22 16v-4a3 3 0 0 0-3-3h-8v7"/><circle cx="6.5" cy="11.5" r="2"/>',
    posture: '<circle cx="12" cy="4.5" r="2"/><path d="M12 7v7l-3 7M12 14l3 7M7 10l5-2 5 2"/>',
    code: '<path d="m16 18 6-6-6-6M8 6l-6 6 6 6"/>',
    component: '<path d="M5.5 8.5 9 12l-3.5 3.5L2 12zM12 2l3.5 3.5L12 9 8.5 5.5zM18.5 8.5 22 12l-3.5 3.5L15 12zM12 15l3.5 3.5L12 22l-3.5-3.5z"/>',
    sidebar: '<rect x="3" y="3" width="18" height="18" rx="2"/><path d="M9 3v18M14 9l3 3-3 3"/>',
    piggy: '<path d="M19 9.5c.5-1.5 2-2 2-2v4l-1.5 1c-.4 1.7-1.5 3.1-3 4V20h-3v-2H10v2H7v-3.4A6 6 0 0 1 4.6 9.7"/><path d="M4.6 9.7A6 6 0 0 1 10.5 6h3a6 6 0 0 1 5.5 3.5"/><path d="M2 9a2 2 0 0 0 2.6 1.7M15.5 11h.01"/>',
    arrowup: '<path d="M12 19V5M5 12l7-7 7 7"/>',
    arrowdown: '<path d="M12 5v14M19 12l-7 7-7-7"/>',
    lockopen: '<rect x="3" y="11" width="18" height="10" rx="2"/><path d="M7 11V7a5 5 0 0 1 9.9-1"/>',
  };
  const cache = new Map();
  function svg(nome, tam) {
    let molde = cache.get(nome);
    if (!molde) {
      const dentro = I[nome] || I.info;
      const doc = new DOMParser().parseFromString(`<svg xmlns="${NS}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false">${dentro}</svg>`, 'image/svg+xml');
      molde = document.importNode(doc.documentElement, true); cache.set(nome, molde);
    }
    const e = molde.cloneNode(true);
    if (tam) { e.setAttribute('width', tam); e.setAttribute('height', tam); }
    return e;
  }
  function montar(raiz = document) {
    raiz.querySelectorAll('[data-ic]').forEach((n) => { if (!n.firstChild) { n.append(svg(n.dataset.ic)); n.classList.add('ic'); } });
  }
  // coloca um ícone no começo dos botões que ainda não têm, escolhendo pelo texto (regras: [[/regex/i, 'icone'], …])
  const REGRAS = [
    [/^(salvar|gravar)/i, 'save'], [/^copiar/i, 'copy'], [/(testar|validar|enviar (evento|pedido) de teste|enviar e-mail de teste)/i, 'flask'], [/^(conferir|atualizar|verificar|procurar|recarregar)/i, 'refresh'],
    [/^(criar|novo|adicionar|aprovar esta|conceder|aprovar)/i, 'plus'], [/^(revogar|negar|remover|excluir|apagar|desconectar)/i, 'ban'], [/^(reativar|restaurar|desfazer)/i, 'rotate'], [/^(liberar|abrir cofre)/i, 'unlock'],
    [/^(gerar|otimizar|gerar com ia)/i, 'sparkles'], [/^(sair|encerrar)/i, 'logout'], [/^(baixar|download)/i, 'download'], [/^(abrir|ver|mostrar|detalhes)/i, 'eye'], [/^(entrar|conectar|ligar)/i, 'link'], [/^(enviar|reenviar)/i, 'send'],
    [/^(organizar|cortar|executar|limpar|iniciar|começar)/i, 'zap'], [/^(detectar|buscar)/i, 'search'], [/^(prévia|previa)/i, 'eye'], [/^teleprompter/i, 'scroll'], [/^produzir/i, 'film'], [/^do início/i, 'rotate'], [/^(listar)/i, 'search'], [/^\+/, 'plus'],
  ];
  function decorar(raiz = document, regras = REGRAS) {
    raiz.querySelectorAll('button, a.btn').forEach((b) => {
      if (b.dataset.semIcone !== undefined || b.closest('[data-sem-icone]') || b.querySelector('svg') || b.classList.contains('so-icone')) return;
      const txt = (b.textContent || '').trim(); if (!txt || txt.length > 40) return;
      const r = regras.find(([re]) => re.test(txt)); if (!r) return;
      const s = svg(r[1]); s.classList.add('btn-ic'); b.prepend(s); b.classList.add('com-icone');
    });
  }
  // títulos de painéis ganham um chip com ícone pelo assunto (só os conhecidos; os outros ficam como estão)
  const TITULOS = [
    [/^agentes/i, 'users'], [/^hist[óo]rico/i, 'clock'], [/^painel da loja|^loja/i, 'store'], [/^diagn[óo]stico/i, 'activity'], [/^configura[çc][õo]es/i, 'settings'],
    [/^geral/i, 'settings'], [/^apar[êe]ncia/i, 'palette'], [/^c[ée]rebro|^ias\b/i, 'brain'], [/^voz/i, 'volume'], [/^conectores/i, 'plugs'], [/^contas e logins/i, 'user'],
    [/^conta e site|^conta orion|^licen[çc]a/i, 'idcard'], [/^modo de uso/i, 'layers'], [/^pastas/i, 'folder'], [/^conex[ãa]o com o site/i, 'link'], [/^backup|^c[óo]pias/i, 'save'], [/^mem[óo]rias/i, 'brain'],
    [/^editor|^motion/i, 'film'], [/^mapeamento|^localiza|^leads/i, 'pin'], [/^transcritor|^transcri/i, 'mic'], [/^roteiros|^conte[úu]do/i, 'pen'], [/^central/i, 'gauge'],
    [/^limpeza/i, 'trash'], [/^organizar/i, 'folder'], [/^gerar imagem/i, 'sparkles'], [/^notifica/i, 'bell'], [/^desempenho|^monitor/i, 'gauge'], [/^envie o arquivo|^1 ·/i, 'upload'], [/^op[çc][õo]es|^2 ·/i, 'settings'],
  ];
  function titulos(raiz = document, seletor = 'h2, h3, h4') {
    raiz.querySelectorAll(seletor).forEach((h) => {
      if (h.dataset.semIcone !== undefined || h.querySelector(':scope > .h-ic') || h.closest('[data-sem-icone]')) return;
      const txt = (h.textContent || '').trim(); if (!txt || txt.length > 60) return;
      const r = TITULOS.find(([re]) => re.test(txt)); if (!r) return;
      const chip = document.createElement('span'); chip.className = 'h-ic'; chip.append(svg(r[1]));
      h.prepend(chip); h.classList.add('com-icone');
    });
  }
  // liga tudo sozinho (telas do app): ícones em botões e títulos, também para o que a página criar depois
  function auto(opcoes = {}) {
    const rodar = () => { try { montar(document); if (opcoes.botoes !== false) decorar(document); if (opcoes.titulos !== false) titulos(document); } catch { /* decoração nunca quebra a tela */ } };
    let t = 0;
    const agendar = () => { clearTimeout(t); t = setTimeout(rodar, 120); };
    new MutationObserver(agendar).observe(document.body, { childList: true, subtree: true });
    rodar();
  }
  window.ORION_ICONES = { svg, montar, decorar, titulos, auto, nomes: Object.keys(I) };
  if (document.readyState !== 'loading') montar(); else document.addEventListener('DOMContentLoaded', () => montar());
})();

```
