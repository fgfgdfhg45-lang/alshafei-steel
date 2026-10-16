#!/usr/bin/env python3
"""
المرحلة 4: صفحات الأنواع (عربي + إنجليزي).
  - صفحة المنتجات الرئيسية: H1 + مسار الصفحة + "تصفح حسب النوع" (روابط لكل نوع)
  - صفحتا خطوط الإنتاج والجونشات: العنوان بقى H1 + مسار الصفحة (نفس شكل باقي صفحات الأنواع)
  - كل صفحات الأنواع: BreadcrumbList + وسوم Open Graph (لو ناقصة)
  - عناوين الأنواع الطويلة اتقصّرت
آمن للتشغيل أكتر من مرة.   --check  معاينة بدون كتابة.
"""
import glob, html, json, os, posixpath, re, sys
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__))); os.chdir(ROOT)
sys.path.insert(0, os.path.join(ROOT, 'tools'))
import build_nav as bn
SITE = 'https://www.alshafeisteel.com'
MAXLEN = {'ar': 66, 'en': 62}
T = {'ar': dict(home='الرئيسية', products='المنتجات', browse='تصفح حسب النوع', n=lambda k: 'منتج واحد' if k == 1 else 'منتجان' if k == 2 else f'{k} منتجات' if k <= 10 else f'{k} منتج',
                lines='خطوط الإنتاج', choc='جونشات تحضير الشيكولاتة',
                h1='ماكينات تعبئة وتغليف صناعية',
                intro='اختار نوع الماكينة اللي يناسب مصنعك: تعبئة سوائل وبودر وبقوليات، خلاطات وجونشات شيكولاتة، مطاحن، ومعدات تغليف. كل ماكينة ليها صفحة بمواصفاتها وطلب السعر عبر واتساب.',
                title='ماكينات تعبئة وتغليف صناعية بالأسعار | الشافعي ستيل'),
     'en': dict(home='Home', products='Products', browse='Browse by type', n=lambda k: '1 product' if k == 1 else f'{k} products',
                lines='Production Lines', choc='Chocolate Preparation Tanks',
                h1='Industrial Filling & Packaging Machines',
                intro='Choose the machine type that fits your factory: liquid, powder and legumes filling, chocolate tanks and mixers, grinders, and packaging equipment. Every machine has its own page with specifications and a price request via WhatsApp.',
                title='Industrial Filling & Packaging Machines | Al Shafei Steel')}

def clean(x):
    while html.unescape(x) != x: x = html.unescape(x)
    return x

def lang_of(p): return 'en' if p.startswith('en/') else 'ar'
def pre_of(p): return 'en/' if p.startswith('en/') else ''
def rel(p, target): return posixpath.relpath(pre_of(p) + target, posixpath.dirname(p))
def abs_url(path): return SITE + '/' if path.endswith('index.html') and path.count('/') == 0 else f'{SITE}/{path}'

def crumb_html(p, names_targets, last):
    parts = [f'<a href="{rel(p, t)}">{html.escape(n)}</a>' for n, t in names_targets]
    return '<div class="breadcrumb">' + ' &nbsp;›&nbsp; '.join(parts + [html.escape(last)]) + '</div>'

def trim_title(lang, title):
    if len(title) <= MAXLEN[lang]: return title
    m = re.match(r'^(.*?) — (.*?) \| (.*)$', title)
    return f'{m.group(1)} | {m.group(3)}' if m else title

def process(p, check):
    s = open(p, encoding='utf-8').read(); o = s
    lang = lang_of(p); t = T[lang]; base = p[3:] if lang == 'en' else p
    home = ('index.html', t['home'])
    # ---- 1) hero / breadcrumb / H1 ----
    if base == 'machines/index.html':
        crumbs = [(t['home'], 'index.html')]; last = t['products']
        cat = bn.catalog()
        tiles = []
        for folder, lst in cat['machines']:
            lst = bn.avail(lang, lst)
            if lst: tiles.append((bn.CATS[folder][0 if lang == 'ar' else 1], f'machines/{folder}/index.html', len(lst)))
        tiles.append((t['choc'], 'chocolate/index.html', len(bn.avail(lang, cat['choc']))))
        tiles.append((t['lines'], 'production-lines/index.html', len(bn.avail(lang, cat['lines']))))
        grid = '\n'.join(f'<a class="type-card" href="{rel(p, tg)}"><strong>{html.escape(n)}</strong><span>{t["n"](c)}</span></a>' for n, tg, c in tiles)
        if 'class="category-hero"' not in s:
            hero = (f'<div class="category-hero">\n  {crumb_html(p, crumbs, last)}\n  <h1>{html.escape(t["h1"])}</h1>\n  <p>{html.escape(t["intro"])}</p>\n</div>\n'
                    f'<section class="type-section">\n<h2>{html.escape(t["browse"])}</h2>\n<div class="type-grid">\n{grid}\n</div>\n</section>\n')
            s = s.replace('<section class="machines" id="machines">', hero + '<section class="machines" id="machines" style="padding-top:30px;">', 1)
            assert 'category-hero' in s, p
        else:
            s = re.sub(r'(<div class="type-grid">\n).*?(\n</div>\n</section>)', lambda m: m.group(1) + grid + m.group(2), s, count=1, flags=re.S)
    elif base in ('production-lines/index.html', 'chocolate/index.html'):
        m = re.search(r'(<section class="machines [^"]*">)\s*<div class="section-title">\s*<h2>(.*?)</h2>\s*<p>(.*?)</p>\s*</div>', s, re.S)
        if m:
            h1, intro = m.group(2).strip(), m.group(3).strip()
            crumbs = [(t['home'], 'index.html')] + ([(t['products'], 'machines/index.html')] if base.startswith('chocolate') else []); last = clean(h1)
            hero = f'<div class="category-hero">\n  {crumb_html(p, crumbs, last)}\n  <h1>{h1}</h1>\n  <p>{intro}</p>\n</div>\n'
            sec = m.group(1)[:-1] + ' style="padding-top:20px;">'
            s = s.replace(m.group(0), hero + sec, 1)
    if re.fullmatch(r'machines/[a-z]+/index\.html', base):
        m = re.search(r'<div class="breadcrumb">(.*?)</div>', s, re.S)
        last = clean(re.sub(r'&nbsp;|›|\s+', ' ', re.sub(r'<a [^>]*>.*?</a>', '', m.group(1), flags=re.S)).strip())
        s = s.replace(m.group(0), crumb_html(p, [(t['home'], 'index.html'), (t['products'], 'machines/index.html')], last), 1)
    # ---- 2) BreadcrumbList + OG on every category page (always regenerated from the visible breadcrumb) ----
    s = re.sub(r'<script type="application/ld\+json">\s*\{(?:(?!</script>).)*"BreadcrumbList"(?:(?!</script>).)*</script>\n?', '', s, flags=re.S)
    bc = re.search(r'<div class="breadcrumb">(.*?)</div>', s, re.S)
    if bc and 'BreadcrumbList' not in s:
        names = [clean(re.sub(r'<[^>]+>', '', a).strip()) for a in re.findall(r'<a [^>]*>(.*?)</a>', bc.group(1), re.S)]
        hrefs = re.findall(r'<a [^>]*href="([^"]*)"', bc.group(1))
        last = clean(re.sub(r'&nbsp;|›|\s+', ' ', re.sub(r'<a [^>]*>.*?</a>', '', bc.group(1), flags=re.S)).strip())
        canon = re.search(r'<link rel="canonical" href="([^"]*)"', s).group(1)
        items = []
        for i, (n, h) in enumerate(zip(names, hrefs)):
            tgt = posixpath.normpath(posixpath.join(posixpath.dirname(p), h))
            items.append({'@type': 'ListItem', 'position': i + 1, 'name': n, 'item': SITE + '/' if tgt == 'index.html' else f'{SITE}/{tgt}'})
        items.append({'@type': 'ListItem', 'position': len(items) + 1, 'name': last, 'item': canon})
        ld = json.dumps({'@context': 'https://schema.org', '@type': 'BreadcrumbList', 'itemListElement': items}, ensure_ascii=False, indent=2)
        s = s.replace('</head>', f'<script type="application/ld+json">\n{ld}\n</script>\n</head>', 1)
    # ---- 3) title (main page text + trimming long ones) ----
    tm = re.search(r'<title>(.*?)</title>', s, re.S)
    new_title = t['title'] if base == 'machines/index.html' else trim_title(lang, tm.group(1).strip())
    s = s.replace(tm.group(0), f'<title>{new_title}</title>', 1)
    # ---- 4) OG tags (if missing) ----
    if 'property="og:title"' not in s:
        desc = re.search(r'<meta name="description" content="([^"]*)"', s).group(1)
        canon = re.search(r'<link rel="canonical" href="([^"]*)"', s).group(1)
        img = re.search(r'<div class="machine-card[^>]*>\s*<img[^>]*src="([^"]*)"', s)
        og = (f'<meta property="og:type" content="website">\n<meta property="og:title" content="{html.escape(new_title, quote=True)}">\n'
              f'<meta property="og:description" content="{desc}">\n<meta property="og:url" content="{canon}">\n'
              + (f'<meta property="og:image" content="{html.escape(img.group(1), quote=True)}">\n' if img else '')
              + f'<meta property="og:locale" content="{"en_US" if lang == "en" else "ar_EG"}">\n'
              f'<meta property="og:site_name" content="{"Al Shafei Steel" if lang == "en" else "شركة الشافعي ستيل"}">\n<meta name="twitter:card" content="summary_large_image">\n')
        s = s.replace('</head>', og + '</head>', 1)
    elif base == 'machines/index.html':   # keep the page's existing OG title in sync with the new <title>
        s = re.sub(r'(<meta property="og:title" content=")[^"]*(")', lambda m: m.group(1) + html.escape(new_title, quote=True) + m.group(2), s, count=1)
    if s != o and not check: open(p, 'w', encoding='utf-8').write(s)
    return s != o

def pages():
    cats = ['machines/index.html'] + sorted(glob.glob('machines/*/index.html')) + ['production-lines/index.html', 'chocolate/index.html']
    return cats + ['en/' + c for c in cats]

if __name__ == '__main__':
    chk = '--check' in sys.argv
    print(('would update' if chk else 'updated'), sum(process(p, chk) for p in pages()), 'category pages')
