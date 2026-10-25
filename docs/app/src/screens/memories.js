// Screen 20 — Our Memories (reference: board-c #16, board-a #20)
// The user controls everything here: add, edit, delete. Nothing is saved
// automatically; chat messages are saved only when the user taps "Save".
import { h, Header, Seg, BottomNav, esc, toast, sheet, confirmSheet, fileToDataUrl, timeLabel } from '../ui/components.js';
import { icon } from '../ui/icons.js';
import { addMemory } from '../state/actions.js';
import * as voice from '../services/voice.js';

const TABS = [{ id: 'all', label: 'All' }, { id: 'photo', label: 'Photos' }, { id: 'voice', label: 'Voice' }, { id: 'notes', label: 'Notes' }];
const KINDS = { photo: 'Photo', voice: 'Voice note', moment: 'Moment', pref: 'Preference', date: 'Important date', goal: 'Goal' };

export function render(ctx) {
  const { char } = ctx;
  let tab = 'all', q = '';
  const el = h(`<section class="screen">
    ${Header({ title: 'Our Memories', right: `<button class="icon-btn" data-add aria-label="Add memory">${icon('plus')}</button>` })}
    <div class="screen-body">
      <div data-tabs></div>
      <div class="field"><label class="sr" for="mq">Search memories</label><input id="mq" class="input" type="search" placeholder="Search memories" data-q></div>
      <div data-grid></div>
      <section class="knows" data-knows aria-label="What ${char.name} knows"></section>
      <p class="xs muted center mt12">Only what you save is kept. Everything ${char.name} uses when replying is listed on this screen.</p>
    </div>
    ${BottomNav('memories')}
  </section>`);

  const list = () => ctx.store.get().memories.filter((m) => m.companionId === char.id || !m.companionId)
    .filter((m) => tab === 'all' || (tab === 'notes' ? !['photo', 'voice'].includes(m.kind) : m.kind === tab))
    .filter((m) => !q || `${m.title} ${m.text || ''}`.toLowerCase().includes(q));
  // Everything else the AI receives besides saved memories: the running chat
  // summary and your shared moments. Visible, editable, deletable.
  const paintKnows = () => {
    const st = ctx.store.get();
    const summary = st.chatMeta?.[char.id]?.summary || '';
    const moments = (st.events || []).filter((e) => e.companionId === char.id && e.closed).slice(-8).reverse();
    el.querySelector('[data-knows]').innerHTML = `<h2 class="section-title">What ${esc(char.name)} knows</h2>
      <div class="card"><div class="kn-h"><span>Notes from older chats</span>${summary ? '<span><button data-kn="edit-sum">Edit</button> · <button data-kn="clear-sum">Clear</button></span>' : ''}</div>
        <div class="kn-b">${summary ? esc(summary) : `Nothing yet. After long chats, ${esc(char.name)} keeps short notes here so she remembers.`}</div></div>
      <div class="card"><div class="kn-h"><span>Time spent together</span></div>
        ${moments.length ? moments.map((e) => `<div class="kn-row"><span class="grow">${esc(e.text || e.label)} · ${new Date(e.ts).toLocaleDateString([], { day: 'numeric', month: 'short' })}</span><button data-kn="del-ev" data-id="${e.id}" aria-label="Forget this moment">Forget</button></div>`).join('') : '<div class="kn-b">Nothing yet.</div>'}</div>`;
  };
  el.addEventListener('click', async (e) => {
    const k = e.target.closest('[data-kn]')?.dataset.kn; if (!k) return;
    if (k === 'clear-sum') { ctx.store.update((st) => { st.chatMeta[char.id].summary = ''; }, { silent: true }); paintKnows(); toast('Notes cleared'); }
    if (k === 'del-ev') { const id = e.target.closest('[data-id]').dataset.id; ctx.store.update((st) => { st.events = st.events.filter((x) => x.id !== id); ctx.store.tombstone('events', id); }, { silent: true }); paintKnows(); toast(`${char.name} won't bring that up again`); }
    if (k === 'edit-sum') sheet((sh, close) => {
      sh.innerHTML = `<h2>Notes from older chats</h2><div class="field"><label for="sum">What ${esc(char.name)} remembers</label><textarea id="sum" class="input" rows="8" maxlength="1500">${esc(ctx.store.get().chatMeta[char.id].summary)}</textarea></div><button class="btn btn-primary" data-ok>Save</button>`;
      sh.querySelector('[data-ok]').onclick = () => { ctx.store.update((st) => { st.chatMeta[char.id].summary = sh.querySelector('#sum').value.trim(); }, { silent: true }); close(); paintKnows(); toast('Saved'); };
    });
  });
  const paint = () => {
    paintKnows();
    el.querySelector('[data-tabs]').innerHTML = Seg(TABS, tab, { cls: 'sm', name: 't' });
    const items = list();
    const g = el.querySelector('[data-grid]');
    if (!items.length) {
      g.innerHTML = `<div class="empty">${icon('heart')}<div>${q ? 'No memories match that search.' : 'Nothing saved here yet. Tap a chat message and choose “Save to memories”, or add one with +.'}</div></div>`;
      return;
    }
    const shown = items.slice(0, 11);
    g.innerHTML = `<div class="mem-grid">${shown.map((m) => m.kind === 'photo'
      ? `<button class="mem" data-m="${m.id}" aria-label="${esc(m.title)}"><img src="${m.img}" alt="" loading="lazy"><span class="k">${icon('image')}</span></button>`
      : `<button class="mem note" data-m="${m.id}"><span class="nk">${KINDS[m.kind] || 'Note'}</span><span class="nt">${esc(m.title)}${m.text ? `<br><span class="muted">${esc(m.text)}</span>` : ''}</span>${m.kind === 'voice' ? `<span class="k">${icon('wave')}</span>` : ''}</button>`).join('')}
      ${items.length > 11 ? `<button class="mem more" data-more><img src="${items[11].img || char.hero}" alt=""><span>+${items.length - 11}</span></button>` : ''}</div>`;
  };
  paint();

  el.querySelector('[data-q]').addEventListener('input', (e) => { q = e.target.value.trim().toLowerCase(); paint(); });
  el.addEventListener('click', (e) => {
    const t = e.target.closest('[data-t]'); if (t) { tab = t.dataset.t; paint(); return; }
    if (e.target.closest('[data-more]')) { showAll(); return; }
    const m = e.target.closest('[data-m]'); if (m) openMemory(m.dataset.m);
    if (e.target.closest('[data-add]')) editMemory();
  });
  function showAll() { const items = list(); el.querySelector('[data-grid]').innerHTML = `<div class="mem-grid">${items.map((m) => m.kind === 'photo' ? `<button class="mem" data-m="${m.id}"><img src="${m.img}" alt=""></button>` : `<button class="mem note" data-m="${m.id}"><span class="nk">${KINDS[m.kind] || 'Note'}</span><span class="nt">${esc(m.title)}</span></button>`).join('')}</div>`; }

  function openMemory(id) {
    const m = ctx.store.get().memories.find((x) => x.id === id);
    if (!m) return;
    sheet((s, close) => {
      s.innerHTML = `${m.img ? `<div class="photo-card mem-big"><img src="${m.img}" alt=""></div>` : ''}
        <h2 class="mt12">${esc(m.title)}</h2>
        <p>${KINDS[m.kind] || 'Note'} · saved ${new Date(m.ts).toLocaleDateString()} ${m.text ? `<br><br>${esc(m.text)}` : ''}</p>
        <div class="btn-stack">
          ${m.kind === 'voice' ? `<button class="btn btn-blue" data-play>${icon('play')} Play</button>` : ''}
          <button class="btn btn-ghost" data-edit>${icon('edit')} Edit</button>
          <button class="btn btn-danger" data-del>${icon('trash')} Delete</button></div>`;
      s.querySelector('[data-play]')?.addEventListener('click', () => voice.speak(m.text || m.title, { voiceId: ctx.cfg.voice, gender: char.gender }));
      s.querySelector('[data-edit]').onclick = () => { close(); editMemory(m); };
      s.querySelector('[data-del]').onclick = async () => {
        close();
        if (await confirmSheet({ title: 'Delete this memory?', body: `“${m.title}” will be removed for good and ${char.name} won't use it anymore.`, ok: 'Delete', danger: true })) {
          ctx.store.update((st) => { st.memories = st.memories.filter((x) => x.id !== m.id); ctx.store.tombstone('memories', m.id); }, { silent: true });
          paint(); toast('Memory deleted');
        }
      };
    });
  }

  function editMemory(m = null) {
    sheet((s, close) => {
      let img = m?.img || null;
      s.innerHTML = `<h2>${m ? 'Edit memory' : 'New memory'}</h2>
        <div class="field"><label for="mk">Type</label><select id="mk" class="input">${Object.entries(KINDS).filter(([k]) => k !== 'voice').map(([k, v]) => `<option value="${k}" ${k === (m?.kind || 'moment') ? 'selected' : ''}>${v}</option>`).join('')}</select></div>
        <div class="field"><label for="mt">Title</label><input id="mt" class="input" maxlength="80" value="${esc(m?.title || '')}" placeholder="e.g. Favourite coffee order"><span class="err" data-err hidden>Give it a short title.</span></div>
        <div class="field"><label for="mx">Details (optional)</label><textarea id="mx" class="input" maxlength="400">${esc(m?.text || '')}</textarea></div>
        <label class="list-row mb8" style="cursor:pointer">${icon('image')}<span class="grow" data-pl>${img ? 'Photo attached · tap to replace' : 'Attach a photo (optional)'}</span><input type="file" accept="image/*" class="hidden-file" data-f></label>
        <p class="xs muted">Avoid saving passwords, health or financial details here.</p>
        <button class="btn btn-primary mt12" data-save>Save</button>`;
      s.querySelector('[data-f]').onchange = async (e) => { try { img = await fileToDataUrl(e.target.files[0], 900, 0.78); s.querySelector('[data-pl]').textContent = 'Photo attached · tap to replace'; } catch (err) { toast(err.message); } };
      s.querySelector('[data-save]').onclick = () => {
        const title = s.querySelector('#mt').value.trim();
        if (!title) { s.querySelector('[data-err]').hidden = false; s.querySelector('#mt').setAttribute('aria-invalid', 'true'); return; }
        const kind = img && s.querySelector('#mk').value === 'moment' ? 'photo' : s.querySelector('#mk').value;
        const data = { kind, title, text: s.querySelector('#mx').value.trim(), img };
        if (m) ctx.store.update((st) => { Object.assign(st.memories.find((x) => x.id === m.id), data, { u: Date.now() }); }, { silent: true });
        else addMemory(data);
        close(); paint(); toast(m ? 'Memory updated' : 'Memory saved');
      };
    });
  }
  return el;
}
