#!/usr/bin/env python3
"""
Build individual model pages for сталеразливочные ковши.

Reads existing subcategory body.html files (which already have pcard data),
generates per-model body.html + meta.json under <model-slug>/, and
patches the parent subcategory body.html to point pcard buttons at the
new individual pages.

Modeled after /products/drobemetnoe-oborudovanie/kranovogo-tipa/uid-376e/.

Run from repo root:  python3 scripts/build-kovshi-models.py
"""
from __future__ import annotations
import json
import re
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
KOVSHI_ROOT = ROOT / "astro" / "src" / "raw-pages" / "products" / "stalerozlivochnye-kovshi"
TEMPLATE_META = ROOT / "astro" / "src" / "raw-pages" / "products" / "drobemetnoe-oborudovanie" / "kranovogo-tipa" / "uid-376e" / "meta.json"

# Subcategories config: dir, prefix (С/Ч/СТ/ЧТ), slug-prefix, parent-title,
# breadcrumb name, image, badge-by-capacity, spec-extras
SUBCATS = {
    "stalerazlivochnye-kovshi-dlya-rasplavlennoj-stali": {
        "prefix": "С",
        "slug_prefix": "uik-s",
        "parent_title": "для расплавленной стали",
        "breadcrumb_short": "для расплавленной стали",
        "image": "/img/card-kovsh-dlya-stali.jpg",
        "stop_or_perel": "perel",   # has "Передаточное число"
        "metal": "сталь",
        "metal_temp": "1 600 °C",
        "futerovka": "основная или нейтральная",
        "primenenie": "разливка стали и спецсплавов в формы, изложницы, МНЛЗ",
    },
    "stalerazlivochnye-kovshi-dlya-rasplavlennogo-chuguna": {
        "prefix": "Ч",
        "slug_prefix": "uik-ch",
        "parent_title": "для расплавленного чугуна",
        "breadcrumb_short": "для расплавленного чугуна",
        "image": "/img/card-kovsh-dlya-chuguna.jpg",
        "stop_or_perel": "perel",
        "metal": "чугун",
        "metal_temp": "1 450 °C",
        "futerovka": "кислая, шамотный кирпич / набивная масса",
        "primenenie": "разливка чугуна (серый, ковкий, высокопрочный) в литейные формы",
    },
    "stalerazlivochnye-kovshi-stopornogo-tipa": {
        "prefix": "СТ",
        "slug_prefix": "uik-st",
        "parent_title": "стопорного типа",
        "breadcrumb_short": "стопорного типа",
        "image": "/img/card-kovsh-stopornogo-tipa.jpg",
        "stop_or_perel": "stop",    # has "Ход стопора"
        "metal": "сталь, чугун",
        "metal_temp": "1 600 °C",
        "futerovka": "основная под сталь, кислая под чугун",
        "primenenie": "контролируемая порционная разливка через донный стопор — для МНЛЗ и литья в формы",
    },
    "stalerazlivochnye-kovshi-chajnikovogo-tipa": {
        "prefix": "ЧТ",
        "slug_prefix": "uik-cht",
        "parent_title": "чайникового типа",
        "breadcrumb_short": "чайникового типа",
        "image": "/img/card-kovsh-chajnikovogo-tipa.jpg",
        "stop_or_perel": "perel",
        "metal": "чугун, цветные сплавы",
        "metal_temp": "1 450 °C",
        "futerovka": "кислая (шамот) или графитовая",
        "primenenie": "чистая разливка металла без шлаковых включений (носик-перегородка отсекает шлак)",
    },
}

# Per-model name overrides (e.g. УИК-С-12 duplicates → -12А / -12Б)
NAME_OVERRIDES: dict[tuple[str, int], tuple[str, str]] = {
    # (subcategory_dir, pcard_index): (new_title, new_slug)
    # 11th and 12th pcards in stali both УИК-С-12 → split into А/Б
    ("stalerazlivochnye-kovshi-dlya-rasplavlennoj-stali", 10): ("УИК-С-12А", "uik-s-12a"),
    ("stalerazlivochnye-kovshi-dlya-rasplavlennoj-stali", 11): ("УИК-С-12Б", "uik-s-12b"),
}


def slugify_capacity(cap: str) -> str:
    """0.3 → 0-3, 0.5 → 0-5, 2 → 2, 2.5 → 2-5, 12 → 12, 15 → 15"""
    cap = cap.replace(",", ".").strip()
    return cap.replace(".", "-")


def parse_pcards(body_html: str) -> list[dict]:
    """Extract all pcard data from a subcategory body.html."""
    pcards = []
    # Find all <article class="pcard" ...>...</article>
    pcard_re = re.compile(r'<article\s+class="pcard"[^>]*>(.*?)</article>', re.DOTALL)
    for m in pcard_re.finditer(body_html):
        block = m.group(1)
        # Extract title (УИК-X-Y)
        title_m = re.search(r'<h3 class="pcard__title"><a [^>]*>([^<]+)</a></h3>', block)
        if not title_m:
            continue
        title = title_m.group(1).strip()
        # Extract badge
        badge_m = re.search(r'<span class="pcard__badge">([^<]+)</span>', block)
        badge = badge_m.group(1).strip() if badge_m else ""
        # Extract specs
        specs = []
        for sm in re.finditer(r'<dt>([^<]+)</dt><dd>([^<]+)</dd>', block):
            label = sm.group(1).strip()
            value = sm.group(2).strip()
            specs.append((label, value))
        pcards.append({"title": title, "badge": badge, "specs": specs})
    return pcards


def make_body_html(
    title: str,
    parent_dir: str,
    cfg: dict,
    specs: list[tuple[str, str]],
    badge: str,
) -> str:
    """Generate body.html for a single model page."""
    # Specs lookup
    spec_map = {label.lower(): val for label, val in specs}
    capacity = spec_map.get("ёмкость, т", "—")
    diameter = spec_map.get("диаметр, мм", "—")
    height = spec_map.get("высота, мм", "—")
    fourth_label = "Передаточное число" if cfg["stop_or_perel"] == "perel" else "Ход стопора, мм"
    fourth_value = ""
    for label, val in specs:
        if label.lower().startswith("передаточное") or label.lower().startswith("ход стопора"):
            fourth_value = val
            break
    if not fourth_value:
        fourth_value = "—"
    overall = spec_map.get("габариты д×ш×в, мм", "—")

    # Breadcrumb
    bcrumb = f'''<nav class="breadcrumb breadcrumb--light" aria-label="Хлебные крошки">
      <a href="/">Главная</a>
      <span class="breadcrumb__sep">/</span>
      <a href="/products/">Каталог оборудования</a>
      <span class="breadcrumb__sep">/</span>
      <a href="/products/stalerozlivochnye-kovshi/">Сталеразливочные ковши</a>
      <span class="breadcrumb__sep">/</span>
      <a href="/products/stalerozlivochnye-kovshi/{parent_dir}/">{cfg['breadcrumb_short']}</a>
      <span class="breadcrumb__sep">/</span>
      <span class="breadcrumb__current">{title}</span>
    </nav>'''

    # Hero status
    short_descr = f"Сталеразливочный ковш {cfg['breadcrumb_short']}"
    hero_banner = f"Ковш {cfg['breadcrumb_short']}"

    # Build keyspecs (4 boxes)
    keyspec1 = f'''<div class="phero__keyspec">
            <div class="phero__keyspec-num">{capacity}&nbsp;т</div>
            <div class="phero__keyspec-label">Ёмкость</div>
          </div>'''
    keyspec2 = f'''<div class="phero__keyspec">
            <div class="phero__keyspec-num">⌀{diameter}&nbsp;мм</div>
            <div class="phero__keyspec-label">Внутренний диаметр</div>
          </div>'''
    keyspec3 = f'''<div class="phero__keyspec">
            <div class="phero__keyspec-num">{height}&nbsp;мм</div>
            <div class="phero__keyspec-label">Высота</div>
          </div>'''
    if cfg["stop_or_perel"] == "perel":
        keyspec4 = f'''<div class="phero__keyspec">
            <div class="phero__keyspec-num">{fourth_value}</div>
            <div class="phero__keyspec-label">Передаточное число траверсы</div>
          </div>'''
    else:
        keyspec4 = f'''<div class="phero__keyspec">
            <div class="phero__keyspec-num">{fourth_value}&nbsp;мм</div>
            <div class="phero__keyspec-label">Ход стопора</div>
          </div>'''

    # Spec table (more parameters)
    if cfg["stop_or_perel"] == "perel":
        spec_table_rows = f'''<tr><th>Ёмкость, т</th><td>{capacity}</td></tr>
              <tr><th>Внутренний диаметр, мм</th><td>{diameter}</td></tr>
              <tr><th>Высота, мм</th><td>{height}</td></tr>
              <tr><th>Передаточное число траверсы</th><td>{fourth_value}</td></tr>
              <tr><th>Габариты Д×Ш×В, мм</th><td>{overall}</td></tr>
              <tr><th>Тип слива</th><td>через носик (наклон траверсы)</td></tr>
              <tr><th>Футеровка</th><td>{cfg['futerovka']}</td></tr>
              <tr><th>Макс. температура расплава</th><td>до&nbsp;{cfg['metal_temp']}</td></tr>'''
    else:
        spec_table_rows = f'''<tr><th>Ёмкость, т</th><td>{capacity}</td></tr>
              <tr><th>Внутренний диаметр, мм</th><td>{diameter}</td></tr>
              <tr><th>Высота, мм</th><td>{height}</td></tr>
              <tr><th>Ход стопора, мм</th><td>{fourth_value}</td></tr>
              <tr><th>Габариты Д×Ш×В, мм</th><td>{overall}</td></tr>
              <tr><th>Тип слива</th><td>стопорный (донный)</td></tr>
              <tr><th>Футеровка</th><td>{cfg['futerovka']}</td></tr>
              <tr><th>Макс. температура расплава</th><td>до&nbsp;{cfg['metal_temp']}</td></tr>'''

    # Image alt
    img_alt = f"Сталеразливочный ковш {cfg['breadcrumb_short']} {title}"

    body = f'''<!-- ============================================================
     PRODUCT HERO — карточка позиции {title}
     ============================================================ -->
<section class="phero">
  <div class="container">
    {bcrumb}

    <div class="phero__grid">
      <div class="phero__media">
        <button type="button" class="phero__main" aria-label="Фото ковша {title}">
          <span class="phero__banner">{hero_banner}</span>
          <img src="{cfg['image']}" alt="{img_alt}" loading="eager">
        </button>
      </div>

      <div class="phero__info">
        <div class="phero__origin">Производство&nbsp;Россия · собственное производство в&nbsp;Миассе</div>
        <h1 class="phero__title">Сталеразливочный ковш {cfg['breadcrumb_short']}&nbsp;{title}</h1>

        <div class="phero__status-row">
          <span class="phero__status">Под&nbsp;заказ · 30–60 дней</span>
          <span class="phero__price">Цена — по&nbsp;запросу</span>
        </div>

        <div class="phero__keyspecs">
          {keyspec1}
          {keyspec2}
          {keyspec3}
          {keyspec4}
        </div>

        <div class="phero__actions">
          <a href="#leadgen" class="btn btn--primary">Запросить цену <span class="btn__arrow">→</span></a>
          <a href="#leadgen" class="btn btn--secondary">Получить консультацию <span class="btn__arrow">→</span></a>
        </div>

        <ul class="phero__facts">
          <li>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 8h13v9H3z"/><path d="M16 11h4l3 3v3h-7"/><circle cx="7" cy="19" r="2"/><circle cx="18" cy="19" r="2"/></svg>
            <span>Доставка: по&nbsp;Челябинской области — <strong>1–3 дня</strong>, по&nbsp;РФ — <strong>3–10 дней</strong></span>
          </li>
          <li>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 2C8 2 5 5 5 9c0 5 7 13 7 13s7-8 7-13c0-4-3-7-7-7z"/><circle cx="12" cy="9" r="2.5"/></svg>
            <span>Замена футеровки нашими силами на&nbsp;вашей площадке</span>
          </li>
          <li>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 3l8 3v6c0 5-3.5 8-8 9-4.5-1-8-4-8-9V6l8-3z"/><path d="M9 12l2 2 4-4"/></svg>
            <span>Гарантия 18&nbsp;месяцев на&nbsp;оборудование собственного производства</span>
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
        <a class="spec__nav-link" href="#spec-futerovka">Футеровка</a>
        <a class="spec__nav-link" href="#spec-garantii">Гарантии</a>
        <a class="spec__nav-link" href="#spec-montazh">Монтаж и&nbsp;пусконаладка</a>
        <a class="spec__nav-link" href="#spec-obuchenie">Обучение персонала</a>
        <a class="spec__nav-link" href="#spec-servis">Диагностика и&nbsp;сервис</a>
        <a class="spec__nav-link" href="#spec-lizing">Лизинг</a>
      </nav>

      <div class="spec__body">
        <!-- 1 — Основные характеристики -->
        <div class="spec__panel" id="spec-osnovnye">
          <h2 class="spec__title">Основные характеристики</h2>
          <table class="spec-table">
            <tbody>
              {spec_table_rows}
            </tbody>
          </table>
          <p class="spec__note">Точная комплектация и&nbsp;параметры уточняются под&nbsp;задачу — оставьте заявку, инженер подготовит расчёт и&nbsp;опросный лист.</p>
        </div>

        <!-- 2 — Описание -->
        <div class="spec__panel" id="spec-opisanie">
          <h2 class="spec__title">Описание</h2>
          <p><strong>Сталеразливочный ковш {title}</strong> — литейная оснастка собственного производства для&nbsp;{cfg['primenenie']}. Ёмкость&nbsp;— <strong>{capacity}&nbsp;т</strong>, внутренний диаметр — <strong>{diameter}&nbsp;мм</strong>, высота — <strong>{height}&nbsp;мм</strong>.</p>
          <p>Корпус — сварная стальная оболочка с&nbsp;цапфами под&nbsp;крановую траверсу. Слив — {'через носик с&nbsp;шлакоотсекающей перегородкой («чайниковый»)' if cfg['prefix']=='ЧТ' else ('через донный стопор с&nbsp;ходом ' + fourth_value + '&nbsp;мм' if cfg['stop_or_perel']=='stop' else 'через носик при&nbsp;наклоне траверсы (передаточное число '+fourth_value+')')}. Конструкция рассчитана на&nbsp;многократный цикл «нагрев&nbsp;→ заполнение&nbsp;→ транспортировка&nbsp;→ разливка&nbsp;→ остывание».</p>
          <p>Подбираем ёмкость ковша под&nbsp;ёмкость плавильной печи и&nbsp;цикл разливки. Изготавливаем под&nbsp;заказ за&nbsp;30–60 дней, шеф-монтаж и&nbsp;футеровку выполняет наша инженерная бригада на&nbsp;вашей площадке.</p>
        </div>

        <!-- 3 — Футеровка -->
        <div class="spec__panel" id="spec-futerovka">
          <h2 class="spec__title">Футеровка</h2>
          <p>Базовая футеровка — <strong>{cfg['futerovka']}</strong>. Рабочая температура расплава — <strong>до&nbsp;{cfg['metal_temp']}</strong>. Доступные варианты футеровочных материалов:</p>
          <ul>
            <li>Шамотный кирпич — экономичное решение для&nbsp;серийной разливки</li>
            <li>Корундографит — для&nbsp;агрессивных расплавов и&nbsp;повышенного ресурса</li>
            <li>Магнезит / основная масса — под&nbsp;сталь с&nbsp;высокой основностью шлака</li>
            <li>Набивная масса — для&nbsp;спецсплавов и&nbsp;индивидуальных задач</li>
          </ul>
          <p>Замена футеровки — нашими силами на&nbsp;вашей площадке либо вывозом ковша на&nbsp;наш участок в&nbsp;Миассе.</p>
        </div>

        <!-- 4 — Гарантии -->
        <div class="spec__panel" id="spec-garantii">
          <h2 class="spec__title">Гарантии</h2>
          <p>Гарантия <strong>18&nbsp;месяцев</strong> на&nbsp;металлоконструкцию и&nbsp;узлы ковша собственного производства. Гарантия на&nbsp;футеровку — по&nbsp;технологическому регламенту в&nbsp;зависимости от&nbsp;режима эксплуатации и&nbsp;марки разливаемого металла.</p>
          <p>Постгарантийное обслуживание, поставка запчастей траверсы / стопора / носика — на&nbsp;постоянной основе.</p>
        </div>

        <!-- 5 — Монтаж и пусконаладка -->
        <div class="spec__panel" id="spec-montazh">
          <h2 class="spec__title">Монтаж и&nbsp;пусконаладка</h2>
          <p>Шеф-монтаж и&nbsp;футеровку выполняет наша инженерная бригада на&nbsp;площадке заказчика. В&nbsp;объём работ входит: установка ковша на&nbsp;стенд, обкладка футеровкой, сушка и&nbsp;нагрев, первая пробная разливка, передача паспортов.</p>
          <p>Сдача — по&nbsp;акту, с&nbsp;демонстрацией всех режимов и&nbsp;передачей сертификатов на&nbsp;футеровочные материалы.</p>
        </div>

        <!-- 6 — Обучение персонала -->
        <div class="spec__panel" id="spec-obuchenie">
          <h2 class="spec__title">Обучение персонала</h2>
          <p>Обучаем литейщиков работе с&nbsp;ковшом {title}: подготовка футеровки, сушка и&nbsp;нагрев, контроль температуры расплава, наклон траверсы / работа со&nbsp;стопором, послесменное обслуживание, диагностика износа футеровки и&nbsp;узлов.</p>
          <p>По&nbsp;итогам — аттестация и&nbsp;выдача внутренних удостоверений операторам.</p>
        </div>

        <!-- 7 — Диагностика и сервис -->
        <div class="spec__panel" id="spec-servis">
          <h2 class="spec__title">Диагностика и&nbsp;сервис</h2>
          <p>Выездная диагностика, ремонт траверсы / стопорного механизма / носика, замена футеровки, подбор и&nbsp;поставка запчастей — в&nbsp;том числе для&nbsp;ковшей других производителей, оставшихся без&nbsp;сервисной поддержки.</p>
          <p>Срок выезда инженера — 1–3 дня по&nbsp;Челябинской области, 3–10 дней по&nbsp;РФ.</p>
        </div>

        <!-- 8 — Лизинг -->
        <div class="spec__panel" id="spec-lizing">
          <h2 class="spec__title">Лизинг</h2>
          <p>Ковш {title} доступен в&nbsp;лизинг через&nbsp;партнёрские программы (Сбер Лизинг, ВТБ Лизинг, Альфа-Лизинг, ГПБ Лизинг, Балтийский Лизинг, Дельта Лизинг). Поможем подобрать удобный формат и&nbsp;подготовить исходные данные для&nbsp;лизинговой заявки.</p>
        </div>
      </div>
    </div>
  </div>
</section>

<!-- ============================================================
     LEADGEN — форма заявки
     ============================================================ -->
<!--C:leadgen-->

<!-- ============================================================
     BEST OFFER — контакты + форма
     ============================================================ -->
<!--C:best-offer-->
'''
    return body


def main():
    # Load template meta.json to grab the inline_styles blob
    with open(TEMPLATE_META, encoding="utf-8") as f:
        template_meta = json.load(f)
    inline_styles = template_meta["inline_styles"]  # list[str]

    total_generated = 0
    parent_patches: dict[Path, str] = {}

    for subdir_name, cfg in SUBCATS.items():
        subdir = KOVSHI_ROOT / subdir_name
        body_path = subdir / "body.html"
        if not body_path.exists():
            print(f"SKIP (no body.html): {subdir_name}", file=sys.stderr)
            continue
        body_html = body_path.read_text(encoding="utf-8")
        pcards = parse_pcards(body_html)
        print(f"\n=== {subdir_name}: found {len(pcards)} pcards ===")

        # We will collect slug-by-index for parent patching
        per_card_slug: list[str] = []

        for idx, pcard in enumerate(pcards):
            title = pcard["title"]
            badge = pcard["badge"]
            # capacity from specs
            cap = ""
            for label, val in pcard["specs"]:
                if label.lower().startswith("ёмкость"):
                    cap = val.replace(",", ".").strip()
                    break

            # Determine slug
            override_key = (subdir_name, idx)
            if override_key in NAME_OVERRIDES:
                new_title, slug = NAME_OVERRIDES[override_key]
                title = new_title
            else:
                slug = f"{cfg['slug_prefix']}-{slugify_capacity(cap)}"
            per_card_slug.append(slug)

            # Make model dir
            model_dir = subdir / slug
            model_dir.mkdir(parents=True, exist_ok=True)

            # Generate body.html
            body_out = make_body_html(title, subdir_name, cfg, pcard["specs"], badge)
            (model_dir / "body.html").write_text(body_out, encoding="utf-8")

            # Generate meta.json (reuse inline_styles from uid-376e)
            seo_title = (
                f"Сталеразливочный ковш {cfg['breadcrumb_short']} {title} — характеристики, цена · УралИндуктор"
            )
            seo_descr = (
                f"Сталеразливочный ковш {title}: ёмкость {cap} т для {cfg['primenenie']}. "
                f"Собственное производство в Миассе. Гарантия 18 месяцев."
            )
            meta = {
                "title": seo_title,
                "description": seo_descr,
                "inline_styles": inline_styles,
            }
            (model_dir / "meta.json").write_text(
                json.dumps(meta, ensure_ascii=False, indent=2), encoding="utf-8"
            )

            print(f"  [{idx:2}] {title:18}  →  {slug}/  ({cap}т)")
            total_generated += 1

        # Now patch the parent body.html — replace href="#leadgen" in pcard buttons
        # We need to be careful: only patch pcard-related <a href="#leadgen"> not the section anchor.
        # Strategy: walk all <article class="pcard"...>...</article> blocks again, replace inside.
        new_body_parts = []
        last_end = 0
        pcard_re = re.compile(r'<article\s+class="pcard"[^>]*>(.*?)</article>', re.DOTALL)
        i_card = 0
        for m in pcard_re.finditer(body_html):
            new_body_parts.append(body_html[last_end : m.start()])
            inner = m.group(0)
            slug = per_card_slug[i_card] if i_card < len(per_card_slug) else None
            override_key = (subdir_name, i_card)
            if override_key in NAME_OVERRIDES:
                new_title, _ = NAME_OVERRIDES[override_key]
                # Replace the displayed model name in this pcard block
                # Original is e.g. УИК-С-12 — we replace to УИК-С-12А/Б
                # Just do a simple substitution within the pcard
                inner = inner.replace("УИК-С-12", new_title, 2)
            if slug:
                # Replace href="#leadgen" → href="slug/"
                # Three places: pcard__cover wrapping <a>, pcard__title <a>, pcard__actions <a>
                inner = inner.replace('href="#leadgen"', f'href="{slug}/"')
            new_body_parts.append(inner)
            last_end = m.end()
            i_card += 1
        new_body_parts.append(body_html[last_end:])
        new_body = "".join(new_body_parts)

        if new_body != body_html:
            parent_patches[body_path] = new_body

    # Apply parent patches
    for p, content in parent_patches.items():
        p.write_text(content, encoding="utf-8")
        print(f"PATCHED parent: {p.relative_to(ROOT)}")

    print(f"\n✅ Generated {total_generated} model pages, patched {len(parent_patches)} parent files.")


if __name__ == "__main__":
    main()
