/**
 * Фото обложек (.hero__image главной, .cat-hero__image разделов) — фоном из CSS, а значит без srcset:
 * телефон качал исходник ~1920 px (≈100 КБ) ради экрана в 390 px. К стилям дописывается правило для
 * узких экранов с копией 828 px (?w=828 — AVIF/WebP из медиасервиса), селектор тот же, поэтому
 * положение, масштаб и анимация фона — из исходного правила. Предзагрузка на странице берёт те же
 * адреса (heroPreload): узким экранам — копию, широким — исходник.
 */
export const HERO_MOBILE_MAX = 767;
export const HERO_MOBILE_WIDTH = 828;

const RULE = /([^{}]*\b(?:cat-hero|hero)__image\b[^{}]*)\{([^{}]*)\}/g;
const URL = /url\(\s*(['"]?)(\/img\/[^'")?#\s]+\.(?:png|jpe?g|webp))(\?[^'")#\s]*)?\1\s*\)/gi;

/** Адрес копии для узких экранов: исходные параметры (?v=…) сохраняются, ширина — 828. */
export function heroMobileUrl(src: string): string {
  const [path, query = ''] = src.split('?');
  const params = new URLSearchParams(query);
  params.set('w', String(HERO_MOBILE_WIDTH));
  return `${path}?${params.toString()}`;
}

/** Правила обложки верхнего уровня (не внутри @media — в т. ч. дописанных responsiveHeroCss) с одной картинкой. */
function* topLevelHeroRules(css: string): Generator<{ match: RegExpMatchArray; url: string }> {
  let depth = 0;
  let last = 0;
  for (const m of css.matchAll(RULE)) {
    const before = css.slice(last, m.index);
    depth += (before.match(/\{/g) ?? []).length - (before.match(/\}/g) ?? []).length;
    last = m.index! + m[0].length;
    if (depth !== 0) continue;
    const urls = [...m[2].matchAll(URL)];
    if (urls.length !== 1 || /gradient\(/i.test(m[2])) continue;
    yield { match: m, url: `${urls[0][2]}${urls[0][3] ?? ''}` };
  }
}

/** Фото обложки в CSS — последнее по каскаду правило верхнего уровня с одной картинкой, или null. */
export function heroImageInCss(css: string): string | null {
  let found: string | null = null;
  for (const r of topLevelHeroRules(css)) found = r.url;
  return found;
}

/**
 * Дописать правило для узких экранов. Только простые случаи: правило не внутри @media, одна
 * картинка из /img/, без градиентов — иначе CSS не меняется (сложный фон не ломаем).
 */
export function responsiveHeroCss(css: string): string {
  const extra: string[] = [];
  for (const { match, url } of topLevelHeroRules(css)) {
    const selector = match[1].replace(/<\/?style[^>]*>/gi, '').replace(/\/\*[\s\S]*?\*\//g, '').trim();
    if (!selector || selector.startsWith('@')) continue;
    extra.push(`${selector}{background-image:url('${heroMobileUrl(url)}')}`);
  }
  if (!extra.length) return css;
  const tail = `\n@media (max-width:${HERO_MOBILE_MAX}px){${extra.join('')}}\n`;
  // CSS, сохранённый вместе с тегом <style>, — дописать внутрь тега
  const close = css.lastIndexOf('</style>');
  return close >= 0 ? `${css.slice(0, close)}${tail}${css.slice(close)}` : `${css}${tail}`;
}

const INLINE_BG = /background-image\s*:\s*url\(\s*(['"]?)(\/img\/[^'")?#\s]+\.(?:png|jpe?g|webp))(\?[^'")#\s]*)?\1\s*\)\s*;?/i;

/** Фото обложки, заданное во встроенном style блока (style="background-image: url(…)"), или null. */
export function heroImageInStyle(style: string | undefined): string | null {
  const m = style ? INLINE_BG.exec(style) : null;
  return m ? `${m[2]}${m[3] ?? ''}` : null;
}

/**
 * Встроенный style обложки сильнее любых правил CSS — копию для телефонов через CSS не подставить.
 * Поэтому url уходит в CSS-переменные: --hero-img (исходник) и --hero-img-sm (828 px), а картинку по
 * ширине экрана выбирает правило .cat-hero__image[style*="--hero-img"] (sections.css).
 */
export function heroInlineStyle(style: string | undefined): string | null {
  const m = style ? INLINE_BG.exec(style) : null;
  if (!m) return null;
  const src = `${m[2]}${m[3] ?? ''}`;
  const rest = style!.replace(m[0], '').trim();
  return `${rest ? `${rest.replace(/;?$/, ';')}` : ''}--hero-img:url('${src}');--hero-img-sm:url('${heroMobileUrl(src)}')`;
}

/** Предзагрузка фото обложки — те же адреса, что выберет CSS. */
export function heroPreload(src: string): { href: string; media: string }[] {
  return [
    { href: heroMobileUrl(src), media: `(max-width: ${HERO_MOBILE_MAX}px)` },
    { href: src, media: `(min-width: ${HERO_MOBILE_MAX + 1}px)` },
  ];
}
