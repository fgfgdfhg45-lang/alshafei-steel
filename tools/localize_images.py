#!/usr/bin/env python3
"""
ينقل صور المنتجات من Cloudinary / i.ibb.co / imgur لملفات WebP على سيرفرك،
ويعدّل الروابط في كل صفحات الموقع.

الاستخدام (من فولدر الموقع):
    pip install pillow
    python3 tools/localize_images.py --dry-run     # يعرض اللي هيتعمل بس
    python3 tools/localize_images.py               # ينزّل ويحوّل ويعدّل الروابط

- الصور بتتحفظ في assets/img/products/
- الصورة اللي تفشل في التنزيل بتفضل على رابطها القديم وبتظهر في التقرير.
- تقدر تشغّله أكتر من مرة: الصور المنزّلة قبل كده مش بتتنزّل تاني.
"""
import glob, hashlib, io, json, os, re, sys, time
import urllib.request, urllib.error

try:
    from PIL import Image
except ImportError:
    sys.exit('محتاج Pillow:  pip install pillow')

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
OUT_DIR = os.path.join(ROOT, 'assets', 'img', 'products')
SITE = 'https://www.alshafeisteel.com'
MAX_W = 1200
URL_RE = re.compile(r'https://res\.cloudinary\.com/[^/\s"\'<>)]+/image/fetch/(?:[^/\s"\'<>)]*,[^/\s"\'<>)]*/)?(https?://[^\s"\'<>)]+)')

def files():
    out = []
    for pat in ('**/*.html', 'assets/*.js', 'assets/*.css'):
        for f in glob.glob(os.path.join(ROOT, pat), recursive=True):
            rel = os.path.relpath(f, ROOT).replace(os.sep, '/')
            if rel.startswith('assets/admin') or rel.startswith('tools/'):
                continue
            out.append(rel)
    return sorted(out)

def local_name(orig):
    base = os.path.splitext(os.path.basename(orig.split('?')[0]))[0]
    base = re.sub(r'[^A-Za-z0-9_-]+', '-', base).strip('-').lower()[:50] or 'img'
    return f"{base}-{hashlib.md5(orig.encode()).hexdigest()[:6]}.webp"

def download(url, fallback=None):
    last = None
    for u in (url, fallback):
        if not u: continue
        for attempt in range(2):
            try:
                req = urllib.request.Request(u, headers={'User-Agent': 'Mozilla/5.0'})
                with urllib.request.urlopen(req, timeout=25) as r:
                    return r.read()
            except Exception as e:
                last = e; time.sleep(1)
    raise last

def convert(data, dest):
    im = Image.open(io.BytesIO(data))
    im = im.convert('RGBA' if ('A' in im.getbands() or im.mode == 'P') else 'RGB')
    if im.width > MAX_W:
        im = im.resize((MAX_W, round(im.height * MAX_W / im.width)), Image.LANCZOS)
    im.save(dest, 'WEBP', quality=84, method=6)

def main(dry):
    texts = {f: open(os.path.join(ROOT, f), encoding='utf-8', errors='ignore').read() for f in files()}
    originals = {}                       # original url -> full cloudinary urls
    for f, s in texts.items():
        for m in URL_RE.finditer(s):
            originals.setdefault(m.group(1), set()).add(m.group(0))
    print(f'لقيت {len(originals)} صورة مختلفة في {sum(1 for s in texts.values() if URL_RE.search(s))} ملف')
    if dry:
        for o in list(originals)[:10]: print('  ', o)
        print('   ...'); return

    os.makedirs(OUT_DIR, exist_ok=True)
    ok, failed = {}, []
    for i, (orig, fulls) in enumerate(sorted(originals.items()), 1):
        name = local_name(orig); dest = os.path.join(OUT_DIR, name)
        if not os.path.exists(dest):
            try:
                convert(download(orig, sorted(fulls)[0]), dest)
            except Exception as e:
                failed.append((orig, str(e))); print(f'[{i}/{len(originals)}] فشل  {orig}  ({e})'); continue
        ok[orig] = name; print(f'[{i}/{len(originals)}] تمام  {name}')

    changed = 0
    for f, s in texts.items():
        ld = [m.span() for m in re.finditer(r'<script[^>]*application/ld\+json[^>]*>.*?</script>', s, re.S)]
        def sub(m):
            name = ok.get(m.group(1))
            if not name: return m.group(0)
            pos = m.start()
            absolute = s[max(0, pos - 9):pos] == 'content="' or any(a <= pos < b for a, b in ld)
            if absolute or f.endswith(('.js', '.css')):
                return f'{SITE}/assets/img/products/{name}' if absolute else f'/assets/img/products/{name}'
            return os.path.relpath(os.path.join('assets/img/products', name), os.path.dirname(f) or '.').replace(os.sep, '/')
        new = URL_RE.sub(sub, s)
        if new != s:
            open(os.path.join(ROOT, f), 'w', encoding='utf-8').write(new); changed += 1
    json.dump(ok, open(os.path.join(ROOT, 'tools', 'image-map.json'), 'w', encoding='utf-8'), indent=1, ensure_ascii=False)
    print(f'\nخلصنا: {len(ok)} صورة اتنقلت، {len(failed)} فشلت، {changed} ملف اتعدّل.')
    for o, e in failed: print('  لسه على الرابط القديم:', o)

if __name__ == '__main__':
    main('--dry-run' in sys.argv)
