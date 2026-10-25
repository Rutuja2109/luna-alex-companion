// Voice service: the browser's built-in speech synthesis (no API key, runs on
// device). Swap `speak` for a hosted TTS provider later; see README.
import { VOICES } from '../data/characters.js';

const synth = typeof window !== 'undefined' ? window.speechSynthesis : null;
let voicesCache = [];
function loadVoices() { voicesCache = synth ? synth.getVoices() : []; return voicesCache; }
if (synth) { loadVoices(); synth.onvoiceschanged = loadVoices; }

export const available = () => !!synth && typeof SpeechSynthesisUtterance !== 'undefined';

const FEMALE = /female|samantha|victoria|karen|moira|tessa|zira|aria|jenny|libby|sonia|serena|ava|allison|susan|fiona|google uk english female|google us english/i;
const MALE = /male|daniel|alex|fred|tom|david|mark|guy|ryan|george|arthur|google uk english male/i;

function pickVoice(gender) {
  const list = (voicesCache.length ? voicesCache : loadVoices()).filter((v) => /^en/i.test(v.lang));
  const re = gender === 'male' ? MALE : FEMALE;
  return list.find((v) => re.test(v.name) && !(gender === 'female' && /\bmale\b/i.test(v.name))) || list[0] || null;
}

/** Speak text. Resolves when finished (or immediately if unsupported). */
export function speak(text, { voiceId = 'v1', gender = 'female', onstart, onend } = {}) {
  return new Promise((resolve) => {
    if (!available()) { onend?.(); resolve(false); return; }
    synth.cancel();
    const v = VOICES.find((x) => x.id === voiceId) || VOICES[0];
    const u = new SpeechSynthesisUtterance(text.replace(/[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}]/gu, ''));
    const sys = pickVoice(gender);
    if (sys) u.voice = sys;
    u.pitch = v.pitch * (gender === 'male' ? 0.85 : 1);
    u.rate = v.rate;
    u.onstart = () => onstart?.();
    let finished = false;
    const done = () => { if (finished) return; finished = true; onend?.(); resolve(true); };
    u.onend = done; u.onerror = done;
    synth.speak(u);
    // Some engines never fire onend; finish after a generous estimate.
    setTimeout(() => { if (!synth.speaking) done(); }, estimateSeconds(text) * 1000 + 4000);
  });
}

export function stop() { try { synth?.cancel(); } catch {} }

/** Rough spoken duration in seconds, for voice-note labels. */
export const estimateSeconds = (text) => Math.max(2, Math.round(text.split(/\s+/).length / 2.6));
