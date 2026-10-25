import * as store from './store.js';
import { CHARACTERS } from '../data/characters.js';

const MIN = 60000;

/** Finish onboarding: persist the configured companion and open its chat. */
export function createCompanion() {
  store.update((s) => {
    const d = s.draft;
    const id = d.characterId;
    const base = store.defaultCompanion(id);
    s.companions[id] = { ...base, ...(d.config || {}), id, createdAt: Date.now() };
    s.companionId = id;
    s.onboarded = true;
    if (!s.chats[id]) {
      s.chats[id] = [{ id: store.uid(), from: 'them', type: 'text', text: CHARACTERS[id].intro.replace(/\n/g, ' '), ts: Date.now() }];
    }
  });
}

/** Working copy of the companion being configured during onboarding. */
export function draftConfig() {
  const s = store.get();
  const id = s.draft.characterId;
  if (!s.draft.config || s.draft.config.id !== id) {
    store.update((st) => { st.draft.config = store.defaultCompanion(id); }, { silent: true });
  }
  return store.get().draft.config;
}

export function setDraft(fn) {
  store.update((s) => fn(s.draft.config, s.draft), { silent: true });
}

export function addMessage(cid, msg) {
  const m = { id: store.uid(), ts: Date.now(), read: false, ...msg };
  store.update((s) => {
    (s.chats[cid] ||= []).push(m);
    if (s.chats[cid].length > 300) s.chats[cid].splice(0, s.chats[cid].length - 300);
  }, { silent: true });
  return m;
}

export function markRead(cid) {
  store.update((s) => { (s.chats[cid] || []).forEach((m) => { if (m.from === 'me') m.read = true; }); }, { silent: true });
}

export function addMemory(mem) {
  const m = { id: store.uid(), ts: Date.now(), companionId: store.get().companionId, ...mem };
  store.update((s) => { s.memories.unshift(m); }, { silent: true });
  return m;
}

/** Example conversation matching the reference board (demo / QA seed). */
export function referenceConversation(cid) {
  const c = CHARACTERS[cid];
  const t = Date.now() - 40 * MIN;
  const at = (m) => t + m * MIN;
  return [
    { id: store.uid(), from: 'them', type: 'text', text: "heyy you're back!", ts: at(0) },
    { id: store.uid(), from: 'them', type: 'text', text: 'how was your day?', ts: at(0.2) },
    { id: store.uid(), from: 'me', type: 'text', text: 'finally done with work 😩\nso exhausting today', ts: at(1), read: true },
    { id: store.uid(), from: 'them', type: 'text', text: 'ugh that bad? 😣\nwhat happened?', ts: at(1.4) },
    { id: store.uid(), from: 'me', type: 'text', text: "so many meetings and last minute work\nI'm so tired", ts: at(2), read: true },
    { id: store.uid(), from: 'them', type: 'text', text: 'aww 🥺\nhere, take a break. you deserve it.', ts: at(2.5) },
    { id: store.uid(), from: 'them', type: 'photo', img: c.chatPhoto, desc: c.chatPhotoDesc, text: 'company for you 🥹💜', ts: at(3) },
  ];
}

// ---------------------------------------------------------------------------
// Life events: shared activities, study sessions and calls. Each one is a
// persistent record; while its heartbeat is fresh it overrides the routine
// (see engine/routine.js), so every screen shows the same "now".
import { baseRoutine, dateKey, clock, SHARED_STATES } from '../engine/routine.js';

const MAX_EVENTS = 400;

export function startShared(companionId, activity, label) {
  const now = clock.now();
  const e = { id: store.uid(), companionId, kind: 'shared', activity, label: label || SHARED_STATES[activity]?.label, ts: now, lastSeen: now };
  store.update((s) => {
    s.events ||= [];
    // close any other open session for this companion first
    s.events.forEach((x) => { if (x.companionId === companionId && !x.closed) { x.closed = true; x.end = x.lastSeen || x.ts; } });
    s.events.push(e);
    if (s.events.length > MAX_EVENTS) s.events.splice(0, s.events.length - MAX_EVENTS);
  }, { silent: true });
  return e.id;
}

export function heartbeat(id) {
  store.update((s) => { const e = (s.events || []).find((x) => x.id === id); if (e && !e.closed) e.lastSeen = clock.now(); }, { silent: true });
}

/** Close a shared session. `text` is how the companion will remember it. */
export function endShared(id, { text, minutes, label } = {}) {
  let out = null;
  store.update((s) => {
    const e = (s.events || []).find((x) => x.id === id);
    if (!e || e.closed) return;
    e.closed = true; e.end = clock.now();
    if (label) e.label = label;
    const mins = minutes ?? Math.max(1, Math.round((e.end - e.ts) / 60000));
    e.minutes = mins;
    e.text = text || `${e.label} (${mins} min)`;
    out = e;
  }, { silent: true });
  return out;
}

/** Close sessions whose screen was left without a proper exit (app closed). */
export function closeStale(now = clock.now()) {
  store.update((s) => {
    (s.events || []).forEach((e) => {
      if (!e.closed && now - (e.lastSeen || e.ts) > 90e3) {
        e.closed = true; e.end = e.lastSeen || e.ts;
        e.minutes = Math.max(1, Math.round((e.end - e.ts) / 60000));
        e.text ||= `${e.label} (${e.minutes} min, the app was closed)`;
      }
    });
  }, { silent: true });
}

/** Freeze today's schedule for each companion so history stays stable. */
export function snapshotDay(now = clock.now()) {
  const s = store.get();
  const keys = Object.values(s.companions || {}).map((c) => [`${c.id}:${dateKey(now)}`, c]);
  if (keys.every(([k]) => s.days?.[k])) return;
  store.update((st) => {
    st.days ||= {};
    for (const [k, c] of keys) if (!st.days[k]) st.days[k] = baseRoutine(new Date(now), c);
    const all = Object.keys(st.days).sort();
    if (all.length > 60) all.slice(0, all.length - 60).forEach((k) => delete st.days[k]);
  }, { silent: true });
}
