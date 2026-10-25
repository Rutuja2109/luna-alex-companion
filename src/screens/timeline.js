// Screen 19 — Daily Timeline (reference: board-c #15, board-a #19)
// Derived entirely from the routine engine: nothing is invented per visit.
import { h, Header, Seg, esc, timeLabel } from '../ui/components.js';
import * as routine from '../engine/routine.js';

export function render(ctx) {
  const { char, cfg } = ctx;
  let tab = 'today';
  const now = routine.clock.now();
  import('../state/actions.js').then((a) => a.snapshotDay(now));
  const date = new Date(now).toLocaleDateString([], { weekday: 'short', day: 'numeric', month: 'short' });
  const el = h(`<section class="screen">
    ${Header({ title: `${char.name}'s Day`, sub: date })}
    <div class="screen-body">
      <div data-tabs></div>
      <div data-body></div>
      <p class="xs muted center mt12">${esc(char.name)}'s day is a simulated routine, not real events · 💜 marks time you spent together · updated ${timeLabel(now)}</p>
    </div>
  </section>`);
  const paint = () => {
    el.querySelector('[data-tabs]').innerHTML = Seg([{ id: 'today', label: 'Today' }, { id: 'week', label: 'This Week' }], tab, { cls: 'sm', name: 't' });
    const body = el.querySelector('[data-body]');
    if (tab === 'today') {
      const list = routine.today(char, cfg, now);
      body.innerHTML = `<div class="tl"><span class="tl-line"></span>${list.map((e) => `<button class="tl-item ${e.status} ${e.shared ? 'shared' : ''}" data-a="${e.shared ? '' : e.activity || ''}" ${e.status === 'now' && e.joinable ? '' : 'tabindex="-1"'}>
          <span class="tl-dot"></span><span class="tl-time">${timeLabel(e.start)}</span>
          <span class="tl-title">${esc(e.short || e.label)}${e.status === 'now' ? '<span class="badge-now">NOW</span>' : ''}${e.shared ? `<span class="badge-you">with you · ${e.minutes} min</span>` : ''}</span>
          <span class="thumb"><img src="${e.img}" alt="" loading="lazy"></span></button>`).join('')}</div>`;
    } else {
      const days = routine.week(char, cfg, now);
      body.innerHTML = days.map((d, i) => `<div class="week-day"><div class="wd-h"><b>${i === 0 ? 'Today' : d.date.toLocaleDateString([], { weekday: 'long' })}</b><span class="small muted">${d.items.length} activities${d.sharedCount ? ` · ${d.sharedCount} with you` : ''}</span></div>
        <div class="scroll-x">${d.items.map((e) => `<div class="wd-item"><span class="thumb"><img src="${e.img}" alt="" loading="lazy"></span><span class="xs muted">${timeLabel(e.start)}</span><span class="small">${esc(e.short || e.label)}${e.shared ? ' 💜' : ''}</span></div>`).join('') || '<span class="small muted">Nothing yet today</span>'}</div></div>`).join('');
    }
  };
  paint();
  el.addEventListener('click', (e) => {
    const t = e.target.closest('[data-t]'); if (t) { tab = t.dataset.t; paint(); return; }
    const it = e.target.closest('.tl-item.now');
    if (it && it.dataset.a) ctx.go(['study', 'work'].includes(it.dataset.a) ? 'study' : 'activity', { id: it.dataset.a });
  });
  return el;
}
