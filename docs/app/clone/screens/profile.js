// S09 profile, S10 diary, S11 memory, S16 settings.
import { h, esc, icon, toast, sheet, confirm, Top, dayLabel } from '../ui.js';
import * as S from '../state.js';
import * as ai from '../../src/services/ai.js';
import { STATUSES, INTERESTS, stageFor, liveStreak } from '../../src/engine/bond.js';
import { PERSONALITIES, VOICES } from '../../src/data/characters.js';
import { MEMORY_CATS, MOODS } from '../catalog.js';
import { dayKey } from '../../src/engine/bond.js';

// ---------------------------------------------------------------- profile
export function profile(ctx) {
  const { char } = ctx;
  const el = h(`<section class="screen page">${Top(char.name, `<button class="ib" data-go="settings" aria-label="Settings">${icon('sliders')}</button>`)}<div class="body" data-b></div></section>`);
  const paint = () => {
    const s = S.get(); const L = S.level();
    const week = [...Array(7)].map((_, k) => { const d = dayKey(S.now() - (6 - k) * 864e5); const m = s.moods.find((x) => x.day === d); return { d, m }; });
    el.querySelector('[data-b]').innerHTML = `
      <div class="pf-head"><img src="${char.avatar}" alt=""><div class="pf-lv">Level ${L.level}</div><div class="xs muted">${L.into} / ${L.need} XP to level ${L.level + 1} · ${stageFor(L.level)}</div>
        <div class="bar"><i style="width:${L.pct}%"></i></div>
        <div class="pf-stats"><span>🔥 ${liveStreak(s.bond, S.now())} day streak</span><span>🪙 ${s.bond.coins}</span><span>💎 ${s.bond.gems}</span></div></div>
      <div class="card"><div class="ch">Relationship</div><div class="chips">${STATUSES.map((x) => `<button class="chip ${s.comp.status === x.id ? 'on' : ''}" data-status="${x.id}" aria-pressed="${s.comp.status === x.id}">${x.label}</button>`).join('')}</div>
        <p class="xs muted mt8">${esc(STATUSES.find((x) => x.id === s.comp.status)?.desc || '')} Every option is free.</p></div>
      <div class="card"><div class="ch">Personality <span class="xs muted">up to 2</span></div><div class="chips">${PERSONALITIES.map((p) => `<button class="chip ${s.comp.traits.includes(p.id) ? 'on' : ''}" data-trait="${p.id}" aria-pressed="${s.comp.traits.includes(p.id)}">${p.label}</button>`).join('')}</div></div>
      <div class="card"><div class="ch">Interests</div><div class="chips">${INTERESTS.map((x) => `<button class="chip ${s.comp.interests.includes(x) ? 'on' : ''}" data-int="${x}" aria-pressed="${s.comp.interests.includes(x)}">${x}</button>`).join('')}</div></div>
      <button class="card linkc" data-backstory><div class="ch">Backstory <span class="xs muted">${s.comp.backstory.length}/500</span></div><div class="sm muted">${s.comp.backstory ? esc(s.comp.backstory.slice(0, 140)) + (s.comp.backstory.length > 140 ? '…' : '') : `Add a few lines of history for ${esc(char.name)}.`}</div></button>
      <button class="card linkc" data-voice><div class="ch">Voice <span class="sm muted">${esc(VOICES.find((v) => v.id === s.comp.voice)?.desc || '')} ›</span></div></button>
      <div class="card"><div class="ch">Mood this week</div><div class="week">${week.map(({ d, m }) => `<span title="${d}">${m ? m.emoji : '·'}<i>${new Date(d).toLocaleDateString([], { weekday: 'narrow' })}</i></span>`).join('')}</div></div>
      <button class="card linkc" data-go="diary"><div class="ch">📔 Diary <span class="muted">${s.diary.length} ›</span></div></button>
      <button class="card linkc" data-go="memory"><div class="ch">🧠 What ${esc(char.name)} knows <span class="muted">${s.memories.length} ›</span></div></button>
      <div class="card promise"><b>Same ${esc(char.name)}, always</b><p class="xs muted">${esc(char.name)}'s personality, backstory and memories, and your level, streak and items, are never reset by an update. Personality version ${s.settings.personaVersion}. You can download everything from Settings at any time.</p></div>`;
  };
  paint();
  el.addEventListener('click', (e) => {
    const st = e.target.closest('[data-status]'); if (st) { S.update((s) => { s.comp.status = st.dataset.status; }); toast('Saved'); paint(); return; }
    const tr = e.target.closest('[data-trait]'); if (tr) { S.update((s) => { const a = s.comp.traits; const k = a.indexOf(tr.dataset.trait); if (k >= 0) { if (a.length > 1) a.splice(k, 1); } else { a.push(tr.dataset.trait); if (a.length > 2) a.shift(); } }); paint(); return; }
    const it = e.target.closest('[data-int]'); if (it) { S.update((s) => { const a = s.comp.interests; const k = a.indexOf(it.dataset.int); k >= 0 ? a.splice(k, 1) : a.push(it.dataset.int); }); paint(); return; }
    if (e.target.closest('[data-backstory]')) return backstory();
    if (e.target.closest('[data-voice]')) return voicePick();
  });
  function backstory() {
    sheet((s, close) => {
      s.innerHTML = `<h2>${esc(char.name)}'s backstory</h2><p class="xs muted">Extra history ${esc(char.name)} can draw on. It adds to who ${char.pronoun.sub} is; it can't change ${char.pronoun.pos} core personality or safety rules.</p>
        <label class="sr" for="bs">Backstory</label><textarea id="bs" class="input" rows="7" maxlength="500">${esc(S.get().comp.backstory)}</textarea><div class="xs muted right" data-n></div>
        <button class="btn primary mt8" data-ok>Save</button>`;
      const ta = s.querySelector('#bs'); const n = () => { s.querySelector('[data-n]').textContent = `${ta.value.length}/500`; }; n(); ta.oninput = n;
      s.querySelector('[data-ok]').onclick = () => { S.update((st) => { st.comp.backstory = ta.value.trim(); }); close(); paint(); toast('Backstory saved'); };
    });
  }
  function voicePick() {
    sheet((s, close) => {
      s.innerHTML = `<h2>Voice</h2><div class="list">${VOICES.map((v) => `<button class="row" data-v="${v.id}">${S.get().comp.voice === v.id ? icon('check') : icon('wave')}<span>${v.label} · ${v.desc}</span></button>`).join('')}</div><p class="xs muted">Uses your device's voice. All voices are free.</p>`;
      s.addEventListener('click', async (e) => { const v = e.target.closest('[data-v]')?.dataset.v; if (!v) return; S.update((st) => { st.comp.voice = v; }); const vs = await import('../../src/services/voice.js'); vs.speak(`hi, it's ${char.name}`, { voiceId: v, gender: char.gender }); close(); paint(); });
    });
  }
  return el;
}

// ---------------------------------------------------------------- diary
// One entry per past day you talked. Written by the AI when available,
// otherwise a plain summary built from what happened (labelled).
export async function ensureDiary(char, { includeToday = false } = {}) {
  const s = S.get();
  const today = S.today();
  const days = new Map();
  for (const m of s.chat) {
    if (m.from === 'system' && !m.text) continue;
    const d = dayKey(m.ts);
    if (d === today && !includeToday) continue;
    if (!days.has(d)) days.set(d, []);
    days.get(d).push(m);
  }
  const keys = [...days.keys()].filter((d) => days.get(d).some((m) => m.from === 'me') && !s.diary.some((x) => x.day === d)).slice(-3);
  let made = 0;
  for (const d of keys) {
    const msgs = days.get(d);
    const moments = msgs.filter((m) => m.from === 'system' && m.text).map((m) => m.text);
    const mood = s.moods.find((x) => x.day === d)?.mood || '';
    const out = await ai.writeDiary({ char, dateLabel: d, messages: msgs.filter((m) => m.from !== 'system' && m.text), moments, mood, profile: S.profileFor() });
    S.update((st) => { st.diary = st.diary.filter((x) => x.day !== d); st.diary.push({ id: S.uid(), day: d, text: out.text, offline: out.offline, ts: S.now() }); });
    made++;
  }
  return made;
}

export function diary(ctx) {
  const { char } = ctx;
  const el = h(`<section class="screen page">${Top(`${char.name}'s Diary`)}<div class="body" data-b></div></section>`);
  const paint = () => {
    const list = S.get().diary.filter((x) => !x.deleted).sort((a, b) => (a.day < b.day ? 1 : -1));
    el.querySelector('[data-b]').innerHTML = (list.length ? list.map((x) => `<article class="entry" data-id="${x.id}"><div class="ed">${esc(dayLabel(x.day, S.today()))}${x.offline ? ' <span class="off">written offline</span>' : ''}</div>
        <p>${esc(x.text)}</p><div class="ea"><button data-ev="up" aria-pressed="${x.vote === 1}" aria-label="Like entry">👍</button><button data-ev="down" aria-pressed="${x.vote === -1}" aria-label="Dislike entry">👎</button><button data-ev="edit">Edit</button><button data-ev="del">Forget</button></div></article>`).join('')
      : `<div class="empty">📔<p>${esc(char.name)} writes here at the end of each day you talk. Come back tomorrow, or ask for today's entry.</p></div>`)
      + `<button class="btn ghost mt8" data-today>Ask ${esc(char.name)} to write about today</button>`;
  };
  paint();
  ensureDiary(char).then((n) => { if (n) paint(); });
  el.addEventListener('click', async (e) => {
    if (e.target.closest('[data-today]')) {
      const b = e.target.closest('[data-today]'); b.disabled = true; b.textContent = 'Writing…';
      S.update((st) => { st.diary = st.diary.filter((x) => x.day !== S.today()); });
      const n = await ensureDiary(char, { includeToday: true });
      if (!n) toast(`Talk to ${char.name} today first.`);
      paint(); return;
    }
    const ev = e.target.closest('[data-ev]'); if (!ev) return;
    const id = ev.closest('[data-id]').dataset.id; const k = ev.dataset.ev;
    if (k === 'up' || k === 'down') { S.update((st) => { const x = st.diary.find((d) => d.id === id); const v = k === 'up' ? 1 : -1; x.vote = x.vote === v ? 0 : v; }); paint(); return; }
    if (k === 'del') { if (await confirm({ title: 'Forget this entry?', body: `${char.name} won't keep it.`, ok: 'Forget', danger: true })) { S.update((st) => { const x = st.diary.find((d) => d.id === id); x.deleted = true; x.text = ''; }); paint(); } return; }
    if (k === 'edit') sheet((s, close) => {
      const x = S.get().diary.find((d) => d.id === id);
      s.innerHTML = `<h2>Edit entry</h2><label class="sr" for="de">Entry</label><textarea id="de" class="input" rows="6" maxlength="700">${esc(x.text)}</textarea><button class="btn primary mt8" data-ok>Save</button>`;
      s.querySelector('[data-ok]').onclick = () => { S.update((st) => { st.diary.find((d) => d.id === id).text = s.querySelector('#de').value.trim(); }); close(); paint(); };
    });
  });
  return el;
}

// ---------------------------------------------------------------- memory
export function memory(ctx) {
  const { char } = ctx;
  const el = h(`<section class="screen page">${Top('Memory', `<button class="ib" data-add aria-label="Add a memory">${icon('plus')}</button>`)}<div class="body" data-b></div></section>`);
  const paint = () => {
    const mem = S.get().memories;
    el.querySelector('[data-b]').innerHTML = `<p class="sm muted">Everything ${esc(char.name)} remembers about you is here. Nothing is hidden: edit or delete anything.</p>`
      + (mem.length ? MEMORY_CATS.map((c) => { const items = mem.filter((m) => (m.cat || 'other') === c.id); return items.length ? `<div class="mcat"><div class="ch">${c.label}</div>${items.map((m) => `<div class="mrow" data-id="${m.id}"><span>${esc(m.text)}</span><button data-me="edit" aria-label="Edit">${icon('edit')}</button><button data-me="del" aria-label="Delete">${icon('trash')}</button></div>`).join('')}</div>` : ''; }).join('')
        : `<div class="empty">🧠<p>Nothing yet. When you tell ${esc(char.name)} something worth keeping, ${char.pronoun.sub}'ll ask before remembering it. You can also add facts with +.</p></div>`);
  };
  paint();
  const edit = (m = null) => sheet((s, close) => {
    s.innerHTML = `<h2>${m ? 'Edit memory' : 'Add a fact'}</h2><div class="chips" data-cats>${MEMORY_CATS.map((c) => `<button class="chip ${(m?.cat || 'about') === c.id ? 'on' : ''}" data-c="${c.id}">${c.label}</button>`).join('')}</div>
      <label class="sr" for="mt">Fact</label><input id="mt" class="input mt8" maxlength="200" placeholder="e.g. My sister's name is Priya" value="${esc(m?.text || '')}"><p class="xs muted">Avoid passwords, health or money details.</p><button class="btn primary mt8" data-ok>Save</button>`;
    let cat = m?.cat || 'about';
    s.querySelector('[data-cats]').onclick = (e) => { const c = e.target.closest('[data-c]'); if (!c) return; cat = c.dataset.c; s.querySelectorAll('[data-c]').forEach((b) => b.classList.toggle('on', b === c)); };
    s.querySelector('[data-ok]').onclick = () => {
      const text = s.querySelector('#mt').value.trim(); if (!text) { s.querySelector('#mt').focus(); return; }
      S.update((st) => { if (m) Object.assign(st.memories.find((x) => x.id === m.id), { text, cat }); else st.memories.unshift({ id: S.uid(), cat, text, ts: S.now() }); });
      close(); paint(); toast('Saved');
    };
  });
  el.addEventListener('click', async (e) => {
    if (e.target.closest('[data-add]')) return edit();
    const b = e.target.closest('[data-me]'); if (!b) return;
    const id = b.closest('[data-id]').dataset.id; const m = S.get().memories.find((x) => x.id === id);
    if (b.dataset.me === 'edit') return edit(m);
    if (await confirm({ title: 'Delete this memory?', body: `${char.name} won't use it any more.`, ok: 'Delete', danger: true })) { S.update((st) => { st.memories = st.memories.filter((x) => x.id !== id); }); paint(); }
  });
  return el;
}

// ---------------------------------------------------------------- settings
export function settings(ctx) {
  const { char } = ctx;
  const el = h(`<section class="screen page">${Top('Settings')}<div class="body" data-b></div></section>`);
  const tg = (k, label, desc, on) => `<button class="row tg" data-tg="${k}" role="switch" aria-checked="${on}"><span class="grow"><b>${label}</b><br><span class="xs muted">${desc}</span></span><span class="sw2 ${on ? 'on' : ''}"></span></button>`;
  const paint = () => {
    const s = S.get();
    el.querySelector('[data-b]').innerHTML = `
      <div class="card"><label for="un" class="ch">Your name</label><input id="un" class="input" maxlength="30" value="${esc(s.user.name)}"></div>
      <div class="list card">${tg('textsFirst', `${esc(char.name)} texts first`, `Sends you a message when you've been away a while (not between ${s.settings.quietStart} and ${s.settings.quietEnd})`, s.settings.textsFirst)}
        <button class="row" data-notify>${icon('bell')}<span class="grow">Phone notifications<br><span class="xs muted" data-np></span></span></button></div>
      <div class="list card">
        <button class="row" data-x="export">${icon('upload')}<span class="grow">Download all my data</span><span class="xs muted">JSON</span></button>
        <button class="row" data-x="clearchat">${icon('trash')}<span class="grow">Delete chat history</span></button>
        <button class="row" data-x="reset">${icon('logout')}<span class="grow">Delete everything and start over</span></button></div>
      <div class="card xs muted">${esc(char.name)} is a fictional AI character. Replies are written by AI${ai.getMode() === 'offline' ? ' (offline mode right now: simple built-in replies)' : ''}. Everything is saved on this device only. Nothing here costs money: coins are earned by using the app.</div>`;
    const np = el.querySelector('[data-np]');
    np.textContent = !('Notification' in window) ? 'Not supported in this browser' : Notification.permission === 'granted' ? 'On while the app is open in the background' : Notification.permission === 'denied' ? 'Blocked in browser settings' : 'Tap to allow';
  };
  paint();
  el.addEventListener('change', (e) => { if (e.target.id === 'un') { S.update((s) => { s.user.name = e.target.value.trim(); }); toast('Saved'); } });
  el.addEventListener('click', async (e) => {
    const t = e.target.closest('[data-tg]'); if (t) { S.update((s) => { s.settings[t.dataset.tg] = !s.settings[t.dataset.tg]; }); paint(); return; }
    if (e.target.closest('[data-notify]')) { if ('Notification' in window && Notification.permission === 'default') { try { await Notification.requestPermission(); } catch {} } paint(); return; }
    const x = e.target.closest('[data-x]')?.dataset.x; if (!x) return;
    if (x === 'export') {
      const json = S.exportJson(); const name = `companion-data-${S.today()}.json`;
      try { const dl = window.claude?.use ? await window.claude.use('downloads') : null; if (dl) { await dl.save({ filename: name, data: json }); toast('Export ready'); return; } } catch (err) { if (err?.code === 'declined') return; }
      const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([json], { type: 'application/json' })); a.download = name; document.body.appendChild(a); a.click(); a.remove(); toast('Downloaded'); return;
    }
    if (x === 'clearchat' && await confirm({ title: 'Delete chat history?', body: `Messages are removed. Memories, diary and your level stay.`, ok: 'Delete', danger: true })) { S.update((s) => { s.chat = []; }); toast('Chat deleted'); }
    if (x === 'reset' && await confirm({ title: 'Delete everything?', body: 'Your companion, chats, memories, diary, level and items are erased from this device.', ok: 'Delete everything', danger: true })) { S.replace(S.initial()); ctx.go('onboard', {}, { reset: true }); }
  });
  return el;
}
