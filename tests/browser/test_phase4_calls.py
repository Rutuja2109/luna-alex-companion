"""Phase 4: calls (mic denial, states, no overlap/duplicates, exit keeps chat)
and study sessions surviving reloads."""
import sys, os; sys.path.insert(0, os.path.dirname(__file__))
from harness import app, check, state, RESULTS

SPEECH = r"""
// Fake speech output: records overlap; each utterance lasts 600 ms.
window.__speaking = 0; window.__maxOverlap = 0; window.__spoken = [];
Object.defineProperty(window, 'speechSynthesis', { configurable: true, value: { getVoices: () => [], cancel() { (window.__utts||[]).forEach(u => { if (!u.__done) { u.__done = true; window.__speaking--; u.onerror && u.onerror({error:'interrupted'}); } }); window.__utts = []; },
  speak(u) { window.__utts = (window.__utts||[]).concat(u); window.__speaking++; window.__maxOverlap = Math.max(window.__maxOverlap, window.__speaking); window.__spoken.push(u.text);
    setTimeout(() => u.onstart && u.onstart(), 10); setTimeout(() => { if (!u.__done) { u.__done = true; window.__speaking--; u.onend && u.onend(); } }, window.__speakMs ?? 600); } } });
window.SpeechSynthesisUtterance = function (t) { this.text = t; };
// Fake recognition controlled by window.__mic: 'deny' | 'ok' | 'dup'
window.__recStarts = 0; window.__recActive = 0; window.__maxRec = 0;
window.SpeechRecognition = function () {
  const self = this;
  self.start = () => { window.__recStarts++; window.__recActive++; window.__maxRec = Math.max(window.__maxRec, window.__recActive); window.__lastRec = self;
    setTimeout(() => {
      if (window.__mic === 'deny') { self.onerror && self.onerror({ error: 'not-allowed' }); self.__end(); return; }
      self.onstart && self.onstart();
    }, 20); };
  self.__end = () => { if (self.__ended) return; self.__ended = true; window.__recActive--; self.onend && self.onend(); };
  self.stop = self.abort = () => self.__end();
};
window.__say = (text, times = 1) => { const r = window.__lastRec; if (!r || r.__ended) return false;
  const res = { 0: { transcript: text }, isFinal: true, length: 1 };
  for (let i = 0; i < times; i++) r.onresult && r.onresult({ resultIndex: 0, results: [res] }); r.__end(); return true; };
"""

with app() as A:
    # --- microphone denied --------------------------------------------------
    pg = A.page(); pg.add_init_script(SPEECH + "window.__mic = 'deny';")
    pg.goto(A.url + '?demo=luna#call'); pg.wait_for_timeout(4000)
    note = pg.inner_text('[data-mic-note]') if pg.locator('[data-mic-note]:not([hidden])').count() else ''
    check('denied microphone shows a clear explanation', 'Microphone access is blocked' in note, note)
    check('call falls back to typing (talk bar visible)', pg.locator('[data-talk]:not([hidden])').count() == 1)
    check('state says it is your turn to type', 'type to talk' in pg.inner_text('.call-state'), pg.inner_text('.call-state'))
    starts = pg.evaluate('window.__recStarts')
    pg.fill('#say', 'hi luna'); pg.keyboard.press('Enter'); pg.wait_for_timeout(3500)
    check('no further recognition attempts after denial', pg.evaluate('window.__recStarts') == starts, f"{starts} -> {pg.evaluate('window.__recStarts')}")
    check('typed message got a spoken reply', len(pg.evaluate('window.__spoken')) >= 2)
    pg.screenshot(path='qa/p4-denied.png')
    pg.close()

    # --- normal voice: duplicates, overlap, interruption, failure, retry ---
    pg = A.page(); pg.add_init_script(SPEECH + "window.__mic = 'ok';")
    pg.goto(A.url + '?demo=luna#call'); pg.wait_for_timeout(3200)
    check('after her greeting the call is listening', pg.get_attribute('.call', 'data-state') == 'listening', pg.get_attribute('.call', 'data-state'))
    calls0 = pg.evaluate('window.__calls.length')
    pg.evaluate("window.__say('how was your day', 3)")       # same result delivered 3 times
    pg.wait_for_timeout(3000)
    check('duplicate recognition events produce ONE request', pg.evaluate('window.__calls.length') - calls0 == 1)
    check('recognition never runs twice at once', pg.evaluate('window.__maxRec') == 1, str(pg.evaluate('window.__maxRec')))
    check('speech never overlaps', pg.evaluate('window.__maxOverlap') == 1, str(pg.evaluate('window.__maxOverlap')))
    # interruption
    pg.evaluate("window.__speakMs = 5000"); pg.evaluate("window.__say('tell me a long story')"); pg.wait_for_timeout(1500)
    st = pg.get_attribute('.call', 'data-state')
    check('speaking state while she talks', st == 'speaking', st)
    pg.click('[data-interrupt]'); pg.wait_for_timeout(150)
    check('interrupt stops her speech and shows "Interrupted"', pg.inner_text('.call-state') == 'Interrupted' and pg.evaluate('window.__speaking') == 0)
    pg.wait_for_timeout(1200)
    check('then goes back to listening', pg.get_attribute('.call', 'data-state') == 'listening')
    # mute
    pg.evaluate("window.__speakMs = 600"); pg.click('[data-mute]'); pg.wait_for_timeout(200)
    check('muted state shown and recognition stopped', pg.get_attribute('.call', 'data-state') == 'muted' and pg.evaluate('window.__recActive') == 0)
    pg.click('[data-mute]'); pg.wait_for_timeout(300)
    # failure: first attempt fails -> retrying -> second fails -> failed state with Retry
    pg.evaluate("window.__queue = ['fail', 'fail']"); pg.evaluate("window.__say('are you there')"); pg.wait_for_timeout(400)
    check('transient failure shows "retrying"', 'retrying' in pg.inner_text('.call-state').lower(), pg.inner_text('.call-state'))
    pg.wait_for_timeout(2500)
    check('second failure shows failed state with Retry', pg.get_attribute('.call', 'data-state') == 'failed' and pg.locator('[data-fail]:not([hidden]) [data-retry]').count() == 1)
    pg.screenshot(path='qa/p4-failed.png')
    pg.click('[data-retry]'); pg.wait_for_timeout(2500)
    check('Retry recovers and she answers', pg.get_attribute('.call', 'data-state') in ('speaking', 'listening'))
    # exit keeps chat history
    said = [m['text'] for m in state(pg)['chats']['luna'] if m.get('viaCall')]
    pg.click('[data-min]'); pg.wait_for_timeout(1200)
    st2 = state(pg)
    check('leaving the call keeps every call message in the chat', all(any(m.get('text') == t for m in st2['chats']['luna']) for t in said) and len(said) >= 4, str(len(said)))
    check('chat shows a "call" summary line', pg.locator('.sys-line').filter(has_text='call').count() >= 1)
    check('call recorded as a shared moment', any(e.get('activity') == 'call' and e.get('closed') for e in st2['events']))
    pg.close()

    # --- unsupported speech recognition ------------------------------------
    pg = A.page(); pg.add_init_script("delete window.SpeechRecognition; delete window.webkitSpeechRecognition; window.webkitSpeechRecognition = undefined;")
    pg.goto(A.url + '?demo=alex#call'); pg.wait_for_timeout(3000)
    check('unsupported browser: says so and offers typing', "isn't supported" in pg.inner_text('[data-mic-note]') and pg.locator('[data-talk]:not([hidden])').count() == 1)
    pg.close()

    # --- study session survives a reload -----------------------------------
    pg = A.page(); pg.goto(A.url + '?demo=luna#study'); pg.wait_for_timeout(900)
    pg.fill('#goal', 'GMAT quant set'); pg.click('[data-start]'); pg.wait_for_timeout(6500)
    t_before = pg.inner_text('[data-time]')
    check('character-led: shows what Luna is working on', 'working on her UX case study' in pg.inner_text('[data-cprog-text]'), pg.inner_text('[data-cprog-text]'))
    pg.goto(A.url + '#study'); pg.wait_for_timeout(1500)   # real reload, without re-seeding the demo
    check('after reload the session is restored (no setup sheet)', pg.locator('[data-setup][hidden]').count() == 1)
    t_after = pg.inner_text('[data-time]')
    check('timer continues from where it was (quick reload keeps counting)', t_after <= t_before and t_after != '00:50:00', f'{t_before} -> {t_after}')
    check('goal kept', 'GMAT' in (state(pg)['activeStudy'] or {}).get('goal', ''))
    # long absence: paused + resume banner, time away not counted
    pg.evaluate("""() => { const s = JSON.parse(localStorage.getItem('companion.state.v1')); s.activeStudy.lastTick -= 3*3600e3; localStorage.setItem('companion.state.v1', JSON.stringify(s)); }""")
    el_before = state(pg)['activeStudy']['elapsed']
    pg.reload(); pg.wait_for_timeout(1500)
    check('after hours away the session is paused with a Resume banner', pg.locator('[data-resume]:not([hidden])').count() == 1)
    check('time away is not counted', abs(state(pg)['activeStudy']['elapsed'] - el_before) < 3)
    pg.screenshot(path='qa/p4-resume.png')
    pg.click('[data-resume-go]'); pg.wait_for_timeout(1500)
    check('Resume continues counting', state(pg)['activeStudy']['paused'] is False)
    pg.click('[data-end]'); pg.wait_for_timeout(300); pg.click('[data-ok]'); pg.wait_for_timeout(500)
    st = state(pg)
    check('ending clears the active session and records it', st['activeStudy'] is None and any('GMAT' in (e.get('text') or '') for e in st['events']))
    pg.close()
    check('no page errors', not A.errors, str(A.errors[:3]))
fails = [r for r in RESULTS if not r[1]]
print(f'\n{len(RESULTS) - len(fails)}/{len(RESULTS)} passed'); sys.exit(1 if fails else 0)
