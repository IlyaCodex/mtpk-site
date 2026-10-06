import { buildCompareIndex, resolveStock, type StockConfigItem } from '@mtpk/content-kit';
import { styleFileCss } from '@mtpk/content-kit/styles';
import { DEFAULT_SETTINGS, siteSettings, type SiteSettings } from '@mtpk/content-model';
import { asc, eq, inArray, like, pages, redirects, settings, stockItems, styleBlocks, type Db, type Page, type StyleBlock } from './db.ts';
import type { JsonCache, Logger, PageDto, PageListItem, RedirectDto } from '@mtpk/shared';
import { renderPage, seoHtml, toSearchDoc, type SearchDoc } from './render.ts';
import type { SiteDataDto } from '@mtpk/shared';

const MISSING = { missing: true } as const;
type Cached<T> = T | typeof MISSING;

/**
 * Доступ к контенту с кешем в Redis. Всё, что отдаётся сайту, — производное
 * от таблиц content.*: страница с развёрнутыми блоками, склад, индекс сравнения.
 */
export class ContentStore {
  private styles: Map<string, StyleBlock> | null = null;

  constructor(
    private readonly db: Db,
    private readonly cache: JsonCache,
    private readonly site: string,
    private readonly ttl: number,
    private readonly log: Logger,
  ) {}

  private async styleMap(): Promise<Map<string, StyleBlock>> {
    if (!this.styles) {
      const rows = await this.db.select().from(styleBlocks);
      this.styles = new Map(rows.map((r) => [r.hash, r]));
    }
    return this.styles;
  }

  private async loadPage(path: string): Promise<Page | null> {
    const [row] = await this.db.select().from(pages).where(eq(pages.path, path)).limit(1);
    return row && row.status === 'published' ? row : null;
  }

  async getPage(path: string): Promise<PageDto | null> {
    const key = `page:${path}`;
    const hit = await this.cache.get<Cached<PageDto>>(key);
    if (hit) return 'missing' in hit ? null : hit;
    const row = await this.loadPage(path);
    if (!row) {
      // короткий отрицательный кеш: сканеры перебирают несуществующие адреса
      await this.cache.set(key, MISSING, 60);
      return null;
    }
    const dto = renderPage(row, await this.styleMap(), this.site);
    await this.cache.set(key, dto, this.ttl);
    return dto;
  }

  async listPages(): Promise<PageListItem[]> {
    return this.cache.wrap('pages:list', this.ttl, async () => {
      const rows = await this.db
        .select({ path: pages.path, kind: pages.kind, template: pages.template, noindex: pages.noindex, lastmodAt: pages.lastmodAt })
        .from(pages)
        .where(eq(pages.status, 'published'))
        .orderBy(asc(pages.path));
      return rows.map((r) => ({ ...r, kind: r.kind as PageListItem['kind'], lastmodAt: r.lastmodAt.toISOString() }));
    });
  }

  async listRedirects(): Promise<RedirectDto[]> {
    return this.cache.wrap('redirects', this.ttl, async () => {
      const rows = await this.db.select().from(redirects).orderBy(asc(redirects.fromPath));
      return rows.map((r) => ({ from: r.fromPath, to: r.toPath, code: r.code }));
    });
  }

  /** CSS-файл стилей страницы по хешу (/css/inline-extracted/inline-<хеш>.css). */
  async styleCss(hash: string): Promise<string | null> {
    const block = (await this.styleMap()).get(hash);
    return block ? styleFileCss(block) : null;
  }

  /** /data/stock.json — тот же формат, что писал build-stock.mjs. */
  async stock(): Promise<Record<string, unknown>> {
    return this.cache.wrap('stock', this.ttl, async () => {
      const items = await this.db.select().from(stockItems).orderBy(asc(stockItems.position));
      const config: StockConfigItem[] = items.map((it) => {
        const extra = (it.extra ?? {}) as Record<string, unknown>;
        return {
          ...extra,
          url: it.url,
          qty: it.qty ?? (extra.qty as number | undefined),
          shipping: it.shipping,
          note: it.note,
          specs: it.specs,
          image: it.image,
          title: it.title,
        };
      });
      // Страницы позиций и их родительские категории (оттуда берётся готовая карточка)
      const wanted = new Set<string>();
      for (const c of config) {
        const url = String(c.url || '').trim();
        if (!url) continue;
        wanted.add(url);
        const parts = url.replace(/^\/+|\/+$/g, '').split('/');
        if (parts.length >= 3) wanted.add(`/${parts.slice(0, -1).join('/')}/`);
      }
      const rows = wanted.size
        ? await this.db.select({ path: pages.path, blocks: pages.blocks, title: pages.title }).from(pages).where(inArray(pages.path, [...wanted]))
        : [];
      // разметка страниц — серверный рендер тех же блоков, что видит посетитель
      const byPath = new Map(rows.map((r) => [r.path, { body: seoHtml(r), title: r.title }]));
      const { items: resolved, warnings } = resolveStock(config, (p) => byPath.get(p));
      for (const w of warnings) this.log.warn({ stock: w }, 'склад');
      return {
        _generated: 'content-service — не редактировать. Источник: таблица content.stock_items',
        _count: resolved.length,
        items: resolved,
      };
    });
  }

  /** Индекс сравнения: { index, sections } — compare-index.json и compare-sections.json. */
  async compare(): Promise<{ index: unknown; sections: string[] }> {
    return this.cache.wrap('compare', this.ttl * 24, async () => {
      const rows = await this.db
        .select({ path: pages.path, blocks: pages.blocks })
        .from(pages)
        .where(like(pages.path, '/products/%'));
      const { index, sections, report } = buildCompareIndex(rows.map((r) => ({ path: r.path, body: seoHtml(r) })));
      this.log.info({ sections: sections.length, scanned: report.scanned }, 'индекс сравнения пересобран');
      return { index, sections };
    });
  }

  /** Данные для рендера блоков на сайте: склад (slug → срок) и разделы со сравнением. */
  async siteData(): Promise<SiteDataDto> {
    return this.cache.wrap('site-data', this.ttl, async () => {
      const stock = (await this.stock()) as { items?: { slug?: string; shipping?: string }[] };
      const map: SiteDataDto['stock'] = {};
      for (const it of stock.items ?? []) {
        if (it.slug) map[String(it.slug).replace(/^\/+|\/+$/g, '')] = it.shipping ? { shipping: it.shipping } : {};
      }
      return { stock: map, compareSections: (await this.compare()).sections };
    });
  }

  /** Настройки сайта (контакты, меню, подвал). Нет записи или она битая — значения по умолчанию. */
  async settings(): Promise<SiteSettings> {
    return this.cache.wrap('settings', this.ttl, async () => {
      const [row] = await this.db.select().from(settings).where(eq(settings.key, 'site')).limit(1);
      if (!row) return DEFAULT_SETTINGS;
      const parsed = siteSettings.safeParse(row.value);
      if (parsed.success) return parsed.data;
      this.log.error({ issues: parsed.error.issues.slice(0, 5) }, 'настройки сайта не прошли проверку — отдаём значения по умолчанию');
      return DEFAULT_SETTINGS;
    });
  }

  async searchDoc(path: string): Promise<SearchDoc | null> {
    const row = await this.loadPage(path);
    if (!row) return null;
    return toSearchDoc(row, renderPage(row, await this.styleMap(), this.site));
  }

  /** Все документы для поиска — постранично, чтобы не держать 50 МБ HTML разом. */
  async *searchDocs(batch = 100): AsyncGenerator<SearchDoc> {
    const styles = await this.styleMap();
    const paths = (await this.db.select({ path: pages.path }).from(pages).orderBy(asc(pages.path))).map((r) => r.path);
    for (let i = 0; i < paths.length; i += batch) {
      const rows = await this.db.select().from(pages).where(inArray(pages.path, paths.slice(i, i + batch)));
      for (const row of rows) {
        if (row.status !== 'published') continue;
        const doc = toSearchDoc(row, renderPage(row, styles, this.site));
        if (doc) yield doc;
      }
    }
  }

  async purgeRedirects(): Promise<void> {
    await this.cache.del('redirects');
  }

  /** Сброс кеша: конкретные страницы (+ производные списки) или всё. */
  async purge(paths?: string[]): Promise<number> {
    this.styles = null;
    if (!paths || !paths.length) return this.cache.clear();
    await this.cache.del(...paths.map((p) => `page:${p}`), 'pages:list', 'redirects', 'stock', 'site-data');
    if (paths.some((p) => p.startsWith('/products/'))) await this.cache.del('compare');
    return paths.length;
  }
}
