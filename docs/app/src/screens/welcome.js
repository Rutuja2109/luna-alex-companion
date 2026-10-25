// Screen 1 — Welcome (reference: board-c #1, board-b #1)
import { h } from '../ui/components.js';
import { icon } from '../ui/icons.js';

const FEATURES = [
  ['chat', 'Chat, call, and spend time together'],
  ['target', 'A unique personality and daily life'],
  ['sliders', 'Fully customizable'],
  ['shield', 'A safe and private space'],
];

export function render(ctx) {
  const el = h(`<section class="screen welcome">
    <div class="hero welcome-hero">
      <img src="assets/characters/duo-welcome.jpg" alt="Alex and Luna, your fictional AI companions" class="ken">
      <div class="fade"></div>
    </div>
    <div class="screen-body welcome-body">
      <h1 class="title-lg center">Your AI Companion</h1>
      <p class="center muted-2">A friend who's always with you</p>
      <ul class="features">
        ${FEATURES.map(([ic, t]) => `<li><span class="fi">${icon(ic)}</span>${t}</li>`).join('')}
      </ul>
    </div>
    <div class="screen-foot btn-stack">
      <button class="btn btn-blue" data-g="male">Choose a Male Companion</button>
      <button class="btn btn-violet" data-g="female">Choose a Female Companion</button>
      <p class="center xs muted">Alex, Luna and every character here are fictional AI companions.</p>
    </div>
  </section>`);

  el.querySelectorAll('[data-g]').forEach((b) =>
    b.addEventListener('click', () => {
      const g = b.dataset.g;
      ctx.store.update((s) => { s.draft.gender = g; s.draft.characterId = g === 'male' ? 'alex' : 'luna'; }, { silent: true });
      ctx.go('gallery');
    }));
  return el;
}
