/**
 * Маркетинговая атрибуция заявок — перенос из forms.js без изменения логики:
 * последнее размеченное касание (utm_*, yclid, gclid, fbclid, referrer,
 * landing_url) живёт 30 дней в localStorage + cookie; трейс Битрикс24 и
 * Client ID Метрики добавляются к заявке; цели Метрики и Top.Mail.Ru.
 */

export const YM_LEGACY_COUNTER = 25228307; // кабинет «УралИндуктор3»
export const YM_UIBUSINESS_COUNTER = 112991420; // кабинет uibusiness
export const TMR_COUNTER = 3784620; // Top.Mail.Ru
const UTM_KEY = 'ui_marketing_trace';
const KEYS = ['utm_source', 'utm_medium', 'utm_campaign', 'utm_content', 'utm_term', 'yclid', 'gclid', 'fbclid'];

type W = Window & {
  ym?: (...args: unknown[]) => void;
  _tmr?: { push: (v: unknown) => void };
  b24Tracker?: { guest?: { getTrace?: () => string } };
};

export function getCookie(name: string): string {
  const escaped = name.replace(/[.*+?^$(){}|[\]\\]/g, '\\$&');
  const m = document.cookie.match(new RegExp(`(?:^|; )${escaped}=([^;]*)`));
  if (!m) return '';
  try {
    return decodeURIComponent(m[1]);
  } catch {
    return '';
  }
}

function setCookie(name: string, value: string, days: number) {
  const d = new Date();
  d.setTime(d.getTime() + days * 864e5);
  document.cookie = `${name}=${encodeURIComponent(value)};expires=${d.toUTCString()};path=/;SameSite=Lax`;
}

/** Метки последнего рекламного касания; новый визит с меткой начинает атрибуцию заново. */
export function getMarketing(): Record<string, string> {
  let saved: Record<string, string> = {};
  try {
    const raw = localStorage.getItem(UTM_KEY) || getCookie(UTM_KEY);
    if (raw) saved = JSON.parse(raw) || {};
  } catch {
    /* повреждённые данные — начинаем с чистого листа */
  }
  if (!saved || typeof saved !== 'object' || Array.isArray(saved)) saved = {};
  let params: URLSearchParams | null = null;
  try {
    params = new URLSearchParams(location.search);
  } catch {
    params = null;
  }
  const incoming = params ? KEYS.some((k) => params!.get(k)) : false;
  const data: Record<string, string> = incoming ? {} : saved;
  let changed = incoming;
  const external = document.referrer && document.referrer.indexOf(location.host) === -1;
  if (incoming && params) {
    for (const k of KEYS) {
      const v = params.get(k);
      if (v) data[k] = v.slice(0, 500);
    }
    data.landing_url = location.href.slice(0, 500);
    if (external) data.referrer = document.referrer.slice(0, 500);
  } else {
    if (!data.landing_url) {
      data.landing_url = location.href.slice(0, 500);
      changed = true;
    }
    if (!data.referrer && external) {
      data.referrer = document.referrer.slice(0, 500);
      changed = true;
    }
  }
  if (changed || !Object.keys(saved).length) {
    try {
      const s = JSON.stringify(data);
      localStorage.setItem(UTM_KEY, s);
      setCookie(UTM_KEY, s, 30);
    } catch {
      /* приватный режим */
    }
  }
  return data;
}

let ymClientId = '';
/** Client ID у рекламного счётчика uibusiness (_ym_uid — запасной вариант). */
export function refreshYmClientId() {
  try {
    const w = window as W;
    if (typeof w.ym === 'function') {
      w.ym(YM_UIBUSINESS_COUNTER, 'getClientID', (id: unknown) => {
        if (id) ymClientId = String(id).slice(0, 100);
      });
    }
  } catch {
    /* Метрика ещё не загружена */
  }
}

/** Трейс сквозной аналитики Битрикс24 и Client ID Метрики — в данные формы. */
export function appendAnalytics(fd: FormData) {
  let trace = '';
  try {
    trace = (window as W).b24Tracker?.guest?.getTrace?.() || '';
  } catch {
    trace = '';
  }
  if (!trace) trace = getCookie('b24_trace');
  if (trace) fd.append('b24_trace', trace);
  refreshYmClientId();
  const ym = ymClientId || getCookie('_ym_uid');
  if (ym) fd.append('_ym_uid', ym);
}

function isUiBusinessPaidClick(m: Record<string, string>): boolean {
  const campaign = String(m.utm_campaign || '').toLowerCase();
  return (
    campaign.indexOf('aimarketing_') === 0 &&
    String(m.utm_source || '').toLowerCase() === 'yandex' &&
    String(m.utm_medium || '').toLowerCase() === 'cpc' &&
    /^\d{10,40}$/.test(String(m.yclid || ''))
  );
}

/**
 * Цель «lead_form_submit»: в кабинет uibusiness — только настоящий клик из
 * Директа (AImarketing_ + yclid), остальные размеченные кампании Директа —
 * в «УралИндуктор3»; органику рекламе не приписываем.
 */
export function reachGoal(formName: string) {
  const label = (formName || 'lead').toLowerCase().replace(/[^a-zа-я0-9]+/gi, '_').replace(/^_+|_+$/g, '').slice(0, 40);
  const m = getMarketing();
  const campaign = String(m.utm_campaign || '').toLowerCase();
  const source = String(m.utm_source || '').toLowerCase();
  let counter = 0;
  if (isUiBusinessPaidClick(m)) counter = YM_UIBUSINESS_COUNTER;
  else if (campaign && source === 'yandex') counter = YM_LEGACY_COUNTER;
  const w = window as W;
  try {
    if (counter && typeof w.ym === 'function') {
      w.ym(counter, 'reachGoal', 'lead_form_submit', { form: label, ad_account: counter === YM_UIBUSINESS_COUNTER ? 'uibusiness' : 'uralinduktor3' });
    }
  } catch {
    /* счётчик недоступен */
  }
  try {
    w._tmr?.push({ type: 'reachGoal', id: TMR_COUNTER, goal: 'lead_form_submit' });
  } catch {
    /* счётчик недоступен */
  }
}
