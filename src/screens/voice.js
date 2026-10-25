// Screen 8 — Choose Voice (reference: board-b #8)
import { h, Header, waveBars, animateWave, toast } from '../ui/components.js';
import { icon } from '../ui/icons.js';
import { CHARACTERS, VOICES } from '../data/characters.js';
import { draftConfig, setDraft } from '../state/actions.js';
import * as voice from '../services/voice.js';

export function voiceList(selected) {
  return VOICES.map((v) => `<button class="opt voice-opt" role="radio" data-v="${v.id}" aria-checked="${v.id === selected}">
    <span class="radio ring"></span>
    <span class="grow"><span class="t">${v.label}</span><span class="d" style="display:block">${v.desc}</span></span>
    ${v.id === selected ? `<span class="tick">${icon('check')}</span>` : ''}
  </button>`).join('');
}

export function render(ctx) {
  const c = CHARACTERS[ctx.s.draft.characterId] || CHARACTERS.luna;
  const sample = `Hi, I'm ${c.name}. I'm really happy you're here.`;
  let stopWave = null;
  const el = h(`<section class="screen">
    ${Header({ title: 'Choose Voice' })}
    <div class="screen-body">
      <div class="photo-card voice-photo">
        <img src="${c.hero}" alt="${c.name}">
        <div class="player">
          <button class="play-lg" data-play aria-label="Play voice sample">${icon('play')}</button>
          ${waveBars(c.id + 'sample', 40)}
        </div>
      </div>
      <div class="list mt12" role="radiogroup" aria-label="Voice" data-list></div>
      ${voice.available() ? '' : '<p class="notice mt12"><b>No speech engine.</b> This browser can\'t play voice samples; your choice is still saved.</p>'}
    </div>
    <div class="screen-foot"><button class="btn btn-primary" data-next>Continue</button></div>
  </section>`);
  const paint = () => { el.querySelector('[data-list]').innerHTML = voiceList(draftConfig().voice); };
  paint();
  const play = () => {
    stopWave?.(); voice.stop();
    if (!voice.available()) { toast('Voice playback isn\'t supported in this browser.'); return; }
    const wave = el.querySelector('.player .wave');
    const btn = el.querySelector('[data-play]');
    btn.innerHTML = icon('pause');
    stopWave = animateWave(wave, voice.estimateSeconds(sample));
    voice.speak(sample, { voiceId: draftConfig().voice, gender: c.gender, onend: () => { btn.innerHTML = icon('play'); stopWave?.(); } });
  };
  el.querySelector('[data-play]').onclick = play;
  el.addEventListener('click', (e) => {
    const v = e.target.closest('[data-v]');
    if (v) { setDraft((cf) => { cf.voice = v.dataset.v; }); paint(); play(); }
  });
  el.querySelector('[data-next]').onclick = () => { voice.stop(); ctx.go('homestyle'); };
  el._cleanup = () => { voice.stop(); stopWave?.(); };
  return el;
}
