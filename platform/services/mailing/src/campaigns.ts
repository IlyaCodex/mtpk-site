/**
 * Рассылки: проверка письма перед запуском, подготовка к отправке (ссылки с
 * UTM-метками, получатели — активные адреса базы на момент старта), статистика.
 */
import type { Db, MailCampaign } from '@mtpk/db';
import { compileCampaign, personalize, textVersion, type CompiledLink } from './compile.ts';
import { OWN_HOSTS, PUBLIC_URL } from './env.ts';
import { SAMPLE } from './template.ts';

export interface Draft {
  subject: string;
  preheader: string;
  html: string;
  utmCampaign: string;
}

/** Замечания к письму: пустая тема, нет отписки, письмо обрежет Gmail (больше 102 КБ) и т. п. */
export function warnings(d: Draft, links: CompiledLink[]): string[] {
  const out: string[] = [];
  if (!d.subject.trim()) out.push('Нет темы письма.');
  if (!/\{\{\s*unsubscribe_url\s*\}\}/.test(d.html)) out.push('Нет ссылки отписки {{unsubscribe_url}} — без неё рассылку не запустить.');
  if (!links.length) out.push('В письме нет ни одной ссылки — переходов не будет.');
  const bytes = Buffer.byteLength(d.html, 'utf8');
  if (bytes > 100_000) out.push(`Письмо весит ${Math.round(bytes / 1024)} КБ: Gmail покажет только начало (лимит — 102 КБ).`);
  if (/<img\b[^>]*\bsrc\s*=\s*["']http:\/\//i.test(d.html)) out.push('Есть картинки по http:// — почтовые программы могут их не показать: нужен https://.');
  if (/<script\b/i.test(d.html)) out.push('В письме есть <script> — почтовые программы его вырежут.');
  if (!d.utmCampaign.trim()) out.push('Нет метки utm_campaign — переходы в Метрике не отличить от других рассылок.');
  return out;
}

/** Письмо для предпросмотра: подстановки примера получателя, ссылки — сразу на адреса с UTM-метками. */
export function renderPreview(d: Draft) {
  const compiled = compileCampaign(d.html, { utmCampaign: d.utmCampaign, ownHosts: OWN_HOSTS, publicUrl: PUBLIC_URL, preheader: d.preheader });
  const direct = compiled.html.replace(/\{\{link:(\d+)\}\}/g, (_m, n: string) => compiled.links[Number(n) - 1]?.target.replace(/&/g, '&amp;') ?? '#');
  const html = personalize(direct, { token: 'preview', name: SAMPLE.name, email: SAMPLE.email, linkIds: new Map(), publicUrl: PUBLIC_URL });
  return { html, text: textVersion(html), links: compiled.links, warnings: warnings(d, compiled.links) };
}

/**
 * Подготовка к отправке: письмо со ссылками отслеживания, ссылки с метками,
 * получатели — активные контакты базы (отписавшиеся и недоставляемые — нет),
 * у каждого свой токен. Повторная подготовка (запуск после отмены) — заново.
 */
export async function prepareCampaign(db: Db, c: MailCampaign): Promise<number> {
  const compiled = compileCampaign(c.html, { utmCampaign: c.utmCampaign, ownHosts: OWN_HOSTS, publicUrl: PUBLIC_URL, preheader: c.preheader });
  return db.$transaction(async (tx) => {
    await tx.mailRecipient.deleteMany({ where: { campaignId: c.id } });
    await tx.mailLink.deleteMany({ where: { campaignId: c.id } });
    if (compiled.links.length) {
      await tx.mailLink.createMany({
        data: compiled.links.map((l) => ({ campaignId: c.id, position: l.position, label: l.label, url: l.url, target: l.target, utmContent: l.utmContent })),
      });
    }
    const total = c.listId
      ? await tx.$executeRaw`
          INSERT INTO mailing.recipients (campaign_id, contact_id, email, name, token)
          SELECT ${c.id}, ct.id, ct.email, ct.name, replace(gen_random_uuid()::text, '-', '')
          FROM mailing.list_members m JOIN mailing.contacts ct ON ct.id = m.contact_id
          WHERE m.list_id = ${c.listId} AND ct.status = 'active'
          ON CONFLICT (campaign_id, email) DO NOTHING
        `
      : 0;
    await tx.mailCampaign.update({ where: { id: c.id }, data: { compiled: compiled.html, total, status: 'sending', startedAt: new Date(), finishedAt: null } });
    return total;
  });
}

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

/** Счётчики рассылок по получателям (одним запросом на несколько рассылок). */
export async function statsFor(db: Db, ids: number[]): Promise<Map<number, CampaignStats>> {
  const out = new Map<number, CampaignStats>();
  if (!ids.length) return out;
  const rows = (await db.$queryRaw`
    SELECT campaign_id AS id,
      count(*)::int AS total,
      count(*) FILTER (WHERE status IN ('queued', 'sending'))::int AS queued,
      count(*) FILTER (WHERE status = 'sent')::int AS sent,
      count(*) FILTER (WHERE status = 'failed')::int AS failed,
      count(*) FILTER (WHERE status = 'skipped')::int AS skipped,
      count(*) FILTER (WHERE opened_at IS NOT NULL)::int AS opened,
      count(*) FILTER (WHERE clicked_at IS NOT NULL)::int AS clicked,
      coalesce(sum(clicks), 0)::int AS clicks
    FROM mailing.recipients WHERE campaign_id = ANY(${ids}::int[]) GROUP BY campaign_id
  `) as (CampaignStats & { id: number })[];
  for (const r of rows) out.set(r.id, r);
  return out;
}

export const EMPTY_STATS: CampaignStats = { total: 0, queued: 0, sent: 0, failed: 0, skipped: 0, opened: 0, clicked: 0, clicks: 0 };
