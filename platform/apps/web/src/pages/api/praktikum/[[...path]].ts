import type { NextApiRequest, NextApiResponse } from 'next';
import type { PageDto } from '@mtpk/shared/contracts';
import { clientModuleUrl } from '@/lib/assets';
import { getPage } from '@/lib/content';

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
 * статьи хранятся в контенте целыми HTML-документами и отдаются как есть,
 * без общего каркаса сайта. Ассеты раздела идут через медиасервис. Тем, кто
 * вошёл в админку, — ещё и панель администратора (правка — в админке).
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
  res.send(isAdmin(req) ? withAdminBar(page.bodyHtml) : page.bodyHtml);
}
