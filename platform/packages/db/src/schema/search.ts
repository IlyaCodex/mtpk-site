import { sql, type SQL } from 'drizzle-orm';
import { pgSchema, text, integer, timestamp, customType, index } from 'drizzle-orm/pg-core';

/** Схема поискового сервиса — собственный индекс, наполняется событиями контента. */
export const searchSchema = pgSchema('search');

const tsvector = customType<{ data: string }>({
  dataType() {
    return 'tsvector';
  },
});

export const documents = searchSchema.table(
  'documents',
  {
    path: text('path').primaryKey(),
    title: text('title').notNull(),
    /** Видимый текст страницы без разметки (то, что раньше индексировал Pagefind). */
    body: text('body').notNull(),
    image: text('image'),
    /** Вес выдачи: разделы каталога — 10, остальное — 1 (как data-pagefind-weight). */
    weight: integer('weight').notNull().default(1),
    /** Русская морфология: заголовок весит больше текста. */
    tsv: tsvector('tsv')
      .notNull()
      .generatedAlwaysAs(
        (): SQL =>
          sql`setweight(to_tsvector('russian', coalesce(${documents.title}, '')), 'A') || setweight(to_tsvector('russian', coalesce(${documents.body}, '')), 'C')`,
      ),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    index('documents_tsv_idx').using('gin', t.tsv),
    index('documents_title_trgm_idx').using('gin', sql`${t.title} gin_trgm_ops`),
  ],
);

export type SearchDocument = typeof documents.$inferSelect;
