/**
 * Эффект праздничной обложки главной (раздел «Праздники» в админке): снег,
 * искры, лепестки или огоньки на <canvas class="hero__fx" data-fx="…"> — над
 * баннером, под текстом. Рисуется только пока обложка на экране и вкладка
 * открыта; при «уменьшить движение» в системе не рисуется вовсе. Частиц —
 * по площади обложки, чёткость холста — не выше 1,5×: эффект лёгкий и на
 * телефоне. Частицы — заранее нарисованные спрайты (быстро и мягко).
 */
type Kind = 'snow' | 'sparks' | 'petals' | 'sparkle';

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  /** радиус, px */
  r: number;
  /** прозрачность */
  a: number;
  /** фаза колебания и её скорость */
  phase: number;
  freq: number;
  /** размах колебания, px */
  amp: number;
  /** поворот и его скорость (лепестки) */
  rot: number;
  vr: number;
  /** возраст и срок жизни, с (искры) */
  age: number;
  life: number;
  sprite: HTMLCanvasElement;
}

const KINDS: readonly Kind[] = ['snow', 'sparks', 'petals', 'sparkle'];
/** одна частица на столько px² обложки, но не меньше min и не больше max */
const DENSITY: Record<Kind, { per: number; min: number; max: number }> = {
  snow: { per: 8500, min: 40, max: 170 },
  sparks: { per: 15000, min: 24, max: 95 },
  petals: { per: 30000, min: 10, max: 36 },
  sparkle: { per: 19000, min: 18, max: 72 },
};

const rand = (a: number, b: number) => a + Math.random() * (b - a);
const pick = <T>(list: readonly T[]): T => list[Math.floor(Math.random() * list.length)]!;

/** Холст-спрайт size×size, нарисованный draw. */
function sprite(size: number, draw: (c: CanvasRenderingContext2D, s: number) => void): HTMLCanvasElement {
  const el = document.createElement('canvas');
  el.width = el.height = size;
  const c = el.getContext('2d');
  if (c) draw(c, size);
  return el;
}

/** Мягкая светящаяся точка: цвета от центра к краю. */
const glow = (stops: [number, string][]) =>
  sprite(64, (c, s) => {
    const g = c.createRadialGradient(s / 2, s / 2, 0, s / 2, s / 2, s / 2);
    for (const [at, color] of stops) g.addColorStop(at, color);
    c.fillStyle = g;
    c.fillRect(0, 0, s, s);
  });

/** Лепесток: капля из двух кривых с лёгкой прожилкой. */
const petal = (fill: string, edge: string) =>
  sprite(48, (c, s) => {
    c.translate(s / 2, s / 2);
    const g = c.createLinearGradient(0, -s * 0.42, 0, s * 0.42);
    g.addColorStop(0, edge);
    g.addColorStop(0.55, fill);
    g.addColorStop(1, edge);
    c.fillStyle = g;
    c.beginPath();
    c.moveTo(0, -s * 0.42);
    c.bezierCurveTo(s * 0.34, -s * 0.22, s * 0.3, s * 0.26, 0, s * 0.42);
    c.bezierCurveTo(-s * 0.3, s * 0.26, -s * 0.34, -s * 0.22, 0, -s * 0.42);
    c.fill();
    c.strokeStyle = 'rgba(255,255,255,0.35)';
    c.lineWidth = 1;
    c.beginPath();
    c.moveTo(0, -s * 0.3);
    c.quadraticCurveTo(s * 0.04, 0, 0, s * 0.32);
    c.stroke();
  });

/** Четырёхлучевая звёздочка с ореолом. */
const star = () =>
  sprite(64, (c, s) => {
    const h = s / 2;
    const halo = c.createRadialGradient(h, h, 0, h, h, h * 0.55);
    halo.addColorStop(0, 'rgba(255,240,200,0.55)');
    halo.addColorStop(1, 'rgba(255,220,150,0)');
    c.fillStyle = halo;
    c.fillRect(0, 0, s, s);
    c.fillStyle = 'rgba(255,248,225,0.95)';
    c.beginPath();
    c.moveTo(h, 0);
    c.quadraticCurveTo(h + 3, h - 3, s, h);
    c.quadraticCurveTo(h + 3, h + 3, h, s);
    c.quadraticCurveTo(h - 3, h + 3, 0, h);
    c.quadraticCurveTo(h - 3, h - 3, h, 0);
    c.fill();
  });

/** Спрайты эффектов — рисуются один раз, при первом запуске эффекта. */
function sprites(kind: Kind): HTMLCanvasElement[] {
  switch (kind) {
    case 'snow':
      return [glow([[0, 'rgba(255,255,255,1)'], [0.35, 'rgba(255,255,255,0.85)'], [1, 'rgba(255,255,255,0)']])];
    case 'sparks':
      // горячая — светлая, остывающая — оранжевая, затухающая — красная
      return [
        glow([[0, 'rgba(255,252,235,1)'], [0.25, 'rgba(255,214,140,0.9)'], [1, 'rgba(255,150,60,0)']]),
        glow([[0, 'rgba(255,236,190,1)'], [0.3, 'rgba(255,160,70,0.85)'], [1, 'rgba(255,100,30,0)']]),
        glow([[0, 'rgba(255,190,120,0.95)'], [0.35, 'rgba(240,90,30,0.7)'], [1, 'rgba(200,50,20,0)']]),
      ];
    case 'petals':
      return [
        petal('rgba(250,200,214,0.95)', 'rgba(236,150,178,0.95)'),
        petal('rgba(255,236,242,0.95)', 'rgba(244,190,208,0.95)'),
        petal('rgba(255,250,250,0.95)', 'rgba(232,214,224,0.95)'),
        petal('rgba(255,226,140,0.95)', 'rgba(240,190,70,0.95)'),
      ];
    case 'sparkle':
      return [star(), glow([[0, 'rgba(255,244,214,0.95)'], [0.3, 'rgba(255,222,150,0.55)'], [1, 'rgba(255,210,130,0)']])];
  }
}

/** Новая частица (или перезапуск ушедшей с экрана). first — при первом заполнении: по всей высоте. */
function spawn(kind: Kind, p: Particle, w: number, h: number, set: HTMLCanvasElement[], first: boolean): void {
  p.phase = rand(0, Math.PI * 2);
  p.age = 0;
  switch (kind) {
    case 'snow': {
      // три слоя глубины: дальние — мелкие, медленные и прозрачные, ближние — крупные
      const layer = Math.random() < 0.5 ? 0 : Math.random() < 0.64 ? 1 : 2;
      p.r = [rand(0.7, 1.3), rand(1.4, 2.2), rand(2.4, 3.6)][layer]!;
      p.vy = [rand(16, 28), rand(28, 46), rand(48, 76)][layer]!;
      p.vx = rand(4, 14);
      p.amp = [6, 10, 16][layer]!;
      p.freq = rand(0.5, 1.2);
      p.a = [rand(0.3, 0.45), rand(0.5, 0.7), rand(0.75, 0.95)][layer]!;
      p.x = rand(-20, w + 20);
      p.y = first ? rand(-10, h) : rand(-24, -6);
      p.sprite = set[0]!;
      break;
    }
    case 'sparks': {
      // искры поднимаются снизу, гуще — справа, где на баннерах металл и сварка
      p.x = w * (0.42 + 0.58 * Math.pow(Math.random(), 0.65));
      p.y = first ? rand(h * 0.35, h + 8) : h + rand(2, 14);
      p.vx = rand(-24, 18);
      p.vy = -rand(60, 150);
      p.r = rand(0.8, 2.1);
      p.life = rand(1.4, 3.6);
      p.age = first ? rand(0, p.life * 0.7) : 0;
      p.freq = rand(8, 16);
      p.a = 1;
      p.sprite = set[0]!;
      break;
    }
    case 'petals': {
      p.r = rand(7, 13);
      p.x = rand(w * 0.05, w * 1.1);
      p.y = first ? rand(-20, h) : rand(-40, -16);
      p.vx = -rand(10, 26);
      p.vy = rand(20, 42);
      p.rot = rand(0, Math.PI * 2);
      p.vr = rand(-1.1, 1.1);
      p.freq = rand(1.4, 2.8);
      p.amp = rand(10, 22);
      p.a = rand(0.75, 0.95);
      // мимоза — изредка
      p.sprite = Math.random() < 0.12 ? set[3]! : pick(set.slice(0, 3));
      break;
    }
    case 'sparkle': {
      const isStar = Math.random() < 0.3;
      p.sprite = isStar ? set[0]! : set[1]!;
      p.r = isStar ? rand(3, 6) : rand(1.2, 3.2);
      p.x = w * (0.3 + 0.7 * Math.random());
      p.y = first ? rand(0, h) : h + rand(4, 20);
      p.vx = rand(-4, 4);
      p.vy = -rand(4, 14);
      p.freq = rand(1.2, 3.2);
      p.a = isStar ? rand(0.7, 1) : rand(0.35, 0.7);
      break;
    }
  }
}

/** Шаг частицы на dt секунд; false — ушла с экрана или догорела (перезапустить). */
function step(kind: Kind, p: Particle, dt: number, w: number, h: number): boolean {
  p.phase += p.freq * dt;
  switch (kind) {
    case 'snow':
      p.x += (p.vx + Math.cos(p.phase) * p.amp * 0.8) * dt;
      p.y += p.vy * dt;
      return p.y < h + 12 && p.x < w + 24;
    case 'sparks':
      p.age += dt;
      p.vy += 26 * dt; // остывая, замедляются
      p.vx += rand(-30, 30) * dt;
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      return p.age < p.life && p.y > -12;
    case 'petals':
      p.rot += p.vr * dt;
      p.x += (p.vx + Math.sin(p.phase) * p.amp) * dt;
      p.y += p.vy * dt;
      return p.y < h + 24 && p.x > -30;
    case 'sparkle':
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      return p.y > -12;
  }
}

function draw(kind: Kind, c: CanvasRenderingContext2D, p: Particle, set: HTMLCanvasElement[]): void {
  switch (kind) {
    case 'snow': {
      const d = p.r * 4;
      c.globalAlpha = p.a;
      c.drawImage(p.sprite, p.x - d / 2, p.y - d / 2, d, d);
      return;
    }
    case 'sparks': {
      const t = p.age / p.life;
      const fade = Math.pow(1 - t, 0.8) * (0.75 + 0.25 * Math.sin(p.phase));
      // короткий след раскалённой частицы
      c.globalAlpha = fade * 0.5;
      c.strokeStyle = t < 0.4 ? 'rgb(255,214,150)' : 'rgb(255,140,60)';
      c.lineWidth = p.r * 0.9;
      c.beginPath();
      c.moveTo(p.x - p.vx * 0.045, p.y - p.vy * 0.045);
      c.lineTo(p.x, p.y);
      c.stroke();
      const d = p.r * 7;
      c.globalAlpha = fade;
      c.drawImage(set[t < 0.35 ? 0 : t < 0.7 ? 1 : 2]!, p.x - d / 2, p.y - d / 2, d, d);
      return;
    }
    case 'petals': {
      const d = p.r * 2.6;
      c.save();
      c.translate(p.x, p.y);
      c.rotate(p.rot);
      // переворот в воздухе: лепесток то плашмя, то ребром
      c.scale(1, 0.25 + 0.75 * Math.abs(Math.cos(p.phase * 0.6)));
      c.globalAlpha = p.a;
      c.drawImage(p.sprite, -d / 2, -d / 2, d, d);
      c.restore();
      return;
    }
    case 'sparkle': {
      const d = p.r * 4;
      c.globalAlpha = p.a * (0.35 + 0.65 * (0.5 + 0.5 * Math.sin(p.phase)));
      c.drawImage(p.sprite, p.x - d / 2, p.y - d / 2, d, d);
      return;
    }
  }
}

function run(canvas: HTMLCanvasElement, kind: Kind): void {
  const c = canvas.getContext('2d');
  const hero = canvas.parentElement;
  if (!c || !hero) return;
  const set = sprites(kind);
  const additive = kind === 'sparks' || kind === 'sparkle';
  const parts: Particle[] = [];
  let w = 0;
  let h = 0;

  const fill = () => {
    const d = DENSITY[kind];
    const target = Math.round(Math.min(d.max, Math.max(d.min, (w * h) / d.per)));
    while (parts.length < target) {
      const p = { x: 0, y: 0, vx: 0, vy: 0, r: 1, a: 1, phase: 0, freq: 1, amp: 0, rot: 0, vr: 0, age: 0, life: 1, sprite: set[0]! };
      spawn(kind, p, w, h, set, true);
      parts.push(p);
    }
    parts.length = target;
  };
  const resize = () => {
    const box = hero.getBoundingClientRect();
    const dpr = Math.min(window.devicePixelRatio || 1, 1.5);
    w = box.width;
    h = box.height;
    canvas.width = Math.max(1, Math.round(w * dpr));
    canvas.height = Math.max(1, Math.round(h * dpr));
    c.setTransform(dpr, 0, 0, dpr, 0, 0);
    fill();
  };

  let raf = 0;
  let last = 0;
  let running = false;
  let onScreen = true;
  const frame = (t: number) => {
    const dt = Math.min(0.05, last ? (t - last) / 1000 : 0.016);
    last = t;
    c.clearRect(0, 0, w, h);
    c.globalCompositeOperation = additive ? 'lighter' : 'source-over';
    for (const p of parts) {
      if (!step(kind, p, dt, w, h)) spawn(kind, p, w, h, set, false);
      draw(kind, c, p, set);
    }
    c.globalAlpha = 1;
    raf = requestAnimationFrame(frame);
  };
  const start = () => {
    if (running || !onScreen || document.hidden) return;
    running = true;
    last = 0;
    raf = requestAnimationFrame(frame);
  };
  const stop = () => {
    running = false;
    cancelAnimationFrame(raf);
  };

  new ResizeObserver(resize).observe(hero);
  resize();
  new IntersectionObserver((entries) => {
    onScreen = entries.some((e) => e.isIntersecting);
    if (onScreen) start();
    else stop();
  }).observe(hero);
  document.addEventListener('visibilitychange', () => (document.hidden ? stop() : start()));
  start();
  canvas.classList.add('is-on');
}

if (!window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
  for (const canvas of document.querySelectorAll<HTMLCanvasElement>('canvas.hero__fx[data-fx]')) {
    const kind = canvas.dataset.fx as Kind;
    if (KINDS.includes(kind)) run(canvas, kind);
  }
}
