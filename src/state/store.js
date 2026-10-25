// Application state + persistence.
// Primary: localStorage on this device. When the page runs as a published
// artifact for a signed-in viewer, the state is also mirrored to the viewer's
// private `db` document (data/users/<id>/state) so it survives devices.
const KEY = 'companion.state.v1';
const listeners = new Set();
let state = null;
let dbRef = null;
let dbTimer = null;

export function defaultCompanion(id) {
  return {
    id,
    appearance: { face: 0, hairStyle: 0, hairColor: 0, skinTone: 1, eyeColor: 0 },
    outfit: 'casual',
    personality: id === 'alex' ? ['playful'] : ['playful'],
    voice: id === 'alex' ? 'v4' : 'v1',
    commStyle: 'short',
    home: { style: 'modern', room: 'study', decor: ['warm'], lighting: 70 },
    wallpaper: null, // null = use global default
    createdAt: Date.now(),
  };
}

export function initialState() {
  return {
    version: 1,
    onboarded: false,
    draft: { gender: 'female', characterId: 'luna', step: 'welcome' },
    companionId: 'luna',
    companions: {},
    chats: {},
    memories: [],
    goals: [
      { id: 'g1', title: 'Prepare for MBA (2026)', progress: 60, status: 'active', tone: 'cyan' },
      { id: 'g2', title: 'Read 12 books this year', progress: 33, status: 'active', tone: 'purple' },
      { id: 'g3', title: 'Be consistent with workouts', progress: 0, status: 'active', tone: 'grey' },
      { id: 'g4', title: 'Plan Japan trip', progress: 50, status: 'active', tone: 'cyan' },
      { id: 'g5', title: 'Improve sleep schedule', progress: 20, status: 'active', tone: 'purple' },
    ],
    settings: {
      defaultWallpaper: 'none',
      readReceipts: true,
      aiReplies: true,
      memoryMode: 'ask', // ask | off
      captions: true,
      speaker: true,
      notifications: { activity: false, reminders: false, quiet: true, quietStart: '22:00', quietEnd: '07:00' },
    },
    studySessions: [],
    customWallpapers: [],
    chatMeta: {},
    events: [],   // shared moments with the user (persistent, per companion)
    activeStudy: null,
    days: {},     // '<companionId>:<YYYY-MM-DD>' -> routine snapshot for days already seen
    updatedAt: Date.now(),
  };
}

function readLocal() {
  try { const raw = localStorage.getItem(KEY); return raw ? JSON.parse(raw) : null; } catch { return null; }
}
function writeLocal(s) {
  try { localStorage.setItem(KEY, JSON.stringify(s)); return true; } catch { return false; }
}

export function load() {
  state = readLocal() || initialState();
  return state;
}

export function get() { return state; }

export function update(fn, { silent = false } = {}) {
  fn(state);
  state.updatedAt = Date.now();
  const ok = writeLocal(state);
  if (!ok) console.warn('Local save failed (storage full or blocked).');
  scheduleDb();
  if (!silent) listeners.forEach((l) => l(state));
}

export function replace(next) {
  state = next; writeLocal(state); scheduleDb(); listeners.forEach((l) => l(state));
}

export function subscribe(fn) { listeners.add(fn); return () => listeners.delete(fn); }

// --- optional cloud mirror (published artifact only) -----------------------
function stripForCloud(s) {
  // data: URLs (user uploads) stay on this device to keep the document small.
  return JSON.parse(JSON.stringify(s, (k, v) => (typeof v === 'string' && v.startsWith('data:') ? '[local]' : v)));
}
function scheduleDb() {
  if (!dbRef) return;
  clearTimeout(dbTimer);
  dbTimer = setTimeout(() => {
    dbRef.set({ json: JSON.stringify(stripForCloud(state)), updatedAt: state.updatedAt }).catch(() => {});
  }, 1500);
}

export async function connectCloud() {
  try {
    if (!window.claude?.use) return false;
    const [db, user] = await Promise.all([window.claude.use('db'), window.claude.use('user')]);
    if (!db || !user) return false;
    const uid = await user.id();
    if (!uid) return false;
    dbRef = db.doc(`data/users/${uid}/state`);
    const snap = await dbRef.get();
    if (snap.exists) {
      const remote = JSON.parse(snap.data().json || 'null');
      if (remote && (remote.updatedAt || 0) > (state.updatedAt || 0)) {
        // keep local-only uploads where the cloud copy has placeholders
        replace(remote);
      }
    } else {
      scheduleDb();
    }
    return true;
  } catch (e) {
    console.warn('Cloud sync unavailable', e);
    dbRef = null;
    return false;
  }
}

export const uid = () => Math.random().toString(36).slice(2, 10) + Date.now().toString(36).slice(-4);
