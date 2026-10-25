import { HOME_STYLES } from './art.js';
import { sheet, esc } from './ui.js';
import * as S from './state.js';

export function heroImg(char) {
  const o = char.outfits.find((x) => x.id === S.get().comp.outfit);
  return o ? o.img : char.hero;
}
export function roomBg() {
  const st = S.get().comp.room;
  return (HOME_STYLES.find((x) => x.id === st) || HOME_STYLES[0]).img;
}
export function cfgFor(s) {
  return { id: s.cid, personality: s.comp.traits, commStyle: 'balanced', voice: s.comp.voice, outfit: s.comp.outfit, home: { style: s.comp.room, room: 'study', decor: s.comp.decor, lighting: 70 } };
}
// Decor drawn over the room (CSS only; the photo is not re-rendered).
export function decorHtml(decor = []) {
  const on = (id) => decor.includes(id);
  const leaf = '<svg viewBox="0 0 60 80" aria-hidden="true"><path d="M30 80 C28 50 10 40 4 20 C18 26 26 36 30 52 C32 30 40 14 56 6 C52 30 40 44 32 80Z" fill="#2f6b3a"/></svg>';
  return `<div class="decor" aria-hidden="true">
    ${on('warm') ? '<span class="d-warm"></span>' : ''}${on('fairy') ? '<span class="d-fairy"></span>' : ''}
    ${on('candles') ? '<span class="d-candles"></span>' : ''}${on('neon') ? '<span class="d-neon"></span>' : ''}
    ${on('rain') ? '<span class="d-rain"></span>' : ''}${on('stars') ? '<span class="d-stars"></span>' : ''}
    ${on('plants') ? `<span class="d-plant l">${leaf}</span><span class="d-plant r">${leaf}</span>` : ''}</div>`;
}
export function celebrate(char, lu) {
  sheet((s, close) => {
    s.innerHTML = `<div class="lvup"><div class="lvup-n">${lu.to}</div><h2>Level ${lu.to}!</h2>
      <p class="muted">You and ${esc(char.name)} are getting closer. Levels never go back down, whatever changes in the app.</p>
      <p class="reward">+${lu.coins} 🪙${lu.gems ? ` · +${lu.gems} 💎` : ''}</p>
      <button class="btn primary" data-ok>Nice</button></div>`;
    s.querySelector('[data-ok]').onclick = close;
  }, { cls: 'center' });
}
