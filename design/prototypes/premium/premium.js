/* УралИндуктор — поведение премиальной главной (прототип): появление при прокрутке, слова «заявления»,
   счётчики, наклон плиток, закреплённые шаги, горизонтальная лента проектов. Без библиотек. */
(() => {
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const fine = matchMedia('(hover: hover) and (pointer: fine)').matches;
  const clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v));

  // ── первый экран: по очереди после загрузки шрифта
  document.querySelectorAll('[data-intro]').forEach((el, i) => el.style.setProperty('--i', String(i)));
  const ready = () => document.body.classList.add('is-ready');
  (document.fonts?.ready ?? Promise.resolve()).then(() => requestAnimationFrame(ready));
  setTimeout(ready, 1200);

  // ── шапка плотнее после первого экрана
  const nav = document.querySelector('[data-nav]');

  // ── появление: соседи — с задержкой лесенкой
  const groups = new Map();
  document.querySelectorAll('[data-reveal]').forEach((el) => {
    const list = groups.get(el.parentElement) ?? [];
    el.style.setProperty('--d', `${list.length * 90}ms`);
    list.push(el);
    groups.set(el.parentElement, list);
  });
  const io = new IntersectionObserver(
    (entries) => {
      for (const e of entries) {
        if (!e.isIntersecting) continue;
        e.target.classList.add('is-in');
        io.unobserve(e.target);
      }
    },
    { rootMargin: '0px 0px -12% 0px', threshold: 0.08 },
  );
  document.querySelectorAll('[data-reveal]').forEach((el) => io.observe(el));

  // ── «заявление»: слова загораются по мере прокрутки
  const words = document.querySelector('[data-words]');
  const KEY = /^(340\+|13|лет|запуска|подбора)/;
  let wordEls = [];
  if (words) {
    const parts = words.textContent.trim().split(/ +/);
    words.innerHTML = parts.map((w) => `<span class="w${KEY.test(w) ? ' is-key' : ''}">${w}</span>`).join(' ');
    wordEls = [...words.querySelectorAll('.w')];
  }

  // ── счётчики
  const counters = new IntersectionObserver(
    (entries) => {
      for (const e of entries) {
        if (!e.isIntersecting) continue;
        counters.unobserve(e.target);
        const el = e.target;
        const to = Number(el.dataset.count);
        const suffix = el.dataset.suffix ?? '';
        if (reduce) {
          el.textContent = `${to}${suffix}`;
          continue;
        }
        const t0 = performance.now();
        const dur = 1700;
        const tick = (t) => {
          const p = clamp((t - t0) / dur);
          const eased = 1 - Math.pow(2, -10 * p);
          el.textContent = `${Math.round(to * (p >= 1 ? 1 : eased))}${p >= 1 ? suffix : ''}`;
          if (p < 1) requestAnimationFrame(tick);
        };
        requestAnimationFrame(tick);
      }
    },
    { threshold: 0.5 },
  );
  document.querySelectorAll('[data-count]').forEach((el) => counters.observe(el));

  // ── наклон плиток за курсором и блик
  if (fine && !reduce) {
    document.querySelectorAll('[data-tilt]').forEach((el) => {
      el.addEventListener('pointermove', (ev) => {
        const r = el.getBoundingClientRect();
        const x = (ev.clientX - r.left) / r.width;
        const y = (ev.clientY - r.top) / r.height;
        el.style.setProperty('--ry', `${(x - 0.5) * 7}deg`);
        el.style.setProperty('--rx', `${(0.5 - y) * 6}deg`);
        el.style.setProperty('--mx', `${x * 100}%`);
        el.style.setProperty('--my', `${y * 100}%`);
      });
      el.addEventListener('pointerleave', () => {
        el.style.setProperty('--rx', '0deg');
        el.style.setProperty('--ry', '0deg');
      });
    });
  }

  // ── шаги «под ключ»: активный — у середины экрана
  const steps = [...document.querySelectorAll('[data-step]')];
  const stepImgs = [...document.querySelectorAll('[data-step-img]')];
  const stepNum = document.querySelector('[data-step-num]');
  const story = document.querySelector('.story__frame');
  const setStep = (n) => {
    steps.forEach((s, i) => s.classList.toggle('is-on', i === n));
    stepImgs.forEach((img, i) => img.classList.toggle('is-on', i === n));
    if (stepNum) stepNum.textContent = String(n + 1).padStart(2, '0');
    story?.style.setProperty('--story-p', `${((n + 1) / steps.length) * 100}%`);
  };
  // на телефоне картинка закреплена сверху — активный шаг тот, что сразу под ней
  const narrow = matchMedia('(max-width: 760px)').matches;
  const stepIo = new IntersectionObserver(
    (entries) => {
      for (const e of entries) if (e.isIntersecting) setStep(Number(e.target.dataset.step));
    },
    { rootMargin: narrow ? '-44% 0px -50% 0px' : '-48% 0px -48% 0px' },
  );
  steps.forEach((s) => stepIo.observe(s));

  // ── горизонтальная лента проектов: вертикальная прокрутка двигает её вбок
  const hs = document.querySelector('[data-hscroll]');
  const track = document.querySelector('[data-htrack]');
  const wide = matchMedia('(min-width: 761px)');
  const layoutH = () => {
    if (!hs || !track) return;
    if (!wide.matches) {
      hs.style.height = '';
      track.style.transform = '';
      return;
    }
    const travel = Math.max(0, track.scrollWidth - innerWidth);
    hs.style.height = `${innerHeight + travel}px`;
  };

  // ── параллакс картинок в плитках
  const parallax = [...document.querySelectorAll('[data-parallax]')];

  let queued = false;
  const frame = () => {
    queued = false;
    const vh = innerHeight;
    nav?.classList.toggle('is-scrolled', scrollY > 40);

    if (wordEls.length) {
      const r = words.getBoundingClientRect();
      const p = reduce ? 1 : clamp((vh * 0.82 - r.top) / (r.height + vh * 0.25));
      const lit = Math.round(p * wordEls.length);
      wordEls.forEach((w, i) => w.classList.toggle('is-lit', i < lit));
    }

    if (hs && track && wide.matches) {
      const r = hs.getBoundingClientRect();
      const travel = hs.offsetHeight - vh;
      const p = travel > 0 ? clamp(-r.top / travel) : 0;
      track.style.transform = `translate3d(${-p * Math.max(0, track.scrollWidth - innerWidth)}px,0,0)`;
    }

    if (!reduce) {
      for (const img of parallax) {
        const r = img.parentElement.getBoundingClientRect();
        if (r.bottom < 0 || r.top > vh) continue;
        const k = Number(img.dataset.parallax) || 0.05;
        img.style.transform = `translate3d(0,${(r.top + r.height / 2 - vh / 2) * -k}px,0)`;
      }
    }
  };
  const onScroll = () => {
    if (!queued) {
      queued = true;
      requestAnimationFrame(frame);
    }
  };
  addEventListener('scroll', onScroll, { passive: true });
  addEventListener('resize', () => {
    layoutH();
    onScroll();
  });
  addEventListener('load', () => {
    layoutH();
    onScroll();
  });
  layoutH();
  onScroll();

  // ── демо-форма
  document.querySelector('[data-demo-form]')?.addEventListener('submit', (e) => {
    e.preventDefault();
    const form = e.currentTarget;
    form.classList.add('is-sent');
    form.querySelector('.form__note').textContent = 'Демо: на настоящем сайте заявка ушла бы инженеру.';
  });
})();
