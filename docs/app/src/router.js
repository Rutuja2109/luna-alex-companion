// In-memory stack router. Each route is its own screen module in src/screens/.
// A bare `#token` in the URL opens that screen directly (used for deep links
// and for the per-screen screenshot QA in tools/screenshot.py).
const ROUTES = {
  welcome: () => import('./screens/welcome.js'),
  gender: () => import('./screens/gender.js'),
  gallery: () => import('./screens/gallery.js'),
  preview: () => import('./screens/preview.js'),
  appearance: () => import('./screens/appearance.js'),
  outfits: () => import('./screens/outfits.js'),
  personality: () => import('./screens/personality.js'),
  voice: () => import('./screens/voice.js'),
  homestyle: () => import('./screens/homestyle.js'),
  final: () => import('./screens/final.js'),
  home: () => import('./screens/home.js'),
  apartment: () => import('./screens/apartment.js'),
  chat: () => import('./screens/chat.js'),
  wallpaper: () => import('./screens/wallpaper.js'),
  call: () => import('./screens/call.js'),
  study: () => import('./screens/study.js'),
  activities: () => import('./screens/activities.js'),
  activity: () => import('./screens/activity.js'),
  timeline: () => import('./screens/timeline.js'),
  memories: () => import('./screens/memories.js'),
  customize: () => import('./screens/customize.js'),
  goals: () => import('./screens/goals.js'),
  settings: () => import('./screens/settings.js'),
  notifications: () => import('./screens/notifications.js'),
};
export const ROUTE_NAMES = Object.keys(ROUTES);

const stack = [];
let ctxFactory = null;
let cleanup = null;
const appEl = () => document.getElementById('app');

export function init(factory) { ctxFactory = factory; }

async function show(entry) {
  const loader = ROUTES[entry.name];
  if (!loader) throw new Error(`Unknown screen ${entry.name}`);
  let mod;
  try { mod = await loader(); } catch (e) {
    appEl().innerHTML = `<section class="screen"><div class="empty" style="margin:auto">Screen "${entry.name}" isn't built yet.</div></section>`;
    console.warn(e); return;
  }
  if (cleanup) { try { cleanup(); } catch {} cleanup = null; }
  const ctx = ctxFactory(entry.params || {});
  const el = mod.render(ctx);
  cleanup = el._cleanup || null;
  appEl().replaceChildren(el);
  document.getElementById('sheet-root').replaceChildren();
}

export function go(name, params = {}, { replace = false, reset = false } = {}) {
  if (reset) stack.length = 0;
  if (replace && stack.length) stack.pop();
  stack.push({ name, params });
  return show(stack[stack.length - 1]);
}
export function back(fallback = 'home') {
  if (stack.length > 1) { stack.pop(); return show(stack[stack.length - 1]); }
  return go(fallback, {}, { reset: true });
}
export function current() { return stack[stack.length - 1]; }
export function refresh() { if (stack.length) return show(stack[stack.length - 1]); }
