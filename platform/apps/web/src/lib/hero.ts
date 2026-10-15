import fs from 'node:fs';
import path from 'node:path';
import type { Block } from '@mtpk/content-model';
import { heroImageInCss, heroImageInStyle } from '@mtpk/content-kit/hero-css';

const CONTENT = process.env.CONTENT_URL ?? 'http://127.0.0.1:4101';
const PUBLIC = path.join(process.cwd(), 'public');
const readPublic = (rel: string) => {
  try {
    return fs.readFileSync(path.join(PUBLIC, rel.replace(/^\//, '').split('?')[0]), 'utf8');
  } catch {
    return '';
  }
};

/**
 * Фото обложки страницы — во встроенном style блока или фоном из CSS (.hero__image главной — в site.css; .cat-hero__image —
 * в шаблоне страницы и её стилях, последнее по каскаду). Нужно, чтобы предзагрузить его теми же
 * адресами, что выберет CSS (hero-css.ts: узким экранам — копия 828 px), без ожидания стилей.
 */
export async function heroImage(blocks: Block[], cssTemplates: string[], externalStyles: string[]): Promise<string | null> {
  const types = new Set(blocks.map((b) => b.type));
  if (types.has('homeHero')) return heroImageInCss(readPublic('css/site.css'));
  const hero = blocks.find((b) => b.type === 'categoryHero');
  if (!hero) return null;
  // фото во встроенном style блока сильнее любых правил CSS
  const inline = heroImageInStyle((hero as { imageAttrs?: Record<string, string> }).imageAttrs?.style);
  if (inline) return inline;
  let found: string | null = null;
  for (const t of cssTemplates) found = heroImageInCss(readPublic(t)) ?? found;
  for (const href of externalStyles) {
    const file = href.split('?')[0].split('/').pop();
    const css = await fetch(`${CONTENT}/v1/styles/${file}`).then(
      (r) => (r.ok ? r.text() : ''),
      () => '',
    );
    found = heroImageInCss(css) ?? found;
  }
  return found;
}
