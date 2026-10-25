// Screen 15 — Video / Voice Call (reference: board-c #12, board-b #16)
// Honest scope: the companion is an animated photo (breathing / talking motion),
// not live video. Her side of the call is real: replies come from the AI
// service and are spoken with the voice engine, with captions.
import { h, esc, toast, sheet } from '../ui/components.js';
import { icon } from '../ui/icons.js';
import { addMessage, startShared, heartbeat, endShared } from '../state/actions.js';
import * as ai from '../services/ai.js';
import * as voice from '../services/voice.js';
import { heroFor } from './home.js';

const SR = window.SpeechRecognition || window.webkitSpeechRecognition;

export function render(ctx) {
  const { char, cfg } = ctx;
  const mode = ctx.params.mode === 'voice' ? 'voice' : 'video';
  const settings = ctx.store.get().settings;
  let state = 'connecting';
  let muted = false, speaker = settings.speaker !== false, captions = settings.captions !== false;
  let t0 = 0, timer = null, rec = null, closed = false, evId = null, beats = 0;
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
    <form class="talk" data-talk hidden>
      <label class="sr" for="say">Say something</label>
      <input id="say" class="input" placeholder="${SR ? 'Listening… or type here' : 'Type what you want to say'}" autocomplete="off" maxlength="300">
      <button class="icon-btn mic" type="submit" aria-label="Send">${icon('send')}</button>
    </form>
    <div class="caption-box" data-caps aria-live="polite"></div>
    <div class="controls"><div class="row-c">
      <button class="ctl" data-cam aria-pressed="false"><span class="c">${icon('video')}</span>Camera</button>
      <button class="ctl" data-mute aria-pressed="false"><span class="c">${icon('mic')}</span>Mute</button>
      <button class="ctl end" data-end aria-label="End call"><span class="c">${icon('phoneOff')}</span>End</button>
      <button class="ctl" data-spk aria-pressed="${!speaker}"><span class="c">${icon(speaker ? 'speaker' : 'speakerOff')}</span>${speaker ? 'Speaker' : 'Muted'}</button>
      <button class="ctl" data-more><span class="c">${icon('dots4')}</span>More</button>
    </div><p class="sim-tag">Animated photo · not live video</p></div>
  </section>`);

  const $ = (s) => el.querySelector(s);
  const setState = (s) => {
    state = s;
    el.classList.toggle('speaking', s === 'speaking');
    $('[data-state]').textContent = { connecting: 'Connecting…', listening: muted ? 'You\'re muted' : 'Listening', speaking: `${char.name} is speaking`, thinking: `${char.name} is thinking…` }[s] || '';
  };
  const caption = (who, text) => {
    lines.push({ who, text });
    if (!captions) return;
    const box = $('[data-caps]');
    box.insertAdjacentHTML('beforeend', `<div class="caption"><b>${who === 'me' ? 'You' : esc(char.name)}</b>${esc(text)}</div>`);
    while (box.children.length > 2) box.firstElementChild.remove();
  };

  async function say(text) {
    caption('them', text);
    addMessage(char.id, { from: 'them', type: 'text', text, viaCall: true });
    setState('speaking');
    if (speaker && voice.available()) await voice.speak(text, { voiceId: cfg.voice, gender: char.gender });
    else await new Promise((r) => setTimeout(r, 900 + text.length * 45));
    if (!closed) { setState('listening'); listen(); }
  }

  async function userSaid(text) {
    const t = text.trim();
    if (!t || closed) return;
    caption('me', t);
    addMessage(char.id, { from: 'me', type: 'text', text: t, viaCall: true, read: true });
    setState('thinking');
    try {
      const history = ctx.store.get().chats[char.id];
      const { parts } = await ai.reply({ char, cfg: { ...cfg, commStyle: 'short' }, history, memories: ctx.store.get().memories });
      if (!closed) await say(parts.join(' '));
    } catch { toast(`${char.name} couldn't hear that. Try again.`); setState('listening'); }
  }

  function listen() {
    if (muted || closed) return;
    $('[data-talk]').hidden = false;
    if (!SR) return;
    try {
      rec = new SR(); rec.lang = 'en-US'; rec.interimResults = false;
      rec.onresult = (e) => userSaid(e.results[0][0].transcript);
      rec.onerror = () => { rec = null; };
      rec.start();
    } catch { rec = null; }
  }

  $('[data-talk]').addEventListener('submit', (e) => { e.preventDefault(); const i = $('#say'); userSaid(i.value); i.value = ''; });

  // connect
  setTimeout(() => {
    if (closed) return;
    t0 = Date.now();
    evId = startShared(char.id, 'call', mode === 'video' ? 'On a video call with you' : 'On a call with you');
    timer = setInterval(() => { if (++beats % 40 === 0) heartbeat(evId); const s = Math.floor((Date.now() - t0) / 1000); $('[data-time]').textContent = `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`; }, 500);
    say(pickHello());
  }, 1400);
  function pickHello() {
    const opts = mode === 'video' ? ['hiii, there you are', 'hey you! i can see you now… well, kind of', 'heyy, good timing'] : ['hey, i was hoping you’d call', 'hiii, what’s up?'];
    return opts[Math.floor(Math.random() * opts.length)];
  }

  function end() {
    if (closed) return;
    closed = true;
    clearInterval(timer); voice.stop(); try { rec?.stop(); } catch {}
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
      $('[data-talk]').hidden = muted; if (muted) try { rec?.stop(); } catch {}
      setState(state === 'speaking' ? 'speaking' : 'listening');
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
          if (o === 'type') { close(); $('[data-talk]').hidden = false; $('#say').focus(); }
        });
      });
    }
  });

  el._cleanup = () => end();
  return el;
}
