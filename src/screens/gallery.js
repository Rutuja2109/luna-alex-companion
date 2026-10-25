// Screens 2–3 — Choose Your Companion (reference: board-c #2 male, #3 female)
import { h, Header, Seg, toast } from '../ui/components.js';
import { GALLERY } from '../data/characters.js';
import { icon } from '../ui/icons.js';

const FILTERS = [
  { id: 'all', label: 'All' }, { id: 'Playful', label: 'Playful' },
  { id: 'Caring', label: 'Caring' }, { id: 'Calm', label: 'Calm' },
];

export function render(ctx) {
  const draft = ctx.s.draft;
  let gender = draft.gender || 'female';
  let filter = 'all';
  let selected = draft.characterId;

  const el = h(`<section class="screen">
    ${Header({ title: 'Choose Your Companion', left: true })}
    <div class="screen-body">
      <div data-gseg></div>
      <div class="scroll-x filters" data-fseg aria-label="Filter by personality"></div>
      <div class="grid3 mt12 gal-grid" data-grid></div>
      <p class="small muted mt16 center" data-note></p>
    </div>
    <div class="screen-foot"><button class="btn btn-primary" data-next>Continue</button></div>
  </section>`);

  const paint = () => {
    el.querySelector('[data-gseg]').innerHTML = Seg(
      [{ id: 'male', label: 'Male' }, { id: 'female', label: 'Female' }], gender,
      { cls: (gender === 'female' ? 'violet ' : '') + 'tall', name: 'g' });
    el.querySelector('[data-fseg]').innerHTML = FILTERS.map((f) =>
      `<button class="pill ${filter === f.id ? 'on' : ''}" data-f="${f.id}" aria-pressed="${filter === f.id}">${f.label}</button>`).join('');
    const list = GALLERY[gender].filter((c) => filter === 'all' || c.traits === filter || c.id === selected);
    el.querySelector('[data-grid]').innerHTML = list.map((c) => {
      const avail = c.id === 'alex' || c.id === 'luna';
      return `<button class="tile portrait ${avail ? '' : 'locked'}" data-c="${c.id}" aria-pressed="${c.id === selected}"
          aria-label="${c.name}, ${c.traits}${avail ? '' : ', coming soon'}">
        <img src="${c.img}" alt="" loading="lazy">
        ${avail ? '' : `<span class="soon">${icon('lock')}Soon</span>`}
        <span class="cap">${c.name}<small>${c.traits}</small></span>
      </button>`;
    }).join('');
    const sel = GALLERY[gender].find((c) => c.id === selected);
    el.querySelector('[data-note]').textContent = sel ? '' : 'Pick a companion to continue.';
    el.querySelector('[data-next]').disabled = !sel;
  };
  paint();

  el.addEventListener('click', (e) => {
    const g = e.target.closest('[data-g]');
    if (g) { gender = g.dataset.g; selected = gender === 'male' ? 'alex' : 'luna'; paint(); return; }
    const f = e.target.closest('[data-f]');
    if (f) { filter = f.dataset.f; paint(); return; }
    const c = e.target.closest('[data-c]');
    if (c) {
      if (c.classList.contains('locked')) { toast('Only Alex and Luna are available in this version.'); return; }
      selected = c.dataset.c; paint();
    }
  });
  el.querySelector('[data-next]').addEventListener('click', () => {
    ctx.store.update((s) => { s.draft.gender = gender; s.draft.characterId = selected; }, { silent: true });
    ctx.go('preview');
  });
  return el;
}
