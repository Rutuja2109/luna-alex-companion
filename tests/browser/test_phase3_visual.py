"""Phase 3: customization visibly affects previews, honestly labelled."""
import sys, os; sys.path.insert(0, os.path.dirname(__file__))
from harness import app, check, state, RESULTS

with app() as A:
    pg = A.page(); pg.goto(A.url + '?demo=luna#customize'); pg.wait_for_timeout(900)
    # Outfit change -> preview + home hero change, face set unchanged
    before = pg.get_attribute('[data-photo]', 'src')
    pg.click('[data-outfit=cozy]'); pg.wait_for_timeout(200)
    after = pg.get_attribute('[data-photo]', 'src')
    check('outfit choice changes the preview photo', before != after, f'{before} -> {after}')
    pg.click('[data-save]'); pg.wait_for_timeout(200)
    pg.goto(A.url + '#home'); pg.reload(); pg.wait_for_timeout(900)
    check('saved outfit shows on the home screen', pg.get_attribute('.home-hero img.fg', 'src') == after)
    check('avatar (face) is unchanged by outfit', 'luna-face' in pg.get_attribute('.home-id img', 'src'))
    # Look tab: tint preview + honest notice when no image service
    pg.goto(A.url + '#customize'); pg.reload(); pg.wait_for_timeout(700)
    pg.click('[data-tab=look]'); pg.wait_for_timeout(200)
    pg.click('[data-group=hairColor] [data-i="4"]'); pg.wait_for_timeout(200)
    tint = pg.get_attribute('[data-tint]', 'style') or ''
    check('hair colour shows a preview tint', 'background' in tint, tint)
    notice = pg.inner_text('.notice')
    check('UI says skin/eye are preferences only (no fake re-render)', 'Preferences only' in notice and "photos don't change" in notice, notice)
    check('no "Render" button without an image service', pg.locator('[data-gen]').count() == 0)
    pg.screenshot(path='qa/p3-look.png')
    # Room tab: decor visibly overlays the preview
    pg.click('[data-tab=room]'); pg.wait_for_timeout(200); pg.click('[data-sub=decor]'); pg.wait_for_timeout(200)
    for d in ['fairy', 'plants', 'candles']: pg.click(f'[data-decor={d}]'); pg.wait_for_timeout(120)
    layers = pg.evaluate("[...document.querySelectorAll('.cust-photo .decor > span')].map(s=>s.className)")
    check('decor choices draw overlays on the room preview', {'decor-fairy', 'decor-candles'} <= set(layers) and any('plant' in l for l in layers), str(layers))
    check('overlay labelled "Decor preview"', pg.locator('.cust-photo .decor-chip').count() == 1)
    pg.screenshot(path='qa/p3-decor.png')
    pg.click('[data-save]'); pg.wait_for_timeout(200)
    pg.goto(A.url + '#apartment'); pg.reload(); pg.wait_for_timeout(900)
    check('saved decor appears in the apartment live view', pg.locator('.live-scene .decor-fairy').count() == 1)
    pg.close()
    # Image service configured -> real request, rendered image used, can reset
    pg = A.page(); pg.add_init_script("window.COMPANION_CONFIG = { imageService: { endpoint: '/mock/imagegen' } }")
    pg.goto(A.url + '?demo=luna#customize'); pg.wait_for_timeout(900)
    pg.click('[data-tab=look]'); pg.wait_for_timeout(200)
    check('with an image service, "Render this look" is offered', pg.locator('[data-gen]').count() == 1)
    pg.click('[data-gen]'); pg.wait_for_timeout(1200)
    pg.click('[data-save]'); pg.wait_for_timeout(200)
    check('rendered look is saved to the companion', bool(state(pg)['companions']['luna'].get('lookImage')))
    pg.close()
    # Alex home hero now fills the hero area (no empty band)
    pg = A.page(); pg.goto(A.url + '?demo=alex#home'); pg.wait_for_timeout(1200)
    box = pg.evaluate("(() => { const i = document.querySelector('.home-hero img.fg').getBoundingClientRect(); const h = document.querySelector('.home-hero').getBoundingClientRect(); return [i.top - h.top, i.height, h.height]; })()")
    check('Alex hero photo fills the hero (dark band above it under 25% of the hero, as in the reference)', box[0] / box[2] < 0.25, str(box))
    pg.screenshot(path='qa/p3-alex-home.png')
    pg.close()
    check('no page errors', not A.errors, str(A.errors[:2]))
fails = [r for r in RESULTS if not r[1]]
print(f'\n{len(RESULTS) - len(fails)}/{len(RESULTS)} passed'); sys.exit(1 if fails else 0)
