#!/usr/bin/env python3
"""
المرحلة 2: ينضّف عناوين (title) وALT صور صفحات الماكينات.
  - يشيل كود الموديل (ASH-...) من <title> ويسيبه في الصفحة نفسها
  - يقصّر العنوان لو طويل (أكتر من 62-66 حرف) علشان جوجل ما يقصّوش
  - لو عنوانين هيتطابقوا بعد شيل الكود: يستخدم الـ H1 لو بيفرّق، وإلا يسيب الكود
  - الـ ALT: "الاسم Model ASH-X — الشركة"  ->  "الاسم — الشركة (ASH-X)"
بيكتب تقرير قبل/بعد في tools/titles-before-after.csv
آمن للتشغيل أكتر من مرة.   --dry-run  لمعاينة من غير كتابة.
"""
import csv, glob, os, re, sys, collections
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__))); os.chdir(ROOT)
CODE = re.compile(r'\s*\bASH-[A-Z0-9]+\b')
MAXLEN = {'ar': 66, 'en': 62}   # حد تقريبي لطول العنوان قبل ما جوجل يقصّه
SUF = {'ar': (' — المواصفات والسعر | الشافعي ستيل', ' | الشافعي ستيل'),
       'en': (' — Specs & Price | Al Shafei Steel',   ' | Al Shafei Steel')}

def product_pages():
    fs = [f for f in glob.glob('machines/*/*.html') + glob.glob('chocolate/*.html') + glob.glob('production-lines/*.html')
          if not f.endswith('index.html')]
    fs = [f for f in fs if os.path.exists('en/' + f)]   # الصفحات اللي اتولّدت من لوحة التحكم عربي بس
    return sorted(fs) + ['en/' + f for f in sorted(fs)]

def get(s, pat):
    m = re.search(pat, s, re.S); return m.group(1).strip() if m else ''

def name_of(title):
    return CODE.sub('', re.split(r' — | \| ', title)[0]).strip()

def build(lang, name):
    full, short = SUF[lang]
    return name + full if len(name + full) <= MAXLEN[lang] else name + short

def main(dry):
    pages = {}
    for f in product_pages():
        s = open(f, encoding='utf-8').read(); lang = 'en' if f.startswith('en/') else 'ar'
        title = get(s, r'<title>(.*?)</title>'); h1 = re.sub(r'<[^>]+>|\s+', ' ', get(s, r'<h1[^>]*>(.*?)</h1>')).strip()
        pages[f] = dict(s=s, lang=lang, old=title, name=name_of(title), h1=h1)
    # collisions after stripping the code
    groups = collections.defaultdict(list)
    for f, p in pages.items(): groups[(p['lang'], p['name'])].append(f)
    keep_code = set()
    for (lang, name), fs in groups.items():
        if len(fs) < 2: continue
        h1s = [pages[f]['h1'] for f in fs]
        if len(set(h1s)) == len(fs):                       # الـ H1 بيفرّق بينهم
            for f in fs: pages[f]['name'] = pages[f]['h1']
        else:
            keep_code.update(fs)
    rows, changed = [], 0
    for f, p in pages.items():
        code = re.search(r'\bASH-[A-Z0-9]+\b', p['old'])
        new_title = build(p['lang'], p['name'] + ' ' + code.group(0)) if (f in keep_code and code) else build(p['lang'], p['name'])
        s = p['s']
        s2 = s.replace(f'<title>{get(s, r"<title>(.*?)</title>") if False else p["old"]}</title>', f'<title>{new_title}</title>', 1) \
             if f'<title>{p["old"]}</title>' in s else re.sub(r'<title>.*?</title>', lambda m: f'<title>{new_title}</title>', s, count=1, flags=re.S)
        s2 = re.sub(r'alt="([^"]*?) Model (ASH-[A-Z0-9]+) — ([^"]*)"', r'alt="\1 — \3 (\2)"', s2)
        rows.append((f, p['old'], new_title, 'الكود محفوظ لأن الاسم مطابق لصفحة تانية' if f in keep_code else ''))
        if s2 != s:
            changed += 1
            if not dry: open(f, 'w', encoding='utf-8').write(s2)
    if not dry:
        with open('tools/titles-before-after.csv', 'w', encoding='utf-8-sig', newline='') as fh:
            w = csv.writer(fh); w.writerow(['page', 'old title', 'new title', 'note']); w.writerows(rows)
    L = [len(r[2]) for r in rows]; dup = [t for t, c in collections.Counter((('en' if r[0].startswith('en/') else 'ar'), r[2]) for r in rows).items() if c > 1]
    print(('would change' if dry else 'changed'), changed, 'pages |', len(keep_code), 'pages keep the code (identical names) | max title length', max(L), '| over limit:', sum(len(r[2]) > MAXLEN['en' if r[0].startswith('en/') else 'ar'] for r in rows), '| duplicate titles:', len(dup))
    return rows

if __name__ == '__main__':
    rows = main('--dry-run' in sys.argv)
    for r in rows[:3] + [x for x in rows if 'powder-filling' in x[0] or 'viscous' in x[0]][:6]: print(' ', r[0], '\n    ', r[1], '\n    ->', r[2])
