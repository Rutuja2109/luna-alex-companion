// Screen 23 — Settings & Preferences (reference: board-c #20, board-a #23)
import { h, Header, BottomNav, esc, toast, sheet, confirmSheet } from '../ui/components.js';
import { icon } from '../ui/icons.js';
import { CHARACTERS } from '../data/characters.js';
import * as store from '../state/store.js';
import * as ai from '../services/ai.js';

export function render(ctx) {
  const { char } = ctx;
  const row = (id, ic, label, val = '') => `<button class="list-row" data-r="${id}"><span class="ic">${icon(ic)}</span><span class="grow">${label}</span>${val ? `<span class="val">${esc(val)}</span>` : ''}${icon('chev', 'chev')}</button>`;
  const el = h(`<section class="screen">
    ${Header({ title: 'Settings', back: false })}
    <div class="screen-body">
      <div class="card row comp-card">
        <span class="avatar lg"><img src="${char.avatar}" alt=""></span>
        <span class="grow"><span class="label">${char.name}</span><br><span class="small muted">Your companion · fictional AI character</span></span>
        <button class="btn btn-ghost btn-sm" data-r="switch" style="width:auto">Switch</button>
      </div>
      <div class="list mt12 dense">
        ${row('appearance', 'palette', 'Edit Appearance')}
        ${row('personality', 'sparkle', 'Personality & Voice')}
        ${row('rooms', 'sofa', 'Apartment & Rooms')}
        ${row('chatprefs', 'chat', 'Chat Preferences')}
        ${row('wallpaper', 'image', 'Chat Wallpaper')}
        ${row('notifications', 'bell', 'Notifications')}
        ${row('goals', 'target', 'Goals')}
        ${row('timeline', 'clock', `${char.name}'s Day`)}
        ${row('privacy', 'shield', 'Privacy & Data')}
        ${row('memory', 'history', 'Memory & History')}
        ${row('language', 'globe', 'App Language', 'English')}
        ${row('help', 'help', 'Help & Support')}
      </div>
      <button class="btn btn-danger mt16" data-r="signout">Sign Out</button>
      <p class="xs muted center mt12">AI replies: ${ai.getMode() === 'live' ? 'Claude (live)' : ai.getMode() === 'offline' ? 'Offline replies' : 'checking…'} · Data is saved on this device${window.claude ? ' and your Claude account' : ''}</p>
    </div>
    ${BottomNav('settings')}
  </section>`);

  const toggleRow = (key, label, desc, on) => `<button class="list-row" data-tg="${key}"><span class="grow"><span class="label">${label}</span><br><span class="small muted">${desc}</span></span><span class="toggle" role="switch" aria-checked="${on}"></span></button>`;

  el.addEventListener('click', async (e) => {
    const r = e.target.closest('[data-r]')?.dataset.r;
    if (!r) return;
    const s = ctx.store.get();
    if (r === 'appearance') ctx.go('customize', { tab: 'outfit' });
    if (r === 'personality') ctx.go('customize', { tab: 'personality' });
    if (r === 'rooms') ctx.go('customize', { tab: 'room' });
    if (r === 'wallpaper') ctx.go('wallpaper');
    if (r === 'notifications') ctx.go('notifications');
    if (r === 'goals') ctx.go('goals');
    if (r === 'timeline') ctx.go('timeline');
    if (r === 'memory') ctx.go('memories');
    if (r === 'language') toast('English is the only language in this version.');
    if (r === 'switch') {
      sheet((sh, close) => {
        sh.innerHTML = `<h2>Switch companion</h2><p>Each companion keeps their own chat, look and home.</p><div class="list">${Object.values(CHARACTERS).map((c) => `<button class="list-row" data-c="${c.id}"><span class="avatar"><img src="${c.avatar}" alt=""></span><span class="grow"><span class="label">${c.name}</span><br><span class="small muted">${s.companions[c.id] ? 'Set up' : 'Not set up yet'}</span></span>${c.id === s.companionId ? icon('check', 'chev') : icon('chev', 'chev')}</button>`).join('')}</div>`;
        sh.addEventListener('click', (ev) => {
          const c = ev.target.closest('[data-c]')?.dataset.c; if (!c) return; close();
          if (s.companions[c]) { ctx.store.update((st) => { st.companionId = c; }, { silent: true }); ctx.go('home', {}, { reset: true }); }
          else { ctx.store.update((st) => { st.draft = { gender: CHARACTERS[c].gender, characterId: c }; }, { silent: true }); ctx.go('preview'); }
        });
      });
    }
    if (r === 'chatprefs') {
      sheet((sh) => {
        const draw = () => {
          const st = ctx.store.get().settings;
          sh.innerHTML = `<h2>Chat Preferences</h2>
            <div class="field"><label for="un">What ${esc(char.name)} calls you</label><input id="un" class="input" maxlength="30" placeholder="Your first name or nickname" value="${esc(st.userName || '')}"></div>
            <div class="list">
            ${toggleRow('readReceipts', 'Read receipts', 'Show ticks on your messages', st.readReceipts)}
            ${toggleRow('captions', 'Call captions', 'Show captions during calls', st.captions !== false)}
            ${toggleRow('speaker', 'Spoken replies in calls', 'Hear replies through your speaker', st.speaker !== false)}</div>`;
        };
        draw();
        sh.addEventListener('change', (ev) => { if (ev.target.id === 'un') { ctx.store.update((st) => { st.settings.userName = ev.target.value.trim(); }, { silent: true }); toast('Saved'); } });
        sh.addEventListener('click', (ev) => { const k = ev.target.closest('[data-tg]')?.dataset.tg; if (k) { ctx.store.update((st) => { st.settings[k] = st.settings[k] === false ? true : !st.settings[k]; }, { silent: true }); draw(); } });
      });
    }
    if (r === 'privacy') {
      sheet((sh, close) => {
        const draw = () => {
          const st = ctx.store.get();
          const sy = store.getSync();
          const syncLine = sy.status === 'local' ? 'Saved on this device only'
            : sy.status === 'syncing' ? 'Saving to your account…'
            : sy.status === 'synced' ? `Saved to your account · ${new Date(sy.at).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}`
            : sy.message;
          sh.innerHTML = `<h2>Privacy & Data</h2>
            <p>${esc(char.name)} is a fictional AI character. Your chats, memories and settings are stored on this device${sy.status !== 'local' ? ' and in a private copy on your Claude account' : ''}, not encrypted beyond what the browser and Claude provide. To reply, your recent messages and saved memories are sent to the AI service. Nothing is shared with other people.</p>
            <div class="sync-row ${sy.status}" data-sync role="status"><span class="dot-sync"></span><span class="grow">${esc(syncLine)}</span>${sy.status === 'error' && sy.where === 'cloud' ? '<button class="btn btn-ghost btn-sm" data-x2="retry">Retry now</button>' : ''}</div>
            <div class="list">
              <button class="list-row" data-x2="export"><span class="ic">${icon('upload')}</span><span class="grow">Download my data</span><span class="val">JSON</span></button>
              ${toggleRow('memoryMode', 'Allow saving memories', 'When off, nothing new can be saved to Memories', st.settings.memoryMode !== 'off')}
              <button class="list-row" data-x="clearchat"><span class="ic">${icon('trash')}</span><span class="grow">Delete chat history with ${char.name}</span></button>
              <button class="list-row" data-x="clearmem"><span class="ic">${icon('trash')}</span><span class="grow">Delete all memories</span></button>
              <button class="list-row" data-x="reset"><span class="ic">${icon('logout')}</span><span class="grow">Delete everything and start over</span></button>
            </div>`;
        };
        draw();
        const off = store.onSync(() => { if (document.contains(sh)) draw(); else off(); });
        sh.addEventListener('click', async (ev) => {
          const x2 = ev.target.closest('[data-x2]')?.dataset.x2;
          if (x2 === 'retry') { store.pushNow(); return; }
          if (x2 === 'export') { exportMyData(); return; }
          if (ev.target.closest('[data-tg]')) { ctx.store.update((st) => { st.settings.memoryMode = st.settings.memoryMode === 'off' ? 'ask' : 'off'; }, { silent: true }); draw(); return; }
          const x = ev.target.closest('[data-x]')?.dataset.x; if (!x) return;
          close();
          const msgs = { clearchat: ['Delete chat history?', `Every message with ${char.name} is removed.`], clearmem: ['Delete all memories?', 'Every saved memory is removed for good.'], reset: ['Delete everything?', 'Companions, chats, memories, goals and settings are erased. This can\'t be undone.'] };
          if (!(await confirmSheet({ title: msgs[x][0], body: msgs[x][1], ok: 'Delete', danger: true }))) return;
          if (x === 'clearchat') ctx.store.update((st) => { st.chats[char.id] = []; st.chatMeta ||= {}; st.chatMeta[char.id] = {}; store.tombstone('chats', char.id); }, { silent: true });
          if (x === 'clearmem') ctx.store.update((st) => { st.memories.forEach((m) => store.tombstone('memories', m.id)); st.memories = []; Object.values(st.chatMeta || {}).forEach((cm) => { cm.summary = ''; }); }, { silent: true });
          if (x === 'reset') { const ok = await store.deleteCloud(); store.replace({ ...store.initialState(), ownerId: store.get().ownerId }); try { localStorage.removeItem('companion.state.v1'); } catch {} if (!ok) { toast("Deleted on this device, but the copy in your account couldn't be deleted yet. Try again from Privacy & Data."); } ctx.go('welcome', {}, { reset: true }); return; }
          toast('Deleted');
        });
      });
    }
    if (r === 'help') {
      sheet((sh) => {
        sh.innerHTML = `<h2>Help & Support</h2><p><b>Is ${esc(char.name)} a real person?</b> No. ${esc(char.name)} is a fictional AI character. Replies are written by AI and ${esc(char.name)}'s daily life is a simulated routine.</p>
          <p><b>Why are replies simple?</b> If you see “Offline replies”, the app can't reach Claude right now and uses built-in responses.</p>
          <p><b>Need real support?</b> If you're going through something hard, please reach out to someone you trust or a local helpline.</p>`;
      });
    }
    if (r === 'signout') {
      if (await confirmSheet({ title: 'Sign out?', body: 'You\'ll return to the welcome screen. Your companion and chats stay saved on this device.', ok: 'Sign out' })) {
        ctx.store.update((st) => { st.onboarded = false; }, { silent: true });
        ctx.go('welcome', {}, { reset: true });
      }
    }
  });
  // Export: the artifact's download capability when available, a normal
  // file download elsewhere, and copy-to-clipboard as the last resort.
  async function exportMyData() {
    const json = store.exportData();
    const filename = `luna-alex-data-${new Date().toISOString().slice(0, 10)}.json`;
    try {
      const dl = window.claude?.use ? await window.claude.use('downloads') : null;
      if (dl) { await dl.save({ filename, data: json }); toast('Export ready'); return; }
    } catch (e) { if (e?.code === 'declined' || e?.code === 'not_granted') { toast('Download cancelled'); return; } }
    if (!window.claude) {
      const a = document.createElement('a');
      a.href = URL.createObjectURL(new Blob([json], { type: 'application/json' })); a.download = filename;
      document.body.appendChild(a); a.click(); a.remove(); toast('Downloaded ' + filename); return;
    }
    try { await navigator.clipboard.writeText(json); toast('Your data was copied as JSON. Paste it into a file to keep it.'); }
    catch { toast("Export isn't available in this view."); }
  }
  return el;
}
