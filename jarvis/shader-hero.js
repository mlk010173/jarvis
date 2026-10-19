'use strict';
// Fundo WebGL do hero, em azul/ciano, que reage ao cursor (o núcleo de luz segue o mouse e um halo acende perto dele).
// Porta para JavaScript puro (sem React/build, compatível com a CSP do site) do componente "Animated Shader Hero"
// de ravikatiyar162 (21st.dev); o shader-base é de Matthias Hurrle (@atzedent). Uso conforme os termos da 21st.dev.
(() => {
  const hero = document.getElementById('hero');
  const canvas = document.getElementById('shader-canvas');
  if (!hero || !canvas) return;
  const reduzir = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const gl = canvas.getContext('webgl2', { antialias: false, alpha: false, powerPreference: 'low-power' });
  if (!gl || reduzir) { hero.classList.add('sem-shader'); return; } // sem WebGL2 ou "reduzir movimento": fundo estático em CSS

  const VERT = '#version 300 es\nprecision highp float;\nin vec4 position;\nvoid main(){gl_Position=position;}';
  const FRAG = `#version 300 es
precision highp float;
out vec4 O;
uniform vec2 resolution;
uniform vec2 mouse;      // posição do cursor no espaço do shader (mesma unidade de uv); (9,9) = sem cursor
uniform float time;
uniform float heat;      // 0..1, intensidade do halo do cursor
#define FC gl_FragCoord.xy
#define T time
#define R resolution
#define MN min(R.x,R.y)
float rnd(vec2 p) {
  p=fract(p*vec2(12.9898,78.233));
  p+=dot(p,p+34.56);
  return fract(p.x*p.y);
}
float noise(in vec2 p) {
  vec2 i=floor(p), f=fract(p), u=f*f*(3.-2.*f);
  float a=rnd(i), b=rnd(i+vec2(1,0)), c=rnd(i+vec2(0,1)), d=rnd(i+1.);
  return mix(mix(a,b,u.x),mix(c,d,u.x),u.y);
}
float fbm(vec2 p) {
  float t=.0, a=1.; mat2 m=mat2(1.,-.5,.2,1.2);
  for (int i=0; i<5; i++) { t+=a*noise(p); p*=2.*m; a*=.5; }
  return t;
}
float clouds(vec2 p) {
  float d=1., t=.0;
  for (float i=.0; i<3.; i++) {
    float a=d*fbm(i*10.+p.x*.2+.2*(1.+i)*p.y+d+i*i+p);
    t=mix(t,d,a);
    d=a;
    p*=2./(i+1.);
  }
  return t;
}
void main(void) {
  vec2 uv=(FC-.5*R)/MN, st=uv*vec2(2,1);
  vec2 pull = mouse*.42;               // o núcleo é puxado (de leve) na direção do cursor
  vec3 col=vec3(0);
  float bg=clouds(vec2(st.x+T*.5,-st.y));
  uv*=1.-.3*(sin(T*.2)*.5+.5);
  for (float i=1.; i<12.; i++) {
    uv+=.1*cos(i*vec2(.1+.01*i, .8)+i*i+T*.5+.1*uv.x);
    vec2 p=uv-pull;
    float d=length(p);
    vec3 tint=mix(vec3(.23,.51,.96),vec3(.02,.71,.83),.5+.5*sin(i*1.9));
    col+=.00125/d*tint*1.9;
    float b=noise(i+p+bg*1.731);
    col+=.002*b/length(max(p,vec2(b*p.x*.02,p.y)))*vec3(.35,.7,1.);
    col=mix(col,vec3(bg*.03,bg*.12,bg*.26),d);
  }
  // halo que acende junto do cursor
  vec2 q=(FC-.5*R)/MN-mouse;
  float halo=exp(-dot(q,q)*7.)*heat;
  col+=halo*vec3(.05,.26,.42)*(.7+bg);
  // vinheta suave para o fundo da página (#08090A)
  vec2 vv=FC/R-.5;
  col*=smoothstep(.95,.25,length(vv*vec2(.9,1.15)));
  O=vec4(col,1);
}`;

  const compilar = (tipo, fonte) => {
    const s = gl.createShader(tipo);
    gl.shaderSource(s, fonte); gl.compileShader(s);
    if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) { console.error('shader:', gl.getShaderInfoLog(s)); return null; }
    return s;
  };
  const vs = compilar(gl.VERTEX_SHADER, VERT), fs = compilar(gl.FRAGMENT_SHADER, FRAG);
  if (!vs || !fs) { hero.classList.add('sem-shader'); return; }
  const prog = gl.createProgram();
  gl.attachShader(prog, vs); gl.attachShader(prog, fs); gl.linkProgram(prog);
  if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) { hero.classList.add('sem-shader'); return; }
  const buf = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, buf);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, 1, -1, -1, 1, 1, 1, -1]), gl.STATIC_DRAW);
  const pos = gl.getAttribLocation(prog, 'position');
  gl.enableVertexAttribArray(pos); gl.vertexAttribPointer(pos, 2, gl.FLOAT, false, 0, 0);
  const uRes = gl.getUniformLocation(prog, 'resolution'), uTime = gl.getUniformLocation(prog, 'time');
  const uMouse = gl.getUniformLocation(prog, 'mouse'), uHeat = gl.getUniformLocation(prog, 'heat');

  // meia resolução: o fundo é nebuloso, então o custo de GPU cai bastante sem perda visível
  const escala = () => Math.max(0.6, 0.5 * (window.devicePixelRatio || 1));
  const ajustar = () => {
    const r = hero.getBoundingClientRect(), e = escala();
    canvas.width = Math.max(2, Math.round(r.width * e)); canvas.height = Math.max(2, Math.round(r.height * e));
    gl.viewport(0, 0, canvas.width, canvas.height);
  };
  ajustar();
  new ResizeObserver(ajustar).observe(hero);

  // cursor: alvo em coordenadas do shader, suavizado a cada quadro
  let alvoX = 0, alvoY = 0, mx = 0, my = 0, alvoHeat = 0, heat = 0;
  const mover = (e) => {
    const r = hero.getBoundingClientRect(), mn = Math.min(r.width, r.height);
    alvoX = (e.clientX - r.left - r.width / 2) / mn;
    alvoY = -(e.clientY - r.top - r.height / 2) / mn; // y do GL cresce para cima
    alvoHeat = 1;
  };
  hero.addEventListener('pointermove', mover, { passive: true });
  hero.addEventListener('pointerleave', () => { alvoX = 0; alvoY = 0; alvoHeat = 0; });

  let visivel = true, raf = 0, t0 = performance.now();
  const quadro = (agora) => {
    raf = 0;
    if (!visivel) return;
    mx += (alvoX - mx) * 0.06; my += (alvoY - my) * 0.06; heat += (alvoHeat - heat) * 0.05;
    gl.useProgram(prog);
    gl.uniform2f(uRes, canvas.width, canvas.height);
    gl.uniform1f(uTime, (agora - t0) * 1e-3 + 12);
    gl.uniform2f(uMouse, mx, my);
    gl.uniform1f(uHeat, heat);
    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
    raf = requestAnimationFrame(quadro);
  };
  new IntersectionObserver((e) => { visivel = e[0].isIntersecting; if (visivel && !raf) raf = requestAnimationFrame(quadro); }).observe(hero);
  raf = requestAnimationFrame(quadro);
})();
