import { z } from 'zod';

/**
 * Типы полей контента. Подписи (describe) показываются в админке над полями
 * и попадают в OpenAPI-описание API.
 */

/** Строка с простой разметкой: <em>, <strong>, <a>, <br>, &nbsp;. Редактор — однострочный. */
export const inline = (label: string) => z.string().describe(label).meta({ editor: 'inline' });

/** Форматированный текст (абзацы, списки, таблицы). Редактор — визуальный. */
export const rich = (label: string) => z.string().describe(label).meta({ editor: 'rich' });

/** Обычная строка без разметки. */
export const text = (label: string) => z.string().describe(label);

/** Ссылка (адрес страницы, якорь #… или внешний URL). */
export const href = (label = 'Ссылка') => z.string().describe(label).meta({ editor: 'link' });

/** HTML-элемент целиком (иконка SVG, произвольная секция). Редактор — код. */
export const element = (label: string) => z.string().describe(label).meta({ editor: 'code' });

/** Код на другом языке (CSS, TypeScript): редактор кода с его подсветкой. */
export const code = (label: string, lang: 'css' | 'ts') => z.string().describe(label).meta({ editor: 'code', lang });

/** Атрибуты элемента, которые нужно сохранить как есть (data-*, aria-*, loading…). */
export const attrs = () =>
  z.record(z.string(), z.string()).describe('Дополнительные атрибуты элемента').meta({ editor: 'attrs' }).optional();

/** Картинка: адрес, alt и прочие атрибуты (loading, width, data-full…). */
export const image = (label = 'Картинка') =>
  z
    .object({
      src: z.string().describe('Адрес картинки').meta({ editor: 'media' }),
      alt: z.string().describe('Описание (alt)').default(''),
      attrs: attrs(),
    })
    .describe(label);

export const crumb = z.object({
  label: inline('Название'),
  href: href().optional().describe('Ссылка (у последней крошки — нет)'),
});

export type Crumb = z.infer<typeof crumb>;
export type Image = z.infer<ReturnType<typeof image>>;
