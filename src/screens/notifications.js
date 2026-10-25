// Screen 24 — Notifications (optional; brief screen 22)
// Honest scope: preferences are saved, and in-app alerts appear while the app
// is open. The app never claims the companion messaged you outside the app.
import { h, Header, toast } from '../ui/components.js';

export function render(ctx) {
  const { char } = ctx;
  const el = h(`<section class="screen">
    ${Header({ title: 'Notifications' })}
    <div class="screen-body"><div class="list" data-list></div>
      <p class="notice mt16"><b>In-app only.</b> Alerts show while the app is open. Push notifications to your phone aren't available in this version.</p>
    </div>
  </section>`);
  const paint = () => {
    const n = ctx.store.get().settings.notifications;
    const t = (k, label, desc) => `<button class="list-row" data-k="${k}"><span class="grow"><span class="label">${label}</span><br><span class="small muted">${desc}</span></span><span class="toggle" role="switch" aria-checked="${!!n[k]}"></span></button>`;
    el.querySelector('[data-list]').innerHTML = `
      ${t('activity', `When ${char.name}'s activity changes`, `e.g. “${char.name} started cooking”. From the simulated routine.`)}
      ${t('reminders', 'Study reminders', 'Only reminders you schedule yourself')}
      ${t('quiet', 'Quiet hours', 'No alerts during these hours')}
      <div class="list-row" ${n.quiet ? '' : 'hidden'}><span class="grow row" style="gap:10px">
        <label class="small muted" for="qs">From</label><input id="qs" type="time" class="input" style="width:auto;height:38px" value="${n.quietStart}" data-t="quietStart">
        <label class="small muted" for="qe">to</label><input id="qe" type="time" class="input" style="width:auto;height:38px" value="${n.quietEnd}" data-t="quietEnd"></span></div>`;
  };
  paint();
  el.addEventListener('click', (e) => {
    const k = e.target.closest('[data-k]')?.dataset.k; if (!k) return;
    ctx.store.update((s) => { s.settings.notifications[k] = !s.settings.notifications[k]; }, { silent: true });
    paint();
    if (k === 'activity' && ctx.store.get().settings.notifications.activity) toast(`You'll see an alert here when ${char.name}'s activity changes.`);
  });
  el.addEventListener('change', (e) => {
    const k = e.target.dataset.t; if (!k) return;
    ctx.store.update((s) => { s.settings.notifications[k] = e.target.value; }, { silent: true });
  });
  return el;
}
