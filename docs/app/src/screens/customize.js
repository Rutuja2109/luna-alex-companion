// Screen 21 — Customize companion after onboarding (reference: board-c #18, board-a #22)
// Edits a working copy; nothing changes until "Save Changes". Identity and
// chat history are untouched.
import { h, Header, Seg, toast, esc } from '../ui/components.js';
import { HAIR_COLORS, SKIN_TONES, EYE_COLORS } from '../data/characters.js';
import { personalityGrid, toggleTrait } from './personality.js';
import { voiceList } from './voice.js';
import { homePanel, bindHome, styleImg, lightFilter, decorLayers } from './homestyle.js';
import { tintStyle } from './appearance.js';
import * as imagegen from '../services/imagegen.js';
import * as voice from '../services/voice.js';
import { icon } from '../ui/icons.js';

const TABS = [{ id: 'outfit', label: 'Outfit' }, { id: 'look', label: 'Look' }, { id: 'personality', label: 'Personality' }, { id: 'voice', label: 'Voice' }, { id: 'room', label: 'Room' }];

export function render(ctx) {
  const { char } = ctx;
  const work = JSON.parse(JSON.stringify(ctx.cfg));
  let tab = ctx.params.tab || 'outfit';
  let dirty = false;
  let roomSub = 'apartment';
  const el = h(`<section class="screen">
    ${Header({ title: `Customize ${char.name}` })}
    <div class="screen-body">
      <div class="scroll-x cust-tabs" data-tabs></div>
      <div class="photo-card cust-photo"><img data-photo alt="${char.name} preview"><span class="tint" data-tint></span><div data-decor-layer></div></div>
      <div class="mt12" data-panel></div>
    </div>
    <div class="screen-foot"><button class="btn btn-primary" data-save disabled>Save Changes</button></div>
  </section>`);
  const $ = (s) => el.querySelector(s);
  const mark = () => { dirty = true; $('[data-save]').disabled = false; $('[data-save]').textContent = tab === 'outfit' ? 'Apply Outfit' : 'Save Changes'; };
  const outfitImg = () => (char.outfits.find((o) => o.id === work.outfit) || char.outfits[0]).img;

  const paint = () => {
    $('[data-tabs]').innerHTML = Seg(TABS, tab, { cls: 'sm', name: 'tab' });
    const photo = $('[data-photo]');
    photo.src = tab === 'room' ? styleImg(work.home.style) : (work.lookImage || outfitImg());
    photo.style.filter = tab === 'room' ? lightFilter(work.home.lighting) : '';
    $('[data-tint]').style.cssText = tab === 'look' && !work.lookImage ? tintStyle(work.appearance) : '';
    $('[data-decor-layer]').innerHTML = tab === 'room' ? decorLayers(work.home) : '';
    const p = $('[data-panel]');
    if (tab === 'outfit') {
      p.innerHTML = `<div class="outfit-strip">${char.outfits.map((o) => `<button class="face-btn" data-outfit="${o.id}" aria-checked="${o.id === work.outfit}" aria-label="${esc(o.label)}"><img src="${o.img}" alt=""></button>`).join('')}</div>
        <p class="small muted mt8">${esc((char.outfits.find((o) => o.id === work.outfit) || {}).label || '')}</p>`;
    } else if (tab === 'look') {
      const sw = (arr, key, label) => `<h2 class="section-title">${label}</h2><div class="swatches" data-group="${key}">${arr.map((c, i) => `<button class="swatch" role="radio" style="background:${c}" data-i="${i}" aria-checked="${i === work.appearance[key]}" aria-label="${label} ${i + 1}"></button>`).join('')}</div>`;
      p.innerHTML = sw(HAIR_COLORS, 'hairColor', 'Hair Color') + sw(SKIN_TONES, 'skinTone', 'Skin Tone') + sw(EYE_COLORS, 'eyeColor', 'Eye Color')
        + (imagegen.isConfigured()
          ? `<button class="btn btn-ghost mt16" data-gen>${icon('sparkle')} Render this look</button>${work.lookImage ? '<button class="link-btn mt8" data-reset-look>Use the original photo again</button>' : ''}
             <p class="small muted mt8">Renders a new photo of ${esc(char.name)} with the same face, using your image service.</p>`
          : `<p class="notice mt16"><b>Preferences only.</b> Hair colour shows as a preview tint; skin and eye colour are saved but the photos don't change. Re-rendering ${esc(char.name)}'s photos needs an image service (see README → Image service).</p>`);
    } else if (tab === 'personality') {
      p.innerHTML = `<div class="opt-grid">${personalityGrid(char, work.personality)}</div>`;
    } else if (tab === 'voice') {
      p.innerHTML = `<div class="list">${voiceList(work.voice)}</div>`;
    } else {
      p.innerHTML = `${Seg([{ id: 'apartment', label: 'Apartment' }, { id: 'room', label: 'Room' }, { id: 'decor', label: 'Decor' }], roomSub, { cls: 'sm', name: 'sub' })}${homePanel(char, work.home, roomSub)}`;
    }
  };
  paint();

  el.addEventListener('click', (e) => {
    const t = e.target.closest('[data-tab]'); if (t) { tab = t.dataset.tab; paint(); return; }
    const sub = e.target.closest('[data-sub]'); if (sub) { roomSub = sub.dataset.sub; paint(); return; }
    const o = e.target.closest('[data-outfit]:not(.tile-col)'); if (o && tab === 'outfit') { work.outfit = o.dataset.outfit; work.lookImage = null; mark(); paint(); return; }
    const sw = e.target.closest('.swatch'); if (sw) { work.appearance[sw.parentElement.dataset.group] = +sw.dataset.i; mark(); paint(); return; }
    const pp = e.target.closest('[data-p]'); if (pp) { const n = toggleTrait(work.personality, pp.dataset.p); if (n) { work.personality = n; mark(); paint(); } return; }
    const v = e.target.closest('[data-v]'); if (v) { work.voice = v.dataset.v; mark(); paint(); voice.speak(`Hey, it's ${char.name}.`, { voiceId: work.voice, gender: char.gender }); }
  });
  bindHome(el, (fn) => { if (tab === 'room') { fn(work.home); mark(); } }, paint);

  el.addEventListener('click', async (e) => {
    if (e.target.closest('[data-reset-look]')) { work.lookImage = null; mark(); paint(); return; }
    const g = e.target.closest('[data-gen]'); if (!g) return;
    g.disabled = true; g.textContent = 'Rendering…';
    try {
      work.lookImage = await imagegen.renderLook({ characterId: char.id, referenceImage: outfitImg(), appearance: work.appearance, outfit: work.outfit });
      mark(); paint(); toast('New look rendered. Save to keep it.');
    } catch (err) { toast(err.message); g.disabled = false; g.innerHTML = `${icon('sparkle')} Render this look`; }
  });
  $('[data-save]').onclick = () => {
    ctx.store.update((s) => { const c = s.companions[char.id]; Object.assign(c, { outfit: work.outfit, appearance: work.appearance, personality: work.personality, voice: work.voice, home: work.home, lookImage: work.lookImage || null }); }, { silent: true });
    dirty = false; $('[data-save]').disabled = true;
    toast(`${char.name} updated. Chat history kept.`);
  };
  el._cleanup = () => voice.stop();
  return el;
}
