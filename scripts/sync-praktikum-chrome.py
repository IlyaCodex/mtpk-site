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

MOBILE_FIXES_LINK = '<link rel="stylesheet" href="/css/mobile-fixes.css?v=20261005a">'


def drop_stale_inline_css(html):
    """Выкидываем инлайн-копию mobile-fixes.css из старой сборки.

    Страницы раздела сгенерированы с того варианта сайта, где mobile-fixes
    инлайнился в <head>. Копия застыла и лежит ПОСЛЕ всех <link>, поэтому
    побеждала свежий файл: в ней у кнопок меню остался белый цвет от тёмного
    дровера — на новых белых карточках подписи «Каталог» и «Услуги» исчезали
    (замечено Евгением 05.10.2026). Файл подключается ссылкой, копия лишняя.
    """
    for m in re.finditer(r'(?s)<style[^>]*>(.*?)</style>', html):
        body = m.group(1)
        if 'mobile-fixes.css' in body and '.nav-drawer__panel' in body:
            return html[:m.start()] + html[m.end():], True
    return html, False


def sync_css_links(html, src):
    """Подключения CSS в разделе — те же файлы, версии и порядок, что на сайте.

    Страницы раздела собираются отдельно, и их <link> на наши стили застывают
    на версии, какая была в момент генерации. А `/css/` отдаётся с
    `immutable` на год: правка файла до вернувшегося посетителя не дойдёт,
    пока не сменится `?v=`. Отсюда расхождения вроде «на сайте меню
    переделали, а в практикуме старое».

    Берём адреса из свежесобранной главной: если такой файл в странице уже
    подключён — обновляем версию, если нет — вставляем. mobile-fixes.css на
    сайте инлайнится, поэтому его адрес задан константой выше.
    """
    # Только общие стили. Постраничные (tpl/*, inline-extracted/*) у главной
    # свои, и в раздел их тащить незачем.
    SHARED = ('site', 'praktikum-nav-v26', 'audit-fixes-20261002')
    want = {}
    for m in re.finditer(r'<link[^>]+href="(/css/([^"?]+)\.css)(\?v=[^"]*)?"[^>]*>', src):
        if m.group(2) in SHARED:
            want[m.group(2)] = m.group(1) + (m.group(3) or '')
    mf = re.search(r'href="(/css/mobile-fixes\.css[^"]*)"', MOBILE_FIXES_LINK)
    want['mobile-fixes'] = mf.group(1)

    # Порядок как в собранной странице сайта: mobile-fixes ПОСЛЕДНИМ.
    # Он перебивает site.css на равной специфичности — в нём, например,
    # медиазапрос, который показывает гамбургер: в site.css у .nav-toggle
    # стоит display:none, и если mobile-fixes идёт раньше, кнопка меню
    # пропадает совсем (проверено 05.10.2026 — так и сломалось).
    ORDER = ['site', 'praktikum-nav-v26', 'audit-fixes-20261002', 'mobile-fixes']
    hrefs = [want[b] for b in ORDER if b in want]
    block = ''.join('<link rel="stylesheet" href="%s">' % h for h in hrefs)

    spots, old = [], []
    for base in ORDER:
        m = re.search(r'<link[^>]+href="/css/%s\.css[^"]*"[^>]*>' % re.escape(base), html)
        if m:
            spots.append(m.start())
            old.append(m.group(0))
    if not spots:
        return html, []
    was = ''.join(old)
    if was == block and html.find(block) == min(spots):
        return html, []                       # уже всё как надо

    for tag in old:                           # убираем старые подключения
        html = html.replace(tag, '', 1)
    at = re.search(r'<link[^>]+href="/css/[^"]*"[^>]*>', html)
    pos = at.start() if at else min(spots)
    html = html[:pos] + block + html[pos:]
    return html, ['подключения CSS: %d файлов, порядок и версии' % len(hrefs)]


def standard_breadcrumbs(html):
    """Крошки раздела — на классах сайта, чтобы выглядели как везде.

    У напарника свои: <nav class="praktikum-breadcrumbs"> с зелёными ссылками
    и <span aria-hidden="true">/</span>. Переводим на .breadcrumb из site.css
    (его страницы раздела подключают) с разделителем .breadcrumb__sep —
    тогда типографика и цвета совпадают со всем сайтом без отдельных правил.
    Класс praktikum-breadcrumbs оставляем: на нём держатся ширина и отступы.
    """
    m = re.search(r'<nav class="praktikum-breadcrumbs"([^>]*)>([\s\S]*?)</nav>', html)
    if not m or 'breadcrumb__sep' in m.group(2):
        return html, False
    inner = re.sub(r'<span[^>]*aria-hidden="true"[^>]*>\s*/\s*</span>',
                   '<span class="breadcrumb__sep">/</span>', m.group(2))
    inner = re.sub(r'\s+', ' ', inner).strip()
    new = ('<nav class="breadcrumb praktikum-breadcrumbs"%s>%s</nav>' % (m.group(1), inner))
    return html[:m.start()] + new + html[m.end():], True

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
        new, dropped = drop_stale_inline_css(new)
        if dropped:
            touched.append('убрана инлайн-копия mobile-fixes')
        new, css = sync_css_links(new, src)
        touched += css
        new, crumbs = standard_breadcrumbs(new)
        if crumbs:
            touched.append('крошки на классах сайта')
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
