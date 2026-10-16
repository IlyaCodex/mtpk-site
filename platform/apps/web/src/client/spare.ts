import { $, delegate, reducedMotion } from './dom';

/**
 * Запчасти (шаблоны zapchasti и ui-spares): окно «Запросить цену / подбор» — <dialog id="request-dialog">
 * страницы с формой <ui-form type="spare">: деталь, модель и количество подставляются из кнопки
 * (data-part, data-model, поле #quantity; модель — и из фильтра списка #model-select); «−/+» количества
 * (data-qty); фото на весь экран (data-zoom → #image-dialog). Окна открываются и закрываются плавно
 * (класс is-open, оформление — sections.css), Esc и щелчок мимо окна закрывают. При отправке —
 * текст заявки и её источник (договор формы запчастей; раньше это делал скрипт каталога).
 */
type RequestForm = HTMLFormElement & {
  elements: HTMLFormControlsCollection & Record<'part' | 'model' | 'quantity' | 'message' | 'source', HTMLInputElement>;
};

/** Столько же, сколько CSS-переход окна (--duration-base). */
const CLOSE_MS = 250;

function open(dialog: HTMLDialogElement): void {
  if (dialog.open) return;
  dialog.showModal();
  // кадр с начальным состоянием — затем класс: окно плавно проявляется
  requestAnimationFrame(() => requestAnimationFrame(() => dialog.classList.add('is-open')));
}

function close(dialog: HTMLDialogElement): void {
  if (!dialog.open || !dialog.classList.contains('is-open')) {
    if (dialog.open) dialog.close();
    return;
  }
  dialog.classList.remove('is-open');
  window.setTimeout(() => dialog.close(), reducedMotion() ? 0 : CLOSE_MS);
}

const quantity = () => $<HTMLInputElement>('#quantity');

function init(): void {
  const request = $<HTMLDialogElement>('#request-dialog');
  const image = $<HTMLDialogElement>('#image-dialog');
  if (!request && !image) return;

  delegate('click', '[data-request]', (btn, e) => {
    const form = $<RequestForm>('#request-form');
    if (!request || !form) return;
    e.preventDefault();
    form.elements.part.value = btn.dataset.part ?? '';
    form.elements.model.value = btn.dataset.model || $<HTMLSelectElement>('#model-select')?.value || '';
    form.elements.quantity.value = quantity()?.value || '1';
    const result = $('#request-result');
    if (result) result.hidden = true;
    open(request);
  });

  delegate('click', '[data-close]', (btn) => {
    const dialog = btn.closest('dialog');
    if (dialog) close(dialog);
  });

  // у транзисторных запчастей триггер — ссылка на файл картинки: без скрипта она работает сама
  delegate('click', '[data-zoom]', (btn, e) => {
    const img = $<HTMLImageElement>('#zoom-image');
    if (!image || !img) return;
    e.preventDefault();
    img.src = btn.dataset.zoom ?? '';
    img.alt = btn.dataset.alt ?? '';
    const caption = $('#zoom-caption');
    if (caption) caption.textContent = btn.dataset.caption ?? '';
    open(image);
  });

  delegate('click', '[data-qty]', (btn) => {
    const field = quantity();
    if (field) field.value = String(Math.max(1, Math.min(9999, (Number(field.value) || 1) + Number(btn.dataset.qty))));
  });

  for (const dialog of [request, image]) {
    if (!dialog) continue;
    // Esc — тоже плавно
    dialog.addEventListener('cancel', (e) => {
      e.preventDefault();
      close(dialog);
    });
    // щелчок по затемнению вокруг окна
    dialog.addEventListener('click', (e) => {
      if (e.target !== dialog) return;
      const r = dialog.getBoundingClientRect();
      if (e.clientX < r.left || e.clientX > r.right || e.clientY < r.top || e.clientY > r.bottom) close(dialog);
    });
  }

  // до отправки формой сайта (обработчик в фазе перехвата): текст заявки и её источник
  document.addEventListener(
    'submit',
    (e) => {
      const form = e.target as RequestForm;
      if (form.id !== 'request-form') return;
      const text = `Деталь: ${form.elements.part.value}\nМодель: ${form.elements.model.value}\nКоличество: ${form.elements.quantity.value}`;
      form.elements.message.value = text;
      // метка — из самой формы: у запчастей индукционных печей и дробемётов свои источники заявок
      form.elements.source.value = `${form.dataset.form || 'Запчасти'} · ${location.pathname} · ${text.replace(/\n/g, '; ')}`;
    },
    true,
  );
}

init();
