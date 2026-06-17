#!/usr/bin/env python3
"""
B-3: группировка дельт блобов по типам страниц.

После B-2 в meta.json остаются дельта-блобы (ядро уже в site.css). 448 страниц
несут БАЙТ-идентичные копии своего блоба, разбитые на 10 групп по типам страниц
(товарная карточка A/B/C, проект, хаб, категория, legal). Правка шаблона = правка
448 JSON-копий.

Этот скрипт выносит каждый distinct-блоб многостраничной группы в именованный
файл astro/public/css/tpl/<тип>.css и заменяет в meta.json блоб ссылкой
(`css_templates`). 69 одиночных блобов остаются inline (дедуплицировать нечего).

БЕЗОПАСНОСТЬ КАСКАДА: блоб уезжает ЦЕЛИКОМ (base+@media в исходном порядке) на ту
же позицию <head> (<link> вместо inline <style>, после site.css). Это байт-в-байт
тот же CSS на той же позиции каскада → нулевой риск каскадной ловушки B-2.
В отличие от B-2 здесь блоб НЕ разбивается, поэтому симуляция не нужна — но мы
всё равно строим из меты только ссылку, а контент файла = (блоб − <style> + url-fix),
тот же, что породил бы extractInlineStyles() для external-хэша.

Запуск:  python3 scripts/oneoff/css-group-templates.py            # dry-run
         python3 scripts/oneoff/css-group-templates.py --apply
"""
import json, glob, os, re, sys
from collections import defaultdict, Counter

HERE = os.path.dirname(__file__)
ROOT = os.path.abspath(os.path.join(HERE, '..', '..', 'astro', 'src', 'raw-pages'))
TPL_DIR = os.path.abspath(os.path.join(HERE, '..', '..', 'astro', 'public', 'css', 'tpl'))
APPLY = '--apply' in sys.argv

# Имена файлов в порядке (размер группы убыв., минимальный путь возр.) —
# детерминированный порядок, совпадает с типами страниц.
NAMES = [
    'proekt',                    # 176 — карточки проектов
    'tovar-a',                   # 125 — товарная карточка (дробемёты/охлаждение/ковши/вакуум)
    'tovar-b',                   #  98 — товарная карточка (нагреватели/плавильные печи)
    'tovar-c',                   #  23 — товарная карточка (муфельные/ковши/запчасти) + /nalichie/
    'tovar-drobemet-shvellera',  #  12 — карточки дробемётов «для швеллера»
    'hub-catalog',               #   5 — хабы разделов (дробемёты/муфельные/ковши/вакуум/запчасти)
    'kategoriya-pechi',          #   3 — категории плавильных печей (сталь/медь/алюминий)
    'legal',                     #   2 — /policy/ + /soglasie/
    'hub-drobemet',              #   2 — хабы дробемётов (барабанного/кранового типа)
    'tovar-kranovogo',           #   2 — товарные карточки дробемётов кранового типа
]

def strip_wrap(blob):
    return re.sub(r'^\s*<style[^>]*>', '', blob).replace('</style>', '').strip()

def rewrite_urls(css):
    css = re.sub(r"url\((['\"]?)\.\./img/", r"url(\1/img/", css)
    css = re.sub(r"url\((['\"]?)\.\./brand/", r"url(\1/brand/", css)
    css = re.sub(r"url\((['\"]?)\./img/", r"url(\1/img/", css)
    css = re.sub(r"url\((['\"]?)\./brand/", r"url(\1/brand/", css)
    return css

metas = sorted(glob.glob(os.path.join(ROOT, '**', 'meta.json'), recursive=True))
groups = defaultdict(list)
for f in metas:
    m = json.load(open(f))
    blob = '\n'.join(m.get('inline_styles', []))
    groups[blob].append(f)

multi = [(k, v) for k, v in groups.items() if len(v) >= 2]
multi.sort(key=lambda kv: (-len(kv[1]), min(os.path.relpath(os.path.dirname(f), ROOT) for f in kv[1])))

if len(multi) != len(NAMES):
    print(f"!!! ожидалось {len(NAMES)} групп, найдено {len(multi)} — данные изменились, проверь NAMES")
    sys.exit(1)

total_pages = sum(len(v) for _, v in multi)
print(f"многостраничных групп: {len(multi)} | страниц в них: {total_pages} | одиночек: "
      f"{sum(1 for _, v in groups.items() if len(v) == 1)}")

old_bytes = sum(len('\n'.join(json.load(open(f)).get('inline_styles', []))) for f in metas)

plan = []  # (name, path, css, member_files)
for (blob, files), name in zip(multi, NAMES):
    css = rewrite_urls(strip_wrap(blob)) + '\n'
    # манифест-шапка: какие разделы используют этот шаблон
    secs = Counter(
        os.path.relpath(os.path.dirname(f), ROOT).split('/')[1]
        if os.path.relpath(os.path.dirname(f), ROOT).startswith('products/')
        else os.path.relpath(os.path.dirname(f), ROOT).split('/')[0]
        for f in files
    )
    head = (f"/* B-3 шаблон «{name}» — {len(files)} страниц. Правка здесь = правка всех.\n"
            f"   Разделы: {', '.join(f'{k} ({v})' for k, v in secs.most_common())}.\n"
            f"   Грузится <link>'ом в <head> ПОСЛЕ site.css (та же позиция, что был inline-блоб). */\n")
    plan.append((name, os.path.join(TPL_DIR, name + '.css'), head + css, files))

print("\nМанифест:")
for name, path, css, files in plan:
    print(f"  /css/tpl/{name}.css  ← {len(files):3d} стр  ({len(css)/1024:.1f}KB)")

new_bytes = old_bytes - sum(len('\n'.join(json.load(open(f)).get('inline_styles', [])))
                            for _, _, _, files in plan for f in files)
print(f"\nCSS в блобах meta.json: {old_bytes/1024/1024:.1f} MB → {new_bytes/1024/1024:.1f} MB "
      f"(вынесено {len(plan)} файлов, {total_pages} страниц очищено)")

if not APPLY:
    print("\n[dry-run] запусти с --apply, чтобы записать файлы и обновить meta.json.")
    sys.exit(0)

os.makedirs(TPL_DIR, exist_ok=True)
for name, path, css, files in plan:
    open(path, 'w').write(css)
    href = f"/css/tpl/{name}.css"
    for f in files:
        m = json.load(open(f))
        m['inline_styles'] = []
        m['css_templates'] = [href]
        json.dump(m, open(f, 'w'), ensure_ascii=False, indent=2)
print(f"\nзаписано {len(plan)} файлов в {TPL_DIR}")
print(f"обновлено meta.json: {total_pages}")
