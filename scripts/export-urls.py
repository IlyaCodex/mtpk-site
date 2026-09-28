# -*- coding: utf-8 -*-
"""Выгрузка адресов раздела в Excel — для отправки на переобход в Вебмастере.

Источник — собранный astro/dist (то, что реально лежит на проде), а не
исходники: так в список попадают только страницы, которые отдаёт сервер.
Заодно проверяем, что страница есть в sitemap и не закрыта noindex —
такие в переобход слать бессмысленно.

Запуск (из корня проекта, после npm run build):
    python scripts/export-urls.py
    python scripts/export-urls.py --all      # весь сайт, а не только каталог

Результат: exports/urls-<дата>.xlsx
"""
import datetime
import io
import json
import os
import re
import sys

from openpyxl import Workbook
from openpyxl.styles import Alignment, Font, PatternFill
from openpyxl.utils import get_column_letter

SITE = 'https://uralinduktor.ru'
DIST = 'astro/dist'
OUT_DIR = 'exports'

# порядок разделов = порядок в выгрузке; первым совпадением и определяется раздел
SECTIONS = [
    ('products/zapchasti/drobemetnoe', 'Запчасти — для дробемётных установок'),
    ('products/zapchasti/tranzistornye', 'Запчасти — для транзисторных установок'),
    ('products/zapchasti/induktsionnoe', 'Запчасти — для индукционных печей'),
    ('products/zapchasti/futerovochnye-smesi', 'Запчасти — футеровочные смеси'),
    ('products/zapchasti', 'Запчасти — хаб раздела'),
    ('products/drobemetnoe-oborudovanie', 'Дробемётные установки'),
    ('products/induktsionnye-plavilnye-pechi', 'Индукционные плавильные печи'),
    ('products/induktsionnye-nagrevateli', 'Индукционные нагреватели'),
    ('products/stalerozlivochnye-kovshi', 'Сталеразливочные ковши'),
    ('products/stendy-sushki-i-nagreva-kovshej', 'Стенды сушки и нагрева ковшей'),
    ('products/sistemy-ohlazhdeniya', 'Системы охлаждения'),
    ('products/peskostruynoe-oborudovanie', 'Пескоструйное оборудование'),
]


def sitemap_urls():
    for name in ('sitemap-0.xml', 'sitemap.xml'):
        p = os.path.join(DIST, name)
        if os.path.exists(p):
            xml = io.open(p, encoding='utf-8').read()
            return {u.replace(SITE, '') for u in re.findall(r'<loc>(.*?)</loc>', xml)}
    return set()


def page_info(path):
    html = io.open(path, encoding='utf-8').read()
    title = re.search(r'<title>(.*?)</title>', html, re.S)
    robots = re.search(r'<meta name="robots"[^>]*>', html)
    return (title.group(1).strip() if title else '',
            bool(robots) and 'noindex' in robots.group(0))


def collect():
    in_sitemap = sitemap_urls()
    seen, rows = set(), []
    for prefix, label in SECTIONS:
        found = []
        for root, _, files in os.walk(os.path.join(DIST, prefix)):
            if 'index.html' not in files:
                continue
            url = '/' + os.path.relpath(root, DIST).replace(os.sep, '/') + '/'
            if url in seen:
                continue
            seen.add(url)
            title, noindex = page_info(os.path.join(root, 'index.html'))
            found.append((url, label, title, noindex, url in in_sitemap))
        # хаб раздела первым, дальше по алфавиту
        found.sort(key=lambda r: (r[0].count('/'), r[0]))
        rows += found
    return rows


def write_xlsx(rows, path):
    wb = Workbook()
    head_font = Font(bold=True, color='FFFFFF')
    head_fill = PatternFill('solid', fgColor='2F6B4F')

    ws = wb.active
    ws.title = 'Адреса'
    ws.append(['URL', 'Раздел', 'Заголовок страницы'])
    for url, label, title, noindex, in_sm in rows:
        ws.append([SITE + url, label, title])
    for c in range(1, 4):
        cell = ws.cell(row=1, column=c)
        cell.font, cell.fill = head_font, head_fill
        cell.alignment = Alignment(vertical='center')
    for c, w in ((1, 92), (2, 40), (3, 80)):
        ws.column_dimensions[get_column_letter(c)].width = w
    ws.freeze_panes = 'A2'
    ws.auto_filter.ref = 'A1:C%d' % (len(rows) + 1)

    sw = wb.create_sheet('Сводка')
    sw.append(['Раздел', 'Страниц'])
    counts = {}
    for _, label, _, _, _ in rows:
        counts[label] = counts.get(label, 0) + 1
    for _, label in SECTIONS:
        if label in counts:
            sw.append([label, counts[label]])
    sw.append(['ИТОГО', len(rows)])
    for c in range(1, 3):
        sw.cell(row=1, column=c).font = head_font
        sw.cell(row=1, column=c).fill = head_fill
    sw.cell(row=sw.max_row, column=1).font = Font(bold=True)
    sw.cell(row=sw.max_row, column=2).font = Font(bold=True)
    sw.column_dimensions['A'].width = 44
    sw.column_dimensions['B'].width = 12

    wb.save(path)


def main():
    if not os.path.isdir(DIST):
        sys.exit('нет %s — сначала cd astro && npm run build' % DIST)
    rows = collect()
    bad = [r for r in rows if r[3] or not r[4]]
    if bad:
        print('ВНИМАНИЕ, на переобход не годятся (noindex или нет в sitemap):')
        for r in bad:
            print('   %s  noindex=%s в sitemap=%s' % (r[0], r[3], r[4]))
        rows = [r for r in rows if not r[3] and r[4]]

    os.makedirs(OUT_DIR, exist_ok=True)
    stamp = datetime.date.today().isoformat()
    xlsx = os.path.join(OUT_DIR, 'urls-%s.xlsx' % stamp)
    write_xlsx(rows, xlsx)
    txt = os.path.join(OUT_DIR, 'urls-%s.txt' % stamp)
    io.open(txt, 'w', encoding='utf-8', newline='\n').write(
        '\n'.join(SITE + r[0] for r in rows) + '\n')

    print('страниц в выгрузке: %d' % len(rows))
    print('  %s' % xlsx)
    print('  %s (тот же список простым текстом — удобно вставлять в Вебмастер)' % txt)


if __name__ == '__main__':
    main()
