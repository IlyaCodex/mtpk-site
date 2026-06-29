#!/usr/bin/env python3
# ⚠️ НЕ ИДЕМПОТЕНТЕН. title/description выводятся ИЗ существующих description
# (название, ТТХ, гарантия извлекаются из текущего meta). Повторный запуск на уже
# переписанных meta даёт дрейф (≈68 файлов). Скрипт — артефакт-документация метода:
# выполнен ОДИН раз на исходных meta (коммит d335268). Для повторного прогона —
# сначала git restore исходных meta, затем запуск.
#
# SEO-рерайт title/description всех страниц (meta.json). 3 стадии в одном файле:
#   1) inventory — обход raw-pages, классификация типа страницы;
#   2) extract   — код модели / тип-фраза / ключевые ТТХ из существующих meta;
#   3) generate+write — пер-семейные шаблоны → title (30–55) / description (60–150).
# Гео-claim «производство в Миассе/РФ» — только у печей/дробемётов/градирен (см. PLAN.md 2026-06-07/09).
# Запуск: python3 seo-meta-rewrite.py   (правит только title/description; см. предупреждение выше).

import json, os, re, glob
from collections import Counter
BASE="/Users/evgenii/Documents/Claude/МТПК/astro/src/raw-pages"
def clean(s): return re.sub(r'\s+',' ',(s or '').replace('\xa0',' ')).strip()
def rel(p): return os.path.dirname(p)[len(BASE):].lstrip('/') or '(home)'
SEP=re.compile(r'\s*[—·/|]\s*')
SINGLE={'o-company','proizvodstvo','nalichie','policy','soglasie'}
rows=[]
for mp in glob.glob(BASE+"/**/meta.json", recursive=True):
    d=os.path.dirname(mp); r=rel(mp); seg=r.split('/')
    try: m=json.load(open(mp))
    except: continue
    t=clean(m.get("title","")); de=clean(m.get("description",""))
    bp=os.path.join(d,"body.html"); body=open(bp,encoding="utf-8",errors="ignore").read() if os.path.exists(bp) else ""
    if r=='(home)': typ='home'
    elif r in SINGLE: typ='single'
    elif seg[0]=='proekty': typ='proekty-list' if len(seg)==1 else 'project'
    elif seg[0]=='news': typ='news-list' if len(seg)==1 else 'news'
    elif seg[0]=='uslugi': typ='uslugi-hub' if len(seg)==1 else 'service'
    elif seg[0]=='products':
        if 'class="phero"' in body or 'phero__title' in body: typ='product'
        elif len(seg)==2: typ='section'
        else: typ='category'
    else: typ='single'
    parts=SEP.split(t); name=parts[0] if parts else t
    wm=re.search(r'аранти[ия]\s+(\d+)\s*мес', de+' '+body); warr=wm.group(1) if wm else ''
    rows.append(dict(r=r,typ=typ,name=name,warr=warr,tl=len(t),dl=len(de),title=t,desc=de))
json.dump(rows, open("/tmp/seo_inv.json","w"), ensure_ascii=False)
print("ВСЕГО:",len(rows))
for k,v in Counter(x['typ'] for x in rows).most_common(): print(f"  {k}: {v}")
print("\n=== по 2 примера на тип (name | warr) ===")
by={}
for x in rows: by.setdefault(x['typ'],[]).append(x)
for typ in ['section','category','product','project','news','service','single','home']:
    for x in by.get(typ,[])[:2]:
        print(f"[{typ}] {x['r']}\n   name={x['name']!r} warr={x['warr']!r}\n   T: {x['title']}\n   D: {x['desc'][:120]}")

# ---- stage 2: extract code/head/spec ----
rows=json.load(open("/tmp/seo_inv.json"))
CODE=re.compile(r'(?:[А-ЯA-Z]{1,4}[А-ЯA-Z\d]?-[\dА-Яа-яA-Za-z.,\-]+(?:[А-Яа-я])?|BH\d+)')
SPEC=re.compile(r'\d[\d  ]*(?:[.,]\d+)?\s?(?:кКал/ч|кВт|МВт|т/ч|м³/ч|кГц|°C|мм|кг|т\b|В\b)')
def first_spec(de):
    # look after first ':' if present
    tail=de.split(':',1)[1] if ':' in de else de
    m=SPEC.search(tail)
    return m.group(0).strip() if m else ''
def head(de):
    h=re.split(r'[:.]', de,1)[0].strip()
    return h
for x in rows:
    if x['typ']!='product': continue
    de=x['desc']; nm=x['name']
    code_m=CODE.search(nm) or CODE.search(de)
    code=code_m.group(0) if code_m else ''
    bare = bool(code) and len(nm)<=len(code)+2
    x['code']=code; x['bare']=bare; x['head']=head(de); x['spec']=first_spec(de)
json.dump(rows, open("/tmp/seo_inv.json","w"), ensure_ascii=False)
import random
prods=[x for x in rows if x['typ']=='product']
# sample across families by path top-2 segment
fam={}
for x in prods: fam.setdefault('/'.join(x['r'].split('/')[:2]),[]).append(x)
print("СЕМЕЙСТВА продуктов:", len(fam))
for k in sorted(fam):
    x=fam[k][0]
    print(f"\n[{k}] ({len(fam[k])} шт)\n  name={x['name']!r} code={x['code']!r} bare={x['bare']}\n  head={x['head']!r}\n  spec={x['spec']!r}\n  D: {x['desc'][:130]}")

# ---- stage 3: generate + write ----

def L(s): return len(s)
def norm(s): return re.sub(r'\s+', ' ', (s or '')).strip()
def cap(s): return s[:1].upper() + s[1:] if s else s

SPEC = re.compile(r'(\d[\d  ]*(?:[.,]\d+)?(?:\s?[–-]\s?\d[\d  ]*(?:[.,]\d+)?)?)\s?(кКал/ч|кВт|МВт|т/ч|м³/ч|кГц|°C|мм|кг|т|В)(?![А-Яа-яёA-Za-z])')
def specs(de):
    tail = de.split(':', 1)[1] if ':' in de else de
    out, seen = [], set()
    for m in SPEC.finditer(tail):
        t = norm(m.group(0)); u = m.group(2)
        if t not in seen: seen.add(t); out.append((t, u))
    return out
def spec_u(de, order):
    sp = specs(de)
    for u in order:
        for t, uu in sp:
            if uu == u: return t
    return sp[0][0] if sp else ''
def specs_txt(de): return [t for t, _ in specs(de)]

def pick(cands, lo=30, hi=55):
    out = []
    for c in cands:
        c = norm(c)
        if not c or c.endswith('—') or re.search(r'\bдля \S+ для ', c): continue
        out.append(c)
    ok = [c for c in out if L(c) <= hi]
    if not ok:
        c = out[0] if out else ''
        w = c.split()
        while w and L(' '.join(w)) > hi: w.pop()
        return ' '.join(w)
    pref = [c for c in ok if L(c) >= lo]
    return (pref or ok)[0]

METAL = {'po-stali': 'стали', 'po-medi': 'меди', 'po-alyuminiyu': 'алюминия'}
DROB = {'kranovogo-tipa': 'кранового типа', 'barabannogo-tipa': 'барабанного типа',
 's-vrashchayushchimsya-stolom': 'с вращающимся столом', 'dlya-shvellera-i-sorta': 'для проката',
 'prokhodnye-podvesnogo-tipa': 'подвесной', 'dlya-ochistki-trub': 'для очистки труб',
 's-lentochnym-konveyerom': 'с конвейером', 's-vykatnym-stolom': 'с выкатным столом', 'peredvizhnye': 'передвижной'}
APP = {'induktsionnye-plavilnye-pechi': 'плавка чёрных и цветных металлов',
 'induktsionnye-nagrevateli': 'поверхностная закалка, нагрев и пайка',
 'drobemetnoe-oborudovanie': 'очистка литья и металлоконструкций',
 'sistemy-ohlazhdeniya': 'охлаждение литейного и металлургического оборудования',
 'stalerozlivochnye-kovshi': 'разливка и транспортировка расплава',
 'oborudovanie-lvm': 'литьё по выплавляемым моделям (ЛВМ)',
 'oborudovanie-lgm': 'литьё по газифицируемым моделям (ЛГМ)',
 'linii-dlya-holodnotverdeyushhih-smesej-hts': 'линии холоднотвердеющих смесей (ХТС)',
 'oborudovanie-dlya-peschano-glinistyh-smesej-pgs': 'формовка на песчано-глинистых смесях (ПГС)',
 'vakuumnoe-oborudovanie-dlya-termoobrabotki': 'вакуумная термообработка металлов',
 'zapchasti': 'запчасть для дробемётов и индукционных печей УИ'}
GENERIC = ('систем охлажд', 'градир', 'чиллер', 'муфельн', 'насос')
def is_generic(name):
    n = name.lower()
    return any(g in n for g in GENERIC)
def litfam(fam): return fam in ('oborudovanie-lvm', 'oborudovanie-lgm',
 'linii-dlya-holodnotverdeyushhih-smesej-hts', 'oborudovanie-dlya-peschano-glinistyh-smesej-pgs')

def fam_of(x):
    seg = x['r'].split('/')
    return seg[1] if len(seg) > 1 and seg[0] == 'products' else ''

def product_title(x):
    seg = x['r'].split('/'); fam = fam_of(x); code = x['code']; nm = x['name']; de = x['desc']
    if fam == 'induktsionnye-plavilnye-pechi':
        metal = METAL.get(seg[2], '') if len(seg) > 2 else ''; mass = spec_u(de, ['кг', 'т'])
        b = f"{code} — индукционная печь для {metal}" if metal else f"{code} — индукционная печь"
        return pick([f"{b}, {mass}" if mass else '', b])
    if fam == 'induktsionnye-nagrevateli':
        s = spec_u(de, ['кВт', 'кГц'])
        return pick([f"{nm} — {s}" if s else '', f"{nm} для закалки и нагрева", nm])
    if fam == 'drobemetnoe-oborudovanie':
        sub = DROB.get(seg[2], '') if len(seg) > 2 else ''; s = spec_u(de, ['т/ч', 'кВт'])
        b = norm(f"{code} — дробемёт {sub}")
        return pick([f"{b}, {s}" if s else '', b, f"{code} — дробемёт для металлургии"])
    if fam == 'sistemy-ohlazhdeniya':
        s = spec_u(de, ['кКал/ч', 'кВт'])
        return pick([f"{nm} для металлургии — {s}" if s else '', f"{nm} — {s}" if s else '', f"{nm} для металлургии", nm])
    if fam == 'stalerozlivochnye-kovshi':
        s = spec_u(de, ['т', 'кг']); b = f"{code} — сталеразливочный ковш" if code else nm
        return pick([f"{b}, {s}" if s else '', b, f"{b} для металлургии"])
    if litfam(fam):
        s = spec_u(de, ['т/ч', 'т', 'кВт', 'м³/ч', 'мм'])
        return pick([f"{nm} — {s}" if s else '', f"{nm} — оборудование для литья", nm])
    if fam == 'vakuumnoe-oborudovanie-dlya-termoobrabotki':
        return pick([f"{nm} для термообработки", f"{nm} для металлургии", nm])
    if fam == 'zapchasti':
        return pick([f"{nm} — запчасть к оборудованию УИ", f"{nm} для дробемётов и печей", nm])
    s = spec_u(de, ['кВт', 'т/ч', 'кг'])
    return pick([f"{nm} — {s}" if s else '', f"{nm} для металлургии", nm])

# Геозаявление о собственном производстве в Миассе/РФ разрешено ТОЛЬКО там, где
# оборудование действительно изготавливается на месте (решение Евгения 2026-06-07/09,
# см. PLAN.md): плавильные печи, дробемёты, градирни + компания/наличие/производство/главная.
# Для остальных 7 разделов (нагреватели, ХТС, ПГС, чиллеры, ковши, вакуумное, муфельные)
# и неоднозначных (ЛВМ/ЛГМ/запчасти) — НЕ заявляем производство, только отраслевые хвосты.
def allow_prod(x):
    r = x['r']
    return (r.startswith('products/induktsionnye-plavilnye-pechi') or
            r.startswith('products/drobemetnoe-oborudovanie') or
            r == 'products/sistemy-ohlazhdeniya' or
            r.startswith('products/sistemy-ohlazhdeniya/gradirni'))

# Названия разделов (12) заданы вручную: точная отраслевая привязка без ложных
# геозаявлений. Производство в Миассе — только у печей и дробемётов.
SECTION_TITLE = {
 'induktsionnye-plavilnye-pechi': "Индукционные плавильные печи — производство в Миассе",
 'drobemetnoe-oborudovanie': "Дробемётное оборудование — производство в Миассе",
 'sistemy-ohlazhdeniya': "Системы охлаждения — градирни УИГ и чиллеры УИЧ",
 'induktsionnye-nagrevateli': "Индукционные нагреватели для металлургии",
 'stalerozlivochnye-kovshi': "Сталеразливочные ковши для металлургии",
 'mufelnye-termicheskie-pechi': "Муфельные печи для металлургии и лабораторий",
 'vakuumnoe-oborudovanie-dlya-termoobrabotki': "Вакуумное оборудование для термообработки",
 'zapchasti': "Запчасти для индукционных печей и дробемётов",
 'oborudovanie-lvm': "Оборудование для литья по выплавляемым моделям",
 'oborudovanie-lgm': "Оборудование для литья по газифицируемым моделям",
 'linii-dlya-holodnotverdeyushhih-smesej-hts': "Линии ХТС для литейного производства",
 'oborudovanie-dlya-peschano-glinistyh-smesej-pgs': "Оборудование ПГС для литейного производства",
}
def hub_title(x):
    fam = fam_of(x)
    if fam in SECTION_TITLE: return SECTION_TITLE[fam]
    nm = x['name']; w = x['warr']
    return pick([f"{nm} для металлургии", f"{nm} для металлургических заводов",
                 f"{nm} — гарантия {w} мес" if w else '', nm])

def cat_title(x):
    if x['r'] == 'products': return "Каталог оборудования для металлургии и литья"
    nm = x['name']; w = x['warr']
    if allow_prod(x):
        cands = [f"{nm} — производство РФ", f"{nm} для металлургии", f"{nm} — собственное производство",
                 f"{nm} — гарантия {w} мес" if w else '', nm]
    else:
        cands = [f"{nm} для металлургии", f"{nm} для металлургических заводов",
                 f"{nm} — гарантия {w} мес" if w else '', nm]
    return pick(cands)

def service_title(x):
    nm = x['name']
    return pick([f"{nm} для металлургии", f"{nm} — сервис в РФ", f"{nm} — инжиниринг и сервис", nm])

def project_title(x):
    nm = x['name']
    return pick([f"{nm} — реализованный проект Уралиндуктор", f"{nm} — кейс Уралиндуктор",
                 f"{nm} — реализованный проект", nm])

NEWS_PREFIX = re.compile(r'^(Новое видео на канале[!:.\-\s]*)', re.I)
def news_title(x):
    nm = norm(NEWS_PREFIX.sub('Видео: ', x['name']))
    if L(nm) > 55:
        w = nm.split()
        while w and L(' '.join(w)) > 55: w.pop()
        nm = ' '.join(w).rstrip('.,;:—-')
    if L(nm) < 30 and 'ндуктор' not in nm:
        nm = nm.rstrip('!.') + ' — Уралиндуктор'
    return nm

BROKEN = re.compile(r'\.\s+[а-яё]')
TAIL_FW = re.compile(r'[\s,]+(и|для|с|на|от|до|по|или|а|но|в|об|при)$', re.I)
def trim_desc(de, hi=150):
    de = norm(de)
    if L(de) <= hi: return de, False
    sents = re.split(r'(?<=[.!?])\s+', de)
    acc = ''
    for s in sents:
        if L((acc + ' ' + s).strip()) <= hi: acc = (acc + ' ' + s).strip()
        else: break
    if not acc: return '', True
    return acc, False

def smart_cut(de, hi=150):
    """Return clean <=hi string ending on a complete clause (no dangling word)."""
    de = norm(de)
    if L(de) <= hi: return de
    d, hard = trim_desc(de, hi)
    if not hard: return d
    cut = de[:hi]
    p = cut.rfind(',')
    if p < 60: p = cut.rfind(' ')
    t = TAIL_FW.sub('', de[:p]).rstrip(' ,;:—-')
    return t + '.'

def pad60(cand):
    cand = norm(cand)
    if L(cand) < 60:
        cand = norm((cand[:-1] if cand.endswith('.') else cand) + " Производство, поставка и сервис.")
    return cand

def product_desc(x):
    fam = fam_of(x); de = norm(x['desc']); head = norm(x['head']); warr = x['warr']
    force = bool(BROKEN.search(de)) or L(de) < 60 or fam == 'stalerozlivochnye-kovshi'
    if not force:
        d, hard = trim_desc(de)
        if not hard and 60 <= L(d) <= 150: return d
    sp = specs_txt(de)[:3]; app = APP.get(fam, 'оборудование для металлургии')
    base = f"{head}: {', '.join(sp)}" if sp else head
    cand = norm(f"{base}. {cap(app)}.")
    if warr and L(cand) + 18 <= 150: cand = norm(cand[:-1] + f". Гарантия {warr} мес.")
    if L(cand) > 150:
        sp2 = specs_txt(de)[:2]; base = f"{head}: {', '.join(sp2)}" if sp2 else head
        cand = norm(f"{base}. {cap(app)}.")
        if L(cand) > 150: cand = smart_cut(norm(f"{head}. {cap(app)}"), 149)
    return pad60(cand)

def generic_desc(x):
    return pad60(smart_cut(x['desc'], 150))

# code prefix -> (equipment type genitive, application) for project pages
PROJ_TYPE = [
 ('УИГ', 'градирни', 'оборотное охлаждение для металлургии'),
 ('УИЧ', 'чиллера', 'промышленное охлаждение для металлургии'),
 ('УИД', 'дробемёта', 'дробеструйная очистка литья и металлоконструкций'),
 ('УИК', 'ковша', 'разливка и транспортировка расплава'),
 ('УИТП', 'плавильной печи', 'плавка металла'),
 ('УИШС', 'смесителя ХТС', 'приготовление холоднотвердеющих смесей'),
 ('УИ-', 'индукционной печи', 'плавка чёрных и цветных металлов'),
]
def proj_type(name):
    up = name.upper()
    for code, t, app in PROJ_TYPE:
        if code in up: return t, app
    return '', 'оборудование для металлургии и литейных производств'

def project_title(x):
    nm = x['name']; t, _ = proj_type(nm)
    if t and ' ' + t.split()[0] not in nm.lower():
        # insert type after first word (Поставка/Запуск ...)
        parts = nm.split(' ', 1)
        if len(parts) == 2:
            nm2 = f"{parts[0]} {t} {parts[1]}"
        else: nm2 = nm
    else: nm2 = nm
    return pick([f"{nm2} — реализованный проект", f"{nm} — реализованный проект Уралиндуктор",
                 f"{nm} — кейс Уралиндуктор", f"{nm} — реализованный проект", nm])

def project_desc(x):
    nm = x['name']; t, app = proj_type(nm)
    cand = norm(f"{nm} — реализованный проект Уралиндуктор: {app}.")
    if L(cand) > 150:
        cand = norm(f"{nm} — реализованный проект Уралиндуктор для металлургии.")
    return pad60(cand)

SINGLES = {
 'o-company': "О компании Уралиндуктор — производитель оборудования",
 'proizvodstvo': "Производство — литейные участки под ключ",
 'nalichie': "Оборудование в наличии на складе в Миассе",
 'policy': "Политика обработки персональных данных",
 'soglasie': "Согласие на обработку персональных данных",
 'uslugi': "Услуги для металлургии — монтаж, наладка, ремонт",
 'proekty': "Реализованные проекты — оборудование для металлургии",
 'news': "Новости Уралиндуктор — события и рынок металлургии",
}

for x in rows:
    t = x['typ']
    if t == 'product':
        x['nt'] = product_title(x); x['nd'] = product_desc(x)
    elif t == 'section':
        x['nt'] = hub_title(x); x['nd'] = generic_desc(x)
    elif t == 'category':
        x['nt'] = cat_title(x); x['nd'] = generic_desc(x)
    elif t == 'service':
        x['nt'] = service_title(x); x['nd'] = generic_desc(x)
    elif t == 'project':
        x['nt'] = project_title(x); x['nd'] = project_desc(x)
    elif t == 'news':
        x['nt'] = news_title(x); x['nd'] = generic_desc(x)
    elif t == 'home':
        x['nt'] = "Уралиндуктор — индукционные печи, дробемёты, градирни | производство РФ"
        x['nd'] = "Полный спектр оборудования для металлургии и литейных производств: от индукционных печей и дробемётов до градирен и чиллеров. Доставка по РФ."
    else:
        x['nt'] = SINGLES.get(x['r'], x['title']); x['nd'] = generic_desc(x)

ND_OVERRIDE = {
 'soglasie': "Согласие на обработку персональных данных, передаваемых через формы сайта uralinduktor.ru (ООО «МТПК», Уралиндуктор).",
}
for x in rows:
    if x['r'] in ND_OVERRIDE: x['nd'] = ND_OVERRIDE[x['r']]

print("ИТОГО", len(rows))
for typ in ['home','section','category','product','service','single','uslugi-hub','project','proekty-list','news','news-list']:
    g = [x for x in rows if x['typ'] == typ]
    if not g: continue
    tb = sum(1 for x in g if not 30 <= L(x['nt']) <= 55)
    db = sum(1 for x in g if not 60 <= L(x['nd']) <= 150)
    print(f"  {typ:14} n={len(g):3}  title_вне={tb:3}  desc_вне={db:3}")
json.dump(rows, open("/tmp/seo_inv.json", "w"), ensure_ascii=False)
print("saved")

# ---- write back to meta.json (preserve all other fields) ----
import os as _os
_changed = 0
for x in rows:
    mp = _os.path.join(BASE, '' if x['r'] == '(home)' else x['r'], 'meta.json')
    m = json.load(open(mp))
    if m.get('title') != x['nt'] or m.get('description') != x['nd']:
        m['title'] = x['nt']; m['description'] = x['nd']
        with open(mp, 'w', encoding='utf-8') as f:
            json.dump(m, f, ensure_ascii=False, indent=2); f.write('\n')
        _changed += 1
print('meta.json обновлено:', _changed)
