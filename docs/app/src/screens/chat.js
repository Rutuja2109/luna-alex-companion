// Screen 13 — Persistent Chat (reference: board-c #11, board-b #14, board-a voice notes)
import { h, esc, nl2br, timeLabel, toast, sheet, fileToDataUrl, waveBars, animateWave } from '../ui/components.js';
import { icon } from '../ui/icons.js';
import { addMessage, markRead, addMemory } from '../state/actions.js';
import * as routine from '../engine/routine.js';
import * as ai from '../services/ai.js';
import * as voice from '../services/voice.js';
import { wallpaperCss } from './wallpaper.js';

const EMOJI = ['😊', '😂', '🥹', '😩', '😣', '🥺', '😍', '😴', '💜', '💙', '❤️', '🔥', '✨', '👍', '🙏', '🎉', '☕', '📚', '🍿', '🌙', '😭', '🤔', '😅', '🫶'];

export function render(ctx) {
  const { char, cfg } = ctx;
  const cid = char.id;
  const settings = ctx.store.get().settings;
  let stopWave = null;
  ctx.store.update((st) => { st.chatMeta ||= {}; st.chatMeta[cid] ||= {}; }, { silent: true });
  const meta = () => ctx.store.get().chatMeta[cid];
  const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
  const rand = (a, b) => a + Math.random() * (b - a);

  const el = h(`<section class="screen chat">
    <header class="chat-hdr">
      <button class="icon-btn" data-act="back" aria-label="Back">${icon('back')}</button>
      <span class="avatar"><img src="${char.avatar}" alt=""></span>
      <div class="grow" style="min-width:0"><div class="name">${char.name}</div><div class="status" data-st>Online</div></div>
      <button class="icon-btn round" data-call="voice" aria-label="Voice call">${icon('phone')}</button>
      <button class="icon-btn round" data-call="video" aria-label="Video call">${icon('video')}</button>
      <button class="icon-btn" data-more aria-label="More options">${icon('more')}</button>
    </header>
    <div class="chat-wrap">
      <div class="chat-wall" data-wall></div>
      <div class="chat-body" data-body role="log" aria-label="Conversation with ${char.name}"></div>
      <button class="new-pill" data-newpill hidden>New message ${icon('chev')}</button>
    </div>
    <div class="ai-strip" data-mode></div>
    <form class="composer" data-form>
      <button type="button" class="icon-btn" data-emoji aria-label="Emoji">${icon('smile')}</button>
      <div class="box">
        <label class="sr" for="msg">Message</label>
        <textarea id="msg" rows="1" placeholder="Message..." data-input maxlength="2000"></textarea>
        <label class="icon-btn" aria-label="Attach photo" title="Attach photo">${icon('clip')}<input type="file" accept="image/*" class="hidden-file" data-file></label>
        <label class="icon-btn" aria-label="Camera" title="Take a photo">${icon('camera')}<input type="file" accept="image/*" capture="environment" class="hidden-file" data-file></label>
      </div>
      <button type="button" class="icon-btn mic" data-mic aria-label="Voice note">${icon('mic')}</button>
    </form>
  </section>`);

  const body = el.querySelector('[data-body]');
  const input = el.querySelector('[data-input]');
  const micBtn = el.querySelector('[data-mic]');
  el.querySelector('[data-wall]').style.cssText = wallpaperCss(ctx.store.get(), cfg);

  // ---- rendering -----------------------------------------------------------
  const msgHtml = (m) => {
    const meta = `<span class="meta">${m.offline ? '<span class="off-tag">offline reply</span>' : ''}${timeLabel(m.ts)}${m.from === 'me' && settings.readReceipts ? (m.read ? icon('checks') : icon('check')) : ''}</span>`;
    let inner;
    if (m.type === 'memory-suggest') {
      if (m.state === 'saved') return `<div class="sys-line">${icon('bookmark')}Saved to memories: ${esc(m.title)}</div>`;
      if (m.state === 'dismissed') return '';
      return `<div class="mem-suggest" data-id="${m.id}"><div class="ms-h">${icon('bookmark')}<span>${esc(char.name)} wants to remember</span></div>
        <div class="ms-b"><b>${esc(m.title)}</b>${m.text ? ` · ${esc(m.text)}` : ''}</div>
        <div class="ms-a"><button class="btn btn-primary btn-sm" data-ms="save">Remember</button><button class="btn btn-ghost btn-sm" data-ms="no">Not now</button></div></div>`;
    }
    if (m.from === 'system') return `<div class="sys-line">${icon(m.type === 'call' ? 'phone' : 'sparkle')}${esc(m.text)} · ${timeLabel(m.ts)}</div>`;
    if (m.type === 'photo') {
      inner = `<div class="bubble photo"><img src="${m.img}" alt="Photo" data-zoom loading="lazy"><div class="txt">${m.text ? nl2br(m.text) : ''}${meta}</div></div>`;
    } else if (m.type === 'voice') {
      inner = `<div class="bubble"><div class="voice"><button class="play" data-play="${m.id}" aria-label="Play voice note">${icon('play')}</button>${waveBars(m.id, 30)}<span class="dur num">0:${String(m.dur || 5).padStart(2, '0')}</span></div>
        ${m.text ? `<div class="vt">${nl2br(m.text)}</div>` : ''}${meta}</div>`;
    } else {
      inner = `<div class="bubble">${nl2br(m.text)}${meta}</div>`;
    }
    const rx = m.reaction ? `<span class="rx ${m.from === 'me' ? 'by-them' : 'by-me'}" title="${m.from === 'me' ? esc(char.name) + ' reacted' : 'You reacted'}">${m.reaction}</span>` : '';
    return `<div class="msg ${m.from} ${m.type === 'photo' ? 'has-photo' : ''} ${rx ? 'has-rx' : ''}" data-id="${m.id}">${inner}${rx}</div>`;
  };
  // Paging + scroll preservation: only the newest PAGE messages render at
  // first; the view sticks to the bottom only when the reader is already
  // there, otherwise their position is kept and a "new message" pill shows.
  const PAGE = 60;
  let shown = PAGE;
  let typingOn = false;
  let slow = false;
  let failure = null; // { code, message, task, note }
  const nearBottom = () => body.scrollHeight - body.scrollTop - body.clientHeight < 140;
  const typingHtml = () => `<div class="msg them typing-row"><div class="bubble typing" aria-label="${esc(char.name)} is typing"><i></i><i></i><i></i></div>${slow ? `<div class="slow-note">Taking longer than usual · <button data-cancel>Cancel</button></div>` : ''}</div>`;
  const failHtml = () => failure ? `<div class="fail-row" role="alert">${icon('help')}<span>${failure.code === 'cancelled' ? 'Reply cancelled.' : `${esc(char.name)} ${esc(failure.message)}.`}</span><button class="btn btn-primary btn-sm" data-retry>Retry</button><button class="btn btn-ghost btn-sm" data-dismiss>Dismiss</button></div>` : '';
  const paint = ({ stick, anchor = false } = {}) => {
    const msgs = ctx.store.get().chats[cid] || [];
    const atBottom = stick ?? nearBottom();
    const prevH = body.scrollHeight, prevTop = body.scrollTop;
    if (!msgs.length && !failure && !typingOn) {
      body.innerHTML = `<div class="empty">${icon('chat')}<div>Say hi to ${char.name}. Your chat is saved on this device.</div></div>`;
      return;
    }
    const startIdx = Math.max(0, msgs.length - shown);
    let lastDay = '';
    const today = new Date().toDateString();
    body.innerHTML = (startIdx > 0 ? `<button class="load-earlier" data-earlier>Show earlier messages (${startIdx})</button>` : '')
      + msgs.slice(startIdx).map((m) => {
        const d = new Date(m.ts).toDateString();
        const sep = d !== lastDay ? `<div class="day-sep">${d === today ? 'Today' : new Date(m.ts).toLocaleDateString([], { weekday: 'short', day: 'numeric', month: 'short' })}</div>` : '';
        lastDay = d;
        return sep + msgHtml(m);
      }).join('') + failHtml() + (typingOn ? typingHtml() : '');
    if (anchor) body.scrollTop = body.scrollHeight - prevH + prevTop;
    else if (atBottom) body.scrollTop = body.scrollHeight;
    else body.scrollTop = prevTop;
    el.querySelector('[data-newpill]').hidden = atBottom || anchor ? true : el.querySelector('[data-newpill]').hidden;
  };
  const notifyIncoming = () => { if (!nearBottom()) el.querySelector('[data-newpill]').hidden = false; };
  const paintMode = () => {
    const m = ai.getMode();
    const why = ai.getOfflineReason() === 'not_granted'
      ? `You didn't allow this app to use Claude, so ${esc(char.name)} can only send simple built-in replies. Reload the app to be asked again.`
      : `Claude isn't available here, so these are simple built-in replies, not AI. Open the published app to chat with the real ${esc(char.name)}.`;
    el.querySelector('[data-mode]').innerHTML = m === 'offline'
      ? `<span class="chip-ai mock">Offline mode</span><span>${why}</span>`
      : m === 'live' ? `<span class="chip-ai">Live AI</span><span>${esc(char.name)} is an AI character. Replies are generated by Claude.</span>` : '';
    el.classList.toggle('offline-mode', m === 'offline');
  };
  paint({ stick: true });
  ai.detect().then(paintMode);

  const idleStatus = () => {
    const act = routine.current(char, cfg);
    return act.id === 'bed' ? 'Resting · simulated' : `Online · ${(act.short || act.label).toLowerCase()}`;
  };
  const setStatus = (t, idle = false) => { const st = el.querySelector('[data-st]'); st.textContent = t; st.classList.toggle('idle', idle); };
  const restStatus = () => setStatus(idleStatus(), routine.current(char, cfg).id === 'bed');
  restStatus();
  const showTyping = (on, label = 'typing…') => {
    typingOn = on; if (!on) slow = false;
    body.querySelector('.typing-row')?.remove();
    if (on) { setStatus(label); const stick = nearBottom(); body.insertAdjacentHTML('beforeend', typingHtml()); if (stick) body.scrollTop = body.scrollHeight; }
    else restStatus();
  };

  // ---- reply scheduler -------------------------------------------------------
  // Human-ish rhythm: wait a moment in case more messages are coming, "read"
  // them, think, type each bubble for a time that fits its length.
  // `gen` makes sure only the newest request is ever delivered, so quick
  // successive messages are answered once, together, and none is dropped.
  let waitTimer = null, slowTimer = null, gen = 0, abort = null, speaking = false, userCancelled = false;
  function scheduleReply(task = 'reply', note = '', { immediate = false, attempt = 0 } = {}) {
    clearTimeout(waitTimer);
    abort?.abort();
    failure = null;
    const myGen = ++gen;
    const act = routine.current(char, cfg);
    const busyExtra = act.id === 'bed' ? rand(2500, 5000) : ['study', 'work', 'exercise'].includes(act.id) ? rand(600, 1800) : 0;
    const delay = immediate || task !== 'reply' ? 0 : rand(1300, 2200) + busyExtra;
    waitTimer = setTimeout(() => runReply(myGen, task, note, attempt), delay);
  }

  async function runReply(myGen, task, note, attempt) {
    if (speaking) { waitTimer = setTimeout(() => runReply(myGen, task, note, attempt), 600); return; }
    if (myGen !== gen) return;
    if (task === 'reply' && attempt === 0) { markRead(cid); paint(); await sleep(rand(350, 900)); }
    if (myGen !== gen) return;
    showTyping(true, attempt ? 'retrying…' : 'typing…');
    abort = new AbortController();
    userCancelled = false;
    clearTimeout(slowTimer);
    slowTimer = setTimeout(() => { if (myGen === gen && typingOn) { slow = true; showTyping(true, 'still typing…'); } }, 12000);
    const t0 = Date.now();
    let res;
    try {
      const st = ctx.store.get();
      res = await ai.reply({
        char, cfg, history: st.chats[cid] || [],
        memories: st.memories.filter((m) => m.companionId === cid),
        events: (st.events || []).filter((e) => e.companionId === cid),
        summary: st.chatMeta[cid]?.summary || '', task, note, signal: abort.signal,
      });
    } catch (e) {
      clearTimeout(slowTimer);
      if (myGen !== gen) return; // superseded by a newer message
      showTyping(false);
      if (e?.name === 'AbortError') {
        if (userCancelled) { failure = { code: 'cancelled', message: 'reply cancelled', task, note }; paint(); }
        return;
      }
      // One automatic retry for transient failures, then a visible failed state.
      if (attempt === 0 && ['timeout', 'network'].includes(e?.code)) { scheduleReply(task, note, { immediate: true, attempt: 1 }); return; }
      failure = { code: e?.code || 'network', message: e?.message || "couldn't reply", task, note };
      setStatus(`Couldn't reply`, true);
      paint();
      return;
    }
    clearTimeout(slowTimer);
    if (myGen !== gen) return; // newer messages arrived; a fresh reply is coming
    paintMode();
    speaking = true;
    try {
      if (res.react) {
        const lastMine = [...ctx.store.get().chats[cid]].reverse().find((m) => m.from === 'me');
        if (lastMine) { ctx.store.update((st) => { st.chats[cid].find((m) => m.id === lastMine.id).reaction = res.react; }, { silent: true }); paint(); showTyping(true); }
      }
      const act = routine.current(char, cfg);
      const extra = res.offline ? { offline: true } : {};
      for (let i = 0; i < res.parts.length; i++) {
        const text = res.parts[i];
        const typeMs = Math.min(4200, Math.max(700, text.length * rand(38, 55)));
        const wait = i === 0 ? Math.max(0, typeMs - (Date.now() - t0)) : typeMs;
        showTyping(true);
        await sleep(wait);
        typingOn = false;
        if (i === 0 && res.selfie) addMessage(cid, { from: 'them', type: 'photo', img: act.img, text, desc: `selfie while ${act.label.toLowerCase()}`, ...extra });
        else if (task === 'voice') addMessage(cid, { from: 'them', type: 'voice', text, dur: voice.estimateSeconds(text), ...extra });
        else addMessage(cid, { from: 'them', type: 'text', text, ...extra });
        notifyIncoming();
        paint();
        if (i < res.parts.length - 1) await sleep(rand(250, 700));
      }
      if (task === 'opener') ctx.store.update((st) => { st.chatMeta[cid].lastOpenerAt = routine.clock.now(); }, { silent: true });
      if (res.remember && ctx.store.get().settings.memoryMode !== 'off') {
        const st = ctx.store.get();
        const t = res.remember.title.toLowerCase();
        const exists = st.memories.some((m) => m.title.toLowerCase() === t) || (st.chats[cid] || []).some((m) => m.type === 'memory-suggest' && m.title.toLowerCase() === t);
        if (!exists) { await sleep(500); addMessage(cid, { from: 'system', type: 'memory-suggest', title: res.remember.title, text: res.remember.text, state: 'pending' }); notifyIncoming(); paint(); }
      }
    } finally { speaking = false; showTyping(false); }
    maybeSummarize();
    // If the user wrote again while she was delivering, answer that too.
    if (myGen === gen && ai.pendingBatch(ctx.store.get().chats[cid] || []).length) scheduleReply();
  }

  // Fold older messages into a running summary so she remembers long chats.
  let summarizing = false;
  async function maybeSummarize() {
    const msgs = (ctx.store.get().chats[cid] || []).filter((m) => m.from !== 'system');
    const done = meta().summarizedCount || 0;
    if (summarizing || ai.getMode() !== 'live' || msgs.length - done < 40) return;
    summarizing = true;
    const older = msgs.slice(done, msgs.length - 20);
    const notes = await ai.summarize({ char, older, previous: meta().summary || '' });
    if (notes) ctx.store.update((st) => { st.chatMeta[cid].summary = notes; st.chatMeta[cid].summarizedCount = msgs.length - 20; }, { silent: true });
    summarizing = false;
  }

  function send(text) {
    const t = text.trim();
    if (!t) return;
    addMessage(cid, { from: 'me', type: 'text', text: t });
    input.value = ''; autosize(); paint({ stick: true }); scheduleReply();
  }
  const respond = () => scheduleReply();

  // On open: answer anything left unanswered (e.g. the app was closed while
  // she was "typing"), or text first if the user has been away for hours.
  {
    const msgs = ctx.store.get().chats[cid] || [];
    const now = routine.clock.now();
    const pending = ai.pendingBatch(msgs);
    const away = ai.absence(msgs, now);
    const recentOpener = meta().lastOpenerAt && now - meta().lastOpenerAt < 3 * 3600e3;
    if (pending.length) setTimeout(() => scheduleReply(), 900);
    else if (!recentOpener && away > 3 * 3600e3) setTimeout(() => scheduleReply('opener'), 1200);
  }

  el.querySelector('[data-newpill]').addEventListener('click', () => { body.scrollTo({ top: body.scrollHeight, behavior: 'smooth' }); el.querySelector('[data-newpill]').hidden = true; });
  body.addEventListener('scroll', () => { if (nearBottom()) el.querySelector('[data-newpill]').hidden = true; }, { passive: true });

  const autosize = () => {
    input.style.height = 'auto';
    input.style.height = Math.min(input.scrollHeight, 110) + 'px';
    micBtn.innerHTML = input.value.trim() ? icon('send') : icon('mic');
    micBtn.setAttribute('aria-label', input.value.trim() ? 'Send' : 'Voice note');
  };
  input.addEventListener('input', autosize);
  input.addEventListener('keydown', (e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(input.value); } });
  el.querySelector('[data-form]').addEventListener('submit', (e) => { e.preventDefault(); send(input.value); });

  micBtn.addEventListener('click', () => {
    if (input.value.trim()) { send(input.value); return; }
    voiceNoteSheet();
  });

  function voiceNoteSheet() {
    sheet((s, close) => {
      s.innerHTML = `<h2>Send a voice note</h2>
        <p>Microphone recording isn't available in this version. Type what you'd say and it's sent as a voice note ${char.name} can hear.</p>
        <div class="field"><label for="vn">Voice note text</label><textarea class="input" id="vn" maxlength="400" placeholder="hey, just wanted to say…"></textarea><span class="err" data-err hidden>Write something to send.</span></div>
        <button class="btn btn-primary" data-ok>Send voice note</button>`;
      s.querySelector('[data-ok]').onclick = () => {
        const v = s.querySelector('#vn').value.trim();
        if (!v) { s.querySelector('[data-err]').hidden = false; s.querySelector('#vn').setAttribute('aria-invalid', 'true'); return; }
        addMessage(cid, { from: 'me', type: 'voice', text: v, dur: voice.estimateSeconds(v) });
        close(); paint(); respond();
      };
    });
  }

  el.querySelectorAll('[data-file]').forEach((f) => f.addEventListener('change', async (e) => {
    const file = e.target.files[0];
    e.target.value = '';
    if (!file) return;
    try {
      const url = await fileToDataUrl(file, 900, 0.78);
      addMessage(cid, { from: 'me', type: 'photo', img: url, text: '' });
      paint(); respond();
    } catch (err) { toast(err.message); }
  }));

  // ---- emoji ---------------------------------------------------------------
  el.querySelector('[data-emoji]').addEventListener('click', () => {
    const open = el.querySelector('.emoji-pop');
    if (open) { open.remove(); return; }
    const pop = h(`<div class="emoji-pop" role="dialog" aria-label="Emoji">${EMOJI.map((e) => `<button type="button" data-e="${e}">${e}</button>`).join('')}</div>`);
    pop.addEventListener('click', (e) => { const b = e.target.closest('[data-e]'); if (b) { input.value += b.dataset.e; autosize(); input.focus(); } });
    el.appendChild(pop);
  });

  // ---- bubbles: play voice, save to memories --------------------------------
  body.addEventListener('click', (e) => {
    if (e.target.closest('[data-earlier]')) { shown += PAGE; paint({ anchor: true }); return; }
    if (e.target.closest('[data-retry]')) { const f = failure; failure = null; paint(); scheduleReply(f?.task || 'reply', f?.note || '', { immediate: true }); return; }
    if (e.target.closest('[data-dismiss]')) { failure = null; restStatus(); paint(); return; }
    if (e.target.closest('[data-cancel]')) { userCancelled = true; abort?.abort(); return; }
    const p = e.target.closest('[data-play]');
    if (p) {
      const m = ctx.store.get().chats[cid].find((x) => x.id === p.dataset.play);
      stopWave?.(); voice.stop();
      const wave = p.parentElement.querySelector('.wave');
      p.innerHTML = icon('pause');
      stopWave = animateWave(wave, m.dur || 5);
      voice.speak(m.text, { voiceId: m.from === 'me' ? 'v2' : cfg.voice, gender: m.from === 'me' ? 'female' : char.gender, onend: () => { p.innerHTML = icon('play'); stopWave?.(); } });
      if (!voice.available()) toast('Voice playback isn\'t supported in this browser.');
      return;
    }
    const ms = e.target.closest('[data-ms]');
    if (ms) {
      const card = ms.closest('.mem-suggest');
      const m = ctx.store.get().chats[cid].find((x) => x.id === card.dataset.id);
      if (ms.dataset.ms === 'save') addMemory({ kind: 'pref', title: m.title, text: m.text });
      ctx.store.update((st) => { st.chats[cid].find((x) => x.id === m.id).state = ms.dataset.ms === 'save' ? 'saved' : 'dismissed'; }, { silent: true });
      paint(); if (ms.dataset.ms === 'save') toast('Saved to Memories');
      return;
    }
    const rb = e.target.closest('[data-rx]');
    if (rb) {
      const id = rb.closest('.msg').dataset.id;
      ctx.store.update((st) => { const m = st.chats[cid].find((x) => x.id === id); m.reaction = m.reaction === rb.dataset.rx ? null : rb.dataset.rx; }, { silent: true });
      paint(); return;
    }
    const row = e.target.closest('.msg[data-id]');
    if (!row || row.classList.contains('typing-row')) return;
    const existing = row.querySelector('.msg-actions');
    body.querySelectorAll('.msg-actions, .rx-picker').forEach((x) => x.remove());
    if (existing) return;
    const canReact = row.classList.contains('them');
    row.insertAdjacentHTML('beforeend', `${canReact ? `<div class="rx-picker">${['❤️', '😂', '🥹', '😮', '😢', '👍', '🔥'].map((r) => `<button data-rx="${r}" aria-label="React ${r}">${r}</button>`).join('')}</div>` : ''}<div class="msg-actions"><button data-save>${icon('bookmark')} Save to memories</button><button data-copy>Copy</button></div>`);
    row.querySelector('[data-save]').onclick = (ev) => {
      ev.stopPropagation();
      const m = ctx.store.get().chats[cid].find((x) => x.id === row.dataset.id);
      if (ctx.store.get().settings.memoryMode === 'off') { toast('Memories are turned off in Privacy settings.'); return; }
      addMemory(m.type === 'photo' ? { kind: 'photo', title: m.text || 'Shared photo', img: m.img }
        : m.type === 'voice' ? { kind: 'voice', title: 'Voice note', text: m.text, dur: m.dur }
        : { kind: 'moment', title: m.from === 'me' ? 'Something you said' : `${char.name} said`, text: m.text });
      row.querySelectorAll('.msg-actions, .rx-picker').forEach((x) => x.remove());
      toast('Saved to Memories');
    };
    row.querySelector('[data-copy]').onclick = async (ev) => {
      ev.stopPropagation();
      const m = ctx.store.get().chats[cid].find((x) => x.id === row.dataset.id);
      try { await navigator.clipboard.writeText(m.text || ''); toast('Copied'); } catch { toast('Copy isn\'t available here.'); }
      row.querySelector('.msg-actions')?.remove();
    };
  });

  body.addEventListener('dblclick', (e) => {
    const row = e.target.closest('.msg.them[data-id]'); if (!row) return;
    ctx.store.update((st) => { const m = st.chats[cid].find((x) => x.id === row.dataset.id); m.reaction = m.reaction ? null : '❤️'; }, { silent: true });
    paint();
  });

  // ---- header actions --------------------------------------------------------
  el.querySelectorAll('[data-call]').forEach((b) => b.addEventListener('click', () => ctx.go('call', { mode: b.dataset.call })));
  el.querySelector('[data-more]').addEventListener('click', () => {
    sheet((s, close) => {
      s.innerHTML = `<h2>${char.name}</h2><div class="list">
        <button class="list-row" data-x="wallpaper"><span class="ic">${icon('image')}</span><span class="grow">Chat wallpaper</span>${icon('chev', 'chev')}</button>
        <button class="list-row" data-x="voicenote"><span class="ic">${icon('wave')}</span><span class="grow">Ask for a voice note</span>${icon('chev', 'chev')}</button>
        <button class="list-row" data-x="memories"><span class="ic">${icon('heart')}</span><span class="grow">Memories</span>${icon('chev', 'chev')}</button>
        <button class="list-row" data-x="clear"><span class="ic">${icon('trash')}</span><span class="grow">Clear chat history</span>${icon('chev', 'chev')}</button></div>`;
      s.addEventListener('click', async (e) => {
        const x = e.target.closest('[data-x]')?.dataset.x;
        if (!x) return;
        close();
        if (x === 'wallpaper') ctx.go('wallpaper', { cid });
        if (x === 'memories') ctx.go('memories');
        if (x === 'voicenote') sendCompanionVoiceNote();
        if (x === 'clear') {
          const { confirmSheet } = await import('../ui/components.js');
          if (await confirmSheet({ title: 'Clear chat history?', body: `This deletes every message with ${char.name} on this device. Memories you saved stay.`, ok: 'Clear history', danger: true })) {
            ctx.store.update((st) => { st.chats[cid] = []; st.chatMeta[cid] = {}; ctx.store.tombstone('chats', cid); }, { silent: true }); paint(); toast('Chat history cleared');
          }
        }
      });
    });
  });

  function sendCompanionVoiceNote() {
    addMessage(cid, { from: 'system', type: 'request', text: 'You asked for a voice note' }); paint();
    scheduleReply('voice');
  }

  el._cleanup = () => { clearTimeout(waitTimer); clearTimeout(slowTimer); gen++; abort?.abort(); voice.stop(); stopWave?.(); };
  return el;
}
