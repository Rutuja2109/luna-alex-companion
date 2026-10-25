// Speech input via the browser's SpeechRecognition (where it exists).
// One recogniser at a time, final results only, duplicates dropped, and
// errors classified so the call screen can show the right state:
//   unsupported – this browser has no speech recognition
//   denied      – the microphone permission was refused (or the page isn't allowed to ask)
//   no-speech   – nothing heard (harmless; caller may listen again)
//   failed      – network / audio capture / other error
const SR = () => (typeof window !== 'undefined' ? window.SpeechRecognition || window.webkitSpeechRecognition : null);
export const supported = () => !!SR();

export function createListener({ onText, onState, onError, lang = 'en-US' }) {
  let rec = null;
  let active = false;
  let lastText = '', lastAt = 0;
  let denied = false;

  function start() {
    if (active || denied) return false;
    const C = SR();
    if (!C) { onError?.('unsupported'); return false; }
    try {
      rec = new C();
      rec.lang = lang; rec.interimResults = false; rec.continuous = false; rec.maxAlternatives = 1;
      rec.onstart = () => { active = true; onState?.('listening'); };
      rec.onresult = (e) => {
        for (let i = e.resultIndex ?? 0; i < e.results.length; i++) {
          const r = e.results[i];
          if (r.isFinal === false) continue;
          const text = String(r[0]?.transcript || '').trim();
          if (!text) continue;
          const now = Date.now();
          if (text.toLowerCase() === lastText && now - lastAt < 2500) continue; // duplicate event
          lastText = text.toLowerCase(); lastAt = now;
          onText?.(text);
        }
      };
      rec.onerror = (e) => {
        const code = e?.error;
        if (code === 'not-allowed' || code === 'service-not-allowed') { denied = true; onError?.('denied'); }
        else if (code === 'no-speech') onError?.('no-speech');
        else if (code === 'aborted') { /* we stopped it */ }
        else onError?.('failed', code);
      };
      rec.onend = () => { active = false; rec = null; onState?.('idle'); };
      active = true;
      rec.start();
      return true;
    } catch (err) {
      active = false; rec = null;
      if (/not.?allowed|permission/i.test(String(err?.name || err?.message))) { denied = true; onError?.('denied'); }
      else onError?.('failed', err?.message);
      return false;
    }
  }
  function stop() { try { rec?.abort ? rec.abort() : rec?.stop(); } catch {} active = false; rec = null; }
  return { start, stop, isActive: () => active, isDenied: () => denied };
}
