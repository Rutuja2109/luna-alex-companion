// Voice output: the browser's built-in speech synthesis (no API key, runs on
// the device). It is a device voice reading text aloud, not a recorded or
// cloned voice; the UI labels it that way. Swap `speak` for a hosted TTS
// provider later (see README).
import { VOICES } from '../data/characters.js';

const synth = () => (typeof window !== 'undefined' ? window.speechSynthesis : null);
let voicesCache = [];
function loadVoices() { voicesCache = synth()?.getVoices?.() || []; return voicesCache; }
if (synth()) { loadVoices(); try { synth().onvoiceschanged = loadVoices; } catch {} }

export const available = () => !!synth() && typeof window.SpeechSynthesisUtterance !== 'undefined';

const FEMALE = /female|samantha|victoria|karen|moira|tessa|zira|aria|jenny|libby|sonia|serena|ava|allison|susan|fiona|google uk english female|google us english/i;
const MALE = /male|daniel|alex|fred|tom|david|mark|guy|ryan|george|arthur|google uk english male/i;

function pickVoice(gender) {
  const list = (voicesCache.length ? voicesCache : loadVoices()).filter((v) => /^en/i.test(v.lang));
  const re = gender === 'male' ? MALE : FEMALE;
  return list.find((v) => re.test(v.name) && !(gender === 'female' && /\bmale\b/i.test(v.name))) || list[0] || null;
}

// Only one utterance at a time: every speak() cancels the previous one and
// gets a token; callbacks from a superseded utterance are ignored.
let token = 0;
let speakingNow = false;
export const isSpeaking = () => speakingNow;

/** Speak text. Resolves true when finished, false if interrupted/unsupported. */
export function speak(text, { voiceId = 'v1', gender = 'female', onstart, onend } = {}) {
  return new Promise((resolve) => {
    const my = ++token;
    if (!available()) { onend?.(false); resolve(false); return; }
    const s = synth();
    try { s.cancel(); } catch {}
    const v = VOICES.find((x) => x.id === voiceId) || VOICES[0];
    const u = new window.SpeechSynthesisUtterance(String(text).replace(/[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}]/gu, ''));
    const sys = pickVoice(gender);
    if (sys) u.voice = sys;
    u.pitch = v.pitch * (gender === 'male' ? 0.85 : 1);
    u.rate = v.rate;
    let finished = false;
    const done = (ok) => {
      if (finished) return; finished = true;
      if (my === token) speakingNow = false;
      onend?.(ok && my === token); resolve(ok && my === token);
    };
    u.onstart = () => { if (my === token) { speakingNow = true; onstart?.(); } };
    u.onend = () => done(true);
    u.onerror = (e) => done(e?.error !== 'interrupted' && e?.error !== 'canceled');
    speakingNow = true;
    try { s.speak(u); } catch { done(false); return; }  // engine refused: never leave the caller stuck
    // Some engines never fire onend: finish after a generous estimate.
    setTimeout(() => done(my === token), estimateSeconds(text) * 1000 + 4000);
  });
}

export function stop() { token++; speakingNow = false; try { synth()?.cancel(); } catch {} }

/** Rough spoken duration in seconds, for voice-note labels. */
export const estimateSeconds = (text) => Math.max(2, Math.round(String(text).split(/\s+/).length / 2.6));
