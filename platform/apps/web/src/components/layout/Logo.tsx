import type { ImgHTMLAttributes } from 'react';
import { versioned } from '@/lib/versions';

/**
 * Логотип из /brand: WebP-копия (logo.png.webp — её делает сборка сайта для
 * каждого PNG/JPG в public/brand, scripts/build-client.ts) и PNG для браузеров
 * без WebP. Обёртка <picture> вёрстку не меняет (класс brand-pic — display: contents):
 * стили — у <img>. Адреса — с версией по содержимому: новый логотип браузер возьмёт сам.
 */
export function Logo({ src, alt, ...img }: ImgHTMLAttributes<HTMLImageElement> & { src: string; alt: string }) {
  return (
    <picture className="brand-pic">
      <source type="image/webp" srcSet={versioned(`${src}.webp`)} />
      <img src={versioned(src)} alt={alt} {...img} />
    </picture>
  );
}

/** Предзагрузка логотипа шапки — того же файла, что выберет <picture> (браузер без WebP её пропустит). */
export const logoPreload = (src: string) => ({ href: versioned(`${src}.webp`), type: 'image/webp' });

/**
 * Логотип шапки и мобильного меню: копия 400×104 px исходника logo-header-clean.png (1898 px) —
 * на экране он ~184×48, этого хватает и экранам ×3 (scripts/brand-icons.ts).
 */
export const HEADER_LOGO = '/brand/logo-header.png';
