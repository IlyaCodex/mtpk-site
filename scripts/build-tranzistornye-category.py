#!/usr/bin/env python3
"""
Собирает страницу категории T04 «Транзисторные печи»
из шаблона po-stali/body.html: меняет hero, lead, фильтр и сетку карточек,
статические секции (stats, applications, full-cycle, leadgen) переиспользуются.
"""
from __future__ import annotations
import json
import re
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
BASE_DIR = ROOT / "astro" / "src" / "raw-pages" / "products" / "induktsionnye-plavilnye-pechi"
SRC = BASE_DIR / "po-stali" / "body.html"
SRC_META = BASE_DIR / "po-stali" / "meta.json"
OUT_DIR = BASE_DIR / "tranzistornye"
URL = "/products/induktsionnye-plavilnye-pechi/tranzistornye/"

# Импортируем данные моделей из соседнего генератора
import importlib.util
spec = importlib.util.spec_from_file_location("trzmodels", ROOT / "scripts" / "build-tranzistornye-models.py")
trz = importlib.util.module_from_spec(spec)
spec.loader.exec_module(trz)
MODELS = trz.MODELS


def pcard(m):
    main = m["img"][0][0]
    v = m["v"].replace(" / ", "/")
    href = f"{URL}{m['slug']}/"
    return f'''      <article class="pcard" data-mass="{m['steel']}" data-power="{m['p']}" data-metal="">
        <a href="{href}" class="pcard__cover">
          <span class="pcard__badge">Транзисторная</span>
          <img src="/img/{main}?v=1" alt="Индукционная транзисторная печь {m['name']}" loading="lazy">
        </a>
        <div class="pcard__body">
          <h3 class="pcard__title"><a href="{href}">Транзисторная печь {m['name']}</a></h3>
          <div class="pcard__origin">Производство&nbsp;Россия</div>
          <dl class="pcard__specs">
            <div class="pcard__spec"><dt>Загрузка медь/бронза, кг</dt><dd>{m['copper']}</dd></div>
            <div class="pcard__spec"><dt>Загрузка сталь/чугун, кг</dt><dd>{m['steel']}</dd></div>
            <div class="pcard__spec"><dt>Мощность, кВт</dt><dd>{m['p']}</dd></div>
            <div class="pcard__spec"><dt>Напряжение питания, В/Гц</dt><dd>{v}</dd></div>
            <div class="pcard__spec"><dt>Частота, кГц</dt><dd>{m['f']}</dd></div>
          </dl>
          <div class="pcard__actions">
            <a href="#leadgen" class="btn btn--primary btn--block js-quote-btn">Запросить цену <span class="btn__arrow">→</span></a>
            <a href="{href}" class="pcard__more">Подробнее о позиции <span class="btn__arrow">→</span></a>
          </div>
        </div>
      </article>'''


def main():
    html = SRC.read_text(encoding="utf-8")

    # 1. Хлебная крошка: текущий пункт
    html = html.replace(
        '      <span class="breadcrumb__current">Для стали и чугуна</span>',
        '      <span class="breadcrumb__current">Транзисторные печи</span>',
    )
    # 2. Hero title + subtitle
    html = html.replace(
        '<h1 class="cat-hero__title">Индукционные плавильные печи для&nbsp;стали и&nbsp;чугуна</h1>',
        '<h1 class="cat-hero__title">Индукционные транзисторные плавильные&nbsp;печи</h1>',
    )
    html = html.replace(
        '''      <p class="cat-hero__subtitle">
        Модельный ряд собственного производства для&nbsp;плавки чёрных и&nbsp;цветных металлов — от&nbsp;100&nbsp;кг до&nbsp;15&nbsp;тонн загрузки. Гарантия 18&nbsp;месяцев, ввод в&nbsp;эксплуатацию под&nbsp;ключ.
      </p>''',
        '''      <p class="cat-hero__subtitle">
        Печи на&nbsp;транзисторных IGBT-модулях для&nbsp;плавки стали, чугуна, меди, алюминия и&nbsp;драгметаллов — от&nbsp;1 до&nbsp;100&nbsp;кг по&nbsp;стали (до&nbsp;250&nbsp;кг по&nbsp;меди). Компактные и&nbsp;экономичные, гарантия 18&nbsp;месяцев.
      </p>''',
    )
    # 3. s-lead каталога
    html = html.replace(
        '<p class="s-lead">Индукционные плавильные печи собственного производства — от&nbsp;100&nbsp;кг до&nbsp;15&nbsp;тонн загрузки. Подберите модель по&nbsp;массе плавки и&nbsp;мощности.</p>',
        '<p class="s-lead">14 моделей транзисторных печей собственного производства — меньшая масса загрузки, чем у&nbsp;тиристорных, компактность и&nbsp;низкое энергопотребление. Подберите модель по&nbsp;массе плавки и&nbsp;мощности.</p>',
    )

    # 4. Фильтр: опции массы (по стали/чугуну, транзисторная шкала)
    mass_panel_new = '''<div class="cf-panel" role="listbox" aria-label="Масса загрузки">
          <button type="button" class="cf-option" role="option" aria-selected="true" data-cf-option data-value="" data-label="любая">
            <span>Любая масса</span>
          </button>
          <button type="button" class="cf-option" role="option" aria-selected="false" data-cf-option data-value="up-5" data-label="до 5 кг">
            <span>До&nbsp;5&nbsp;кг</span>
            <span class="cf-option__meta">≤ 5</span>
          </button>
          <button type="button" class="cf-option" role="option" aria-selected="false" data-cf-option data-value="6-15" data-label="5 — 15 кг">
            <span>5&nbsp;— 15&nbsp;кг</span>
            <span class="cf-option__meta">5 – 15</span>
          </button>
          <button type="button" class="cf-option" role="option" aria-selected="false" data-cf-option data-value="16-50" data-label="15 — 50 кг">
            <span>15&nbsp;— 50&nbsp;кг</span>
            <span class="cf-option__meta">15 – 50</span>
          </button>
          <button type="button" class="cf-option" role="option" aria-selected="false" data-cf-option data-value="51-100" data-label="50 — 100 кг">
            <span>50&nbsp;— 100&nbsp;кг</span>
            <span class="cf-option__meta">50 – 100</span>
          </button>
        </div>'''
    html = re.sub(
        r'<div class="cf-panel" role="listbox" aria-label="Масса загрузки">.*?</div>\s*</div>\s*\n\s*<!-- Мощность -->',
        mass_panel_new + '\n      </div>\n\n      <!-- Мощность -->',
        html,
        count=1,
        flags=re.S,
    )

    # 5. Фильтр: опции мощности (транзисторная шкала) — литеральная замена 5 кнопок на 4
    power_old = '''          <button type="button" class="cf-option" role="option" aria-selected="false" data-cf-option data-value="up-250" data-label="до 250 кВт">
            <span>До&nbsp;250&nbsp;кВт</span>
            <span class="cf-option__meta">≤ 250</span>
          </button>
          <button type="button" class="cf-option" role="option" aria-selected="false" data-cf-option data-value="250-600" data-label="250 — 600 кВт">
            <span>250&nbsp;— 600&nbsp;кВт</span>
            <span class="cf-option__meta">250 – 600</span>
          </button>
          <button type="button" class="cf-option" role="option" aria-selected="false" data-cf-option data-value="600-1500" data-label="600 — 1500 кВт">
            <span>600&nbsp;— 1500&nbsp;кВт</span>
            <span class="cf-option__meta">600 – 1500</span>
          </button>
          <button type="button" class="cf-option" role="option" aria-selected="false" data-cf-option data-value="1500-4000" data-label="1500 — 4000 кВт">
            <span>1500&nbsp;— 4000&nbsp;кВт</span>
            <span class="cf-option__meta">1500 – 4000</span>
          </button>
          <button type="button" class="cf-option" role="option" aria-selected="false" data-cf-option data-value="4000+" data-label="более 4000 кВт">
            <span>Более&nbsp;4000&nbsp;кВт</span>
            <span class="cf-option__meta">&gt; 4000</span>
          </button>'''
    power_new = '''          <button type="button" class="cf-option" role="option" aria-selected="false" data-cf-option data-value="up-20" data-label="до 20 кВт">
            <span>До&nbsp;20&nbsp;кВт</span>
            <span class="cf-option__meta">≤ 20</span>
          </button>
          <button type="button" class="cf-option" role="option" aria-selected="false" data-cf-option data-value="21-50" data-label="20 — 50 кВт">
            <span>20&nbsp;— 50&nbsp;кВт</span>
            <span class="cf-option__meta">20 – 50</span>
          </button>
          <button type="button" class="cf-option" role="option" aria-selected="false" data-cf-option data-value="51-100" data-label="50 — 100 кВт">
            <span>50&nbsp;— 100&nbsp;кВт</span>
            <span class="cf-option__meta">50 – 100</span>
          </button>
          <button type="button" class="cf-option" role="option" aria-selected="false" data-cf-option data-value="100+" data-label="от 100 кВт">
            <span>От&nbsp;100&nbsp;кВт</span>
            <span class="cf-option__meta">≥ 100</span>
          </button>'''
    assert power_old in html, "power options block not found"
    html = html.replace(power_old, power_new)

    # 6. Счётчик
    html = html.replace(
        '<div class="catalog-filter__count" data-cf-count aria-live="polite">21 моделей</div>',
        '<div class="catalog-filter__count" data-cf-count aria-live="polite">14 моделей</div>',
    )

    # 7. Сетка карточек: заменяем содержимое .pcard-grid
    cards = "\n".join(pcard(m) for m in MODELS)
    html = re.sub(
        r'(<div class="pcard-grid">\n).*?(\n\s*</div>\s*\n\s*</div>\s*\n</section>\s*\n\s*<!-- =+\s*\n\s*SECTION DIVIDER)',
        r'\1' + cards.replace('\\', '\\\\') + r'\2',
        html,
        count=1,
        flags=re.S,
    )

    OUT_DIR.mkdir(parents=True, exist_ok=True)
    (OUT_DIR / "body.html").write_text(html, encoding="utf-8")

    # meta.json — берём inline_styles из po-stali, свои title/description
    base_meta = json.loads(SRC_META.read_text(encoding="utf-8"))
    meta = {
        "title": "Индукционные транзисторные плавильные печи — 14 моделей · УралИндуктор",
        "description": "Транзисторные плавильные печи на IGBT-модулях: загрузка от 1 до 100 кг по стали (до 250 кг по меди), мощность 7–150 кВт. 14 моделей собственного производства, гарантия 18 мес.",
        "inline_styles": base_meta["inline_styles"],
        "css_templates": base_meta.get("css_templates", []),
    }
    (OUT_DIR / "meta.json").write_text(json.dumps(meta, ensure_ascii=False, indent=2), encoding="utf-8")
    print(f"✅ Категория собрана: {OUT_DIR.relative_to(ROOT)}  ({len(MODELS)} карточек)")


if __name__ == "__main__":
    main()
