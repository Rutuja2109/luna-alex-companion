// S07 — Main screen: the companion in their room with the conversation on top.
// Structure follows the original's core loop (recon S07, F02); art, wording
// and look are ours.
import { h, esc, nl2br, icon, toast, sheet, time } from '../ui.js';
import * as S from '../state.js';
import * as ai from '../../src/services/ai.js';
import { MOODS, GIFTS } from '../catalog.js';
import { stageFor, QUESTS } from '../../src/engine/bond.js';
import { decorHtml, heroImg, cfgFor, celebrate } from '../shared.js';

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const rand = (a, b) => a + Math.random() * (b - a);
const REACTS = ['❤️', '😂', '🥹', '😮', '🔥'];

export function render(ctx) {
  const { char } = ctx;
  const el = h(`<section class="screen room">
    <div class="room-bg" style="background-image:url('${heroImg(char)}')"></div>
    <div class="room-stage"><img class="room-char" src="${heroImg(char)}" alt="${esc(char.name)} in ${char.pronoun.pos} room">${decorHtml(S.get().comp.decor)}</div>
    <div class="room-fade"></div>
    <header class="room-top">
      <button class="name-pill" data-go="profile" aria-label="${esc(char.name)}'s profile and memory">${esc(char.name)} ${icon('chev')}</button>
      <span class="grow"></span>
      <button class="glass-b" data-hist aria-label="Show full conversation" aria-pressed="false">${icon('chat')}</button>
    </header>
    <div class="feed" data-feed role="log" aria-label="Conversation with ${esc(char.name)}"></div>
    <div class="mode-note" data-mode></div>
    <form class="composer" data-form>
      <button type="button" class="glass-b plus" data-plus aria-label="More: gifts, activities, mood, diary, style">${icon('plus')}</button>
      <div class="msg-pill">
        <label class="sr" for="msg">Message</label>
        <textarea id="msg" rows="1" maxlength="2000" placeholder="Your message" data-input></textarea>
        <button type="button" class="pill-act" data-act aria-label="Call ${esc(char.name)}">${icon('phone')}</button>
      </div>
    </form>
  </section>`);
  const feed = el.querySelector('[data-feed]');
  const input = el.querySelector('[data-input]');

  // ---- header ---------------------------------------------------------------
  const paintTop = () => {};

  // ---- feed -------------------------------------------------------------------
  let typing = false, failure = null;
  const moodToday = () => S.get().moods.find((m) => m.day === S.today());
  const bubble = (m) => {
    if (m.from === 'system') return `<div class="sys">${esc(m.text)} · ${time(m.ts)}</div>`;
    if (m.type === 'gift') return `<div class="msg me gift" data-id="${m.id}"><div class="b">🎁 You gave ${esc(char.name)} ${esc(m.text)}</div></div>`;
    if (m.type === 'remember') {
      if (m.state !== 'pending') return m.state === 'saved' ? `<div class="sys">🧠 Saved to memory: ${esc(m.title)}</div>` : '';
      return `<div class="remember" data-id="${m.id}"><div>🧠 <b>${esc(char.name)} wants to remember</b><br>${esc(m.title)}${m.text ? ` · ${esc(m.text)}` : ''}</div><div class="row"><button class="btn sm primary" data-rem="save">Remember</button><button class="btn sm ghost" data-rem="no">Not now</button></div></div>`;
    }
    const tag = m.offline ? '<span class="off">offline</span>' : '';
    if (m.type === 'photo') return `<div class="msg them photo" data-id="${m.id}"><div class="selfie" style="--tilt:${(m.id.charCodeAt(0) % 2 ? 1 : -1) * 3}deg"><img src="${m.img}" alt="${esc(char.name)}'s photo"></div>${m.text ? `<div class="b">${nl2br(m.text)}<span class="t">${tag}${time(m.ts)}</span></div>` : ''}</div>`;
    const vote = m.vote === 1 ? '<span class="vt">👍</span>' : m.vote === -1 ? '<span class="vt">👎</span>' : '';
    return `<div class="msg ${m.from === 'me' ? 'me' : 'them'}" data-id="${m.id}"><div class="b">${nl2br(m.text)}<span class="t">${tag}${time(m.ts)}</span></div>${m.reaction ? `<span class="rx">${m.reaction}</span>` : ''}${vote}</div>`;
  };
  const moodCard = () => `<div class="mood-card" data-moodcard><div class="mc-h">How are you feeling today?</div><div class="mc-row">${MOODS.map((m) => `<button data-mood="${m.id}" aria-label="${m.label}">${m.emoji}<span>${m.label}</span></button>`).join('')}</div></div>`;
  const paint = (stick = true) => {
    const s = S.get();
    const msgs = s.chat.slice(-80);
    const atBottom = feed.scrollHeight - feed.scrollTop - feed.clientHeight < 120;
    feed.innerHTML = msgs.map(bubble).join('')
      + (!moodToday() && s.chat.length ? moodCard() : '')
      + (failure ? `<div class="fail" role="alert">${esc(char.name)} ${esc(failure.message)}. <button data-retry>Retry</button> <button data-dismiss>Dismiss</button></div>` : '')
      + (typing ? `<div class="msg them typing"><div class="b"><i></i><i></i><i></i></div></div>` : '');
    if (stick || atBottom) feed.scrollTop = feed.scrollHeight;
  };
  const paintMode = () => {
    const m = ai.getMode();
    el.querySelector('[data-mode]').innerHTML = m === 'offline' ? `<b>Offline mode</b> · AI isn't reachable here, so ${esc(char.name)} uses simple built-in replies.` : '';
  };

  // ---- replies ------------------------------------------------------------------
  let gen = 0, timer = null, abort = null;
  const history = () => S.get().chat.filter((m) => m.type !== 'remember' && m.type !== 'gift').map((m) => (m.from === 'system' ? { ...m, type: 'activity' } : m))
    .concat([]);
  function schedule(task = 'reply', note = '', delay = rand(1100, 1900)) {
    clearTimeout(timer); abort?.abort(); failure = null;
    const my = ++gen;
    timer = setTimeout(() => run(my, task, note), delay);
  }
  async function run(my, task, note, attempt = 0) {
    typing = true; paint();
    abort = new AbortController();
    let res;
    try {
      const s = S.get();
      res = await ai.reply({
        char, cfg: cfgFor(s), history: giftsAsText(s.chat),
        memories: S.memForAI(s),
        events: [], summary: '', task, note, signal: abort.signal, profile: S.profileFor(s),
      });
    } catch (e) {
      if (my !== gen) return;
      typing = false;
      if (e?.name === 'AbortError') { paint(); return; }
      if (attempt === 0 && ['timeout', 'network'].includes(e?.code)) return run(my, task, note, 1);
      failure = { message: e?.message || "couldn't reply", task, note }; paint(); return;
    }
    if (my !== gen) return;
    paintMode();
    if (res.react) {
      const lastMine = [...S.get().chat].reverse().find((m) => m.from === 'me');
      if (lastMine) S.update((s) => { s.chat.find((m) => m.id === lastMine.id).reaction = res.react; });
    }
    for (let i = 0; i < res.parts.length; i++) {
      const text = res.parts[i];
      typing = true; paint();
      await sleep(Math.min(3500, Math.max(600, text.length * rand(30, 45))));
      if (my !== gen) return;
      typing = false;
      if (i === 0 && res.selfie) S.addMsg({ from: 'them', type: 'photo', img: selfieImg(), text, ...(res.offline ? { offline: true } : {}) });
      else S.addMsg({ from: 'them', text, ...(res.offline ? { offline: true } : {}) });
      paint();
    }
    if (res.remember) {
      const t = res.remember.title.toLowerCase();
      if (!S.get().memories.some((m) => m.text.toLowerCase() === t)) S.addMsg({ from: 'system', type: 'remember', title: res.remember.title, text: res.remember.text || '', state: 'pending' });
      paint();
    }
    if (task === 'opener') S.update((s) => { s.lastProactive = S.now(); });
  }
  // A photo of her right now: her current outfit or a scene from her day.
  function selfieImg() {
    const pool = [heroImg(char), ...Object.values(char.scenes || {}), ...char.outfits.map((o) => o.img)].filter(Boolean);
    const used = new Set(S.get().chat.filter((m) => m.type === 'photo').slice(-3).map((m) => m.img));
    return pool.find((x) => !used.has(x)) || pool[0];
  }
  // Gifts become plain lines the AI can read.
  function giftsAsText(chat) {
    return chat.filter((m) => m.type !== 'remember').map((m) => m.type === 'gift' ? { ...m, type: 'text', from: 'me', text: `[gives you a gift: ${m.text}]` } : m.type === 'photo' ? { ...m, desc: 'a selfie you sent' } : m);
  }

  function send(text) {
    const t = text.trim(); if (!t) return;
    S.addMsg({ from: 'me', text: t });
    reward(S.award('message'));
    if (t.length > 60) S.award('longMessage', { amount: 5 });
    input.value = ''; grow();
    paint(); paintTop(); schedule();
  }
  function reward(r) { if (!r) return; if (r.levelUp) celebrate(char, r.levelUp); if (r.quests?.length) toast(`Quest complete · +${r.quests.length > 1 ? 'coins' : '🪙'}`); paintTop(); }

  // ---- events -----------------------------------------------------------------
  const actBtn = el.querySelector('[data-act]');
  const grow = () => {
    input.style.height = 'auto'; input.style.height = Math.min(input.scrollHeight, 96) + 'px';
    const typing = !!input.value.trim();
    actBtn.innerHTML = icon(typing ? 'send' : 'phone'); actBtn.classList.toggle('send', typing);
    actBtn.setAttribute('aria-label', typing ? 'Send' : `Call ${char.name}`);
  };
  actBtn.addEventListener('click', () => { if (input.value.trim()) send(input.value); else ctx.go('call'); });
  input.addEventListener('input', grow);
  input.addEventListener('keydown', (e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(input.value); } });
  el.querySelector('[data-form]').addEventListener('submit', (e) => { e.preventDefault(); send(input.value); });

  el.addEventListener('click', (e) => {
    const g = e.target.closest('[data-go]'); if (g) { ctx.go(g.dataset.go); return; }
    if (e.target.closest('[data-menu]')) return menu();
    const hb = e.target.closest('[data-hist]');
    if (hb) { const on = !el.classList.contains('hist'); el.classList.toggle('hist', on); hb.setAttribute('aria-pressed', on); paint(); return; }
    if (e.target.closest('[data-plus]')) return plus();
  });
  feed.addEventListener('click', (e) => {
    const md = e.target.closest('[data-mood]');
    if (md) { logMood(md.dataset.mood); return; }
    if (e.target.closest('[data-retry]')) { const f = failure; failure = null; schedule(f.task, f.note, 0); return; }
    if (e.target.closest('[data-dismiss]')) { failure = null; paint(false); return; }
    const rem = e.target.closest('[data-rem]');
    if (rem) {
      const id = rem.closest('[data-id]').dataset.id;
      S.update((s) => {
        const m = s.chat.find((x) => x.id === id);
        m.state = rem.dataset.rem === 'save' ? 'saved' : 'dismissed';
        if (m.state === 'saved') s.memories.unshift({ id: S.uid(), cat: 'about', text: m.text ? `${m.title}: ${m.text}` : m.title, ts: S.now() });
      });
      paint(false); return;
    }
    const pick = e.target.closest('[data-pick]');
    if (pick) {
      const id = pick.closest('[data-id]').dataset.id; const v = pick.dataset.pick;
      let r = null;
      S.update((s) => {
        const m = s.chat.find((x) => x.id === id);
        if (v === 'up' || v === 'down') { const val = v === 'up' ? 1 : -1; const first = !m.vote; m.vote = m.vote === val ? 0 : val; if (first) r = true; }
        else m.reaction = m.reaction === v ? null : v;
      });
      if (r) reward(S.award('vote'));
      if (v === 'down') toast(`Thanks. ${char.name} will lean away from replies like that.`);
      if (v === 'up') toast(`${char.name} will do more of that.`);
      paint(false); return;
    }
    if (e.target.closest('[data-copy]')) { const id = e.target.closest('[data-id]').dataset.id; navigator.clipboard?.writeText(S.get().chat.find((m) => m.id === id)?.text || '').then(() => toast('Copied'), () => toast("Copy isn't available here")); return; }
    if (e.target.closest('[data-keep]')) {
      const id = e.target.closest('[data-id]').dataset.id; const m = S.get().chat.find((x) => x.id === id);
      S.update((s) => { s.memories.unshift({ id: S.uid(), cat: 'other', text: m.text.slice(0, 200), ts: S.now() }); }); toast('Saved to memory'); paint(false); return;
    }
    const row = e.target.closest('.msg.them[data-id], .msg.me[data-id]');
    feed.querySelectorAll('.pop').forEach((p) => p.remove());
    if (!row || row.classList.contains('gift')) return;
    const them = row.classList.contains('them');
    row.insertAdjacentHTML('beforeend', `<div class="pop">${them ? `<button data-pick="up" aria-label="Good reply">👍</button><button data-pick="down" aria-label="Bad reply">👎</button><span class="sep"></span>${REACTS.map((r) => `<button data-pick="${r}" aria-label="React ${r}">${r}</button>`).join('')}<span class="sep"></span>` : ''}<button data-keep>Remember</button><button data-copy>Copy</button></div>`);
  });

  function logMood(id) {
    const m = MOODS.find((x) => x.id === id);
    S.update((s) => { s.moods = s.moods.filter((x) => x.day !== S.today()); s.moods.push({ id: S.uid(), day: S.today(), mood: m.label, emoji: m.emoji, ts: S.now() }); });
    reward(S.award('mood'));
    S.addMsg({ from: 'system', text: `You're feeling ${m.label.toLowerCase()} ${m.emoji}` });
    paint(); schedule('reply', `The user just checked in: they feel ${m.label.toLowerCase()} today. Respond to that warmly and briefly${['low', 'stressed'].includes(id) ? ', and gently ask what\'s going on' : ''}.`, 600);
  }

  function plus() {
    sheet((s, close) => {
      const sb = S.get().bond; const L = S.level();
      s.innerHTML = `<div class="plus-head"><span>Level ${L.level}</span><span>🪙 ${sb.coins} · 💎 ${sb.gems}</span><span>🔥 ${sb.streak || 0}</span></div><div class="grid-acts">
        <button data-x="photo">📸<span>Ask for a selfie</span></button><button data-x="gift">🎁<span>Give a gift</span></button>
        <button data-x="activities">🎲<span>Activities</span></button><button data-x="mood">🌤️<span>Mood check-in</span></button>
        <button data-x="diary">📔<span>Diary</span></button><button data-x="customize">👗<span>Style & room</span></button>
        <button data-x="call">📞<span>Call</span></button><button data-x="store">🛍️<span>Store</span></button><button data-x="settings">⚙️<span>Settings</span></button></div>`;
      s.addEventListener('click', (e) => {
        const x = e.target.closest('[data-x]')?.dataset.x; if (!x) return; close();
        if (x === 'gift') ctx.go('store');
        else if (x === 'photo') { S.addMsg({ from: 'me', text: 'send me a pic of what you\'re up to?' }); reward(S.award('message')); paint(); schedule('reply', 'They asked for a photo: set "selfie": true and write a short caption.', 500); }
        else if (x === 'mood') { feed.insertAdjacentHTML('beforeend', moodCard()); feed.scrollTop = feed.scrollHeight; }
        else ctx.go(x);
      });
    });
  }
  function menu() {
    sheet((s, close) => {
      s.innerHTML = `<div class="list">${[['profile', 'user', `${char.name}'s profile`], ['diary', 'note', 'Diary'], ['memory', 'bookmark', 'Memory'], ['customize', 'palette', 'Style & room'], ['store', 'star', 'Store'], ['activities', 'activities', 'Activities & quests'], ['settings', 'sliders', 'Settings']].map(([id, ic, l]) => `<button class="row" data-x="${id}">${icon(ic)}<span>${l}</span>${icon('chev')}</button>`).join('')}</div>`;
      s.addEventListener('click', (e) => { const x = e.target.closest('[data-x]')?.dataset.x; if (x) { close(); ctx.go(x); } });
    });
  }

  // Gift / activity hand-offs from other screens.
  const p = ctx.params || {};
  paint(); paintTop();
  ai.detect().then(paintMode);
  if (p.gift) { const g = GIFTS.find((x) => x.id === p.gift); schedule('reply', `The user just gave you a gift: ${g.label.toLowerCase()} ${g.emoji}. React like a real friend would (surprised, specific, a little playful). Don't thank them more than once.`, 700); }
  else if (p.note) { schedule('reply', p.note, 600); }
  else {
    const s = S.get();
    const last = s.chat.filter((m) => m.from !== 'system' && m.type !== 'remember').pop();
    const pending = last && last.from === 'me';
    if (pending) schedule('reply', '', 900);
    else if (!last || S.now() - last.ts > 4 * 3600e3) schedule('opener', '', 1000);
  }
  const off = S.on(() => paintTop());
  el._cleanup = () => { off(); clearTimeout(timer); gen++; abort?.abort(); };
  return el;
}
