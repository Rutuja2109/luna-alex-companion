"""End-to-end smoke test: fresh install -> onboarding -> every main screen."""
import subprocess, sys, time
from playwright.sync_api import sync_playwright
srv = subprocess.Popen([sys.executable, 'tools/serve.py', '8811']); time.sleep(.8)
U = 'http://127.0.0.1:8811/'
ok = []; errs = []
try:
  with sync_playwright() as p:
    b = p.chromium.launch(); pg = b.new_page(viewport={'width': 390, 'height': 844})
    pg.on('pageerror', lambda e: errs.append(str(e)))
    pg.on('console', lambda m: m.type == 'error' and 'TUNNEL' not in m.text and errs.append(m.text))
    def step(name, sel, wait=500):
      pg.click(sel); pg.wait_for_timeout(wait); ok.append(name)
    pg.goto(U); pg.wait_for_timeout(800)
    step('welcome->gallery', 'text=Choose a Male Companion')
    step('gallery->preview', '[data-next]')
    assert pg.locator('text=Choose Alex').count(), 'preview shows Alex'
    step('preview->appearance', '[data-choose]')
    step('pick swatch', '[data-group=hairColor] [data-i="2"]', 200)
    step('appearance->outfits', '[data-next]')
    step('pick outfit', '[data-outfit=study]', 200)
    step('outfits->personality', '[data-next]')
    step('toggle trait', '[data-p=calm]', 200)
    step('personality->voice', '[data-next]')
    step('pick voice', '[data-v=v2]', 300)
    step('voice->home style', '[data-next]')
    step('pick cozy', '[data-style=cozy]', 200)
    step('home style->final', '[data-next]')
    summ = pg.inner_text('.summary')
    step('final->home', '[data-start]', 900)
    assert 'Alex' in pg.inner_text('.home-id'), 'home for Alex'
    st = pg.evaluate("JSON.parse(localStorage.getItem('companion.state.v1'))")
    cfg = st['companions']['alex']
    assert cfg['outfit'] == 'study' and cfg['voice'] == 'v2' and cfg['home']['style'] == 'cozy' and 'calm' in cfg['personality'], cfg
    ok.append('config persisted')
    pg.reload(); pg.wait_for_timeout(900)
    assert pg.locator('.home-id').count(), 'home after restart'; ok.append('restart lands on home')
    for nav in ['chat', 'activities', 'memories', 'settings', 'home']:
      pg.click(f'.nav [data-nav={nav}]'); pg.wait_for_timeout(500); ok.append('nav ' + nav)
      if nav == 'chat': pg.click('[data-act=back]'); pg.wait_for_timeout(500)
    step('home->call', '.qa .call', 2500)
    step('end call', '[data-end]', 600)
    step('home->activities', '.qa .acts')
    step('open read', '[data-a=read]', 900)
    step('leave', '[data-leave]', 300); step('confirm leave', '[data-ok]', 500)
    for r in ['timeline', 'goals', 'customize', 'wallpaper', 'apartment', 'notifications', 'study']:
      pg.evaluate(f"location.hash='{r}'"); pg.reload(); pg.wait_for_timeout(700)
      assert pg.locator('.screen').count(), r; ok.append('route ' + r)
    b.close()
finally:
  srv.terminate()
print('PASSED steps:', len(ok)); print('summary:', summ.replace('\n', ' | ')); print('errors:', errs or 'none')
