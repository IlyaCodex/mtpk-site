import { sql } from 'drizzle-orm';
import {
  pgSchema,
  serial,
  text,
  boolean,
  integer,
  bigint,
  timestamp,
  jsonb,
  index,
} from 'drizzle-orm/pg-core';

/** Схема контент-сервиса: страницы, стили, редиректы, склад, каталог файлов S3. */
export const contentSchema = pgSchema('content');

const timestamps = {
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
};

/**
 * Страница сайта. body — исходный HTML ровно как в raw-pages/body.html
 * (с маркерами блоков <!--C:имя--> и комментариями разработчиков);
 * развёртка блоков и чистка комментариев — при выдаче, в контент-сервисе.
 */
export const pages = contentSchema.table(
  'pages',
  {
    id: serial('id').primaryKey(),
    path: text('path').notNull().unique(),
    /** page — страница в общем каркасе сайта; document — готовый HTML-документ (Практикум) */
    kind: text('kind').notNull().default('page'),
    /** Тип шаблона (T01…T15 по docs/page-types): home, section, category, product, spare… */
    template: text('template').notNull().default('page'),
    title: text('title').notNull(),
    description: text('description'),
    body: text('body').notNull(),
    /** Общие шаблонные CSS, порядок важен (каскад). */
    cssTemplates: text('css_templates').array().notNull().default(sql`'{}'::text[]`),
    /** Ссылки на style_blocks в порядке meta.inline_styles. */
    styleHashes: text('style_hashes').array().notNull().default(sql`'{}'::text[]`),
    preloadImage: text('preload_image'),
    noindex: boolean('noindex').notNull().default(false),
    /** Прочие поля meta.json, которые сайт пока не использует (сохраняем, чтобы ничего не потерять). */
    extraMeta: jsonb('extra_meta').notNull().default({}),
    /** Первая публикация (первый коммит исходника) — datePublished в JSON-LD. */
    publishedAt: timestamp('published_at', { withTimezone: true }),
    /** Последняя правка тела страницы — dateModified в JSON-LD. */
    modifiedAt: timestamp('modified_at', { withTimezone: true }),
    /** lastmod для sitemap: последняя правка тела или meta. */
    lastmodAt: timestamp('lastmod_at', { withTimezone: true }).notNull().defaultNow(),
    /** Хеш исходника (body + meta) — повторный импорт пропускает неизменённые страницы. */
    sourceHash: text('source_hash').notNull(),
    status: text('status').notNull().default('published'),
    ...timestamps,
  },
  (t) => [index('pages_template_idx').on(t.template), index('pages_kind_idx').on(t.kind)],
);

/**
 * Блоки page-специфичного CSS (бывший meta.inline_styles). Дедупликация по
 * хешу: 128 страниц используют ~80 уникальных блоков. Крупные (≥ 20 000
 * символов) отдаются внешним файлом /css/inline-extracted/inline-<hash>.css —
 * тот же адрес, что выдавала Astro-сборка.
 */
export const styleBlocks = contentSchema.table('style_blocks', {
  hash: text('hash').primaryKey(),
  /** external — внешний файл; inline — <style> в <head> */
  mode: text('mode').notNull(),
  /** external: чистый CSS; inline: блок целиком вместе с тегом <style> */
  css: text('css').notNull(),
  bytes: integer('bytes').notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
});

/** 301-редиректы (легаси WordPress и ручные). */
export const redirects = contentSchema.table('redirects', {
  id: serial('id').primaryKey(),
  fromPath: text('from_path').notNull().unique(),
  toPath: text('to_path').notNull(),
  code: integer('code').notNull().default(301),
  /** legacy-map — импорт из server/redirects-legacy.map; manual — добавлен вручную */
  source: text('source').notNull().default('manual'),
  comment: text('comment'),
  ...timestamps,
});

/** Позиции «Наличия на складе» (бывший data/stock.config.json). */
export const stockItems = contentSchema.table('stock_items', {
  id: serial('id').primaryKey(),
  position: integer('position').notNull().default(0),
  url: text('url').notNull(),
  qty: integer('qty'),
  shipping: text('shipping'),
  note: text('note'),
  title: text('title'),
  image: text('image'),
  specs: jsonb('specs').$type<[string, string][]>(),
  /** Неизвестные поля конфига — сохраняются как есть. */
  extra: jsonb('extra').notNull().default({}),
  ...timestamps,
});

/** Каталог объектов в S3-бакете ассетов (картинки, файлы, ассеты Практикума). */
export const assets = contentSchema.table('assets', {
  key: text('key').primaryKey(),
  size: bigint('size', { mode: 'number' }).notNull(),
  etag: text('etag').notNull(),
  contentType: text('content_type').notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
});

export type Page = typeof pages.$inferSelect;
export type NewPage = typeof pages.$inferInsert;
export type StyleBlock = typeof styleBlocks.$inferSelect;
export type Redirect = typeof redirects.$inferSelect;
export type StockItem = typeof stockItems.$inferSelect;
export type Asset = typeof assets.$inferSelect;
