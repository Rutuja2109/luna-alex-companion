// Screen 4 — Character Preview (reference: board-b #4)
import { h, esc } from '../ui/components.js';
import { icon } from '../ui/icons.js';
import { CHARACTERS } from '../data/characters.js';

export function render(ctx) {
  const c = CHARACTERS[ctx.s.draft.characterId] || CHARACTERS.luna;
  const img = c.id === 'luna' ? c.portrait : c.preview;
  const el = h(`<section class="screen preview">
    <div class="full-scene"><img src="${img}" alt="${c.name}, fictional AI companion" class="breathe"><div class="shade"></div></div>
    <div class="call-top"><button class="icon-btn" data-act="back" aria-label="Back">${icon('back')}</button></div>
    <div class="preview-info">
      <h1 class="title-lg">${c.name}</h1>
      <p class="tagline">${esc(c.tagline)}</p>
      <div class="card bio">${esc(c.bio)} <span class="heart">♡</span></div>
      <button class="btn btn-primary" data-choose>Choose ${c.name}</button>
      <button class="link-btn center" data-skip>Keep default look <b>Skip to preview</b></button>
    </div>
  </section>`);
  el.querySelector('[data-choose]').onclick = () => ctx.go('appearance');
  el.querySelector('[data-skip]').onclick = () => ctx.go('final');
  return el;
}
