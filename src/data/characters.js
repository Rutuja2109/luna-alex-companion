// Character catalog. Every image here is a crop of the reference boards
// (see tools/extract_assets.py), so Alex and Luna keep one stable identity.
const A = (p) => `assets/${p}`;

export const CHARACTERS = {
  luna: {
    id: 'luna', name: 'Luna', gender: 'female', featured: true,
    tagline: 'Warm · Caring · Fun',
    bio: 'Always here to listen, support and make your day better',
    pronoun: { sub: 'she', obj: 'her', pos: 'her' },
    avatar: A('characters/luna-face.jpg'),
    portrait: A('characters/luna-portrait.jpg'),
    hero: A('characters/luna-home.jpg'),
    preview: A('characters/luna-preview.jpg'),
    wide: A('characters/luna-wide.jpg'),
    tile: A('gallery/luna.jpg'),
    // Outfits are different photos of the same Luna (identity preserved).
    outfits: [
      { cat: 'casual', id: 'casual', label: 'Casual', img: A('characters/luna-home.jpg') },
      { cat: 'cozy', id: 'cozy', label: 'Cozy', img: A('characters/luna-couch.jpg') },
      { cat: 'trendy', id: 'trendy', label: 'Trendy', img: A('characters/luna-preview.jpg') },
      { cat: 'casual', id: 'soft', label: 'Soft knit', img: A('characters/luna-portrait.jpg') },
      { cat: 'trendy', id: 'evening', label: 'Evening', img: A('scenes/luna-evening.jpg') },
      { cat: 'cozy', id: 'home', label: 'At home', img: A('scenes/luna-morning-coffee.jpg') },
    ],
    scenes: {
      wake: A('scenes/luna-morning-coffee.jpg'),
      coffee: A('activities/coffee.jpg'),
      study: A('scenes/luna-working.jpg'),
      work: A('scenes/luna-working.jpg'),
      read: A('activities/read.jpg'),
      cook: A('activities/cook.jpg'),
      exercise: A('characters/luna-couch.jpg'),
      relax: A('characters/luna-couch.jpg'),
      movie: A('activities/movie.jpg'),
      evening: A('scenes/luna-evening.jpg'),
      bed: A('characters/luna-portrait.jpg'),
      hangout: A('characters/luna-wide.jpg'),
    },
    chatPhoto: A('scenes/luna-cat.jpg'),
    chatPhotoDesc: 'you lying in bed cuddling your cat Mochi',
    greeting: 'Hey, how was your day?\nWant to catch up?',
    // Fictional backstory used by the conversation engine. Kept consistent
    // with her photos (cozy apartment, cat, study desk).
    persona: {
      age: 24,
      life: 'final-year UX design student who freelances on small illustration jobs; lives alone in a warm, lamp-lit city apartment with her orange cat Mochi',
      likes: 'oat lattes, rainy evenings, comfort movies, sketching people in cafés, overly long playlists',
      quirks: 'types mostly lowercase, uses "lol" and "omg" sparingly, sends 🥹 when touched, teases gently, gets distracted by Mochi',
      voice: ['heyy you\'re back!', 'ugh that bad? 😣', 'okay wait tell me everything', 'mochi just knocked my pen off the desk again', 'that\'s actually so fair'],
    },
    intro: "Hi! I'm Luna 💜\nI'm so happy you're here.\nCan't wait to get to know you!",
  },
  alex: {
    id: 'alex', name: 'Alex', gender: 'male', featured: true,
    tagline: 'Playful · Supportive · Adventurous',
    bio: 'Up for anything, from late-night talks to study marathons',
    pronoun: { sub: 'he', obj: 'him', pos: 'his' },
    avatar: A('characters/alex-face.jpg'),
    portrait: A('characters/alex-call.jpg'),
    hero: A('characters/alex-hero.jpg'),
    preview: A('characters/alex-select.jpg'),
    wide: A('activities/alex-hangout.jpg'),
    tile: A('gallery/alex.jpg'),
    outfits: [
      { cat: 'casual', id: 'casual', label: 'Casual', img: A('characters/alex-hero.jpg') },
      { cat: 'casual', id: 'hoodie', label: 'Hoodie', img: A('characters/alex-portrait.jpg') },
      { cat: 'trendy', id: 'study', label: 'Glasses', img: A('activities/alex-study.jpg') },
      { cat: 'cozy', id: 'cozy', label: 'Cozy', img: A('characters/alex-select.jpg') },
      { cat: 'cozy', id: 'night', label: 'Night in', img: A('activities/alex-movie.jpg') },
      { cat: 'trendy', id: 'desk', label: 'Work mode', img: A('scenes/alex-desk-hd.jpg') },
    ],
    scenes: {
      wake: A('characters/alex-select.jpg'),
      coffee: A('activities/alex-coffee.jpg'),
      study: A('scenes/alex-desk-hd.jpg'),
      work: A('activities/alex-cook.jpg'),
      read: A('activities/alex-read.jpg'),
      cook: A('activities/alex-cook.jpg'),
      exercise: A('characters/alex-portrait.jpg'),
      relax: A('activities/alex-hangout.jpg'),
      movie: A('activities/alex-movie.jpg'),
      evening: A('characters/alex-hero.jpg'),
      bed: A('activities/alex-movie.jpg'),
      hangout: A('activities/alex-hangout.jpg'),
    },
    chatPhoto: A('scenes/alex-dog.jpg'),
    chatPhotoDesc: 'you lying on the couch next to your dog Biscuit',
    greeting: 'Hey, how are you feeling today?',
    persona: {
      age: 25,
      life: 'architecture grad student who works part-time at a small studio; lives in a cozy apartment full of books and plants with his golden retriever Biscuit',
      likes: 'late-night study sessions, black coffee, old films, long walks with Biscuit, cooking pasta badly but confidently',
      quirks: 'dry humour, short replies, teases then softens, says "fair" and "honestly" a lot, rarely uses more than one emoji',
      voice: ['hey you', 'honestly? fair', 'biscuit says hi. he doesn\'t, he\'s asleep', 'that sounds rough, come here', 'okay that made me laugh'],
    },
    intro: "Hey, I'm Alex 💙\nReally glad you're here.\nTell me about your day?",
  },
};

// Gallery-only characters (shown in the picker; the MVP's full experience
// is built for the featured Alex and Luna).
export const GALLERY = {
  male: [
    { id: 'alex', name: 'Alex', traits: 'Playful', img: A('gallery/alex.jpg') },
    { id: 'noah', name: 'Noah', traits: 'Calm', img: A('gallery/noah.jpg') },
    { id: 'ethan', name: 'Ethan', traits: 'Intellectual', img: A('gallery/ethan.jpg') },
    { id: 'ryan', name: 'Ryan', traits: 'Adventurous', img: A('gallery/ryan.jpg') },
    { id: 'leo', name: 'Leo', traits: 'Caring', img: A('gallery/leo.jpg') },
    { id: 'kai', name: 'Kai', traits: 'Playful', img: A('gallery/kai.jpg') },
  ],
  female: [
    { id: 'luna', name: 'Luna', traits: 'Caring', img: A('gallery/luna.jpg') },
    { id: 'ava', name: 'Ava', traits: 'Playful', img: A('gallery/ava.jpg') },
    { id: 'ivy', name: 'Ivy', traits: 'Intellectual', img: A('gallery/ivy.jpg') },
    { id: 'maya', name: 'Maya', traits: 'Calm', img: A('gallery/maya.jpg') },
    { id: 'zoe', name: 'Zoe', traits: 'Adventurous', img: A('gallery/zoe.jpg') },
    { id: 'ella', name: 'Ella', traits: 'Romantic', img: A('gallery/ella.jpg') },
  ],
};

export const PERSONALITIES = [
  { id: 'playful', label: 'Playful', desc: 'Fun, teasing, energetic' },
  { id: 'caring', label: 'Caring', desc: 'Warm, supportive, affectionate' },
  { id: 'calm', label: 'Calm', desc: 'Chill, thoughtful, understanding' },
  { id: 'intellectual', label: 'Intellectual', desc: 'Deep conversations, curious' },
  { id: 'adventurous', label: 'Adventurous', desc: 'Spontaneous, exciting' },
  { id: 'romantic', label: 'Romantic', desc: 'Flirty, loving, close' },
];

export const VOICES = [
  { id: 'v1', label: 'Voice 1', desc: 'Soft & warm', pitch: 1.05, rate: 0.95 },
  { id: 'v2', label: 'Voice 2', desc: 'Calm & soothing', pitch: 0.92, rate: 0.88 },
  { id: 'v3', label: 'Voice 3', desc: 'Playful & cheerful', pitch: 1.2, rate: 1.05 },
  { id: 'v4', label: 'Voice 4', desc: 'Deep & husky', pitch: 0.75, rate: 0.9 },
];

export const COMM_STYLES = [
  { id: 'short', label: 'Short texts' },
  { id: 'balanced', label: 'Balanced' },
  { id: 'chatty', label: 'Chatty' },
];

export const HOME_STYLES = [
  { id: 'modern', label: 'Modern', img: A('rooms/modern.jpg') },
  { cat: 'cozy', id: 'cozy', label: 'Cozy', img: A('rooms/cozy.jpg') },
  { id: 'minimal', label: 'Minimal', img: A('rooms/minimal.jpg') },
  { id: 'aesthetic', label: 'Aesthetic', img: A('rooms/aesthetic.jpg') },
  { id: 'dark', label: 'Dark', img: A('rooms/dark.jpg') },
  { id: 'luxe', label: 'Luxe', img: A('rooms/luxe.jpg') },
];

export const ROOMS = [
  { id: 'living', label: 'Living Room', img: A('rooms/living.jpg') },
  { id: 'bedroom', label: 'Bedroom', img: A('rooms/bedroom.jpg') },
  { id: 'kitchen', label: 'Kitchen', img: A('rooms/kitchen.jpg') },
  { id: 'study', label: 'Study', img: null }, // uses the companion's study scene
];

export const DECOR = [
  { id: 'warm', label: 'Warm lamps' },
  { id: 'fairy', label: 'Fairy lights' },
  { id: 'plants', label: 'Plants' },
  { id: 'candles', label: 'Candles' },
];

export const HAIR_COLORS = ['#7a4a2c', '#a5673a', '#d9a15f', '#3a2418', '#1c1412', '#6b2f2a', '#8a5a7a'];
export const SKIN_TONES = ['#f3d3b8', '#e2b48f', '#c98f66', '#a36a45', '#7a4b31', '#53321f'];
export const EYE_COLORS = ['#5b3a24', '#2f6b4f', '#3b6ea8', '#6b6f78'];
