# -*- coding: utf-8 -*-
"""Синхронизация шапки, мобильного меню и подвала в разделе «Практикум».

Раздел собирает напарник своим инструментом и кладёт готовым HTML
в astro/public/praktikum/. Общие блоки (шапка, меню, подвал) он копирует
из сборки сайта на момент генерации — и они протухают при первой же правке
компонентов. Так и вышло: 34 страницы раздела остались без второго телефона
8 800, добавленного 01.10.2026.

Скрипт берёт эти три блока из свежесобранной astro/dist/index.html и
подставляет их в страницы раздела. Собственное содержимое страниц
не трогается.

Запуск после npm run build (из корня проекта):
    python scripts/sync-praktikum-chrome.py            # показать расхождения
    python scripts/sync-praktikum-chrome.py --apply    # записать
"""
import io
import os
import re
import sys

APPLY = '--apply' in sys.argv
SRC = 'astro/dist/index.html'
ROOT = 'astro/public/praktikum'

MOBILE_FIXES_LINK = '<link rel="stylesheet" href="/css/mobile-fixes.css?v=20261002b">'

# (имя, начало, конец) — границы общих блоков, одинаковые в обеих сборках
BLOCKS = [
    ('шапка', r'<div class="header-shell">', r'</header>'),
    ('мобильное меню', r'<aside class="nav-drawer"', r'</aside>'),
    ('подвал', r'<footer class="footer">', r'</footer>'),
]


def cut(html, start, end, where):
    i = html.find(start) if not start.startswith('<aside') else html.find('<aside class="nav-drawer"')
    m = re.search(start, html)
    if not m:
        raise SystemExit('не найдено начало блока %s в %s' % (start, where))
    j = html.find(end, m.start())
    if j < 0:
        raise SystemExit('не найден конец блока %s в %s' % (end, where))
    return m.start(), j + len(end)


def main():
    if not os.path.isfile(SRC):
        raise SystemExit('нет %s — сначала npm run build' % SRC)
    src = io.open(SRC, encoding='utf-8', errors='replace').read()
    fresh = {}
    for name, start, end in BLOCKS:
        a, b = cut(src, start, end, SRC)
        fresh[name] = src[a:b]

    pages = []
    for root, _, fs in os.walk(ROOT):
        if 'index.html' in fs:
            pages.append(os.path.join(root, 'index.html'))
    pages.sort()

    changed, same = 0, 0
    for p in pages:
        html = io.open(p, encoding='utf-8', errors='replace').read()
        new = html
        touched = []
        # Наш mobile-fixes.css страницы раздела не подключают: на сайте он
        # инлайнится через BaseLayout, а эти страницы собираются отдельно.
        # Без него верхняя строка контактов не ужимается, и на 390 px
        # мессенджеры уезжают за экран на 57 px.
        if '/css/mobile-fixes.css' not in new:
            m = re.search(r'<link[^>]+href="/css/praktikum-nav-v26\.css[^"]*"[^>]*>', new)
            if m:
                new = new[:m.end()] + MOBILE_FIXES_LINK + new[m.end():]
                touched.append('mobile-fixes.css')
        for name, start, end in BLOCKS:
            a, b = cut(new, start, end, p)
            if new[a:b] != fresh[name]:
                new = new[:a] + fresh[name] + new[b:]
                touched.append(name)
        if touched:
            changed += 1
            print('%-58s обновлено: %s' % (os.path.relpath(p, ROOT), ', '.join(touched)))
            if APPLY:
                io.open(p, 'w', encoding='utf-8', errors='surrogateescape',
                        newline='').write(new)
        else:
            same += 1

    print('\nстраниц раздела: %d, обновлено: %d, уже совпадали: %d' % (len(pages), changed, same))
    print('записано' if APPLY else '(сухой прогон)')


main()
