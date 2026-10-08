import type {
  CarouselBlock,
  CtaBlock,
  FeaturesBlock,
  GalleryBlock,
  MarqueeBlock,
  RichTextBlock,
  SpacerBlock,
  VideoBlock,
  WidgetPhoto,
} from '@mtpk/content-model';
import type { CSSProperties, ReactNode } from 'react';
import { extra, Inline, RawElement } from '../primitives/Html.tsx';
import { SectionHead, withArrow } from '../primitives/common.tsx';
import { isResponsive, variantUrl, WIDTHS } from '../primitives/images.ts';

/**
 * Виджеты конструктора — блоки, которые добавляются из панели «Добавить блок»
 * в админке: текст, сетка фото, карусель, бегущая строка, видео, колонки,
 * призыв с кнопкой, отступ. Общая обёртка — секция .w с фоном (theme) и
 * отступами (compact); стили — apps/web/src/styles/widgets.css, поведение
 * карусели — apps/web/src/client/carousel.ts.
 */

type Section = { theme?: string; compact?: boolean; attrs?: Record<string, string> };

function WidgetSection({ name, block, style, children, data }: { name: string; block: Section; style?: CSSProperties; children: ReactNode; data?: Record<string, string> }) {
  const cls = `w w-${name} w-theme--${block.theme ?? 'light'}${block.compact ? ' w--compact' : ''}`;
  return (
    <section className={cls} style={style} {...data} {...extra(block.attrs, 'section')}>
      {children}
    </section>
  );
}

const RATIO: Record<string, string> = { '1:1': '1 / 1', '4:3': '4 / 3', '3:2': '3 / 2', '16:9': '16 / 9', '3:4': '3 / 4' };
const GAP: Record<string, string> = { none: '0px', small: '8px', medium: '16px', large: '32px' };

/** Картинка со srcset (свои /img/… — копии нужной ширины делает медиасервис). */
function Photo({ src, alt, sizes, eager }: { src: string; alt: string; sizes: string; eager?: boolean }) {
  const srcSet = isResponsive(src) ? WIDTHS.content.map((w) => `${variantUrl(src, w)} ${w}w`).join(', ') : undefined;
  return <img src={src} alt={alt} srcSet={srcSet} sizes={srcSet ? sizes : undefined} loading={eager ? undefined : 'lazy'} decoding="async" />;
}

/** Сколько места фото занимает на экране при cols колонках (контейнер — 1200px). */
const columnSizes = (cols: number) => `(max-width: 640px) ${cols > 2 ? 50 : 100}vw, (max-width: 1200px) ${Math.round(100 / cols)}vw, ${Math.round(1200 / cols)}px`;

export function RichText({ block }: { block: RichTextBlock }) {
  return (
    <WidgetSection name="text" block={block}>
      <div className={`container w-text--${block.align} w-text--${block.width}`}>
        {block.head && <SectionHead head={block.head} />}
        <div className="w-text__body" dangerouslySetInnerHTML={{ __html: block.body }} />
      </div>
    </WidgetSection>
  );
}

function Figure({ photo, sizes, zoom, className }: { photo: WidgetPhoto; sizes: string; zoom: boolean; className: string }) {
  const img = <Photo src={photo.src} alt={photo.alt} sizes={sizes} />;
  return (
    <figure className={className}>
      {photo.href ? (
        <a className="w-photo" href={photo.href}>
          {img}
        </a>
      ) : zoom ? (
        <a className="w-photo w-photo--zoom" href={photo.src} data-lightbox="">
          {img}
        </a>
      ) : (
        <div className="w-photo">{img}</div>
      )}
      {photo.caption && <Inline as="figcaption" html={photo.caption} />}
    </figure>
  );
}

export function Gallery({ block }: { block: GalleryBlock }) {
  // колонки — классом: на планшете и телефоне их уменьшают стили
  const style = { '--w-gap': GAP[block.gap], '--w-ratio': RATIO[block.ratio] ?? 'auto' } as CSSProperties;
  return (
    <WidgetSection name="gallery" block={block}>
      <div className="container">
        {block.head && <SectionHead head={block.head} />}
        <div className={`w-gallery__grid w-cols-${block.columns}${block.ratio === 'auto' ? ' is-natural' : ''}`} style={style}>
          {block.photos.map((p, i) => (
            <Figure key={i} photo={p} sizes={columnSizes(block.columns)} zoom={block.zoom} className="w-gallery__item" />
          ))}
        </div>
      </div>
    </WidgetSection>
  );
}

export function Carousel({ block }: { block: CarouselBlock }) {
  const style = { '--w-gap': GAP.medium, '--w-ratio': RATIO[block.ratio] ?? 'auto' } as CSSProperties;
  const data: Record<string, string> = { 'data-carousel': '' };
  if (block.autoplay) data['data-autoplay'] = String(block.autoplay);
  return (
    <WidgetSection name="carousel" block={block} data={data}>
      <div className="container">
        {block.head && <SectionHead head={block.head} />}
        <div className="w-carousel__viewport">
          <div className={`w-carousel__track w-per-${block.perView}${block.ratio === 'auto' ? ' is-natural' : ''}`} style={style} tabIndex={0} aria-label="Слайды — листайте стрелками">
            {block.slides.map((p, i) => (
              <Figure key={i} photo={p} sizes={columnSizes(block.perView)} zoom={false} className="w-carousel__slide" />
            ))}
          </div>
          {block.arrows && (
            <>
              <button type="button" className="w-carousel__arrow w-carousel__arrow--prev" aria-label="Предыдущие слайды">
                <svg viewBox="0 0 24 24" aria-hidden="true">
                  <path d="M15 5l-7 7 7 7" />
                </svg>
              </button>
              <button type="button" className="w-carousel__arrow w-carousel__arrow--next" aria-label="Следующие слайды">
                <svg viewBox="0 0 24 24" aria-hidden="true">
                  <path d="M9 5l7 7-7 7" />
                </svg>
              </button>
            </>
          )}
        </div>
        {block.dots && <div className="w-carousel__dots" aria-hidden="true" />}
      </div>
    </WidgetSection>
  );
}

const SEPARATOR: Record<string, string> = { dot: '•', slash: '/', star: '✦', none: '' };
const SECONDS_PER_ITEM: Record<string, number> = { slow: 6, normal: 4, fast: 2.5 };

/** Бегущая строка: группа элементов дважды подряд — сдвиг на половину даёт бесконечную ленту (только CSS). */
export function Marquee({ block }: { block: MarqueeBlock }) {
  const items = block.items.filter((it) => it.text || it.image);
  // в группе не меньше 10 элементов — иначе на широком экране видны края ленты
  const reps = Math.max(1, Math.ceil(10 / Math.max(items.length, 1)));
  const group = Array.from({ length: reps }, () => items).flat();
  const sep = SEPARATOR[block.separator];
  const duration = Math.round(group.length * SECONDS_PER_ITEM[block.speed]);
  const style = { '--w-duration': `${duration}s` } as CSSProperties;
  const cls = `w-marquee__track${block.direction === 'right' ? ' is-reverse' : ''}${block.pause ? ' is-pausable' : ''}`;
  const render = (hidden: boolean) => (
    <div className="w-marquee__group" aria-hidden={hidden || undefined}>
      {group.map((it, i) => (
        <span className="w-marquee__item" key={i}>
          {it.image ? <img src={it.image} alt={hidden ? '' : plainText(it.text ?? '')} loading="lazy" decoding="async" /> : <span dangerouslySetInnerHTML={{ __html: it.text ?? '' }} />}
          {sep && (
            <span className="w-marquee__sep" aria-hidden="true">
              {sep}
            </span>
          )}
        </span>
      ))}
    </div>
  );
  return (
    <section className={`w w-marquee w-theme--${block.theme} w-marquee--${block.size}`} {...extra(block.attrs, 'section')}>
      <div className={cls} style={style}>
        {render(false)}
        {render(true)}
      </div>
    </section>
  );
}

const plainText = (html: string) => html.replace(/<[^>]+>/g, '').replace(/&nbsp;/g, ' ');

/** Видео по ссылке: YouTube, RuTube, VK Видео — встраиваемый плеер; файл .mp4/.webm — тег <video>. */
export function videoEmbed(url: string): { kind: 'iframe'; src: string; title: string } | { kind: 'file'; src: string } | null {
  const u = url.trim();
  if (!u) return null;
  if (/\.(mp4|webm|ogv)(\?|#|$)/i.test(u)) return { kind: 'file', src: u };
  let m = u.match(/(?:youtube\.com\/(?:watch\?(?:[^#]*&)?v=|embed\/|shorts\/|live\/)|youtu\.be\/)([\w-]{11})/i);
  if (m) return { kind: 'iframe', src: `https://www.youtube-nocookie.com/embed/${m[1]}`, title: 'Видео YouTube' };
  m = u.match(/rutube\.ru\/(?:video|play\/embed|shorts)\/([a-f0-9]{32})/i);
  if (m) return { kind: 'iframe', src: `https://rutube.ru/play/embed/${m[1]}`, title: 'Видео RuTube' };
  m = u.match(/(?:vk\.com|vkvideo\.ru)\/(?:video|clip)(-?\d+)_(\d+)/i);
  if (m) return { kind: 'iframe', src: `https://vk.com/video_ext.php?oid=${m[1]}&id=${m[2]}&hd=2`, title: 'Видео VK' };
  if (/^https:\/\/(vk\.com\/video_ext\.php|rutube\.ru\/play\/embed\/|www\.youtube(-nocookie)?\.com\/embed\/)/i.test(u)) return { kind: 'iframe', src: u, title: 'Видео' };
  return null;
}

export function Video({ block }: { block: VideoBlock }) {
  const v = videoEmbed(block.url);
  return (
    <WidgetSection name="video" block={block}>
      <div className={`container w-video--${block.width}`}>
        {block.head && <SectionHead head={block.head} />}
        <figure className="w-video__frame">
          {v?.kind === 'iframe' ? (
            <iframe src={v.src} title={v.title} loading="lazy" allow="autoplay; encrypted-media; fullscreen; picture-in-picture" allowFullScreen />
          ) : v?.kind === 'file' ? (
            <video src={v.src} poster={block.poster} controls preload="metadata" playsInline />
          ) : (
            <div className="w-video__empty">Вставьте ссылку на видео YouTube, RuTube, VK Видео или файл .mp4</div>
          )}
        </figure>
        {block.caption && <Inline as="p" className="w-video__caption" html={block.caption} />}
      </div>
    </WidgetSection>
  );
}

export function Features({ block }: { block: FeaturesBlock }) {
  return (
    <WidgetSection name="features" block={block}>
      <div className="container">
        {block.head && <SectionHead head={block.head} />}
        <div className={`w-features__grid w-features--${block.look} w-cols-${block.columns}`}>
          {block.items.map((it, i) => {
            const body = (
              <>
                {block.look === 'numbered' ? (
                  <span className="w-features__num">{String(i + 1).padStart(2, '0')}</span>
                ) : it.icon ? (
                  <span className="w-features__icon">
                    <RawElement html={it.icon} />
                  </span>
                ) : it.image ? (
                  <span className="w-features__image">
                    <Photo src={it.image} alt="" sizes={columnSizes(block.columns)} />
                  </span>
                ) : null}
                <Inline as="h3" className="w-features__title" html={it.title} />
                {it.text && <Inline as="p" className="w-features__text" html={it.text} />}
              </>
            );
            return it.href ? (
              <a className="w-features__item" href={it.href} key={i}>
                {body}
              </a>
            ) : (
              <div className="w-features__item" key={i}>
                {body}
              </div>
            );
          })}
        </div>
      </div>
    </WidgetSection>
  );
}

export function Cta({ block }: { block: CtaBlock }) {
  const onDark = block.theme !== 'light' || Boolean(block.image);
  return (
    <section className={`w w-cta w-theme--${block.theme}${block.image ? ' has-image' : ''} w-cta--${block.align}`} {...extra(block.attrs, 'section')}>
      {block.image && (
        <div className="w-cta__bg" aria-hidden="true">
          <Photo src={block.image} alt="" sizes="100vw" />
        </div>
      )}
      <div className="container w-cta__inner">
        <Inline as="h2" className="w-cta__title" html={block.title} />
        {block.text && <Inline as="p" className="w-cta__text" html={block.text} />}
        <div className="w-cta__actions">
          <a className="btn btn--primary btn--lg" href={block.button.href} dangerouslySetInnerHTML={{ __html: withArrow(block.button.label, true) }} />
          {block.secondary && <a className={`btn btn--lg ${onDark ? 'btn--on-dark' : 'btn--secondary'}`} href={block.secondary.href} dangerouslySetInnerHTML={{ __html: block.secondary.label }} />}
        </div>
      </div>
    </section>
  );
}

export function Spacer({ block }: { block: SpacerBlock }) {
  return (
    <div className={`w-spacer w-spacer--${block.size} w-theme--${block.theme}`} aria-hidden="true">
      {block.line && (
        <div className="container">
          <hr className="w-spacer__line" />
        </div>
      )}
    </div>
  );
}
