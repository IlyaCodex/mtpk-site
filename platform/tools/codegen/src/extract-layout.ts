/**
 * Генерирует React-компоненты каркаса (шапка, подвал, мобильное меню) из
 * итогового HTML Astro-сборки. Запуск: npm run layout -w @mtpk/codegen
 * Результат — apps/web/src/components/layout/*.tsx.
 *
 *  - активный пункт меню: className={cls('…')} вместо статичного класса;
 *  - ссылки tel:/mailto: — содержимое сырым HTML: коллтрекинг (Mango, Битрикс24)
 *    подменяет номера в DOM, и React при гидратации не должен их «откатывать».
 */
import fs from 'node:fs';
import path from 'node:path';
import { parse, serializeOuter, type DefaultTreeAdapterMap } from 'parse5';
import { htmlToJsx, type HtmlElement } from './html-to-jsx.ts';
import { distHtml, PLATFORM } from './legacy-dist.ts';

type Element = DefaultTreeAdapterMap['element'];
const OUT = path.join(PLATFORM, 'apps', 'web', 'src', 'components', 'layout');
fs.mkdirSync(OUT, { recursive: true });

// Страница без активного пункта меню
const doc = parse(distHtml('/spasibo/'));
const html = doc.childNodes.find((n) => 'tagName' in n && n.tagName === 'html') as Element;
const body = html.childNodes.find((n) => 'tagName' in n && n.tagName === 'body') as Element;
const top = body.childNodes.filter((n): n is Element => 'tagName' in n);
const pick = (pred: (el: Element) => boolean) => {
  const el = top.find(pred);
  if (!el) throw new Error('элемент не найден');
  return serializeOuter(el);
};
const cls = (el: Element) => el.attrs.find((a) => a.name === 'class')?.value ?? '';

const NAV: Record<string, string> = {
  '/products/': 'catalog',
  '/uslugi/': 'uslugi',
  '/nalichie/': 'nalichie',
  '/proekty/': 'proekty',
  '/o-company/': 'o-kompanii',
  '/kontakty/': 'kontakty',
  '/otzyvy/': 'otzyvy',
  '/praktikum/': 'praktikum',
};

/**
 * Элементы, атрибуты которых меняют легаси-скрипты ещё до гидратации React:
 * forms.js (id/role/aria у статуса формы, aria-describedby у телефона),
 * прилипание шапки (класс is-scrolled), mobile-nav.js (aria у меню).
 * React такие атрибуты не перетирает — помечаем, чтобы не было предупреждений.
 */
const MUTATED = (el: HtmlElement) => {
  const c = el.attrs.find((a) => a.name === 'class')?.value ?? '';
  const name = el.attrs.find((a) => a.name === 'name')?.value ?? '';
  return /\b(header-shell|js-form-status|nav-toggle|nav-drawer)\b/.test(c) || (el.tagName === 'input' && name === 'phone')
    ? 'suppressHydrationWarning'
    : undefined;
};

const isContactLink = (el: HtmlElement) =>
  el.tagName === 'a' && /^(tel|mailto):/.test(el.attrs.find((a) => a.name === 'href')?.value ?? '');

function emit(name: string, header: string[], props: string, prelude: string, htmlSrc: string, withNav = false) {
  const { jsx, warnings } = htmlToJsx(htmlSrc, '    ', {
    rawInner: isContactLink,
    extraAttrs: MUTATED,
    attrHook: withNav
      ? (el, attr, value) => {
          if (el.tagName !== 'a' || attr !== 'class' || value !== 'nav__link') return undefined;
          const key = NAV[el.attrs.find((a) => a.name === 'href')?.value ?? ''];
          return key ? `className={cls('${key}')}` : undefined;
        }
      : undefined,
  });
  if (warnings.inlineHandlers.length) console.warn(`⚠ ${name}: inline-обработчики`, warnings.inlineHandlers);
  const src = `${header.map((l) => `// ${l}`).join('\n')}
export function ${name}(${props}) {
${prelude}  return (
${jsx}
  );
}
`;
  fs.writeFileSync(path.join(OUT, `${name}.tsx`), src);
  console.log(`${name}.tsx — ${src.length} байт`);
}

const note = [
  'Разметка сгенерирована из итогового HTML Astro-сборки (tools/codegen, extract-layout)',
  'и совпадает с ней до пробела. Стили — legacy CSS (public/css/site.css и др.).',
  'Ссылки tel:/mailto: — содержимое сырым HTML: его подменяет коллтрекинг.',
];

emit(
  'Header',
  ['Шапка сайта: контакты, логотип, мегаменю, поиск, экспресс-звонок (из Header.astro).', ...note],
  '{ activeNav }: { activeNav?: string }',
  "  const cls = (name: string) => 'nav__link' + (activeNav === name ? ' is-active' : '');\n",
  pick((el) => cls(el) === 'header-shell'),
  true,
);
emit('Footer', ['Подвал сайта (из Footer.astro).', ...note], '', '', pick((el) => el.tagName === 'footer'));
emit('Drawer', ['Мобильное меню (из Drawer.astro); открытие/закрытие — public/js/mobile-nav.js.', ...note], '', '', pick((el) => el.tagName === 'aside'));
