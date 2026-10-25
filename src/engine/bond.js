// Relationship progress: XP, levels, coins & gems, daily quests and streaks.
// Pure functions over a plain `bond` object so they are easy to test.
//
// Our promise (the #1 complaint about the original): progress only ever goes
// up. No update, sync or reset of the AI can take a level, a streak day you
// earned, or anything you unlocked.

export const XP = { message: 10, longMessage: 5, vote: 2, mood: 15, call: 25, activity: 25, study: 30, gift: 10, diaryRead: 5 };

// XP needed to go from level L to L+1. Grows gently: 100, 140, 180, ...
export const stepFor = (level) => 60 + 40 * level;

export function levelInfo(xp = 0) {
  let level = 1, floor = 0;
  while (xp >= floor + stepFor(level)) { floor += stepFor(level); level++; }
  const need = stepFor(level);
  return { level, into: xp - floor, need, pct: Math.round(((xp - floor) / need) * 100) };
}

// What a level means (paraphrased from the original's help page, our words).
export function stageFor(level) {
  if (level < 5) return 'Getting to know you';
  if (level < 10) return 'Learning what you care about';
  if (level < 20) return 'Comfortable with each other';
  if (level < 35) return 'Knows you well';
  return 'Close, long-time friends';
}

export const QUESTS = [
  { id: 'chat', label: 'Send 5 messages', goal: 5, coins: 20, on: ['message'] },
  { id: 'mood', label: 'Share how you feel', goal: 1, coins: 20, on: ['mood'] },
  { id: 'together', label: 'Do something together', goal: 1, coins: 30, on: ['call', 'activity', 'study'] },
];

export const STATUSES = [
  { id: 'friend', label: 'Friend', desc: 'Easygoing, supportive, honest.' },
  { id: 'partner', label: 'Partner', desc: 'Affectionate and close, never pushy.' },
  { id: 'mentor', label: 'Mentor', desc: 'Encouraging, keeps you on track.' },
  { id: 'study', label: 'Study buddy', desc: 'Focus first, chat in the breaks.' },
];

export const INTERESTS = ['Books', 'Films', 'Music', 'Fitness', 'Travel', 'Cooking', 'Tech', 'Art', 'Gaming', 'Psychology', 'Philosophy', 'Careers', 'Languages', 'Nature'];

export function emptyBond() {
  return { xp: 0, coins: 50, gems: 1, streak: 0, best: 0, lastDay: '', quests: { day: '', progress: {}, claimed: {} }, owned: [], u: 0 };
}

const dayKey = (ts) => { const d = new Date(ts); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`; };
const prevDay = (key) => { const [y, m, d] = key.split('-').map(Number); return dayKey(new Date(y, m - 1, d - 1).getTime()); };

/** Reset quest progress on a new day. Returns the same object. */
export function rollDay(b, now) {
  const today = dayKey(now);
  if (b.quests?.day !== today) b.quests = { day: today, progress: {}, claimed: {} };
  return b;
}

/**
 * Record something the user did. Mutates `b` and returns what happened:
 * { xp, levelUp: null | {from, to, coins, gems}, quests: [ids completed now] }
 */
export function award(b, kind, now, { amount } = {}) {
  rollDay(b, now);
  const gain = amount ?? XP[kind] ?? 0;
  const before = levelInfo(b.xp).level;
  b.xp += gain;
  const after = levelInfo(b.xp).level;
  let levelUp = null;
  if (after > before) {
    const coins = (after - before) * 50;
    const gems = Math.floor(after / 5) - Math.floor(before / 5);
    b.coins += coins; b.gems += gems;
    levelUp = { from: before, to: after, coins, gems };
  }
  // Streak: any day you talk or do something together counts.
  const today = dayKey(now);
  if (['message', 'mood', 'call', 'activity', 'study'].includes(kind) && b.lastDay !== today) {
    b.streak = b.lastDay === prevDay(today) ? b.streak + 1 : 1;
    b.best = Math.max(b.best || 0, b.streak);
    b.lastDay = today;
  }
  const done = [];
  for (const q of QUESTS) {
    if (!q.on.includes(kind) || b.quests.claimed[q.id]) continue;
    b.quests.progress[q.id] = Math.min(q.goal, (b.quests.progress[q.id] || 0) + 1);
    if (b.quests.progress[q.id] >= q.goal) { b.quests.claimed[q.id] = true; b.coins += q.coins; done.push(q.id); }
  }
  b.u = now;
  return { xp: gain, levelUp, quests: done };
}

/** A streak shown today: it is still alive if you were here yesterday. */
export function liveStreak(b, now) {
  const today = dayKey(now);
  return b.lastDay === today || b.lastDay === prevDay(today) ? b.streak : 0;
}

export function buy(b, item) {
  if (b.owned.includes(item.id)) return { ok: true, already: true };
  const cur = item.gems ? 'gems' : 'coins';
  const price = item.gems || item.coins || 0;
  if (b[cur] < price) return { ok: false, short: price - b[cur], cur };
  b[cur] -= price; b.owned.push(item.id); b.u = Date.now();
  return { ok: true };
}

export { dayKey };
