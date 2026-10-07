/**
 * Подробная страница проекта: лента миниатюр, просмотр фото, письмо.
 *
 * Скрипт пакета заменён своим: там миниатюры лежали отдельной секцией
 * внизу страницы и сразу открывали модальное окно. Теперь лента стоит
 * под главным снимком, миниатюра подставляет фото в главный кадр,
 * стрелки листают ленту, а полноэкранный просмотр открывается кликом
 * по главному снимку.
 *
 * Подключён на всех страницах сайта, поэтому первым делом проверяет,
 * что находится на странице кейса.
 */
(() => {
  const root = document.querySelector('.ui-case');
  if (!root) return;

  const main = root.querySelector<HTMLImageElement>('#main-photo');
  const thumbs = [...root.querySelectorAll<HTMLElement>('.ui-thumb')];
  const track = root.querySelector<HTMLElement>('.ui-thumbs-track');
  const viewer = root.querySelector<HTMLDialogElement>('#viewer');
  const vImg = viewer && viewer.querySelector('img');
  const vCount = viewer && viewer.querySelector('#viewer-count');
  const vControls = viewer && viewer.querySelector<HTMLElement>('#viewer-controls');

  // Список кадров: главный снимок — первый, дальше миниатюры.
  const shots = thumbs.length
    ? thumbs.map(t => ({ src: t.dataset.src!, alt: t.dataset.alt || '' }))
    : (main ? [{ src: main.src, alt: main.alt }] : []);
  let current = 0;

  const show = (i: number) => {
    if (!shots.length) return;
    current = (i + shots.length) % shots.length;
    if (main) {
      main.src = shots[current].src;
      main.alt = shots[current].alt;
    }
    thumbs.forEach((t, n) => t.classList.toggle('is-active', n === current));
    const active = thumbs[current];
    if (active && track) {
      // держим выбранную миниатюру в поле зрения ленты
      const l = active.offsetLeft, r = l + active.offsetWidth;
      if (l < track.scrollLeft) track.scrollTo({ left: l - 12, behavior: 'smooth' });
      else if (r > track.scrollLeft + track.clientWidth)
        track.scrollTo({ left: r - track.clientWidth + 12, behavior: 'smooth' });
    }
  };

  thumbs.forEach((t, i) => t.addEventListener('click', () => show(i)));

  // стрелки ленты листают на видимую ширину
  root.querySelectorAll<HTMLElement>('[data-thumb-step]').forEach(btn => {
    btn.addEventListener('click', () => {
      if (!track) return;
      track.scrollBy({ left: Number(btn.dataset.thumbStep) * track.clientWidth * 0.8,
                       behavior: 'smooth' });
    });
  });

  // ---- полноэкранный просмотр -------------------------------------
  const openViewer = (i: number, single?: { src: string; alt: string }) => {
    if (!viewer) return;
    if (single) {
      vImg!.src = single.src;
      vImg!.alt = single.alt;
      if (vControls) vControls.hidden = true;
    } else {
      show(i);
      vImg!.src = shots[current].src;
      vImg!.alt = shots[current].alt;
      if (vControls) vControls.hidden = shots.length < 2;
      if (vCount) vCount.textContent = (current + 1) + ' / ' + shots.length;
    }
    if (!viewer.open) viewer.showModal();
  };

  const step = (d: number) => {
    show(current + d);
    vImg!.src = shots[current].src;
    vImg!.alt = shots[current].alt;
    if (vCount) vCount.textContent = (current + 1) + ' / ' + shots.length;
  };

  const hero = root.querySelector<HTMLElement>('.ui-main-photo');
  if (hero) {
    hero.addEventListener('click', () => openViewer(current));
    hero.addEventListener('keydown', e => {
      if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); openViewer(current); }
    });
  }

  // Письмо открывают два элемента: плитка первого экрана с картинкой
  // внутри и кнопка в карточке «Благодарственное письмо», где картинки
  // нет — там адрес скана лежит в data-src.
  root.querySelectorAll<HTMLElement>('[data-letter]').forEach(btn => {
    const img = btn.querySelector('img');
    const src = btn.dataset.src || (img && img.getAttribute('src'));
    if (!src) return;
    btn.addEventListener('click', () =>
      openViewer(0, { src, alt: 'Благодарственное письмо' }));
  });

  root.querySelectorAll<HTMLElement>('[data-view-step]').forEach(btn =>
    btn.addEventListener('click', () => step(Number(btn.dataset.viewStep))));

  root.querySelectorAll('dialog .ui-close').forEach(btn =>
    btn.addEventListener('click', () => btn.closest('dialog')!.close()));
  root.querySelectorAll('dialog').forEach(d =>
    d.addEventListener('click', e => { if (e.target === d) d.close(); }));

  document.addEventListener('keydown', e => {
    if (!viewer || !viewer.open || (vControls && vControls.hidden)) return;
    if (e.key === 'ArrowRight') step(1);
    if (e.key === 'ArrowLeft') step(-1);
  });

  show(0);
})();

export {};
