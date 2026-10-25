// S12 customize, S13 store, S14 activities & quests.
import { h, esc, toast, sheet, Top, icon } from '../ui.js';
import * as S from '../state.js';
import { buy, QUESTS, liveStreak } from '../../src/engine/bond.js';
import { HOME_STYLES } from '../../src/data/characters.js';
import { GIFTS, ROOM_ITEMS, ACTIVITIES, MOODS } from '../catalog.js';
import { decorHtml, heroImg, roomBg, celebrate } from '../shared.js';

const price = (it) => (it.gems ? `${it.gems} 💎` : it.coins ? `${it.coins} 🪙` : 'Free');
const wallet = () => `<span class="wal">🪙 ${S.get().bond.coins} · 💎 ${S.get().bond.gems}</span>`;

function notEnough(r) {
  sheet((s, close) => {
    s.innerHTML = `<h2>Not enough ${r.cur}</h2><p class="muted">You need ${r.short} more. Earn ${r.cur} by chatting, finishing daily quests and levelling up. Nothing here is sold for real money.</p><button class="btn primary" data-ok>Got it</button>`;
    s.querySelector('[data-ok]').onclick = close;
  });
}

// ---------------------------------------------------------------- store
export function store(ctx) {
  const { char } = ctx;
  let tab = ctx.params.tab || 'gifts';
  const el = h(`<section class="screen page">${Top('Store', '<span data-w></span>')}<div class="seg2" role="tablist"><button data-tab="gifts">Gifts</button><button data-tab="room">Room</button></div><div class="body" data-b></div></section>`);
  const paint = () => {
    const s = S.get();
    el.querySelector('[data-w]').innerHTML = wallet();
    el.querySelectorAll('[data-tab]').forEach((b) => b.setAttribute('aria-selected', b.dataset.tab === tab));
    const items = tab === 'gifts' ? GIFTS : ROOM_ITEMS;
    el.querySelector('[data-b]').innerHTML = `<div class="grid3">${items.map((it) => {
      const owned = tab === 'room' && (s.bond.owned.includes(it.id) || !(it.coins || it.gems));
      const on = tab === 'room' && s.comp.decor.includes(it.id);
      return `<button class="item ${on ? 'on' : ''}" data-it="${it.id}"><span class="e">${it.emoji}</span><span>${esc(it.label)}</span><span class="p">${tab === 'gifts' ? price(it) : owned ? (on ? 'In room ✓' : 'Owned') : price(it)}</span></button>`;
    }).join('')}</div>
    <p class="xs muted mt12">${tab === 'gifts' ? `Gifts go straight to ${esc(char.name)} in your chat.` : `Tap an item you own to put it in ${esc(char.name)}'s room or take it out.`} Coins come from chatting, quests and level-ups, never from real money.</p>`;
  };
  paint();
  el.addEventListener('click', (e) => {
    const t = e.target.closest('[data-tab]'); if (t) { tab = t.dataset.tab; paint(); return; }
    const b = e.target.closest('[data-it]'); if (!b) return;
    const s = S.get();
    if (tab === 'gifts') {
      const g = GIFTS.find((x) => x.id === b.dataset.it);
      let r; S.update((st) => { r = buy(st.bond, { ...g, id: `gift-${S.uid()}` }); if (r.ok) st.bond.owned.pop(); });
      if (!r.ok) return notEnough(r);
      S.addMsg({ from: 'me', type: 'gift', text: `${g.label.toLowerCase()} ${g.emoji}`, gift: g.id });
      const a = S.award('gift'); if (a.levelUp) celebrate(char, a.levelUp);
      ctx.go('room', { gift: g.id }, { reset: true }); return;
    }
    const it = ROOM_ITEMS.find((x) => x.id === b.dataset.it);
    const owned = s.bond.owned.includes(it.id) || !(it.coins || it.gems);
    if (!owned) { let r; S.update((st) => { r = buy(st.bond, it); if (r.ok) st.comp.decor.push(it.id); }); if (!r.ok) return notEnough(r); toast(`${it.label} added to ${char.name}'s room`); paint(); return; }
    S.update((st) => { const k = st.comp.decor.indexOf(it.id); k >= 0 ? st.comp.decor.splice(k, 1) : st.comp.decor.push(it.id); });
    paint();
  });
  return el;
}

// ---------------------------------------------------------------- customize
// Full-screen preview with a carousel of looks (reference structure).
export function customize(ctx) {
  const { char } = ctx;
  let tab = 'looks';
  const el = h(`<section class="screen cz">
    <div class="cz-bg" data-bg></div><img class="cz-hero" data-hero alt="${esc(char.name)}"><div class="cz-decor" data-decor></div>
    <header class="cz-top"><button class="glass-b" data-back aria-label="Back">${icon('back')}</button>
      <div class="cz-tabs" role="tablist"><button role="tab" data-tab="looks">Looks</button><button role="tab" data-tab="room">Room</button><button data-store>Decor</button></div></header>
    <div class="carousel" data-car></div><div class="dots" data-dots></div>
  </section>`);
  const items = () => (tab === 'looks' ? char.outfits.map((o) => ({ id: o.id, img: o.img, label: o.label })) : HOME_STYLES.map((r) => ({ id: r.id, img: r.img, label: r.label })));
  const cur = () => (tab === 'looks' ? S.get().comp.outfit : S.get().comp.room);
  const paint = (scroll = true) => {
    const s = S.get();
    el.querySelector('[data-hero]').src = heroImg(char);
    el.querySelector('[data-bg]').style.backgroundImage = `url('${tab === 'room' ? roomBg() : heroImg(char)}')`;
    el.querySelector('[data-decor]').innerHTML = decorHtml(s.comp.decor);
    el.querySelectorAll('[data-tab]').forEach((b) => b.setAttribute('aria-selected', b.dataset.tab === tab));
    const list = items();
    el.querySelector('[data-car]').innerHTML = list.map((it) => `<button class="lk ${cur() === it.id ? 'on' : ''}" data-pick="${it.id}" aria-pressed="${cur() === it.id}" aria-label="${esc(it.label)}"><img src="${it.img}" alt="">${cur() === it.id ? `<span class="ck">${icon('check')}</span>` : ''}<span class="lb">${esc(it.label)}</span></button>`).join('');
    el.querySelector('[data-dots]').innerHTML = list.map((it) => `<i class="${cur() === it.id ? 'on' : ''}"></i>`).join('');
    if (scroll) { const on = el.querySelector('.lk.on'); on?.scrollIntoView({ inline: 'center', block: 'nearest' }); }
  };
  paint();
  el.addEventListener('click', (e) => {
    const t = e.target.closest('[data-tab]'); if (t) { tab = t.dataset.tab; paint(); return; }
    if (e.target.closest('[data-store]')) { ctx.go('store', { tab: 'room' }); return; }
    const p = e.target.closest('[data-pick]'); if (!p) return;
    S.update((s) => { if (tab === 'looks') s.comp.outfit = p.dataset.pick; else s.comp.room = p.dataset.pick; });
    paint(false); p.scrollIntoView?.({ inline: 'center', behavior: 'smooth', block: 'nearest' });
  });
  return el;
}

// ---------------------------------------------------------------- activities
export function activities(ctx) {
  const { char } = ctx;
  const el = h(`<section class="screen page">${Top('Activities')}<div class="body" data-b></div></section>`);
  const paint = () => {
    const s = S.get(); const q = s.bond.quests;
    el.querySelector('[data-b]').innerHTML = `
      <div class="card"><div class="ch">Today's quests <span class="xs muted">🔥 ${liveStreak(s.bond, S.now())} day streak</span></div>
        ${QUESTS.map((x) => { const p = q.progress?.[x.id] || 0; const done = q.claimed?.[x.id]; return `<div class="quest ${done ? 'done' : ''}"><span class="qc">${done ? '✓' : ''}</span><span class="grow">${x.label}${x.goal > 1 ? ` <span class="xs muted">${p}/${x.goal}</span>` : ''}</span><span class="qr">+${x.coins} 🪙</span></div>`; }).join('')}
        <p class="xs muted mt8">New quests every day at midnight.</p></div>
      <div class="ch mt12">Do something with ${esc(char.name)}</div>
      <div class="acts">${ACTIVITIES.map((a) => `<button class="act" data-a="${a.id}"><span class="e">${a.emoji}</span><span class="grow"><b>${esc(a.title)}</b><br><span class="xs muted">${esc(a.desc)}</span></span></button>`).join('')}</div>`;
  };
  paint();
  el.addEventListener('click', (e) => {
    const b = e.target.closest('[data-a]'); if (!b) return;
    const a = ACTIVITIES.find((x) => x.id === b.dataset.a);
    S.addMsg({ from: 'system', text: `Started: ${a.title.toLowerCase()} ${a.emoji}` });
    const r = S.award(a.kind); if (r.levelUp) celebrate(char, r.levelUp);
    if (r.quests.length) toast('Quest complete');
    ctx.go('room', { note: a.note }, { reset: true });
  });
  return el;
}

export { MOODS };
