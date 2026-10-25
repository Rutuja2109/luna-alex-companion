// Screen 16 — Study Together (reference: board-c #13, board-b #17)
import { h, esc, toast, sheet, confirmSheet } from '../ui/components.js';
import { icon } from '../ui/icons.js';
import { addMessage, startShared, heartbeat, endShared } from '../state/actions.js';
import * as voice from '../services/voice.js';

const LENGTHS = [{ m: 25, l: '25 min' }, { m: 50, l: '50 min' }, { m: 90, l: '90 min' }, { m: 0, l: 'Open' }];
const CHEERS = ["Keep going! You're doing great!", 'halfway there, proud of you', 'quick stretch? then back at it', "you've got this", 'nice focus streak 🔥'];

export function render(ctx) {
  const { char, cfg } = ctx;
  const st = ctx.store.get();
  const activeGoals = st.goals.filter((g) => g.status === 'active');
  const mode = ctx.params.id === 'work' ? 'work' : 'study';
  const topic = char.studyTopic || { what: 'notes', unit: 'pages done', rate: 6, pause: 'taking a short break' };
  let goal = ctx.params.goal || '';
  let goalId = null;
  let length = 50;
  let running = false, paused = false, quiet = false;
  let elapsed = 0, last = 0, tick = null, cheerAt = 10 * 60, evId = null, saveEvery = 0;
  // Persisted session (survives navigation and reloads): store.activeStudy
  const saved = st.activeStudy && st.activeStudy.companionId === char.id ? st.activeStudy : null;
  const persist = (patch = {}) => ctx.store.update((s) => { s.activeStudy = { companionId: char.id, mode, goal, goalId, length, elapsed, paused, evId, cheerAt, lastTick: Date.now(), ...patch }; }, { silent: true });

  const el = h(`<section class="screen study">
    <div class="full-scene"><img src="${char.scenes.study}" alt="" class="bg-fill" aria-hidden="true"><img src="${char.scenes.study}" alt="${char.name} studying at ${char.pronoun.pos} desk" class="breathe fg"><div class="shade"></div></div>
    <div class="study-top">
      <button class="icon-btn" data-act="back" aria-label="Back">${icon('back')}</button>
      <div class="grow"><div class="st-title">${icon('focus')} ${mode === 'work' ? 'Work Together' : 'Study Together'}</div>
        <div class="st-time num" data-time>00:00:00</div>
        <div class="st-state" data-state><span class="dot-on"></span>Ready when you are</div></div>
    </div>
    <div class="companion-progress" data-cprog hidden><span class="avatar sm"><img src="${char.avatar}" alt=""></span><span data-cprog-text></span></div>
    <div class="resume-banner card" data-resume hidden><span class="grow" data-resume-text></span><button class="btn btn-primary btn-sm" data-resume-go>Resume</button><button class="btn btn-ghost btn-sm" data-resume-end>End</button></div>
    <div class="pip study-pip"><span class="pip-off">${icon('user')}<br><span class="xs">You</span></span></div>
    <div class="cheer-wrap" data-cheer hidden><span class="cheer"><span class="avatar"><img src="${char.avatar}" alt=""></span><span data-cheer-text></span> <span aria-hidden="true">💜</span></span></div>
    <div class="study-setup card" data-setup>
      <h2 class="title-md">What are you working on?</h2>
      <div class="field mt8"><label for="goal">Session goal</label>
        <input id="goal" class="input" maxlength="80" placeholder="e.g. Finish GMAT quant set" value="${esc(goal)}">
        <span class="err" data-err hidden>Add a goal so ${char.name} knows what you're focusing on.</span></div>
      ${activeGoals.length ? `<div class="pills mb8">${activeGoals.slice(0, 3).map((g) => `<button class="pill" data-g="${g.id}">${esc(g.title)}</button>`).join('')}</div>` : ''}
      <div class="seg sm mt8" role="radiogroup" aria-label="Session length">${LENGTHS.map((x) => `<button role="radio" data-len="${x.m}" aria-selected="${x.m === length}">${x.l}</button>`).join('')}</div>
      <button class="btn btn-primary" data-start>Start session</button>
    </div>
    <div class="controls" data-controls hidden><div class="row-c">
      <button class="ctl" data-pause aria-pressed="false"><span class="c">${icon('pause')}</span>Pause</button>
      <button class="ctl" data-quiet aria-pressed="false"><span class="c">${icon('mic')}</span>Voice on</button>
      <button class="ctl end" data-end aria-label="End session"><span class="c">${icon('stop')}</span>End</button>
      <button class="ctl" data-goal><span class="c">${icon('target')}</span>Goal</button>
      <button class="ctl" data-more><span class="c">${icon('dots4')}</span>More</button>
    </div></div>
  </section>`);
  const $ = (s) => el.querySelector(s);

  const paintCompanion = () => {
    const box = $('[data-cprog]'); box.hidden = !running;
    if (!running) return;
    const done = Math.floor(elapsed / 60 / topic.rate);
    $('[data-cprog-text]').textContent = paused ? `${char.name} is ${topic.pause}` : `${char.name} is working on ${topic.what} · ${done} ${topic.unit}`;
    el.querySelector('.fg').classList.toggle('breathe', !paused);
  };
  const fmt = (s) => [Math.floor(s / 3600), Math.floor((s % 3600) / 60), s % 60].map((n) => String(n).padStart(2, '0')).join(':');
  const paintTime = () => {
    const shown = Math.floor(length ? Math.max(0, length * 60 - elapsed) : elapsed);
    $('[data-time]').textContent = fmt(shown);
    $('[data-state]').innerHTML = !running ? '<span class="dot-on"></span>Ready when you are'
      : paused ? `<span class="dot-on idle"></span>Paused · ${esc(goal)}`
      : `<span class="dot-on"></span>Focus Mode · Both ${mode === 'work' ? 'working' : 'studying'}`;
    paintCompanion();
  };

  const cheer = (text, speak = true) => {
    $('[data-cheer-text]').textContent = text;
    $('[data-cheer]').hidden = false;
    clearTimeout(el._ct); el._ct = setTimeout(() => { $('[data-cheer]').hidden = true; }, 7000);
    if (speak && !quiet) voice.speak(text, { voiceId: cfg.voice, gender: char.gender });
  };

  const loop = () => {
    if (!running) return;
    const now = Date.now();
    if (!paused) elapsed += Math.round((now - last) / 1000);
    last = now;
    if (!paused && elapsed >= cheerAt) { cheer(CHEERS[Math.floor(elapsed / 600) % CHEERS.length]); cheerAt += 15 * 60; }
    if (length && elapsed >= length * 60) { finish(true); return; }
    if (++saveEvery % 5 === 0) persist();
    if (saveEvery % 30 === 0 && evId && !paused) heartbeat(evId);
    paintTime(); paintCompanion();
  };

  function begin({ resume = false } = {}) {
    running = true; last = Date.now();
    $('[data-setup]').hidden = true; $('[data-controls]').hidden = false;
    // a shared session record makes home / timeline / chat agree she's with you
    const live = evId && (ctx.store.get().events || []).find((e) => e.id === evId && !e.closed);
    if (!live) evId = startShared(char.id, mode);
    persist();
    clearInterval(tick); tick = setInterval(loop, 1000);
    paintTime(); paintCompanion(); paintPause();
    if (!resume) cheer(`okay, ${goal.toLowerCase()}. let's do this`);
  }
  const paintPause = () => {
    const b = $('[data-pause]');
    b.setAttribute('aria-pressed', paused); b.innerHTML = `<span class="c">${icon(paused ? 'play' : 'pause')}</span>${paused ? 'Resume' : 'Pause'}`;
  };

  // Restore a session after navigation or reload.
  if (saved) {
    ({ goal, goalId, length, elapsed, paused, evId } = saved);
    cheerAt = saved.cheerAt || cheerAt;
    const gap = Date.now() - (saved.lastTick || Date.now());
    if (!paused && gap < 5 * 60e3) { elapsed += Math.round(gap / 1000); begin({ resume: true }); }
    else {
      paused = true; begin({ resume: true });
      $('[data-resume]').hidden = false;
      $('[data-resume-text]').textContent = `Session paused while you were away · ${Math.round(elapsed / 60)} min on “${goal}”`;
    }
  }
  $('[data-resume-go]').onclick = () => { paused = false; last = Date.now(); $('[data-resume]').hidden = true; if (evId) heartbeat(evId); persist(); paintPause(); paintTime(); paintCompanion(); };
  $('[data-resume-end]').onclick = () => { $('[data-resume]').hidden = true; finish(false); };

  $('#goal').addEventListener('input', (e) => { goal = e.target.value; goalId = null; $('[data-err]').hidden = true; e.target.removeAttribute('aria-invalid'); });
  el.addEventListener('click', (e) => {
    const g = e.target.closest('[data-g]');
    if (g) { const gg = activeGoals.find((x) => x.id === g.dataset.g); goal = gg.title; goalId = gg.id; $('#goal').value = goal; return; }
    const l = e.target.closest('[data-len]');
    if (l) { length = +l.dataset.len; el.querySelectorAll('[data-len]').forEach((b) => b.setAttribute('aria-selected', b === l)); paintTime(); }
  });

  $('[data-start]').onclick = () => {
    goal = $('#goal').value.trim();
    if (!goal) { $('[data-err]').hidden = false; $('#goal').setAttribute('aria-invalid', 'true'); $('#goal').focus(); return; }
    paused = false; elapsed = 0;
    begin();
  };

  $('[data-pause]').onclick = (e) => {
    paused = !paused;
    last = Date.now();
    paintPause(); persist(); paintTime(); paintCompanion();
  };
  $('[data-quiet]').onclick = (e) => {
    quiet = !quiet; const b = e.currentTarget; if (quiet) voice.stop();
    b.setAttribute('aria-pressed', quiet); b.innerHTML = `<span class="c">${icon(quiet ? 'micOff' : 'mic')}</span>${quiet ? 'Quiet' : 'Voice on'}`;
    toast(quiet ? `Quiet mode: ${char.name} will only show silent notes.` : `${char.name} can talk again.`);
  };
  $('[data-goal]').onclick = () => toast(`Goal: ${goal}`);
  $('[data-more]').onclick = () => sheet((s, close) => {
    s.innerHTML = `<h2>Session</h2><div class="list">
      <button class="list-row" data-o="cheer"><span class="ic">${icon('sparkle')}</span><span class="grow">Ask ${char.name} for motivation</span></button>
      <button class="list-row" data-o="chat"><span class="ic">${icon('chat')}</span><span class="grow">Open chat (session keeps running)</span></button></div>`;
    s.addEventListener('click', (ev) => {
      const o = ev.target.closest('[data-o]')?.dataset.o; if (!o) return; close();
      if (o === 'cheer') cheer(CHEERS[Math.floor(Math.random() * CHEERS.length)]);
      if (o === 'chat') ctx.go('chat');
    });
  });
  $('[data-end]').onclick = async () => {
    if (await confirmSheet({ title: 'End this session?', body: `You've studied for ${Math.round(elapsed / 60)} min. It will be saved to your history.`, ok: 'End session' })) finish(false);
  };

  function finish(completed) {
    clearInterval(tick); running = false;
    const mins = Math.max(1, Math.round(elapsed / 60));
    if (evId) endShared(evId, { text: `${mode === 'work' ? 'Worked side by side' : 'Studied together'} on "${goal}" (${mins} min${completed ? ', finished the session' : ''})`, minutes: mins, label: mode === 'work' ? 'Worked side by side' : 'Studied together' });
    ctx.store.update((s) => { s.activeStudy = null; }, { silent: true });
    ctx.store.update((s) => {
      s.studySessions.push({ id: Date.now().toString(36), goal, goalId, minutes: mins, completed, ts: Date.now(), companionId: char.id });
      if (goalId) { const g = s.goals.find((x) => x.id === goalId); if (g) g.progress = Math.min(100, g.progress + 5); }
    }, { silent: true });
    endShared(evId, { text: `${mode === 'work' ? 'Worked side by side' : 'Studied together'} on "${goal}" (${mins} min)`, minutes: mins, label: mode === 'work' ? 'Worked side by side' : 'Studied together' });
    ctx.store.update((s) => { s.activeStudy = null; }, { silent: true });
    addMessage(char.id, { from: 'system', type: 'study', text: `${mode === 'work' ? 'Worked together' : 'Studied together'} · ${mins} min · ${goal}` });
    voice.stop(); paintCompanion();
    sheet((s, close) => {
      s.innerHTML = `<h2>${completed ? 'Session complete 🎉' : 'Nice work'}</h2><p>${mins} min on “${esc(goal)}”.${goalId ? ' Goal progress +5%.' : ''} ${char.name}: “${completed ? 'we actually did it. proud of you' : 'good session, take a real break now'}”</p>
        <div class="btn-stack"><button class="btn btn-primary" data-x="again">Start another</button><button class="btn btn-ghost" data-x="home">Done</button></div>`;
      s.querySelector('[data-x=again]').onclick = () => { close(); ctx.go('study', { goal }, { replace: true }); };
      s.querySelector('[data-x=home]').onclick = () => { close(); ctx.back('home'); };
    });
  }

  paintTime();
  // Leaving the screen keeps the session running (it's saved); End finishes it.
  el._cleanup = () => { clearInterval(tick); clearTimeout(el._ct); voice.stop(); if (running) persist(); };
  return el;
}
