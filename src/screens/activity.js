// Screen 18 — Individual activity scene (coffee, movie, cook, read, hang out, relax)
import { h, esc, toast, confirmSheet, Header } from '../ui/components.js';
import { icon } from '../ui/icons.js';
import { ACTIVITIES } from '../data/activities.js';
import { addMessage } from '../state/actions.js';
import * as ai from '../services/ai.js';

export function render(ctx) {
  const { char, cfg } = ctx;
  const a = ACTIVITIES.find((x) => x.id === ctx.params.id) || ACTIVITIES[1];
  const t0 = Date.now();
  let busy = false;
  const el = h(`<section class="screen activity">
    <div class="act-ambient"><img src="${char.scenes[a.scene] || char.hero}" alt="" aria-hidden="true"></div>
    ${Header({ title: esc(a.label), sub: '<span class="st-state center-st"><span class="dot-on"></span><span data-t>Together · 0 min</span></span>' })}
    <div class="screen-body act-body">
      <div class="photo-card act-photo"><img src="${char.scenes[a.scene] || char.hero}" alt="${char.name}: ${a.label}" class="breathe"><span class="live-badge"><i></i>TOGETHER</span></div>
      <div class="act-feed" data-feed aria-live="polite"></div>
    </div>
    <div class="act-bottom screen-foot">
      <div class="pills act-prompts" data-prompts></div>
      <form class="talk static" data-talk>
        <label class="sr" for="say">Message ${char.name}</label>
        <input id="say" class="input" placeholder="Say something…" autocomplete="off" maxlength="300">
        <button class="icon-btn mic" type="submit" aria-label="Send">${icon('send')}</button>
      </form>
      <button class="btn btn-ghost btn-sm" data-leave>Leave activity</button>
    </div>
  </section>`);
  const $ = (s) => el.querySelector(s);
  const line = (who, text) => {
    $('[data-feed]').insertAdjacentHTML('beforeend', `<div class="caption ${who}">${who === 'them' ? `<b>${esc(char.name)}</b>` : '<b>You</b>'}${esc(text)}</div>`);
    const f = $('[data-feed]'); while (f.children.length > 3) f.firstElementChild.remove();
  };
  const prompts = (list) => { $('[data-prompts]').innerHTML = (list || []).map((p) => `<button class="pill" data-p="${esc(p)}">${esc(p)}</button>`).join(''); };

  async function userSaid(text) {
    const t = text.trim(); if (!t || busy) return;
    busy = true; prompts([]); line('me', t);
    addMessage(char.id, { from: 'me', type: 'text', text: t, read: true });
    try {
      const history = [...ctx.store.get().chats[char.id]];
      history.splice(-1, 0, { from: 'me', type: 'text', text: `(we're doing an activity together: ${a.label.toLowerCase()})` });
      const { parts } = await ai.reply({ char, cfg, history, memories: ctx.store.get().memories });
      parts.forEach((p) => { line('them', p); addMessage(char.id, { from: 'them', type: 'text', text: p }); });
    } catch { toast(`${char.name} didn't catch that. Try again.`); }
    busy = false;
  }

  setTimeout(() => { line('them', a.opener || 'hey you, glad you’re here'); prompts(a.prompts); }, 600);
  addMessage(char.id, { from: 'system', type: 'activity', text: `Started: ${a.label}` });
  const timer = setInterval(() => { $('[data-t]').textContent = `Together · ${Math.floor((Date.now() - t0) / 60000)} min`; }, 15000);

  el.addEventListener('click', (e) => { const p = e.target.closest('[data-p]'); if (p) userSaid(p.dataset.p); });
  $('[data-talk]').addEventListener('submit', (e) => { e.preventDefault(); userSaid($('#say').value); $('#say').value = ''; });
  $('[data-leave]').onclick = async () => {
    if (await confirmSheet({ title: `Leave ${a.label.toLowerCase()}?`, body: `${char.name} will go back to ${char.pronoun.pos} routine. Anything you said stays in your chat.`, ok: 'Leave' })) {
      const mins = Math.max(1, Math.round((Date.now() - t0) / 60000));
      addMessage(char.id, { from: 'system', type: 'activity', text: `${a.label} · ${mins} min` });
      ctx.back('activities');
    }
  };
  el._cleanup = () => clearInterval(timer);
  return el;
}
