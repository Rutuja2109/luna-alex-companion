// Screen 12 — Virtual Apartment (reference: board-c #10, board-b #13)
import { h, Header, Seg, esc, ago } from '../ui/components.js';
import { ROOMS } from '../data/characters.js';
import * as routine from '../engine/routine.js';
import { roomImg, homePanel, bindHome, lightFilter, styleImg, decorLayers } from './homestyle.js';

export function render(ctx) {
  const { char, cfg } = ctx;
  let tab = 'live';
  let room = null; // null = follow the live activity
  const el = h(`<section class="screen">
    ${Header({ title: `${char.name}'s Apartment` })}
    <div class="screen-body">
      <div data-tabs></div>
      <div data-body></div>
    </div>
  </section>`);

  const save = (fn) => { if (tab === 'rooms') ctx.store.update((s) => fn(s.companions[char.id].home), { silent: true }); };

  const paint = () => {
    el.querySelector('[data-tabs]').innerHTML = Seg([{ id: 'live', label: 'Live' }, { id: 'rooms', label: 'Rooms' }], tab, { cls: 'violet tall', name: 'tab' });
    const body = el.querySelector('[data-body]');
    const home = ctx.store.get().companions[char.id].home;
    if (tab === 'rooms') {
      body.innerHTML = `<div class="photo-card room-hero"><img data-hero src="${styleImg(home.style)}" alt="" style="filter:${lightFilter(home.lighting)}">${decorLayers(home)}</div>
        <div class="seg sm mt12" role="tablist">${['apartment', 'room', 'decor'].map((t) => `<button data-sub="${t}" aria-selected="${t === (el._sub || 'apartment')}">${t[0].toUpperCase() + t.slice(1)}</button>`).join('')}</div>
        <div class="mt12">${homePanel(char, home, el._sub || 'apartment')}</div>`;
      return;
    }
    const act = routine.current(char, cfg);
    const viewing = room || act.room;
    const here = viewing === act.room;
    const img = here ? act.img : roomImg(char, viewing);
    const rLabel = ROOMS.find((r) => r.id === viewing)?.label || 'Study';
    body.innerHTML = `
      <div class="photo-card live-scene">
        <img src="${img}" alt="${here ? `${char.name}, ${act.label}` : `Empty ${rLabel}`}" class="breathe" style="filter:${lightFilter(home.lighting)}">
        ${decorLayers(home)}
        ${here ? `<span class="live-badge"><i></i>${act.withUser ? 'WITH YOU' : 'SIMULATED · NOW'}</span>` : ''}
        <div class="card row live-card">
          <span class="avatar"><img src="${char.avatar}" alt=""></span>
          <span class="grow"><span class="label">${here ? `${char.name} is ${esc(act.short || act.label).toLowerCase()}` : `${rLabel} · empty right now`}</span><br>
          <span class="small muted">${here ? `${esc(act.where)} • ${esc(act.desc)} · ${ago(act.start)}` : `${char.name} is in the ${(ROOMS.find((r) => r.id === act.room)?.label || 'study').toLowerCase()}`}</span></span>
        </div>
      </div>
      <div class="grid4 mt12" role="tablist" aria-label="Rooms">${ROOMS.map((r) => `<button class="tile-col ${r.id === viewing ? 'selected' : ''}" data-room="${r.id}" aria-selected="${r.id === viewing}">
        <span class="tile room-th"><img src="${roomImg(char, r.id)}" alt="" loading="lazy">${r.id === viewing ? `<span class="cap sel">${r.label.replace(' Room', '')}</span>` : ''}</span>
        ${r.id === viewing ? '' : `<span class="tile-label">${r.label}</span>`}</button>`).join('')}</div>
      ${here && act.withUser ? `<button class="btn btn-primary mt16" data-return>Back to ${esc(act.label.toLowerCase())}</button>`
        : here && act.joinable ? `<button class="btn btn-primary mt16" data-join>Join ${char.pronoun.obj}</button>`
        : `<button class="btn btn-ghost mt16" data-follow>${here ? `${char.name} is resting` : `Go to ${char.name}`}</button>`}`;
  };
  paint();

  el.addEventListener('click', (e) => {
    const t = e.target.closest('[data-tab]'); if (t) { tab = t.dataset.tab; paint(); return; }
    const sub = e.target.closest('[data-sub]'); if (sub) { el._sub = sub.dataset.sub; paint(); return; }
    const r = e.target.closest('[data-room]:not([aria-pressed])');
    if (r && tab === 'live') { room = r.dataset.room; paint(); return; }
    if (e.target.closest('[data-follow]')) { room = null; paint(); return; }
    if (e.target.closest('[data-return]')) {
      const act = routine.current(char, cfg);
      ctx.go(['study', 'work'].includes(act.activity) ? 'study' : act.activity === 'call' ? 'call' : 'activity', { id: act.activity });
      return;
    }
    if (e.target.closest('[data-join]')) {
      const act = routine.current(char, cfg);
      ctx.go(act.activity === 'study' || act.activity === 'work' ? 'study' : 'activity', { id: act.activity });
    }
  });
  bindHome(el, save, paint);
  const timer = setInterval(() => tab === 'live' && paint(), 60000);
  el._cleanup = () => clearInterval(timer);
  return el;
}
