import { route } from '@/lib/api';
import { can, ROLE_LABELS } from '@/lib/auth';
import { BASE_PATH } from '@/lib/base-path';
import { serviceJson } from '@/lib/services';

type Lookup = {
  id: number;
  path: string;
  title: string;
  description: string | null;
  noindex: boolean;
  status: 'published' | 'draft';
  kind: 'page' | 'document';
  updatedAt: string;
  catalog:
    | { kind: 'category'; id: number; name: string; categoryId: number }
    | { kind: 'subcategory'; id: number; name: string; categoryId: number }
    | { kind: 'product'; id: number; name: string; categoryId: number; subcategoryId: number | null }
    | null;
};
type LeadStats = { today: number; byStatus: Record<string, number> };

const admin = (path: string) => `${BASE_PATH}${path}`;
const plain = (s: string) => s.replace(/<[^>]+>/g, '').replace(/&nbsp;/g, ' ').trim();

/** Короткая проверка SEO: длина заголовка и описания, закрыта ли от поиска. */
function seoCheck(page: Lookup) {
  const title = plain(page.title);
  const description = plain(page.description ?? '');
  const notes: string[] = [];
  if (page.noindex) notes.push('Страница закрыта от поисковиков (noindex)');
  if (title.length < 30) notes.push('Заголовок короче 30 знаков');
  if (title.length > 70) notes.push('Заголовок длиннее 70 знаков — в поиске обрежется');
  if (!description) notes.push('Нет описания (meta description)');
  else if (description.length < 70) notes.push('Описание короче 70 знаков');
  else if (description.length > 170) notes.push('Описание длиннее 170 знаков — в поиске обрежется');
  const level = page.noindex || !description ? 'bad' : notes.length ? 'warn' : 'ok';
  return { title, description, noindex: page.noindex, level, notes };
}

/**
 * Панель администратора на сайте (как у WordPress): сайт запрашивает её, если
 * в браузере есть флажок входа (BAR_COOKIE). Что за страница открыта и куда
 * идти её править, SEO, заявки за сегодня, быстрые ссылки — по правам.
 */
export const GET = route(null, async (req, user) => {
  const path = new URL(req.url).searchParams.get('path') || '/';
  const [page, leads] = await Promise.all([
    can(user, 'content') ? serviceJson<Lookup>('content', `pages/lookup?path=${encodeURIComponent(path)}`, { user }).catch(() => null) : null,
    can(user, 'leads') ? serviceJson<LeadStats>('leads', 'leads/stats?days=1', { user }).catch(() => null) : null,
  ]);

  const cat = page?.catalog;
  const failed = leads ? (leads.byStatus.failed ?? 0) + (leads.byStatus.partial ?? 0) : 0;
  const body = {
    user: { name: user.name, role: ROLE_LABELS[user.role] },
    page: page && {
      title: plain(page.title),
      status: page.status,
      kind: page.kind,
      updatedAt: page.updatedAt,
      // товар правится одним экраном (карточка + страница), остальное — редактором страницы
      edit: admin(cat?.kind === 'product' ? `/catalog/products/${cat.id}` : `/pages/${page.id}`),
      editLabel: page.kind === 'document' ? 'Открыть в админке' : cat?.kind === 'product' ? 'Редактировать товар' : 'Редактировать страницу',
      seo: { ...seoCheck(page), href: admin(cat?.kind === 'product' ? `/catalog/products/${cat.id}` : `/pages/${page.id}`) },
      catalog:
        cat?.kind === 'category'
          ? { label: 'Категория в каталоге', href: admin(`/catalog/categories/${cat.id}`) }
          : cat?.kind === 'subcategory'
            ? { label: 'Подкатегория в каталоге', href: admin(`/catalog/subcategories/${cat.id}`) }
            : null,
      addProduct: cat
        ? {
            label: cat.kind === 'category' ? 'Товар в эту категорию' : 'Товар рядом с этим',
            href: admin(
              `/catalog/products/new?category=${cat.categoryId}${cat.kind === 'subcategory' ? `&subcategory=${cat.id}` : cat.kind === 'product' && cat.subcategoryId ? `&subcategory=${cat.subcategoryId}` : ''}`,
            ),
          }
        : null,
    },
    leads: leads && { today: leads.today, failed, href: admin(failed ? '/leads?status=failed' : '/leads') },
    links: {
      admin: admin('/'),
      ...(can(user, 'content') ? { newPage: admin('/pages/new'), catalog: admin('/catalog'), settings: admin('/settings') } : {}),
      ...(can(user, 'media') ? { media: admin('/media') } : {}),
    },
    canPurge: can(user, 'content'),
  };
  return Response.json(body, { headers: { 'cache-control': 'no-store' } });
});
