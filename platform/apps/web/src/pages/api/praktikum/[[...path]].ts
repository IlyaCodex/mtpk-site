import type { NextApiRequest, NextApiResponse } from 'next';
import type { PageDto } from '@mtpk/shared/contracts';
import { completeArticleLd } from '@/lib/article-ld';
import { clientModuleUrl } from '@/lib/assets';
import { getPage, getSettings } from '@/lib/content';
import { hasSiteChrome, withSiteChrome } from '@/lib/site-chrome';

/** Вошёл в админку (флажок ставит админка при входе) — на странице нужна панель администратора. */
const isAdmin = (req: NextApiRequest) => /(?:^|;\s*)mtpk_bar=1/.test(req.headers.cookie ?? '');

/** Модуль панели администратора — перед </body> (как у страниц сайта: «Редактировать страницу» и т. д.). */
function withAdminBar(html: string): string {
  const src = clientModuleUrl('doc-bar');
  if (!src) return html;
  const tag = `<script type="module" src="${src}"></script>`;
  const at = html.toLowerCase().lastIndexOf('</body>');
  return at < 0 ? html + tag : html.slice(0, at) + tag + html.slice(at);
}

/**
 * Раздел «Практикум» (адреса /praktikum/… переписываются сюда в next.config):
 * статьи хранятся в контенте целыми HTML-документами своей вёрстки. Шапка,
 * подвал, мобильное меню, общие стили и скрипты — те же, что у всех страниц
 * сайта: на места <site-header>/<site-footer> документа их ставит
 * lib/site-chrome.tsx (панель администратора — в общем модуле сайта).
 * Документы без этих мест (рабочие листы для печати) отдаются как есть, панель
 * администратора им — отдельным модулем doc-bar. Ассеты раздела — через медиасервис.
 */
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const segments = ([] as string[]).concat(req.query.path ?? []);
  const last = segments[segments.length - 1] ?? '';
  const urlPath = `/praktikum/${segments.join('/')}${segments.length && !last.includes('.') ? '/' : ''}`;
  let page: PageDto | null;
  try {
    page = await getPage(urlPath);
  } catch {
    return res.status(502).send('Ошибка сервера');
  }
  if (!page?.bodyHtml) return res.status(404).setHeader('Content-Type', 'text/plain; charset=utf-8').send('Страница не найдена');
  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  res.setHeader('Cache-Control', 'no-cache, must-revalidate');
  res.setHeader('Vary', 'Cookie');
  // разметка статьи — с автором и датами (lib/article-ld.ts)
  const html = completeArticleLd(page.bodyHtml, page);
  if (hasSiteChrome(html)) return res.send(withSiteChrome(html, await getSettings(), urlPath));
  res.send(isAdmin(req) ? withAdminBar(html) : html);
}
