// Screen 5 — Customize Appearance (reference: board-c #4, board-b #5)
import { h, Header, esc, toast, fileToDataUrl } from '../ui/components.js';
import { CHARACTERS, HAIR_COLORS, SKIN_TONES, EYE_COLORS } from '../data/characters.js';
import { draftConfig, setDraft } from '../state/actions.js';

export const TABS = [
  { id: 'appearance', label: 'Appearance' }, { id: 'outfits', label: 'Style' },
  { id: 'voice', label: 'Voice' }, { id: 'personality', label: 'Personality' },
];
export function stepTabs(active) {
  return `<div class="seg sm steps" role="tablist">${TABS.map((t) =>
    `<button role="tab" data-step="${t.id}" aria-selected="${t.id === active}">${t.label}</button>`).join('')}</div>`;
}

/** Hair-colour preview tint over the identity photo (face stays the same). */
export function tintStyle(app) {
  const c = HAIR_COLORS[app.hairColor] || HAIR_COLORS[0];
  return app.hairColor === 0 ? '' : `background:${c}`;
}

export function render(ctx) {
  const c = CHARACTERS[ctx.s.draft.characterId] || CHARACTERS.luna;
  const cfg = draftConfig();
  const faces = c.outfits.slice(0, 5);

  const el = h(`<section class="screen">
    ${Header({ title: `Customize ${c.name}` })}
    <div class="screen-body">
      <div class="photo-card appear-photo">
        <img data-photo src="${faces[cfg.appearance.face]?.img || c.hero}" alt="${c.name} preview">
        <span class="tint" data-tint></span>
      </div>
      ${stepTabs('appearance')}
      <h2 class="section-title">Face &amp; Hair</h2>
      <div class="face-row" role="radiogroup" aria-label="Photo style">${faces.map((f, i) =>
        `<button class="face-btn" role="radio" data-face="${i}" aria-checked="${i === cfg.appearance.face}" aria-label="${esc(f.label)}"><img src="${f.img}" alt=""></button>`).join('')}</div>
      <h2 class="section-title">Hair Color</h2>
      <div class="swatches" role="radiogroup" aria-label="Hair color" data-group="hairColor">${HAIR_COLORS.map((col, i) =>
        `<button class="swatch" role="radio" style="background:${col}" data-i="${i}" aria-checked="${i === cfg.appearance.hairColor}" aria-label="Hair color ${i + 1}"></button>`).join('')}</div>
      <h2 class="section-title">Skin Tone</h2>
      <div class="swatches" role="radiogroup" aria-label="Skin tone" data-group="skinTone">${SKIN_TONES.map((col, i) =>
        `<button class="swatch" role="radio" style="background:${col}" data-i="${i}" aria-checked="${i === cfg.appearance.skinTone}" aria-label="Skin tone ${i + 1}"></button>`).join('')}</div>
      <h2 class="section-title">Eye Color</h2>
      <div class="swatches" role="radiogroup" aria-label="Eye color" data-group="eyeColor">${EYE_COLORS.map((col, i) =>
        `<button class="swatch" role="radio" style="background:${col}" data-i="${i}" aria-checked="${i === cfg.appearance.eyeColor}" aria-label="Eye color ${i + 1}"></button>`).join('')}</div>
      <h2 class="section-title">Inspiration photo <span class="link">optional</span></h2>
      <label class="list-row upload-row">
        <input type="file" accept="image/*" class="hidden-file" id="inspo" data-inspo>
        <span class="ic" aria-hidden="true">＋</span>
        <span class="grow"><span class="label">Upload a reference look</span><br><span class="small muted" data-inspo-note>${cfg.inspiration ? 'Saved as a style note' : 'Used as a style note only'}</span></span>
      </label>
      <p class="notice mt12"><b>Preview only.</b> Skin and eye choices are saved to ${c.name}'s profile; the photos stay the same so ${c.pronoun.pos} face never changes. New renders need an image service that isn't connected yet.</p>
    </div>
    <div class="screen-foot"><button class="btn btn-primary" data-next>Continue</button></div>
  </section>`);

  const paintTint = () => { el.querySelector('[data-tint]').style.cssText = tintStyle(draftConfig().appearance); };
  paintTint();

  el.addEventListener('click', (e) => {
    const step = e.target.closest('[data-step]');
    if (step && step.dataset.step !== 'appearance') { ctx.go(step.dataset.step, {}, { replace: true }); return; }
    const f = e.target.closest('[data-face]');
    if (f) {
      const i = +f.dataset.face;
      setDraft((cf) => { cf.appearance.face = i; cf.outfit = c.outfits[i].id; });
      el.querySelectorAll('[data-face]').forEach((b) => b.setAttribute('aria-checked', b === f));
      el.querySelector('[data-photo]').src = faces[i].img;
      return;
    }
    const sw = e.target.closest('.swatch');
    if (sw) {
      const group = sw.parentElement.dataset.group;
      setDraft((cf) => { cf.appearance[group] = +sw.dataset.i; });
      sw.parentElement.querySelectorAll('.swatch').forEach((b) => b.setAttribute('aria-checked', b === sw));
      paintTint();
    }
  });
  el.querySelector('[data-inspo]').addEventListener('change', async (e) => {
    try {
      const url = await fileToDataUrl(e.target.files[0], 400, 0.7);
      setDraft((cf) => { cf.inspiration = url; });
      el.querySelector('[data-inspo-note]').textContent = 'Saved as a style note';
      toast('Inspiration photo saved as a style note.');
    } catch (err) { toast(err.message); }
  });
  el.querySelector('[data-next]').onclick = () => ctx.go('outfits');
  return el;
}
