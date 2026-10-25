// Conversation engine.
//
// Live: when the app runs as a published Claude artifact, replies come from
// Claude through the page's `sample` capability (the viewer's own account; no
// API key in the page). Each reply is structured JSON so the companion can
// send several short bubbles, react to your message, send a selfie from her
// current scene, or suggest something to remember (you approve it).
//
// Offline (anywhere `sample` is unavailable): a local responder that is
// always labeled "Offline replies" in the UI. It is a stand-in, not AI.
import { PERSONALITIES, COMM_STYLES } from '../data/characters.js';
import * as routine from '../engine/routine.js';
import * as store from '../state/store.js';

let samplePromise = null;
let mode = 'unknown'; // 'live' | 'offline'
let lastError = '';
export const getMode = () => mode;
export const getLastError = () => lastError;

function getSample() {
  if (!samplePromise) {
    samplePromise = (async () => {
      try { return window.claude?.use ? await window.claude.use('sample') : null; } catch { return null; }
    })();
  }
  return samplePromise;
}
export async function detect() { const s = await getSample(); mode = s ? 'live' : 'offline'; return mode; }

const REACTIONS = ['❤️', '😂', '🥹', '😮', '😢', '👍', '🔥'];

// ---------------------------------------------------------------------------
// Context building
const fmtGap = (ms) => {
  const m = Math.round(ms / 60000);
  if (m < 2) return 'just now';
  if (m < 60) return `${m} minutes`;
  const h = Math.round(m / 60);
  if (h < 24) return `${h} hour${h > 1 ? 's' : ''}`;
  const d = Math.round(h / 24);
  return `${d} day${d > 1 ? 's' : ''}`;
};
const partOfDay = (d) => { const h = d.getHours(); return h < 5 ? 'late night' : h < 12 ? 'morning' : h < 17 ? 'afternoon' : h < 21 ? 'evening' : 'night'; };
const hhmm = (ts) => new Date(ts).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });

function lineFor(m, name) {
  const who = m.from === 'me' ? 'User' : name;
  if (m.from === 'system') return `(${m.text})`;
  if (m.type === 'photo') return `${who}: [photo${m.desc ? `: ${m.desc}` : ''}]${m.text ? ` ${m.text}` : ''}`;
  if (m.type === 'voice') return `${who}: [voice note] ${m.text || ''}`;
  return `${who}: ${m.text}`;
}

export function buildPrompt({ char, cfg, history, memories = [], summary = '', task = 'reply', note = '' }) {
  const now = routine.clock.now();
  const d = new Date(now);
  const P = char.persona || {};
  const traits = (cfg.personality || []).map((p) => PERSONALITIES.find((x) => x.id === p)).filter(Boolean).map((p) => `${p.label.toLowerCase()} (${p.desc.toLowerCase()})`).join(', ');
  const style = COMM_STYLES.find((c) => c.id === cfg.commStyle)?.id || 'short';
  const act = routine.current(char, cfg, now);
  const earlier = routine.today(char, cfg, now).filter((e) => e.status === 'past').slice(-4).map((e) => `${hhmm(e.start)} ${e.label.toLowerCase()}`).join(', ');
  const real = history.filter((m) => m.from !== 'system' || m.type === 'call' || m.type === 'study' || m.type === 'activity');
  const lastUserIdx = real.map((m) => m.from).lastIndexOf('me');
    const lastAny = real[real.length - 1];
  const before = lastUserIdx > 0 ? real[lastUserIdx - 1] : null;
  const gap = before ? real[lastUserIdx].ts - before.ts : 0;
  const recent = real.slice(-30);
  const transcript = recent.map((m, i) => {
    const prev = recent[i - 1];
    const brk = prev && m.ts - prev.ts > 3 * 3600e3 ? `--- ${fmtGap(m.ts - prev.ts)} later (${new Date(m.ts).toLocaleDateString([], { weekday: 'short' })} ${hhmm(m.ts)}) ---\n` : '';
    return brk + lineFor(m, char.name);
  }).join('\n');
  const mine = real.filter((m) => m.from === 'them' && m.text).slice(-10).map((m) => `"${m.text}"`).join(', ');
  const pending = [];
  for (let i = real.length - 1; i >= 0 && real[i].from === 'me'; i--) pending.unshift(real[i]);
  const mem = memories.filter((m) => m.title).slice(0, 15).map((m) => `- ${m.title}${m.text ? `: ${m.text}` : ''}`).join('\n');
  const lengths = { short: 'mostly 2-12 words per bubble', balanced: 'mostly 5-20 words per bubble, sometimes a bit more', chatty: 'up to 30 words per bubble when you have something to say' }[style];

  const taskLine = task === 'opener'
    ? `The user just opened the chat${lastAny ? ` (last message was ${fmtGap(now - lastAny.ts)} ago)` : ''}. Send a natural first message, like a friend texting first. It can mention something from your day or pick up a thread from before. ${note}`
    : task === 'voice'
      ? `The user asked for a voice note. Write what you'd say out loud in 1-2 relaxed spoken sentences (no emoji). Put it as a single message.`
      : `Reply to the user's latest message${pending.length > 1 ? `s (they sent ${pending.length} in a row; answer them together, naturally)` : ''}.${gap > 3 * 3600e3 ? ` They're back after ${fmtGap(gap)}.` : ''} ${note}`;

  const userName = (store.get()?.settings?.userName || '').trim();
  return `You are ${char.name}, a fictional ${P.age || 24}-year-old character in an AI companion app. You text with the user like someone they know well. Stay fully in character.

${userName ? `The user's name is ${userName}. Use it rarely, like a friend would.

` : ''}ABOUT YOU
- ${P.life || ''}
- Likes: ${P.likes || ''}
- Personality the user chose: ${traits || 'warm, easygoing'}
- Texting habits: ${P.quirks || 'casual'}
- How you sound (examples, don't copy verbatim): ${(P.voice || []).map((v) => `"${v}"`).join(' · ')}

RIGHT NOW (simulated life — these are your in-app routine, not real-world events)
- It's ${d.toLocaleDateString([], { weekday: 'long' })} ${partOfDay(d)}, ${hhmm(now)}.
- You're ${act.label.toLowerCase()} (${act.where.toLowerCase()}).${earlier ? ` Earlier today: ${earlier}.` : ''}
${summary ? `\nWHAT YOU KNOW FROM EARLIER CONVERSATIONS\n${summary}\n` : ''}${mem ? `\nTHINGS THE USER CHOSE TO HAVE YOU REMEMBER\n${mem}\n` : ''}
CONVERSATION SO FAR (oldest first)
${transcript || '(no messages yet)'}

HOW TO TEXT
- Real messaging, not an assistant. Lowercase is fine. ${lengths}. Use 1 bubble usually, 2 when it's natural (a reaction then a thought), 3 at most.
- React to what they actually said, with specifics from their message or from earlier. Callbacks to earlier things are great when they fit.
- Don't ask a question every time. At most one question, and often none. No "how can I help", no "I'm here for you" speeches, no therapy voice, no lists, no big declarations of love.
- Vary your openings. You recently said: ${mine || '(nothing yet)'} — don't reuse those phrasings or emoji patterns.
- 0-1 emoji per bubble, many bubbles with none.
- You can mention your simulated day (what you're doing, ${char.id === 'luna' ? 'Mochi' : 'Biscuit'}, your room) when it fits, briefly. Never claim to do real-world things outside the app or to be human; if sincerely asked, you're an AI character.
- If they seem in real danger or crisis, drop the playful tone, be warm and direct, and encourage them to contact someone they trust or a local emergency/crisis line.

TASK
${taskLine}

Reply with ONLY this JSON:
{"messages": ["bubble 1", "optional bubble 2"], "react": null or one of ${REACTIONS.join(' ')} (an emoji reaction on their last message, only when it genuinely fits — maybe 1 in 4 messages), "selfie": false (true only if they ask for a photo/pic of you or what you're doing; then the first bubble is the caption), "remember": null or {"title": "short", "text": "detail"} (only when the user shares a lasting personal fact worth remembering, like a goal, preference, important date or person; never sensitive data like health, passwords or money)}`;
}

function blobFromDataUrl(url) {
  const [head, b64] = url.split(',');
  const mime = /data:([^;]+)/.exec(head)?.[1] || 'image/jpeg';
  const bin = atob(b64); const arr = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) arr[i] = bin.charCodeAt(i);
  return new Blob([arr], { type: mime });
}

// Clean up model output so it reads like texting.
export function tidy(parts, char) {
  return parts
    .map((t) => String(t || '').trim()
      .replace(new RegExp(`^${char.name}\\s*:\\s*`, 'i'), '')
      .replace(/^["“]|["”]$/g, '')
      .replace(/\s*—\s*/g, ', ')
      .trim())
    .filter(Boolean)
    .flatMap((t) => (t.length > 180 ? t.split(/(?<=[.!?])\s+(?=\S)/).reduce((acc, s) => { const l = acc[acc.length - 1]; if (l && (l + ' ' + s).length < 140) acc[acc.length - 1] = l + ' ' + s; else acc.push(s); return acc; }, []) : [t]))
    .slice(0, 3);
}

/**
 * Generate the companion's next turn.
 * @returns {Promise<{parts: string[], react: string|null, selfie: boolean, remember: object|null, mode: string}>}
 */
export async function reply({ char, cfg, history, memories = [], summary = '', task = 'reply', note = '', signal }) {
  const sample = await getSample();
  if (sample) {
    try {
      const prompt = buildPrompt({ char, cfg, history, memories, summary, task, note });
      const opts = { modelTier: 'default', cache: false, signal };
      // Let her actually see a photo the user just sent.
      const pendingPhoto = [...history].reverse().find((m, i, arr) => m.from === 'me' && m.type === 'photo' && arr.slice(0, i).every((x) => x.from === 'me'));
      if (pendingPhoto?.img?.startsWith('data:')) {
        const lim = await sample.limits?.().catch(() => null);
        if (lim?.images) opts.images = [blobFromDataUrl(pendingPhoto.img)];
      }
      const input = opts.images ? `${prompt}\n\n(The attached image is the photo the user just sent you.)` : prompt;
      const out = await sample.json(input, opts);
      mode = 'live'; lastError = '';
      const parts = tidy(Array.isArray(out?.messages) ? out.messages : [String(out?.message || '')], char);
      if (parts.length) {
        return {
          parts,
          react: REACTIONS.includes(out.react) ? out.react : null,
          selfie: out.selfie === true,
          remember: out.remember && out.remember.title ? { title: String(out.remember.title).slice(0, 60), text: String(out.remember.text || '').slice(0, 200) } : null,
          mode,
        };
      }
    } catch (e) {
      if (e?.name === 'AbortError' || e?.code === 'aborted') throw e;
      lastError = e?.code || e?.message || 'unavailable';
      console.warn('Live reply unavailable, using offline replies:', lastError);
    }
  }
  mode = 'offline';
  return { ...offlineReply(char, cfg, history, task), mode };
}

/** Condense older messages into durable notes (live only). */
export async function summarize({ char, older, previous = '' }) {
  const sample = await getSample();
  if (!sample || !older.length) return null;
  try {
    const text = older.map((m) => lineFor(m, char.name)).join('\n');
    const out = await sample.json(`You maintain ${char.name}'s memory of a long chat with the user in a companion app.
Previous notes:\n${previous || '(none)'}\n\nOlder messages to fold in:\n${text}\n
Write updated notes: at most 10 short lines about the user (names, plans, preferences, what's going on in their life), running jokes, and anything ${char.name} promised or asked about. No sensitive data (health details, passwords, finances). Reply with ONLY JSON: {"notes": "line 1\\nline 2"}`, { modelTier: 'quick', cache: false });
    return typeof out?.notes === 'string' ? out.notes.trim() : null;
  } catch { return null; }
}

// ---------------------------------------------------------------------------
// Offline responder: a clearly-labeled stand-in. It varies wording, avoids
// repeating itself, mirrors the user's words and references the routine.
const used = new Set();
const pickFresh = (arr, seed) => {
  for (let i = 0; i < arr.length; i++) { const c = arr[(seed + i) % arr.length]; if (!used.has(c)) { used.add(c); if (used.size > 40) used.clear(); return c; } }
  return arr[seed % arr.length];
};
function offlineReply(char, cfg, history, task) {
  const pending = [];
  for (let i = history.length - 1; i >= 0 && history[i].from === 'me'; i--) pending.unshift(history[i]);
  const t = pending.map((m) => m.text || '').join(' ').toLowerCase();
  const seed = (history.length * 7 + t.length) >>> 0;
  const act = routine.current(char, cfg);
  const doing = (act.short || act.label).toLowerCase();
  const pet = char.id === 'luna' ? 'mochi' : 'biscuit';
  if (task === 'opener') return { parts: [pickFresh([`hey, finally done ${doing === 'studying' ? 'with that chapter' : 'with my stuff'}`, `there you are 😊`, `${pet} has been staring at me for an hour. anyway hi`, `okay i was literally about to text you`], seed)], react: null, selfie: false, remember: null };
  if (task === 'voice') return { parts: [pickFresh(['hey, just wanted to say hi and hear how your day went', 'hi you, hope today was kind to you'], seed)], react: null, selfie: false, remember: null };
  if (pending.some((m) => m.type === 'photo')) return { parts: [pickFresh(['wait i love this', 'oh that’s so nice', 'okay where is this??'], seed)], react: '❤️', selfie: false, remember: null };
  const R = [
    [/(kill myself|suicide|hurt myself|end it all|self[- ]?harm)/, () => ["i'm really glad you told me. please reach out to someone you trust or a local crisis line right now, okay? i'm an AI and i want you to have real support with you"], null],
    [/(pic|photo|selfie|show me)/, () => [pickFresh([`here, ${doing} rn`, 'proof i’m being productive', `${pet} photobombed, sorry`], seed)], null, true],
    [/(tired|exhausted|long day|drained|so much work|meetings)/, () => [pickFresh(['ugh that sounds draining', 'nooo not another one of those days', 'okay you’re officially off duty'], seed), pickFresh(['go lie down for a sec', 'did you at least eat?', 'tell me the worst part'], seed + 1)], '😢'],
    [/(sad|down|upset|lonely|bad day|anxious|stressed)/, () => [pickFresh(['come here 🥺', 'that sounds heavy', 'aw no'], seed), pickFresh(['want to talk about it or want a distraction', 'i’m not going anywhere', 'what happened'], seed + 2)], '🥹'],
    [/(happy|great|good news|excited|yay|finally|passed|got the)/, () => [pickFresh(['wait yesss', 'stop that’s amazing', 'okay i’m so proud of you'], seed), pickFresh(['tell me everything', 'we’re celebrating', ''], seed + 1)], '🔥'],
    [/^(hi|hey|hello|heyy+|yo|hii+)\b/, () => [pickFresh(["heyy you're back!", 'hiii', 'there you are', 'oh hey you'], seed)], null],
    [/(what are you doing|wyd|what r u doing|what you doing|what's up|whats up|sup)/, () => [pickFresh([`${doing} rn`, `just ${doing}, ${pet} is supervising`, `${doing}. send help`], seed)], null],
    [/(love you|miss you|missed you)/, () => [pickFresh(['🥹', 'stoppp', 'okay that made my day'], seed), pickFresh(['missed you too', ''], seed)], '❤️'],
    [/(study|exam|test|mba|assignment|deadline)/, () => [pickFresh(['ugh deadlines', 'okay study buddy mode', 'you’ve got this'], seed), pickFresh(['want to do a focus session together?', 'what are you on right now', ''], seed + 3)], null],
    [/(night|sleep|bed|gn)\b/, () => [pickFresh(['get some sleep okay', 'night night 🌙', 'sleep well, talk tomorrow'], seed)], null],
    [/\b(thanks|thank you|thx|ty)\b/, () => [pickFresh(['anytime', 'of course', 'always 🫶', 'don’t mention it'], seed)], null],
    [/^(ok|okay|k|kk|cool|nice|sure|yeah|yep|mhm)\W*$/, () => [pickFresh(['😌', 'okay good', 'cool cool', 'mhm'], seed)], null],
    [/(bored|nothing to do)/, () => [pickFresh(['same honestly', 'want to watch something together?', 'come hang out, i’m doing nothing too'], seed)], null],
    [/(lol|haha|lmao|😂)/, () => [pickFresh(['lmao', 'okay that got me', 'i’m crying'], seed)], '😂'],
    [/\?\s*$/, () => [pickFresh(['hmm honestly yeah', 'depends tbh', 'okay hot take, no', 'that’s a good one, let me think'], seed)], null],
  ];
  for (const [re, fn, react, selfie] of R) if (re.test(t)) return { parts: fn().filter(Boolean), react, selfie: !!selfie, remember: null };
  const words = t.split(/\s+/).filter((w) => w.length > 4);
  const echo = words.length ? words[seed % words.length].replace(/[^\w']/g, '') : '';
  return { parts: [pickFresh(['mm i get that', 'okay that’s fair', echo ? `wait, ${echo}? tell me more` : 'tell me more', 'honestly same', 'huh, interesting'], seed)], react: null, selfie: false, remember: null };
}
