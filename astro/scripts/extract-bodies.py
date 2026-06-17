#!/usr/bin/env python3
"""
Extract per-page body + meta from production HTML snapshot for the
lift-and-shift Astro catch-all route.

For each raw-pages/**/index.html:
  - pull <title>, <meta description>, all <style> blocks from <head>
  - take <body> inner HTML
  - strip the global chrome that BaseLayout/Header/Footer/Drawer re-render:
      * <div class="header-shell"> ... </div><!-- /.header-shell -->
      * sticky-header inline <script> (querySelector('.header-shell'))
      * <footer class="footer"> ... </footer>
      * <aside ... nav-drawer ...> ... </aside>
      * <script src="/js/mobile-nav.js"> and phone-mask.js
  - write body.html + meta.json, remove the original index.html
"""
import re
import json
from pathlib import Path

src_root = Path(__file__).resolve().parent.parent / 'src' / 'raw-pages'

processed = 0
skipped = []
warnings = []

for html_path in sorted(src_root.rglob('index.html')):
    html = html_path.read_text(encoding='utf-8')

    head_m = re.search(r'<head[^>]*>(.*?)</head>', html, re.DOTALL | re.I)
    head = head_m.group(1) if head_m else ''
    title_m = re.search(r'<title>(.*?)</title>', head, re.DOTALL)
    title = title_m.group(1).strip() if title_m else ''
    desc_m = re.search(r'<meta\s+name="description"\s+content="(.*?)"', head, re.DOTALL)
    description = desc_m.group(1).strip() if desc_m else ''
    styles = re.findall(r'<style[^>]*>.*?</style>', head, re.DOTALL)

    body_m = re.search(r'<body[^>]*>(.*?)</body>', html, re.DOTALL | re.I)
    if not body_m:
        skipped.append(str(html_path))
        continue
    body = body_m.group(1)

    # 1. Strip header-shell wrapper (contacts row + header + partial).
    n_hs = len(re.findall(r'<div class="header-shell">.*?</div>\s*<!-- /\.header-shell -->', body, flags=re.DOTALL))
    body = re.sub(r'<div class="header-shell">.*?</div>\s*<!-- /\.header-shell -->', '', body, flags=re.DOTALL)
    if n_hs == 0:
        warnings.append(f"no header-shell stripped: {html_path}")

    # 2. Strip the sticky-header inline <script> (references .header-shell).
    body = re.sub(r'<script>\s*(?://[^\n]*\n)?\s*\(function\(\)\{[^<]*?\.header-shell[^<]*?\}\)\(\);?\s*</script>', '', body, flags=re.DOTALL)

    # 3. Strip footer.
    n_ft = len(re.findall(r'<footer class="footer">.*?</footer>', body, flags=re.DOTALL))
    body = re.sub(r'<footer class="footer">.*?</footer>', '', body, count=1, flags=re.DOTALL)
    if n_ft == 0:
        warnings.append(f"no footer stripped: {html_path}")

    # 4. Strip nav-drawer aside (with or without partial markers).
    n_dr = len(re.findall(r'<aside[^>]*class="[^"]*nav-drawer[^"]*"[^>]*>.*?</aside>', body, flags=re.DOTALL))
    body = re.sub(r'<aside[^>]*class="[^"]*nav-drawer[^"]*"[^>]*>.*?</aside>', '', body, count=1, flags=re.DOTALL)
    if n_dr == 0:
        warnings.append(f"no drawer stripped: {html_path}")

    # 5. Strip global JS that BaseLayout re-adds.
    body = re.sub(r'<script src="/js/(?:mobile-nav|phone-mask)\.js"[^>]*>\s*</script>', '', body)

    out = html_path.parent
    (out / 'body.html').write_text(body.strip() + '\n', encoding='utf-8')
    (out / 'meta.json').write_text(
        json.dumps({'title': title, 'description': description, 'inline_styles': styles},
                   ensure_ascii=False, indent=2),
        encoding='utf-8')
    html_path.unlink()
    processed += 1

print(f"Processed: {processed}")
if skipped:
    print(f"Skipped (no body): {len(skipped)}")
    for s in skipped[:20]:
        print("  ", s)
if warnings:
    print(f"Warnings: {len(warnings)}")
    for w in warnings[:30]:
        print("  ", w)
