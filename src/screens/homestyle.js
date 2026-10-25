// Screen 9 — Choose Home / Customize Her Space (reference: board-c #5, board-b #9)
import { h, Header, Seg, esc } from '../ui/components.js';
import { CHARACTERS, HOME_STYLES, ROOMS, DECOR } from '../data/characters.js';
import { draftConfig, setDraft } from '../state/actions.js';

const TABS = [{ id: 'apartment', label: 'Apartment' }, { id: 'room', label: 'Room' }, { id: 'decor', label: 'Decor' }];

export function roomImg(c, roomId) {
  const r = ROOMS.find((x) => x.id === roomId);
  return (r && r.img) || c.scenes.study;
}
export function styleImg(styleId) {
  return styleId === 'modern' ? 'assets/rooms/bedroom-hero.jpg' : (HOME_STYLES.find((s) => s.id === styleId) || HOME_STYLES[0]).img;
}

/** Tab bodies, shared with the post-onboarding Customize screen. */
export function homePanel(c, home, tab) {
  if (tab === 'apartment') {
    return `<div class="grid3 home-grid">${HOME_STYLES.map((s) => `<button class="tile-col ${home.style === s.id ? 'selected' : ''}" data-style="${s.id}" aria-pressed="${home.style === s.id}">
      <span class="tile room"><img src="${s.img}" alt="" loading="lazy">${home.style === s.id ? `<span class="cap sel">${s.label}</span>` : ''}</span>
      ${home.style === s.id ? '' : `<span class="tile-label">${s.label}</span>`}</button>`).join('')}</div>`;
  }
  if (tab === 'room') {
    return `<p class="small muted">Where ${esc(c.name)} spends most of ${c.pronoun.pos} time when you open the app.</p>
      <div class="grid2 mt12">${ROOMS.map((r) => `<button class="tile-col ${home.room === r.id ? 'selected' : ''}" data-room="${r.id}" aria-pressed="${home.room === r.id}">
      <span class="tile room"><img src="${roomImg(c, r.id)}" alt="" loading="lazy"></span><span class="tile-label">${r.label}</span></button>`).join('')}</div>`;
  }
  return `<div class="pills">${DECOR.map((d) => `<button class="pill ${home.decor.includes(d.id) ? 'on' : ''}" data-decor="${d.id}" aria-pressed="${home.decor.includes(d.id)}">${d.label}</button>`).join('')}</div>
    <div class="field mt16"><label for="light">Lighting warmth · <span data-lv>${home.lighting}</span>%</label>
    <input id="light" type="range" min="20" max="100" value="${home.lighting}" data-light></div>`;
}

/** Wire clicks for homePanel; `mutate(fn)` applies a change to the home object. */
export function bindHome(root, mutate, repaint) {
  root.addEventListener('click', (e) => {
    const s = e.target.closest('[data-style]'); if (s) { mutate((hm) => { hm.style = s.dataset.style; }); repaint(); return; }
    const r = e.target.closest('[data-room]'); if (r) { mutate((hm) => { hm.room = r.dataset.room; }); repaint(); return; }
    const d = e.target.closest('[data-decor]');
    if (d) { mutate((hm) => { const i = hm.decor.indexOf(d.dataset.decor); i >= 0 ? hm.decor.splice(i, 1) : hm.decor.push(d.dataset.decor); }); repaint(); }
  });
  root.addEventListener('input', (e) => {
    if (e.target.matches('[data-light]')) {
      mutate((hm) => { hm.lighting = +e.target.value; });
      root.querySelector('[data-lv]').textContent = e.target.value;
      const img = root.querySelector('[data-hero]'); if (img) img.style.filter = lightFilter(+e.target.value);
    }
  });
}
/** Decor shown as light overlays on the room photo (the photo itself is not
 *  re-rendered; a small chip says so). */
export function decorLayers(home) {
  const d = home?.decor || [];
  if (!d.length) return '';
  const leaf = '<svg viewBox="0 0 60 80" aria-hidden="true"><path d="M30 80 C28 50 10 40 4 20 C18 26 26 36 30 52 C32 30 40 14 56 6 C52 30 40 44 32 80Z" fill="#2f6b3a"/><path d="M30 80 C30 60 22 48 14 40" stroke="#4f9a5a" stroke-width="2" fill="none"/></svg>';
  return `<div class="decor" aria-hidden="true">
    ${d.includes('warm') ? '<span class="decor-warm"></span>' : ''}
    ${d.includes('fairy') ? '<span class="decor-fairy"></span>' : ''}
    ${d.includes('candles') ? '<span class="decor-candles"></span>' : ''}
    ${d.includes('plants') ? `<span class="decor-plant l">${leaf}</span><span class="decor-plant r">${leaf}</span>` : ''}
  </div><span class="decor-chip">Decor preview</span>`;
}
export const lightFilter = (v) => `brightness(${0.7 + v / 250}) saturate(${0.8 + v / 400})`;

export function render(ctx) {
  const c = CHARACTERS[ctx.s.draft.characterId] || CHARACTERS.luna;
  let tab = 'apartment';
  const el = h(`<section class="screen">
    ${Header({ title: `Customize ${c.pronoun.pos === 'her' ? 'Her' : 'His'} Space` })}
    <div class="screen-body">
      <div data-tabs></div>
      <div class="photo-card room-hero"><img data-hero alt="${c.name}'s apartment"><div data-decor-layer></div></div>
      <div class="mt12" data-panel></div>
    </div>
    <div class="screen-foot"><button class="btn btn-primary" data-next>Continue</button></div>
  </section>`);
  const paint = () => {
    const home = draftConfig().home;
    el.querySelector('[data-tabs]').innerHTML = Seg(TABS, tab, { cls: 'tall', name: 'tab' });
    const hero = el.querySelector('[data-hero]');
    hero.src = tab === 'room' ? roomImg(c, home.room) : styleImg(home.style);
    hero.style.filter = lightFilter(home.lighting);
    el.querySelector('[data-decor-layer]').innerHTML = decorLayers(home);
    el.querySelector('[data-panel]').innerHTML = homePanel(c, home, tab);
  };
  paint();
  el.addEventListener('click', (e) => { const t = e.target.closest('[data-tab]'); if (t) { tab = t.dataset.tab; paint(); } });
  bindHome(el, (fn) => setDraft((cf) => fn(cf.home)), paint);
  el.querySelector('[data-next]').onclick = () => ctx.go('final');
  return el;
}
