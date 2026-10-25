// Small UI helpers for the clone (shared look comes from css/tokens.css).
export { icon } from '../src/ui/icons.js';

export const esc = (s = '') => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
export const nl2br = (s = '') => esc(s).replace(/\n/g, '<br>');
export function h(html) { const t = document.createElement('template'); t.innerHTML = html.trim(); return t.content.firstElementChild; }

export function toast(msg, ms = 2600) {
  const root = document.getElementById('toast-root');
  const el = h(`<div class="toast" role="status">${esc(msg)}</div>`);
  root.appendChild(el);
  setTimeout(() => el.remove(), ms);
}

/** Bottom sheet; build(el, close). Returns close. */
export function sheet(build, { cls = '' } = {}) {
  const root = document.getElementById('sheet-root');
  const wrap = h(`<div class="sheet-wrap"><div class="sheet-scrim" data-close></div><div class="sheet ${cls}" role="dialog" aria-modal="true"><div class="sheet-grip"></div><div class="sheet-body"></div></div></div>`);
  const close = () => { wrap.remove(); };
  wrap.querySelector('[data-close]').onclick = close;
  root.appendChild(wrap);
  build(wrap.querySelector('.sheet-body'), close);
  return close;
}

export function confirm({ title, body, ok = 'OK', danger = false }) {
  return new Promise((res) => {
    sheet((s, close) => {
      s.innerHTML = `<h2>${esc(title)}</h2><p class="muted">${esc(body)}</p><div class="stack"><button class="btn ${danger ? 'danger' : 'primary'}" data-ok>${esc(ok)}</button><button class="btn ghost" data-no>Cancel</button></div>`;
      s.querySelector('[data-ok]').onclick = () => { close(); res(true); };
      s.querySelector('[data-no]').onclick = () => { close(); res(false); };
    });
  });
}

export const time = (ts) => new Date(ts).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
export function dayLabel(key, todayKey) {
  const [y, m, d] = key.split('-').map(Number);
  const dt = new Date(y, m - 1, d);
  const t = todayKey.split('-').map(Number);
  const diff = Math.round((new Date(t[0], t[1] - 1, t[2]) - dt) / 864e5);
  const date = dt.toLocaleDateString([], { weekday: 'short', day: 'numeric', month: 'short' });
  return diff === 0 ? `Today · ${date}` : diff === 1 ? `Yesterday · ${date}` : date;
}

/** Header bar with a back button, a title and an optional right slot. */
export const Top = (title, right = '') => `<header class="top"><button class="ib" data-back aria-label="Back">${icon2('back')}</button><h1>${esc(title)}</h1><div class="top-r">${right}</div></header>`;
import { icon as icon2 } from '../src/ui/icons.js';
