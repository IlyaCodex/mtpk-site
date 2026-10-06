import type { NextApiRequest, NextApiResponse } from 'next';
import type { PageDto } from '@mtpk/shared/contracts';
import { getPage } from '@/lib/content';

/**
 * Раздел «Практикум» (адреса /praktikum/… переписываются сюда в next.config):
 * статьи хранятся в контенте целыми HTML-документами и отдаются как есть,
 * без общего каркаса сайта. Ассеты раздела идут через медиасервис.
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
  res.send(page.bodyHtml);
}
