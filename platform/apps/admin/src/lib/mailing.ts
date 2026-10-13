import type { Tone } from '@/components/ui';

/** Раздел «Email-рассылки»: данные сервиса рассылок (/api/v1/mailing/…) и подписи. */

export type CampaignStatus = 'draft' | 'scheduled' | 'preparing' | 'sending' | 'paused' | 'sent' | 'cancelled';

export interface CampaignStats {
  total: number;
  queued: number;
  sent: number;
  failed: number;
  skipped: number;
  opened: number;
  clicked: number;
  clicks: number;
}

export interface CampaignRow {
  id: number;
  name: string;
  subject: string;
  status: CampaignStatus;
  transport: string | null;
  listId: number | null;
  listName: string | null;
  total: number;
  scheduledAt: string | null;
  startedAt: string | null;
  finishedAt: string | null;
  createdAt: string;
  updatedAt: string;
  stats: CampaignStats;
}

export interface Campaign {
  id: number;
  name: string;
  subject: string;
  preheader: string;
  fromName: string;
  html: string;
  listId: number | null;
  utmCampaign: string;
  status: CampaignStatus;
  transport: string | null;
  scheduledAt: string | null;
  startedAt: string | null;
  finishedAt: string | null;
  total: number;
  createdBy: string | null;
  updatedAt: string;
  /** активных адресов в выбранной базе */
  audience: number;
  /** письма действительно уходят (SMTP настроен на сервере) */
  sendsForReal: boolean;
  publicUrl: string;
  fromEmail: string;
  /** писем в секунду */
  rate: number;
}

export interface CompiledLink {
  position: number;
  label: string;
  url: string;
  target: string;
  utmContent: string;
}

export interface Preview {
  html: string;
  text: string;
  links: CompiledLink[];
  warnings: string[];
}

export interface MailLink {
  id: number;
  position: number;
  label: string;
  url: string;
  target: string;
  utmContent: string;
  clicks: number;
  uniqueClicks: number;
}

export interface CampaignReportData {
  status: CampaignStatus;
  transport: string | null;
  total: number;
  stats: CampaignStats;
  links: MailLink[];
  byHour: { hour: string; clicks: number }[];
  recent: { at: string; link: { label: string; utmContent: string }; recipient: { email: string; name: string | null } | null }[];
}

export interface Recipient {
  id: number;
  email: string;
  name: string | null;
  status: string;
  error: string | null;
  sentAt: string | null;
  openedAt: string | null;
  clickedAt: string | null;
  clicks: number;
}

export interface MailListRow {
  id: number;
  name: string;
  description: string | null;
  source: { kind?: string; at?: string } | null;
  createdAt: string;
  updatedAt: string;
  members: number;
  active: number;
}

export interface ImportJob {
  id: number;
  listId: number;
  kind: string;
  status: 'running' | 'done' | 'failed';
  processed: number;
  added: number;
  skipped: number;
  error: string | null;
  startedAt: string;
  finishedAt: string | null;
}

export interface MailListFull {
  id: number;
  name: string;
  description: string | null;
  source: { kind?: string; from?: string | null; to?: string | null; at?: string } | null;
  createdAt: string;
  updatedAt: string;
  counts: { active: number; unsubscribed: number; bounced: number; total: number };
  imports: ImportJob[];
  campaigns: { id: number; name: string; status: CampaignStatus; startedAt: string | null }[];
}

export interface Contact {
  id: number;
  email: string;
  name: string | null;
  company: string | null;
  phone: string | null;
  source: string;
  status: 'active' | 'unsubscribed' | 'bounced';
  unsubscribedAt: string | null;
  createdAt: string;
  addedAt?: string;
}

export interface ParsedContact {
  email: string;
  name?: string;
  company?: string;
  phone?: string;
}

/** Ответ проверки и загрузки адресов (файл, текст). */
export interface ImportReport {
  rows: number;
  invalid: number;
  duplicates: number;
  note?: string;
  found: number;
  sample: ParsedContact[];
  result?: AddResult | null;
}

export interface AddResult {
  total: number;
  created: number;
  added: number;
  already: number;
  unsubscribed: number;
}

export interface MailingSummary {
  sendsForReal: boolean;
  contacts: { active: number; unsubscribed: number; bounced: number };
  lists: number;
  last30: { sent: number; opened: number; clicked: number; clicks: number };
  clicksByDay: { day: string; clicks: number }[];
  campaigns: { id: number; name: string; status: CampaignStatus; transport: string | null; startedAt: string | null; finishedAt: string | null; total: number; stats: CampaignStats }[];
}

export const CAMPAIGN_STATUS: Record<CampaignStatus, [string, Tone]> = {
  draft: ['черновик', 'gray'],
  scheduled: ['запланирована', 'blue'],
  preparing: ['готовится', 'blue'],
  sending: ['отправляется', 'blue'],
  paused: ['на паузе', 'amber'],
  sent: ['отправлена', 'green'],
  cancelled: ['остановлена', 'red'],
};

export const CONTACT_STATUS: Record<Contact['status'], [string, Tone]> = {
  active: ['активен', 'green'],
  unsubscribed: ['отписался', 'amber'],
  bounced: ['недоставляем', 'red'],
};

export const RECIPIENT_STATUS: Record<string, [string, Tone]> = {
  queued: ['в очереди', 'gray'],
  sending: ['отправляется', 'blue'],
  sent: ['отправлено', 'green'],
  failed: ['ошибка', 'red'],
  skipped: ['пропущен', 'amber'],
};

export const CONTACT_SOURCE: Record<string, string> = {
  file: 'файл',
  text: 'список',
  leads: 'заявка сайта',
  crm: 'CRM',
  manual: 'вручную',
};

/** Рассылка в работе: статистика обновляется сама. */
export const isLive = (s: CampaignStatus) => s === 'scheduled' || s === 'preparing' || s === 'sending';

/** Доля в процентах (0, если не от чего считать). */
export const pct = (part: number, whole: number) => (whole > 0 ? Math.round((part / whole) * 1000) / 10 : 0);

export const fmt = (n: number) => n.toLocaleString('ru-RU');

/** «≈ 50 мин» — сколько займёт отправка при темпе rate писем в секунду. */
export function duration(count: number, rate: number): string {
  const sec = Math.ceil(count / Math.max(rate, 0.1));
  if (sec < 60) return `≈ ${Math.max(sec, 1)} с`;
  const min = Math.round(sec / 60);
  if (min < 60) return `≈ ${min} мин`;
  const h = Math.floor(min / 60);
  return `≈ ${h} ч ${min % 60 ? `${min % 60} мин` : ''}`.trim();
}

const TRANSLIT: Record<string, string> = {
  а: 'a', б: 'b', в: 'v', г: 'g', д: 'd', е: 'e', ё: 'e', ж: 'zh', з: 'z', и: 'i', й: 'y', к: 'k', л: 'l', м: 'm', н: 'n', о: 'o', п: 'p',
  р: 'r', с: 's', т: 't', у: 'u', ф: 'f', х: 'h', ц: 'ts', ч: 'ch', ш: 'sh', щ: 'sch', ъ: '', ы: 'y', ь: '', э: 'e', ю: 'yu', я: 'ya',
};

/** Метка utm_campaign по названию: «2026-10-novinki-oktyabrya» (как делает сервис при создании рассылки). */
export function campaignUtm(name: string, date = new Date()): string {
  const slug = name
    .toLowerCase()
    .replace(/[а-яё]/g, (ch) => TRANSLIT[ch] ?? '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 48)
    .replace(/-+$/, '');
  const ym = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
  return slug ? `${ym}-${slug}` : ym;
}
