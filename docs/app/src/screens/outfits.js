// Screen 6 — Choose Outfits / Style (reference: board-b #6, board-a #6)
import { h, Header, Seg, esc } from '../ui/components.js';
import { CHARACTERS } from '../data/characters.js';
import { draftConfig, setDraft } from '../state/actions.js';
import { icon } from '../ui/icons.js';

const CATS = [{ id: 'all', label: 'All' }, { id: 'casual', label: 'Casual' }, { id: 'cozy', label: 'Cozy' }, { id: 'trendy', label: 'Trendy' }];

/** Outfit grid, shared with the post-onboarding Customize screen. */
export function outfitGrid(c, selected, cat = 'all') {
  return c.outfits.filter((o) => cat === 'all' || o.cat === cat).map((o) =>
    `<button class="tile outfit" data-outfit="${o.id}" aria-pressed="${o.id === selected}" aria-label="${esc(o.label)} outfit">
      <img src="${o.img}" alt="" loading="lazy">
      ${o.id === selected ? `<span class="check">${icon('check')}</span>` : ''}
      <span class="cap">${esc(o.label)}</span></button>`).join('');
}

export function render(ctx) {
  const c = CHARACTERS[ctx.s.draft.characterId] || CHARACTERS.luna;
  let cat = 'all';
  const el = h(`<section class="screen">
    ${Header({ title: 'Choose Outfits' })}
    <div class="screen-body">
      <div data-cats></div>
      <div class="grid2" data-grid></div>
    </div>
    <div class="screen-foot"><button class="btn btn-primary" data-next>Continue</button></div>
  </section>`);
  const paint = () => {
    el.querySelector('[data-cats]').innerHTML = Seg(CATS, cat, { cls: 'sm violet', name: 'cat' });
    el.querySelector('[data-grid]').innerHTML = outfitGrid(c, draftConfig().outfit, cat);
  };
  paint();
  el.addEventListener('click', (e) => {
    const t = e.target.closest('[data-cat]');
    if (t) { cat = t.dataset.cat; paint(); return; }
    const o = e.target.closest('[data-outfit]');
    if (o) {
      const i = c.outfits.findIndex((x) => x.id === o.dataset.outfit);
      setDraft((cf) => { cf.outfit = o.dataset.outfit; if (i < 5) cf.appearance.face = i; });
      paint();
    }
  });
  el.querySelector('[data-next]').onclick = () => ctx.go('personality');
  return el;
}
