// Screen 17 — Do Something Together (reference: board-c #14, board-b #18, board-d #8)
import { h, Header, BottomNav } from '../ui/components.js';
import { ACTIVITIES } from '../data/activities.js';
import * as routine from '../engine/routine.js';

export function render(ctx) {
  const { char, cfg } = ctx;
  const act = routine.current(char, cfg);
  const el = h(`<section class="screen">
    ${Header({ title: 'Do Something Together' })}
    <div class="screen-body">
      <div class="grid2 acts-grid">${ACTIVITIES.map((a) => `<button class="tile act-tile" data-a="${a.id}" aria-label="${a.label}">
        <img src="${char.scenes[a.scene] || char.hero}" alt="" loading="lazy">
        ${a.id === act.activity ? `<span class="now-chip">${char.name} is doing this</span>` : ''}
        <span class="cap">${a.label}</span></button>`).join('')}</div>
    </div>
    ${BottomNav('activities')}
  </section>`);
  el.addEventListener('click', (e) => {
    const b = e.target.closest('[data-a]');
    if (!b) return;
    const a = ACTIVITIES.find((x) => x.id === b.dataset.a);
    ctx.go(a.screen || 'activity', { id: a.id });
  });
  return el;
}
