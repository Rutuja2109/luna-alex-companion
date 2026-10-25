// QA seed used by ?demo=<id> (local screenshots). Not reachable from the UI.
import * as store from './store.js';
import { referenceConversation } from './actions.js';

export function seedDemo(cid, fresh = true) {
  const id = cid === 'alex' ? 'alex' : 'luna';
  const s = fresh ? store.initialState() : store.get();
  s.onboarded = true;
  s.companionId = id;
  s.companions[id] = s.companions[id] || store.defaultCompanion(id);
  s.chats[id] = referenceConversation(id);
  s.memories = [
    { id: 'm1', kind: 'photo', title: 'Lazy Sunday', img: 'assets/gallery/alex.jpg', ts: Date.now() - 864e5 * 2, companionId: id },
    { id: 'm2', kind: 'photo', title: 'Coffee date', img: 'assets/characters/luna-preview.jpg', ts: Date.now() - 864e5 * 3, companionId: id },
    { id: 'm3', kind: 'photo', title: 'Biscuit the puppy', img: 'assets/scenes/puppy.jpg', ts: Date.now() - 864e5 * 4, companionId: id },
    { id: 'm4', kind: 'voice', title: 'Goodnight voice note', text: 'sleep well, talk tomorrow', dur: 18, ts: Date.now() - 864e5 * 5, companionId: id },
    { id: 'm5', kind: 'photo', title: 'Study marathon', img: 'assets/characters/alex-study.jpg', ts: Date.now() - 864e5 * 6, companionId: id },
    { id: 'm6', kind: 'pref', title: 'Favourite drink', text: 'Iced oat latte, no sugar', ts: Date.now() - 864e5 * 7, companionId: id },
    { id: 'm7', kind: 'date', title: 'MBA application deadline', text: '15 Jan 2027', ts: Date.now() - 864e5 * 8, companionId: id },
    { id: 'm8', kind: 'moment', title: 'First call', text: 'We talked for an hour about Japan trip plans.', ts: Date.now() - 864e5 * 9, companionId: id },
  ];
  store.replace(s);
}
