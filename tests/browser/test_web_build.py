"""The standalone phone build (docs/app) works without claude.ai."""
import sys, os, subprocess; sys.path.insert(0, os.path.dirname(__file__))
from harness import app, check, bubbles, RESULTS
subprocess.run([sys.executable, 'tools/build_web.py'], check=True, capture_output=True)
with app(runtime=False) as A:
    pg = A.page()
    pg.goto(A.url + 'docs/app/?demo=luna#home'); pg.wait_for_timeout(1500)
    check('phone build renders the home screen', pg.locator('.home-id').count() == 1)
    vp = pg.evaluate("document.querySelector('meta[name=viewport]').content")
    check('phone build has a mobile viewport', 'width=device-width' in vp, vp)
    pg.goto(A.url + 'docs/app/#chat'); pg.reload(); pg.wait_for_timeout(1200)
    pg.fill('#msg', 'hey'); pg.keyboard.press('Enter'); pg.wait_for_timeout(5000)
    check('without an AI service: labelled offline mode', 'OFFLINE MODE' in pg.inner_text('[data-mode]').upper())
    pg.close()
    pg = A.page(); pg.add_init_script("window.COMPANION_CONFIG = { aiService: { endpoint: '/mock/ai' } }")
    pg.goto(A.url + 'docs/app/?demo=luna#chat'); pg.wait_for_timeout(1200)
    pg.fill('#msg', 'hey'); pg.keyboard.press('Enter'); pg.wait_for_timeout(5000)
    check('with a self-hosted AI endpoint: live replies come from it', bubbles(pg)[-1] == 'hey from the self-hosted AI path', bubbles(pg)[-1])
    check('and the chat shows Live AI', 'LIVE AI' in pg.inner_text('[data-mode]').upper())
    pg.screenshot(path='qa/web-build-chat.png')
    check('no page errors', not A.errors, str(A.errors[:2]))
fails = [r for r in RESULTS if not r[1]]
print(f'\n{len(RESULTS) - len(fails)}/{len(RESULTS)} passed'); sys.exit(1 if fails else 0)
