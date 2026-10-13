import { z } from 'zod';
import { inline, text } from './fields.ts';

/**
 * Праздничные баннеры главной: на время праздника в шапке главной — свой
 * баннер, поздравление и эффект (снег, искры…). Расписание задаёт менеджер в
 * админке «Праздники»: дата праздника (число месяца или «последняя пятница
 * мая») и окно показа — за сколько дней до праздника и во сколько включить,
 * через сколько дней и во сколько выключить. Окно повторяется каждый год.
 *
 * Время — екатеринбургское (UTC+5, без летнего времени), как режим работы в
 * шапке сайта. Хранится отдельной настройкой (content.settings, ключ holidays).
 */

/** Смещение времени расписания от UTC, минут (Екатеринбург). */
export const HOLIDAY_TZ_OFFSET_MIN = 5 * 60;

export const HOLIDAY_EFFECTS = {
  none: 'Без эффекта',
  snow: 'Снег',
  sparks: 'Искры — металл, сварка',
  petals: 'Лепестки',
  sparkle: 'Огоньки',
} as const;
export type HolidayEffect = keyof typeof HOLIDAY_EFFECTS;
const effectKeys = Object.keys(HOLIDAY_EFFECTS) as [HolidayEffect, ...HolidayEffect[]];

const time = z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/, 'Время — ЧЧ:ММ');

/** Дата праздника: число месяца или день недели месяца (первый…четвёртый, последний). */
export const holidayRule = z.discriminatedUnion('kind', [
  z.object({
    kind: z.literal('date'),
    day: z.number().int().min(1).max(31),
    month: z.number().int().min(1).max(12),
  }),
  z.object({
    kind: z.literal('weekday'),
    /** 1–4 — какой по счёту, -1 — последний */
    week: z.union([z.literal(1), z.literal(2), z.literal(3), z.literal(4), z.literal(-1)]),
    /** 0 — воскресенье, 1 — понедельник … 6 — суббота */
    weekday: z.number().int().min(0).max(6),
    month: z.number().int().min(1).max(12),
  }),
]);
export type HolidayRule = z.infer<typeof holidayRule>;

export const holiday = z.object({
  id: z.string().regex(/^[a-z0-9-]+$/, 'Латиница, цифры и дефис'),
  enabled: z.boolean().default(true),
  name: text('Праздник'),
  rule: holidayRule,
  /** включить: за сколько дней до праздника и во сколько */
  start: z.object({ daysBefore: z.number().int().min(0).max(60), time }),
  /** выключить: через сколько дней после праздника и до какого времени (включительно) */
  end: z.object({ daysAfter: z.number().int().min(0).max(60), time }),
  image: z.string().describe('Баннер'),
  /** что на баннере держать в кадре на узком экране (object-position) */
  imagePosition: z.string().default('70% center'),
  /** пусто — «9 мая · День Победы» */
  eyebrow: inline('Надзаголовок').optional(),
  title: inline('Заголовок поздравления'),
  text: inline('Текст поздравления'),
  effect: z.enum(effectKeys).default('none'),
});
export type Holiday = z.infer<typeof holiday>;

export const holidaySettings = z.object({
  /** общий выключатель праздничных баннеров */
  enabled: z.boolean().default(true),
  signature: text('Подпись под поздравлением').default('Команда «УралИндуктор»'),
  items: z.array(holiday),
});
export type HolidaySettings = z.infer<typeof holidaySettings>;

/** Праздник на сайте сейчас: всё, что нужно шапке главной. */
export interface ActiveHoliday {
  id: string;
  name: string;
  eyebrow: string;
  title: string;
  text: string;
  signature: string;
  image: string;
  imagePosition: string;
  effect: HolidayEffect;
}

// ── Даты ─────────────────────────────────────────────────────────────────

export interface LocalDate {
  y: number;
  m: number;
  d: number;
}

const MONTHS_GEN = ['января', 'февраля', 'марта', 'апреля', 'мая', 'июня', 'июля', 'августа', 'сентября', 'октября', 'ноября', 'декабря'];
const WEEKDAYS = ['воскресенье', 'понедельник', 'вторник', 'среда', 'четверг', 'пятница', 'суббота'];
const ORDINALS: Record<string, [string, string, string]> = {
  // мужской / женский / средний род: первый понедельник, первая пятница, первое воскресенье
  '1': ['первый', 'первая', 'первое'],
  '2': ['второй', 'вторая', 'второе'],
  '3': ['третий', 'третья', 'третье'],
  '4': ['четвёртый', 'четвёртая', 'четвёртое'],
  '-1': ['последний', 'последняя', 'последнее'],
};
/** род дня недели: 0 — мужской, 1 — женский, 2 — средний */
const WEEKDAY_GENDER = [2, 0, 0, 1, 0, 1, 1];

const daysIn = (y: number, m: number) => new Date(Date.UTC(y, m, 0)).getUTCDate();

/** Дата праздника в году y. */
export function holidayDate(rule: HolidayRule, y: number): LocalDate {
  const dim = daysIn(y, rule.month);
  if (rule.kind === 'date') return { y, m: rule.month, d: Math.min(rule.day, dim) };
  if (rule.week === -1) {
    const lastDow = new Date(Date.UTC(y, rule.month - 1, dim)).getUTCDay();
    return { y, m: rule.month, d: dim - ((lastDow - rule.weekday + 7) % 7) };
  }
  const firstDow = new Date(Date.UTC(y, rule.month - 1, 1)).getUTCDay();
  return { y, m: rule.month, d: 1 + ((rule.weekday - firstDow + 7) % 7) + (rule.week - 1) * 7 };
}

/** «9 мая», «последняя пятница мая». */
export function ruleLabel(rule: HolidayRule): string {
  if (rule.kind === 'date') return `${rule.day} ${MONTHS_GEN[rule.month - 1]}`;
  return `${ORDINALS[String(rule.week)]![WEEKDAY_GENDER[rule.weekday]!]} ${WEEKDAYS[rule.weekday]} ${MONTHS_GEN[rule.month - 1]}`;
}

/** «19 июля». */
export const dateLabel = (d: LocalDate) => `${d.d} ${MONTHS_GEN[d.m - 1]}`;

/** Момент (мс UTC) для местного времени: дата + days дней, время ЧЧ:ММ. */
function instant(date: LocalDate, days: number, hhmm: string): number {
  const [hh, mm] = hhmm.split(':').map(Number) as [number, number];
  return Date.UTC(date.y, date.m - 1, date.d + days, hh, mm) - HOLIDAY_TZ_OFFSET_MIN * 60_000;
}

/** Местная дата и время момента ms (для подписей в админке). */
export function localParts(ms: number): LocalDate & { hh: number; mi: number; dow: number } {
  const t = new Date(ms + HOLIDAY_TZ_OFFSET_MIN * 60_000);
  return { y: t.getUTCFullYear(), m: t.getUTCMonth() + 1, d: t.getUTCDate(), hh: t.getUTCHours(), mi: t.getUTCMinutes(), dow: t.getUTCDay() };
}

export interface HolidayWindow {
  /** дата праздника */
  date: LocalDate;
  /** включение и выключение, мс UTC; выключение — после последней минуты окна */
  start: number;
  end: number;
}

/** Окно показа праздника года y. */
export function holidayWindow(h: Pick<Holiday, 'rule' | 'start' | 'end'>, y: number): HolidayWindow {
  const date = holidayDate(h.rule, y);
  return { date, start: instant(date, -h.start.daysBefore, h.start.time), end: instant(date, h.end.daysAfter, h.end.time) + 60_000 };
}

/** Окно, которое идёт сейчас, или ближайшее следующее. */
export function nearestWindow(h: Pick<Holiday, 'rule' | 'start' | 'end'>, now: number): HolidayWindow {
  const y = localParts(now).y;
  for (const year of [y - 1, y, y + 1]) {
    const w = holidayWindow(h, year);
    if (w.end > now) return w;
  }
  return holidayWindow(h, y + 2);
}

const eyebrowOf = (h: Holiday, w: HolidayWindow) => h.eyebrow?.trim() || `${dateLabel(w.date)} · ${h.name}`;

/** Праздник для показа в окне w (и в предпросмотре админки). */
export function toActiveHoliday(h: Holiday, w: HolidayWindow, signature: string): ActiveHoliday {
  return {
    id: h.id,
    name: h.name,
    eyebrow: eyebrowOf(h, w),
    title: h.title,
    text: h.text,
    signature,
    image: h.image,
    imagePosition: h.imagePosition,
    effect: h.effect,
  };
}

/**
 * Праздник, который сейчас на сайте. Окна двух праздников могут пересечься —
 * тогда показывается тот, чьё окно началось позже (оно точнее).
 */
export function activeHoliday(s: HolidaySettings | null | undefined, now: number): ActiveHoliday | null {
  if (!s?.enabled) return null;
  let best: { h: Holiday; w: HolidayWindow } | null = null;
  for (const h of s.items) {
    // без баннера праздник не показывается: обложка осталась бы пустой
    if (!h.enabled || !h.image.trim()) continue;
    const w = nearestWindow(h, now);
    if (w.start <= now && now < w.end && (!best || w.start > best.w.start)) best = { h, w };
  }
  return best ? toActiveHoliday(best.h, best.w, s.signature) : null;
}

/** Ближайшая смена праздничной шапки (включение или выключение), мс UTC; null — праздников нет. */
export function nextHolidayChange(s: HolidaySettings | null | undefined, now: number): number | null {
  if (!s?.enabled) return null;
  let next: number | null = null;
  for (const h of s.items) {
    if (!h.enabled || !h.image.trim()) continue;
    const w = nearestWindow(h, now);
    const at = w.start > now ? w.start : w.end;
    if (next === null || at < next) next = at;
  }
  return next;
}

// ── Праздники по умолчанию ───────────────────────────────────────────────

const day = (d: number, m: number): HolidayRule => ({ kind: 'date', day: d, month: m });
const weekday = (week: 1 | 2 | 3 | 4 | -1, wd: number, m: number): HolidayRule => ({ kind: 'weekday', week, weekday: wd, month: m });
const from = (daysBefore: number, t = '00:00') => ({ daysBefore, time: t });
const until = (daysAfter: number, t = '23:59') => ({ daysAfter, time: t });

/** Двенадцать праздников: государственные и профессиональные — металлургов, машиностроителей, сварщиков. */
export const DEFAULT_HOLIDAYS: HolidaySettings = {
  enabled: true,
  signature: 'Команда «УралИндуктор»',
  items: [
    {
      id: 'new-year',
      enabled: true,
      name: 'Новый год',
      rule: day(1, 1),
      start: from(0),
      end: until(7),
      image: '/img/holidays/new-year.jpg',
      imagePosition: '72% center',
      title: 'С&nbsp;<em>Новым годом!</em>',
      text: 'Пусть новый год принесёт стабильную работу оборудования, сильные проекты и&nbsp;надёжных партнёров. Спасибо, что выбираете «УралИндуктор».',
      effect: 'snow',
    },
    {
      id: 'defender-day',
      enabled: true,
      name: 'День защитника Отечества',
      rule: day(23, 2),
      start: from(2),
      end: until(0),
      image: '/img/holidays/defender-day.jpg',
      imagePosition: '72% center',
      title: 'С&nbsp;Днём <em>защитника Отечества!</em>',
      text: 'Поздравляем всех, кто стоит на&nbsp;страже страны и&nbsp;надёжно делает своё дело на&nbsp;производстве. Сил, здоровья и&nbsp;уверенности в&nbsp;каждом решении.',
      effect: 'none',
    },
    {
      id: 'womens-day',
      enabled: true,
      name: 'Международный женский день',
      rule: day(8, 3),
      start: from(2),
      end: until(0),
      image: '/img/holidays/womens-day.jpg',
      imagePosition: '74% center',
      title: 'С&nbsp;<em>8&nbsp;Марта!</em>',
      text: 'Поздравляем коллег, партнёров и&nbsp;заказчиц с&nbsp;Международным женским днём. Весеннего настроения, вдохновения и&nbsp;успехов во&nbsp;всём, что вы делаете.',
      effect: 'petals',
    },
    {
      id: 'labour-day',
      enabled: true,
      name: 'Праздник Весны и Труда',
      rule: day(1, 5),
      start: from(2),
      end: until(0),
      image: '/img/holidays/labour-day.jpg',
      imagePosition: '74% center',
      title: 'С&nbsp;Праздником <em>Весны и&nbsp;Труда!</em>',
      text: 'Мирного неба, слаженной работы и&nbsp;новых достижений — на&nbsp;производстве и&nbsp;в&nbsp;жизни.',
      effect: 'petals',
    },
    {
      id: 'victory-day',
      enabled: true,
      name: 'День Победы',
      rule: day(9, 5),
      start: from(2),
      end: until(0),
      image: '/img/holidays/victory-day.jpg',
      imagePosition: '72% center',
      title: 'С&nbsp;<em>Днём Победы!</em>',
      text: 'Помним и&nbsp;чтим подвиг поколения, которое отстояло Родину на&nbsp;фронте и&nbsp;в&nbsp;тылу. Мирного неба над&nbsp;головой.',
      effect: 'none',
    },
    {
      id: 'welder-day',
      enabled: true,
      name: 'День сварщика',
      rule: weekday(-1, 5, 5),
      start: from(1),
      end: until(0),
      image: '/img/holidays/welder-day.jpg',
      imagePosition: '70% center',
      title: 'С&nbsp;<em>Днём сварщика!</em>',
      text: 'Поздравляем мастеров, чьи швы держат конструкции, трубопроводы и&nbsp;машины. Ровных швов, надёжного оборудования и&nbsp;безопасной работы.',
      effect: 'sparks',
    },
    {
      id: 'russia-day',
      enabled: true,
      name: 'День России',
      rule: day(12, 6),
      start: from(2),
      end: until(0),
      image: '/img/holidays/russia-day.jpg',
      imagePosition: '68% center',
      title: 'С&nbsp;<em>Днём России!</em>',
      text: 'Гордимся тем, что производим оборудование для&nbsp;российской металлургии и&nbsp;литейного производства. Сильной промышленности и&nbsp;уверенного развития!',
      effect: 'sparkle',
    },
    {
      id: 'inventor-day',
      enabled: true,
      name: 'День изобретателя и рационализатора',
      rule: weekday(-1, 6, 6),
      start: from(1),
      end: until(0),
      image: '/img/holidays/inventor-day.jpg',
      imagePosition: '72% center',
      title: 'С&nbsp;Днём <em>изобретателя и&nbsp;рационализатора!</em>',
      text: 'Поздравляем инженеров и&nbsp;конструкторов, которые каждый день делают производство точнее, безопаснее и&nbsp;эффективнее.',
      effect: 'sparkle',
    },
    {
      id: 'metallurgist-day',
      enabled: true,
      name: 'День металлурга',
      rule: weekday(3, 0, 7),
      start: from(2),
      end: until(0),
      image: '/img/holidays/metallurgist-day.jpg',
      imagePosition: '74% center',
      title: 'С&nbsp;<em>Днём металлурга!</em>',
      text: 'Наш главный профессиональный праздник. Поздравляем металлургов и&nbsp;литейщиков — стабильных плавок, качественного металла и&nbsp;безопасной работы.',
      effect: 'sparks',
    },
    {
      id: 'machine-builder-day',
      enabled: true,
      name: 'День машиностроителя',
      rule: weekday(-1, 0, 9),
      start: from(2),
      end: until(0),
      image: '/img/holidays/machine-builder-day.jpg',
      imagePosition: '72% center',
      title: 'С&nbsp;<em>Днём машиностроителя!</em>',
      text: 'Поздравляем всех, кто проектирует, собирает и&nbsp;запускает машины. Точных допусков, надёжных узлов и&nbsp;новых заказов.',
      effect: 'sparkle',
    },
    {
      id: 'standards-day',
      enabled: true,
      name: 'Всемирный день стандартов',
      rule: day(14, 10),
      start: from(1),
      end: until(0),
      image: '/img/holidays/standards-day.jpg',
      imagePosition: '72% center',
      title: 'Со&nbsp;Всемирным <em>днём стандартов!</em>',
      text: 'Стандарты — основа надёжного оборудования и&nbsp;взаимопонимания инженеров. Поздравляем специалистов по&nbsp;качеству, метрологии и&nbsp;нормоконтролю.',
      effect: 'none',
    },
    {
      id: 'new-year-eve',
      enabled: true,
      name: 'С наступающим Новым годом',
      rule: day(31, 12),
      start: from(6),
      end: until(0),
      image: '/img/holidays/new-year-eve.jpg',
      imagePosition: '72% center',
      eyebrow: '31 декабря · Канун Нового года',
      title: 'С&nbsp;<em>наступающим Новым годом!</em>',
      text: 'Спасибо за&nbsp;доверие и&nbsp;совместные проекты уходящего года. Пусть новый принесёт стабильную работу, сильные решения и&nbsp;тёплые встречи.',
      effect: 'snow',
    },
  ],
};
