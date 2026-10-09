import { z } from 'zod';
import { attrs, code, crumb, element, href, image, inline, rich, svgIcon, text } from './fields.ts';

/**
 * Блоки страниц. Страница сайта — упорядоченный список блоков; каждый блок
 * рендерится своим React-компонентом из @mtpk/ui. Тип блока определяет набор
 * полей, которые редактируются в админке.
 *
 * html — универсальный блок «HTML как есть»: им остаются секции, для которых
 * ещё нет своего типа. Контент не теряется, и такой блок тоже редактируется.
 */

/** Кнопка/ссылка: подпись + стрелка «→» + классы оформления. */
export const action = z.object({
  href: href(),
  label: inline('Подпись'),
  className: text('Классы оформления').default('btn btn--primary'),
  arrow: z.boolean().describe('Стрелка «→» после подписи').default(true),
  attrs: attrs(),
});
export type Action = z.infer<typeof action>;

/** Заголовок секции: надзаголовок, заголовок (акцент — <em>), подзаголовок. */
export const sectionHead = z.object({
  eyebrow: inline('Надзаголовок').optional(),
  title: inline('Заголовок (акцент — курсивом)'),
  lead: inline('Подзаголовок').optional(),
});
export type SectionHead = z.infer<typeof sectionHead>;

// ── Универсальные ─────────────────────────────────────────────────────────

export const htmlBlock = z
  .object({
    type: z.literal('html'),
    html: element('HTML секции'),
    /** свой CSS секции: селекторы — внутри неё, «&» — она сама (content-kit/section) */
    css: code('CSS секции', 'css').optional(),
    /** свой скрипт секции (TypeScript/JavaScript): section — её элемент */
    script: code('Скрипт секции (TypeScript или JavaScript)', 'ts').optional(),
    /** метка секции для её CSS и скрипта: атрибут data-s у корня */
    sid: z.string().regex(/^[a-z0-9]{4,16}$/).optional().describe('Метка секции'),
  })
  .describe('HTML как есть');

export const textBlock = z.object({ type: z.literal('text'), text: text('Текст') }).describe('Текст');

/**
 * Стили секций страницы (CSS). На сайте — подключаемый файл (кешируется
 * браузером), а не <style> в исходном коде страницы.
 */
export const styleBlock = z.object({ type: z.literal('style'), css: code('CSS', 'css') }).describe('Стили (CSS)');

/**
 * Скрипт страницы (анимации, поведение секций) на TypeScript или JavaScript.
 * Контент-сервис при сохранении собирает его в JS; на сайте — подключаемый
 * файл (/js/page/<хеш>.js, выполняется после разбора страницы), а не
 * <script> в коде страницы.
 */
export const scriptBlock = z.object({ type: z.literal('script'), code: code('Код (TypeScript или JavaScript)', 'ts') }).describe('Скрипт (JS/TS)');

export type ContainerBlockData = {
  type: 'container';
  tag: string;
  attrs?: Record<string, string>;
  children: Block[];
};
export const containerBlock: z.ZodType<ContainerBlockData> = z.lazy(() =>
  z
    .object({
      type: z.literal('container'),
      tag: text('Тег'),
      attrs: attrs(),
      children: z.array(block),
    })
    .describe('Контейнер с вложенными блоками'),
);

// ── Общие блоки сайта (бывшие маркеры <!--C:…-->) ──────────────────────────

export const leadgenBlock = z.object({ type: z.literal('leadgen') }).describe('Форма «Подбор и расчёт»');
export const bestOfferBlock = z.object({ type: z.literal('bestOffer') }).describe('Лучшее коммерческое предложение (короткая форма)');
export const catalogCtaBlock = z.object({ type: z.literal('catalogCta') }).describe('Призыв: запрос КП по каталогу');
export const partnerBlock = z.object({ type: z.literal('partner') }).describe('Партнёры и лизинг');
export const advBlock = z
  .object({
    type: z.literal('adv'),
    warranty: text('Срок гарантии в заголовке').optional().describe('По умолчанию «18 месяцев»'),
  })
  .describe('Преимущества собственного производства');
export const whyUsBlock = z
  .object({
    type: z.literal('whyUs'),
    months: z.number().int().describe('Гарантия, месяцев').default(18),
  })
  .describe('Почему мы');

// ── Товар ─────────────────────────────────────────────────────────────────

/** Фотография товара. */
export const productPhoto = z.object({
  src: z.string().describe('Фото').meta({ editor: 'media' }),
  alt: z.string().default('').describe('Что на фото (alt)'),
  /** уменьшенная копия для ленты миниатюр — у старых фото; новым не нужна */
  thumb: z.string().optional().describe('Отдельная миниатюра').meta({ editor: 'media' }),
});
export type ProductPhoto = z.infer<typeof productPhoto>;

/**
 * Галерея товара: первое фото — главное, при двух и больше под ним лента
 * миниатюр с перелистыванием. Разметка (кнопки, номера кадров, лайтбокс)
 * строится из списка автоматически.
 */
export const productGallery = z
  .object({
    photos: z.array(productPhoto).min(1).describe('Фотографии (первая — главная)').meta({ editor: 'gallery' }),
    banner: inline('Плашка на фото').optional(),
    mainAlt: text('Описание главного фото, если отличается').optional(),
    /** у фото без просмотра на весь экран — своя подпись кнопки для скринридеров */
    mainLabel: text('Подпись главного фото для скринридеров').optional(),
    caption: inline('Подпись под фото').optional(),
    thumbs: z
      .enum(['grid', 'row', 'scroll'])
      .default('grid')
      .describe('Миниатюры под фото')
      .meta({ enumLabels: { grid: 'Сеткой', row: 'В один ряд во всю ширину', scroll: 'Лентой с прокруткой' } }),
    zoom: z.boolean().default(true).describe('Открывать фото на весь экран'),
  })
  .describe('Фото');
export type ProductGallery = z.infer<typeof productGallery>;

export const productHeroBlock = z
  .object({
    type: z.literal('productHero'),
    breadcrumbs: z.array(crumb).describe('Хлебные крошки'),
    media: productGallery,
    origin: inline('Происхождение (над заголовком)').optional(),
    title: inline('Название (H1)'),
    status: inline('Статус / срок').optional(),
    price: inline('Цена').optional(),
    keyspecs: z.array(z.object({ num: inline('Значение'), label: inline('Параметр') })).describe('Ключевые характеристики'),
    actions: z.array(action).describe('Кнопки'),
    facts: z.array(z.object({ icon: svgIcon(), text: inline('Текст') })).describe('Факты (доставка, гарантия…)'),
  })
  .describe('Карточка товара: фото, название, характеристики, кнопки');

/** Содержимое панели характеристик: таблица «параметр — значение» или HTML. */
export const specContent = z.discriminatedUnion('kind', [
  z.object({
    kind: z.literal('table'),
    rows: z.array(z.object({ label: inline('Параметр'), value: inline('Значение') })).describe('Строки таблицы'),
    /** таблица обёрнута в <div style="…"> (горизонтальная прокрутка на мобильных) */
    wrapStyle: text('Стиль обёртки таблицы').optional(),
  }),
  z.object({ kind: z.literal('html'), html: rich('Текст') }),
]);
export type SpecContent = z.infer<typeof specContent>;

export const productSpecBlock = z
  .object({
    type: z.literal('productSpec'),
    ariaLabel: text('Название секции для скринридеров').default('Характеристики и описание'),
    navAriaLabel: text('Название оглавления для скринридеров').default('Разделы технической документации'),
    navEyebrow: inline('Подпись оглавления').default('Содержание'),
    nav: z.array(z.object({ href: href(), label: inline('Пункт') })).describe('Оглавление'),
    panels: z
      .array(
        z.object({
          id: text('Якорь'),
          title: inline('Заголовок раздела'),
          content: z.array(specContent).describe('Содержимое'),
        }),
      )
      .describe('Разделы'),
  })
  .describe('Характеристики и описание (разделы с оглавлением)');

export const lightboxBlock = z
  .object({
    type: z.literal('lightbox'),
    label: text('Название галереи (для скринридеров)').default('Галерея фото'),
    total: z.number().int().describe('Число фото до загрузки страницы').default(1),
  })
  .describe('Просмотр фото на весь экран');

// ── Каталог ───────────────────────────────────────────────────────────────

export const productCard = z.object({
  href: href('Ссылка на товар'),
  badge: inline('Плашка на обложке').optional(),
  image: image('Обложка'),
  title: inline('Название'),
  /** «(на гидравлике)» — после ссылки-названия, обычным текстом */
  titleNote: text('Примечание после названия').optional(),
  origin: inline('Происхождение').optional(),
  caption: inline('Подпись').optional(),
  specs: z.array(z.object({ label: inline('Параметр'), value: inline('Значение') })).describe('Характеристики'),
  actions: z.array(action).describe('Кнопки'),
  /** data-* для фильтра каталога (data-power, data-mass…) */
  attrs: attrs(),
});
export type ProductCard = z.infer<typeof productCard>;

export const catalogFilter = z.object({
  ariaLabel: text('Название фильтра для скринридеров').default('Фильтр каталога'),
  count: z.boolean().optional().describe('Показывать число моделей'),
  dropdowns: z
    .array(
      z.object({
        key: text('Характеристика (data-атрибут карточек)'),
        label: inline('Подпись'),
        panelLabel: text('Название списка'),
        anyText: inline('Пункт «любой»'),
        anyLabel: text('Значение «любой» на кнопке'),
        options: z
          .array(
            z.object({
              value: text('Значение (точное, «up-N», «N-M», «M+»)'),
              label: text('Подпись на кнопке'),
              text: inline('Пункт списка'),
              meta: inline('Уточнение справа').optional(),
            }),
          )
          .describe('Варианты'),
      }),
    )
    .describe('Выпадающие списки'),
});
export type CatalogFilter = z.infer<typeof catalogFilter>;

export const catalogListBlock = z
  .object({
    type: z.literal('catalogList'),
    /** карточки — товары этой страницы из каталога (собираются при выводе); иначе — список ниже */
    auto: z.boolean().optional().describe('Товары из каталога (карточки собираются автоматически)'),
    head: sectionHead.optional(),
    /** фильтр по характеристикам; если не задан — строится автоматически по data-атрибутам карточек */
    filter: catalogFilter.optional(),
    cards: z.array(productCard).describe('Карточки товаров (когда не из каталога)'),
    attrs: attrs(),
    gridAttrs: attrs(),
  })
  .describe('Каталог: сетка карточек товаров');

/** Карточка, собранная из каталога: категория, подкатегория или товар. */
export const catalogCardItem = z.object({
  href: href(),
  title: inline('Название'),
  image: z.string().describe('Обложка').meta({ editor: 'media' }).optional(),
  alt: text('Описание обложки (alt)').default(''),
  imageAttrs: attrs(),
  caption: inline('Краткое описание').optional(),
  label: inline('Надпись над названием').optional(),
  linkText: inline('Надпись ссылки (по умолчанию «Подробнее»)').optional(),
});
export type CatalogCardItem = z.infer<typeof catalogCardItem>;

/**
 * Карточки из каталога: категории (сетка «Оборудование» на главной),
 * подкатегории категории («Модельный ряд»), товары страницы. Карточки
 * собирает контент-сервис при выводе — добавленный товар сам появляется
 * в своей подкатегории.
 */
export const catalogCardsBlock = z
  .object({
    type: z.literal('catalogCards'),
    source: z
      .enum(['categories', 'spares', 'subcategories', 'products'])
      .describe('Что показываем')
      .meta({
        enumLabels: {
          categories: 'Категории (отмеченные «на главной»)',
          spares: 'Категории запчастей',
          subcategories: 'Подкатегории этой категории',
          products: 'Товары этой страницы',
        },
      }),
    design: z
      .enum(['home', 'teaser', 'lvm', 'lgm'])
      .describe('Вид карточек')
      .meta({ enumLabels: { home: 'Как на главной: фото, название, кнопка-стрелка', teaser: 'Фото, название, описание', lvm: 'Линейка ЛВМ', lgm: 'Линейка ЛГМ' } }),
    head: sectionHead.optional(),
    more: z
      .object({ label: inline('Подпись'), href: href() })
      .optional()
      .describe('Ссылка справа от заголовка («Все категории»)'),
    attrs: attrs(),
    after: element('HTML под карточками').optional(),
    /** карточки после собранных из каталога: ссылки на другие разделы (запчасти, соседняя категория) */
    extra: z.array(catalogCardItem).optional().describe('Дополнительные карточки (ссылки на другие разделы)'),
    /** заполняет контент-сервис при выводе страницы */
    items: z.array(catalogCardItem).optional().meta({ hidden: true }),
  })
  .describe('Карточки каталога (из данных)');

export const categoryHeroBlock = z
  .object({
    type: z.literal('categoryHero'),
    /** фон: role, aria-label и style с background-image */
    imageAttrs: attrs(),
    breadcrumbs: z.array(crumb).describe('Хлебные крошки'),
    eyebrow: inline('Надзаголовок').optional(),
    eyebrowTag: z.enum(['div', 'span']).default('div').describe('Тег надзаголовка (оформление)'),
    title: inline('Заголовок (H1)'),
    subtitle: inline('Подзаголовок'),
    actions: z.array(action).describe('Кнопки').optional(),
    quickCard: z
      .object({
        id: text('Якорь карточки').optional(),
        badge: inline('Плашка'),
        title: inline('Заголовок'),
        subtitle: inline('Подзаголовок'),
        formName: text('Название формы (источник заявки)').default('Экспресс-заявка'),
        phoneLabel: text('Подпись поля телефона (для скринридеров)').default('Контактный телефон'),
        buttonLabel: inline('Кнопка').default('Жду звонка'),
        consent: inline('Текст согласия'),
      })
      .describe('Карточка «Экспресс-заявка»')
      .optional(),
  })
  .describe('Обложка раздела/категории');

export const faqBlock = z
  .object({
    type: z.literal('faq'),
    head: sectionHead.optional(),
    items: z.array(z.object({ question: inline('Вопрос'), answer: inline('Ответ') })).describe('Вопросы'),
    attrs: attrs(),
  })
  .describe('Частые вопросы');

export const statsBlock = z
  .object({
    type: z.literal('stats'),
    items: z
      .array(
        z.object({
          icon: svgIcon().optional(),
          label: inline('Подпись сверху'),
          num: inline('Число'),
          text: inline('Пояснение'),
        }),
      )
      .describe('Показатели'),
    attrs: attrs(),
  })
  .describe('Ключевые показатели');

// ── Виджеты конструктора (панель «Добавить блок» в админке) ───────────────

/** Фон секции виджета. */
const widgetTheme = z
  .enum(['light', 'muted', 'dark'])
  .default('light')
  .describe('Фон секции')
  .meta({ enumLabels: { light: 'Белый', muted: 'Светло-серый', dark: 'Тёмный' } });
const widgetCompact = z.boolean().default(false).describe('Меньше отступов сверху и снизу');
const widgetRatio = z
  .enum(['1:1', '4:3', '3:2', '16:9', '3:4', 'auto'])
  .default('4:3')
  .describe('Пропорции фото')
  .meta({ enumLabels: { '1:1': 'Квадрат', '4:3': '4 : 3', '3:2': '3 : 2', '16:9': '16 : 9 — широкие', '3:4': '3 : 4 — вертикальные', auto: 'Как у самих фото' } });

/** Фото сетки и карусели: подпись и ссылка — по желанию. */
export const widgetPhoto = z.object({
  src: z.string().describe('Фото').meta({ editor: 'media' }),
  alt: z.string().default('').describe('Что на фото (alt)'),
  caption: inline('Подпись под фото').optional(),
  href: href('Ссылка при щелчке').optional(),
});
export type WidgetPhoto = z.infer<typeof widgetPhoto>;

export const richTextBlock = z
  .object({
    type: z.literal('richText'),
    head: sectionHead.optional(),
    body: rich('Текст'),
    align: z.enum(['left', 'center']).default('left').describe('Выравнивание').meta({ enumLabels: { left: 'По левому краю', center: 'По центру' } }),
    width: z
      .enum(['narrow', 'wide'])
      .default('narrow')
      .describe('Ширина текста')
      .meta({ enumLabels: { narrow: 'Колонка для чтения', wide: 'Во всю ширину' } }),
    theme: widgetTheme,
    compact: widgetCompact,
    attrs: attrs(),
  })
  .describe('Текст');

export const galleryBlock = z
  .object({
    type: z.literal('gallery'),
    head: sectionHead.optional(),
    photos: z.array(widgetPhoto).describe('Фотографии').meta({ editor: 'gallery' }),
    columns: z.number().int().min(2).max(6).default(3).describe('Колонок на компьютере (на телефоне — две или одна)'),
    ratio: widgetRatio,
    gap: z
      .enum(['none', 'small', 'medium', 'large'])
      .default('medium')
      .describe('Промежутки между фото')
      .meta({ enumLabels: { none: 'Без промежутков', small: 'Узкие', medium: 'Средние', large: 'Широкие' } }),
    zoom: z.boolean().default(true).describe('Открывать фото на весь экран по щелчку'),
    theme: widgetTheme,
    compact: widgetCompact,
    attrs: attrs(),
  })
  .describe('Сетка фото');

export const carouselBlock = z
  .object({
    type: z.literal('carousel'),
    head: sectionHead.optional(),
    slides: z.array(widgetPhoto).describe('Слайды').meta({ editor: 'gallery' }),
    perView: z.number().int().min(1).max(4).default(3).describe('Слайдов на экране (компьютер; на телефоне — один)'),
    ratio: widgetRatio,
    autoplay: z.number().int().min(0).max(30).default(0).describe('Автопрокрутка через, секунд (0 — выключена)'),
    arrows: z.boolean().default(true).describe('Стрелки'),
    dots: z.boolean().default(true).describe('Точки под слайдами'),
    theme: widgetTheme,
    compact: widgetCompact,
    attrs: attrs(),
  })
  .describe('Карусель');

export const marqueeBlock = z
  .object({
    type: z.literal('marquee'),
    items: z
      .array(
        z.object({
          text: inline('Текст').optional(),
          image: z.string().optional().describe('Или картинка (логотип)').meta({ editor: 'media' }),
        }),
      )
      .describe('Что бежит по строке'),
    separator: z
      .enum(['dot', 'slash', 'star', 'none'])
      .default('dot')
      .describe('Разделитель')
      .meta({ enumLabels: { dot: 'Точка •', slash: 'Косая черта /', star: 'Звёздочка ✦', none: 'Без разделителя' } }),
    speed: z.enum(['slow', 'normal', 'fast']).default('normal').describe('Скорость').meta({ enumLabels: { slow: 'Медленно', normal: 'Обычно', fast: 'Быстро' } }),
    direction: z.enum(['left', 'right']).default('left').describe('Направление').meta({ enumLabels: { left: 'Влево', right: 'Вправо' } }),
    size: z.enum(['small', 'large']).default('large').describe('Размер').meta({ enumLabels: { small: 'Мелкий текст', large: 'Крупный текст' } }),
    pause: z.boolean().default(true).describe('Останавливать при наведении мыши'),
    theme: z
      .enum(['light', 'muted', 'dark', 'brand'])
      .default('dark')
      .describe('Фон')
      .meta({ enumLabels: { light: 'Белый', muted: 'Светло-серый', dark: 'Тёмный', brand: 'Фирменный бирюзовый' } }),
    attrs: attrs(),
  })
  .describe('Бегущая строка');

export const videoBlock = z
  .object({
    type: z.literal('video'),
    head: sectionHead.optional(),
    url: href('Ссылка на видео: YouTube, RuTube, VK Видео или файл .mp4'),
    poster: z.string().optional().describe('Обложка до запуска (для файла .mp4)').meta({ editor: 'media' }),
    caption: inline('Подпись под видео').optional(),
    width: z.enum(['narrow', 'wide']).default('wide').describe('Ширина').meta({ enumLabels: { narrow: 'Узкая колонка', wide: 'Во всю ширину контейнера' } }),
    theme: widgetTheme,
    compact: widgetCompact,
    attrs: attrs(),
  })
  .describe('Видео');

export const featuresBlock = z
  .object({
    type: z.literal('features'),
    head: sectionHead.optional(),
    items: z
      .array(
        z.object({
          icon: svgIcon().optional(),
          image: z.string().optional().describe('Или картинка').meta({ editor: 'media' }),
          title: inline('Заголовок'),
          text: inline('Текст').optional(),
          href: href('Ссылка').optional(),
        }),
      )
      .describe('Колонки'),
    columns: z.number().int().min(2).max(4).default(3).describe('Колонок на компьютере'),
    look: z
      .enum(['cards', 'plain', 'numbered'])
      .default('cards')
      .describe('Вид')
      .meta({ enumLabels: { cards: 'Карточки с рамкой', plain: 'Без рамок', numbered: 'С номерами 01, 02…' } }),
    theme: widgetTheme,
    compact: widgetCompact,
    attrs: attrs(),
  })
  .describe('Колонки с преимуществами');

export const ctaBlock = z
  .object({
    type: z.literal('cta'),
    title: inline('Заголовок (акцент — курсивом)'),
    text: inline('Текст').optional(),
    button: z.object({ label: inline('Подпись'), href: href() }).describe('Кнопка'),
    secondary: z.object({ label: inline('Подпись'), href: href() }).optional().describe('Вторая кнопка'),
    image: z.string().optional().describe('Фоновая картинка').meta({ editor: 'media' }),
    align: z.enum(['left', 'center']).default('left').describe('Выравнивание').meta({ enumLabels: { left: 'По левому краю', center: 'По центру' } }),
    theme: z
      .enum(['dark', 'brand', 'light'])
      .default('dark')
      .describe('Фон')
      .meta({ enumLabels: { dark: 'Тёмный', brand: 'Фирменный бирюзовый', light: 'Светлый' } }),
    attrs: attrs(),
  })
  .describe('Призыв с кнопкой');

export const spacerBlock = z
  .object({
    type: z.literal('spacer'),
    size: z
      .enum(['small', 'medium', 'large', 'xlarge'])
      .default('medium')
      .describe('Высота')
      .meta({ enumLabels: { small: '32 px', medium: '64 px', large: '96 px', xlarge: '128 px' } }),
    line: z.boolean().default(false).describe('Тонкая линия посередине'),
    theme: widgetTheme,
  })
  .describe('Отступ');

// ── Объединение ───────────────────────────────────────────────────────────

export const block: z.ZodType<Block> = z.lazy(() =>
  z.union([
    htmlBlock,
    textBlock,
    styleBlock,
    scriptBlock,
    containerBlock,
    leadgenBlock,
    bestOfferBlock,
    catalogCtaBlock,
    partnerBlock,
    advBlock,
    whyUsBlock,
    productHeroBlock,
    productSpecBlock,
    lightboxBlock,
    catalogListBlock,
    catalogCardsBlock,
    categoryHeroBlock,
    faqBlock,
    statsBlock,
    richTextBlock,
    galleryBlock,
    carouselBlock,
    marqueeBlock,
    videoBlock,
    featuresBlock,
    ctaBlock,
    spacerBlock,
  ]),
);

export type HtmlBlock = z.infer<typeof htmlBlock>;
export type TextBlock = z.infer<typeof textBlock>;
export type StyleBlock = z.infer<typeof styleBlock>;
export type ScriptBlock = z.infer<typeof scriptBlock>;
export type LeadgenBlock = z.infer<typeof leadgenBlock>;
export type BestOfferBlock = z.infer<typeof bestOfferBlock>;
export type CatalogCtaBlock = z.infer<typeof catalogCtaBlock>;
export type PartnerBlock = z.infer<typeof partnerBlock>;
export type AdvBlock = z.infer<typeof advBlock>;
export type WhyUsBlock = z.infer<typeof whyUsBlock>;
export type ProductHeroBlock = z.infer<typeof productHeroBlock>;
export type ProductSpecBlock = z.infer<typeof productSpecBlock>;
export type LightboxBlock = z.infer<typeof lightboxBlock>;
export type CatalogListBlock = z.infer<typeof catalogListBlock>;
export type CatalogCardsBlock = z.infer<typeof catalogCardsBlock>;
export type CategoryHeroBlock = z.infer<typeof categoryHeroBlock>;
export type FaqBlock = z.infer<typeof faqBlock>;
export type StatsBlock = z.infer<typeof statsBlock>;
export type RichTextBlock = z.infer<typeof richTextBlock>;
export type GalleryBlock = z.infer<typeof galleryBlock>;
export type CarouselBlock = z.infer<typeof carouselBlock>;
export type MarqueeBlock = z.infer<typeof marqueeBlock>;
export type VideoBlock = z.infer<typeof videoBlock>;
export type FeaturesBlock = z.infer<typeof featuresBlock>;
export type CtaBlock = z.infer<typeof ctaBlock>;
export type SpacerBlock = z.infer<typeof spacerBlock>;

export type Block =
  | HtmlBlock
  | TextBlock
  | StyleBlock
  | ScriptBlock
  | ContainerBlockData
  | LeadgenBlock
  | BestOfferBlock
  | CatalogCtaBlock
  | PartnerBlock
  | AdvBlock
  | WhyUsBlock
  | ProductHeroBlock
  | ProductSpecBlock
  | LightboxBlock
  | CatalogListBlock
  | CatalogCardsBlock
  | CategoryHeroBlock
  | FaqBlock
  | StatsBlock
  | RichTextBlock
  | GalleryBlock
  | CarouselBlock
  | MarqueeBlock
  | VideoBlock
  | FeaturesBlock
  | CtaBlock
  | SpacerBlock;

export type BlockType = Block['type'];

/** Схемы по типу — для админки (форма блока) и валидации API. */
export const BLOCK_SCHEMAS: Record<BlockType, z.ZodType> = {
  html: htmlBlock,
  text: textBlock,
  style: styleBlock,
  script: scriptBlock,
  container: containerBlock,
  leadgen: leadgenBlock,
  bestOffer: bestOfferBlock,
  catalogCta: catalogCtaBlock,
  partner: partnerBlock,
  adv: advBlock,
  whyUs: whyUsBlock,
  productHero: productHeroBlock,
  productSpec: productSpecBlock,
  lightbox: lightboxBlock,
  catalogList: catalogListBlock,
  catalogCards: catalogCardsBlock,
  categoryHero: categoryHeroBlock,
  faq: faqBlock,
  stats: statsBlock,
  richText: richTextBlock,
  gallery: galleryBlock,
  carousel: carouselBlock,
  marquee: marqueeBlock,
  video: videoBlock,
  features: featuresBlock,
  cta: ctaBlock,
  spacer: spacerBlock,
};

/** Подписи типов блоков для админки. */
export const BLOCK_LABELS: Record<BlockType, string> = {
  html: 'HTML как есть',
  text: 'Текст',
  style: 'Стили (CSS)',
  script: 'Скрипт (JS/TS)',
  container: 'Контейнер',
  leadgen: 'Форма «Подбор и расчёт»',
  bestOffer: 'Лучшее предложение',
  catalogCta: 'Запрос КП по каталогу',
  partner: 'Партнёры и лизинг',
  adv: 'Преимущества производства',
  whyUs: 'Почему мы',
  productHero: 'Карточка товара',
  productSpec: 'Характеристики и описание',
  lightbox: 'Просмотр фото',
  catalogList: 'Товары (карточки)',
  catalogCards: 'Карточки каталога',
  categoryHero: 'Обложка раздела',
  faq: 'Частые вопросы',
  stats: 'Показатели',
  richText: 'Текст',
  gallery: 'Сетка фото',
  carousel: 'Карусель',
  marquee: 'Бегущая строка',
  video: 'Видео',
  features: 'Колонки с преимуществами',
  cta: 'Призыв с кнопкой',
  spacer: 'Отступ',
};

/**
 * Есть ли на странице блок заявки (якорь #leadgen): тогда второй блок с формой
 * («Лучшее предложение») получает свой якорь, чтобы не было двух id=leadgen.
 */
export function pageHasLeadgen(blocks: Block[]): boolean {
  return blocks.some((b) => {
    switch (b.type) {
      case 'leadgen':
        return true;
      case 'html':
        return b.html.includes('id="leadgen"');
      case 'container':
        return b.attrs?.id === 'leadgen' || pageHasLeadgen(b.children);
      case 'categoryHero':
        return b.quickCard?.id === 'leadgen';
      default:
        return 'attrs' in b && (b as { attrs?: Record<string, string> }).attrs?.id === 'leadgen';
    }
  });
}

/** Все блоки страницы, включая вложенные в контейнеры. */
export function* walkBlocks(blocks: Block[]): Generator<Block> {
  for (const b of blocks) {
    yield b;
    if (b.type === 'container') yield* walkBlocks(b.children);
  }
}
