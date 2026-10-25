import * as store from './state/store.js';
import * as router from './router.js';
import { CHARACTERS } from './data/characters.js';
import { seedDemo } from './state/demo.js';
import { clock, setSource } from './engine/routine.js';
import { closeStale, snapshotDay } from './state/actions.js';

store.load();
setSource(() => store.get());

// Local QA only: ?demo=luna|alex seeds a finished companion with example data.
const qs = new URLSearchParams(location.search);
if (qs.get('demo')) seedDemo(qs.get('demo'), qs.get('fresh') !== '0');
if (qs.get('t')) { const [hh, mm] = qs.get('t').split(':').map(Number); const d = new Date(); d.setHours(hh, mm || 0, 0, 0); clock.offset = d - Date.now(); window.__clockOffset = clock.offset; }

closeStale();
snapshotDay();
// A study session keeps running while you look at chat etc.: keep it live.
setInterval(async () => {
  const a = store.get().activeStudy;
  if (a && !a.paused && a.evId) {
    const { heartbeat } = await import('./state/actions.js');
    heartbeat(a.evId);
  }
}, 30000);

function ctxFactory(params) {
  const s = store.get();
  const cid = s.companionId;
  return {
    params,
    s,
    store,
    char: CHARACTERS[cid] || CHARACTERS.luna,
    cfg: s.companions[cid],
    go: router.go,
    back: router.back,
    refresh: router.refresh,
  };
}
router.init(ctxFactory);

// Global delegation: back buttons and bottom navigation.
document.getElementById('app').addEventListener('click', (e) => {
  const b = e.target.closest('[data-act="back"]');
  if (b) { e.preventDefault(); router.back(store.get().onboarded ? 'home' : 'welcome'); return; }
  const n = e.target.closest('[data-nav]');
  if (n) { e.preventDefault(); router.go(n.dataset.nav, {}, { reset: true }); }
});

const token = location.hash.replace('#', '');
const s = store.get();
if (token && router.ROUTE_NAMES.includes(token)) router.go(token);
else router.go(s.onboarded ? 'home' : 'welcome');

store.connectCloud().then((synced) => {
  if (synced && store.get().onboarded && router.current()?.name === 'welcome') router.go('home', {}, { reset: true });
});

// In-app activity alerts (Notifications screen). Checks the simulated routine
// once a minute while the app is open; respects quiet hours.
import('./ui/components.js').then(({ toast }) => {
  let lastId = null;
  const inQuiet = (n) => {
    if (!n.quiet) return false;
    const d = new Date(clock.now()); const m = d.getHours() * 60 + d.getMinutes();
    const toM = (s) => { const [h, mm] = s.split(':').map(Number); return h * 60 + mm; };
    const a = toM(n.quietStart), b = toM(n.quietEnd);
    return a <= b ? m >= a && m < b : m >= a || m < b;
  };
  setInterval(async () => {
    const s = store.get();
    if (!s.onboarded || !s.settings.notifications.activity) { lastId = null; return; }
    const { current } = await import('./engine/routine.js');
    const char = CHARACTERS[s.companionId];
    const act = current(char, s.companions[s.companionId]);
    if (lastId && act.id !== lastId && !inQuiet(s.settings.notifications)) toast(`${char.name}: ${act.label.toLowerCase()}`);
    lastId = act.id;
  }, 60000);
});

// Keep a running Study Together session "live" while the user visits other
// screens (it continues until they end it).
setInterval(async () => {
  const a = store.get().activeStudy;
  if (!a || a.paused || !a.evId) return;
  const { heartbeat } = await import('./state/actions.js');
  heartbeat(a.evId);
  store.update((s) => { if (s.activeStudy) { s.activeStudy.elapsed += Math.round((Date.now() - s.activeStudy.lastTick) / 1000); s.activeStudy.lastTick = Date.now(); } }, { silent: true });
}, 30000);
