/* 3D первого экрана (прототип): медный индуктор вокруг тигля с расплавом, искры, импульсы поля, свечение (Three.js).
   Нет WebGL или нет сети — остаётся CSS-свечение (.hero__fallback). Курсор и прокрутка слегка поворачивают сцену. */
import * as THREE from 'three';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';

const canvas = document.querySelector('[data-coil]');
const hero = document.querySelector('[data-hero]');
const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
const BG = 0x05080a;

/** Круглое пятно для свечения и искр. */
function radial(stops) {
  const c = document.createElement('canvas');
  c.width = c.height = 128;
  const g = c.getContext('2d');
  const grd = g.createRadialGradient(64, 64, 0, 64, 64, 64);
  for (const [o, col] of stops) grd.addColorStop(o, col);
  g.fillStyle = grd;
  g.fillRect(0, 0, 128, 128);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

/** Виток за витком: спираль индуктора. */
class Helix extends THREE.Curve {
  constructor(r, h, turns, y0) {
    super();
    Object.assign(this, { r, h, turns, y0 });
  }
  getPoint(t, target = new THREE.Vector3()) {
    const a = t * this.turns * Math.PI * 2;
    return target.set(Math.cos(a) * this.r, this.y0 + t * this.h, Math.sin(a) * this.r);
  }
}

const MELT_FRAG = /* glsl */ `
  uniform float uTime; uniform float uHeat; varying vec2 vUv;
  float hash(vec2 p){ return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
  float noise(vec2 p){ vec2 i = floor(p), f = fract(p); vec2 u = f*f*(3.0-2.0*f);
    return mix(mix(hash(i), hash(i+vec2(1,0)), u.x), mix(hash(i+vec2(0,1)), hash(i+vec2(1,1)), u.x), u.y); }
  float fbm(vec2 p){ float v = 0.0, a = 0.5; for (int i = 0; i < 5; i++){ v += a*noise(p); p *= 2.03; a *= 0.5; } return v; }
  void main(){
    vec2 p = (vUv - 0.5) * 2.0; float r = length(p);
    vec2 q = vec2(fbm(p*2.1 + vec2(uTime*0.11, -uTime*0.07)), fbm(p*2.1 + vec2(-uTime*0.09, uTime*0.06) + 3.1));
    float n = fbm(p*2.8 + q*1.7 + uTime*0.04);
    float veins = smoothstep(0.42, 0.6, fbm(p*5.5 + q*2.2 - uTime*0.05));
    float heat = clamp(n*1.15 + (1.0 - r)*0.42 + uHeat*0.22, 0.0, 1.0);
    vec3 c1 = vec3(0.30, 0.03, 0.0), c2 = vec3(1.0, 0.25, 0.02), c3 = vec3(1.0, 0.62, 0.16), c4 = vec3(1.0, 0.93, 0.75);
    vec3 col = mix(c1, c2, smoothstep(0.12, 0.42, heat));
    col = mix(col, c3, smoothstep(0.42, 0.72, heat));
    col = mix(col, c4, smoothstep(0.78, 1.0, heat));
    col *= mix(0.5, 1.0, veins);
    col *= 1.0 - smoothstep(0.86, 1.0, r) * 0.55;
    gl_FragColor = vec4(col * (1.6 + uHeat * 0.9), 1.0);
  }`;

function start() {
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: 'high-performance' });
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.05;

  const scene = new THREE.Scene();
  scene.background = new THREE.Color(BG);
  const pmrem = new THREE.PMREMGenerator(renderer);
  scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
  scene.environmentIntensity = 0.42;

  const camera = new THREE.PerspectiveCamera(30, 1, 0.1, 100);
  const rig = new THREE.Group();
  scene.add(rig);

  // индуктор: медная трубка, семь витков; выводы к шинам — сзади
  const copper = new THREE.MeshPhysicalMaterial({ color: 0xb8693d, metalness: 1, roughness: 0.3, clearcoat: 0.35, clearcoatRoughness: 0.25 });
  const coilGroup = new THREE.Group();
  coilGroup.rotation.y = Math.PI / 2;
  rig.add(coilGroup);
  const helix = new Helix(1.36, 1.9, 7, -1.12);
  coilGroup.add(new THREE.Mesh(new THREE.TubeGeometry(helix, 1400, 0.118, 24, false), copper));
  // выводы уходят назад и вниз, к кабелям у пола — спереди их не видно
  for (const t of [0, 1]) {
    const p = helix.getPoint(t);
    const lead = new THREE.CatmullRomCurve3([p, p.clone().add(new THREE.Vector3(0.38, 0, 0)), p.clone().add(new THREE.Vector3(0.58, -0.22, 0)), new THREE.Vector3(p.x + 0.62, -1.3, p.z)]);
    coilGroup.add(new THREE.Mesh(new THREE.TubeGeometry(lead, 60, 0.1, 18, false), copper));
  }

  // тигель: огнеупорная чаша
  const profile = [
    [0, -1.3], [1.1, -1.3], [1.14, -1.22], [1.14, 0.98], [1.09, 1.06], [0.98, 1.06], [0.93, 0.99], [0.93, -1.08], [0, -1.08],
  ].map(([x, y]) => new THREE.Vector2(x, y));
  rig.add(new THREE.Mesh(new THREE.LatheGeometry(profile, 120), new THREE.MeshStandardMaterial({ color: 0x3a3430, roughness: 0.93, metalness: 0.04, side: THREE.DoubleSide })));

  // расплав
  const melt = new THREE.Mesh(
    new THREE.CircleGeometry(0.93, 120),
    new THREE.ShaderMaterial({
      uniforms: { uTime: { value: 0 }, uHeat: { value: 0.8 } },
      vertexShader: 'varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }',
      fragmentShader: MELT_FRAG,
    }),
  );
  melt.rotation.x = -Math.PI / 2;
  melt.position.y = 0.86;
  rig.add(melt);

  // свет расплава подсвечивает витки изнутри; холодный контровой — фирменный teal
  const heat = new THREE.PointLight(0xff7a22, 12, 9, 2);
  heat.position.set(0, 1.25, 0);
  rig.add(heat);
  const rim = new THREE.DirectionalLight(0x7fc8ff, 1.8);
  rim.position.set(-5, 3, -4);
  scene.add(rim);
  const key = new THREE.DirectionalLight(0xffffff, 0.55);
  key.position.set(4, 5, 6);
  scene.add(key);
  scene.add(new THREE.HemisphereLight(0x1f3a48, 0x050505, 0.5));

  // свечение над расплавом и отблеск на полу
  const glowTex = radial([[0, 'rgba(255,255,255,1)'], [0.25, 'rgba(255,255,255,0.55)'], [1, 'rgba(255,255,255,0)']]);
  const glow = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTex, color: 0xff7418, transparent: true, opacity: 0.5, blending: THREE.AdditiveBlending, depthWrite: false }));
  glow.scale.set(3.8, 3.8, 1);
  glow.position.y = 1.15;
  rig.add(glow);
  const floor = new THREE.Mesh(
    new THREE.PlaneGeometry(7, 7),
    new THREE.MeshBasicMaterial({ map: glowTex, color: 0xff5a10, transparent: true, opacity: 0.22, blending: THREE.AdditiveBlending, depthWrite: false }),
  );
  floor.rotation.x = -Math.PI / 2;
  floor.position.y = -1.32;
  rig.add(floor);

  // импульсы поля — тонкие кольца расходятся от индуктора
  const rings = [0, 1, 2].map(() => {
    const m = new THREE.Mesh(
      new THREE.TorusGeometry(1.55, 0.0065, 8, 160),
      new THREE.MeshBasicMaterial({ color: 0x59d2ff, transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false }),
    );
    m.rotation.x = Math.PI / 2;
    rig.add(m);
    return m;
  });

  // искры
  const N = 260;
  const pos = new Float32Array(N * 3);
  const col = new Float32Array(N * 3);
  const vel = new Float32Array(N * 3);
  const life = new Float32Array(N);
  const ttl = new Float32Array(N);
  const spawn = (i, aged) => {
    const a = Math.random() * Math.PI * 2;
    const r = Math.sqrt(Math.random()) * 0.78;
    pos.set([Math.cos(a) * r, 0.9, Math.sin(a) * r], i * 3);
    vel.set([(Math.random() - 0.5) * 0.5, 0.7 + Math.random() * 1.6, (Math.random() - 0.5) * 0.5], i * 3);
    ttl[i] = 0.9 + Math.random() * 1.9;
    life[i] = aged ? Math.random() * ttl[i] : 0;
  };
  for (let i = 0; i < N; i++) spawn(i, true);
  const sparkGeo = new THREE.BufferGeometry();
  sparkGeo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  sparkGeo.setAttribute('color', new THREE.BufferAttribute(col, 3));
  const sparks = new THREE.Points(
    sparkGeo,
    new THREE.PointsMaterial({ size: 0.055, map: glowTex, vertexColors: true, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending }),
  );
  rig.add(sparks);
  const stepSparks = (dt) => {
    for (let i = 0; i < N; i++) {
      life[i] += dt;
      if (life[i] > ttl[i]) spawn(i, false);
      const k = i * 3;
      vel[k + 1] -= 0.45 * dt;
      vel[k] *= 0.995;
      vel[k + 2] *= 0.995;
      pos[k] += vel[k] * dt;
      pos[k + 1] += vel[k + 1] * dt;
      pos[k + 2] += vel[k + 2] * dt;
      const f = 1 - life[i] / ttl[i];
      col[k] = 2.4 * f;
      col[k + 1] = (0.5 + 0.6 * f) * f * 1.6;
      col[k + 2] = 0.18 * f * f;
    }
    sparkGeo.attributes.position.needsUpdate = true;
    sparkGeo.attributes.color.needsUpdate = true;
  };

  // постобработка: свечение раскалённого
  const composer = new EffectComposer(renderer);
  composer.addPass(new RenderPass(scene, camera));
  const bloom = new UnrealBloomPass(new THREE.Vector2(1, 1), 0.72, 0.5, 0.88);
  composer.addPass(bloom);
  composer.addPass(new OutputPass());

  // раскладка: на широком экране — справа от текста, на телефоне — под ним
  const base = { x: 2.2, y: -0.15, s: 0.84 };
  const layout = () => {
    const w = canvas.clientWidth;
    const h = canvas.clientHeight;
    const mobile = w < 760;
    renderer.setPixelRatio(Math.min(devicePixelRatio, mobile ? 1.5 : 1.75));
    renderer.setSize(w, h, false);
    composer.setSize(w, h);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
    Object.assign(base, mobile ? { x: 0, y: -1.15, s: 0.64 } : w < 1100 ? { x: 1.45, y: -0.15, s: 0.78 } : { x: 2.2, y: -0.15, s: 0.84 });
  };

  const pointer = { x: 0, y: 0 };
  const smooth = { x: 0, y: 0 };
  addEventListener('pointermove', (e) => {
    pointer.x = e.clientX / innerWidth - 0.5;
    pointer.y = e.clientY / innerHeight - 0.5;
  }, { passive: true });

  const clock = new THREE.Clock();
  let t = 0;
  const draw = (dt) => {
    t += dt;
    const p = Math.min(1, Math.max(0, -hero.getBoundingClientRect().top / hero.offsetHeight));
    smooth.x += (pointer.x - smooth.x) * 0.05;
    smooth.y += (pointer.y - smooth.y) * 0.05;

    rig.position.set(base.x + smooth.x * 0.3, base.y + p * 1.3 + Math.sin(t * 0.6) * 0.035, 0);
    rig.rotation.set(0.05 + p * 0.32 + smooth.y * 0.08, -0.35 + Math.sin(t * 0.22) * 0.32 + p * 0.8 + smooth.x * 0.35, 0);
    rig.scale.setScalar(base.s * (1 + p * 0.1));
    camera.position.set(smooth.x * 0.5, 2.9 - smooth.y * 0.4, 10.6);
    camera.lookAt(0, 0.1, 0);

    const flicker = Math.sin(t * 7.1) * 0.5 + Math.sin(t * 13.3) * 0.3 + Math.sin(t * 2.3) * 0.2;
    melt.material.uniforms.uTime.value = t;
    melt.material.uniforms.uHeat.value = 0.75 + flicker * 0.08 + p * 0.25;
    heat.intensity = 12 + flicker * 2 + p * 5;
    glow.material.opacity = 0.46 + flicker * 0.05;
    rings.forEach((r, i) => {
      const ph = (t * 0.33 + i / 3) % 1;
      r.scale.setScalar(0.95 + ph * 0.75);
      r.position.y = -0.2 + Math.sin(i * 2.1) * 0.5;
      r.material.opacity = Math.sin(ph * Math.PI) * 0.16;
    });
    stepSparks(dt);
    composer.render();
  };

  layout();
  addEventListener('resize', layout);
  hero.classList.add('has-3d');

  if (reduce) {
    draw(0.016);
    addEventListener('resize', () => draw(0));
    return;
  }
  let visible = true;
  new IntersectionObserver(([e]) => {
    visible = e.isIntersecting;
  }).observe(hero);
  const loop = () => {
    requestAnimationFrame(loop);
    const dt = Math.min(clock.getDelta(), 0.05);
    if (visible && !document.hidden) draw(dt);
  };
  loop();
}

try {
  if (canvas && hero) start();
} catch (err) {
  console.warn('3D первого экрана не запустился, остаётся свечение', err);
}
