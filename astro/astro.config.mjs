import { defineConfig } from 'astro/config';
import sitemap from '@astrojs/sitemap';
import { execSync } from 'node:child_process';

// SEO-T6 (fix): lastmod из git-истории, а НЕ из даты сборки.
// Astro делает полную пересборку каждый раз; со старым `lastmod: new Date()`
// дату сборки получали ВСЕ страницы → Google видел «весь сайт обновлён» при
// каждом деплое и переставал доверять lastmod. Теперь берём дату последнего
// коммита, тронувшего исходник страницы (body.html / meta.json): реально
// изменённые страницы получают новую дату, нетронутые — сохраняют прежнюю.
// Состояние хранит сам git, отдельный манифест не нужен.
//
// Граница: правки общих партиалов/компонентов/CSS НЕ двигают дату конкретной
// страницы (меняется не её body.html). Для контентного lastmod это корректно.
const BUILD_DATE = new Date();
function buildGitDateMap() {
  const map = new Map();
  try {
    const root = execSync('git rev-parse --show-toplevel', { encoding: 'utf-8' }).trim();
    // Один проход по истории (от новых к старым). %cI — строгий ISO-8601.
    const out = execSync('git log --format=C:%cI --name-only -- astro/src/raw-pages', {
      cwd: root,
      encoding: 'utf-8',
      maxBuffer: 256 * 1024 * 1024,
    });
    let cur = null;
    for (const line of out.split('\n')) {
      if (line.startsWith('C:')) { cur = line.slice(2); continue; }
      if (!line || !cur) continue;
      // Первая встреча пути = самый свежий коммит (лог идёт от новых к старым).
      if (!map.has(line)) map.set(line, cur);
    }
  } catch (e) {
    console.warn('[sitemap] git lastmod недоступен, fallback на дату сборки:', e.message);
  }
  return map;
}
const GIT_DATES = buildGitDateMap();

// pathname (/products/foo/) → дата последнего изменения исходников страницы.
function lastmodForPath(pathname) {
  const slug = pathname.replace(/^\/|\/$/g, ''); // '' для главной
  const base = slug ? `astro/src/raw-pages/${slug}` : 'astro/src/raw-pages';
  let best = null;
  for (const c of [`${base}/body.html`, `${base}/meta.json`]) {
    const d = GIT_DATES.get(c);
    if (d && (!best || d > best)) best = d; // ISO-строки сравнимы лексикографически
  }
  return best ? new Date(best) : BUILD_DATE; // новый/некоммиченный файл → дата сборки
}

export default defineConfig({
  site: 'https://uralinduktor.ru',
  output: 'static',
  trailingSlash: 'always',
  build: { format: 'directory' },
  integrations: [
    sitemap({
      // SEO-T6: lastmod + changefreq + priority по типу страницы.
      // - главная: priority 1.0
      // - корни разделов (/products/, /uslugi/...): 0.9
      // - подкатегории каталога: 0.8
      // - товарные карточки: 0.7
      // - проекты/новости/отзывы: 0.5
      // - служебные (404 и т.п.): не включаем
      changefreq: 'weekly',
      priority: 0.6,
      // lastmod выставляется per-page в serialize() из git-истории (см. выше).
      filter: (page) => {
        // Исключаем 404 и любые служебные страницы
        if (page.includes('/404')) return false;
        // Сравнение товаров: содержимое собирается в браузере из выбора
        // пользователя, индексировать нечего.
        if (page.includes('/sravnenie')) return false;
        return true;
      },
      serialize: (item) => {
        const url = item.url;
        const path = new URL(url).pathname;

        // lastmod = дата последнего реального изменения страницы (git).
        item.lastmod = lastmodForPath(path).toISOString();

        // Назначаем priority по типу страницы
        if (path === '/' || path === '') {
          item.priority = 1.0;
          item.changefreq = 'weekly';
        } else if (
          path === '/products/' ||
          path === '/uslugi/' ||
          path === '/proizvodstvo/' ||
          path === '/o-kompanii/' || path === '/o-company/' ||
          path === '/nalichie/' ||
          path === '/contact/' ||
          path === '/proekty/'
        ) {
          item.priority = 0.9;
          item.changefreq = 'weekly';
        } else if (path.startsWith('/products/') && path.split('/').filter(Boolean).length <= 3) {
          // /products/<root>/ и /products/<root>/<subcat>/
          item.priority = 0.8;
          item.changefreq = 'monthly';
        } else if (path.startsWith('/products/')) {
          // Товарные карточки
          item.priority = 0.7;
          item.changefreq = 'monthly';
        } else if (
          path.startsWith('/proekty/') ||
          path.startsWith('/news/') ||
          path.startsWith('/reviews/')
        ) {
          item.priority = 0.5;
          item.changefreq = 'monthly';
        } else {
          item.priority = 0.6;
          item.changefreq = 'monthly';
        }

        return item;
      },
    }),
  ],
});
