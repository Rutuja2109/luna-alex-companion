// S01–S06 onboarding, in the original's order (recon F01), without a paywall.
import { h, esc, icon } from '../ui.js';
import * as S from '../state.js';
import { CHARACTERS, PERSONALITIES, WELCOME } from '../art.js';
import { GOALS, AGES, PRONOUNS } from '../catalog.js';
import { STATUSES, INTERESTS } from '../../src/engine/bond.js';

export const STEPS = ['welcome', 'name', 'pronouns', 'age', 'role', 'companion', 'style', 'traits', 'goals', 'interests', 'building', 'meet'];

export function render(ctx) {
  const step = ctx.params.step || 'welcome';
  const s = S.get();
  const i = STEPS.indexOf(step);
  const next = () => ctx.go('onboard', { step: STEPS[i + 1] });
  const char = CHARACTERS[s.cid];
  const prog = i > 0 && i < STEPS.length - 1 ? `<div class="ob-prog" aria-label="Step ${i} of ${STEPS.length - 2}"><i style="width:${(i / (STEPS.length - 2)) * 100}%"></i></div>` : '';
  const top = i > 0 && step !== 'building' ? `<header class="ob-top"><button class="ib" data-back aria-label="Back">${icon('back')}</button>${prog}</header>` : '';
  const foot = (label = 'Continue', dis = false) => `<div class="ob-foot"><button class="btn primary" data-next ${dis ? 'disabled' : ''}>${label}</button></div>`;
  const choice = (items, cur, key, multi = false) => `<div class="choices">${items.map((it) => {
    const id = it.id ?? it; const on = multi ? cur.includes(id) : cur === id;
    return `<button class="choice ${on ? 'on' : ''}" data-${key}="${esc(id)}" aria-pressed="${on}">${esc(it.label ?? it)}${it.desc ? `<span>${esc(it.desc)}</span>` : ''}</button>`;
  }).join('')}</div>`;

  let body = '';
  if (step === 'welcome') {
    body = `<div class="ob-hero"><img src="${WELCOME}" alt="Luna and Alex"></div>
      <div class="ob-copy center"><h1>Someone who's always glad you came back</h1><p class="muted">A friend who remembers your day, does things with you and never turns into someone else.</p></div>
      <div class="ob-foot"><button class="btn primary" data-next>Get started</button><p class="xs muted center">Luna and Alex are fictional AI characters. Your data stays on this device.</p></div>`;
  } else if (step === 'name') {
    body = `<div class="ob-copy"><h1>What should we call you?</h1></div>
      <div class="ob-field"><label class="sr" for="nm">Your name</label><input id="nm" class="input" maxlength="30" autocomplete="given-name" placeholder="Your name or nickname" value="${esc(s.user.name)}"></div>${foot('Continue', !s.user.name)}`;
  } else if (step === 'pronouns') {
    body = `<div class="ob-copy"><h1>Your pronouns</h1><p class="muted">So ${'they'} talk about you the right way.</p></div>${choice(PRONOUNS, s.user.pronouns, 'pick')}${foot('Continue', !s.user.pronouns)}`;
  } else if (step === 'age') {
    body = `<div class="ob-copy"><h1>How old are you?</h1><p class="muted">This app is for adults.</p></div>${choice([...AGES, 'Under 18'], s.user.age, 'pick')}${foot('Continue', !s.user.age)}`;
  } else if (step === 'role') {
    body = `<div class="ob-copy"><h1>What would you like them to be?</h1><p class="muted">You can change this any time. Every option is free.</p></div>${choice(STATUSES, s.comp.status, 'pick')}${foot()}`;
  } else if (step === 'companion') {
    body = `<div class="ob-copy"><h1>Choose your companion</h1></div><div class="pick2">${['luna', 'alex'].map((id) => `<button class="pick-c ${s.cid === id ? 'on' : ''}" data-pick="${id}" aria-pressed="${s.cid === id}"><img src="${CHARACTERS[id].hero}" alt=""><b>${CHARACTERS[id].name}</b><span>${esc(CHARACTERS[id].tagline || '')}</span></button>`).join('')}</div>${foot()}`;
  } else if (step === 'style') {
    body = `<div class="ob-copy"><h1>Pick ${esc(char.name)}'s look</h1></div>
      <div class="style-hero"><img src="${(char.outfits.find((o) => o.id === s.comp.outfit) || char.outfits[0]).img}" alt="${esc(char.name)}"></div>
      <div class="grid3 mt12">${char.outfits.map((o) => `<button class="tile ${s.comp.outfit === o.id ? 'on' : ''}" data-pick="${o.id}" aria-pressed="${s.comp.outfit === o.id}"><img src="${o.img}" alt=""><span>${esc(o.label)}</span></button>`).join('')}</div>${foot()}`;
  } else if (step === 'traits') {
    body = `<div class="ob-copy"><h1>${esc(char.name)}'s personality</h1><p class="muted">Pick up to two.</p></div>${choice(PERSONALITIES, s.comp.traits, 'pick', true)}${foot('Continue', !s.comp.traits.length)}`;
  } else if (step === 'goals') {
    body = `<div class="ob-copy"><h1>What are you hoping for?</h1><p class="muted">Choose any that fit.</p></div>${choice(GOALS, s.user.goals, 'pick', true)}${foot('Continue', !s.user.goals.length)}`;
  } else if (step === 'interests') {
    body = `<div class="ob-copy"><h1>What do you like talking about?</h1><p class="muted">${esc(char.name)} will bring these up.</p></div><div class="chips">${INTERESTS.map((x) => `<button class="chip ${s.comp.interests.includes(x) ? 'on' : ''}" data-pick="${x}" aria-pressed="${s.comp.interests.includes(x)}">${x}</button>`).join('')}</div>${foot()}`;
  } else if (step === 'building') {
    const items = [`Learning your name`, `Setting up ${char.pronoun.pos} room`, `Choosing ${char.pronoun.pos} first words`];
    body = `<div class="ob-copy center"><img class="build-av" src="${char.avatar}" alt=""><h1>Getting ${esc(char.name)} ready</h1></div><ul class="build-list">${items.map((t, k) => `<li data-k="${k}"><span class="tick"></span>${t}</li>`).join('')}</ul>`;
  } else if (step === 'meet') {
    const im = (char.outfits.find((o) => o.id === s.comp.outfit) || char.outfits[0]).img;
    body = `<div class="meet"><div class="meet-bg" style="background-image:url('${im}')"></div><img src="${im}" alt="${esc(char.name)}"><div class="meet-c"><h1>${esc(char.name)} is waiting for you</h1>
      <p class="muted">${esc(char.name)} is an AI character, not a person, and not a substitute for professional help.</p><button class="btn primary" data-meet>Meet ${esc(char.name)}</button></div></div>`;
  }
  if (step === 'age' && s.user.age === 'Under 18') body = `<div class="ob-copy center"><h1>Sorry, this app is for adults</h1><p class="muted">You need to be 18 or older to use it.</p><button class="btn ghost" data-pick="">Go back</button></div>`;

  const el = h(`<section class="screen ob ob-${step}">${top}${body}</section>`);
  const set = (fn) => { S.update(fn); ctx.go('onboard', { step }, { replace: true }); };
  el.addEventListener('click', (e) => {
    if (e.target.closest('[data-next]') && !e.target.closest('[disabled]')) return next();
    const p = e.target.closest('[data-pick]');
    if (p) {
      const v = p.dataset.pick;
      if (step === 'pronouns') set((st) => { st.user.pronouns = v; });
      if (step === 'age') set((st) => { st.user.age = v; });
      if (step === 'role') set((st) => { st.comp.status = v; });
      if (step === 'companion') set((st) => { st.cid = v; st.comp.voice = v === 'alex' ? 'v4' : 'v1'; st.comp.outfit = CHARACTERS[v].outfits[0].id; });
      if (step === 'style') set((st) => { st.comp.outfit = v; });
      if (step === 'traits') set((st) => { const a = st.comp.traits; const k = a.indexOf(v); if (k >= 0) a.splice(k, 1); else { a.push(v); if (a.length > 2) a.shift(); } });
      if (step === 'goals') set((st) => { const a = st.user.goals; const k = a.indexOf(v); k >= 0 ? a.splice(k, 1) : a.push(v); });
      if (step === 'interests') set((st) => { const a = st.comp.interests; const k = a.indexOf(v); k >= 0 ? a.splice(k, 1) : a.push(v); });
    }
    if (e.target.closest('[data-meet]')) {
      S.update((st) => {
        st.onboarded = true;
        if (!st.chat.length) st.chat.push({ id: S.uid(), from: 'them', text: `hi ${st.user.name || 'you'}! i'm ${char.name}. honestly a little nervous, so tell me something about your day?`, ts: S.now() });
      });
      ctx.go('room', {}, { reset: true });
    }
  });
  const nm = el.querySelector('#nm');
  if (nm) {
    nm.addEventListener('input', () => { S.update((st) => { st.user.name = nm.value.trim(); }); el.querySelector('[data-next]').disabled = !nm.value.trim(); });
    nm.addEventListener('keydown', (e) => { if (e.key === 'Enter' && nm.value.trim()) next(); });
  }
  if (step === 'building') {
    const lis = el.querySelectorAll('li');
    lis.forEach((li, k) => setTimeout(() => li.classList.add('done'), 500 + k * 550));
    const t = setTimeout(() => ctx.go('onboard', { step: 'meet' }, { replace: true }), 500 + lis.length * 550 + 300);
    el._cleanup = () => clearTimeout(t);
  }
  return el;
}
