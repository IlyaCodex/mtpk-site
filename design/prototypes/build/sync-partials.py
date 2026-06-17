#!/usr/bin/env python3
"""
sync-partials.py — синхронизация общих блоков (меню/футер) во всех прототипах.

Источники правды:
    design/prototypes/_partials/header.html
    design/prototypes/_partials/footer.html

В каждой странице (.html) под `design/prototypes/` нужный регион должен быть
обёрнут маркерами:

    <header class="header">
    <!-- @partial:header — GENERATED, DO NOT EDIT MANUALLY -->
        ...
    <!-- /@partial:header -->
    </header>

Скрипт находит регион между маркерами и заменяет его содержимое из партиала.
Если маркеры отсутствуют — скрипт ВПЕРВЫЕ их вставит на основе внутреннего
содержимого `<header class="header">...</header>` (и аналогично для footer),
после чего следующие запуски будут идемпотентны.

Запуск:
    python3 design/prototypes/build/sync-partials.py
    python3 design/prototypes/build/sync-partials.py --check   # только проверить

Возвращает ненулевой код, если что-то изменилось (полезно для CI).
"""
from __future__ import annotations

import argparse
import re
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent           # design/prototypes/
PARTIALS_DIR = ROOT / '_partials'
EXCLUDE_DIRS = {'_partials', '_archive', 'build', 'img', 'js', 'tokens'}
EXCLUDE_PATTERNS = [
    re.compile(r'-archive\.html$'),                # *-archive.html → snapshot
    re.compile(r'-v\d+(?!-dmgmori)\b'),            # index-v2-dark и т.п. (исключение: -v7-dmgmori актуален)
    re.compile(r'-dmgmori-v\d'),                   # index-v7-dmgmori-v1 → старая итерация v7
]
# Древние файлы без префикса `-v*` — ранние черновики, не часть текущего набора прототипов
EXCLUDE_NAMES = {
    'index.html',                # ранний черновик главной (актуальная — index-v7-dmgmori.html)
    'catalog-pech.html',         # предшественник catalog-induktsionnye-plavilnye-pechi.html
    'catalog-pech-detail.html',  # предшественник product.html
}

PARTIALS = {
    'header': {
        'partial_file': PARTIALS_DIR / 'header.html',
        # Anchor: the wrapping element. We replace content INSIDE this element
        # between markers.
        'host_re': re.compile(
            r'(<header class="header">)(.*?)(</header>)', re.DOTALL),
    },
    'footer': {
        'partial_file': PARTIALS_DIR / 'footer.html',
        'host_re': re.compile(
            r'(<footer class="footer">)(.*?)(</footer>)', re.DOTALL),
    },
    'drawer': {
        'partial_file': PARTIALS_DIR / 'drawer.html',
        'host_re': re.compile(
            r'(<aside class="nav-drawer"[^>]*>)(.*?)(</aside>)', re.DOTALL),
    },
}

WARNING_BANNER = (
    "<!-- ============================================================\n"
    "     @partial:{name} — GENERATED FROM "
    "design/prototypes/_partials/{name}.html\n"
    "     DO NOT EDIT THIS BLOCK MANUALLY in this file.\n"
    "     To update: edit the partial, then run:\n"
    "       python3 design/prototypes/build/sync-partials.py\n"
    "     ============================================================ -->\n"
)
END_MARKER = "<!-- /@partial:{name} -->\n"


def render_block(name: str, partial_content: str) -> str:
    """Wrap partial content with markers + warning banner."""
    return (
        "\n"
        + WARNING_BANNER.format(name=name)
        + partial_content
        + END_MARKER.format(name=name)
    )


def collect_html_files() -> list[Path]:
    return sorted(
        p for p in ROOT.glob('*.html')
        if not p.name.startswith('_')
        and p.name not in EXCLUDE_NAMES
        and not any(pat.search(p.name) for pat in EXCLUDE_PATTERNS)
    )


def sync_file(path: Path, check_only: bool = False) -> bool:
    """Returns True if the file was modified (or would be in check mode)."""
    src = path.read_text(encoding='utf-8')
    new = src
    for name, spec in PARTIALS.items():
        partial = spec['partial_file'].read_text(encoding='utf-8')
        block = render_block(name, partial)
        match = spec['host_re'].search(new)
        if not match:
            print(f"  [warn] {path.name}: no <{name}> wrapper element found — skipped")
            continue
        opening, _inner, closing = match.group(1), match.group(2), match.group(3)
        replacement = opening + block + closing
        new = new[:match.start()] + replacement + new[match.end():]

    if new != src:
        if check_only:
            print(f"  DRIFT  {path.name}")
        else:
            path.write_text(new, encoding='utf-8')
            print(f"  synced {path.name}")
        return True
    print(f"  ok     {path.name}")
    return False


# Regex to find href="*.html" — VIOLATES pretty-URLs convention (see CLAUDE.md #2).
# Exception: external links (http(s)://) and trailing-fragment-only refs.
HTML_HREF_RE = re.compile(
    r'href="(?!https?://)([^"#]+\.html)(?:#[^"]*)?"'
)


def scan_html_extensions(files: list[Path]) -> dict[Path, list[str]]:
    """Return {file → list of bad href values} for any .html links found."""
    violations: dict[Path, list[str]] = {}
    for path in files:
        text = path.read_text(encoding='utf-8')
        bad = HTML_HREF_RE.findall(text)
        if bad:
            violations[path] = sorted(set(bad))
    return violations


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument('--check', action='store_true',
                    help="Report drift without writing files (exit 1 if drift).")
    ap.add_argument('--no-url-lint', action='store_true',
                    help="Skip the .html-in-href URL lint check.")
    args = ap.parse_args()

    if not all(spec['partial_file'].exists() for spec in PARTIALS.values()):
        for name, spec in PARTIALS.items():
            if not spec['partial_file'].exists():
                print(f"[error] partial missing: {spec['partial_file']}")
        return 2

    files = collect_html_files()
    if not files:
        print("No prototype .html files found.")
        return 0

    print(f"Syncing {len(PARTIALS)} partial(s) → {len(files)} file(s)")
    any_changed = False
    for path in files:
        changed = sync_file(path, check_only=args.check)
        any_changed = any_changed or changed

    # URL lint — search .html in href values (forbidden by CLAUDE.md #2)
    url_violations = {} if args.no_url_lint else scan_html_extensions(files)
    if url_violations:
        print("\n⚠️  URL convention violation — pretty URLs required (no .html):")
        for path, bad_hrefs in url_violations.items():
            print(f"  {path.name}")
            for b in bad_hrefs:
                print(f"    href=\"{b}\"  →  must be pretty URL like /<slug>/")
        print("  See CLAUDE.md rule #2 (URL convention) and structura.md.")
        any_changed = True  # treat as drift in --check mode

    if args.check and any_changed:
        print("\n[check] Drift detected.")
        return 1
    if any_changed and not url_violations:
        print("\nDone — partials applied.")
    elif not any_changed:
        print("\nAll files in sync, no URL violations.")
    return 0


if __name__ == '__main__':
    sys.exit(main())
