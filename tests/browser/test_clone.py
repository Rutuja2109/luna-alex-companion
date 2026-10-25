"""Structural clone (clone.html): onboarding, core loop, progress, store,
diary, memory, call rating, proactive messages, data controls."""
import sys, os, json; sys.path.insert(0, os.path.dirname(__file__))
from harness import app, check, RESULTS

def st(pg): return pg.evaluate("JSON.parse(localStorage.getItem('clone.state.v1') || 'null')")
def put(pg, js): pg.evaluate("(() => { const s = JSON.parse(localStorage.getItem('clone.state.v1')); " + js + "; localStorage.setItem('clone.state.v1', JSON.stringify(s)); })()")

with app() as A:
    U = A.url + 'clone.html'
    # ---- onboarding (live AI via the stand-in runtime)
    pg = A.page(); pg.goto(U); pg.wait_for_timeout(800)
    pg.click('[data-next]'); pg.fill('#nm', 'Riya'); pg.click('[data-next]')
    pg.click('[data-pick="she/her"]'); pg.click('[data-next]')
    pg.click('[data-pick="Under 18"]'); pg.wait_for_timeout(200)
    check('under-18 is stopped', 'for adults' in pg.inner_text('.ob') and pg.locator('[data-next]').count() == 0)
    pg.click('[data-pick=""]'); pg.click('[data-pick="25–34"]'); pg.click('[data-next]')
    pg.click('[data-pick="mentor"]'); pg.click('[data-next]')
    pg.click('[data-pick="alex"]'); pg.click('[data-next]')
    pg.click('.tile >> nth=2'); pg.click('[data-next]')
    pg.click('[data-pick="calm"]'); pg.click('[data-next]')
    pg.click('[data-pick="focus"]'); pg.click('[data-next]')
    pg.click('[data-pick="Books"]'); pg.click('[data-pick="Travel"]'); pg.click('[data-next]')
    pg.wait_for_selector('[data-meet]', timeout=6000); pg.click('[data-meet]'); pg.wait_for_timeout(800)
    s = st(pg)
    check('onboarding saves every answer', s['onboarded'] and s['user']['name'] == 'Riya' and s['user']['age'] == '25–34' and s['cid'] == 'alex' and s['comp']['status'] == 'mentor' and s['comp']['outfit'] == 'study' and 'calm' in s['comp']['traits'] and s['user']['goals'] == ['focus'] and s['comp']['interests'] == ['Books', 'Travel'])
    check('lands on the main room screen with a first message', pg.evaluate('window.__screen') == 'room' and pg.locator('.msg.them').count() >= 1)

    # ---- chat: XP, quest, streak, prompt carries the profile
    for t in ['hey alex', 'long day', 'mock test tomorrow', 'quant is hard', 'ok wish me luck']:
        pg.fill('#msg', t); pg.keyboard.press('Enter'); pg.wait_for_timeout(150)
    pg.wait_for_timeout(4500)
    s = st(pg)
    check('messages earn XP and complete the daily chat quest', s['bond']['xp'] >= 50 and s['bond']['quests']['claimed'].get('chat') and s['bond']['coins'] >= 70, s['bond'])
    check('first activity of the day starts a streak', s['bond']['streak'] == 1)
    p = pg.evaluate("window.__calls.map(c => c.input).filter(x => x.includes('ok wish me luck')).pop() || ''")
    check('prompt includes relationship status, interests and goals', 'mentor-friend' in p and 'Books' in p and 'Stay focused on study or work' in p)
    check('quick messages answered once, together', pg.evaluate("window.__calls.filter(c => c.input.includes('ok wish me luck')).length") == 1)

    # ---- votes shape style
    pg.locator('.msg.them .b').last.click(); pg.click('[data-pick=down]'); pg.wait_for_timeout(200)
    s = st(pg); voted = [m for m in s['chat'] if m.get('vote') == -1]
    pg.fill('#msg', 'anyway'); pg.keyboard.press('Enter'); pg.wait_for_timeout(3500)
    p = pg.evaluate("window.__calls[window.__calls.length-1].input")
    check('thumbs-down is saved and sent to the AI as a disliked reply', len(voted) == 1 and '<replies_user_disliked>' in p and voted[0]['text'] in p)

    # ---- mood check-in
    pg.wait_for_selector('[data-mood=stressed]'); pg.click('[data-mood=stressed]'); pg.wait_for_timeout(3000)
    s = st(pg)
    check('mood check-in saved, quest done, reply asked to respond', s['moods'][-1]['mood'] == 'Stressed' and s['bond']['quests']['claimed'].get('mood') and 'feel stressed' in pg.evaluate("window.__calls[window.__calls.length-1].input"))
    check('mood card hides after check-in', pg.locator('[data-moodcard]').count() == 0)

    # ---- level up
    put(pg, "s.bond.xp = 99")
    pg.reload(); pg.wait_for_timeout(1500)
    coins = st(pg)['bond']['coins']
    pg.fill('#msg', 'level me up'); pg.keyboard.press('Enter'); pg.wait_for_timeout(500)
    check('level-up shows a celebration and pays coins', pg.locator('.lvup').count() == 1 and st(pg)['bond']['coins'] >= coins + 50)
    pg.click('.lvup [data-ok]'); pg.wait_for_timeout(2500)

    # ---- store: gift with coins, not enough coins, room item
    put(pg, "s.bond.coins = 45"); pg.goto(U + '#store'); pg.reload(); pg.wait_for_timeout(900)
    pg.click('[data-it=flowers]'); pg.wait_for_timeout(2500)
    s = st(pg)
    check('a gift costs coins and appears in chat', s['bond']['coins'] == 5 and any(m.get('type') == 'gift' for m in s['chat']) and pg.evaluate('window.__screen') == 'room')
    check('she reacts to the gift', 'gave you a gift: flowers' in pg.evaluate("window.__calls[window.__calls.length-1].input") or 'gift: flowers' in pg.evaluate("window.__calls.map(c=>c.input).join(' ')"))
    pg.goto(U + '#store'); pg.reload(); pg.wait_for_timeout(800)
    pg.click('[data-it=plushie]'); pg.wait_for_timeout(300)
    check('not enough coins explains how to earn more (no real-money offer)', 'Not enough coins' in pg.inner_text('.sheet') and 'real money' in pg.inner_text('.sheet'))
    pg.click('.sheet [data-ok]')
    put(pg, "s.bond.coins = 200"); pg.reload(); pg.wait_for_timeout(800)
    pg.click('[data-tab=room]'); pg.click('[data-it=neon]'); pg.wait_for_timeout(300)
    s = st(pg)
    check('room item bought once and placed in the room', 'neon' in s['bond']['owned'] and 'neon' in s['comp']['decor'] and s['bond']['coins'] == 120)
    pg.goto(U + '#room'); pg.reload(); pg.wait_for_timeout(900)
    check('decor is drawn on the room screen', pg.locator('.d-neon').count() == 1)

    # ---- profile
    pg.goto(U + '#profile'); pg.reload(); pg.wait_for_timeout(800)
    pg.click('[data-status=friend]'); pg.click('[data-backstory]'); pg.fill('#bs', 'x' * 600)
    check('backstory is capped at 500 characters', len(pg.input_value('#bs')) == 500)
    pg.click('.sheet [data-ok]'); pg.wait_for_timeout(200)
    s = st(pg)
    check('status and backstory saved', s['comp']['status'] == 'friend' and len(s['comp']['backstory']) == 500)
    check('profile shows level, streak and the same-companion promise', 'Level' in pg.inner_text('.pf-head') and 'day streak' in pg.inner_text('.pf-head') and 'never reset' in pg.inner_text('.promise'))

    # ---- diary: entry for a past day; edit; forget
    put(pg, "const y = Date.now() - 864e5; s.chat.unshift({id:'old1',from:'me',text:'i finally booked the japan flights',ts:y},{id:'old2',from:'them',text:'no way!!',ts:y+1000}); s.diary = []")
    pg.goto(U + '#diary'); pg.reload(); pg.wait_for_timeout(2500)
    s = st(pg); d = [x for x in s['diary'] if not x.get('deleted')]
    check('diary entry written for yesterday', len(d) == 1 and pg.locator('.entry').count() == 1)
    check('diary used the AI with yesterday\'s conversation', 'japan flights' in pg.evaluate("window.__calls.map(c=>c.input).filter(x=>x.includes('diary entry')).pop() || ''"))
    pg.click('[data-ev=del]'); pg.click('.sheet [data-ok]'); pg.wait_for_timeout(400)
    check('forgotten entry is gone and not rewritten', pg.locator('.entry').count() == 0 and st(pg)['diary'][0].get('deleted'))
    pg.reload(); pg.wait_for_timeout(2000)
    check('...also after reopening', pg.locator('.entry').count() == 0)

    # ---- memory
    pg.goto(U + '#memory'); pg.reload(); pg.wait_for_timeout(800)
    pg.click('[data-add]'); pg.click('[data-c=people]'); pg.fill('#mt', "My sister's name is Priya"); pg.click('.sheet [data-ok]'); pg.wait_for_timeout(300)
    check('fact added under its category', 'People in your life' in pg.inner_text('.body') and st(pg)['memories'][0]['cat'] == 'people')
    pg.goto(U + '#room'); pg.reload(); pg.wait_for_timeout(1200)
    pg.fill('#msg', 'who is my sister?'); pg.keyboard.press('Enter'); pg.wait_for_timeout(3500)
    check('memories are sent with the next reply', "My sister's name is Priya" in pg.evaluate("window.__calls[window.__calls.length-1].input"))
    pg.goto(U + '#memory'); pg.reload(); pg.wait_for_timeout(700)
    pg.click('[data-me=del]'); pg.click('.sheet [data-ok]'); pg.wait_for_timeout(300)
    check('memory deleted', len(st(pg)['memories']) == 0)

    # ---- proactive: texts first after a quiet spell, never in quiet hours
    put(pg, "s.chat.forEach(m => m.ts -= 14*3600e3); s.lastProactive = 0")
    pg.goto(U + '?t=15:00#profile'); pg.reload(); pg.wait_for_timeout(900)
    n = len(st(pg)['chat'])
    sent = pg.evaluate("window.__proactive()")
    pg.wait_for_timeout(800)
    s = st(pg)
    check('companion texts first after 4+ quiet hours', sent and len(s['chat']) == n + 1 and s['chat'][-1].get('unread'))
    put(pg, "s.chat.forEach(m => m.ts -= 7*3600e3); s.lastProactive = 0")
    pg.goto(U + '?t=23:30#profile'); pg.reload(); pg.wait_for_timeout(900)
    check('...but not during quiet hours', pg.evaluate("window.__proactive()") is False)
    put(pg, "s.settings.textsFirst = false; s.lastProactive = 0")
    pg.goto(U + '?t=15:00#profile'); pg.reload(); pg.wait_for_timeout(900)
    check('...and not when switched off', pg.evaluate("window.__proactive()") is False)

    # ---- call: typed fallback, rating
    pg.goto(U + '?t=15:00#call'); pg.reload(); pg.wait_for_timeout(2500)
    pg.fill('#say', 'hi from the call'); pg.keyboard.press('Enter'); pg.wait_for_timeout(5500)
    check('call: typed line answered as a spoken reply', 'voice call' in pg.evaluate("window.__calls[window.__calls.length-1].input") and pg.locator('.cl').count() >= 3)
    pg.click('[data-end]'); pg.wait_for_timeout(500)
    check('rating sheet after the call; send disabled until a star is picked', pg.locator('.stars').count() == 1 and pg.locator('.sheet [data-ok]').is_disabled())
    pg.click('[data-star="4"]'); pg.click('.sheet [data-ok]'); pg.wait_for_timeout(200)
    s = st(pg)
    check('rating and call saved, call counts for the together quest', s['ratings'][-1]['stars'] == 4 and any('Voice call' in (m.get('text') or '') for m in s['chat']) and s['bond']['quests']['claimed'].get('together'))

    # ---- AI failure: visible retry
    pg.goto(U + '#room'); pg.reload(); pg.wait_for_timeout(1200)
    pg.evaluate("window.__queue = ['fail','fail']"); pg.fill('#msg', 'are you there'); pg.keyboard.press('Enter'); pg.wait_for_timeout(3500)
    check('failed reply shows Retry', pg.locator('[data-retry]').count() == 1)
    pg.evaluate("window.__queue = []"); pg.click('[data-retry]'); pg.wait_for_timeout(3000)
    check('Retry recovers', pg.locator('[data-retry]').count() == 0 and 'reply #' in pg.locator('.msg.them .b').last.inner_text())

    # ---- export + delete everything
    pg.goto(U + '#settings'); pg.reload(); pg.wait_for_timeout(800)
    pg.evaluate("window.claude.use = async () => null")
    with pg.expect_download() as dl: pg.click('[data-x=export]')
    data = json.loads(open(dl.value.path()).read())
    check('download my data gives the full state', data['data']['user']['name'] == 'Riya' and 'bond' in data['data'])
    pg.click('[data-x=reset]'); pg.click('.sheet [data-ok]'); pg.wait_for_timeout(600)
    check('delete everything returns to onboarding with nothing left', pg.evaluate('window.__screen') == 'onboard' and st(pg)['chat'] == [] and not st(pg)['onboarded'])

    # ---- offline mode (no AI runtime) is labelled
    pg2 = A.page(); pg2.add_init_script("window.__noSample = true")
    pg2.goto(U + '?demo=luna'); pg2.wait_for_timeout(3500)
    check('offline mode is labelled and replies are tagged', 'Offline mode' in pg2.inner_text('[data-mode]') and pg2.locator('.off').count() >= 1)
    check('no page errors', not A.errors, A.errors)

print(f"{sum(r[1] for r in RESULTS)}/{len(RESULTS)} passed")
sys.exit(0 if all(r[1] for r in RESULTS) else 1)
