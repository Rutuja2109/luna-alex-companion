// Content for the clone. All names, wording and items are our own.
export const GOALS = [
  { id: 'company', label: 'Have someone to talk to every day' },
  { id: 'focus', label: 'Stay focused on study or work' },
  { id: 'talk', label: 'Talk things through when life is a lot' },
  { id: 'practice', label: 'Practise conversations and confidence' },
  { id: 'fun', label: 'Just have fun' },
  { id: 'habits', label: 'Build better habits (sleep, exercise)' },
];
export const AGES = ['18–24', '25–34', '35–44', '45+'];
export const PRONOUNS = ['she/her', 'he/him', 'they/them'];

export const MOODS = [
  { id: 'great', emoji: '😄', label: 'Great' },
  { id: 'good', emoji: '🙂', label: 'Good' },
  { id: 'okay', emoji: '😐', label: 'Okay' },
  { id: 'low', emoji: '😔', label: 'Low' },
  { id: 'stressed', emoji: '😣', label: 'Stressed' },
];

export const MEMORY_CATS = [
  { id: 'about', label: 'Story' },
  { id: 'goals', label: 'Dreams' },
  { id: 'people', label: 'People' },
  { id: 'likes', label: 'Likes & dislikes' },
  { id: 'dates', label: 'Important dates' },
  { id: 'other', label: 'Other' },
];

// Gifts are given in chat (used up); room items are owned once bought.
export const GIFTS = [
  { id: 'coffee', emoji: '☕', label: 'Coffee', coins: 20 },
  { id: 'flowers', emoji: '💐', label: 'Flowers', coins: 40 },
  { id: 'book', emoji: '📚', label: 'A book', coins: 30 },
  { id: 'chocolate', emoji: '🍫', label: 'Chocolate', coins: 25 },
  { id: 'plushie', emoji: '🧸', label: 'Plushie', coins: 60 },
  { id: 'tickets', emoji: '🎟️', label: 'Concert tickets', gems: 2 },
];
export const ROOM_ITEMS = [
  { id: 'warm', emoji: '💡', label: 'Warm lamps', coins: 0 },
  { id: 'plants', emoji: '🪴', label: 'Plants', coins: 0 },
  { id: 'fairy', emoji: '✨', label: 'Fairy lights', coins: 40 },
  { id: 'candles', emoji: '🕯️', label: 'Candles', coins: 30 },
  { id: 'neon', emoji: '🌈', label: 'Neon glow', coins: 80 },
  { id: 'rain', emoji: '🌧️', label: 'Rainy window', coins: 60 },
  { id: 'stars', emoji: '🌌', label: 'Starry ceiling', gems: 1 },
];

// Things to do together. Each opens the chat with a starter for the AI.
export const ACTIVITIES = [
  { id: 'focus', emoji: '📚', title: 'Study together', desc: '25 minutes of focus, then a break chat', kind: 'study', note: 'The user just started a 25-minute focus session with you. Cheer them on in one line, then stay quiet-ish.' },
  { id: 'checkin', emoji: '🌤️', title: 'Daily reflection', desc: 'Three easy questions about your day', kind: 'activity', note: 'Run a short daily reflection: ask one gentle question at a time about their day (best moment, hardest moment, one thing for tomorrow).' },
  { id: 'gratitude', emoji: '🙏', title: 'Three good things', desc: 'Notice what went right', kind: 'activity', note: 'Guide a quick gratitude exercise: ask them for three small good things from today, one at a time.' },
  { id: 'twenty', emoji: '🎲', title: '20 questions', desc: 'Guess what I\'m thinking of', kind: 'activity', note: 'Start a game of 20 questions: you think of an everyday object and they ask yes/no questions. Keep count.' },
  { id: 'story', emoji: '📖', title: 'Write a story together', desc: 'Take turns, one line each', kind: 'activity', note: 'Start a collaborative story with one vivid opening line and invite them to add the next line.' },
  { id: 'practice', emoji: '🎤', title: 'Practise a conversation', desc: 'Interview, small talk, a hard chat', kind: 'activity', note: 'Offer to role-play a conversation they want to practise (job interview, small talk, a difficult talk). Ask which one.' },
  { id: 'breathe', emoji: '🫧', title: 'Breathing break', desc: 'One minute to slow down', kind: 'activity', note: 'Guide a one-minute box-breathing break in short calm messages (in 4, hold 4, out 4, hold 4).' },
];
