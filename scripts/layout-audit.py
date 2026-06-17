#!/usr/bin/env python3
"""
Аудит верстки (статическая часть): анализирует astro/src/raw-pages/
без браузера. Запуск из корня проекта:  python3 scripts/layout-audit.py

Что проверяет:
1. CSS-блобы в meta.json — сколько, насколько одинаковые, размер «общего ядра».
2. Инлайн-стили style="..." в body.html — где и сколько, фиксированные ширины.
3. WP-наследие в HTML: width=/height=, устаревшие теги, align=.
Результат печатает в stdout (для отчёта docs/layout-audit.md).
"""
import json, glob, hashlib, re, os, sys
from collections import Counter

ROOT = os.path.join(os.path.dirname(__file__), '..', 'astro', 'src', 'raw-pages')
ROOT = os.path.abspath(ROOT)

# ---------- 1. CSS-блобы из meta.json ----------
def split_rules(css: str):
    """Грубо режем CSS на правила (селектор{тело}) для сравнения блобов."""
    css = re.sub(r'/\*.*?\*/', '', css, flags=re.S)
    rules = re.findall(r'[^{}]+\{[^{}]*\}', css)
    return [re.sub(r'\s+', ' ', r).strip() for r in rules]

metas = sorted(glob.glob(os.path.join(ROOT, '**', 'meta.json'), recursive=True))
blob_of = {}          # file -> blob text
groups = {}           # hash -> [files]
for f in metas:
    m = json.load(open(f))
    blob = '\n'.join(m.get('inline_styles', []))
    blob_of[f] = blob
    h = hashlib.md5(blob.encode()).hexdigest()[:10]
    groups.setdefault(h, []).append(f)

sizes = {f: len(b) for f, b in blob_of.items()}
total_mb = sum(sizes.values()) / 1024 / 1024
uniq = {h: fs for h, fs in groups.items()}
biggest = sorted(uniq.items(), key=lambda kv: -len(kv[1]))

print(f"== CSS-блобы ==")
print(f"страниц с meta.json: {len(metas)}")
print(f"суммарный CSS во всех блобах: {total_mb:.1f} MB")
print(f"уникальных блобов: {len(uniq)}")
print(f"топ-групп по числу страниц: {[len(fs) for h, fs in biggest[:8]]}")

# Общее ядро: правила, входящие во ВСЕ уникальные блобы (по одному представителю группы)
reps = [blob_of[fs[0]] for h, fs in biggest]
rule_sets = [set(split_rules(b)) for b in reps if b.strip()]
if rule_sets:
    core = set.intersection(*rule_sets)
    base = rule_sets[0]
    core_chars = sum(len(r) for r in core)
    base_chars = sum(len(r) for r in base)
    print(f"правил в самом частом блобе: {len(base)} ({base_chars/1024:.0f} KB)")
    print(f"общее ядро (есть во всех {len(rule_sets)} вариантах): "
          f"{len(core)} правил ({core_chars/1024:.0f} KB, "
          f"{100*core_chars/max(base_chars,1):.0f}% частого блоба)")
    # Насколько каждый вариант отличается от ядра
    deltas = sorted((len(s - core) for s in rule_sets), reverse=True)
    print(f"уникальных правил сверх ядра по вариантам (топ-10): {deltas[:10]}")

# ---------- 2. Инлайн-стили в body.html ----------
print(f"\n== Инлайн-стили в body.html ==")
bodies = sorted(glob.glob(os.path.join(ROOT, '**', 'body.html'), recursive=True))
inline_total = 0
per_page = Counter()
fixed_width = Counter()   # фиксированные ширины >375px — ломают мобильную
for f in bodies:
    html = open(f, encoding='utf-8', errors='replace').read()
    styles = re.findall(r'style="([^"]*)"', html)
    if styles:
        rel = os.path.relpath(f, ROOT)
        per_page[rel] = len(styles)
        inline_total += len(styles)
        for s in styles:
            for w in re.findall(r'width:\s*(\d+)px', s):
                if int(w) > 375:
                    fixed_width[rel] += 1
print(f"всего style=\"...\": {inline_total} на {len(per_page)} страницах (из {len(bodies)})")
print("топ-10 страниц:")
for p, n in per_page.most_common(10):
    print(f"  {n:3d}  {p}")
print(f"страниц с фикс. шириной >375px в инлайнах: {len(fixed_width)}")
for p, n in fixed_width.most_common(10):
    print(f"  {n:3d}  {p}")

# ---------- 3. WP-наследие в HTML ----------
print(f"\n== WP-наследие в HTML ==")
checks = {
    'width=/height= атрибуты (не на img)': re.compile(r'<(?!img)\w+[^>]*\s(?:width|height)="\d+"'),
    'устаревшие теги (<font>, <center>, <big>)': re.compile(r'<(font|center|big)[\s>]'),
    'align= атрибут': re.compile(r'\salign="(left|right|center)"'),
    'пустые <p>&nbsp;</p>': re.compile(r'<p[^>]*>(\s|&nbsp;)*</p>'),
}
for name, rx in checks.items():
    pages = Counter()
    for f in bodies:
        html = open(f, encoding='utf-8', errors='replace').read()
        n = len(rx.findall(html))
        if n:
            pages[os.path.relpath(f, ROOT)] = n
    total = sum(pages.values())
    print(f"{name}: {total} вхождений на {len(pages)} страницах")
    for p, n in pages.most_common(3):
        print(f"    {n:3d}  {p}")
