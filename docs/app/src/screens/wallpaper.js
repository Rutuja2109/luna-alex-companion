// Screen 14 — Chat Wallpaper (reference: board-c #17, board-a #15)
import { h, Header, Seg, esc, toast, fileToDataUrl } from '../ui/components.js';
import { icon } from '../ui/icons.js';
import { CHARACTERS } from '../data/characters.js';

const STARS = 'radial-gradient(1px 1px at 20% 30%, #fff 50%, transparent), radial-gradient(1px 1px at 70% 20%, #fff 50%, transparent), radial-gradient(1.5px 1.5px at 40% 70%, #dfe4ff 50%, transparent), radial-gradient(1px 1px at 85% 60%, #fff 50%, transparent), radial-gradient(1px 1px at 10% 85%, #cfd6ff 50%, transparent), radial-gradient(1.2px 1.2px at 55% 45%, #fff 50%, transparent)';

export const WALLPAPERS = [
  { id: 'none', label: 'None', cat: 'featured', css: 'background:#070a14' },
  { id: 'default', label: 'Midnight', cat: 'minimal', css: 'background:radial-gradient(120% 70% at 50% 0%, #161b38 0%, #070a14 70%)' },
  { id: 'sunset', label: 'Sunset', cat: 'featured', css: 'background:linear-gradient(180deg,#2b1b4d 0%,#8e3b63 45%,#e2774f 75%,#f4b26b 100%)' },
  { id: 'city', label: 'City', cat: 'featured', css: `background:${STARS}, linear-gradient(180deg,#0b1030 0%,#272b6a 55%,#b4507a 85%,#e8875f 100%)` },
  { id: 'stars', label: 'Stars', cat: 'featured', css: `background:${STARS}, radial-gradient(80% 60% at 30% 30%, #2a3a8a 0%, #0b1030 60%, #050712 100%)` },
  { id: 'nature', label: 'Nature', cat: 'aesthetic', img: 'assets/wallpapers/nature.jpg' },
  { id: 'coffee', label: 'Coffee', cat: 'aesthetic', img: 'assets/wallpapers/coffee.jpg' },
  { id: 'art', label: 'Art', cat: 'aesthetic', css: 'background:conic-gradient(from 200deg at 50% 60%,#e4574e,#b23a55,#6e2a5a,#e4574e)' },
  { id: 'gradient', label: 'Gradient', cat: 'minimal', css: 'background:linear-gradient(160deg,#5b3bd8 0%,#9b48d6 50%,#d062b8 100%)' },
  { id: 'plain', label: 'Slate', cat: 'minimal', css: 'background:#12172a' },
];
const CATS = [{ id: 'featured', label: 'Featured' }, { id: 'aesthetic', label: 'Aesthetic' }, { id: 'minimal', label: 'Minimal' }, { id: 'personal', label: 'Personal' }];

function find(state, id) {
  return WALLPAPERS.find((w) => w.id === id) || state.customWallpapers.find((w) => w.id === id) || WALLPAPERS[1];
}
function bgCss(w) { return w.img ? `background-image:url("${w.img}");background-size:cover;background-position:center` : w.css; }

/** CSS for the chat background. Darkening keeps message text readable. */
export function wallpaperCss(state, cfg, override) {
  const id = override || cfg?.wallpaper || state.settings.defaultWallpaper || 'none';
  const w = find(state, id);
  const bright = !['none', 'default', 'plain', 'stars'].includes(w.id);
  const dim = state.settings.wallDim ?? 55;
  return `${bgCss(w)};--wall-dim:rgba(6,9,18,${bright ? dim / 100 : 0.15})`;
}

export function render(ctx) {
  const cid = ctx.params.cid || ctx.char.id;
  const char = CHARACTERS[cid];
  let cat = 'featured';
  const st0 = ctx.store.get();
  let selected = st0.companions[cid]?.wallpaper || st0.settings.defaultWallpaper || 'none';
  let scope = 'this';

  const el = h(`<section class="screen">
    ${Header({ title: 'Chat Wallpaper' })}
    <div class="screen-body">
      <div data-cats></div>
      <div class="grid4 wall-grid" data-grid></div>
      <h2 class="section-title">Preview</h2>
      <div class="wall-preview" data-prev>
        <div class="msg them"><div class="bubble">heyy you're back!</div></div>
        <div class="msg me"><div class="bubble">finally done with work 😩</div></div>
        <div class="msg them"><div class="bubble">ugh that bad? 😣</div></div>
      </div>
      <div class="field mt12"><label for="dim">Darken for readability · <span data-dv></span>%</label><input id="dim" type="range" min="25" max="80" data-dim></div>
      <div class="seg sm" role="radiogroup" aria-label="Apply to">
        <button role="radio" data-scope="this" aria-checked="true" aria-selected="true">Chat with ${esc(char.name)}</button>
        <button role="radio" data-scope="all" aria-selected="false">All chats (default)</button>
      </div>
    </div>
    <div class="screen-foot"><button class="btn btn-primary" data-apply>Apply Wallpaper</button></div>
  </section>`);

  const paint = () => {
    const st = ctx.store.get();
    el.querySelector('[data-cats]').innerHTML = Seg(CATS, cat, { cls: 'sm', name: 'cat' });
    const list = cat === 'personal' ? st.customWallpapers : WALLPAPERS.filter((w) => w.cat === cat || (cat === 'featured' && ['nature', 'coffee', 'art', 'gradient'].includes(w.id)));
    el.querySelector('[data-grid]').innerHTML = list.map((w) => `<button class="tile-col ${w.id === selected ? 'selected' : ''}" data-w="${w.id}" aria-pressed="${w.id === selected}">
        <span class="tile wall-th" style='${bgCss(w)}'>${w.id === 'none' ? `<span class="none-ic">${icon('noneCircle')}</span>` : ''}</span><span class="tile-label">${esc(w.label)}</span></button>`).join('')
      + (cat === 'personal' ? `<label class="tile-col upload-wall"><span class="tile wall-th add">${icon('upload')}</span><span class="tile-label">Upload</span><input type="file" accept="image/*" class="hidden-file" data-up></label>` : '');
    if (cat === 'personal' && !st.customWallpapers.length) el.querySelector('[data-grid]').insertAdjacentHTML('afterbegin', '<p class="small muted wall-empty">Upload your own photo. It stays on this device.</p>');
    const dim = st.settings.wallDim ?? 55;
    el.querySelector('[data-dim]').value = dim; el.querySelector('[data-dv]').textContent = dim;
    el.querySelector('[data-prev]').style.cssText = wallpaperCss(st, null, selected);
    el.querySelectorAll('[data-scope]').forEach((b) => { b.setAttribute('aria-selected', b.dataset.scope === scope); b.setAttribute('aria-checked', b.dataset.scope === scope); });
    const up = el.querySelector('[data-up]');
    if (up) up.onchange = async (e) => {
      try {
        const url = await fileToDataUrl(e.target.files[0], 1000, 0.75);
        const id = 'u' + Date.now().toString(36);
        ctx.store.update((s) => { s.customWallpapers.push({ id, label: 'My photo', cat: 'personal', img: url }); }, { silent: true });
        selected = id; paint();
      } catch (err) { toast(err.message); }
    };
  };
  paint();

  el.addEventListener('click', (e) => {
    const c = e.target.closest('[data-cat]'); if (c) { cat = c.dataset.cat; paint(); return; }
    const w = e.target.closest('[data-w]'); if (w) { selected = w.dataset.w; paint(); return; }
    const sc = e.target.closest('[data-scope]'); if (sc) { scope = sc.dataset.scope; paint(); }
  });
  el.querySelector('[data-dim]').addEventListener('input', (e) => {
    ctx.store.update((s) => { s.settings.wallDim = +e.target.value; }, { silent: true }); paint();
  });
  el.querySelector('[data-apply]').onclick = () => {
    ctx.store.update((s) => {
      if (scope === 'all') { s.settings.defaultWallpaper = selected; Object.values(s.companions).forEach((c) => { c.wallpaper = null; }); }
      else if (s.companions[cid]) s.companions[cid].wallpaper = selected;
    }, { silent: true });
    toast('Wallpaper applied');
    ctx.back('chat');
  };
  return el;
}
