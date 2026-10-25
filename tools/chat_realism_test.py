"""Chat realism test. Injects a stand-in for the artifact runtime's `sample`
capability so the LIVE pipeline (prompt -> JSON -> bubbles/reaction/selfie/
memory) is exercised without an API key. Records every prompt sent."""
import subprocess, sys, time, json
from playwright.sync_api import sync_playwright
srv = subprocess.Popen([sys.executable, 'tools/serve.py', '8822']); time.sleep(.8)
FAKE = r"""
window.__prompts = [];
const replies = [
  {messages: ["ugh not the meetings again", "did they at least let you eat lunch"], react: "😢", selfie: false, remember: null},
  {messages: ["here, my glamorous study setup"], react: null, selfie: true, remember: null},
  {messages: ["wait an MBA?? since when", "okay that's huge"], react: "🔥", selfie: false, remember: {title: "Applying for an MBA", text: "Deadline is 15 Jan"}},
];
let i = 0;
const sample = async () => ({ text: 'x' });
sample.json = async (input, opts) => { window.__prompts.push({input, opts: {modelTier: opts.modelTier, images: !!opts.images}}); await new Promise(r => setTimeout(r, 400)); return replies[Math.min(i++, replies.length - 1)]; };
sample.limits = async () => ({ images: { maxCount: 1 } });
window.claude = { use: async (n) => n === 'sample' ? sample : null };
"""
try:
  with sync_playwright() as p:
    b = p.chromium.launch(); pg = b.new_page(viewport={'width': 390, 'height': 844}, device_scale_factor=2)
    errs = []; pg.on('pageerror', lambda e: errs.append(str(e)))
    pg.add_init_script(FAKE)
    pg.goto('http://127.0.0.1:8822/?demo=luna#chat'); pg.wait_for_timeout(1200)
    n0 = pg.locator('.msg.them[data-id]').count()
    # two quick messages -> ONE batched reply covering both
    pg.fill('#msg', 'so many meetings today'); pg.keyboard.press('Enter'); pg.wait_for_timeout(500)
    pg.fill('#msg', "i'm dead"); pg.keyboard.press('Enter')
    t_send = time.time()
    pg.wait_for_selector('.typing-row', timeout=8000); t_typing = time.time() - t_send
    pg.wait_for_function(f"document.querySelectorAll('.msg.them[data-id]').length >= {n0 + 2}", timeout=15000)
    pg.wait_for_timeout(2500)
    st = pg.evaluate("document.querySelector('[data-st]').textContent")
    prompts1 = pg.evaluate("window.__prompts.length")
    rx = pg.evaluate("[...document.querySelectorAll('.msg.me .rx')].map(e=>e.textContent)")
    pg.screenshot(path='qa/chat-live-1.png')
    # ask for a selfie
    pg.fill('#msg', 'what are you up to? send a pic'); pg.keyboard.press('Enter'); pg.wait_for_timeout(6000)
    selfie = pg.evaluate("[...document.querySelectorAll('.msg.them .bubble.photo img')].pop()?.getAttribute('src')")
    # share a fact -> memory suggestion card -> save
    pg.fill('#msg', 'btw im applying for an MBA, deadline jan 15'); pg.keyboard.press('Enter'); pg.wait_for_timeout(7000)
    card = pg.locator('.mem-suggest').count()
    pg.screenshot(path='qa/chat-live-2.png')
    if card: pg.click('[data-ms=save]'); pg.wait_for_timeout(300)
    mems = pg.evaluate("JSON.parse(localStorage.getItem('companion.state.v1')).memories.map(m=>m.title)")
    # user reacts to her message by double-tap
    pg.dblclick('.msg.them .bubble >> nth=-1'); pg.wait_for_timeout(200)
    myrx = pg.evaluate("[...document.querySelectorAll('.msg.them .rx')].length")
    prompt = pg.evaluate("window.__prompts[0].input")
    print('typing appeared after %.1fs' % t_typing, '| model calls for 2 msgs:', prompts1, '| her reaction on my msg:', rx, '| status:', st)
    print('selfie img:', selfie, '| memory card shown:', card, '| memories now:', mems[:2], '| my reaction badges:', myrx)
    print('errors:', errs or 'none')
    open('qa/prompt-sample.txt', 'w').write(prompt)
    b.close()
finally:
  srv.terminate()
