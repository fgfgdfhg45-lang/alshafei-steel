#!/usr/bin/env python3
"""
يولّد قايمة الموقع (مع القوايم المنسدلة) ويحطها في كل الصفحات، عربي وإنجليزي.

  python3 tools/build_nav.py          # يكتب القايمة في كل الصفحات
  python3 tools/build_nav.py --check  # يفحص بس: كل الروابط موجودة؟ وكل لغة بتفضل في لغتها؟

- القايمة بتتبني من الفولدرات الموجودة فعلاً: machines/<نوع>/<ماكينة>.html و production-lines/ و chocolate/
- أسماء الماكينات من الـ H1 في كل صفحة (العربي من الصفحة، والإنجليزي من نسختها في en/)
- لما تضيف ماكينة جديدة: اعمل صفحتها وشغّل السكربت ده، والقايمة تتحدّث في كل الصفحات.
- آمن للتشغيل أكتر من مرة (بيستبدل الجزء بين علامتي NAV بس).
"""
import glob, html, os, re, sys

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
os.chdir(ROOT)

CATS = {  # folder -> (AR short label, EN short label)
    'liquids':   ('تعبئة السوائل', 'Liquid Filling'),
    'powder':    ('تعبئة البودر', 'Powder Filling'),
    'legumes':   ('تعبئة البقوليات', 'Legumes Filling'),
    'packaging': ('تعبئة الكاتشب والموازين', 'Ketchup & Multi-Weigher'),
    'mixers':    ('الخلاطات والمُريح', 'Mixers & Conches'),
    'grinding':  ('ماكينات الطحن', 'Grinding Machines'),
    'equipment': ('معدات صناعية إضافية', 'Additional Equipment'),
}
L = {
    'ar': dict(home='الرئيسية', about='من نحن', services='الخدمات', products='المنتجات', lines='خطوط الإنتاج',
               choc='الشيكولاتة', blog='المقالات', contact='اتصل بنا',
               all_products='كل المنتجات', all_lines='كل خطوط الإنتاج', all_choc='كل ماكينات الشيكولاتة', all_cat='عرض كل'),
    'en': dict(home='Home', about='About Us', services='Services', products='Products', lines='Production Lines',
               choc='Chocolate', blog='Articles', contact='Contact Us',
               all_products='All Products', all_lines='All Production Lines', all_choc='All Chocolate Machines', all_cat='View all'),
}

def h1(path):
    try:
        s = open(path, encoding='utf-8', errors='ignore').read()
    except OSError:
        return None
    m = re.search(r'<h1[^>]*>(.*?)</h1>', s, re.S)
    return re.sub(r'\s+', ' ', re.sub(r'<[^>]+>', '', m.group(1))).strip() if m else None

def items(folder):
    out = []
    for f in sorted(glob.glob(f'{folder}/*.html')):
        if f.endswith('index.html'):
            continue
        out.append((f, h1(f) or os.path.basename(f)[:-5], h1('en/' + f) or h1(f) or os.path.basename(f)[:-5]))
    return out

def catalog():
    cat = {'machines': [], 'lines': items('production-lines'), 'choc': items('chocolate')}
    for folder in CATS:
        cat['machines'].append((folder, items(f'machines/{folder}')))
    return cat

def avail(lang, lst):
    """في القايمة الإنجليزي: بس الصفحات اللي ليها نسخة إنجليزي (الماكينات اللي بتتضاف من لوحة التحكم عربي بس)."""
    return lst if lang == 'ar' else [x for x in lst if os.path.exists('en/' + x[0])]

def page_lang(p):
    return 'en' if p.startswith('en/') or p.startswith('blog/en/') else 'ar'

def normalize(p):
    if p.startswith('en/'): return p[3:]
    if p.startswith('blog/en/'): return 'blog/' + p[8:]
    return p

def make_nav(p, cat):
    lang = page_lang(p); t = L[lang]; pre = 'en/' if lang == 'en' else ''
    here = os.path.dirname(p) or '.'
    missing = []
    def href(target):
        frag = ''
        if '#' in target: target, frag = target.split('#', 1); frag = '#' + frag
        real = pre + target
        if not os.path.exists(real):
            missing.append(real); real = target
        return os.path.relpath(real, here).replace(os.sep, '/') + frag
    e = lambda s: html.escape(s, quote=True)
    np = normalize(p)
    active = ('home' if np == 'index.html' else 'about' if np.startswith('about/') else 'products' if np.startswith('machines/')
              else 'lines' if np.startswith('production-lines/') else 'choc' if np.startswith('chocolate/')
              else 'blog' if np.startswith('blog/') else 'contact' if np.startswith('contact/') else '')
    def cls(key, extra=''):
        c = (extra + (' active' if active == key else '')).strip()
        return (f' class="{c}"' if c else '') + (' aria-current="page"' if active == key and key in ('home',) else '')
    def target_of(f):  # product page path (AR path) -> link in current language
        return href(f)
    def simple(key, target, label, tr):
        return f'<a href="{href(target)}"{cls(key)}{f" data-translate=\"{tr}\"" if tr else ""}>{e(label)}</a>'
    def dropdown(key, target, label, tr, inner):
        return (f'<div class="nav-item has-dropdown{" active" if active == key else ""}">'
                f'<a href="{href(target)}" class="nav-parent{" active" if active == key else ""}" aria-haspopup="true" aria-expanded="false">'
                f'<span class="nav-label"{f" data-translate=\"{tr}\"" if tr else ""}>{e(label)}</span><i class="nav-caret" aria-hidden="true"></i></a>'
                f'<div class="nav-dropdown">{inner}</div></div>')
    def flat(all_target, all_label, lst):
        out = f'<a href="{href(all_target)}" class="nav-all">{e(all_label)}</a>'
        for f, ar, en in avail(lang, lst):
            out += f'<a href="{target_of(f)}">{e(ar if lang == "ar" else en)}</a>'
        return out
    # products: categories with fly-outs
    prod = f'<a href="{href("machines/index.html")}" class="nav-all">{e(t["all_products"])}</a>'
    for folder, lst in cat['machines']:
        lst = avail(lang, lst)
        if not lst: continue
        name = CATS[folder][0 if lang == 'ar' else 1]
        fly = f'<a href="{href(f"machines/{folder}/index.html")}" class="nav-all">{e(t["all_cat"])} {e(name)}</a>'
        for f, ar, en in lst:
            fly += f'<a href="{target_of(f)}">{e(ar if lang == "ar" else en)}</a>'
        prod += (f'<div class="nav-sub"><a href="{href(f"machines/{folder}/index.html")}" class="nav-sub-link">'
                 f'<span>{e(name)}</span><i class="nav-caret nav-caret-side" aria-hidden="true"></i></a>'
                 f'<div class="nav-flyout">{fly}</div></div>')
    parts = [
        simple('home', 'index.html', t['home'], 'nav_home'),
        simple('about', 'about/index.html', t['about'], 'nav_about'),
        simple('', 'index.html#services', t['services'], ''),
        dropdown('products', 'machines/index.html', t['products'], 'nav_machines', prod),
        dropdown('lines', 'production-lines/index.html', t['lines'], '', flat('production-lines/index.html', t['all_lines'], cat['lines'])),
        dropdown('choc', 'chocolate/index.html', t['choc'], '', flat('chocolate/index.html', t['all_choc'], cat['choc'])),
        simple('blog', 'blog/index.html' if lang == 'ar' else 'blog/index.html', t['blog'], ''),
        simple('contact', 'contact/index.html', t['contact'], 'nav_contact'),
    ]
    return '\n'.join(parts), missing

START, END = '<!--NAV-->', '<!--/NAV-->'
OLD = re.compile(r'(<div class="nav-links" id="nav-links">)(.*?)(</div>\s*\n\s*\n?<div class="nav-controls-row">)', re.S)
NEW = re.compile(r'(<div class="nav-links" id="nav-links">)\s*' + re.escape(START) + r'.*?' + re.escape(END) + r'\s*(</div>)', re.S)

def pages():
    out = []
    for f in sorted(glob.glob('**/*.html', recursive=True)):
        if f.startswith(('assets/', 'tools/')) or os.path.basename(f).startswith('google'): continue
        out.append(f.replace(os.sep, '/'))
    return out

def main(check):
    cat = catalog()
    n = bad = 0; allmissing = set(); crossed = []
    for p in pages():
        s = open(p, encoding='utf-8').read()
        block, missing = make_nav(p, cat); allmissing |= set(missing)
        # language isolation check: every generated href must stay inside the page's language tree
        lang = page_lang(p)
        for h in re.findall(r'href="([^"#]*)', block):
            tgt = os.path.normpath(os.path.join(os.path.dirname(p), h)).replace(os.sep, '/')
            if (lang == 'en') != (tgt.startswith('en/') or tgt.startswith('blog/en/')): crossed.append((p, tgt))
        new_block = f'{START}\n{block}\n{END}'
        if NEW.search(s):
            s2 = NEW.sub(lambda m: f'{m.group(1)}\n{new_block}\n{m.group(2)}', s, count=1)
        elif OLD.search(s):
            s2 = OLD.sub(lambda m: f'{m.group(1)}\n{new_block}\n</div>\n\n<div class="nav-controls-row">', s, count=1)
        else:
            print('!! nav block not found in', p); bad += 1; continue
        # shared nav.js + css cache-bust
        depth = os.path.relpath('assets/nav.js', os.path.dirname(p) or '.').replace(os.sep, '/')
        if 'assets/nav.js' not in s2:
            s2 = s2.replace('</body>', f'<script defer src="{depth}?v=1"></script>\n</body>', 1)
        s2 = re.sub(r'(assets/style\.css)(?!\?)', r'\1?v=2', s2)
        if s2 != s:
            n += 1
            if not check: open(p, 'w', encoding='utf-8').write(s2)
    print(f'{"would update" if check else "updated"} {n} pages | nav not found: {bad}')
    print('missing link targets:', sorted(allmissing) if allmissing else 'none')
    print('links crossing between languages:', crossed[:5] if crossed else 'none')

if __name__ == '__main__':
    main('--check' in sys.argv)
