#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
ТЗ-2 п.3 — «Запросить цену»: скролл к форме + накопление позиций.

Идемпотентные правки HTML товарных и категорийных страниц:
  1. Нормализация всех кнопок «Запросить цену»:
     href → "#leadgen", добавлен класс js-quote-btn (маркер для quote-form.js).
       • pcard:  class="btn btn--primary btn--block"  (карточки в категориях)
       • phero:  class="btn btn--primary"             (страница товара)
  2. На товарных страницах (class="phero") без блока Leadgen — вставить
     <!--C:leadgen--> перед <!--C:best-offer--> (полная форма с textarea задачи).

Кнопки «Получить расчёт» НЕ трогаем — это общие CTA секций без привязки к позиции.
Скрипт безопасно перезапускать (уже изменённые файлы пропускаются).
"""
import os
import re
import glob

ROOT = os.path.join(os.path.dirname(__file__), '..', '..', 'src', 'raw-pages')
ROOT = os.path.normpath(ROOT)

# pcard-кнопка (в карточке категории): любой href → #leadgen + js-quote-btn
RE_PCARD = re.compile(r'<a href="[^"]*" class="btn btn--primary btn--block">Запросить цену')
PCARD_NEW = '<a href="#leadgen" class="btn btn--primary btn--block js-quote-btn">Запросить цену'

# phero-кнопка (на странице товара): любой href → #leadgen + js-quote-btn
RE_PHERO = re.compile(r'<a href="[^"]*" class="btn btn--primary">Запросить цену')
PHERO_NEW = '<a href="#leadgen" class="btn btn--primary js-quote-btn">Запросить цену'

btn_files = 0
btn_count = 0
leadgen_inserted = 0

for path in glob.glob(os.path.join(ROOT, '**', 'body.html'), recursive=True):
    with open(path, encoding='utf-8') as f:
        src = f.read()
    out = src

    out, n1 = RE_PCARD.subn(PCARD_NEW, out)
    out, n2 = RE_PHERO.subn(PHERO_NEW, out)
    if n1 + n2:
        btn_files += 1
        btn_count += n1 + n2

    # Вставка полной формы на товарную страницу без leadgen
    if ('class="phero"' in out
            and '<!--C:leadgen-->' not in out
            and '<!--C:best-offer-->' in out):
        out = out.replace('<!--C:best-offer-->',
                          '<!--C:leadgen-->\n<!--C:best-offer-->', 1)
        leadgen_inserted += 1

    if out != src:
        with open(path, 'w', encoding='utf-8') as f:
            f.write(out)

print(f'Кнопок нормализовано: {btn_count} в {btn_files} файлах')
print(f'Блок <!--C:leadgen--> вставлен на {leadgen_inserted} товарных страниц')
