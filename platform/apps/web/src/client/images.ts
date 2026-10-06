import { isResponsive, responsive, variantUrl } from '@mtpk/ui/images';

/**
 * Показать в <img> картинку src. Для своих растровых картинок — srcset с
 * копиями нужной ширины, как в серверной разметке места place (браузер
 * возьмёт ту же копию, что уже могла загрузиться), иначе — адрес как есть.
 */
export function setImage(img: HTMLImageElement, src: string, place: string): void {
  const hints = responsive(src, place);
  if (hints) {
    img.sizes = hints.sizes;
    img.srcset = hints.srcSet;
  } else {
    img.removeAttribute('srcset');
    img.removeAttribute('sizes');
  }
  img.src = src;
}

/**
 * Фото для просмотра на весь экран: копия шириной до 1920 px в AVIF/WebP
 * вместо оригинала. Без srcset — размер на экране считается, как у оригинала.
 */
export const fullImage = (src: string): string => (isResponsive(src) ? variantUrl(src, 1920) : src);
