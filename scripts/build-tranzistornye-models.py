#!/usr/bin/env python3
"""
Генерирует 14 товарных страниц (T05) транзисторных плавильных печей УИ-…П
в /products/induktsionnye-plavilnye-pechi/tranzistornye/<slug>/.

Структура body.html — копия эталона тиристорной печи ui-0-1t-100
(phero с галереей + lightbox + spec-табы). inline_styles берём из его meta.json.

Данные — со старого сайта uralinduktor.ru (раздел транзисторных печей).
Фото — реальные снимки со старого сайта (исключение из правила №9 по согласованию).
"""
from __future__ import annotations
import json
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
CAT = ROOT / "astro" / "src" / "raw-pages" / "products" / "induktsionnye-plavilnye-pechi" / "tranzistornye"
TEMPLATE_META = ROOT / "astro" / "src" / "raw-pages" / "products" / "induktsionnye-plavilnye-pechi" / "po-stali" / "ui-0-1t-100" / "meta.json"

NBSP = " "

# Галереи: список (файл, alt-суффикс). Первый кадр — главный.
G_SMALL = [("ui-tranzistor-nastolnaya.png", "настольная транзисторная печь")]
G_TSEX = [("tranzistor-tsex-3.jpg", "в литейном цеху"), ("tranzistor-tsex-4.jpg", "в производственном цеху")]

MODELS = [
    # slug, name, family, steel, copper, alu, precious, voltage, power, freq, tilt, current, water, weight, dims, out_v, images
    dict(slug="ui-1p",   name="УИ-1П",   fam="small", steel="1",  copper="2",   alu="0,5", prec="1–2",  v="220 / 50", p="7",   f="30–80", tilt="не требуется", cur="34",  water="7,5–15",  weight="", dims="", outv="", img=G_SMALL),
    dict(slug="ui-2p",   name="УИ-2П",   fam="small", steel="2",  copper="4",   alu="1",   prec="3–4",  v="380 / 50", p="16",  f="30–80", tilt="не требуется", cur="26",  water="7,5–25",  weight="", dims="", outv="", img=G_SMALL),
    dict(slug="ui-3p",   name="УИ-3П",   fam="small", steel="3",  copper="6",   alu="1,5", prec="4–5",  v="380 / 50", p="21",  f="30–80", tilt="не требуется", cur="35",  water="7,6–40",  weight="", dims="", outv="", img=G_SMALL),
    dict(slug="ui-5p",   name="УИ-5П",   fam="small", steel="5",  copper="10",  alu="2",   prec="5–6",  v="380 / 50", p="26",  f="30–80", tilt="не требуется", cur="43",  water="7,6–40",  weight="", dims="", outv="", img=G_SMALL),
    dict(slug="ui-8p",   name="УИ-8П",   fam="small", steel="6",  copper="15",  alu="3",   prec="6–8",  v="380 / 50", p="32",  f="30–80", tilt="не требуется", cur="52",  water="7,6–50",  weight="", dims="", outv="", img=G_SMALL),
    dict(slug="ui-10p",  name="УИ-10П",  fam="small", steel="8",  copper="20",  alu="4",   prec="8–10", v="380 / 50", p="43",  f="30–80", tilt="не требуется", cur="70",  water="9–60",    weight="", dims="", outv="", img=G_SMALL),
    dict(slug="ui-15p",  name="УИ-15П",  fam="large", steel="3",  copper="10",  alu="3",   prec="10",   v="380 / 50", p="20",  f="1–20",  tilt="редукторный",  cur="32",  water="9–29",    weight="",       dims="470×280×460 / 480×240×510", outv="340–430", img=[("ui-25p-uzel.jpg", "плавильный узел")] + G_TSEX),
    dict(slug="ui-25p",  name="УИ-25П",  fam="large", steel="6",  copper="20",  alu="6",   prec="20",   v="380 / 50", p="26",  f="1–20",  tilt="редукторный",  cur="41",  water="9–40",    weight="28 / 26", dims="470×280×460 / 480×240×510", outv="340–430", img=[("ui-25p-uzel.jpg", "плавильный узел")] + G_TSEX),
    dict(slug="ui-35p",  name="УИ-35П",  fam="large", steel="10", copper="30",  alu="10",  prec="30",   v="380 / 50", p="33",  f="1–20",  tilt="редукторный",  cur="52",  water="9–50",    weight="38 / 26", dims="580×330×500 / 480×240×510", outv="340–480", img=[("ui-35p-uzel.png", "плавильный узел")] + G_TSEX),
    dict(slug="ui-45p",  name="УИ-45П",  fam="large", steel="18", copper="50",  alu="20",  prec="50",   v="380 / 50", p="43",  f="1–20",  tilt="редукторный",  cur="68",  water="10–60",   weight="48 / 26", dims="650×350×550 / 480×240×510", outv="340–480", img=[("ui-45p-uzel.png", "плавильный узел"), ("ui-45p-02.jpg", "вид сбоку"), ("ui-45p-03.png", "плавильный узел в работе"), ("tranzistor-tsex-3.jpg", "в литейном цеху")]),
    dict(slug="ui-70p",  name="УИ-70П",  fam="large", steel="25", copper="100", alu="30",  prec="100",  v="380 / 50", p="66",  f="1–20",  tilt="редукторный",  cur="105", water="10–70",   weight="50 / 48", dims="650×350×550 / 550×400×510", outv="340–480", img=[("ui-70p-uzel.jpg", "плавильный узел")] + G_TSEX),
    dict(slug="ui-90p",  name="УИ-90П",  fam="large", steel="40", copper="120", alu="40",  prec="120",  v="380 / 50", p="88",  f="1–20",  tilt="редукторный",  cur="140", water="10–85",   weight="80 / 48", dims="720×420×805 / 550×400×510", outv="340–480", img=[("ui-90p-uzel.jpg", "плавильный узел")] + G_TSEX),
    dict(slug="ui-110p", name="УИ-110П", fam="large", steel="50", copper="150", alu="50",  prec="150",  v="380 / 50", p="113", f="1–20",  tilt="редукторный",  cur="180", water="12–100",  weight="81 / 48", dims="720×420×805 / 550×400×510", outv="340–480", img=[("ui-110p-uzel.jpg", "плавильный узел")] + G_TSEX),
    dict(slug="ui-160p", name="УИ-160П", fam="large", steel="100", copper="250", alu="70", prec="200",  v="380 / 50", p="150", f="1–20",  tilt="редукторный",  cur="240", water="15–110",  weight="108 / 48", dims="700×420×805 / 550×400×510", outv="340–480", img=[("ui-160p-uzel.jpg", "плавильный узел")] + G_TSEX),
]


def media_block(m):
    name = m["name"]
    imgs = m["img"]
    main_file, main_alt = imgs[0]
    main = (
        f'<button type="button" class="phero__main" data-lightbox-index="0" aria-label="Открыть фото на весь экран">\n'
        f'          <span class="phero__banner">Транзисторные плавильные печи</span>\n'
        f'          <img src="/img/{main_file}?v=1" alt="Индукционная транзисторная печь {name} — {main_alt}" loading="eager">\n'
        f'        </button>'
    )
    if len(imgs) > 1:
        thumbs = "\n          ".join(
            f'<button type="button" class="phero__thumb{" is-active" if i == 0 else ""}" data-lightbox-index="{i}" aria-label="Фото {i+1}"><img src="/img/{f}?v=1" alt="{name} — {alt}"></button>'
            for i, (f, alt) in enumerate(imgs)
        )
        thumbs_html = f'\n        <div class="phero__thumbs">\n          {thumbs}\n        </div>'
    else:
        thumbs_html = ""
    return main + thumbs_html


def lightbox_block(m):
    name = m["name"]
    total = len(m["img"])
    return f'''<!-- ============================================================
     LIGHTBOX — галерея на весь экран с навигацией
     ============================================================ -->
<div class="lightbox" id="lightbox" aria-hidden="true" role="dialog" aria-modal="true" aria-label="Галерея фото {name}">
  <button type="button" class="lightbox__btn lightbox__close" aria-label="Закрыть (Esc)">
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M6 6l12 12M18 6l-12 12"/></svg>
  </button>
  <button type="button" class="lightbox__btn lightbox__prev" aria-label="Предыдущее (←)">
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M15 6l-6 6 6 6"/></svg>
  </button>
  <button type="button" class="lightbox__btn lightbox__next" aria-label="Следующее (→)">
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 6l6 6-6 6"/></svg>
  </button>
  <img class="lightbox__img" id="lb-img" src="" alt="">
  <div class="lightbox__counter"><span id="lb-current">1</span>&nbsp;/&nbsp;<span id="lb-total">{total}</span></div>
</div>

<script>
  // Lightbox для phero-галереи
  (function(){{
    const triggers = document.querySelectorAll('[data-lightbox-index]');
    if (!triggers.length) return;
    const images = [];
    triggers.forEach(el => {{
      const idx = parseInt(el.getAttribute('data-lightbox-index'), 10);
      if (images[idx]) return;
      const img = el.querySelector('img');
      if (!img) return;
      images[idx] = {{ src: img.getAttribute('src'), alt: img.getAttribute('alt') || '' }};
    }});
    const lb = document.getElementById('lightbox');
    const lbImg = document.getElementById('lb-img');
    const lbCurrent = document.getElementById('lb-current');
    const lbTotal = document.getElementById('lb-total');
    const thumbs = document.querySelectorAll('.phero__thumb');
    let currentIndex = 0;
    let lastFocused = null;
    lbTotal.textContent = images.length;
    function show(index) {{
      currentIndex = (index + images.length) % images.length;
      lbImg.src = images[currentIndex].src;
      lbImg.alt = images[currentIndex].alt;
      lbCurrent.textContent = currentIndex + 1;
      thumbs.forEach((t, i) => t.classList.toggle('is-active', i === currentIndex));
    }}
    function open(index) {{
      lastFocused = document.activeElement;
      show(index);
      lb.classList.add('is-open');
      lb.setAttribute('aria-hidden', 'false');
      document.body.style.overflow = 'hidden';
      document.querySelector('.lightbox__next').focus();
    }}
    function close() {{
      lb.classList.remove('is-open');
      lb.setAttribute('aria-hidden', 'true');
      document.body.style.overflow = '';
      if (lastFocused && lastFocused.focus) lastFocused.focus();
    }}
    triggers.forEach(el => {{
      el.addEventListener('click', () => {{ open(parseInt(el.getAttribute('data-lightbox-index'), 10)); }});
    }});
    document.querySelector('.lightbox__close').addEventListener('click', close);
    document.querySelector('.lightbox__prev').addEventListener('click', () => show(currentIndex - 1));
    document.querySelector('.lightbox__next').addEventListener('click', () => show(currentIndex + 1));
    lb.addEventListener('click', (e) => {{ if (e.target === lb) close(); }});
    document.addEventListener('keydown', (e) => {{
      if (!lb.classList.contains('is-open')) return;
      if (e.key === 'Escape') close();
      else if (e.key === 'ArrowLeft') show(currentIndex - 1);
      else if (e.key === 'ArrowRight') show(currentIndex + 1);
    }});
    let touchStartX = 0;
    lb.addEventListener('touchstart', (e) => {{ touchStartX = e.touches[0].clientX; }}, {{ passive: true }});
    lb.addEventListener('touchend', (e) => {{
      const dx = e.changedTouches[0].clientX - touchStartX;
      if (Math.abs(dx) < 40) return;
      show(currentIndex + (dx < 0 ? 1 : -1));
    }}, {{ passive: true }});
  }})();
</script>'''


def description_block(m):
    name = m["name"]
    if m["fam"] == "small":
        intro = (
            f'<p><strong>Индукционная плавильная транзисторная печь {name}</strong> предназначена для&nbsp;плавки и&nbsp;перегрева '
            f'цветных и&nbsp;драгоценных металлов&nbsp;— меди, латуни, бронзы, алюминия, золота, платины, палладия. '
            f'За&nbsp;одну загрузку плавильного узла расплавляет до&nbsp;<strong>{m["copper"]}&nbsp;кг меди</strong> '
            f'({m["steel"]}&nbsp;кг стали/чугуна, {m["alu"]}&nbsp;кг алюминия, {m["prec"]}&nbsp;кг драгметалла). '
            f'Компактна, применяется в&nbsp;ювелирном и&nbsp;литейном производстве, лабораториях и&nbsp;на&nbsp;небольших участках.</p>'
        )
        sostav = '''<h3 class="spec__subtitle">Состав плавильного комплекса</h3>
          <ul>
            <li><strong>Транзисторный преобразователь частоты (IGBT)</strong> — управляющий элемент с&nbsp;водяным охлаждением, регулировка мощности и&nbsp;контроль режима.</li>
            <li><strong>Водоохлаждаемый токовод</strong> — гибкий кабель между преобразователем и&nbsp;плавильным узлом.</li>
            <li><strong>Плавильный узел</strong> с&nbsp;тиглем и&nbsp;индуктором; небольшая масса футеровки — низкая тепловая инерция.</li>
            <li><strong>Система охлаждения</strong> (воздушная + водяная) и&nbsp;<strong>выносной пульт</strong> регулировки мощности.</li>
          </ul>'''
    else:
        intro = (
            f'<p><strong>Индукционная плавильная транзисторная печь {name}</strong> предназначена для&nbsp;плавки и&nbsp;перегрева '
            f'стали, чугуна и&nbsp;цветных металлов в&nbsp;литейных производствах промышленных предприятий. '
            f'За&nbsp;одну загрузку плавильного узла расплавляет до&nbsp;<strong>{m["steel"]}&nbsp;кг стали/чугуна</strong>, '
            f'{m["copper"]}&nbsp;кг меди/латуни/бронзы или&nbsp;{m["alu"]}&nbsp;кг алюминия. '
            f'Допускается 3-сменный режим работы.</p>'
        )
        sostav = '''<h3 class="spec__subtitle">Состав плавильного комплекса</h3>
          <ul>
            <li><strong>Транзисторный преобразователь частоты (IGBT)</strong> — управляющий элемент с&nbsp;водяным охлаждением: регулировка мощности, контроль нагрузки и&nbsp;наличия входного питания.</li>
            <li><strong>Водоохлаждаемый токовод</strong> — гибкий кабель между преобразователем и&nbsp;плавильным узлом, охлаждается жидкостью.</li>
            <li><strong>Плавильный узел</strong> с&nbsp;редукторным приводом наклона; небольшая масса футеровки снижает тепловую инерцию.</li>
            <li><strong>Механизм наклона</strong> печи с&nbsp;дублирующим ручным приводом для&nbsp;аварийного слива.</li>
            <li><strong>Пульт управления наклоном</strong>, <strong>выносной пульт</strong> регулировки мощности, <strong>система охлаждения</strong> (воздушная + водяная).</li>
          </ul>'''
    advantage = (
        '<p>Установка построена на&nbsp;быстродействующих <strong>транзисторных IGBT-модулях</strong> с&nbsp;водяным охлаждением, '
        'преобразующих электрическую энергию в&nbsp;энергию электромагнитного поля. Энергия выделяется непосредственно '
        'в&nbsp;загрузке, без&nbsp;промежуточных нагревательных элементов. Интенсивная электродинамическая циркуляция '
        'расплава в&nbsp;тигле обеспечивает быстрое плавление шихты и&nbsp;отходов, выравнивание температуры по&nbsp;объёму '
        'ванны и&nbsp;отсутствие местных перегревов.</p>'
    )
    reliability = (
        '<p>Печь проста в&nbsp;монтаже и&nbsp;настройке, требует минимальную квалификацию персонала и&nbsp;отличается '
        'низким энергопотреблением. Надёжность гарантируется многоступенчатой системой защиты: от&nbsp;превышения '
        'температуры, отсутствия теплоносителя в&nbsp;системе охлаждения, пропадания фазы и&nbsp;других нештатных ситуаций.</p>'
    )
    return f'''<h2 class="spec__title">Описание</h2>
          {intro}
          {advantage}
          {reliability}
          {sostav}
          <p class="spec__note">Опционально: PLC-контроллер с&nbsp;сенсорным дисплеем, вибротрамбовщик, инфракрасный измеритель температуры расплава, продувка инертными газами, вытяжка для&nbsp;плавильного узла. Точная комплектация — под&nbsp;задачу.</p>'''


def spec_rows(m):
    rows = [
        ("Масса загрузки (сталь&nbsp;/&nbsp;чугун), кг", m["steel"]),
        ("Масса загрузки (медь&nbsp;/&nbsp;латунь&nbsp;/&nbsp;бронза), кг", m["copper"]),
        ("Масса загрузки (алюминий), кг", m["alu"]),
        ("Масса загрузки (драгметалл), кг", m["prec"]),
        ("Мощность установки, кВт", m["p"]),
        ("Напряжение питания, В&nbsp;/&nbsp;Гц", m["v"]),
        ("Рабочая частота, кГц", m["f"]),
        ("Привод наклона", m["tilt"]),
        ("Ток потребления, А", m["cur"]),
        ("Расход воды, л/мин", m["water"]),
        ("Давление воды, мПа", "0,15–0,25"),
    ]
    if m["outv"]:
        rows.append(("Выходное напряжение, В", m["outv"]))
    if m["weight"]:
        rows.append(("Вес установки, кг", m["weight"]))
    if m["dims"]:
        rows.append(("Габаритные размеры, мм", m["dims"]))
    rows += [
        ("Преобразователь", "транзисторный (IGBT), водяное охлаждение"),
        ("Плавильные материалы", "сталь, чугун, цветные и&nbsp;драгоценные металлы"),
    ]
    return "\n              ".join(f"<tr><th>{k}</th><td>{v}</td></tr>" for k, v in rows)


def make_body(m):
    name = m["name"]
    melt = m["steel"] if m["fam"] == "large" else m["copper"]
    melt_label = "стали, чугуна и&nbsp;цветных металлов" if m["fam"] == "large" else "цветных и&nbsp;драгоценных металлов"
    melt_metal = "стали/чугуна" if m["fam"] == "large" else "меди"
    v_fmt = m["v"].replace(" / ", "&nbsp;/&nbsp;")
    return f'''<!-- ============================================================
     PRODUCT HERO — карточка позиции
     ============================================================ -->
<section class="phero">
  <div class="container">
    <nav class="breadcrumb breadcrumb--light" aria-label="Хлебные крошки">
      <a href="/">Главная</a>
      <span class="breadcrumb__sep">/</span>
      <a href="/products/">Каталог оборудования</a>
      <span class="breadcrumb__sep">/</span>
      <a href="/products/induktsionnye-plavilnye-pechi/">Индукционные плавильные печи</a>
      <span class="breadcrumb__sep">/</span>
      <a href="/products/induktsionnye-plavilnye-pechi/tranzistornye/">Транзисторные печи</a>
      <span class="breadcrumb__sep">/</span>
      <span class="breadcrumb__current">{name}</span>
    </nav>

    <div class="phero__grid">
      <div class="phero__media">
        {media_block(m)}
      </div>

      <div class="phero__info">
        <div class="phero__origin">Производство&nbsp;Россия · собственное производство в&nbsp;Миассе</div>
        <h1 class="phero__title">Индукционная транзисторная печь&nbsp;{name}</h1>

        <div class="phero__status-row">
          <span class="phero__status">Со&nbsp;склада в&nbsp;Миассе</span>
          <span class="phero__price">Цена — по&nbsp;запросу</span>
        </div>

        <div class="phero__keyspecs">
          <div class="phero__keyspec">
            <div class="phero__keyspec-num">{m["copper"]} кг</div>
            <div class="phero__keyspec-label">Загрузка меди&nbsp;/&nbsp;бронзы</div>
          </div>
          <div class="phero__keyspec">
            <div class="phero__keyspec-num">{m["p"]} кВт</div>
            <div class="phero__keyspec-label">Мощность установки</div>
          </div>
          <div class="phero__keyspec">
            <div class="phero__keyspec-num">{v_fmt}</div>
            <div class="phero__keyspec-label">Напряжение питания, В&nbsp;/&nbsp;Гц</div>
          </div>
          <div class="phero__keyspec">
            <div class="phero__keyspec-num">{m["f"]} кГц</div>
            <div class="phero__keyspec-label">Рабочая частота</div>
          </div>
        </div>

        <div class="phero__actions">
          <a href="#leadgen" class="btn btn--primary js-quote-btn">Запросить цену <span class="btn__arrow">→</span></a>
          <a href="#contacts" class="btn btn--secondary">Получить консультацию <span class="btn__arrow">→</span></a>
        </div>

        <ul class="phero__facts">
          <li>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 8h13v9H3z"/><path d="M16 11h4l3 3v3h-7"/><circle cx="7" cy="19" r="2"/><circle cx="18" cy="19" r="2"/></svg>
            <span>Отгрузка со&nbsp;склада в&nbsp;Миассе&nbsp;— <strong>1–3 дня</strong>, доставка по&nbsp;РФ — <strong>3–10 дней</strong></span>
          </li>
          <li>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 2C8 2 5 5 5 9c0 5 7 13 7 13s7-8 7-13c0-4-3-7-7-7z"/><circle cx="12" cy="9" r="2.5"/></svg>
            <span>Плавка {melt_label} — до&nbsp;{melt}&nbsp;кг {melt_metal} за&nbsp;цикл</span>
          </li>
          <li>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 3l8 3v6c0 5-3.5 8-8 9-4.5-1-8-4-8-9V6l8-3z"/><path d="M9 12l2 2 4-4"/></svg>
            <span>Транзисторные IGBT-модули, гарантия 18&nbsp;месяцев — собственное производство</span>
          </li>
        </ul>
      </div>
    </div>
  </div>
</section>

<!-- ============================================================
     SPEC TABS — характеристики и описание
     ============================================================ -->
<section class="spec" aria-label="Характеристики и описание">
  <div class="container">
    <div class="spec__layout">
      <nav class="spec__nav" aria-label="Разделы технической документации">
        <div class="spec__nav-eyebrow">Содержание</div>
        <a class="spec__nav-link" href="#spec-osnovnye">Основные характеристики</a>
        <a class="spec__nav-link" href="#spec-opisanie">Описание</a>
        <a class="spec__nav-link" href="#spec-garantii">Гарантии</a>
        <a class="spec__nav-link" href="#spec-montazh">Монтаж и&nbsp;пусконаладка</a>
        <a class="spec__nav-link" href="#spec-obuchenie">Обучение персонала</a>
        <a class="spec__nav-link" href="#spec-servis">Диагностика и&nbsp;ремонт</a>
        <a class="spec__nav-link" href="#spec-zapchasti">Запчасти</a>
        <a class="spec__nav-link" href="#spec-lizing">Лизинг</a>
      </nav>

      <div class="spec__body">
        <!-- 1 — Основные характеристики -->
        <div class="spec__panel" id="spec-osnovnye">
          <h2 class="spec__title">Основные характеристики</h2>
          <table class="spec-table">
            <tbody>
              {spec_rows(m)}
            </tbody>
          </table>
          <p class="spec__note">Точная комплектация и&nbsp;параметры уточняются под&nbsp;задачу — оставьте заявку, инженер подготовит расчёт.</p>
        </div>

        <!-- 2 — Описание -->
        <div class="spec__panel" id="spec-opisanie">
          {description_block(m)}
        </div>

        <!-- 3 — Гарантии -->
        <div class="spec__panel" id="spec-garantii">
          <h2 class="spec__title">Гарантии</h2>
          <p>Гарантия <strong>18&nbsp;месяцев</strong> на&nbsp;оборудование собственного производства. Постгарантийное обслуживание, поставка запчастей и&nbsp;сервис — на&nbsp;постоянной основе.</p>
          <p>Собственное производство в&nbsp;Миассе позволяет контролировать качество на&nbsp;всех этапах: от&nbsp;подбора отечественных комплектующих до&nbsp;итоговой проверки перед отгрузкой.</p>
        </div>

        <!-- 4 — Монтаж и пусконаладка -->
        <div class="spec__panel" id="spec-montazh">
          <h2 class="spec__title">Монтаж и&nbsp;пусконаладка</h2>
          <p>Шеф-монтаж и&nbsp;пусконаладку выполняет наша инженерная бригада на&nbsp;площадке заказчика. Запуск оборудования, настройка транзисторного преобразователя, проверка системы охлаждения и&nbsp;многоступенчатой защиты, отработка режимов плавки на&nbsp;первой технологической партии металла.</p>
          <p>Сдача — по&nbsp;акту, с&nbsp;демонстрацией всех режимов и&nbsp;передачей паспортов узлов.</p>
        </div>

        <!-- 5 — Обучение персонала -->
        <div class="spec__panel" id="spec-obuchenie">
          <h2 class="spec__title">Обучение персонала</h2>
          <p>Обучаем операторов работе с&nbsp;{name}: загрузка шихты, выбор режимов плавки, регулирование мощности через выносной пульт, работа с&nbsp;футеровкой и&nbsp;её&nbsp;замена, диагностика износа, безопасная эксплуатация.</p>
          <p>По&nbsp;итогам — аттестация и&nbsp;выдача внутренних удостоверений операторам.</p>
        </div>

        <!-- 6 — Диагностика и ремонт -->
        <div class="spec__panel" id="spec-servis">
          <h2 class="spec__title">Диагностика и&nbsp;ремонт</h2>
          <p>Выездная диагностика, ремонт узлов (транзисторный преобразователь, плавильный узел, шкаф управления), подбор и&nbsp;поставка запчастей — в&nbsp;том числе для&nbsp;индукционных печей других производителей, оставшихся без&nbsp;сервисной поддержки.</p>
          <p>Срок выезда инженера — 1–3 дня по&nbsp;Челябинской области, 3–10 дней по&nbsp;РФ.</p>
        </div>

        <!-- 7 — Запчасти -->
        <div class="spec__panel" id="spec-zapchasti">
          <h2 class="spec__title">Запчасти</h2>
          <p>Поставляем запчасти и&nbsp;расходные материалы на&nbsp;{name} со&nbsp;склада и&nbsp;под&nbsp;заказ:</p>
          <ul>
            <li>Транзисторные IGBT-модули преобразователя</li>
            <li>Водоохлаждаемые тоководы и&nbsp;кабели</li>
            <li>Индукционные катушки и&nbsp;тигли</li>
            <li>Футеровочные смеси и&nbsp;металлические шаблоны</li>
            <li>Электронные модули шкафа и&nbsp;пультов управления</li>
          </ul>
          <p>Опционально — <strong>PLC-контроллер с&nbsp;сенсорным экраном</strong>, <strong>вибротрамбовщик</strong>, <strong>инфракрасный измеритель температуры расплава</strong>, <strong>продувка инертными газами</strong>, <strong>вытяжка для&nbsp;плавильного узла</strong>.</p>
        </div>

        <!-- 8 — Лизинг -->
        <div class="spec__panel" id="spec-lizing">
          <h2 class="spec__title">Лизинг</h2>
          <p>{name} доступна в&nbsp;лизинг через&nbsp;партнёрские программы (Сбер Лизинг, ВТБ Лизинг, Альфа-Лизинг, ГПБ Лизинг, Балтийский Лизинг, Дельта Лизинг). Поможем подобрать удобный формат и&nbsp;подготовить исходные данные для&nbsp;лизинговой заявки.</p>
        </div>
      </div>
    </div>
  </div>
</section>

<!-- ============================================================
     BEST OFFER — подготовим лучшее предложение
     ============================================================ -->
<!--C:catalog-cta-->

<!-- ============================================================
     PARTNER — один партнёр для любой задачи
     ============================================================ -->
<!--C:partner-->

<!-- ============================================================
     ADV — контроль качества (4 преимущества)
     ============================================================ -->
<!--C:adv-->

<!-- ============================================================
     BEST OFFER — контакты + форма (как на главной)
     ============================================================ -->
<!--C:leadgen-->
<!--C:best-offer-->




{lightbox_block(m)}
'''


def main():
    template_meta = json.loads(TEMPLATE_META.read_text(encoding="utf-8"))
    inline_styles = template_meta["inline_styles"]
    css_templates = template_meta.get("css_templates", [])
    for m in MODELS:
        d = CAT / m["slug"]
        d.mkdir(parents=True, exist_ok=True)
        (d / "body.html").write_text(make_body(m), encoding="utf-8")
        name = m["name"]
        seo_title = f"Индукционная транзисторная печь {name} — характеристики, цена · УралИндуктор"
        seo_descr = (
            f"Транзисторная плавильная печь {name}: загрузка до {m['copper']} кг меди / "
            f"{m['steel']} кг стали, мощность {m['p']} кВт, IGBT-модули. Производство в Миассе, гарантия 18 мес."
        )
        meta = {"title": seo_title, "description": seo_descr, "inline_styles": inline_styles, "css_templates": css_templates}
        (d / "meta.json").write_text(json.dumps(meta, ensure_ascii=False, indent=2), encoding="utf-8")
        print(f"  ✓ {m['slug']:9s} → {name}  ({len(m['img'])} фото)")
    print(f"\n✅ Сгенерировано {len(MODELS)} страниц транзисторных печей")


if __name__ == "__main__":
    main()
