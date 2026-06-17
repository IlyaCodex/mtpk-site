#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
ТЗ-2 п.6 — перестройка раздела индукционных нагревателей в 5 подкатегорий
(как плавильные печи). Идемпотентный.

Решения Евгения 2026-06-07:
  • 9 транзисторных нагревателей (УИ-…Н, data-cat tranzistornye-gibkij-induktor)
    — УДАЛИТЬ страницы целиком.
  • Полная перестройка как у плавильных печей: товары ПЕРЕНОСЯТСЯ под папки-
    подкатегории, URL меняется на /induktsionnye-nagrevateli/<кат>/<товар>/.
  • Слаги 5 категорий: srednechastotnye · vysokochastotnye · ruchnye ·
    sverhvysokochastotnye · ustanovki-zakalki-valov.

Запускать из каталога astro/:  python3 ../scripts/oneoff/tz2-6-nagrevateli-restructure.py
"""
import os, re, json, subprocess, sys

ROOT = 'src/raw-pages/products/induktsionnye-nagrevateli'
HUB = f'{ROOT}/body.html'
HERO = "/img/hero-heaters.png?v=2"

if not os.path.exists(HUB):
    sys.exit(f"Не найден {HUB} — запускай из каталога astro/")

# data-cat (в текущем хабе) -> целевой слаг подкатегории
DATACAT_TO_CAT = {
    'srednechastotnye':              'srednechastotnye',
    'vysokochastotnye-30-80':        'vysokochastotnye',
    'vysokochastotnye-30-100':       'vysokochastotnye',
    'ruchnye':                       'ruchnye',
    'sverhvysokochastotnye-100-250': 'sverhvysokochastotnye',
    'sverhvysokochastotnye-50-1100': 'sverhvysokochastotnye',
    'skaniruyushchaya-zakalka':      'ustanovki-zakalki-valov',
}
DELETE_DATACAT = 'tranzistornye-gibkij-induktor'

# Порядок и метаданные 5 категорий
CATS = [
    ('srednechastotnye', dict(
        short="Среднечастотные",
        teaser_title="Среднечастотные",
        eyebrow="Сквозной нагрев и&nbsp;ковка",
        h1="Среднечастотные индукционные нагреватели",
        subtitle="Установки сквозного индукционного нагрева заготовок под&nbsp;ковку, штамповку и&nbsp;горячую деформацию. Частота 1–50&nbsp;кГц, мощность до&nbsp;150&nbsp;кВт. Гарантия 18&nbsp;месяцев.",
        cover="/img/card-srednechastotnye.png?v=1",
        teaser_caption="5 моделей · 1–50&nbsp;кГц, до&nbsp;150&nbsp;кВт. Сквозной нагрев заготовок под&nbsp;ковку и&nbsp;штамповку.",
        title="Среднечастотные индукционные нагреватели — каталог · УралИндуктор",
        descr="Среднечастотные индукционные нагреватели сквозного нагрева под ковку и штамповку. Частота 1–50 кГц, мощность до 150 кВт. Гарантия 18 месяцев.",
    )),
    ('vysokochastotnye', dict(
        short="Высокочастотные",
        teaser_title="Высокочастотные",
        eyebrow="Поверхностная закалка, нагрев и&nbsp;пайка",
        h1="Высокочастотные индукционные нагреватели",
        subtitle="Высокочастотные установки для&nbsp;поверхностной закалки, локального нагрева и&nbsp;пайки. Частота 30–100&nbsp;кГц, мощность 7–113&nbsp;кВт. Гарантия 18&nbsp;месяцев.",
        cover="/img/card-vysokochastotnye-30-80.png?v=1",
        teaser_caption="11 моделей · 30–100&nbsp;кГц, 7–113&nbsp;кВт. Поверхностная закалка, нагрев и&nbsp;пайка.",
        title="Высокочастотные индукционные нагреватели — каталог · УралИндуктор",
        descr="Высокочастотные индукционные нагреватели поверхностной закалки, нагрева и пайки. Частота 30–100 кГц, мощность 7–113 кВт. Гарантия 18 месяцев.",
    )),
    ('ruchnye', dict(
        short="Ручные ВЧ",
        teaser_title="Ручные ВЧ на&nbsp;кабеле",
        eyebrow="Закалка и&nbsp;пайка на&nbsp;гибком кабеле",
        h1="Ручные высокочастотные нагреватели",
        subtitle="Ручные высокочастотные нагреватели на&nbsp;гибком водоохлаждаемом кабеле для&nbsp;поверхностной закалки и&nbsp;пайки в&nbsp;труднодоступных местах. Серия&nbsp;ЛН. Гарантия 18&nbsp;месяцев.",
        cover="/img/card-ruchnye.png?v=1",
        teaser_caption="12 моделей · на&nbsp;гибком кабеле. Закалка и&nbsp;пайка в&nbsp;труднодоступных местах.",
        title="Ручные высокочастотные нагреватели — каталог · УралИндуктор",
        descr="Ручные высокочастотные индукционные нагреватели на гибком кабеле для поверхностной закалки и пайки. Серия ЛН. Гарантия 18 месяцев.",
    )),
    ('sverhvysokochastotnye', dict(
        short="Сверхвысокочастотные",
        teaser_title="Сверхвысокочастотные",
        eyebrow="Закалка тонкостенных изделий",
        h1="Сверхвысокочастотные индукционные нагреватели",
        subtitle="Сверхвысокочастотные установки для&nbsp;поверхностной закалки тонкостенных деталей, нагрева и&nbsp;пайки мелких изделий. Частота 100–1100&nbsp;кГц. Гарантия 18&nbsp;месяцев.",
        cover="/img/card-sverhvysokochastotnye-50-1100.png?v=1",
        teaser_caption="12 моделей · 100–1100&nbsp;кГц. Закалка тонкостенных изделий, пайка мелких деталей.",
        title="Сверхвысокочастотные индукционные нагреватели — каталог · УралИндуктор",
        descr="Сверхвысокочастотные индукционные нагреватели для поверхностной закалки тонкостенных изделий и пайки. Частота 100–1100 кГц. Гарантия 18 месяцев.",
    )),
    ('ustanovki-zakalki-valov', dict(
        short="Закалка валов",
        teaser_title="Закалка валов",
        eyebrow="Сканирующая закалка валов",
        h1="Установки поверхностной закалки валов",
        subtitle="Установки сканирующей закалки валов, осей и&nbsp;длинномерных деталей с&nbsp;ЧПУ-перемещением индуктора. Серия&nbsp;СЗ, длина детали до&nbsp;1800&nbsp;мм. Гарантия 18&nbsp;месяцев.",
        cover="/img/card-skaniruyushchaya-zakalka.png?v=1",
        teaser_caption="5 моделей · сканирующая закалка валов и&nbsp;осей с&nbsp;ЧПУ-перемещением индуктора.",
        title="Установки поверхностной закалки валов — каталог · УралИндуктор",
        descr="Установки сканирующей поверхностной закалки валов, осей и длинномерных деталей с ЧПУ. Серия СЗ. Гарантия 18 месяцев.",
    )),
]
CAT_META = dict(CATS)

# ---------------------------------------------------------------- parse hub
hub = open(HUB, encoding='utf-8').read()

# Все pcard-блоки: (data-cat, slug, article_html)
arts = re.split(r'(?=<article class="pcard")', hub)
pcards = []  # (datacat, slug, html)
for a in arts:
    if not a.startswith('<article class="pcard"'):
        continue
    end = a.index('</article>') + len('</article>')
    block = a[:end]
    mc = re.search(r'data-cat="([^"]+)"', block)
    ms = re.search(r'/induktsionnye-nagrevateli/([a-z0-9-]+)/"', block)
    if mc and ms:
        pcards.append((mc.group(1), ms.group(1), block))

# Карта slug -> целевая категория / удалить
slug_to_cat = {}
to_delete = []
for datacat, slug, _ in pcards:
    if datacat == DELETE_DATACAT:
        to_delete.append(slug)
    elif datacat in DATACAT_TO_CAT:
        slug_to_cat[slug] = DATACAT_TO_CAT[datacat]
    else:
        sys.exit(f"Неизвестный data-cat={datacat} у {slug}")

# Сверка с реальными папками
folders = {d for d in os.listdir(ROOT)
           if os.path.isdir(os.path.join(ROOT, d)) and d not in [c for c, _ in CATS]}
hub_slugs = set(slug_to_cat) | set(to_delete)
missing = folders - hub_slugs
extra = hub_slugs - folders
if missing or extra:
    print(f"⚠️  расхождение папок/хаба: только в папках={missing}  только в хабе={extra}")
print(f"К переносу: {len(slug_to_cat)}  ·  к удалению: {len(to_delete)}  ·  всего pcard: {len(pcards)}")

# pcard'ы по категориям (для landing), href переписан на вложенный URL
pcards_by_cat = {c: [] for c, _ in CATS}
for datacat, slug, block in pcards:
    if datacat == DELETE_DATACAT:
        continue
    cat = DATACAT_TO_CAT[datacat]
    nested = block.replace(
        f'/induktsionnye-nagrevateli/{slug}/',
        f'/induktsionnye-nagrevateli/{cat}/{slug}/')
    pcards_by_cat[cat].append(nested)

# Шаблон stats — берём из хаба, параметризуем count + text
stats_src = re.search(r'<section class="stats".*?</section>', hub, re.S).group(0)

def stats_for(count):
    s = stats_src
    s = s.replace('<div class="stat__num">54</div>',
                  f'<div class="stat__num">{count}</div>')
    s = s.replace('модели в&nbsp;каталоге — 8&nbsp;категорий установок',
                  'модели в&nbsp;категории · поставка по&nbsp;РФ и&nbsp;СНГ')
    return s

# ------------------------------------------------------- генерация landing
def landing_html(cat, m):
    pcards_html = '\n      '.join(pcards_by_cat[cat])
    return f'''<!-- ============================================================
     CAT-HERO — {m['h1']}
     ============================================================ -->
<section class="cat-hero">
  <div class="cat-hero__image" role="img" aria-label="{m['h1']} УралИндуктор в цеху Миасса"
       style="background-image: url('{HERO}');"></div>
  <div class="cat-hero__overlay"></div>

  <div class="container cat-hero__content">
    <nav class="breadcrumb" aria-label="Хлебные крошки">
      <a href="/">Главная</a>
      <span class="breadcrumb__sep">/</span>
      <a href="/products/">Каталог оборудования</a>
      <span class="breadcrumb__sep">/</span>
      <a href="/products/induktsionnye-nagrevateli/">Индукционные нагреватели</a>
      <span class="breadcrumb__sep">/</span>
      <span class="breadcrumb__current">{m['short']}</span>
    </nav>

    <div class="cat-hero__body">
      <div class="cat-hero__eyebrow">{m['eyebrow']}</div>
      <h1 class="cat-hero__title">{m['h1']}</h1>
      <p class="cat-hero__subtitle">{m['subtitle']}</p>
      <div class="cat-hero__actions">
        <a href="/products/" class="btn btn--primary">Перейти в каталог <span class="btn__arrow">→</span></a>
        <a href="#leadgen" class="btn btn--on-dark">Подобрать нагреватель <span class="btn__arrow">→</span></a>
      </div>
    </div>
  </div>
</section>

{stats_for(len(pcards_by_cat[cat]))}

<!-- ============================================================
     CATALOG — модели категории
     ============================================================ -->
<section class="catalog-list" aria-label="Каталог — {m['h1']}">
  <div class="container">
    <div class="s-head">
      <div class="s-eyebrow">Каталог</div>
      <h2 class="s-title">Модельный <em>ряд</em></h2>
      <p class="s-lead">{m['subtitle']}</p>
    </div>

    <div class="pcard-grid">
      {pcards_html}
    </div>
  </div>
</section>

<!-- ============================================================
     LEAD-GEN + WHY-US + BEST-OFFER
     ============================================================ -->
<!--C:leadgen-->
<!--C:why-us-->
<!--C:best-offer-->
'''

def landing_meta(m):
    return json.dumps({
        "title": m['title'],
        "description": m['descr'],
        "inline_styles": [],
        "css_templates": ["/css/tpl/hub-catalog.css"],
    }, ensure_ascii=False, indent=2) + '\n'

for cat, m in CATS:
    d = os.path.join(ROOT, cat)
    os.makedirs(d, exist_ok=True)
    open(os.path.join(d, 'body.html'), 'w', encoding='utf-8').write(landing_html(cat, m))
    open(os.path.join(d, 'meta.json'), 'w', encoding='utf-8').write(landing_meta(m))
    print(f"landing создан: {cat}/ ({len(pcards_by_cat[cat])} товаров)")

# --------------------------------------------------- перенос товаров (git mv)
def git(*args):
    return subprocess.run(['git', *args], capture_output=True, text=True)

bc_pat = re.compile(
    r'(<a href="/products/induktsionnye-nagrevateli/">Индукционные нагреватели</a>\s*'
    r'<span class="breadcrumb__sep">/</span>\s*)'
    r'(<span class="breadcrumb__current">)')

moved = 0
for slug, cat in slug_to_cat.items():
    src = os.path.join(ROOT, slug)
    dst = os.path.join(ROOT, cat, slug)
    if os.path.isdir(src) and not os.path.isdir(dst):
        r = git('mv', src, dst)
        if r.returncode != 0:
            sys.exit(f"git mv {src} → {dst} провалился:\n{r.stderr}")
        moved += 1
    # правка breadcrumb в перенесённом товаре (идемпотентно)
    bf = os.path.join(dst, 'body.html')
    if os.path.exists(bf):
        t = open(bf, encoding='utf-8').read()
        link = f'/products/induktsionnye-nagrevateli/{cat}/'
        if link not in t:
            repl = (r'\1<a href="/products/induktsionnye-nagrevateli/' + cat +
                    '/">' + CAT_META[cat]['short'] + '</a>\n'
                    '      <span class="breadcrumb__sep">/</span>\n      \\2')
            t2 = bc_pat.sub(repl, t, count=1)
            if t2 != t:
                open(bf, 'w', encoding='utf-8').write(t2)
            else:
                print(f"  ⚠️  breadcrumb не найден в {slug}")
print(f"перенесено папок: {moved}")

# ------------------------------------------------------- удаление транзисторных
deleted = 0
for slug in to_delete:
    src = os.path.join(ROOT, slug)
    if os.path.isdir(src):
        r = git('rm', '-r', '-q', src)
        if r.returncode != 0:
            sys.exit(f"git rm {src} провалился:\n{r.stderr}")
        deleted += 1
print(f"удалено транзисторных папок: {deleted}")

# --------------------------------------------------------- перестройка хаба
# teaser-grid из 5 категорий
teasers = []
for cat, m in CATS:
    teasers.append(f'''      <a href="/products/induktsionnye-nagrevateli/{cat}/" class="teaser-card">
        <div class="teaser-card__cover">
          <img src="{m['cover']}" alt="{m['h1']}" loading="lazy">
        </div>
        <div class="teaser-card__body">
          <h3 class="teaser-card__title">{m['teaser_title']}</h3>
          <p class="teaser-card__caption">{m['teaser_caption']}</p>
          <span class="teaser-card__more">Подробнее <span class="btn__arrow">→</span></span>
        </div>
      </a>''')
teaser_block = ('''    <!-- 5 категорий нагревателей (как плавильные печи) -->
    <div class="teaser-grid">
''' + '\n\n'.join(teasers) + '''
    </div>
  </div>
</section>

''')

# Вырезаем filter + script + pcard-grid (от <form class="catalog-filter" до
# закрытия секции catalog-list перед SECTION DIVIDER), заменяем teaser-grid'ом.
form_start = hub.index('<form class="catalog-filter"')
# начало комментария SECTION DIVIDER (хвост хаба сохраняем целиком)
div_marker = hub.index('class="section-divider"')
tail_start = hub.rindex('<!--', 0, div_marker)
new_hub = hub[:form_start] + teaser_block + hub[tail_start:]

# Текстовые правки: 8 категорий / 54 модели → 5 / 45, без транзисторных
new_hub = new_hub.replace(
    '8&nbsp;категорий установок индукционного нагрева, поверхностной закалки и&nbsp;пайки. Частота от&nbsp;1 до&nbsp;1100&nbsp;кГц, мощностью от&nbsp;5 до&nbsp;1200&nbsp;кВт. Гарантия 18&nbsp;месяцев.',
    '5&nbsp;категорий установок индукционного нагрева, поверхностной закалки, пайки и&nbsp;закалки валов. Частота от&nbsp;1 до&nbsp;1100&nbsp;кГц. Гарантия 18&nbsp;месяцев.')
new_hub = new_hub.replace('<div class="stat__num">54</div>', '<div class="stat__num">45</div>')
new_hub = new_hub.replace('модели в&nbsp;каталоге — 8&nbsp;категорий установок',
                          'модели в&nbsp;каталоге — 5&nbsp;категорий установок')
new_hub = new_hub.replace('8&nbsp;категорий<br>под&nbsp;любую задачу',
                          '5&nbsp;категорий<br>под&nbsp;любую задачу')
# intro-card #02 — список типов без транзисторных
new_hub = new_hub.replace(
    'Поставляем <strong>среднечастотные</strong> установки (1–50 кГц для&nbsp;объёмного нагрева заготовок и&nbsp;ковки), <strong>высокочастотные</strong> (30–100 кГц для&nbsp;поверхностной закалки), <strong>сверхвысокочастотные</strong> (50–1100 кГц для&nbsp;пайки и&nbsp;нагрева мелких деталей), <strong>ручные</strong> и&nbsp;<strong>транзисторные с&nbsp;гибким индуктором</strong> для&nbsp;монтажных работ и&nbsp;<strong>установки сканирующей закалки</strong> с&nbsp;ЧПУ.',
    'Поставляем <strong>среднечастотные</strong> установки (1–50 кГц для&nbsp;объёмного нагрева заготовок и&nbsp;ковки), <strong>высокочастотные</strong> (30–100 кГц для&nbsp;поверхностной закалки, нагрева и&nbsp;пайки), <strong>сверхвысокочастотные</strong> (100–1100 кГц для&nbsp;закалки тонкостенных изделий), <strong>ручные ВЧ</strong> на&nbsp;гибком кабеле и&nbsp;<strong>установки поверхностной закалки валов</strong> с&nbsp;ЧПУ.')
# aria-label секции каталога
new_hub = new_hub.replace(
    'aria-label="Каталог индукционных нагревателей — 54 модели"',
    'aria-label="Каталог индукционных нагревателей — 5 категорий"')

open(HUB, 'w', encoding='utf-8').write(new_hub)
print("хаб перестроен (teaser-grid из 5 категорий)")

# хаб meta.json
hub_meta_path = f'{ROOT}/meta.json'
hub_meta = json.load(open(hub_meta_path, encoding='utf-8'))
hub_meta['title'] = "Индукционные нагреватели — каталог 5 категорий · УралИндуктор"
hub_meta['description'] = ("Индукционные нагреватели УралИндуктор: среднечастотные, "
    "высокочастотные, сверхвысокочастотные, ручные ВЧ на гибком кабеле и установки "
    "поверхностной закалки валов. 45 моделей, частоты 1–1100 кГц. Гарантия 18 месяцев.")
hub_meta['inline_styles'] = []
hub_meta['css_templates'] = ["/css/tpl/hub-catalog.css"]
open(hub_meta_path, 'w', encoding='utf-8').write(
    json.dumps(hub_meta, ensure_ascii=False, indent=2) + '\n')
print("хаб meta.json обновлён (hub-catalog.css, 5 категорий)")
print("\nГОТОВО.")
