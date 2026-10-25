"""Build a standalone, phone-ready copy of the app into docs/app/ (served by
GitHub Pages: Settings > Pages > Deploy from branch > main /docs).
The artifact version (index.html) gets its <html>/<head> from claude.ai;
this adds the document shell, mobile meta tags and an optional config.js."""
import shutil, os
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
OUT = os.path.join(ROOT, 'docs', 'app')
shutil.rmtree(OUT, ignore_errors=True)
for d in ('src', 'css', 'assets', 'clone'):
    shutil.copytree(os.path.join(ROOT, d), os.path.join(OUT, d))
body = open(os.path.join(ROOT, 'index.html'), encoding='utf-8').read()
head = '''<!doctype html><html lang="en"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover,maximum-scale=1">
<meta name="apple-mobile-web-app-capable" content="yes"><meta name="mobile-web-app-capable" content="yes">
<meta name="apple-mobile-web-app-status-bar-style" content="black-translucent">
<script src="config.js"></script>
'''
open(os.path.join(OUT, 'index.html'), 'w', encoding='utf-8').write(head + body + '\n</html>\n')
clone = open(os.path.join(ROOT, 'clone.html'), encoding='utf-8').read()
clone = clone.replace('<meta charset="utf-8">', '<meta charset="utf-8">\n<meta name="apple-mobile-web-app-capable" content="yes"><meta name="mobile-web-app-capable" content="yes">\n<script src="config.js"></script>', 1)
open(os.path.join(OUT, 'clone.html'), 'w', encoding='utf-8').write(clone)
cfg = os.path.join(OUT, 'config.js')
open(cfg, 'w').write('''// Optional. Point the app at your own AI proxy (server/worker.js) to get real
// Claude replies on GitHub Pages / in the Expo app:
// window.COMPANION_CONFIG = { aiService: { endpoint: 'https://luna-alex-ai.YOU.workers.dev' } };
window.COMPANION_CONFIG = window.COMPANION_CONFIG || {};
''')
open(os.path.join(ROOT, 'docs', '.nojekyll'), 'w').close()
print('built', OUT)
