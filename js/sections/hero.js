const VERTEX_SHADER = `attribute vec2 p; void main(){ gl_Position = vec4(p,0.0,1.0); }`;

const FRAGMENT_SHADER = `
precision highp float;
uniform vec2 u_res; uniform float u_time; uniform vec2 u_mouse; uniform float u_speed; uniform float u_boost; uniform float u_active;
vec3 mod289(vec3 x){return x-floor(x*(1.0/289.0))*289.0;}
vec2 mod289(vec2 x){return x-floor(x*(1.0/289.0))*289.0;}
vec3 permute(vec3 x){return mod289(((x*34.0)+1.0)*x);}
float snoise(vec2 v){
  const vec4 C=vec4(0.211324865,0.366025403,-0.577350269,0.024390243);
  vec2 i=floor(v+dot(v,C.yy)); vec2 x0=v-i+dot(i,C.xx);
  vec2 i1=(x0.x>x0.y)?vec2(1.0,0.0):vec2(0.0,1.0);
  vec4 x12=x0.xyxy+C.xxzz; x12.xy-=i1;
  i=mod289(i);
  vec3 pp=permute(permute(i.y+vec3(0.0,i1.y,1.0))+i.x+vec3(0.0,i1.x,1.0));
  vec3 m=max(0.5-vec3(dot(x0,x0),dot(x12.xy,x12.xy),dot(x12.zw,x12.zw)),0.0);
  m=m*m; m=m*m;
  vec3 x=2.0*fract(pp*C.www)-1.0; vec3 h=abs(x)-0.5; vec3 ox=floor(x+0.5); vec3 a0=x-ox;
  m*=1.79284291-0.85373472*(a0*a0+h*h);
  vec3 g; g.x=a0.x*x0.x+h.x*x0.y; g.yz=a0.yz*x12.xz+h.yz*x12.yw;
  return 130.0*dot(m,g);
}
float fbm(vec2 p){
  float v=0.0, a=0.5;
  for(int i=0;i<5;i++){ v+=a*snoise(p); p*=2.0; a*=0.5; }
  return v;
}
float curtain(vec2 p, float t, float freq, float amp, float yBase, float phase, float speedMul, float driftAmt, float driftSpeed){
  float drift = sin(t*driftSpeed + phase*2.0)*driftAmt;
  float wobble = sin(p.x*freq + t*speedMul + phase)*amp
               + sin(p.x*freq*2.3 - t*speedMul*0.7 + phase*1.7)*amp*0.35
               + sin(p.x*freq*0.6 + t*speedMul*1.4 + phase*0.5)*amp*0.5;
  float centerY = yBase + drift + wobble;
  float dy = p.y - centerY;
  float band = exp(-max(dy,0.0)*9.0) * exp(-max(-dy,0.0)*22.0);
  float striate = 0.75+0.25*sin(p.x*40.0+t*1.2+phase*3.0);
  float flicker = 0.8+0.2*sin(t*3.2+p.x*14.0+phase*5.0)*sin(t*1.7-phase);
  return band*striate*flicker;
}

void main(){
  vec2 uv=gl_FragCoord.xy/u_res.xy;
  float ar=u_res.x/u_res.y;
  vec2 p=uv; p.x*=ar;
  float t=u_time*0.13;

  vec3 teal=vec3(0.10,0.68,0.50);
  vec3 green=vec3(0.20,0.95,0.35);
  vec3 magenta=vec3(0.28,0.38,0.98);
  vec3 col=vec3(0.0,0.0,0.0);

  float skyMask=smoothstep(0.55,0.85,uv.y);

  vec2 mo=u_mouse; mo.x*=ar;
  float speed=clamp(u_speed,0.0,1.0);
  float md=distance(p,mo);
  float reach=exp(-md*2.6);
  float push=(p.x-mo.x)*reach*0.10;

  vec2 cp=vec2(p.x+push, p.y);
  float c1=curtain(cp,t,3.1,0.075,0.78,0.0,1.4,0.03,0.35);
  float c2=curtain(cp,t,2.3,0.10,0.70,2.1,1.0,0.045,0.24);
  float c3=curtain(cp,t,4.4,0.06,0.87,4.6,1.8,0.025,0.5);

  vec3 aurora = teal*c1*0.9 + green*c2*1.25 + magenta*c3*0.85;

  float glow = 0.7 + reach*speed*1.0 + u_boost*0.7;
  col += aurora*skyMask*glow*(0.85 + u_boost*0.35)*u_active;

  col += vec3(0.2,0.5,0.45)*reach*0.05*skyMask*u_active;

  gl_FragColor=vec4(col,1.0);
}`;

function initAurora(canvas, mouse, boostState) {
  const gl = canvas.getContext('webgl');
  if (!gl) return null;

  const compile = (type, src) => {
    const shader = gl.createShader(type);
    gl.shaderSource(shader, src);
    gl.compileShader(shader);
    return shader;
  };

  const program = gl.createProgram();
  gl.attachShader(program, compile(gl.VERTEX_SHADER, VERTEX_SHADER));
  gl.attachShader(program, compile(gl.FRAGMENT_SHADER, FRAGMENT_SHADER));
  gl.linkProgram(program);
  gl.useProgram(program);

  const buffer = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
  const posLoc = gl.getAttribLocation(program, 'p');
  gl.enableVertexAttribArray(posLoc);
  gl.vertexAttribPointer(posLoc, 2, gl.FLOAT, false, 0, 0);

  const uRes = gl.getUniformLocation(program, 'u_res');
  const uTime = gl.getUniformLocation(program, 'u_time');
  const uMouse = gl.getUniformLocation(program, 'u_mouse');
  const uSpeed = gl.getUniformLocation(program, 'u_speed');
  const uBoost = gl.getUniformLocation(program, 'u_boost');
  const uActive = gl.getUniformLocation(program, 'u_active');

  const resize = () => {
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = canvas.clientWidth * dpr;
    canvas.height = canvas.clientHeight * dpr;
    gl.viewport(0, 0, canvas.width, canvas.height);
  };
  resize();
  window.addEventListener('resize', resize);

  let auroraRamp = 0;
  const start = performance.now();

  const loop = () => {
    mouse.x += (mouse.tx - mouse.x) * 0.08;
    mouse.y += (mouse.ty - mouse.y) * 0.08;
    const rawSpeed = Math.hypot(mouse.vx, mouse.vy) * 14;
    mouse.speed += (Math.min(rawSpeed, 1) - mouse.speed) * 0.15;
    mouse.vx *= 0.85;
    mouse.vy *= 0.85;

    gl.uniform2f(uRes, canvas.width, canvas.height);
    gl.uniform1f(uTime, (performance.now() - start) / 1000);
    gl.uniform2f(uMouse, mouse.x, mouse.y);
    gl.uniform1f(uSpeed, mouse.speed);

    const boostElapsed = boostState.glowStart ? (performance.now() - boostState.glowStart) / 1000 : 999;
    const boostVal = boostElapsed < 3.5
      ? Math.sin(Math.min(1, boostElapsed / 0.5) * Math.PI / 2) * (1 - Math.pow(boostElapsed / 3.5, 2))
      : 0;
    gl.uniform1f(uBoost, Math.max(0, boostVal));

    const auroraTarget = boostState.active ? 1 : 0;
    auroraRamp += (auroraTarget - auroraRamp) * 0.03;
    gl.uniform1f(uActive, auroraRamp);

    gl.drawArrays(gl.TRIANGLES, 0, 3);
    requestAnimationFrame(loop);
  };
  loop();

  return { gl, resize };
}

function initPointer(mouse) {
  window.addEventListener('pointermove', (e) => {
    const nx = e.clientX / window.innerWidth;
    const ny = 1 - e.clientY / window.innerHeight;
    mouse.vx = nx - mouse.tx;
    mouse.vy = ny - mouse.ty;
    mouse.tx = nx;
    mouse.ty = ny;
  });
}

function initParallax(hero, bgImg, canvas, textEl) {
  let raf = null;
  window.addEventListener('scroll', () => {
    if (raf) return;
    raf = requestAnimationFrame(() => {
      raf = null;
      const y = window.scrollY || window.pageYOffset || 0;
      if (bgImg) bgImg.style.transform = `translateY(${y * 0.42}px) scale(1.04)`;
      if (canvas) canvas.style.transform = `translateY(${y * 0.12}px)`;
      if (textEl) {
        const fade = Math.max(0, 1 - y / 420);
        textEl.style.transform = `translateY(calc(-9vh + ${y * 0.26}px))`;
        textEl.style.opacity = String(fade);
      }
    });
  }, { passive: true });
}

const UFO_CONFIGS = [
  {
    nx: (t) => 0.5 + 0.34 * Math.sin(t * 0.055 + 1.3) + 0.10 * Math.sin(t * 0.13 + 4.1) + 0.05 * Math.sin(t * 0.211),
    ny: (t) => 0.68 + 0.07 * Math.sin(t * 0.09 + 2.2) + 0.035 * Math.sin(t * 0.171 + 0.6),
    bob: (t) => Math.sin(t * 1.4) * 3,
    tilt: (t) => Math.sin(t * 0.12) * 8,
    offsetX: 32,
    offsetY: 20,
    beamPeriod: 5000,
    beamJitter: 1200,
    startsOn: true,
  },
  {
    nx: (t) => 0.5 + 0.30 * Math.sin(t * 0.041 + 3.7) + 0.12 * Math.sin(t * 0.17 + 1.9) + 0.04 * Math.sin(t * 0.26 + 5.2),
    ny: (t) => 0.76 + 0.06 * Math.sin(t * 0.076 + 0.4) + 0.03 * Math.sin(t * 0.19 + 3.1),
    bob: (t) => Math.sin(t * 1.1 + 2.0) * 3,
    tiltFromShared: true,
    offsetX: 28,
    offsetY: 17,
    beamPeriod: 6200,
    beamJitter: 1400,
    startsOn: false,
  },
];

function initUfos(hero) {
  const ufoEls = hero.querySelectorAll('[data-ufo]');
  let sharedTilt = 0;
  let lastT = performance.now();

  const states = Array.from(ufoEls).map((el, i) => {
    const config = UFO_CONFIGS[i];
    const beamPath = el.querySelector('[data-ufo-beam]');
    const state = { clock: 0, speedFactor: 1, isCloud: false, revertTimer: null };

    el.addEventListener('pointerenter', () => {
      clearTimeout(state.revertTimer);
      state.isCloud = true;
      el.classList.add('is-cloud');
    });
    el.addEventListener('pointerleave', () => {
      clearTimeout(state.revertTimer);
      state.revertTimer = setTimeout(() => {
        state.isCloud = false;
        el.classList.remove('is-cloud');
      }, 2000);
    });

    const scheduleBeam = () => {
      const isOn = beamPath.classList.toggle('is-on');
      const duration = config.beamPeriod + (Math.random() * config.beamJitter - config.beamJitter / 2);
      state.beamTimer = setTimeout(scheduleBeam, duration);
      return isOn;
    };
    if (config.startsOn) beamPath.classList.add('is-on');
    state.beamTimer = setTimeout(scheduleBeam, config.beamPeriod + (Math.random() * config.beamJitter - config.beamJitter / 2));

    return { el, config, state };
  });

  const loop = () => {
    const now = performance.now();
    const dt = Math.min(0.05, (now - lastT) / 1000);
    lastT = now;
    const w = window.innerWidth;
    const h = window.innerHeight;

    states.forEach(({ el, config, state }, i) => {
      const targetSpeed = state.isCloud ? 0.12 : 1;
      state.speedFactor += (targetSpeed - state.speedFactor) * 0.04;
      state.clock += dt * state.speedFactor;
      const t = state.clock;

      const nx = config.nx(t);
      const ny = config.ny(t);
      const bob = config.bob(t);
      const tilt = config.tiltFromShared ? -sharedTilt : config.tilt(t);
      if (!config.tiltFromShared) sharedTilt = tilt;

      el.style.transform = `translate(${nx * w - config.offsetX}px, ${ny * h - config.offsetY + bob}px) rotate(${tilt}deg)`;
    });

    requestAnimationFrame(loop);
  };
  loop();
}

function initCubeMorph(hero) {
  const cube = hero.querySelector('[data-cube]');
  if (!cube) return;
  const shapes = cube.querySelectorAll('.hero__cube-shape');
  let index = 0;
  let timer = null;

  const setActive = (i) => {
    shapes.forEach((shape, j) => shape.classList.toggle('is-active', j === i));
  };

  const start = () => {
    clearInterval(timer);
    timer = setInterval(() => {
      index = (index + 1) % shapes.length;
      setActive(index);
    }, 750);
  };
  const stop = () => {
    clearInterval(timer);
    index = 0;
    setActive(0);
  };

  cube.addEventListener('mouseenter', start);
  cube.addEventListener('mouseleave', stop);
  cube.addEventListener('focus', start);
  cube.addEventListener('blur', stop);
}

function triggerAuroraAfterLoad(boostState) {
  const trigger = () => {
    setTimeout(() => {
      boostState.active = true;
      boostState.glowStart = performance.now();
    }, 2000);
  };

  if (document.readyState === 'complete') {
    trigger();
  } else {
    window.addEventListener('load', trigger, { once: true });
  }
}

export function initHero(root = document) {
  const hero = root.querySelector('[data-hero]');
  if (!hero) return;

  const canvas = hero.querySelector('[data-hero-canvas]');
  const bgImg = hero.querySelector('[data-hero-bg]');
  const textEl = hero.querySelector('[data-hero-text]');

  const mouse = { x: 0.5, y: 0.5, tx: 0.5, ty: 0.5, vx: 0, vy: 0, speed: 0 };
  const boostState = { active: false, glowStart: 0 };

  initAurora(canvas, mouse, boostState);
  initPointer(mouse);
  initParallax(hero, bgImg, canvas, textEl);
  initUfos(hero);
  initCubeMorph(hero);
  triggerAuroraAfterLoad(boostState);
}
