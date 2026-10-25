// Screen 15 — Video / Voice Call (reference: board-c #12, board-b #16)
// Honest scope: the companion is an animated photo (breathing / talking motion),
// not live video. Her side of the call is real: replies come from the AI
// service and are spoken with the voice engine, with captions.
import { h, esc, toast, sheet } from '../ui/components.js';
import { icon } from '../ui/icons.js';
import { addMessage, startShared, heartbeat, endShared } from '../state/actions.js';
import * as ai from '../services/ai.js';
import * as voice from '../services/voice.js';
import * as listenSvc from '../services/listen.js';
import { heroFor } from './home.js';


export function render(ctx) {
  const { char, cfg } = ctx;
  const mode = ctx.params.mode === 'voice' ? 'voice' : 'video';
  const settings = ctx.store.get().settings;
  let state = 'connecting';
  let muted = false, speaker = settings.speaker !== false, captions = settings.captions !== false;
  let t0 = 0, timer = null, closed = false, evId = null, beats = 0;
  const lines = [];

  const el = h(`<section class="screen call ${mode}">
    <div class="full-scene" data-scene>
      <img src="${char.id === 'luna' ? char.portrait : heroFor(char, cfg)}" alt="" class="bg-fill" aria-hidden="true">
      <img src="${char.id === 'luna' ? char.portrait : heroFor(char, cfg)}" alt="${char.name} on a ${mode} call" class="breathe fg">
      <div class="shade"></div>
    </div>
    <div class="call-top">
      <button class="icon-btn" data-min aria-label="Back to chat">${icon('back')}</button>
      <div><div class="call-time num" data-time>Calling…</div><div class="call-state" data-state>${char.name}</div></div>
      <span></span>
    </div>
    <div class="pip" data-pip><span class="pip-off">${icon('videoOff')}<br><span class="xs">Camera off</span></span></div>
    <p class="mic-note" data-mic-note role="status" hidden></p>
    <form class="talk" data-talk hidden>
      <label class="sr" for="say">Say something</label>
      <input id="say" class="input" placeholder="${listenSvc.supported() ? 'Listening… or type here' : 'Type what you want to say'}" autocomplete="off" maxlength="300">
      <button class="icon-btn mic" type="submit" aria-label="Send">${icon('send')}</button>
    </form>
    <div class="caption-box" data-caps aria-live="polite">
      <button class="interrupt" data-interrupt hidden>${icon('stop')} Tap to interrupt</button>
      <div class="fail-row" data-fail hidden role="alert"><span data-fail-text></span><button class="btn btn-primary btn-sm" data-retry>Retry</button><button class="btn btn-ghost btn-sm" data-fail-close>Keep talking</button></div>
    </div>
    <div class="controls"><div class="row-c">
      <button class="ctl" data-cam aria-pressed="false"><span class="c">${icon('video')}</span>Camera</button>
      <button class="ctl" data-mute aria-pressed="false"><span class="c">${icon('mic')}</span>Mute</button>
      <button class="ctl end" data-end aria-label="End call"><span class="c">${icon('phoneOff')}</span>End</button>
      <button class="ctl" data-spk aria-pressed="${!speaker}"><span class="c">${icon(speaker ? 'speaker' : 'speakerOff')}</span>${speaker ? 'Speaker' : 'Muted'}</button>
      <button class="ctl" data-more><span class="c">${icon('dots4')}</span>More</button>
    </div><p class="sim-tag">Animated photo · device voice · not live video</p></div>
  </section>`);

  const $ = (s) => el.querySelector(s);
  // ---- state machine -------------------------------------------------------
  // connecting → speaking ⇄ listening → thinking/retrying → speaking …
  // plus muted, interrupted, failed. Only one of: recognition running,
  // a reply in flight, or speech playing, at any moment.
  let busy = false, abort = null, lastUserText = '', noSpeech = 0;
  let micMode = listenSvc.supported() ? 'voice' : 'typing';
  const LABEL = () => ({
    connecting: 'Connecting…',
    listening: micMode === 'voice' ? 'Listening' : 'Your turn · type to talk',
    thinking: `${char.name} is thinking…`,
    retrying: 'Connection hiccup · retrying…',
    speaking: `${char.name} is speaking`,
    muted: "You're muted",
    interrupted: 'Interrupted',
    failed: "Couldn't get a reply",
  });
  const setState = (s) => {
    state = s;
    el.dataset.state = s;
    el.classList.toggle('speaking', s === 'speaking');
    $('[data-state]').textContent = LABEL()[s] || '';
    $('[data-interrupt]').hidden = s !== 'speaking';
    $('[data-fail]').hidden = s !== 'failed';
  };
  const micNote = (text) => { const n = $('[data-mic-note]'); n.hidden = !text; n.textContent = text || ''; };
  const caption = (who, text) => {
    lines.push({ who, text });
    if (!captions) return;
    const box = $('[data-caps]');
    box.insertAdjacentHTML('beforeend', `<div class="caption"><b>${who === 'me' ? 'You' : esc(char.name)}</b>${esc(text)}</div>`);
    while (box.querySelectorAll('.caption').length > 2) box.querySelector('.caption').remove();
  };

  const listener = listenSvc.createListener({
    onText: (t) => userSaid(t),
    onError: (kind, detail) => {
      if (closed) return;
      if (kind === 'denied') { micMode = 'typing'; micNote("Microphone access is blocked, so type to talk. To use your voice, allow the microphone for this page in your browser settings, then start a new call."); }
      else if (kind === 'unsupported') { micMode = 'typing'; micNote("Voice input isn't supported in this browser. Type to talk."); }
      else if (kind === 'no-speech') { if (++noSpeech <= 2 && state === 'listening') setTimeout(listen, 400); else micNote("Didn't hear anything. Tap the mic or type to talk."); return; }
      else { micMode = 'typing'; micNote(`Voice input stopped working${detail ? ` (${detail})` : ''}. Type to talk.`); }
      if (state === 'listening') setState('listening');
    },
  });

  function listen() {
    if (closed || busy || state === 'speaking') return;
    $('[data-talk]').hidden = false;
    if (muted) { setState('muted'); return; }
    setState('listening');
    if (micMode === 'voice') listener.start();
  }

  async function say(text) {
    listener.stop();                         // never listen to her own voice
    caption('them', text);
    addMessage(char.id, { from: 'them', type: 'text', text, viaCall: true });
    setState('speaking');
    let finished = true;
    if (speaker && voice.available()) finished = await voice.speak(text, { voiceId: cfg.voice, gender: char.gender });
    else await new Promise((r) => { const t = setTimeout(r, 900 + text.length * 45); interruptWait = () => { clearTimeout(t); finished = false; r(); }; });
    interruptWait = null;
    if (closed) return;
    busy = false;
    if (!finished && state === 'interrupted') return; // interrupt() resumes listening
    state = 'idle';
    listen();
  }
  let interruptWait = null;
  function interrupt() {
    if (state !== 'speaking') return;
    setState('interrupted');
    voice.stop(); interruptWait?.();
    setTimeout(() => { if (state === 'interrupted' && !busy) { state = 'idle'; listen(); } }, 700);
  }

  async function userSaid(text) {
    const t = text.trim();
    if (!t || closed) return;
    if (state === 'speaking') interrupt();
    if (busy && state !== 'interrupted') return;  // a reply is already on its way
    listener.stop(); noSpeech = 0;
    lastUserText = t;
    caption('me', t);
    addMessage(char.id, { from: 'me', type: 'text', text: t, viaCall: true, read: true });
    respond(0);
  }

  async function respond(attempt) {
    busy = true;
    setState(attempt ? 'retrying' : 'thinking');
    abort?.abort(); abort = new AbortController();
    try {
      const st = ctx.store.get();
      const res = await ai.reply({ char, cfg: { ...cfg, commStyle: 'short' }, history: st.chats[char.id] || [],
        memories: st.memories.filter((m) => m.companionId === char.id),
        events: (st.events || []).filter((e) => e.companionId === char.id),
        summary: st.chatMeta?.[char.id]?.summary || '',
        note: `You're on a ${mode} call: reply as natural spoken sentences, no emoji.`, signal: abort.signal });
      if (closed) return;
      await say(res.parts.join(' '));
    } catch (e) {
      if (closed || e?.name === 'AbortError') return;
      if (attempt === 0 && e?.retryable !== false) { setState('retrying'); setTimeout(() => !closed && respond(1), 1200); return; }
      busy = false;
      $('[data-fail-text]').textContent = `${char.name} ${e?.message || "couldn't reply"}.`;
      setState('failed');
    }
  }

  $('[data-talk]').addEventListener('submit', (e) => { e.preventDefault(); const i = $('#say'); userSaid(i.value); i.value = ''; });
  $('[data-interrupt]').addEventListener('click', interrupt);
  $('[data-retry]').addEventListener('click', () => respond(0));
  $('[data-fail-close]').addEventListener('click', () => { busy = false; listen(); });

  // connect
  setTimeout(() => {
    if (closed) return;
    t0 = Date.now();
    evId = startShared(char.id, 'call', mode === 'video' ? 'On a video call with you' : 'On a call with you');
    timer = setInterval(() => { if (++beats % 40 === 0) heartbeat(evId); const s = Math.floor((Date.now() - t0) / 1000); $('[data-time]').textContent = `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`; }, 500);
    if (micMode === 'typing') micNote("Voice input isn't supported in this browser. Type to talk.");
    busy = true;
    say(pickHello());
  }, 1400);
  function pickHello() {
    const opts = mode === 'video' ? ['hiii, there you are', 'hey you! good timing', 'heyy, okay i can hear you'] : ['hey, i was hoping you’d call', 'hiii, what’s up?'];
    return opts[Math.floor(Math.random() * opts.length)];
  }

  function end() {
    if (closed) return;
    closed = true;
    clearInterval(timer); voice.stop(); listener.stop(); abort?.abort();
    const secs = t0 ? Math.floor((Date.now() - t0) / 1000) : 0;
    const dur = `${Math.floor(secs / 60)}:${String(secs % 60).padStart(2, '0')}`;
    if (evId) endShared(evId, { text: `${mode === 'video' ? 'Video' : 'Voice'} call together (${dur})`, minutes: Math.max(1, Math.round(secs / 60)), label: mode === 'video' ? 'Video call' : 'Voice call' });
    addMessage(char.id, { from: 'system', type: 'call', text: `${mode === 'video' ? 'Video' : 'Voice'} call · ${dur}` });
  }

  el.addEventListener('click', (e) => {
    if (e.target.closest('[data-end]')) { end(); ctx.back('home'); return; }
    if (e.target.closest('[data-min]')) { end(); ctx.go('chat', {}, { replace: true }); return; }
    const b = e.target.closest('.ctl');
    if (!b) return;
    if (b.matches('[data-mute]')) {
      muted = !muted; b.setAttribute('aria-pressed', muted); b.querySelector('.c').innerHTML = icon(muted ? 'micOff' : 'mic');
      if (muted) { listener.stop(); if (state === 'listening') setState('muted'); }
      else if (state === 'muted') listen();
    }
    if (b.matches('[data-cam]')) {
      toast('Your camera isn\'t available in this version, so your tile stays off.');
    }
    if (b.matches('[data-spk]')) {
      speaker = !speaker; b.setAttribute('aria-pressed', !speaker);
      b.innerHTML = `<span class="c">${icon(speaker ? 'speaker' : 'speakerOff')}</span>${speaker ? 'Speaker' : 'Muted'}`;
      if (!speaker) voice.stop();
      ctx.store.update((s) => { s.settings.speaker = speaker; }, { silent: true });
    }
    if (b.matches('[data-more]')) {
      sheet((s, close) => {
        s.innerHTML = `<h2>Call options</h2><div class="list">
          <button class="list-row" data-o="cc"><span class="ic">${icon('cc')}</span><span class="grow">Captions</span><span class="toggle" role="switch" aria-checked="${captions}"></span></button>
          <button class="list-row" data-o="chat"><span class="ic">${icon('chat')}</span><span class="grow">Switch to chat</span>${icon('chev', 'chev')}</button>
          <button class="list-row" data-o="type"><span class="ic">${icon('edit')}</span><span class="grow">Type instead of talking</span>${icon('chev', 'chev')}</button></div>`;
        s.addEventListener('click', (ev) => {
          const o = ev.target.closest('[data-o]')?.dataset.o;
          if (o === 'cc') { captions = !captions; ctx.store.update((st) => { st.settings.captions = captions; }, { silent: true }); $('[data-caps]').hidden = !captions; ev.target.closest('[data-o]').querySelector('.toggle').setAttribute('aria-checked', captions); }
          if (o === 'chat') { close(); end(); ctx.go('chat', {}, { replace: true }); }
          if (o === 'type') { close(); micMode = 'typing'; listener.stop(); $('[data-talk]').hidden = false; $('#say').focus(); if (state === 'listening') setState('listening'); }
        });
      });
    }
  });

  el._cleanup = () => end();
  return el;
}
