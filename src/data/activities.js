// Shared activities. Each opens its own scene (screens/activity.js); study and
// work open the dedicated Study Together screen.
export const ACTIVITIES = [
  { id: 'study', past: 'Studied together', label: 'Study Together', scene: 'study', screen: 'study', blurb: 'Focus session side by side' },
  { id: 'coffee', past: 'Had coffee together', label: 'Have Coffee', scene: 'coffee', blurb: 'Slow sips and small talk', opener: 'made us both coffee ☕ how do you take yours?', prompts: ['Oat latte, no sugar', 'Black, always', 'Tea person actually'] },
  { id: 'movie', past: 'Watched a movie together', label: 'Watch a Movie', scene: 'movie', blurb: 'Couch, blanket, something good', opener: 'okay i have snacks. comfort movie or something new?', prompts: ['Comfort movie', 'Something new', 'You pick'] },
  { id: 'cook', past: 'Cooked dinner together', label: 'Cook Together', scene: 'cook', blurb: 'Make dinner, make a mess', opener: "i'm thinking pasta tonight. you on sauce duty?", prompts: ['I got the sauce', 'Let’s do tacos instead', 'I’ll just watch 😄'] },
  { id: 'read', past: 'Read together', label: 'Read Together', scene: 'read', blurb: 'Quiet pages, shared thoughts', opener: 'what are you reading right now?', prompts: ['A novel', 'Something for work', 'Nothing yet, recommend one?'] },
  { id: 'hangout', past: 'Hung out together', label: 'Just Hang Out', scene: 'hangout', blurb: 'No plans, just company', opener: 'no plans, just us. how’s your head today?', prompts: ['Pretty good', 'Bit stressed', 'Tell me about your day first'] },
  { id: 'work', past: 'Worked side by side', label: 'Work Together', scene: 'work', screen: 'study', blurb: 'Heads down, good vibes' },
  { id: 'relax', past: 'Relaxed and chatted together', label: 'Relax & Chat', scene: 'relax', blurb: 'Wind down and talk', opener: 'finally some quiet. how are you, really?', prompts: ['Honestly tired', 'Pretty good actually', 'Long story'] },
];
