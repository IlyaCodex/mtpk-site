/**
 * Разбор и проверка полей заявки — правила send.php без изменений:
 * длины полей, телефон ≥ 6 цифр, формат email, метки UTM, трейс Битрикс24.
 */

export const MIN_FILL_MS = 3000;
export const UTM_KEYS = ['utm_source', 'utm_medium', 'utm_campaign', 'utm_content', 'utm_term', 'yclid', 'gclid', 'fbclid', 'referrer', 'landing_url'] as const;
/** Поля, которые встречаются в отдельных формах (запчасти, сравнение) — уходят в комментарий лида. */
export const EXTRA_KEYS = ['message', 'part', 'model', 'quantity'] as const;
const EXTRA_LABELS: Record<(typeof EXTRA_KEYS)[number], string> = {
  message: 'Сообщение',
  part: 'Позиция',
  model: 'Модель',
  quantity: 'Количество',
};

/** trim, без \r и \0, обрезка по длине — как clean() в send.php */
export function clean(value: unknown, max = 2000): string {
  let s = typeof value === 'string' ? value : value == null ? '' : String(value);
  s = s.trim().replace(/[\r\0]/g, '');
  return [...s].length > max ? [...s].slice(0, max).join('') : s;
}

export interface LeadInput {
  phone: string;
  name: string;
  email: string;
  task: string;
  source: string;
  consent: string;
  requestId: string;
  roistatVisit: string;
  b24Trace: string;
  b24TraceValid: boolean;
  ymUid: string;
  utm: Record<string, string>;
  fields: Record<string, string>;
}

export type Fields = Record<string, string | undefined>;

export function parseLead(f: Fields, cookies: Record<string, string> = {}): LeadInput {
  const b24Trace = clean(f.b24_trace ?? cookies.b24_trace ?? '', 20000);
  let b24TraceValid = false;
  if (b24Trace) {
    try {
      JSON.parse(b24Trace);
      b24TraceValid = true;
    } catch {
      b24TraceValid = false;
    }
  }
  const utm: Record<string, string> = {};
  for (const k of UTM_KEYS) {
    const v = clean(f[k], 500);
    if (v) utm[k] = v;
  }
  const fields: Record<string, string> = {};
  for (const k of EXTRA_KEYS) {
    const v = clean(f[k], 2000);
    if (v) fields[k] = v;
  }
  return {
    phone: clean(f.phone, 32),
    name: clean(f.name, 120),
    email: clean(f.email, 160),
    task: clean(f.task, 2000),
    source: clean(f.source, 300),
    consent: clean(f.consent, 32),
    requestId: clean(f.request_id, 64),
    roistatVisit: clean(f.roistat_visit, 64),
    b24Trace,
    b24TraceValid,
    ymUid: clean(f._ym_uid ?? cookies._ym_uid ?? '', 100),
    utm,
    fields,
  };
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/** null — всё в порядке, иначе текст ошибки для посетителя (422). */
export function validateLead(lead: LeadInput): string | null {
  if (lead.phone.replace(/\D+/g, '').length < 6) return 'Укажите корректный телефон';
  if (lead.email && !EMAIL_RE.test(lead.email)) return 'Некорректный email';
  return null;
}

/**
 * Антиспам по времени: форма заполнена за 0…3 с — бот. Отрицательное или
 * неправдоподобное время — рассинхрон часов клиента, такую заявку не теряем.
 */
export function isTooFast(formTs: string | undefined, now = Date.now()): number | null {
  const ts = Number.parseInt(String(formTs ?? ''), 10);
  if (!Number.isFinite(ts) || ts <= 0) return null;
  const elapsed = now - ts;
  return elapsed >= 0 && elapsed < MIN_FILL_MS ? elapsed : null;
}

/** Хост из Origin/Referer; пусто — проверку пропускаем (как send.php). */
export function originAllowed(origin: string | undefined, referer: string | undefined, allowed: string[]): boolean {
  const src = origin || referer || '';
  if (!src) return true;
  try {
    return allowed.includes(new URL(src).hostname);
  } catch {
    return false;
  }
}

/** Полный URL страницы из Referer, старый поддомен → боевой домен. */
export function pageUrlFrom(referer: string | undefined, allowed: string[]): string {
  if (!referer) return '';
  try {
    const host = new URL(referer).hostname;
    if (!allowed.includes(host)) return '';
  } catch {
    return '';
  }
  return clean(referer.replace('new.uralinduktor.ru', 'uralinduktor.ru'), 300);
}

export function extraLines(fields: Record<string, string>): string[] {
  return EXTRA_KEYS.filter((k) => fields[k]).map((k) => `${EXTRA_LABELS[k]}: ${fields[k]}`);
}
