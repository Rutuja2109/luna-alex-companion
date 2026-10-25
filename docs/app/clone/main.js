// Structural clone entry point: router + background behaviour.
import * as S from './state.js';
import { CHARACTERS } from './art.js';
import * as ai from '../src/services/ai.js';
import { toast } from './ui.js';
import { cfgFor } from './shared.js';

S.load();
const qs = new URLSearchParams(location.search);
if (qs.get('t')) { const [hh, mm] = qs.get('t').split(':').map(Number); const d = new Date(); d.setHours(hh, mm || 0, 0, 0); window.__clockOffset = d - Date.now(); }
if (qs.get('demo')) (await import('./demo.js')).seed(qs.get('demo'));

const ROUTES = {
  onboard: async () => (await import('./screens/onboarding.js')).render,
  room: async () => (await import('./screens/room.js')).render,
  profile: async () => (await import('./screens/profile.js')).profile,
  diary: async () => (await import('./screens/profile.js')).diary,
  memory: async () => (await import('./screens/profile.js')).memory,
  settings: async () => (await import('./screens/profile.js')).settings,
  store: async () => (await import('./screens/shop.js')).store,
  customize: async () => (await import('./screens/shop.js')).customize,
  activities: async () => (await import('./screens/shop.js')).activities,
  call: async () => (await import('./screens/call.js')).call,
};
const stack = [];
let cleanup = null;
const app = document.getElementById('app');
async function show() {
  const e = stack[stack.length - 1];
  const render = await ROUTES[e.name]();
  if (cleanup) { try { cleanup(); } catch {} cleanup = null; }
  const s = S.get();
  const el = render({ params: e.params || {}, char: CHARACTERS[s.cid] || CHARACTERS.luna, go, back });
  cleanup = el._cleanup || null;
  app.replaceChildren(el);
  document.getElementById('sheet-root').replaceChildren();
  window.__screen = e.name;
}
export function go(name, params = {}, { replace = false, reset = false } = {}) {
  if (!S.get().onboarded && name !== 'onboard') name = 'onboard';
  if (reset) stack.length = 0;
  if (replace && stack.length) stack.pop();
  stack.push({ name, params });
  return show();
}
export function back() { if (stack.length > 1) { stack.pop(); return show(); } return go('room', {}, { reset: true }); }
app.addEventListener('click', (e) => { if (e.target.closest('[data-back]')) { e.preventDefault(); back(); } });

const hash = location.hash.slice(1);
if (S.get().onboarded) go(ROUTES[hash] ? hash : 'room', {}, { reset: true });
else go('onboard', { step: hash.startsWith('step-') ? hash.slice(5) : 'welcome' }, { reset: true });

// ---- she texts first ------------------------------------------------------
// While the app is open (also in a background tab): after 4+ hours of quiet,
// outside quiet hours, the companion sends one message. Closed-app push
// needs a server (see README).
const inQuiet = (s) => {
  const d = new Date(S.now()); const m = d.getHours() * 60 + d.getMinutes();
  const toM = (x) => { const [a, b] = x.split(':').map(Number); return a * 60 + b; };
  const a = toM(s.settings.quietStart), b = toM(s.settings.quietEnd);
  return a <= b ? m >= a && m < b : m >= a || m < b;
};
export async function proactive({ force = false } = {}) {
  const s = S.get();
  if (!s.onboarded || !s.settings.textsFirst || window.__screen === 'room' || window.__screen === 'call') return false;
  const last = s.chat.filter((m) => m.from !== 'system').pop();
  const quiet = !last || S.now() - last.ts > 4 * 3600e3;
  if (!force && (!quiet || inQuiet(s) || S.now() - (s.lastProactive || 0) < 6 * 3600e3)) return false;
  const char = CHARACTERS[s.cid];
  try {
    const res = await ai.reply({ char, cfg: cfgFor(s), history: s.chat, memories: S.memForAI(s), task: 'opener', note: 'You are texting first, unprompted. One short message.', profile: S.profileFor(s) });
    const text = res.parts[0];
    S.addMsg({ from: 'them', text, unread: true, ...(res.offline ? { offline: true } : {}) });
    S.update((st) => { st.lastProactive = S.now(); });
    if (document.hidden && 'Notification' in window && Notification.permission === 'granted') { try { new Notification(char.name, { body: text, icon: char.avatar }); } catch {} }
    else toast(`${char.name}: ${text}`, 4500);
    return true;
  } catch { return false; }
}
window.__proactive = proactive;
setInterval(() => proactive(), 5 * 60e3);
// Diary entries for past days are written in the background.
setTimeout(async () => { if (S.get().onboarded) { const { ensureDiary } = await import('./screens/profile.js'); ensureDiary(CHARACTERS[S.get().cid]).catch(() => {}); } }, 3000);
