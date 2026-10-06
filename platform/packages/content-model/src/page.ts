import { z } from 'zod';
import { block, type Block } from './blocks.ts';

/** Страница сайта: адрес, SEO и содержимое из блоков. */
export const pageInput = z.object({
  path: z.string().describe('Адрес страницы, со слешем на конце: /products/…/'),
  title: z.string().describe('Title (заголовок вкладки и сниппета)'),
  description: z.string().nullable().optional().describe('Meta description'),
  noindex: z.boolean().default(false).describe('Закрыть от поисковиков'),
  status: z.enum(['published', 'draft']).default('published').describe('Статус'),
  template: z.string().optional().describe('Тип страницы (товар, категория, …)'),
  preloadImage: z.string().nullable().optional().describe('LCP-картинка (preload)'),
  cssTemplates: z.array(z.string()).default([]).describe('Шаблонные стили (/css/tpl/*.css)'),
  inlineStyles: z.array(z.string()).default([]).describe('Стили страницы (CSS)'),
  blocks: z.array(block).describe('Содержимое страницы'),
});
export type PageInput = z.infer<typeof pageInput>;

/** Страница в ответе API (контент + служебные поля). */
export interface PageData extends Omit<PageInput, 'blocks'> {
  id: number;
  kind: 'page' | 'document';
  blocks: Block[];
  externalStyles: string[];
  publishedAt: string | null;
  modifiedAt: string | null;
  lastmodAt: string;
  updatedAt: string;
}
