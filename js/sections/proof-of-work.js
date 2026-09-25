const VERTEX_SHADER = `attribute vec2 p; void main(){ gl_Position = vec4(p,0.0,1.0); }`;

const FRAGMENT_SHADER = `
precision highp float;
uniform vec2 u_res; uniform float u_time;

float hash(vec2 p){ return fract(sin(dot(p, vec2(127.1,311.7))) * 43758.5453123); }
float noise(vec2 p){
  vec2 i = floor(p), f = fract(p);
  vec2 u = f*f*(3.0-2.0*f);
  return mix(mix(hash(i), hash(i+vec2(1,0)), u.x),
             mix(hash(i+vec2(0,1)), hash(i+vec2(1,1)), u.x), u.y);
}
float fbm(vec2 p){
  float v = 0.0, a = 0.5;
  for(int i=0;i<6;i++){ v += a*noise(p); p *= 2.03; a *= 0.5; }
  return v;
}

// domain-warped fbm: the warp is what turns smooth blobs into the
// cauliflower edges real cumulus have
float cloud(vec2 q){
  vec2 w = q + vec2(fbm(q*0.85), fbm(q*0.85 + 7.3)) * 0.75;
  float raw = fbm(w*1.2);
  // six octaves of value noise only span about 0.27..0.76 around a mean
  // of 0.5, so stretch that to a true 0..1 or every threshold below
  // sits above the range the field can actually reach
  return smoothstep(0.26, 0.78, raw);
}

// one drifting cloud bank. returns lit colour in rgb, coverage in a.
vec4 bank(vec2 p, float scale, float yc, float spread, float drift, float thr, float soft){
  vec2 q = p * scale + vec2(drift, 0.0);
  float d = cloud(q);
  // x*x, not pow(): a negative base is undefined in GLSL ES
  float x = (p.y - yc) / spread;
  float band = exp(-x*x);
  float cov = smoothstep(thr, thr + soft, d) * band;
  // density falling off upward means we are near a sunlit top
  float grad = d - cloud(q + vec2(0.0, 0.16));
  float shade = clamp(0.62 + grad*2.6, 0.30, 1.0);
  // brighter than pure white at the tops, and a warmer grey in shadow,
  // so the puffs separate from the blue instead of tinting toward it
  vec3 cc = mix(vec3(0.62, 0.66, 0.75), vec3(1.0, 1.0, 0.99), shade);
  return vec4(cc, clamp(cov, 0.0, 1.0));
}

void main(){
  vec2 uv = gl_FragCoord.xy / u_res;
  float ar = u_res.x / max(u_res.y, 1.0);
  vec2 p = vec2(uv.x*ar, uv.y);
  float t = u_time;

  // pale-toward-horizon gradient, kept light enough for dark type
  // richer, slightly cooler blue: more saturated up top so white cloud
  // tops read against it, still pale at the horizon for dark type
  vec3 skyTop = vec3(0.20, 0.45, 0.80);
  vec3 skyMid = vec3(0.42, 0.65, 0.89);
  vec3 skyLow = vec3(0.74, 0.86, 0.96);
  vec3 col = mix(skyLow, skyMid, smoothstep(0.0, 0.52, uv.y));
  col = mix(col, skyTop, smoothstep(0.46, 1.0, uv.y));

  // sun off the upper right, giving the banks a consistent light direction
  vec2 sun = vec2(ar*0.80, 0.92);
  float sd = length(p - sun);
  col += vec3(1.0, 0.97, 0.88) * exp(-sd*sd*2.6) * 0.26;

  vec4 b;

  // far bank — small, high, slow, blended toward the sky by aerial perspective
  b = bank(p, 5.4, 0.86, 0.13, t*0.016, 0.56, 0.26);
  col = mix(col, mix(col, b.rgb, 0.78), b.a*0.52);

  // mid bank — enters from the left
  b = bank(p, 3.6, 0.62, 0.15, -t*0.026, 0.53, 0.24);
  col = mix(col, mix(col, b.rgb, 0.92), b.a*0.76);

  // near bank — largest and lowest, enters from the right
  b = bank(p, 2.5, 0.26, 0.17, t*0.040, 0.49, 0.22);
  col = mix(col, b.rgb, b.a*0.90);

  // thin fast wisps across the middle, enters from the left
  b = bank(p, 8.4, 0.48, 0.26, -t*0.062, 0.66, 0.28);
  col = mix(col, b.rgb, b.a*0.16);

  gl_FragColor = vec4(col, 1.0);
}`;

function initSkyShader(canvas, sectionEl) {
  const gl = canvas.getContext('webgl');
  if (!gl) return;

  const compile = (type, src) => {
    const shader = gl.createShader(type);
    gl.shaderSource(shader, src);
    gl.compileShader(shader);
    if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
      console.error('sky shader compile failed:', gl.getShaderInfoLog(shader));
    }
    return shader;
  };

  const program = gl.createProgram();
  gl.attachShader(program, compile(gl.VERTEX_SHADER, VERTEX_SHADER));
  gl.attachShader(program, compile(gl.FRAGMENT_SHADER, FRAGMENT_SHADER));
  gl.linkProgram(program);
  if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
    console.error('sky program link failed:', gl.getProgramInfoLog(program));
  }
  gl.useProgram(program);

  const buffer = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]), gl.STATIC_DRAW);
  const posLoc = gl.getAttribLocation(program, 'p');
  gl.enableVertexAttribArray(posLoc);
  gl.vertexAttribPointer(posLoc, 2, gl.FLOAT, false, 0, 0);

  const uRes = gl.getUniformLocation(program, 'u_res');
  const uTime = gl.getUniformLocation(program, 'u_time');

  const resize = () => {
    const dpr = Math.min(window.devicePixelRatio || 1, 1.3);
    canvas.width = Math.max(1, Math.floor(canvas.clientWidth * dpr));
    canvas.height = Math.max(1, Math.floor(canvas.clientHeight * dpr));
    gl.viewport(0, 0, canvas.width, canvas.height);
  };
  resize();
  window.addEventListener('resize', resize);
  requestAnimationFrame(() => requestAnimationFrame(resize));

  // only render while the section is on screen — this canvas is tall and
  // there is already a second shader running behind the whole page
  let visible = true;
  const observer = new IntersectionObserver((entries) => {
    visible = entries[0].isIntersecting;
  }, { rootMargin: '200px' });
  observer.observe(sectionEl);

  const start = performance.now();
  const loop = () => {
    requestAnimationFrame(loop);
    if (!visible) return;
    gl.uniform2f(uRes, canvas.width, canvas.height);
    gl.uniform1f(uTime, (performance.now() - start) / 1000);
    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
  };
  loop();
}

export function initProof(root = document) {
  const section = root.querySelector('[data-proof]');
  if (!section) return;

  const canvas = section.querySelector('[data-proof-sky]');
  if (!canvas) return;

  initSkyShader(canvas, section);
}
