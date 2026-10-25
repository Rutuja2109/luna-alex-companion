// Clone-only artwork: Luna & Alex full-body looks, selfies and scenes
// (assets/v2). The main Luna & Alex app keeps its own art in characters.js.
import { CHARACTERS as BASE, PERSONALITIES, VOICES, HOME_STYLES } from '../src/data/characters.js';

const V = (p) => `assets/v2/${p}.jpg`;
const looks = (id, extra) => [
  { id: 'home', label: 'At home', img: V(`${id}-full`) },
  { id: 'city', label: 'City evening', img: V(`${id}-city`) },
  extra,
  { id: 'cozy', label: 'Cozy knit', img: V(`${id}-selfie`) },
  { id: 'hoodie', label: 'Study hoodie', img: V(`${id}-study`) },
  { id: 'hike', label: 'Hiking', img: V(`${id}-hike`) },
];
const scenes = (id, extra) => ({ selfie: V(`${id}-selfie`), study: V(`${id}-study`), work: V(`${id}-study`), cook: V(`${id}-cook`), hike: V(`${id}-hike`), city: V(`${id}-city`), [extra]: V(`${id}-${extra}`), home: V(`${id}-full`) });

export const CHARACTERS = {
  luna: { ...BASE.luna, avatar: V('luna-face'), portrait: V('luna-selfie'), hero: V('luna-full'), outfits: looks('luna', { id: 'sunset', label: 'Sunset dress', img: V('luna-sunset') }), scenes: scenes('luna', 'sunset') },
  alex: { ...BASE.alex, avatar: V('alex-face'), portrait: V('alex-selfie'), hero: V('alex-full'), outfits: looks('alex', { id: 'street', label: 'Street jacket', img: V('alex-street') }), scenes: scenes('alex', 'street') },
};
export const WELCOME = V('duo-full');
export { PERSONALITIES, VOICES, HOME_STYLES };
