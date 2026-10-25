// Screen 11 — Home (reference: board-c #9, board-b #11 Luna / #12 Alex)
import { h, BottomNav, nl2br, ago, esc } from '../ui/components.js';
import { icon } from '../ui/icons.js';
import * as routine from '../engine/routine.js';

export function statusOf(act) {
  return act.id === 'bed' ? { cls: 'idle', text: 'Resting' } : { cls: '', text: 'Online' };
}
export function heroFor(char, cfg) {
  if (cfg?.lookImage) return cfg.lookImage; // rendered by the image service
  const o = char.outfits.find((x) => x.id === cfg?.outfit);
  return o ? o.img : char.hero;
}

export function render(ctx) {
  const { char, cfg } = ctx;
  if (!cfg) { setTimeout(() => ctx.go('welcome', {}, { reset: true })); return h('<section class="screen"></section>'); }
  const el = h(`<section class="screen home">
    <div class="hero home-hero">
      <img src="${heroFor(char, cfg)}" alt="" class="bg-blur" aria-hidden="true"><img src="${heroFor(char, cfg)}" alt="${char.name}" class="ken fg">
      <div class="fade"></div>
      <div class="home-id">
        <span class="avatar lg"><img src="${char.avatar}" alt=""></span>
        <div><div class="name">${char.name}</div><div class="status" data-status></div></div>
      </div>
      <h1 class="home-greet">Good to see you <span aria-hidden="true">💜</span></h1>
    </div>
    <div class="screen-body home-body">
      <button class="card row greet-card" data-go="chat">
        <span class="thumb"><img src="${char.scenes.hangout}" alt=""></span>
        <span class="grow">${nl2br(char.greeting)}</span>
      </button>
      <div class="qa mt12">
        <button class="chat" data-go="chat">${icon('chatFill')}Chat</button>
        <button class="call" data-go="call">${icon('phoneFill')}Call</button>
        <button class="acts" data-go="activities">${icon('activities')}Activities</button>
      </div>
      <h2 class="section-title">What's ${char.name} doing?</h2>
      <button class="card row act-card" data-go="timeline" aria-label="See ${esc(char.name)}'s day">
        <span class="thumb"><img data-act-img alt=""></span>
        <span class="grow"><span class="label" data-act-label></span><br><span class="small muted" data-act-meta></span></span>
        ${icon('chev', 'chev')}
      </button>
      <p class="xs muted sim-note"><span data-last></span></p>
      <p class="xs muted sim-note">${char.name}'s day is simulated by the app · updates from ${char.pronoun.pos} routine</p>
    </div>
    ${BottomNav('home')}
  </section>`);

  const paint = () => {
    const act = routine.current(char, cfg);
    const st = statusOf(act);
    const s = el.querySelector('[data-status]');
    s.className = `status ${st.cls}`; s.textContent = st.text;
    el.querySelector('[data-act-img]').src = act.img;
    el.querySelector('[data-act-label]').textContent = act.label;
    el.querySelector('[data-act-meta]').innerHTML = act.withUser
      ? `With you right now <span class="dot">•</span> ${ago(act.start)}`
      : `${esc(act.desc)} <span class="dot">•</span> ${ago(act.start)}`;
    const lastShared = (ctx.store.get().events || []).filter((e) => e.companionId === char.id && e.closed).pop();
    el.querySelector('[data-last]').textContent = lastShared ? `Last time together: ${lastShared.label.toLowerCase()} · ${ago(lastShared.end || lastShared.ts)}` : '';
  };
  paint();
  const timer = setInterval(paint, 30000);
  el._cleanup = () => clearInterval(timer);
  el.addEventListener('click', (e) => { const b = e.target.closest('[data-go]'); if (b) ctx.go(b.dataset.go); });
  return el;
}
