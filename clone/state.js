// Data layer for the structural clone (replica/recon.md). Saved on this device
// under its own key, so it never touches the main Luna & Alex app's data.
import { GOALS } from './catalog.js';
import { emptyBond, award as awardBond, rollDay, levelInfo, dayKey } from '../src/engine/bond.js';

export const KEY = 'clone.state.v1';
const listeners = new Set();
let state = null;

export const uid = () => Math.random().toString(36).slice(2, 10) + Date.now().toString(36).slice(-4);
export const now = () => Date.now() + (window.__clockOffset || 0);

export function initial() {
  return {
    v: 1,
    onboarded: false,
    user: { name: '', pronouns: '', age: '', goals: [] },
    cid: 'luna',
    comp: { status: 'friend', interests: [], backstory: '', traits: ['caring'], voice: 'v1', outfit: 'casual', room: 'modern', decor: ['warm'] },
    chat: [],
    memories: [],   // {id, cat, text, ts}
    diary: [],      // {id, day, text, ts, vote, offline}
    moods: [],      // {id, day, mood, emoji, ts}
    ratings: [],    // {id, kind, stars, ts}
    bond: emptyBond(),
    settings: { textsFirst: true, quietStart: '22:00', quietEnd: '08:00', personaVersion: 1 },
    lastProactive: 0,
    lastSeen: 0,
  };
}

export function load() {
  try { state = JSON.parse(localStorage.getItem(KEY)) || initial(); } catch { state = initial(); }
  const base = initial();
  for (const k of Object.keys(base)) if (state[k] === undefined) state[k] = base[k];
  state.bond = { ...emptyBond(), ...state.bond };
  rollDay(state.bond, now());
  return state;
}
export const get = () => state;
export function save() { try { localStorage.setItem(KEY, JSON.stringify(state)); return true; } catch { return false; } }
export function update(fn) { fn(state); save(); listeners.forEach((l) => l(state)); }
export function on(fn) { listeners.add(fn); return () => listeners.delete(fn); }
export function replace(s) { state = s; save(); listeners.forEach((l) => l(state)); }

export function addMsg(m) {
  const msg = { id: uid(), ts: now(), ...m };
  update((s) => { s.chat.push(msg); if (s.chat.length > 400) s.chat.splice(0, s.chat.length - 400); });
  return msg;
}

/** Record progress; returns what happened (level up, quests completed). */
export function award(kind, opts) {
  let res;
  update((s) => { res = awardBond(s.bond, kind, now(), opts); });
  return res;
}
export const level = () => levelInfo(state.bond.xp);
export const today = () => dayKey(now());

// What the AI gets about the relationship (see ai.profileBlock).
export function profileFor(s = state) {
  const hers = s.chat.filter((m) => m.from === 'them' && m.text);
  const mood = s.moods.find((m) => m.day === dayKey(now()));
  return {
    userName: s.user.name, pronouns: s.user.pronouns, goals: s.user.goals.map((g) => GOALS.find((x) => x.id === g)?.label || g),
    status: s.comp.status, interests: s.comp.interests, backstory: s.comp.backstory,
    liked: hers.filter((m) => m.vote === 1).map((m) => m.text),
    disliked: hers.filter((m) => m.vote === -1).map((m) => m.text),
    mood: mood ? mood.mood : '',
  };
}

export function exportJson() {
  return JSON.stringify({ app: 'Luna & Alex (clone)', exported: new Date().toISOString(), data: state }, null, 2);
}
