// Local QA seed (?demo=luna|alex): a companion a few days in.
import * as S from './state.js';
import { emptyBond } from '../src/engine/bond.js';

export function seed(cid) {
  const s = S.initial();
  const D = 864e5, now = S.now();
  const at = (days, h, m = 0) => { const d = new Date(now - days * D); d.setHours(h, m, 0, 0); return d.getTime(); };
  s.onboarded = true; s.cid = cid === 'alex' ? 'alex' : 'luna';
  s.user = { name: 'Riya', pronouns: 'she/her', age: '18–24', goals: ['focus', 'company'] };
  s.comp = { status: 'friend', interests: ['Books', 'Careers', 'Travel'], backstory: 'Grew up by the sea, moved to the city for design school. Terrible at cooking, great at playlists.', traits: ['caring', 'playful'], voice: s.cid === 'alex' ? 'v4' : 'v1', outfit: 'casual', room: 'cozy', decor: ['warm', 'plants', 'fairy'] };
  s.chat = [
    { id: 'c1', from: 'them', text: 'morning! did you sleep at all before the mock test 👀', ts: at(1, 8, 10) },
    { id: 'c2', from: 'me', text: 'barely. quant section is going to destroy me', ts: at(1, 8, 14) },
    { id: 'c3', from: 'them', text: 'it will not. you did 3 practice sets this week', ts: at(1, 8, 15), vote: 1 },
    { id: 'c4', from: 'system', text: 'Started: study together 📚', ts: at(1, 18, 0) },
    { id: 'c5', from: 'me', text: 'done with the mock. 610. not bad??', ts: at(0, 19, 2) },
    { id: 'c6', from: 'them', text: 'NOT BAD?? that\'s up 40 from last time', ts: at(0, 19, 3), reaction: null },
    { id: 'c7', from: 'them', text: 'okay i\'m officially proud of you', ts: at(0, 19, 3) },
    { id: 'c8', from: 'me', text: 'haha thanks. still need to fix data sufficiency', ts: at(0, 19, 5), reaction: '🔥' },
  ];
  s.memories = [
    { id: 'm1', cat: 'goals', text: 'Preparing for the GMAT, target 700', ts: at(3, 20) },
    { id: 'm2', cat: 'likes', text: 'Iced oat latte, no sugar', ts: at(4, 9) },
    { id: 'm3', cat: 'people', name: 'Priya', rel: 'Your older sister', text: 'Lives in Pune. The one you call every Sunday.', ts: at(5, 21) },
    { id: 'm5', cat: 'people', name: 'Kabir', rel: 'Best friend since college', text: 'Gets your 11pm voice notes', ts: at(5, 20) },
    { id: 'm6', cat: 'about', text: 'Moved to Bengaluru last year for work; still misses home food', ts: at(6, 21) },
    { id: 'm7', cat: 'goals', text: 'Wants to start a small design studio one day', ts: at(7, 21) },
    { id: 'm4', cat: 'dates', text: 'MBA application deadline: 15 Jan 2027', ts: at(6, 22) },
  ];
  s.diary = [
    { id: 'd1', day: dayKeyOf(at(1, 12)), text: 'they were so nervous about the mock this morning. i reminded them about the three practice sets, and then we studied together for almost an hour. mochi slept on my notes the whole time.', ts: at(1, 23) },
    { id: 'd2', day: dayKeyOf(at(2, 12)), text: 'long day for them, too many meetings. i sent a cat photo, which i think helped? note to self: ask about the japan trip budget.', ts: at(2, 23) },
  ];
  s.moods = [3, 2, 1].map((k, i) => ({ id: `mo${i}`, day: dayKeyOf(at(k, 12)), mood: ['Good', 'Stressed', 'Okay'][i], emoji: ['🙂', '😣', '😐'][i], ts: at(k, 9) }));
  s.bond = { ...emptyBond(), xp: 760, coins: 120, gems: 2, streak: 4, best: 6, lastDay: dayKeyOf(at(1, 12)), owned: ['fairy'], quests: { day: '', progress: {}, claimed: {} } };
  s.lastProactive = now;
  S.replace(s);
}
function dayKeyOf(ts) { const d = new Date(ts); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`; }
