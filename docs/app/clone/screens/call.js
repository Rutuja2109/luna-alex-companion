// S08 voice call (device speech in and out) with a rating at the end.
import { h, esc, icon, toast, sheet } from '../ui.js';
import * as S from '../state.js';
import * as ai from '../../src/services/ai.js';
import * as voice from '../../src/services/voice.js';
import { createListener, supported } from '../../src/services/listen.js';
import { cfgFor, heroImg, celebrate } from '../shared.js';

export function call(ctx) {
  const { char } = ctx;
  const el = h(`<section class="screen callv">
    <div class="cz-bg" style="position:absolute;inset:-40px;background:url('${char.portrait || heroImg(char)}') center/cover;filter:blur(30px) brightness(.55)"></div>
    <img class="cv-bg" src="${char.portrait || heroImg(char)}" alt="${esc(char.name)}">
    <div class="cv-fade"></div>
    <div class="cv-top"><div class="cv-wave" data-wave aria-hidden="true"><i></i><i></i><i></i><i></i></div><div class="cv-t" data-t>Connecting…</div><div class="cv-st" data-st></div></div>
    <div class="cv-pip" data-pip>Camera off</div>
    <div class="cv-cap" data-cap aria-live="polite"></div>
    <form class="cv-type" data-form><label class="sr" for="say">Say something</label><input id="say" class="input" placeholder="Or type here" autocomplete="off"><button class="ib" aria-label="Send">${icon('send')}</button></form>
    <div class="cv-ctl2">
      <button class="rb" data-spk aria-pressed="false" aria-label="Speaker off">${icon('speaker')}</button>
      <button class="rb" data-cam aria-pressed="false" aria-label="Turn camera on">${icon('video')}</button>
      <button class="rb" data-mute aria-pressed="false" aria-label="Mute">${icon('mic')}</button>
      <button class="endp" data-end aria-label="End call"><span class="mini"><i></i><i></i><i></i></span>End</button>
    </div>
    <p class="cv-note">${esc(char.name)} is an AI character · device voice</p>
  </section>`);
  const cap = el.querySelector('[data-cap]');
  const st = (t) => { el.querySelector('[data-st]').textContent = t; };
  let t0 = 0, timer = null, muted = false, speaker = true, closed = false, busy = false, stream = null;
  const lines = [];
  const say = (who, text) => { lines.push({ who, text }); cap.innerHTML = lines.slice(-2).map((l) => `<div class="cl ${l.who === 'me' ? 'me' : ''}"><b>${l.who === 'me' ? 'You' : esc(char.name)}</b> ${esc(l.text)}</div>`).join(''); };
  const wave = el.querySelector('[data-wave]');
  const waveOn = (on) => { wave.classList.toggle('on', on); wave.classList.toggle('dim', !on); };
  const listener = createListener({
    onText: (t) => hear(t),
    onState: (s) => { if (s === 'listening' && !busy) st('Listening'); },
    onError: (code) => { if (code === 'unsupported' || code === 'denied') st(code === 'denied' ? 'Microphone blocked · type instead' : 'Voice input not supported here · type instead'); else if (!closed && !muted && !busy) setTimeout(() => listener.start(), 400); },
  });
  const listen = () => { if (!closed && !muted && supported()) listener.start(); else if (!supported()) st('Type to talk'); };
  function speak(text) {
    say('them', text);
    return new Promise((res) => {
      if (!speaker || !voice.available()) { waveOn(true); setTimeout(() => { waveOn(false); res(); }, Math.min(4000, 800 + text.length * 40)); return; }
      waveOn(true);
      voice.speak(text, { voiceId: S.get().comp.voice, gender: char.gender, onend: () => { waveOn(false); res(); } });
    });
  }
  async function hear(text) {
    if (closed || busy || !text.trim()) return;
    busy = true; listener.stop(); say('me', text); st('Thinking…');
    S.addMsg({ from: 'me', text });
    try {
      const s = S.get();
      const res = await ai.reply({ char, cfg: cfgFor(s), history: s.chat, memories: S.memForAI(s), task: 'reply', note: 'You are on a voice call: reply in 1-2 short spoken sentences, no emoji.', profile: S.profileFor(s) });
      if (closed) return;
      const text2 = res.parts.join(' ');
      S.addMsg({ from: 'them', text: text2, ...(res.offline ? { offline: true } : {}) });
      st('Speaking'); await speak(text2);
    } catch (e) { st(`Couldn't hear back · ${e?.message || 'try again'}`); }
    busy = false; if (!closed) { st(muted ? 'Muted' : 'Listening'); listen(); }
  }
  setTimeout(async () => {
    if (closed) return;
    t0 = Date.now();
    timer = setInterval(() => { const s = Math.floor((Date.now() - t0) / 1000); el.querySelector('[data-t]').textContent = `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`; }, 1000);
    busy = true; st('Speaking'); await speak(S.get().user.name ? `hey ${S.get().user.name}! i'm so glad you called` : `hey you! i'm so glad you called`); busy = false;
    st('Listening'); listen();
  }, 1200);
  function end() {
    if (closed) return; closed = true;
    clearInterval(timer); listener.stop(); voice.stop(); stream?.getTracks().forEach((t) => t.stop());
    const secs = t0 ? Math.floor((Date.now() - t0) / 1000) : 0;
    if (secs > 0) S.addMsg({ from: 'system', text: `Voice call · ${Math.floor(secs / 60)}:${String(secs % 60).padStart(2, '0')}` });
    if (secs >= 5) { const r = S.award('call'); if (r.levelUp) setTimeout(() => celebrate(char, r.levelUp), 50); }
    return secs;
  }
  function rate(secs) {
    if (secs < 5) return;
    sheet((s, close) => {
      s.innerHTML = `<h2>How was your call with ${esc(char.name)}?</h2><div class="stars" role="radiogroup" aria-label="Rating">${[1, 2, 3, 4, 5].map((n) => `<button data-star="${n}" role="radio" aria-checked="false" aria-label="${n} star${n > 1 ? 's' : ''}">★</button>`).join('')}</div>
        <button class="btn primary" data-ok disabled>Send</button><button class="btn ghost" data-skip>Skip</button>`;
      let n = 0;
      s.addEventListener('click', (e) => {
        const b = e.target.closest('[data-star]');
        if (b) { n = +b.dataset.star; s.querySelectorAll('[data-star]').forEach((x) => { const on = +x.dataset.star <= n; x.classList.toggle('on', on); x.setAttribute('aria-checked', +x.dataset.star === n); }); s.querySelector('[data-ok]').disabled = false; return; }
        if (e.target.closest('[data-ok]')) { S.update((st) => { st.ratings.push({ id: S.uid(), kind: 'call', stars: n, ts: S.now() }); }); toast('Thanks for the feedback'); close(); }
        if (e.target.closest('[data-skip]')) close();
      });
    });
  }
  el.querySelector('[data-form]').addEventListener('submit', (e) => { e.preventDefault(); const i = el.querySelector('#say'); const v = i.value; i.value = ''; hear(v); });
  el.addEventListener('click', (e) => {
    if (e.target.closest('[data-end]')) { const secs = end(); ctx.back(); setTimeout(() => rate(secs), 100); return; }
    const cam = e.target.closest('[data-cam]');
    if (cam) { toggleCam(cam); return; }
    const m = e.target.closest('[data-mute]');
    if (m) { muted = !muted; m.setAttribute('aria-pressed', muted); m.setAttribute('aria-label', muted ? 'Unmute' : 'Mute'); m.innerHTML = icon(muted ? 'micOff' : 'mic'); if (muted) { listener.stop(); st('Muted'); } else { st('Listening'); listen(); } return; }
    const sp = e.target.closest('[data-spk]');
    if (sp) { speaker = !speaker; sp.setAttribute('aria-pressed', !speaker); sp.setAttribute('aria-label', speaker ? 'Speaker off' : 'Speaker on'); sp.innerHTML = icon(speaker ? 'speaker' : 'speakerOff'); if (!speaker) voice.stop(); }
  });
  // Your camera in the corner (stays on this device; it isn't sent anywhere).
  async function toggleCam(btn) {
    const pip = el.querySelector('[data-pip]');
    if (stream) { stream.getTracks().forEach((t) => t.stop()); stream = null; pip.textContent = 'Camera off'; btn.setAttribute('aria-pressed', 'false'); return; }
    try {
      stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'user' }, audio: false });
      pip.innerHTML = '<video autoplay playsinline muted></video>'; pip.querySelector('video').srcObject = stream; btn.setAttribute('aria-pressed', 'true');
    } catch { pip.textContent = 'Camera not available'; }
  }
  el._cleanup = () => end();
  return el;
}
