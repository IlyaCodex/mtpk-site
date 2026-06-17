#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Генератор раздела «Новости» для astro.
Источник контента: site/news/<slug>/content.md (frontmatter + markdown).
Делает:
  1. Копирует/уменьшает картинки в astro/public/img/news/ (+ .webp сиблинг).
  2. Конвертирует markdown статьи в чистый HTML (legal-body prose).
  3. Пишет astro/src/raw-pages/news/<slug>/body.html + meta.json.
  4. Собирает индекс astro/src/raw-pages/news/body.html + meta.json (сетка cat-card).
URL сохраняются 1:1 со старым сайтом: /news/ и /news/<slug>/.
Запуск: python3 scripts/gen-news.py   (из корня репо)
"""
import os, re, json, shutil, subprocess, sys

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SRC_NEWS = os.path.join(ROOT, "site", "news")
RAW_NEWS = os.path.join(ROOT, "astro", "src", "raw-pages", "news")
IMG_OUT  = os.path.join(ROOT, "astro", "public", "img", "news")
PIC_OUT  = os.path.join(ROOT, "picture", "news")  # организационная копия источников

MAX_W = 1100  # ширина под контейнер статьи (880) с запасом под retina-карточки

os.makedirs(IMG_OUT, exist_ok=True)
os.makedirs(PIC_OUT, exist_ok=True)

# ---------- frontmatter ----------
def parse(content_md):
    m = re.match(r"^---\n(.*?)\n---\n(.*)$", content_md, re.S)
    fm_raw, body = m.group(1), m.group(2)
    fm = {}
    for line in fm_raw.splitlines():
        mm = re.match(r'^(\w+):\s*"?(.*?)"?\s*$', line)
        if mm:
            fm[mm.group(1)] = mm.group(2)
    return fm, body.strip()

def fix_title(t):
    # вставить пробел после ! ? . если сразу заглавная (битые заголовки старого сайта)
    return re.sub(r'([!?.])(?=[A-ZА-Я])', r'\1 ', t).strip()

def date_key(d):  # DD.MM.YYYY -> сортируемый
    dd, mm, yy = d.split(".")
    return (yy, mm, dd)

# ---------- картинки ----------
def process_image(src_path, out_basename):
    """Копирует в img/news/ + picture/news/, уменьшает до MAX_W, делает .webp.
    Возвращает web-путь /img/news/<file>."""
    ext = os.path.splitext(src_path)[1].lower()
    out_name = out_basename + ext
    dst = os.path.join(IMG_OUT, out_name)
    shutil.copy2(src_path, dst)
    shutil.copy2(src_path, os.path.join(PIC_OUT, out_name))  # источник
    # уменьшить если шире MAX_W
    try:
        w = int(subprocess.check_output(["sips", "-g", "pixelWidth", dst]).split()[-1])
        if w > MAX_W:
            subprocess.run(["sips", "--resampleWidth", str(MAX_W), dst],
                           stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
    except Exception as e:
        print("  ! sips:", e)
    # webp сиблинг (nginx отдаёт по Accept)
    try:
        subprocess.run(["cwebp", "-quiet", "-q", "82", dst, "-o", dst + ".webp"],
                       stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
    except Exception as e:
        print("  ! cwebp:", e)
    return "/img/news/" + out_name

# ---------- markdown inline ----------
# Ремап старых URL каталога на новую структуру сайта (старый сайт → new.uralinduktor.ru).
# Где точного товара нет — ведём на ближайшую категорию/раздел; совсем нет варианта → "/".
# Сверено по astro/src/raw-pages/ (2026-06-08).
URL_REMAP = {
    "/products/induktsionnoe-oborudovanie/induktsionnye-tiristornye-pechi/induktsionnaya-tiristornaya-pech-ui-0-5t-400/":
        "/products/induktsionnye-plavilnye-pechi/po-stali/ui-0-5t-400/",
    "/products/sistemy-ohlazhdeniya/cooling-towers/sistema-ohlazhdeniya-uig-600-gradirnya/":
        "/products/sistemy-ohlazhdeniya/gradirni/",
    "/products/drobemetnoe-oborudovanie/drobemetnye-ustanovki-kranovogo-tipa/drobemetnaya-ustanovka-kranovogo-tipa-uid-378/":
        "/products/drobemetnoe-oborudovanie/kranovogo-tipa/uid-378/",
    "/products/drobemetnoe-oborudovanie/drobemetnye-ustanovki-barabannogo-tipa/drobemetnaya-ustanovka-barabannogo-tipa-uid-326/":
        "/products/drobemetnoe-oborudovanie/barabannogo-tipa/uid-326/",
    "/products/oborudovanie-dlya-litejnogo-proizvodstva/termicheskaya-pech-s-vykatnym-podom/":
        "/products/mufelnye-termicheskie-pechi/mufelnaya-pech-s-vykatannym-podom/",
    "/products/pechi-soprotivlenya/": "/products/mufelnye-termicheskie-pechi/",
    "/nashe-proizvodstvo/": "/proizvodstvo/",
}

def inline(text):
    text = text.replace("&", "&amp;").replace("<", "&lt;").replace(">", "&gt;")
    def _link(m):
        t, u = m.group(1), m.group(2)
        u = re.sub(r'https?://uralinduktor\.ru/', '/', u)
        u = URL_REMAP.get(u, u)  # перемап старых URL каталога на новую структуру
        ext = u.startswith("http")
        attr = ' target="_blank" rel="noopener"' if ext else ''
        return f'<a href="{u}"{attr}>{t}</a>'
    text = re.sub(r'\[([^\]]+)\]\(([^)]+)\)', _link, text)
    text = re.sub(r'\*\*([^*]+)\*\*', r'<strong>\1</strong>', text)
    text = text.replace("\\.", ".")
    return text

IMG_RE = re.compile(r'!\[([^\]]*)\]\(images/([^)]+)\)')

def body_to_html(body, imgmap, lead_file):
    """Конвертирует markdown-тело в HTML. lead_file — имя картинки, уже вынесенной в hero (пропускаем её первое вхождение)."""
    out = []
    skipped_lead = False
    for block in re.split(r'\n\s*\n', body):
        block = block.strip()
        if not block:
            continue
        # блок только из картинок?
        only_imgs = IMG_RE.sub("", block).strip() == ""
        if only_imgs:
            for m in IMG_RE.finditer(block):
                fname = m.group(2)
                if fname == lead_file and not skipped_lead:
                    skipped_lead = True
                    continue
                web = imgmap.get(fname)
                if web:
                    alt = m.group(1) or ""
                    out.append(f'<figure class="news-figure"><img src="{web}" alt="{alt}" loading="lazy"></figure>')
            continue
        # заголовок
        if block.startswith("#"):
            txt = re.sub(r'^#+\s*', '', block)
            out.append(f"<h2>{inline(txt)}</h2>")
            continue
        # абзац: строки -> <br>, но картинки внутри выносим в figure
        para_lines = []
        def flush():
            if para_lines:
                out.append("<p>" + "<br>\n".join(para_lines) + "</p>")
                para_lines.clear()
        for line in block.split("\n"):
            line = line.rstrip()
            mi = IMG_RE.fullmatch(line.strip())
            if mi:
                flush()
                fname = mi.group(2)
                if fname == lead_file and not skipped_lead:
                    skipped_lead = True
                    continue
                web = imgmap.get(fname)
                if web:
                    out.append(f'<figure class="news-figure"><img src="{web}" alt="{mi.group(1) or ""}" loading="lazy"></figure>')
                continue
            if line.strip():
                para_lines.append(inline(line.strip()))
        flush()
    return "\n      ".join(out)

# ---------- сборка ----------
articles = []
for slug in sorted(os.listdir(SRC_NEWS)):
    d = os.path.join(SRC_NEWS, slug)
    cmd = os.path.join(d, "content.md")
    if slug == "images" or not os.path.isdir(d) or not os.path.exists(cmd):
        continue
    fm, body = parse(open(cmd, encoding="utf-8").read())
    title = fix_title(fm.get("title", slug))
    date = fm.get("date", "")
    desc = fm.get("description", "").strip()

    # собрать картинки статьи
    imgdir = os.path.join(d, "images")
    imgmap = {}
    lead_file = None
    if os.path.isdir(imgdir):
        files = sorted(os.listdir(imgdir))
        # лид = первая картинка из тела (порядок в md), иначе первая по списку
        first_in_body = IMG_RE.search(body)
        lead_file = first_in_body.group(2) if first_in_body else (files[0] if files else None)
        for i, f in enumerate(files):
            base = slug if f == lead_file else f"{slug}-{i+1}"
            imgmap[f] = process_image(os.path.join(imgdir, f), base)
    lead_web = imgmap.get(lead_file) if lead_file else None

    html = body_to_html(body, imgmap, lead_file)

    # ---- страница статьи ----
    meta_line = f"Новости · {date}" if date else "Новости"
    lead_fig = (f'<figure class="news-figure news-figure--lead"><img src="{lead_web}" '
                f'alt="{title}" loading="eager" fetchpriority="high"></figure>\n      ') if lead_web else ""
    page = f"""<section class="legal-hero">
  <div class="legal-container">
    <nav class="breadcrumb" aria-label="Хлебные крошки">
      <a href="/">Главная</a>
      <span class="breadcrumb__sep">/</span>
      <a href="/news/">Новости</a>
      <span class="breadcrumb__sep">/</span>
      <span class="breadcrumb__current">{title}</span>
    </nav>
    <div class="news-meta">{meta_line}</div>
    <h1 class="legal-hero__title">{title}</h1>
  </div>
</section>

<section class="legal-body news-article">
  <div class="legal-container">
      {lead_fig}{html}
    <p class="news-back"><a href="/news/">← Все новости</a></p>
  </div>
</section>

<!--C:best-offer-->
"""
    meta = {
        "title": f"{title} · УралИндуктор",
        "description": desc[:300],
        "inline_styles": [],
        "css_templates": ["/css/tpl/legal.css", "/css/tpl/news.css"],
    }
    if lead_web:
        meta["preload_image"] = lead_web
    outdir = os.path.join(RAW_NEWS, slug)
    os.makedirs(outdir, exist_ok=True)
    open(os.path.join(outdir, "body.html"), "w", encoding="utf-8").write(page)
    open(os.path.join(outdir, "meta.json"), "w", encoding="utf-8").write(
        json.dumps(meta, ensure_ascii=False, indent=2) + "\n")

    articles.append({"slug": slug, "title": title, "date": date,
                     "desc": desc, "cover": lead_web})
    print(f"  ✓ {slug}  ({date})  img={lead_web}")

# ---------- индекс /news/ ----------
articles.sort(key=lambda a: date_key(a["date"]) if a["date"] else ("0","0","0"), reverse=True)

def excerpt(s, n=150):
    s = s.strip()
    if len(s) <= n:
        return s
    cut = s[:n].rsplit(" ", 1)[0]
    return cut + "…"

cards = []
for a in articles:
    cover = a["cover"]
    cover_html = (f'<img src="{cover}" alt="{a["title"]}" loading="lazy">'
                  if cover else '<div class="news-card__noimg">УралИндуктор</div>')
    cards.append(f"""      <a href="/news/{a['slug']}/" class="cat-card news-card">
        <div class="cat-card__cover">
          <span class="cat-card__num">{a['date']}</span>
          {cover_html}
        </div>
        <div class="cat-card__body">
          <h2 class="cat-card__title news-card__title">{a['title']}</h2>
          <p class="news-card__excerpt">{excerpt(a['desc'])}</p>
          <span class="cat-card__link">Читать</span>
        </div>
      </a>""")

index = f"""<section class="legal-hero">
  <div class="legal-container">
    <nav class="breadcrumb" aria-label="Хлебные крошки">
      <a href="/">Главная</a>
      <span class="breadcrumb__sep">/</span>
      <span class="breadcrumb__current">Новости</span>
    </nav>
    <h1 class="legal-hero__title">Новости компании</h1>
    <p class="legal-hero__lead">События, проекты и&nbsp;отраслевая аналитика УралИндуктор&nbsp;— производство и&nbsp;поставка оборудования для&nbsp;металлургии и&nbsp;литейных производств.</p>
  </div>
</section>

<section class="news-index">
  <div class="container">
    <div class="news-grid">
{chr(10).join(cards)}
    </div>
  </div>
</section>

<!--C:best-offer-->
"""
idx_meta = {
    "title": "Новости компании · УралИндуктор",
    "description": "Новости компании УралИндуктор (ООО МТПК): события, реализованные проекты, новые разделы оборудования и аналитика рынка металлургии.",
    "inline_styles": [],
    "css_templates": ["/css/tpl/legal.css", "/css/tpl/news.css"],
}
open(os.path.join(RAW_NEWS, "body.html"), "w", encoding="utf-8").write(index)
open(os.path.join(RAW_NEWS, "meta.json"), "w", encoding="utf-8").write(
    json.dumps(idx_meta, ensure_ascii=False, indent=2) + "\n")

print(f"\nГотово: индекс + {len(articles)} статей.")
