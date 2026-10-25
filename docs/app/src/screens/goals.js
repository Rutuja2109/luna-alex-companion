// Screen 22 — Our Goals (reference: board-c #19, board-a #21)
import { h, Header, Seg, esc, toast, sheet, confirmSheet } from '../ui/components.js';
import { icon } from '../ui/icons.js';

const TONES = ['cyan', 'purple', 'grey'];

export function render(ctx) {
  let tab = 'active';
  const el = h(`<section class="screen">
    ${Header({ title: 'Our Goals' })}
    <div class="screen-body">
      <div data-tabs></div>
      <div class="list" data-list></div>
    </div>
    <div class="screen-foot"><button class="btn btn-primary" data-add>${icon('plus')} Add a new goal</button></div>
  </section>`);
  const $ = (s) => el.querySelector(s);
  const status = (g) => g.status === 'done' ? ['Completed', 'done'] : g.progress > 0 ? ['In progress', ''] : ['Not started', 'none'];
  const paint = () => {
    $('[data-tabs]').innerHTML = Seg([{ id: 'active', label: 'Active' }, { id: 'done', label: 'Completed' }], tab, { cls: 'tall', name: 't' });
    const goals = ctx.store.get().goals.filter((g) => (tab === 'done' ? g.status === 'done' : g.status !== 'done'));
    $('[data-list]').innerHTML = goals.length ? goals.map((g) => {
      const [st, cls] = status(g);
      return `<div class="goal" data-g="${g.id}">
        <button class="cb ${g.tone === 'purple' ? 'purple' : g.progress === 0 ? 'grey' : ''}" role="checkbox" aria-checked="${g.status === 'done'}" data-done aria-label="Mark ${esc(g.title)} complete">${g.status === 'done' ? icon('check') : ''}</button>
        <button class="g-main" data-open><span class="gt">${esc(g.title)}</span><span class="st ${cls}">${st}</span>
        <span class="bar"><i style="width:${g.progress}%"></i></span></button>
        <span class="pct num">${g.progress}%</span></div>`;
    }).join('') : `<div class="empty">${icon('target')}<div>${tab === 'done' ? 'Completed goals show up here.' : 'No active goals. Add one and work on it together.'}</div></div>`;
  };
  paint();

  el.addEventListener('click', async (e) => {
    const t = e.target.closest('[data-t]'); if (t) { tab = t.dataset.t; paint(); return; }
    const row = e.target.closest('[data-g]');
    if (row && e.target.closest('[data-done]')) {
      ctx.store.update((s) => { const g = s.goals.find((x) => x.id === row.dataset.g); g.u = Date.now(); if (g.status === 'done') { g.status = 'active'; } else { g.status = 'done'; g.progress = 100; } }, { silent: true });
      paint(); toast(tab === 'done' ? 'Moved back to active' : 'Goal completed 🎉'); return;
    }
    if (row && e.target.closest('[data-open]')) edit(ctx.store.get().goals.find((x) => x.id === row.dataset.g));
  });
  $('[data-add]').onclick = () => edit(null);

  function edit(g) {
    sheet((s, close) => {
      s.innerHTML = `<h2>${g ? 'Edit goal' : 'New goal'}</h2>
        <div class="field"><label for="gt">Goal</label><input id="gt" class="input" maxlength="70" value="${esc(g?.title || '')}" placeholder="e.g. Run a 5K"><span class="err" data-err hidden>Name your goal.</span></div>
        <div class="field"><label for="gp">Progress · <span data-pv>${g?.progress || 0}</span>%</label><input id="gp" type="range" min="0" max="100" step="5" value="${g?.progress || 0}"></div>
        <div class="btn-stack">
          <button class="btn btn-primary" data-s>Save goal</button>
          ${g ? `<button class="btn btn-ghost" data-study>${icon('focus')} Study for this</button><button class="btn btn-danger" data-del>Delete goal</button>` : ''}</div>`;
      s.querySelector('#gp').oninput = (e) => { s.querySelector('[data-pv]').textContent = e.target.value; };
      s.querySelector('[data-s]').onclick = () => {
        const title = s.querySelector('#gt').value.trim();
        if (!title) { s.querySelector('[data-err]').hidden = false; s.querySelector('#gt').setAttribute('aria-invalid', 'true'); return; }
        const progress = +s.querySelector('#gp').value;
        ctx.store.update((st) => {
          if (g) Object.assign(st.goals.find((x) => x.id === g.id), { u: Date.now(), title, progress, status: progress >= 100 ? 'done' : g.status === 'done' && progress < 100 ? 'active' : g.status });
          else st.goals.push({ id: 'g' + Date.now().toString(36), title, progress, status: progress >= 100 ? 'done' : 'active', tone: TONES[st.goals.length % 3] });
        }, { silent: true });
        close(); paint(); toast(g ? 'Goal updated' : 'Goal added');
      };
      s.querySelector('[data-study]')?.addEventListener('click', () => { close(); ctx.go('study', { goal: g.title }); });
      s.querySelector('[data-del]')?.addEventListener('click', async () => {
        close();
        if (await confirmSheet({ title: 'Delete goal?', body: `“${g.title}” will be removed.`, ok: 'Delete', danger: true })) {
          ctx.store.update((st) => { st.goals = st.goals.filter((x) => x.id !== g.id); ctx.store.tombstone('goals', g.id); }, { silent: true }); paint(); toast('Goal deleted');
        }
      });
    });
  }
  return el;
}
