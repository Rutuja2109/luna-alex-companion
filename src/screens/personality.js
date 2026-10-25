// Screen 7 — Set Personality (reference: board-c #7, board-b #7)
import { h, Header, Seg, toast } from '../ui/components.js';
import { CHARACTERS, PERSONALITIES, COMM_STYLES } from '../data/characters.js';
import { draftConfig, setDraft } from '../state/actions.js';

export function personalityGrid(c, chosen) {
  return PERSONALITIES.map((p, i) => `<button class="opt" role="checkbox" data-p="${p.id}" aria-checked="${chosen.includes(p.id)}">
      <span class="avatar"><img src="${c.outfits[i % c.outfits.length].img}" alt=""></span>
      <span class="grow"><span class="t">${p.label}</span><span class="d" style="display:block">${p.desc}</span></span>
    </button>`).join('');
}

/** Toggle with a max of two traits; returns the new list or null if refused. */
export function toggleTrait(list, id) {
  if (list.includes(id)) return list.length > 1 ? list.filter((x) => x !== id) : list;
  if (list.length >= 2) { toast('Pick up to two traits. Tap one to remove it first.'); return null; }
  return [...list, id];
}

export function render(ctx) {
  const c = CHARACTERS[ctx.s.draft.characterId] || CHARACTERS.luna;
  const el = h(`<section class="screen">
    ${Header({ title: 'Set Personality', sub: 'Choose what fits you. You can change<br>this anytime.' })}
    <div class="screen-body">
      <div class="opt-grid mt8" data-grid></div>
      <h2 class="section-title">How should ${c.name} text?</h2>
      <div data-comm></div>
    </div>
    <div class="screen-foot"><button class="btn btn-primary" data-next>Continue</button></div>
  </section>`);
  const paint = () => {
    const cf = draftConfig();
    el.querySelector('[data-grid]').innerHTML = personalityGrid(c, cf.personality);
    el.querySelector('[data-comm]').innerHTML = Seg(COMM_STYLES, cf.commStyle, { cls: 'sm', name: 'comm' });
  };
  paint();
  el.addEventListener('click', (e) => {
    const p = e.target.closest('[data-p]');
    if (p) {
      const next = toggleTrait(draftConfig().personality, p.dataset.p);
      if (next) { setDraft((cf) => { cf.personality = next; }); paint(); }
      return;
    }
    const cm = e.target.closest('[data-comm]');
    if (cm && cm.dataset.comm) { setDraft((cf) => { cf.commStyle = cm.dataset.comm; }); paint(); }
  });
  el.querySelector('[data-next]').onclick = () => ctx.go('voice');
  return el;
}
