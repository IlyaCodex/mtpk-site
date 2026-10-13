/**
 * Письмо рассылки: ссылки, UTM-метки, ссылки отслеживания, подстановки.
 *
 * При запуске (compileCampaign) каждая ссылка письма получает номер и адрес
 * с UTM-метками (к своим сайтам: utm_source=email, utm_medium=email,
 * utm_campaign — метка рассылки, utm_content — по тексту кнопки или ссылки),
 * а в письме на её месте остаётся {{link:N}}. При отправке (personalize)
 * {{link:N}} — ссылка отслеживания /r/c/<id>/<токен получателя>: переход
 * записывается и ведёт дальше на адрес с метками.
 *
 * Переменные письма: {{name}} (или {{name|коллеги}} — что писать без имени),
 * {{email}}, {{unsubscribe_url}}, {{site_url}}. Ссылку можно не отслеживать:
 * атрибут data-notrack; своя метка utm_content — data-utm="…".
 */

export interface CompiledLink {
  position: number;
  label: string;
  url: string;
  target: string;
  utmContent: string;
}

const TRANSLIT: Record<string, string> = {
  а: 'a', б: 'b', в: 'v', г: 'g', д: 'd', е: 'e', ё: 'e', ж: 'zh', з: 'z', и: 'i', й: 'y', к: 'k', л: 'l', м: 'm', н: 'n', о: 'o', п: 'p', р: 'r', с: 's',
  т: 't', у: 'u', ф: 'f', х: 'h', ц: 'ts', ч: 'ch', ш: 'sh', щ: 'sch', ъ: '', ы: 'y', ь: '', э: 'e', ю: 'yu', я: 'ya',
};

/** Метка из текста: «Запросить КП» → zaprosit-kp. */
export function utmSlug(text: string, max = 40): string {
  const s = text
    .toLowerCase()
    .replace(/[а-яё]/g, (ch) => TRANSLIT[ch] ?? '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
  return s.slice(0, max).replace(/-+$/, '');
}

/** Метка рассылки по названию и дате: «Новинки октября» → 2026-10-novinki-oktyabrya. */
export function campaignUtm(name: string, date = new Date()): string {
  const ym = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
  const slug = utmSlug(name, 48);
  return slug ? `${ym}-${slug}` : ym;
}

/** Адрес с UTM-метками — только для своих сайтов; свои метки в ссылке не перезаписываются. */
export function withUtm(url: string, utm: { campaign: string; content: string }, ownHosts: string[]): string {
  let u: URL;
  try {
    u = new URL(url);
  } catch {
    return url;
  }
  if (!/^https?:$/.test(u.protocol) || !ownHosts.includes(u.host.toLowerCase())) return url;
  const set = (k: string, v: string) => {
    if (v && !u.searchParams.has(k)) u.searchParams.set(k, v);
  };
  set('utm_source', 'email');
  set('utm_medium', 'email');
  set('utm_campaign', utm.campaign);
  set('utm_content', utm.content);
  return u.toString();
}

const stripTags = (html: string) =>
  html
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&[a-z#0-9]+;/gi, ' ')
    .replace(/\s+/g, ' ')
    .trim();

/** Ссылка <a href="…">: группы — атрибуты до href, кавычка, адрес, атрибуты после, содержимое. */
const ANCHOR = /<a\b([^>]*?)\bhref\s*=\s*(["'])([\s\S]*?)\2([^>]*)>([\s\S]*?)<\/a>/gi;
/** Ссылки, которые не отслеживаются: почта, телефон, якоря, переменные письма. */
const SKIP = /^(mailto:|tel:|sms:|#|\{\{|javascript:)/i;

/**
 * Письмо к отправке: ссылки — {{link:N}} (номер — в списке ссылок с UTM),
 * скрытый текст-превью (preheader) — первым в <body>.
 */
export function compileCampaign(
  html: string,
  opts: { utmCampaign: string; ownHosts: string[]; publicUrl: string; preheader?: string },
): { html: string; links: CompiledLink[] } {
  const links: CompiledLink[] = [];
  const used = new Set<string>();
  const source = html.replace(/\{\{\s*site_url\s*\}\}/g, opts.publicUrl);
  let out = source.replace(ANCHOR, (whole, before: string, q: string, href: string, after: string, inner: string) => {
    const url = href.trim().replace(/&amp;/g, '&');
    if (SKIP.test(url) || /\bdata-notrack\b/i.test(before + after) || !/^https?:\/\//i.test(url)) return whole;
    const own = /\bdata-utm\s*=\s*(["'])(.*?)\1/i.exec(before + after)?.[2];
    const text = stripTags(inner) || /\balt\s*=\s*(["'])(.*?)\1/i.exec(inner)?.[2] || '';
    const position = links.length + 1;
    let content = utmSlug(own || text) || `link-${position}`;
    for (let i = 2; used.has(content); i++) content = `${utmSlug(own || text) || 'link'}-${i}`;
    used.add(content);
    links.push({ position, label: text.slice(0, 120) || `Ссылка ${position}`, url, target: withUtm(url, { campaign: opts.utmCampaign, content }, opts.ownHosts), utmContent: content });
    return `<a${before} href=${q}{{link:${position}}}${q}${after}>${inner}</a>`;
  });
  if (opts.preheader?.trim()) {
    // текст-превью: виден в списке писем, в самом письме — скрыт
    const hidden = `<div style="display:none;max-height:0;overflow:hidden;mso-hide:all;font-size:1px;line-height:1px;color:#ffffff;opacity:0">${escapeHtml(opts.preheader.trim())}${'&#8204;&nbsp;'.repeat(40)}</div>`;
    out = /<body\b[^>]*>/i.test(out) ? out.replace(/<body\b[^>]*>/i, (b) => `${b}\n${hidden}`) : hidden + out;
  }
  return { html: out, links };
}

export const escapeHtml = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

export interface Personal {
  token: string;
  name?: string | null;
  email: string;
  /** номер ссылки письма → id ссылки в базе */
  linkIds: Map<number, number>;
  publicUrl: string;
  /** пиксель открытия (у тестовых писем и предпросмотра — нет) */
  pixel?: boolean;
}

/** Письмо конкретному получателю: его ссылки отслеживания, имя, ссылка отписки, пиксель открытия. */
export function personalize(template: string, p: Personal): string {
  let out = template
    .replace(/\{\{link:(\d+)\}\}/g, (_m, n: string) => {
      const id = p.linkIds.get(Number(n));
      return id ? `${p.publicUrl}/r/c/${id}/${p.token}` : '#';
    })
    .replace(/\{\{\s*unsubscribe_url\s*\}\}/g, `${p.publicUrl}/r/u/${p.token}`)
    .replace(/\{\{\s*site_url\s*\}\}/g, p.publicUrl)
    .replace(/\{\{\s*name\s*(?:\|\s*([^}]*?)\s*)?\}\}/g, (_m, fallback: string | undefined) => escapeHtml(p.name?.trim() || fallback || ''))
    .replace(/\{\{\s*email\s*\}\}/g, escapeHtml(p.email));
  if (p.pixel) {
    const img = `<img src="${p.publicUrl}/r/o/${p.token}.gif" width="1" height="1" alt="" style="display:block;width:1px;height:1px;border:0">`;
    out = /<\/body>/i.test(out) ? out.replace(/<\/body>/i, `${img}</body>`) : out + img;
  }
  return out;
}

/** Текстовая версия письма (для почтовых программ и фильтров): абзацы и ссылки «текст (адрес)». */
export function textVersion(html: string): string {
  return html
    .replace(/<(style|script|head)\b[\s\S]*?<\/\1>/gi, '')
    .replace(/<div style="display:none[\s\S]*?<\/div>/i, '')
    .replace(/<a\b[^>]*href\s*=\s*(["'])(.*?)\1[^>]*>([\s\S]*?)<\/a>/gi, (_m, _q, href: string, inner: string) => {
      const text = stripTags(inner);
      return text && !/^https?:/.test(text) ? `${text} (${href})` : href;
    })
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/(p|div|tr|h[1-6]|li|table)>/gi, '\n')
    .replace(/<[^>]+>/g, '')
    .replace(/&nbsp;/g, ' ')
    .replace(/&laquo;/g, '«')
    .replace(/&raquo;/g, '»')
    .replace(/&mdash;/g, '—')
    .replace(/&amp;/g, '&')
    .replace(/&#?[a-z0-9]+;/gi, '')
    .replace(/[ \t]+/g, ' ')
    .replace(/ *\n */g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}
