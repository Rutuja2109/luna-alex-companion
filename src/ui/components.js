import { icon } from './icons.js';

export const esc = (s = '') => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
export const nl2br = (s = '') => esc(s).replace(/\n/g, '<br>');

/** Build an element from an HTML string. */
export function h(html) {
  const t = document.createElement('template');
  t.innerHTML = html.trim();
  return t.content.firstElementChild;
}

export function screen(cls = '') {
  return h(`<section class="screen ${cls}"></section>`);
}

/** Standard header: back button, centered title, optional right slot. */
export function Header({ title, sub = '', back = true, right = '', left = false } = {}) {
  return `<header class="hdr ${left ? 'left' : ''}">
    ${back ? `<button class="icon-btn" data-act="back" aria-label="Back">${icon('back')}</button>` : '<span></span>'}
    <div><h1>${title}</h1>${sub ? `<p class="sub">${sub}</p>` : ''}</div>
    ${right || '<span></span>'}
  </header>`;
}

export function Seg(items, active, { cls = '', name = 'tab' } = {}) {
  return `<div class="seg ${cls}" role="tablist">${items
    .map((it) => `<button role="tab" data-${name}="${it.id}" aria-selected="${it.id === active}">${esc(it.label)}</button>`)
    .join('')}</div>`;
}

export function BottomNav(active) {
  const items = [
    ['home', 'Home', 'home'], ['chat', 'Chat', 'chat'], ['activities', 'Explore', 'star'],
    ['memories', 'Memories', 'heart'], ['settings', 'Profile', 'user'],
  ];
  return `<nav class="nav" aria-label="Main">${items
    .map(([id, label, ic]) => `<button data-nav="${id}" ${id === active ? 'aria-current="page"' : ''}>${icon(ic)}<span>${label}</span></button>`)
    .join('')}</nav>`;
}

export function toast(msg, ms = 2600) {
  const root = document.getElementById('toast-root');
  const el = h(`<div class="toast" role="status">${esc(msg)}</div>`);
  root.appendChild(el);
  setTimeout(() => el.remove(), ms);
}

/** Bottom sheet. `build(sheetEl, close)` fills it. Returns close(). */
export function sheet(build) {
  const root = document.getElementById('sheet-root');
  const back = h('<div class="sheet-back"><div class="sheet" role="dialog" aria-modal="true"><div class="grab"></div><div class="sheet-content"></div></div></div>');
  const close = () => { back.remove(); document.removeEventListener('keydown', onKey); };
  const onKey = (e) => { if (e.key === 'Escape') close(); };
  back.addEventListener('click', (e) => { if (e.target === back) close(); });
  document.addEventListener('keydown', onKey);
  root.appendChild(back);
  build(back.querySelector('.sheet-content'), close);
  const f = back.querySelector('input, textarea, button');
  f?.focus({ preventScroll: true });
  return close;
}

/** In-page confirmation (native confirm() is unavailable in the viewer). */
export function confirmSheet({ title, body, ok = 'Confirm', danger = false }) {
  return new Promise((resolve) => {
    let done = false;
    const close = sheet((el, c) => {
      el.innerHTML = `<h2>${esc(title)}</h2><p>${esc(body)}</p>
        <div class="btn-stack"><button class="btn ${danger ? 'btn-danger' : 'btn-primary'}" data-ok>${esc(ok)}</button>
        <button class="btn btn-ghost" data-cancel>Cancel</button></div>`;
      el.querySelector('[data-ok]').onclick = () => { done = true; c(); resolve(true); };
      el.querySelector('[data-cancel]').onclick = () => { done = true; c(); resolve(false); };
    });
    const obs = new MutationObserver(() => { if (!document.contains(document.querySelector('.sheet-back')) && !done) { done = true; resolve(false); obs.disconnect(); } });
    obs.observe(document.getElementById('sheet-root'), { childList: true });
    return close;
  });
}

export function timeLabel(ts) {
  return new Date(ts).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
}
export function ago(ts, now = Date.now() + (window.__clockOffset || 0)) {
  const m = Math.max(0, Math.round((now - ts) / 60000));
  if (m < 1) return 'just now';
  if (m < 60) return `${m} min ago`;
  const hr = Math.round(m / 60);
  return hr < 24 ? `${hr} h ago` : `${Math.round(hr / 24)} d ago`;
}

/** Downscale an uploaded image to a JPEG data URL. */
export function fileToDataUrl(file, max = 900, q = 0.8) {
  return new Promise((resolve, reject) => {
    if (!file || !file.type.startsWith('image/')) { reject(new Error('Choose an image file (JPG, PNG or WebP).')); return; }
    const r = new FileReader();
    r.onerror = () => reject(new Error('That file could not be read.'));
    r.onload = () => {
      const img = new Image();
      img.onerror = () => reject(new Error('That image could not be opened.'));
      img.onload = () => {
        const s = Math.min(1, max / Math.max(img.width, img.height));
        const c = document.createElement('canvas');
        c.width = Math.round(img.width * s); c.height = Math.round(img.height * s);
        c.getContext('2d').drawImage(img, 0, 0, c.width, c.height);
        resolve(c.toDataURL('image/jpeg', q));
      };
      img.src = r.result;
    };
    r.readAsDataURL(file);
  });
}

/** Deterministic waveform bars for a voice clip. */
export function waveBars(seed = 'x', n = 34) {
  let h0 = 0; for (const ch of String(seed)) h0 = (h0 * 31 + ch.charCodeAt(0)) >>> 0;
  const bars = [];
  for (let i = 0; i < n; i++) {
    h0 = (h0 * 1103515245 + 12345) >>> 0;
    const env = Math.sin((i / (n - 1)) * Math.PI) * 0.7 + 0.3;
    bars.push(Math.round((0.25 + ((h0 >>> 16) % 100) / 100 * 0.75) * env * 100));
  }
  return `<span class="wave" aria-hidden="true">${bars.map((v) => `<i style="height:${v}%"></i>`).join('')}</span>`;
}

/** Animate a waveform's "played" bars over `secs` seconds. Returns stop(). */
export function animateWave(waveEl, secs) {
  const bars = [...waveEl.querySelectorAll('i')];
  const t0 = performance.now();
  let raf;
  const tick = (t) => {
    const p = Math.min(1, (t - t0) / (secs * 1000));
    bars.forEach((b, i) => b.classList.toggle('on', i / bars.length <= p));
    if (p < 1) raf = requestAnimationFrame(tick);
  };
  raf = requestAnimationFrame(tick);
  return () => { cancelAnimationFrame(raf); bars.forEach((b) => b.classList.remove('on')); };
}
