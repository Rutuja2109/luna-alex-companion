// S09 profile, S10 diary, S11 memory, S16 settings.
import { h, esc, icon, toast, sheet, confirm, Top, dayLabel } from '../ui.js';
import * as S from '../state.js';
import * as ai from '../../src/services/ai.js';
import { STATUSES, INTERESTS, stageFor, liveStreak } from '../../src/engine/bond.js';
import { PERSONALITIES, VOICES } from '../../src/data/characters.js';
import { MEMORY_CATS, MOODS } from '../catalog.js';
import { dayKey } from '../../src/engine/bond.js';

// ---------------------------------------------------------------- profile | memory
// One dark screen with a Profile / Memory switch at the bottom and a + button
// (structure from the reference screenshots; content and look are ours).
const CARD_BG = { about: 'assets/rooms/living.jpg', goals: 'assets/rooms/aesthetic.jpg', likes: 'assets/rooms/cozy.jpg', dates: 'assets/rooms/bedroom.jpg', other: 'assets/rooms/minimal.jpg' };
export const profile = (ctx) => me(ctx, ctx.params.tab || 'profile');
export const memory = (ctx) => me(ctx, 'memory');

function me(ctx, tab) {
  const { char } = ctx;
  const el = h(`<section class="screen page me-page">
    <header class="top"><button class="ib" data-back aria-label="Back">${icon('back')}</button><h1 data-title></h1><div class="top-r"><button class="ib" data-go="settings" aria-label="Settings">${icon('sliders')}</button></div></header>
    <div class="body" data-b></div>
    <nav class="me-tabs"><div class="me-seg" role="tablist"><button role="tab" data-tab="profile">Profile</button><button role="tab" data-tab="memory">Memory</button></div>
      <button class="fab" data-fab aria-label="Add">${icon('plus')}</button></nav>
  </section>`);
  const body = el.querySelector('[data-b]');
  const paint = () => {
    el.querySelectorAll('[data-tab]').forEach((b) => b.setAttribute('aria-selected', b.dataset.tab === tab));
    el.querySelector('[data-title]').textContent = tab === 'profile' ? char.name : 'Memory';
    el.querySelector('[data-fab]').setAttribute('aria-label', tab === 'profile' ? 'Quick actions' : 'Add a memory');
    body.innerHTML = tab === 'profile' ? profileHtml() : memoryHtml();
  };
  function profileHtml() {
    const s = S.get(); const L = S.level();
    const week = [...Array(7)].map((_, k) => { const d = dayKey(S.now() - (6 - k) * 864e5); const m = s.moods.find((x) => x.day === d); return { d, m }; });
    return `
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
      <button class="card linkc" data-go="diary"><div class="ch">📔 Diary <span class="muted">${s.diary.filter((x) => !x.deleted).length} ›</span></div></button>
      <button class="card linkc" data-go="activities"><div class="ch">🎯 Activities & quests <span class="muted">›</span></div></button>
      <div class="card promise"><b>Same ${esc(char.name)}, always</b><p class="xs muted">${esc(char.name)}'s personality, backstory and memories, and your level, streak and items, are never reset by an update. Personality version ${s.settings.personaVersion}. You can download everything from Settings at any time.</p></div>`;
  }
  function memoryHtml() {
    const mem = S.get().memories;
    const cats = MEMORY_CATS.filter((c) => c.id !== 'people');
    const people = mem.filter((m) => m.cat === 'people');
    const cards = cats.map((c) => { const items = mem.filter((m) => (m.cat || 'other') === c.id); return items.length ? `<button class="mcard" data-cat="${c.id}"><span class="bgi" style="background-image:url('${CARD_BG[c.id] || CARD_BG.other}')"></span><span class="cnt">${items.length} fact${items.length > 1 ? 's' : ''}</span><h3>${c.label}</h3><p>${esc(items[0].text)}</p></button>` : ''; }).join('');
    return `${cards || `<div class="empty">🧠<p>Nothing yet. When you tell ${esc(char.name)} something worth keeping, ${char.pronoun.sub}'ll ask before remembering it. Or add facts with +.</p></div>`}
      <div class="people-h">People</div>
      <div class="people">${people.map((p) => `<button class="pcard" data-person="${p.id}"><div class="ph"><span class="ini">${esc((p.name || p.text)[0] || '?').toUpperCase()}</span>${esc(p.name || p.text.split(/[:,]/)[0])}</div><div class="rel">${esc(p.rel || '')}</div><div class="note">${esc(p.name ? p.text : p.text.split(/[:,]/).slice(1).join(',').trim())}</div></button>`).join('')}
        <button class="pcard add" data-addperson>+ Add someone</button></div>
      <p class="xs muted mt12">Everything ${esc(char.name)} remembers is here. Nothing is hidden: tap anything to edit or delete it.</p>`;
  }
  paint();

  el.addEventListener('click', (e) => {
    const t = e.target.closest('[data-tab]'); if (t) { tab = t.dataset.tab; paint(); body.scrollTop = 0; return; }
    if (e.target.closest('[data-fab]')) { if (tab === 'memory') return editFact(); return ctx.go('room', {}, { reset: true }); }
    const st = e.target.closest('[data-status]'); if (st) { S.update((s) => { s.comp.status = st.dataset.status; }); toast('Saved'); paint(); return; }
    const tr = e.target.closest('[data-trait]'); if (tr) { S.update((s) => { const a = s.comp.traits; const k = a.indexOf(tr.dataset.trait); if (k >= 0) { if (a.length > 1) a.splice(k, 1); } else { a.push(tr.dataset.trait); if (a.length > 2) a.shift(); } }); paint(); return; }
    const it = e.target.closest('[data-int]'); if (it) { S.update((s) => { const a = s.comp.interests; const k = a.indexOf(it.dataset.int); k >= 0 ? a.splice(k, 1) : a.push(it.dataset.int); }); paint(); return; }
    if (e.target.closest('[data-backstory]')) return backstory();
    if (e.target.closest('[data-voice]')) return voicePick();
    const cat = e.target.closest('[data-cat]'); if (cat) return catSheet(cat.dataset.cat);
    const pp = e.target.closest('[data-person]'); if (pp) return editFact(S.get().memories.find((m) => m.id === pp.dataset.person));
    if (e.target.closest('[data-addperson]')) return editFact(null, 'people');
    const g = e.target.closest('[data-go]'); if (g) ctx.go(g.dataset.go);
  });

  function catSheet(cid) {
    sheet((s, close) => {
      const draw = () => {
        const items = S.get().memories.filter((m) => (m.cat || 'other') === cid);
        if (!items.length) { close(); paint(); return; }
        s.innerHTML = `<h2>${esc(MEMORY_CATS.find((c) => c.id === cid).label)}</h2>${items.map((m) => `<div class="fact" data-id="${m.id}"><span>${esc(m.text)}</span><button data-fe="edit" aria-label="Edit">${icon('edit')}</button><button data-fe="del" aria-label="Delete">${icon('trash')}</button></div>`).join('')}
          <button class="btn ghost mt12" data-fe="add">Add a fact</button>`;
      };
      draw();
      s.addEventListener('click', async (e) => {
        const b = e.target.closest('[data-fe]'); if (!b) return;
        if (b.dataset.fe === 'add') { close(); return editFact(null, cid); }
        const id = b.closest('[data-id]').dataset.id;
        if (b.dataset.fe === 'edit') { close(); return editFact(S.get().memories.find((m) => m.id === id)); }
        S.update((st) => { st.memories = st.memories.filter((x) => x.id !== id); }); toast(`${char.name} won't use that any more`); draw(); paint();
      });
    });
  }
  function editFact(m = null, preset = 'about') {
    sheet((s, close) => {
      let cat = m?.cat || preset;
      const draw = () => {
        s.innerHTML = `<h2>${m ? 'Edit memory' : 'Add a memory'}</h2><div class="chips" data-cats>${MEMORY_CATS.map((c) => `<button class="chip ${cat === c.id ? 'on' : ''}" data-c="${c.id}">${c.label}</button>`).join('')}</div>
          ${cat === 'people' ? `<label class="ch mt12" for="pn">Name</label><input id="pn" class="input" maxlength="40" value="${esc(m?.name || '')}" placeholder="e.g. Priya">
            <label class="ch mt12" for="pr">Who they are to you</label><input id="pr" class="input" maxlength="60" value="${esc(m?.rel || '')}" placeholder="e.g. Your older sister">` : ''}
          <label class="ch mt12" for="mt">${cat === 'people' ? 'Something to remember' : 'Fact'}</label><input id="mt" class="input" maxlength="200" placeholder="${cat === 'people' ? 'e.g. The one you call every Sunday' : 'e.g. Wants to run a 10K this year'}" value="${esc(m?.text || '')}">
          <p class="xs muted">Avoid passwords, health or money details.</p>
          <button class="btn primary mt8" data-ok>Save</button>${m ? '<button class="btn ghost mt8" data-del>Delete</button>' : ''}`;
      };
      draw();
      s.addEventListener('click', (e) => {
        const c = e.target.closest('[data-c]'); if (c) { const keep = { t: s.querySelector('#mt').value }; cat = c.dataset.c; draw(); s.querySelector('#mt').value = keep.t; return; }
        if (e.target.closest('[data-del]')) { S.update((st) => { st.memories = st.memories.filter((x) => x.id !== m.id); }); close(); paint(); toast('Deleted'); return; }
        if (!e.target.closest('[data-ok]')) return;
        const text = s.querySelector('#mt').value.trim();
        const name = s.querySelector('#pn')?.value.trim() || '';
        const rel = s.querySelector('#pr')?.value.trim() || '';
        if (cat === 'people' ? !name : !text) { (s.querySelector(cat === 'people' ? '#pn' : '#mt')).focus(); return; }
        const data = { cat, text, ...(cat === 'people' ? { name, rel } : { name: undefined, rel: undefined }) };
        S.update((st) => { if (m) Object.assign(st.memories.find((x) => x.id === m.id), data); else st.memories.unshift({ id: S.uid(), ts: S.now(), ...data }); });
        close(); paint(); toast('Saved');
      });
    });
  }
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
