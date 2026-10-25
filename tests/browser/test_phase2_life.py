"""Phase 2: persistent life events and consistency across screens."""
import sys, os; sys.path.insert(0, os.path.dirname(__file__))
from harness import app, check, state, RESULTS

with app() as A:
    pg = A.page(); pg.goto(A.url + '?demo=alex&t=15:10#activities'); pg.wait_for_timeout(1000)
    pg.click('[data-a=coffee]'); pg.wait_for_timeout(1500)
    st = state(pg)
    ev = [e for e in st['events'] if not e.get('closed')]
    check('joining an activity records a live shared event', len(ev) == 1 and ev[0]['activity'] == 'coffee')
    # Same "now" on every screen while together
    pg2 = A.page(); pg2.goto(A.url + '?t=15:10#home'); pg2.wait_for_timeout(1000)
    home = pg2.inner_text('[data-act-label]') + ' | ' + pg2.inner_text('[data-act-meta]')
    check('home shows the shared activity', 'coffee with you' in home.lower() and 'With you right now' in home, home)
    pg2.goto(A.url + '?t=15:10#apartment'); pg2.reload(); pg2.wait_for_timeout(900)
    apt = pg2.inner_text('.live-card'); badge = pg2.inner_text('.live-badge')
    check('apartment shows the shared activity and WITH YOU badge', 'coffee with you' in apt.lower() and 'WITH YOU' in badge, apt + ' / ' + badge)
    pg2.goto(A.url + '?t=15:10#timeline'); pg2.reload(); pg2.wait_for_timeout(900)
    nows = pg2.evaluate("[...document.querySelectorAll('.tl-item.now .tl-title')].map(e=>e.innerText)")
    check('timeline has exactly one NOW, and it is the shared activity', len(nows) == 1 and 'with you' in nows[0].lower(), str(nows))
    pg2.close()
    # Leave -> closed, remembered, shows in timeline as past
    pg.fill('#say', 'oat latte please'); pg.keyboard.press('Enter'); pg.wait_for_timeout(1500)
    pg.click('[data-leave]'); pg.wait_for_timeout(300); pg.click('[data-ok]'); pg.wait_for_timeout(800)
    st = state(pg); e = st['events'][-1]
    check('leaving closes the event with a memorable description', e.get('closed') and e['text'].startswith('Had coffee together'), e.get('text'))
    check('chat history kept after leaving the activity', any(m.get('text') == 'oat latte please' for m in st['chats']['alex']))
    # Survives restart; timeline shows it as a past shared moment; home shows "last time together"
    pg.goto(A.url + '?t=15:12#timeline'); pg.reload(); pg.wait_for_timeout(900)
    shared = pg.evaluate("[...document.querySelectorAll('.tl-item.shared .tl-title')].map(e=>e.innerText)")
    check('after reload the shared moment is still in the timeline', any('Had coffee together' in x for x in shared), str(shared))
    nows = pg.evaluate("[...document.querySelectorAll('.tl-item.now .tl-title')].map(e=>e.innerText)")
    check('routine resumes after leaving (NOW is the routine again)', len(nows) == 1 and 'with you' not in nows[0].lower(), str(nows))
    pg.screenshot(path='qa/p2-timeline.png')
    pg.goto(A.url + '?t=15:12#home'); pg.reload(); pg.wait_for_timeout(900)
    check('home shows "Last time together"', 'Last time together: had coffee together' in pg.inner_text('[data-last]'), pg.inner_text('[data-last]'))
    pg.screenshot(path='qa/p2-home.png')
    # The AI is told about it in a later conversation
    pg.goto(A.url + '?t=19:30#chat'); pg.reload(); pg.wait_for_timeout(900)
    pg.fill('#msg', 'that coffee earlier was nice'); pg.keyboard.press('Enter'); pg.wait_for_timeout(4500)
    prompt = pg.evaluate("window.__calls.pop()?.input || ''")
    check('later chat prompt includes the shared moment', '<shared_moments>' in prompt and 'Had coffee together' in prompt)
    # App closed mid-activity: session closed at last heartbeat on next start, not left "live" forever
    pg.goto(A.url + '?t=16:00#activities'); pg.reload(); pg.wait_for_timeout(700); pg.click('[data-a=movie]'); pg.wait_for_timeout(800)
    pg.evaluate("""() => { const s = JSON.parse(localStorage.getItem('companion.state.v1')); const e = s.events[s.events.length-1]; e.lastSeen -= 10*60e3; e.ts -= 10*60e3; localStorage.setItem('companion.state.v1', JSON.stringify(s)); }""")
    pg2 = A.page(); pg2.goto(A.url + '?t=16:00#home'); pg2.wait_for_timeout(900)
    e = state(pg2)['events'][-1]
    check('an activity abandoned by closing the app is closed on next start', e.get('closed') and 'app was closed' in e.get('text', ''), e.get('text'))
    check('home no longer claims they are together', 'with you' not in pg2.inner_text('[data-act-meta]').lower())
    pg2.close()
    check('no page errors', not A.errors, str(A.errors[:2]))

fails = [r for r in RESULTS if not r[1]]
print(f'\n{len(RESULTS) - len(fails)}/{len(RESULTS)} passed'); sys.exit(1 if fails else 0)
