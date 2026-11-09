import { $, $$ } from './dom';

/**
 * Статья Практикума «История электромагнитной индукции» (.ui-history): опыт Фарадея с двумя обмотками —
 * кнопки состояния цепи меняют подпись, ключ и стрелку гальванометра на схеме. Без скрипта кнопки скрыты,
 * объяснение опыта — в <noscript>. Первый выбор состояния и кнопка «Обсудить задачу» — событием
 * ui-praktikum-event (history_experiment, history_contact); цели Метрики — consent.ts.
 */

const STATES: Record<string, { title: string; text: string; angle: number; closed: boolean }> = {
  off: {
    title: 'Цепь разомкнута, переходный процесс закончился.',
    text: 'Тока от батареи нет. Поток через вторую обмотку больше не меняется, стрелка стоит на нуле.',
    angle: 0,
    closed: false,
  },
  make: {
    title: 'Момент включения: поток нарастает.',
    text: 'Изменение магнитного потока создаёт ЭДС. В замкнутой второй цепи возникает кратковременный ток, и стрелка отклоняется.',
    angle: 42,
    closed: true,
  },
  steady: {
    title: 'Постоянный ток установился.',
    text: 'В первой обмотке ток есть, но магнитный поток больше не меняется. Во второй обмотке индукционного тока нет, стрелка на нуле.',
    angle: 0,
    closed: true,
  },
  break: {
    title: 'Момент выключения: поток уменьшается.',
    text: 'Направление изменения потока стало противоположным. Возникает кратковременный ток другого направления. После переходного процесса стрелка вернётся к нулю.',
    angle: -42,
    closed: false,
  },
};

const goal = (el: Element, name: string) => el.dispatchEvent(new CustomEvent('ui-praktikum-event', { bubbles: true, detail: { name } }));

function experiment(root: HTMLElement): void {
  const controls = $<HTMLElement>('.history-controls', root);
  const title = $<HTMLElement>('#history-state-title', root);
  const text = $<HTMLElement>('#history-state-text', root);
  const lever = root.querySelector('#history-switch');
  const needle = root.querySelector('#history-needle');
  if (!controls || !title || !text || !lever || !needle) return;
  let tried = false;
  controls.hidden = false;
  controls.addEventListener('click', (e) => {
    const button = (e.target as Element | null)?.closest<HTMLButtonElement>('button[data-state]');
    const state = button && STATES[button.dataset.state ?? ''];
    if (!button || !state) return;
    for (const b of $$<HTMLButtonElement>('button', controls)) b.setAttribute('aria-pressed', String(b === button));
    title.textContent = state.title;
    text.textContent = state.text;
    lever.setAttribute('d', state.closed ? 'M210 120 L250 120' : 'M210 120 L245 93');
    needle.setAttribute('transform', `rotate(${state.angle} 711 194)`);
    if (!tried) goal(root, 'history_experiment');
    tried = true;
  });
}

export function initHistoryArticle(root: HTMLElement): void {
  experiment(root);
  root.addEventListener('click', (e) => {
    const link = (e.target as Element | null)?.closest('[data-history-event="contact"]');
    if (link) goal(link, 'history_contact');
  });
}
