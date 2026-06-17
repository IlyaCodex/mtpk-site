#!/usr/bin/env python3
"""
ТЗ-2 п.4 — нагреватели + ковши, три точечных правки:
(а) Срок доставки → «60–95 дней» во всех местах (3–10, 30–60, 35–60).
(б) Убрать все упоминания шефмонтажа (5 типовых фраз + хабы).
(в) Убрать «собственное производство в Миассе» в SEO descriptions.

Скрипт идемпотентный (повторный запуск ничего не сломает).
"""
import re
import sys
from pathlib import Path

ROOT = Path("astro/src/raw-pages/products")
DIRS = [
    ROOT / "induktsionnye-nagrevateli",
    ROOT / "stalerozlivochnye-kovshi",
]

# Замены порядково: список (label, pattern, replacement, flags)
NBSP = "\xa0"  # unused — в исходниках буквальное "&nbsp;"

REPLACEMENTS = [
    # === НАГРЕВАТЕЛИ — phero-fact (54 товарных) ===
    (
        "phero-fact нагревателей: доставка + шефмонтаж",
        r"Доставка по&nbsp;РФ — <strong>3–10 дней</strong>, шеф-монтаж и&nbsp;пусконаладка нашей бригадой",
        r"Доставка по&nbsp;РФ — <strong>60–95 дней</strong>",
    ),
    # === НАГРЕВАТЕЛИ — intro-card перечисление ===
    (
        "intro-card нагревателей: «...шефмонтаж, обучение...»",
        r"подбор по&nbsp;вашей задаче, шефмонтаж, обучение операторов",
        r"подбор по&nbsp;вашей задаче, обучение операторов",
    ),
    # === НАГРЕВАТЕЛИ — spec-tab «Монтаж и пусконаладка» ===
    (
        "spec-tab нагревателей: «Шеф-монтаж и пусконаладку выполняет»",
        r"Шеф-монтаж и&nbsp;пусконаладку выполняет наша инженерная бригада",
        r"Пусконаладку выполняет наша инженерная бригада",
    ),
    # === КОВШИ — phero-fact: сроки доставки ===
    (
        "phero-fact ковшей: «по Челябинской — 1-3, по РФ — 3-10»",
        r"Доставка: по&nbsp;Челябинской области — <strong>1–3 дня</strong>, по&nbsp;РФ — <strong>3–10 дней</strong>",
        r"Доставка по&nbsp;РФ — <strong>60–95 дней</strong>",
    ),
    # === КОВШИ — spec-opisanie ===
    (
        "spec-opisanie ковшей: «за 30-60 дней, шеф-монтаж и футеровку»",
        r"Изготавливаем под&nbsp;заказ за&nbsp;30–60 дней, шеф-монтаж и&nbsp;футеровку выполняет",
        r"Изготавливаем под&nbsp;заказ за&nbsp;60–95 дней, футеровку выполняет",
    ),
    # === КОВШИ — spec-tab «Монтаж и пусконаладка» ===
    (
        "spec-tab ковшей: «Шеф-монтаж и футеровку выполняет»",
        r"Шеф-монтаж и&nbsp;футеровку выполняет наша инженерная бригада",
        r"Футеровку выполняет наша инженерная бригада",
    ),
    # === ХАБ НАГРЕВАТЕЛЕЙ — intro-card 1 ===
    (
        "хаб нагревателей intro-card 1: «ведёт шефмонтаж, пусконаладку»",
        r"ведёт шефмонтаж, пусконаладку и&nbsp;сервисное сопровождение",
        r"ведёт пусконаладку и&nbsp;сервисное сопровождение",
    ),
    # === ХАБ НАГРЕВАТЕЛЕЙ — intro-card 2: срок «до 95 раб. дней» и «шеф-монтируем» ===
    (
        "хаб нагревателей intro-card 2: срок «до 95 раб. дней»",
        r"изготавливаем за&nbsp;<strong>до&nbsp;95&nbsp;рабочих&nbsp;дней</strong>",
        r"изготавливаем за&nbsp;<strong>60–95&nbsp;дней</strong>",
    ),
    (
        "хаб нагревателей intro-card 2: «шеф-монтируем нашей бригадой,»",
        r"шеф-монтируем нашей бригадой, ",
        r"",
    ),
    # === ХАБ НАГРЕВАТЕЛЕЙ — s-lead в разделе «Один поставщик» ===
    (
        "хаб нагревателей s-lead: «шеф-монтируем на площадке,»",
        r"шеф-монтируем на&nbsp;площадке, ",
        r"",
    ),
    # === ХАБ ОБОИХ — cycle-step Производство в Миассе (30-60 / 35-60 → 60-95) ===
    (
        "cycle-step Производство 30–60 дней",
        r"<h3 class=\"cycle-step__title\">Производство в&nbsp;Миассе</h3><div class=\"cycle-step__meta\">30–60 дней</div>",
        r'<h3 class="cycle-step__title">Производство в&nbsp;Миассе</h3><div class="cycle-step__meta">60–95 дней</div>',
    ),
    (
        "cycle-step Производство 35–60 дней (multi-line)",
        r"<h3 class=\"cycle-step__title\">Производство в&nbsp;Миассе</h3>\s*<div class=\"cycle-step__meta\">35–60 дней</div>",
        r'<h3 class="cycle-step__title">Производство в&nbsp;Миассе</h3>\n        <div class="cycle-step__meta">60–95 дней</div>',
        re.DOTALL,
    ),
    # === ХАБ КОВШЕЙ — intro-card «изготовление за 30-60 дней... шеф-монтаж и обучение» ===
    (
        "хаб ковшей intro-card: срок 30–60 → 60–95",
        r"изготовление за&nbsp;<strong>30–60 дней</strong>",
        r"изготовление за&nbsp;<strong>60–95 дней</strong>",
    ),
    (
        "хаб ковшей intro-card: «шеф-монтаж и »",
        r"собственной логистикой, шеф-монтаж и&nbsp;<strong>обучение персонала</strong>",
        r"собственной логистикой, <strong>обучение персонала</strong>",
    ),
]

# Удаление cycle-step <li> с «Шеф-монтаж и ПНР» целиком — отдельная обработка
# (многострочный блок в нагревателях, однострочный в ковшах).
CYCLE_STEP_PNR_MULTILINE = re.compile(
    r"\s*<li class=\"cycle-step\">\s*"
    r"<div class=\"cycle-step__num\">05</div>\s*"
    r"<div class=\"cycle-step__icon\">\s*"
    r"<svg[^>]*>\s*"
    r"<path d=\"M22 6l-8 8-4-4-6 6 4 4 6-6 4 4 8-8z\"/>\s*"
    r"<path d=\"M22 6l4 4\"/>\s*"
    r"</svg>\s*"
    r"</div>\s*"
    r"<h3 class=\"cycle-step__title\">Шеф-монтаж и&nbsp;ПНР</h3>\s*"
    r"<div class=\"cycle-step__meta\">наша бригада, фикс\. срок</div>\s*"
    r"</li>",
    re.DOTALL,
)
CYCLE_STEP_PNR_INLINE = re.compile(
    r"\s*<li class=\"cycle-step\">"
    r"<div class=\"cycle-step__num\">05</div>"
    r"<div class=\"cycle-step__icon\"><svg[^>]*>"
    r"<path d=\"M22 6l-8 8-4-4-6 6 4 4 6-6 4 4 8-8z\"/>"
    r"<path d=\"M22 6l4 4\"/></svg></div>"
    r"<h3 class=\"cycle-step__title\">Шеф-монтаж и&nbsp;ПНР</h3>"
    r"<div class=\"cycle-step__meta\">наша бригада, фикс\. срок</div>"
    r"</li>"
)

# meta.json — SEO descriptions
META_PATTERNS = [
    # Нагреватели/ковши — варианты с маленькой буквы, разделитель «. »
    (
        r"\. собственное производство в Миассе, гарантия 18 месяцев",
        r". Гарантия 18 месяцев",
    ),
    # Хаб нагревателей — на конце предложения после запятой
    (
        r", собственное производство в Миассе\.",
        r".",
    ),
    # Ковши — отдельным предложением, с большой буквы
    (
        r" Собственное производство в Миассе\. Гарантия 18 месяцев",
        r" Гарантия 18 месяцев",
    ),
]


def apply_replacements(text: str, label_path: str) -> tuple[str, list[str]]:
    log = []
    for entry in REPLACEMENTS:
        if len(entry) == 3:
            label, pat, repl = entry
            flags = 0
        else:
            label, pat, repl, flags = entry
        new_text, n = re.subn(pat, repl, text, flags=flags)
        if n:
            log.append(f"  · {label}: {n}")
            text = new_text

    # Cycle-step Шеф-монтаж и ПНР — удалить
    new_text, n1 = CYCLE_STEP_PNR_MULTILINE.subn("", text)
    if n1:
        log.append(f"  · cycle-step «Шеф-монтаж и ПНР» (multiline): {n1}")
        text = new_text
    new_text, n2 = CYCLE_STEP_PNR_INLINE.subn("", text)
    if n2:
        log.append(f"  · cycle-step «Шеф-монтаж и ПНР» (inline): {n2}")
        text = new_text

    return text, log


def apply_meta(text: str) -> tuple[str, list[str]]:
    log = []
    for pat, repl in META_PATTERNS:
        new_text, n = re.subn(pat, repl, text)
        if n:
            log.append(f"  · meta «собственное производство»: {n}")
            text = new_text
    return text, log


def main():
    total_files = 0
    total_changed = 0

    for d in DIRS:
        print(f"\n=== {d} ===")
        for path in sorted(d.rglob("*")):
            if not path.is_file():
                continue
            if path.suffix not in {".html", ".json"}:
                continue
            total_files += 1
            original = path.read_text(encoding="utf-8")
            text = original

            if path.suffix == ".html":
                text, log = apply_replacements(text, str(path))
            else:  # .json
                text, log = apply_meta(text)

            if text != original:
                total_changed += 1
                path.write_text(text, encoding="utf-8")
                rel = path.relative_to(Path("astro/src/raw-pages/products"))
                print(f"M {rel}")
                for line in log:
                    print(line)

    print(f"\n=== Итог: {total_changed} изменено из {total_files} ===")


if __name__ == "__main__":
    main()
