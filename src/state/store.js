// Application state + persistence.
// Primary: localStorage on this device. When the page runs as a published
// artifact for a signed-in viewer, the state is also mirrored to the viewer's
// private `db` document (data/users/<id>/state) so it survives devices.
import { mergeStates } from './merge.js';

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
    deleted: {},  // tombstones: { memories: {id: ts}, goals: {...}, events: {...}, chats: {cid: clearedAt} }
    rev: 0,
    updatedAt: Date.now(),
  };
}

function readLocal(key = KEY) {
  try { const raw = localStorage.getItem(key); return raw ? JSON.parse(raw) : null; } catch { return null; }
}
let localWarned = false;
function writeLocal(s, key = KEY) {
  try { localStorage.setItem(key, JSON.stringify(s)); return true; }
  catch (e) {
    if (!localWarned) { localWarned = true; emitSync({ status: 'error', where: 'device', message: 'This device refused to save (storage full or blocked). Changes will be lost when you close the app.' }); }
    return false;
  }
}

export function load() {
  state = readLocal() || initialState();
  state.deleted ||= {};
  return state;
}

export function get() { return state; }

export function update(fn, { silent = false } = {}) {
  fn(state);
  state.updatedAt = Date.now();
  writeLocal(state);
  scheduleDb();
  if (!silent) listeners.forEach((l) => l(state));
}

export function replace(next) {
  state = next; state.deleted ||= {}; writeLocal(state); scheduleDb(); listeners.forEach((l) => l(state));
}

export function subscribe(fn) { listeners.add(fn); return () => listeners.delete(fn); }

/** Record a deletion so no other copy can bring the item back. */
export function tombstone(kind, id, at = Date.now()) {
  state.deleted ||= {};
  (state.deleted[kind] ||= {})[id] = at;
}

// --- sync status (shown in Settings → Privacy & Data) ------------------------
let sync = { status: 'local', at: 0, message: '' };
const syncListeners = new Set();
function emitSync(patch) { sync = { ...sync, ...patch }; syncListeners.forEach((l) => l(sync)); }
export const getSync = () => sync;
export function onSync(fn) { syncListeners.add(fn); return () => syncListeners.delete(fn); }

// --- optional cloud copy (published artifact, signed-in viewer) --------------
// data/users/<id>/state is private to that viewer. Every write first reads
// the cloud copy and merges (merge.js), so a stale device can't overwrite
// newer changes; failures are shown and retried with backoff.
function stripForCloud(s) {
  // Photos you uploaded stay on this device to keep the cloud copy small.
  return JSON.parse(JSON.stringify(s, (k, v) => (typeof v === 'string' && v.startsWith('data:') ? '[local]' : v)));
}
let pushing = false, again = false, failures = 0, retryTimer = null;
function scheduleDb() {
  if (!dbRef) return;
  clearTimeout(dbTimer);
  dbTimer = setTimeout(pushNow, 1500);
}
export async function pushNow() {
  if (!dbRef) return false;
  if (pushing) { again = true; return false; }
  pushing = true; clearTimeout(retryTimer);
  emitSync({ status: 'syncing' });
  try {
    const snap = await dbRef.get();
    const remote = snap.exists ? JSON.parse(snap.data().json || 'null') : null;
    if (remote && (remote.rev || 0) > (state.rev || 0)) {
      // another device saved since we last synced: merge, don't overwrite
      state = mergeStates(state, remote);
      writeLocal(state);
      listeners.forEach((l) => l(state));
    }
    state.rev = Math.max(state.rev || 0, remote?.rev || 0) + 1;
    writeLocal(state);
    await dbRef.set({ json: JSON.stringify(stripForCloud(state)), rev: state.rev, updatedAt: state.updatedAt });
    failures = 0;
    emitSync({ status: 'synced', at: Date.now(), message: '' });
    return true;
  } catch (e) {
    failures++;
    const wait = [5e3, 15e3, 60e3, 300e3][Math.min(failures - 1, 3)];
    emitSync({ status: 'error', where: 'cloud', message: `Couldn't save to your account (${e?.code || e?.message || 'network'}). Saved on this device; retrying in ${Math.round(wait / 1000)}s.`, failures });
    retryTimer = setTimeout(pushNow, wait);
    return false;
  } finally {
    pushing = false;
    if (again) { again = false; scheduleDb(); }
  }
}

export async function connectCloud() {
  try {
    if (!window.claude?.use) return false;
    const [db, user] = await Promise.all([window.claude.use('db'), window.claude.use('user')]);
    if (!db || !user) return false;
    const uid = await user.id();
    if (!uid) return false;
    // Keep each signed-in person's data separate on a shared browser.
    if (state.ownerId && state.ownerId !== uid) {
      writeLocal(state, `${KEY}:${state.ownerId}`);
      state = readLocal(`${KEY}:${uid}`) || initialState();
      listeners.forEach((l) => l(state));
    }
    state.ownerId = uid;
    writeLocal(state);
    dbRef = db.doc(`data/users/${uid}/state`);
    emitSync({ status: 'syncing' });
    const snap = await dbRef.get();
    const remote = snap.exists ? JSON.parse(snap.data().json || 'null') : null;
    if (remote) { state = mergeStates(state, remote); writeLocal(state); listeners.forEach((l) => l(state)); }
    await pushNow();
    return true;
  } catch (e) {
    console.warn('Cloud sync unavailable', e);
    if (dbRef) { emitSync({ status: 'error', where: 'cloud', message: `Couldn't reach your account (${e?.code || 'network'}). Saved on this device; retrying.` }); retryTimer = setTimeout(pushNow, 15e3); }
    return !!dbRef;
  }
}

/** Remove the cloud copy (used by "Delete everything"). */
export async function deleteCloud() {
  if (!dbRef) return true;
  try { await dbRef.delete(); return true; } catch (e) { emitSync({ status: 'error', where: 'cloud', message: `Couldn't delete the copy in your account (${e?.code || 'network'}). Try again.` }); return false; }
}

/** Everything the app stores about you, as JSON (for export). */
export function exportData() {
  const { draft, ...rest } = state;
  return JSON.stringify({ exportedAt: new Date().toISOString(), app: 'Luna & Alex', ...rest }, null, 2);
}

export const uid = () => Math.random().toString(36).slice(2, 10) + Date.now().toString(36).slice(-4);
