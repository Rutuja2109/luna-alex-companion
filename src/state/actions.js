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
