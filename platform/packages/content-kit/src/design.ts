import { darkColor } from './dark.ts';

/**
 * Оформление кнопок сайта из админки («Шапка, меню, контакты» → «Оформление:
 * кнопки», siteSettings.design): скругление углов и цвета. Задано — на <html>
 * атрибуты data-btn-* и переменные --design-*: залитые кнопки и скругление берут
 * переменные в apps/web/public/css/base-layout.css («Кнопки и чекбоксы»),
 * контурные — правила apps/web/src/styles/components.css. Не задано — кнопки
 * как в дизайне (зелёные, скругление 10 px).
 */
export type ButtonDesign = { buttonRadius?: number; buttonColor?: string; buttonTextColor?: string; buttonOutlineColor?: string };

/** Цвета кнопок в дизайне сайта (tokens.css): основная — фирменный зелёный, текст белый. */
const DEFAULT_COLOR = '#4fab3a';
const DEFAULT_TEXT = '#ffffff';

const rgb = (hex: string) => [1, 3, 5].map((i) => Number.parseInt(hex.slice(i, i + 2), 16));
const hexOf = (c: number[]) => `#${c.map((v) => Math.round(Math.min(255, Math.max(0, v))).toString(16).padStart(2, '0')).join('')}`;
/** Темнее (смешение с чёрным) — цвет при наведении. */
const darker = (hex: string, k = 0.12) => hexOf(rgb(hex).map((v) => v * (1 - k)));
const alpha = (hex: string, a: number) => `rgba(${rgb(hex).join(', ')}, ${a})`;

/** Атрибуты и CSS-переменные для <html>; ничего не задано — пусто. */
export function buttonDesignHtml(d: ButtonDesign | undefined): { attrs: Record<string, string>; vars: Record<string, string> } {
  const attrs: Record<string, string> = {};
  const vars: Record<string, string> = {};
  if (!d) return { attrs, vars };
  if (typeof d.buttonRadius === 'number') {
    attrs['data-btn-radius'] = '';
    vars['--design-radius'] = d.buttonRadius >= 30 ? '999px' : `${d.buttonRadius}px`;
  }
  if (d.buttonColor || d.buttonTextColor) {
    const color = d.buttonColor ?? DEFAULT_COLOR;
    attrs['data-btn-color'] = '';
    vars['--design-primary'] = color;
    vars['--design-primary-hover'] = darker(color);
    vars['--design-primary-text'] = d.buttonTextColor ?? DEFAULT_TEXT;
    vars['--design-primary-glow'] = alpha(color, 0.45);
  }
  if (d.buttonOutlineColor) {
    const c = d.buttonOutlineColor;
    const [r, g, b] = rgb(c);
    // на тёмном фоне тот же оттенок, но светлее (как у текста тёмной темы)
    const dark = darkColor('tx', { r, g, b, a: 1 });
    attrs['data-btn-outline'] = '';
    vars['--design-outline'] = c;
    vars['--design-outline-soft'] = alpha(c, 0.08);
    vars['--design-outline-dark'] = dark ? hexOf([dark.r, dark.g, dark.b]) : c;
  }
  return { attrs, vars };
}

/** То же одной строкой атрибутов для <html …> (предпросмотр в админке). */
export function buttonDesignAttrs(d: ButtonDesign | undefined): string {
  const { attrs, vars } = buttonDesignHtml(d);
  const style = Object.entries(vars)
    .map(([k, v]) => `${k}:${v}`)
    .join(';');
  return [...Object.keys(attrs).map((k) => ` ${k}=""`), style ? ` style="${style}"` : ''].join('');
}
