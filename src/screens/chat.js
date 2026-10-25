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
  // Reply scheduler: batches quick successive messages, never drops one.
  let waitTimer = null;     // batching window after the user's last message
  let gen = 0;              // generation counter; a newer one supersedes older
  let abort = null;
  let speaking = false;     // bubbles are being delivered
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
    const meta = `<span class="meta">${timeLabel(m.ts)}${m.from === 'me' && settings.readReceipts ? (m.read ? icon('checks') : icon('check')) : ''}</span>`;
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
  const paint = () => {
    const msgs = ctx.store.get().chats[cid] || [];
    if (!msgs.length) {
      body.innerHTML = `<div class="empty">${icon('chat')}<div>Say hi to ${char.name}. Your chat is saved on this device.</div></div>`;
      return;
    }
    let lastDay = '';
    body.innerHTML = msgs.map((m) => {
      const d = new Date(m.ts).toDateString();
      const sep = d !== lastDay ? `<div class="day-sep">${d === new Date().toDateString() ? 'Today' : new Date(m.ts).toLocaleDateString([], { weekday: 'short', day: 'numeric', month: 'short' })}</div>` : '';
      lastDay = d;
      return sep + msgHtml(m);
    }).join('');
    body.scrollTop = body.scrollHeight;
  };
  const paintMode = () => {
    const m = ai.getMode();
    el.querySelector('[data-mode]').innerHTML = m === 'offline'
      ? `<span class="chip-ai mock">Offline replies</span><span>${ai.getLastError() ? `Claude couldn't be reached (${esc(ai.getLastError())}), so these are` : 'These are'} simple built-in replies, not AI. Open the published app and allow Claude to chat with the real ${char.name}.</span>`
      : m === 'live' ? `<span class="chip-ai">AI</span><span>${char.name} is an AI character. Replies are generated by Claude.</span>` : '';
  };
  paint();
  ai.detect().then(paintMode);

  const idleStatus = () => {
    const act = routine.current(char, cfg);
    return act.id === 'bed' ? 'Resting' : `Online · ${(act.short || act.label).toLowerCase()}`;
  };
  const setStatus = (t, idle = false) => { const st = el.querySelector('[data-st]'); st.textContent = t; st.classList.toggle('idle', idle); };
  setStatus(idleStatus(), routine.current(char, cfg).id === 'bed');
  const showTyping = (on) => {
    body.querySelector('.typing-row')?.remove();
    if (on) setStatus('typing…'); else setStatus(idleStatus(), routine.current(char, cfg).id === 'bed');
    if (on) { body.insertAdjacentHTML('beforeend', '<div class="msg them typing-row"><div class="bubble typing" aria-label="typing"><i></i><i></i><i></i></div></div>'); body.scrollTop = body.scrollHeight; }
  };

  // ---- reply scheduler -------------------------------------------------------
  // Human-ish rhythm: wait a moment in case more messages are coming, "read"
  // them, think, type each bubble for a time that fits its length.
  function scheduleReply(task = 'reply', note = '') {
    clearTimeout(waitTimer);
    abort?.abort();
    const myGen = ++gen;
    const act = routine.current(char, cfg);
    const busyExtra = act.id === 'bed' ? rand(2500, 5000) : ['study', 'work', 'exercise'].includes(act.id) ? rand(600, 1800) : 0;
    waitTimer = setTimeout(() => runReply(myGen, task, note), task === 'reply' ? rand(1300, 2200) + busyExtra : 0);
  }

  async function runReply(myGen, task, note) {
    if (speaking) { waitTimer = setTimeout(() => runReply(myGen, task, note), 600); return; }
    if (myGen !== gen) return;
    if (task === 'reply') { markRead(cid); paint(); await sleep(rand(350, 900)); }
    if (myGen !== gen) return;
    showTyping(true);
    abort = new AbortController();
    const t0 = Date.now();
    let res;
    try {
      const st = ctx.store.get();
      res = await ai.reply({ char, cfg, history: st.chats[cid] || [], memories: st.memories.filter((m) => m.companionId === cid), summary: meta().summary || '', task, note, signal: abort.signal });
    } catch (e) {
      if (myGen === gen) { showTyping(false); if (e?.name !== 'AbortError' && e?.code !== 'aborted') toast(`${char.name} couldn't reply. Send again in a moment.`); }
      return;
    }
    if (myGen !== gen) return; // newer messages arrived; a fresh reply is coming
    paintMode();
    speaking = true;
    try {
      // reaction lands first, like a real chat
      if (res.react) {
        const lastMine = [...ctx.store.get().chats[cid]].reverse().find((m) => m.from === 'me');
        if (lastMine) { ctx.store.update((st) => { st.chats[cid].find((m) => m.id === lastMine.id).reaction = res.react; }, { silent: true }); paint(); showTyping(true); }
      }
      const act = routine.current(char, cfg);
      for (let i = 0; i < res.parts.length; i++) {
        const text = res.parts[i];
        const typeMs = Math.min(4200, Math.max(700, text.length * rand(38, 55)));
        const wait = i === 0 ? Math.max(0, typeMs - (Date.now() - t0)) : typeMs;
        showTyping(true);
        await sleep(wait);
        showTyping(false);
        if (i === 0 && res.selfie) addMessage(cid, { from: 'them', type: 'photo', img: act.img, text, desc: `selfie while ${act.label.toLowerCase()}` });
        else if (task === 'voice') addMessage(cid, { from: 'them', type: 'voice', text, dur: voice.estimateSeconds(text) });
        else addMessage(cid, { from: 'them', type: 'text', text });
        paint();
        if (i < res.parts.length - 1) await sleep(rand(250, 700));
      }
      if (task === 'opener') ctx.store.update((st) => { st.chatMeta[cid].lastOpenerAt = Date.now(); }, { silent: true });
      if (res.remember && ctx.store.get().settings.memoryMode !== 'off') {
        const exists = ctx.store.get().memories.some((m) => m.title.toLowerCase() === res.remember.title.toLowerCase());
        if (!exists) { await sleep(500); addMessage(cid, { from: 'system', type: 'memory-suggest', title: res.remember.title, text: res.remember.text, state: 'pending' }); paint(); }
      }
    } finally { speaking = false; showTyping(false); }
    maybeSummarize();
    // If the user wrote again while she was replying, answer that too.
    const msgs = ctx.store.get().chats[cid];
    const lastThem = msgs.map((m) => m.from).lastIndexOf('them');
    if (msgs.slice(lastThem + 1).some((m) => m.from === 'me') && myGen === gen) scheduleReply();
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
    input.value = ''; autosize(); paint(); scheduleReply();
  }
  const respond = () => scheduleReply();

  // She texts first when you come back after a while (or on a brand-new chat).
  {
    const msgs = ctx.store.get().chats[cid] || [];
    const last = msgs.filter((m) => m.from !== 'system').pop();
    const away = last ? Date.now() - last.ts : Infinity;
    const recentOpener = meta().lastOpenerAt && Date.now() - meta().lastOpenerAt < 3 * 3600e3;
    if (!recentOpener && (away > 3 * 3600e3 || (last && last.from === 'me' && away > 60e3))) {
      setTimeout(() => (last && last.from === 'me' ? scheduleReply() : scheduleReply('opener')), 1200);
    }
  }

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
            ctx.store.update((st) => { st.chats[cid] = []; }, { silent: true }); paint(); toast('Chat history cleared');
          }
        }
      });
    });
  });

  function sendCompanionVoiceNote() {
    addMessage(cid, { from: 'system', type: 'request', text: 'You asked for a voice note' }); paint();
    scheduleReply('voice');
  }

  el._cleanup = () => { clearTimeout(waitTimer); gen++; abort?.abort(); voice.stop(); stopWave?.(); };
  return el;
}
