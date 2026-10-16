#!/usr/bin/env python3
"""
المرحلة 3: يكمّل قالب صفحة الماكينة (88 صفحة: عربي + إنجليزي).
  1) يعيد بناء مسار الصفحة (breadcrumb) بروابط صح لكل لغة (كان "الرئيسية" في الإنجليزي بتودّي على العربي)
  2) يضيف BreadcrumbList (JSON-LD) علشان جوجل يعرض المسار في النتائج
  3) يضيف وسوم Open Graph / Twitter علشان معاينة رابط الصفحة على واتساب وفيسبوك تظهر بصورة وعنوان
  4) صورة الماكينة الرئيسية: شيل lazy وحط fetchpriority="high" (هي أول حاجة بتظهر في الصفحة)
  5) روابط الفوتر في الصفحات العربية: بالعربي بدل الإنجليزي
آمن للتشغيل أكتر من مرة.   --check  لمعاينة من غير كتابة.
"""
import glob, html, json, os, posixpath, re, sys

def clean(x):
    while html.unescape(x) != x: x = html.unescape(x)
    return x
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__))); os.chdir(ROOT)
SITE = 'https://www.alshafeisteel.com'
FOOT = {'About Us': 'من نحن', 'Contact Us': 'اتصل بنا', 'Shipping & Service Info': 'معلومات الشحن والخدمة',
        'Privacy Policy': 'سياسة الخصوصية', 'Terms & Conditions': 'الشروط والأحكام'}

def product_pages():
    fs = [f for f in glob.glob('machines/*/*.html') + glob.glob('chocolate/*.html') + glob.glob('production-lines/*.html')
          if not f.endswith('index.html')]
    fs = [f for f in fs if os.path.exists('en/' + f)]   # الصفحات اللي اتولّدت من لوحة التحكم عربي بس
    return sorted(fs) + ['en/' + f for f in sorted(fs)]

def abs_url(path):
    return SITE + '/' if path == 'index.html' else f'{SITE}/{path}'

def breadcrumb_targets(p):
    en = p.startswith('en/'); base = p[3:] if en else p
    pre = 'en/' if en else ''
    parts = base.split('/')
    if parts[0] == 'machines':   t = ['index.html', 'machines/index.html', f'machines/{parts[1]}/index.html']
    elif parts[0] == 'chocolate': t = ['index.html', 'machines/index.html', 'chocolate/index.html']
    else:                         t = ['index.html', 'production-lines/index.html']
    return [pre + x for x in t]

def process(p, check):
    s = open(p, encoding='utf-8').read(); o = s
    en = p.startswith('en/')
    # 1) breadcrumb
    m = re.search(r'<div class="breadcrumb">(.*?)</div>', s, re.S)
    names = [re.sub(r'<[^>]+>', '', a).strip() for a in re.findall(r'<a [^>]*>(.*?)</a>', m.group(1), re.S)]
    last = re.sub(r'&nbsp;|›|\s+', ' ', re.sub(r'<a [^>]*>.*?</a>', '', m.group(1), flags=re.S)).strip()
    targets = breadcrumb_targets(p); assert len(names) == len(targets), (p, names, targets)
    here = posixpath.dirname(p)
    links = [posixpath.relpath(t, here) for t in targets]
    bc = ' &nbsp;›&nbsp; '.join(f'<a href="{l}">{n}</a>' for l, n in zip(links, names)) + f' &nbsp;›&nbsp; {last}'
    s = s.replace(m.group(0), f'<div class="breadcrumb">{bc}</div>', 1)
    canon = re.search(r'<link rel="canonical" href="([^"]*)"', s).group(1)
    # 2) BreadcrumbList JSON-LD
    if 'BreadcrumbList' not in s:
        items = [{'@type': 'ListItem', 'position': i + 1, 'name': clean(n), 'item': abs_url(t)} for i, (n, t) in enumerate(zip(names, targets))]
        items.append({'@type': 'ListItem', 'position': len(items) + 1, 'name': clean(last), 'item': canon})
        ld = json.dumps({'@context': 'https://schema.org', '@type': 'BreadcrumbList', 'itemListElement': items}, ensure_ascii=False, indent=2)
        s = s.replace('</head>', f'<script type="application/ld+json">\n{ld}\n</script>\n</head>', 1)
    # 3) Open Graph / Twitter
    if 'property="og:title"' not in s:
        title = html.escape(re.search(r'<title>(.*?)</title>', s, re.S).group(1).strip(), quote=True)
        desc = re.search(r'<meta name="description" content="([^"]*)"', s).group(1)
        prod = next(json.loads(x) for x in re.findall(r'<script type="application/ld\+json">(.*?)</script>', s, re.S) if '"Product"' in x)
        img = prod.get('image'); img = img[0] if isinstance(img, list) else img
        og = (f'<meta property="og:type" content="product">\n<meta property="og:title" content="{title}">\n'
              f'<meta property="og:description" content="{desc}">\n<meta property="og:url" content="{canon}">\n'
              f'<meta property="og:image" content="{html.escape(img, quote=True)}">\n'
              f'<meta property="og:locale" content="{"en_US" if en else "ar_EG"}">\n'
              f'<meta property="og:site_name" content="{"Al Shafei Steel" if en else "شركة الشافعي ستيل"}">\n'
              f'<meta name="twitter:card" content="summary_large_image">\n')
        s = s.replace('</head>', og + '</head>', 1)
    # 4) main image = LCP
    s = re.sub(r'(<div class="product-image">\s*<img) loading="lazy" decoding="async"', r'\1 fetchpriority="high" decoding="async"', s, count=1)
    if s != o and not check: open(p, 'w', encoding='utf-8').write(s)
    return s != o

def footer_ar():
    n = 0
    for f in glob.glob('**/*.html', recursive=True):
        if f.startswith(('assets/', 'tools/', 'en/', 'blog/en/')) or os.path.basename(f).startswith('google'): continue
        s = open(f, encoding='utf-8').read()
        m = re.search(r'<div class="footer-links-list"[^>]*>.*?</div>', s, re.S)
        if not m: continue
        blk = m.group(0)
        for en_t, ar_t in FOOT.items(): blk = blk.replace('>' + en_t + '</a>', '>' + ar_t + '</a>')
        if blk != m.group(0):
            n += 1
            if '--check' not in sys.argv: open(f, 'w', encoding='utf-8').write(s.replace(m.group(0), blk, 1))
    return n

if __name__ == '__main__':
    chk = '--check' in sys.argv
    ch = sum(process(p, chk) for p in product_pages())
    print(('would update' if chk else 'updated'), ch, 'product pages |', 'Arabic footers:', footer_ar())
