"""Phase 5: data reliability and privacy."""
import sys, os, json; sys.path.insert(0, os.path.dirname(__file__))
from harness import app, check, state, RESULTS

def open_privacy(pg):
    pg.goto(pg.url.split('#')[0].split('?')[0] + '#settings'); pg.reload(); pg.wait_for_timeout(900)
    pg.click('[data-r=privacy]'); pg.wait_for_timeout(300)

with app() as A:
    pg = A.page(); pg.goto(A.url + '?demo=luna#chat'); pg.wait_for_timeout(1500)
    # Memory approval -> used in prompts -> survives restart -> deletion is permanent
    pg.evaluate("window.__queue = []")
    pg.evaluate("""() => { const s = JSON.parse(localStorage.getItem('companion.state.v1')); s.memories = []; localStorage.setItem('companion.state.v1', JSON.stringify(s)); }""")
    pg.goto(A.url + '#chat'); pg.reload(); pg.wait_for_timeout(1200)
    pg.goto(A.url + '#chat'); pg.wait_for_timeout(1000)
    pg.fill('#msg', "i'm applying for an MBA, deadline jan 15"); pg.keyboard.press('Enter')
    pg.wait_for_selector('[data-ms=save]', timeout=15000); pg.click('[data-ms=save]'); pg.wait_for_timeout(300)
    check('approved fact saved as a memory', any(m['title'] == 'Applying for an MBA' for m in state(pg)['memories']))
    pg.goto(A.url + '#home'); pg.reload(); pg.wait_for_timeout(800)
    pg.goto(A.url + '#chat'); pg.reload(); pg.wait_for_timeout(1200)
    pg.fill('#msg', 'what do you remember about me?'); pg.keyboard.press('Enter'); pg.wait_for_timeout(5000)
    p = pg.evaluate("window.__calls.pop()?.input || ''")
    check('after restart the approved memory is used in the next reply', 'Applying for an MBA' in p and '<user_memories>' in p)
    # delete it in Memories
    pg.goto(A.url + '#memories'); pg.reload(); pg.wait_for_timeout(900)
    pg.locator('.mem.note', has_text='Applying for an MBA').click(); pg.wait_for_timeout(300)
    pg.click('.sheet [data-del]'); pg.wait_for_timeout(300); pg.click('[data-ok]'); pg.wait_for_timeout(300)
    st = state(pg)
    check('memory deleted and a deletion record kept', not any(m['title'] == 'Applying for an MBA' for m in st['memories']) and st['deleted'].get('memories'))
    # a stale cloud copy that still has the memory must not bring it back
    pg.evaluate("""() => { const key = Object.keys(localStorage).find(k => k.startsWith('__fakedb:')); const d = JSON.parse(localStorage.getItem(key)); const s = JSON.parse(d.json);
        s.memories.push({ id: 'stale', title: 'Applying for an MBA', text: 'from old copy', companionId: 'luna', ts: 1 });
        const local = JSON.parse(localStorage.getItem('companion.state.v1')); const delId = Object.keys(local.deleted.memories)[0];
        s.memories.find(m => m.id === 'stale').id = delId; s.rev = 999; d.json = JSON.stringify(s); localStorage.setItem(key, JSON.stringify(d)); }""")
    pg.goto(A.url + '#chat'); pg.reload(); pg.wait_for_timeout(3000)
    pg.fill('#msg', 'anything else?'); pg.keyboard.press('Enter'); pg.wait_for_timeout(5000)
    p = pg.evaluate("window.__calls.pop()?.input || ''")
    check('deleted memory is NOT reused after a stale cloud copy is merged', 'Applying for an MBA' not in p.split('<conversation>')[0])
    # Conflict: another device added a message -> merged, ours kept
    pg.evaluate("""() => { const key = Object.keys(localStorage).find(k => k.startsWith('__fakedb:')); const d = JSON.parse(localStorage.getItem(key)); const s = JSON.parse(d.json);
        s.chats.luna.push({ id: 'other-device', from: 'me', type: 'text', text: 'sent from my laptop', ts: Date.now() - 5000 }); s.rev = 2000; s.updatedAt = Date.now() + 1; d.json = JSON.stringify(s); localStorage.setItem(key, JSON.stringify(d)); }""")
    mine_before = len([m for m in state(pg)['chats']['luna'] if m['from'] == 'me'])
    pg.fill('#msg', 'and from my phone'); pg.keyboard.press('Enter'); pg.wait_for_timeout(5000)
    texts = [m.get('text') for m in state(pg)['chats']['luna']]
    check("other device's newer change is merged, not overwritten", 'sent from my laptop' in texts and 'and from my phone' in texts)
    # Sync failure -> visible -> recovery
    pg.evaluate("localStorage.setItem('__dbFail', '1')")
    pg.fill('#msg', 'offline-ish'); pg.keyboard.press('Enter'); pg.wait_for_timeout(2500)
    open_privacy(pg)
    row = pg.inner_text('[data-sync]')
    check('cloud-sync failure is shown, not swallowed', "Couldn't" in row and 'retrying' in row, row)
    pg.screenshot(path='qa/p5-sync-error.png')
    pg.evaluate("localStorage.removeItem('__dbFail')"); pg.click('[data-x2=retry]'); pg.wait_for_timeout(1500)
    row = pg.inner_text('[data-sync]')
    check('Retry recovers and shows "Saved to your account"', 'Saved to your account' in row, row)
    pg.screenshot(path='qa/p5-sync-ok.png')
    # Export
    A.ctx.grant_permissions(['clipboard-read', 'clipboard-write'])
    pg.click('[data-x2=export]'); pg.wait_for_timeout(500)
    data = json.loads(pg.evaluate('navigator.clipboard.readText()'))
    check('Download my data exports chats, memories and events', all(k in data for k in ('chats', 'memories', 'events', 'settings')))
    pg.close()
    # Per-user isolation on a shared browser
    pg = A.page(); pg.add_init_script("window.__uid = 'user-B'"); pg.goto(A.url + '#home'); pg.wait_for_timeout(2500)
    st = state(pg)
    check("a different signed-in user does not see the first user's data", st.get('ownerId') == 'user-B' and not st['chats'].get('luna'))
    pg.close()
    pg = A.page(); pg.goto(A.url + '#home'); pg.wait_for_timeout(2500)
    check("the first user's data is back when they return", state(pg).get('ownerId') == 'user-A' and len(state(pg)['chats'].get('luna', [])) > 5)
    # Delete everything also deletes the cloud copy
    open_privacy(pg); pg.click('[data-x=reset]'); pg.wait_for_timeout(300); pg.click('[data-ok]'); pg.wait_for_timeout(1500)
    left = pg.evaluate("Object.keys(localStorage).filter(k => k === '__fakedb:data/users/user-A/state')")
    check('"Delete everything" removes the cloud copy too', not left or pg.evaluate("JSON.parse(JSON.parse(localStorage.getItem('__fakedb:data/users/user-A/state')).json).chats.luna?.length || 0") == 0)
    pg.close()
    check('no page errors', not A.errors, str(A.errors[:3]))
fails = [r for r in RESULTS if not r[1]]
print(f'\n{len(RESULTS) - len(fails)}/{len(RESULTS)} passed'); sys.exit(1 if fails else 0)
