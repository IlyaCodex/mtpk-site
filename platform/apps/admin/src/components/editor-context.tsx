'use client';

import { createContext, useContext } from 'react';

/** Что редактируется: адрес страницы — для папки загрузок (фото товара — в свою папку). */
export const EditorContext = createContext<{ pagePath: string }>({ pagePath: '/' });

export const useEditorContext = () => useContext(EditorContext);

/** Папка для фото страницы в медиатеке: img/products/<последний сегмент адреса>/. */
export function uploadFolderFor(pagePath: string): string {
  const slug = pagePath.split('/').filter(Boolean).pop() ?? 'misc';
  return `img/${pagePath.startsWith('/products/') ? 'products' : 'pages'}/${slug.replace(/[^a-z0-9-]+/gi, '-').toLowerCase()}/`;
}
