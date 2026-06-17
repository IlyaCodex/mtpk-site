#!/usr/bin/env python3
"""
B-2: вынос CSS-ядра из meta.json-блобов в astro/public/css/site.css.

ВАЖНО про каскад: @media-оверрайды должны идти ПОСЛЕ базовых правил. Если
вынести общий @media в site.css (грузится ПЕРЕД блобом), а базовое правило
останется в блобе (грузится после) — поздний base переопределит ранний @media
и сломает мобильную вёрстку (случай .leadgen__grid). Поэтому:

  * В site.css выносим ТОЛЬКО обычные (не-@) правила, общие для всех 517 страниц.
  * Все @media / @keyframes / @supports / @font-face ОСТАЮТСЯ в блобах
    (даже если дублируются) — их порядок относительно базы сохраняется.
  * Из дельта-правил вырезаем base-объявления, чьим победителем НА БАЗОВОЙ
    ширине было ядровое правило (иначе .container/.body «воскреснут»).

Проверка: симулируем каскад на ширинах 360/600/700/800/1100/1300/1500 для
СТАРОГО (полный блоб) и НОВОГО (site.css-ядро + урезанный блоб). Должны
совпасть все (sel,prop)->value на всех ширинах. Иначе abort.

Запуск:  python3 scripts/oneoff/css-extract-core.py            # dry-run
         python3 scripts/oneoff/css-extract-core.py --apply
"""
import json, glob, os, re, sys
from collections import Counter

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..', 'astro', 'src', 'raw-pages'))
SITE_CSS = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..', 'astro', 'public', 'css', 'site.css'))
APPLY = '--apply' in sys.argv
WIDTHS = [360, 600, 700, 800, 1100, 1300, 1500]

def strip_wrap(block):
    return re.sub(r'^\s*<style[^>]*>', '', block).replace('</style>', '').strip()

def tokenize(css):
    out = []
    i, n = 0, len(css)
    buf = []; depth = 0; pc = ''
    while i < n:
        ch = css[i]
        if ch == '/' and i + 1 < n and css[i+1] == '*':
            e = css.find('*/', i + 2); e = e if e != -1 else n - 2
            seg = css[i:e+2]
            if depth == 0 and ''.join(buf).strip() == '':
                pc = seg
            else:
                buf.append(seg)
            i = e + 2; continue
        buf.append(ch)
        if ch == '{':
            depth += 1
        elif ch == '}':
            depth -= 1
            if depth == 0:
                out.append((''.join(buf).strip(), pc)); buf = []; pc = ''
        elif ch == ';' and depth == 0:
            frag = ''.join(buf).strip()
            if frag and frag != ';':
                out.append((frag, pc)); pc = ''
            buf = []
        i += 1
    if ''.join(buf).strip():
        out.append((''.join(buf).strip(), pc))
    return out

def norm_key(rule):
    r = re.sub(r'/\*.*?\*/', '', rule, flags=re.S)
    r = re.sub(r'\s+', ' ', r).strip()
    return re.sub(r'\s*([{};,])\s*', r'\1', r)

def is_at(rule):
    return rule.lstrip().startswith('@')

def is_normal(rule):
    return not is_at(rule)

def prelude_of(rule):
    b = rule.find('{')
    return rule[:b].strip()

def inner_body(rule):
    b = rule.find('{'); e = rule.rfind('}')
    return rule[b+1:e]

def selectors_of(rule):
    head = re.sub(r'/\*.*?\*/', '', prelude_of(rule), flags=re.S)
    return [re.sub(r'\s+', ' ', s).strip() for s in head.split(',') if s.strip()]

def split_decls(body):
    body = re.sub(r'/\*.*?\*/', '', body, flags=re.S)
    res = []
    for raw in body.split(';'):
        if ':' not in raw:
            continue
        p, v = raw.split(':', 1)
        prop = p.strip().lower()
        if not prop:
            continue
        val = v.strip()
        imp = '!important' in val.lower()
        res.append((prop, val.strip().lower(), imp, raw.strip()))
    return res

def media_matches(prelude, width):
    """Грубый матчер @media по ширине. Поддержка max-width/min-width; прочие
    условия (print, hover...) считаем НЕ матчащими экранную ширину только если
    содержат 'print'. Иначе по умолчанию матчит (учитываем width-условия)."""
    p = prelude.lower()
    if 'print' in p:
        return False
    ok = True
    for mw in re.findall(r'max-width:\s*(\d+)px', p):
        if not (width <= int(mw)): ok = False
    for mw in re.findall(r'min-width:\s*(\d+)px', p):
        if not (width >= int(mw)): ok = False
    return ok

def effective(rule_list, width):
    """rule_list: list of rule texts (order = cascade order). Возвращает
    {(sel,prop): value} для данной ширины. @media разворачиваются если матчат.
    @keyframes/@font-face/@import/@supports — membership-ключи (без ширины)."""
    res = {}
    def apply(sel, prop, val, imp):
        k = (sel, prop)
        cur = res.get(k)
        if cur is None:
            res[k] = (val, imp); return
        _, ci = cur
        if imp and not ci:
            res[k] = (val, imp)
        elif imp == ci:
            res[k] = (val, imp)
    def do_normal(text):
        body = inner_body(text)
        decls = split_decls(body)
        for sel in selectors_of(text):
            for prop, val, imp, _ in decls:
                apply(sel, prop, val, imp)
    for text in rule_list:
        s = text.lstrip()
        if not is_at(text):
            do_normal(text)
        elif s.startswith('@media') or s.startswith('@supports'):
            if s.startswith('@supports') or media_matches(prelude_of(text), width):
                for itext, _c in tokenize(inner_body(text)):
                    if is_at(itext):
                        # вложенный at — membership
                        res[('@'+norm_key(itext), '')] = (norm_key(itext), False)
                    else:
                        body = inner_body(itext); decls = split_decls(body)
                        for sel in selectors_of(itext):
                            for prop, val, imp, _ in decls:
                                apply(sel, prop, val, imp)
        else:
            res[('@'+norm_key(text), '')] = (norm_key(text), False)
    return {k: v[0] for k, v in res.items()}

# ---------- загрузка ----------
metas = sorted(glob.glob(os.path.join(ROOT, '**', 'meta.json'), recursive=True))
total = len(metas)
key_pages = Counter()
page_tokens = {}
for f in metas:
    m = json.load(open(f))
    css = '\n'.join(strip_wrap(b) for b in m.get('inline_styles', []))
    toks = tokenize(css)
    page_tokens[f] = toks
    seen = set()
    for t, _ in toks:
        if is_normal(t):
            k = norm_key(t)
            if k and k not in seen:
                key_pages[k] += 1; seen.add(k)
core_keys = {k for k, c in key_pages.items() if c == total}
print(f"страниц: {total} | ядро (обычные правила на всех): {len(core_keys)}")

# ---------- site.css из реф-страницы (только обычные ядровые) ----------
ref = metas[0]
core_emitted = []; seen = set()
for text, comment in page_tokens[ref]:
    if is_normal(text):
        k = norm_key(text)
        if k in core_keys and k not in seen:
            seen.add(k); core_emitted.append((text, comment))
for f in metas:  # добор (на деле 0)
    for text, comment in page_tokens[f]:
        if is_normal(text):
            k = norm_key(text)
            if k in core_keys and k not in seen:
                seen.add(k); core_emitted.append((text, comment))

def rewrite_urls(css):
    css = re.sub(r"url\((['\"]?)\.\./img/", r"url(\1/img/", css)
    css = re.sub(r"url\((['\"]?)\.\./brand/", r"url(\1/brand/", css)
    css = re.sub(r"url\((['\"]?)\./img/", r"url(\1/img/", css)
    css = re.sub(r"url\((['\"]?)\./brand/", r"url(\1/brand/", css)
    return css

site_parts = ["/* B-2: общее CSS-ядро (обычные правила, общие для всех 517 страниц),",
              "   вынесено из meta.json-блобов. Шапка/футер/контейнер/кнопки/секции главной.",
              "   @media/@keyframes ОСТАЛИСЬ в блобах (каскад responsive). Правки базы — здесь.",
              "   Подключается в BaseLayout ДО slot=head. */"]
for text, comment in core_emitted:
    if comment: site_parts.append(comment)
    site_parts.append(text)
site_css = rewrite_urls('\n'.join(site_parts) + '\n')
core_texts = [t for t, _ in core_emitted]

# ---------- трим + проверка ----------
def base_winner_is_core(toks):
    """на БАЗОВОЙ ширине (без @media) последний нормальный сеттер (sel,prop):
    ядро это или нет."""
    win = {}
    for text, _ in toks:
        if is_normal(text):
            isc = norm_key(text) in core_keys
            for sel in selectors_of(text):
                for prop, val, imp, _ in split_decls(inner_body(text)):
                    win[(sel, prop)] = isc
    return win

def trim_normal(text, win_core):
    sels = selectors_of(text)
    keep = []
    for prop, val, imp, raw in split_decls(inner_body(text)):
        dead = any(win_core.get((s, prop)) for s in sels)
        if not dead:
            keep.append(raw)
    if not keep:
        return None
    head = prelude_of(text)
    return head + ' {' + '; '.join(keep) + '; }'

mismatches = []
new_blobs = {}
for f in metas:
    toks = page_tokens[f]
    win_core = base_winner_is_core(toks)
    new_rules = []
    for text, comment in toks:
        if is_normal(text):
            if norm_key(text) in core_keys:
                continue  # уехало в site.css
            nt = trim_normal(text, win_core)
            if nt:
                new_rules.append((comment, nt))
        else:
            new_rules.append((comment, text))  # все at-rules остаются
    old_seq = [t for t, _ in toks]
    new_seq = core_texts + [nt for _c, nt in new_rules]
    bad = False
    for w in WIDTHS:
        if effective(old_seq, w) != effective(new_seq, w):
            oe = effective(old_seq, w); ne = effective(new_seq, w)
            diff = [(k, oe.get(k), ne.get(k)) for k in set(oe) | set(ne) if oe.get(k) != ne.get(k)]
            mismatches.append((os.path.relpath(f, ROOT), w, diff[:4]))
            bad = True
            break
    parts = []
    for comment, nt in new_rules:
        if comment: parts.append(comment)
        parts.append(nt)
    new_blobs[f] = '<style>\n' + '\n'.join(parts) + '\n</style>'

print(f"\n== Проверка каскада на ширинах {WIDTHS} ==")
print(f"страниц с расхождением: {len(set(m[0] for m in mismatches))}")
for rel, w, diff in mismatches[:15]:
    print(f"  {rel} @ {w}px")
    for k, o, n in diff:
        print(f"      {k} : OLD={o!r} NEW={n!r}")
if mismatches:
    print("\n!!! ABORT")
    sys.exit(1)

old_total = sum(len('\n'.join(json.load(open(f)).get('inline_styles', []))) for f in metas)
new_total = sum(len(b) for b in new_blobs.values())
print(f"\nCSS в блобах: {old_total/1024/1024:.1f} MB -> {new_total/1024/1024:.1f} MB")
print(f"site.css: {len(site_css)/1024:.1f} KB | ядровых правил в site.css: {len(core_texts)}")

if not APPLY:
    print("\n[dry-run] эквивалентно на всех ширинах. Запусти с --apply.")
    sys.exit(0)

os.makedirs(os.path.dirname(SITE_CSS), exist_ok=True)
open(SITE_CSS, 'w').write(site_css)
print(f"записан {SITE_CSS}")
for f in metas:
    m = json.load(open(f))
    m['inline_styles'] = [new_blobs[f]]
    json.dump(m, open(f, 'w'), ensure_ascii=False, indent=2)
print(f"обновлено meta.json: {len(metas)}")
