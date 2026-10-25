"""Phase 1: conversation quality and continuity, in the real chat screen."""
import sys, os, time; sys.path.insert(0, os.path.dirname(__file__))
from harness import app, check, bubbles, state, RESULTS

with app() as A:
    # 1. Several quick messages -> ONE request covering all of them, no duplicates
    pg = A.page(); pg.goto(A.url + '?demo=luna#chat'); pg.wait_for_timeout(1200)
    base = len(bubbles(pg))
    for t in ['so many meetings', 'like 6 of them', "i'm dead"]:
        pg.fill('#msg', t); pg.keyboard.press('Enter'); pg.wait_for_timeout(250)
    pg.wait_for_function(f"document.querySelectorAll('.msg.them[data-id]').length > {base}", timeout=15000)
    pg.wait_for_timeout(2500)
    new = bubbles(pg)[base:]
    calls = pg.evaluate('window.__calls.length')
    check('3 rapid messages answered by one request', calls == 1, f'calls={calls}')
    check('reply addressed all 3 messages', new == ['reply #1 to 3'], str(new))
    mine = pg.evaluate("[...document.querySelectorAll('.msg.me[data-id]')].length")
    check('no user message lost or duplicated', mine == 2 + 3, f'me bubbles={mine}')

    # 2. Message sent while her reply is in flight -> superseded, answered together
    pg.evaluate('window.__delay = 1500')
    pg.fill('#msg', 'wait'); pg.keyboard.press('Enter'); pg.wait_for_timeout(2600)   # request in flight
    pg.fill('#msg', 'also this'); pg.keyboard.press('Enter')
    pg.wait_for_timeout(9000)
    new2 = bubbles(pg)[base + 1:]
    check('message sent mid-request is not dropped (answered with the batch)', new2 and new2[-1].endswith('to 2'), str(new2))
    check('superseded request never delivered (no duplicate replies)', len(new2) == 1, str(new2))

    # 3. Failure -> visible failed state -> Retry works
    pg.evaluate("window.__delay = 200; window.__queue = ['fail']")
    pg.fill('#msg', 'you there?'); pg.keyboard.press('Enter')
    pg.wait_for_selector('.fail-row', timeout=10000)
    status = pg.inner_text('[data-st]')
    check('failed request shows an error row with Retry', pg.locator('[data-retry]').count() == 1)
    check('header shows the failure', "Couldn't reply" in status, status)
    no_canned = not any('offline' in (x or '') for x in pg.evaluate("[...document.querySelectorAll('.off-tag')].map(e=>e.textContent)"))
    check('live failure is NOT replaced by an offline canned reply', no_canned)
    pg.screenshot(path='qa/p1-fail.png')
    n = len(bubbles(pg)); pg.click('[data-retry]'); pg.wait_for_timeout(4000)
    check('Retry delivers the reply and clears the error', len(bubbles(pg)) == n + 1 and pg.locator('.fail-row').count() == 0)

    # 4. Garbage output -> one silent retry, then error (never rendered raw)
    pg.evaluate("window.__queue = ['garbage', 'garbage']")
    pg.fill('#msg', 'test'); pg.keyboard.press('Enter'); pg.wait_for_selector('.fail-row', timeout=10000)
    check('malformed AI output shows "couldn\'t be read" error, nothing raw rendered', "couldn't be read" in pg.inner_text('.fail-row'))
    pg.click('[data-dismiss]')

    # 5. Slow reply -> "taking longer" + Cancel
    pg.evaluate("window.__queue = ['hang']")
    pg.fill('#msg', 'hello?'); pg.keyboard.press('Enter'); pg.wait_for_selector('.slow-note', timeout=20000)
    check('slow reply shows "Taking longer than usual · Cancel"', pg.locator('[data-cancel]').count() == 1)
    pg.click('[data-cancel]'); pg.wait_for_timeout(400)
    check('Cancel stops the request and offers Retry', 'cancelled' in pg.inner_text('.fail-row'))
    pg.click('[data-retry]'); pg.wait_for_timeout(4000)
    check('message is answered after retrying a cancelled request', pg.locator('.fail-row').count() == 0)

    # 6. Scroll position preserved while reading older messages
    pg.evaluate("window.__delay = 2500")
    pg.fill('#msg', 'one more'); pg.keyboard.press('Enter'); pg.wait_for_timeout(300)
    pg.evaluate("document.querySelector('[data-body]').scrollTop = 0"); pg.wait_for_timeout(200)
    pg.wait_for_function(f"document.querySelectorAll('.msg.them[data-id]').length > {len(bubbles(pg))}", timeout=15000); pg.wait_for_timeout(400)
    top = pg.evaluate("document.querySelector('[data-body]').scrollTop")
    pill = pg.locator('[data-newpill]:not([hidden])').count()
    check('incoming message does not yank you down while reading history', top < 50, f'scrollTop={top}')
    check('"New message" pill appears instead', pill == 1)
    pg.close()

    # 7. Returning after several hours: opener fires; prompt states the real absence
    pg = A.page(); pg.goto(A.url + '?demo=luna#home'); pg.wait_for_timeout(800)
    pg.evaluate("""() => { const s = JSON.parse(localStorage.getItem('companion.state.v1'));
      const shift = 6 * 3600e3; s.chats.luna.forEach(m => m.ts -= shift); s.chatMeta = {}; localStorage.setItem('companion.state.v1', JSON.stringify(s)); }""")
    pg.goto(A.url + '#chat'); pg.reload(); pg.wait_for_timeout(5000)
    prompt = pg.evaluate("window.__calls[0]?.input || ''")
    check('she texts first after a 6-hour absence', 'The user just opened the chat' in prompt)
    import re as _re
    hrs = int((_re.search(r'away for about (\d+) hours', prompt) or [0, '0'])[1])
    check('prompt states the correct absence (6h shift + 37 min old demo chat = ~7 hours)', hrs in (6, 7), prompt[prompt.find('away'):][:60])
    pg.close()

    # 8. Unanswered message survives app close -> answered on reopen
    pg = A.page(); pg.goto(A.url + '?demo=luna#chat'); pg.wait_for_timeout(1000)
    pg.evaluate("window.__delay = 4000"); pg.fill('#msg', 'closing the app now'); pg.keyboard.press('Enter'); pg.wait_for_timeout(500)
    pg.goto(A.url + '#home'); pg.reload(); pg.wait_for_timeout(400); pg.goto(A.url + '#chat'); pg.reload(); pg.wait_for_timeout(7000)
    last = bubbles(pg)[-1]
    check('message left unanswered at close is answered on reopen', last.startswith('reply #'), last)
    pg.close()

    # 9. Offline mode clearly distinguishable
    pg = A.page(); pg.add_init_script('window.__noSample = true'); pg.goto(A.url + '?demo=luna#chat'); pg.wait_for_timeout(1000)
    pg.fill('#msg', 'hey'); pg.keyboard.press('Enter'); pg.wait_for_timeout(5000)
    strip = pg.inner_text('[data-mode]')
    tag = pg.locator('.msg.them .off-tag').count()
    check('offline strip says "Offline mode" and explains it is not AI', 'OFFLINE MODE' in strip.upper() and 'not AI' in strip, strip)
    check('each offline bubble carries an "offline reply" tag', tag >= 1)
    pg.screenshot(path='qa/p1-offline.png')
    pg.close()
    check('no page errors', not A.errors, str(A.errors[:2]))

fails = [r for r in RESULTS if not r[1]]
print(f'\n{len(RESULTS) - len(fails)}/{len(RESULTS)} passed')
sys.exit(1 if fails else 0)
