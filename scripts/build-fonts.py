#!/usr/bin/env python3
"""
Скачивает Inter + JetBrains Mono с fonts.googleapis.com,
оставляет только latin + cyrillic подсеты (RU/EN сайт),
кладёт WOFF2 в astro/public/fonts/, переписывает src на локальные пути.

Запуск: python3 scripts/build-fonts.py
"""
import re
import urllib.request
from pathlib import Path

FONTS_CSS_URL = (
    "https://fonts.googleapis.com/css2"
    "?family=Inter:wght@300;400;500;600;700;800"
    "&family=JetBrains+Mono:wght@400;500;600"
    "&display=swap"
)
NEEDED_SUBSETS = {'latin', 'cyrillic'}
ROOT = Path(__file__).resolve().parent.parent
FONTS_DIR = ROOT / 'astro' / 'public' / 'fonts'
FONTS_DIR.mkdir(parents=True, exist_ok=True)

req = urllib.request.Request(FONTS_CSS_URL, headers={
    'User-Agent': 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 '
                  '(KHTML, like Gecko) Chrome/120.0 Safari/537.36'
})
CSS = urllib.request.urlopen(req).read().decode()

pattern = re.compile(r'/\*\s*(\S+)\s*\*/\s*(@font-face\s*\{[^}]+\})', re.DOTALL)
new_css_blocks, downloaded = [], {}

for m in pattern.finditer(CSS):
    subset, block = m.group(1), m.group(2)
    if subset not in NEEDED_SUBSETS:
        continue
    family = re.search(r"font-family:\s*'([^']+)'", block).group(1)
    weight = re.search(r'font-weight:\s*(\d+)', block).group(1)
    url = re.search(r"url\((https://[^)]+\.woff2)\)", block).group(1)
    slug = family.lower().replace(' ', '-')
    local_name = f"{slug}-{weight}-{subset}.woff2"
    if local_name not in downloaded:
        data = urllib.request.urlopen(
            urllib.request.Request(url, headers={'User-Agent': 'Mozilla/5.0'})
        ).read()
        (FONTS_DIR / local_name).write_bytes(data)
        downloaded[local_name] = len(data)
    block = re.sub(r'src:[^;]+;',
        f'src: url("/fonts/{local_name}") format("woff2");', block)
    if 'font-display' not in block:
        block = block.replace('font-family:', 'font-display: swap;\n  font-family:')
    new_css_blocks.append(f"/* {subset} */\n{block}")

header = (
    "/* Self-hosted Google Fonts subset (latin + cyrillic) — T-PERF-2.\n"
    " * Сгенерирован scripts/build-fonts.py. Не редактировать вручную.\n */\n\n"
)
(FONTS_DIR / 'fonts.css').write_text(header + "\n\n".join(new_css_blocks))

total = sum(downloaded.values())
print(f"✅ {len(downloaded)} WOFF2 файлов, итого {total/1024:.1f} KB")
