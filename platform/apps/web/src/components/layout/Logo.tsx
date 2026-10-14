import type { ImgHTMLAttributes } from 'react';

/**
 * Логотип из /brand: WebP-копия (logo.png.webp — её делает сборка сайта для
 * каждого PNG/JPG в public/brand, scripts/build-client.ts) и PNG для браузеров
 * без WebP. Обёртка <picture> вёрстку не меняет (класс brand-pic — display: contents):
 * стили — у <img>.
 */
export function Logo({ src, alt, ...img }: ImgHTMLAttributes<HTMLImageElement> & { src: string; alt: string }) {
  return (
    <picture className="brand-pic">
      <source type="image/webp" srcSet={`${src}.webp`} />
      <img src={src} alt={alt} {...img} />
    </picture>
  );
}

/** Предзагрузка логотипа шапки — того же файла, что выберет <picture> (браузер без WebP её пропустит). */
export const logoPreload = (src: string) => ({ href: `${src}.webp`, type: 'image/webp' });
