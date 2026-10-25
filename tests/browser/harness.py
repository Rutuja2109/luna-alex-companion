"""Shared Playwright harness: local server + a stand-in for the Claude
artifact runtime (sample / db / user) whose behaviour each test controls."""
import subprocess, sys, time, socket, os
from contextlib import contextmanager
from playwright.sync_api import sync_playwright
ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

RUNTIME = r"""
window.__calls = []; window.__mode = window.__mode || 'ok'; window.__delay = window.__delay ?? 300;
window.__queue = window.__queue || [];
const sample = async () => ({ text: '' });
sample.json = (input, opts) => new Promise((resolve, reject) => {
  const n = window.__calls.push({ input, tier: opts.modelTier });
  const t = setTimeout(() => {
    const m = window.__queue.length ? window.__queue.shift() : window.__mode;
    if (m === 'fail') return reject({ code: 'rate_limited' });
    if (m === 'hang') return;
    if (m === 'garbage') return resolve({ nonsense: true });
    const pend = (input.match(/they sent (\d+) in a row/) || [0, 1])[1];
    const convo = (input.split('<conversation>')[1] || '').split('</conversation>')[0];
    const lastUser = convo.trim().split('\n').filter((l) => l.startsWith('User:')).pop() || '';
    const remember = /applying for an MBA/i.test(lastUser) ? { title: 'Applying for an MBA', text: 'deadline Jan 15' } : null;
    resolve({ messages: [`reply #${n} to ${pend}`], react: null, selfie: false, remember });
  }, window.__delay);
  opts.signal?.addEventListener('abort', () => { clearTimeout(t); reject({ code: 'aborted' }); });
});
sample.limits = async () => ({});
window.__db = window.__db || {};
const dbFail = () => window.__dbFail || localStorage.getItem('__dbFail') === '1';
const doc = (path) => ({
  get: async () => { if (dbFail()) throw { code: 'unavailable' }; const v = JSON.parse(localStorage.getItem('__fakedb:' + path) || 'null'); return { exists: !!v, data: () => v }; },
  set: async (data) => { if (dbFail()) throw { code: 'unavailable' }; localStorage.setItem('__fakedb:' + path, JSON.stringify(data)); window.__dbWrites = (window.__dbWrites || 0) + 1; },
  delete: async () => { if (dbFail()) throw { code: 'unavailable' }; localStorage.removeItem('__fakedb:' + path); },
});
const db = { doc };
const user = { id: async () => window.__uid || 'user-A', isOwner: () => true };
window.claude = { use: async (n) => (n === 'sample' ? (window.__noSample ? null : sample) : n === 'db' ? (window.__noDb ? null : db) : n === 'user' ? user : null) };
"""

def free_port():
    s = socket.socket(); s.bind(("127.0.0.1", 0)); p = s.getsockname()[1]; s.close(); return p

@contextmanager
def app(runtime=True):
    port = free_port()
    srv = subprocess.Popen([sys.executable, os.path.join(ROOT, 'tools', 'serve.py'), str(port)])
    time.sleep(0.7)
    try:
        with sync_playwright() as p:
            b = p.chromium.launch()
            ctx = b.new_context(viewport={'width': 390, 'height': 844}, device_scale_factor=2)
            if runtime: ctx.add_init_script(RUNTIME)
            errs = []
            def page():
                pg = ctx.new_page()
                pg.on('pageerror', lambda e: errs.append(str(e)))
                return pg
            yield type('A', (), {'url': f'http://127.0.0.1:{port}/', 'page': staticmethod(page), 'ctx': ctx, 'errors': errs})
            b.close()
    finally:
        srv.terminate()

RESULTS = []
def check(name, cond, detail=''):
    RESULTS.append((name, bool(cond), detail))
    print(('PASS ' if cond else 'FAIL ') + name + (f'  [{detail}]' if detail and not cond else ''))
    return cond

def bubbles(pg, who='them'):
    return pg.evaluate(f"[...document.querySelectorAll('.msg.{who}[data-id] .bubble')].map(b => b.childNodes[0]?.textContent || '')")

def state(pg):
    return pg.evaluate("JSON.parse(localStorage.getItem('companion.state.v1') || 'null')")
