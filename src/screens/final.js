// Screen 10 — Final Preview (reference: board-c #8, board-b #10)
import { h, Header, nl2br, esc } from '../ui/components.js';
import { CHARACTERS, PERSONALITIES, VOICES, HOME_STYLES } from '../data/characters.js';
import { draftConfig, createCompanion } from '../state/actions.js';

export function render(ctx) {
  const c = CHARACTERS[ctx.s.draft.characterId] || CHARACTERS.luna;
  const cf = draftConfig();
  const outfit = c.outfits.find((o) => o.id === cf.outfit) || c.outfits[0];
  const traits = cf.personality.map((p) => PERSONALITIES.find((x) => x.id === p)?.label).join(' · ');
  const voice = VOICES.find((v) => v.id === cf.voice);
  const home = HOME_STYLES.find((s) => s.id === cf.home.style);
  const el = h(`<section class="screen">
    ${Header({ title: `Preview ${c.name}`, back: true, left: true })}
    <div class="screen-body">
      <div class="photo-card final-photo">
        <img src="${outfit.img === c.hero && c.id === 'luna' ? c.preview : outfit.img}" alt="${c.name} with your chosen look">
        <div class="card intro">${nl2br(c.intro).replace('💜', '<span class="heart-v">💜</span>')}</div>
      </div>
      <div class="field mt12"><label for="uname">What should ${c.name} call you? <span class="muted">(optional)</span></label>
        <input id="uname" class="input" maxlength="30" autocomplete="given-name" placeholder="Your first name or nickname" value="${esc(ctx.store.get().settings.userName || '')}"></div>
      <div class="summary">
        <button class="sum" data-edit="outfits"><span class="k">Look</span><span class="v">${esc(outfit.label)}</span></button>
        <button class="sum" data-edit="personality"><span class="k">Personality</span><span class="v">${esc(traits)}</span></button>
        <button class="sum" data-edit="voice"><span class="k">Voice</span><span class="v">${esc(voice.desc)}</span></button>
        <button class="sum" data-edit="homestyle"><span class="k">Home</span><span class="v">${esc(home.label)} apartment</span></button>
      </div>
    </div>
    <div class="screen-foot btn-stack">
      <button class="btn btn-primary" data-start>Start Your Journey</button>
      <button class="btn btn-ghost" data-more>Customize More</button>
    </div>
  </section>`);
  el.addEventListener('click', (e) => {
    const ed = e.target.closest('[data-edit]');
    if (ed) ctx.go(ed.dataset.edit);
  });
  el.querySelector('[data-more]').onclick = () => ctx.go('appearance');
  el.querySelector('#uname').addEventListener('input', (e) => ctx.store.update((st) => { st.settings.userName = e.target.value.trim(); }, { silent: true }));
  el.querySelector('[data-start]').onclick = () => { createCompanion(); ctx.go('home', {}, { reset: true }); };
  return el;
}
