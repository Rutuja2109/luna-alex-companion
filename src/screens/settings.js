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
          sh.innerHTML = `<h2>Privacy & Data</h2>
            <p>${char.name} is a fictional AI character. Your chats, memories and settings are stored on this device${window.claude ? ' and in your private space on your Claude account' : ''}. Nothing is shared with other people.</p>
            <div class="list">
              ${toggleRow('memoryMode', 'Allow saving memories', 'When off, nothing new can be saved to Memories', st.settings.memoryMode !== 'off')}
              <button class="list-row" data-x="clearchat"><span class="ic">${icon('trash')}</span><span class="grow">Delete chat history with ${char.name}</span></button>
              <button class="list-row" data-x="clearmem"><span class="ic">${icon('trash')}</span><span class="grow">Delete all memories</span></button>
              <button class="list-row" data-x="reset"><span class="ic">${icon('logout')}</span><span class="grow">Delete everything and start over</span></button>
            </div>`;
        };
        draw();
        sh.addEventListener('click', async (ev) => {
          if (ev.target.closest('[data-tg]')) { ctx.store.update((st) => { st.settings.memoryMode = st.settings.memoryMode === 'off' ? 'ask' : 'off'; }, { silent: true }); draw(); return; }
          const x = ev.target.closest('[data-x]')?.dataset.x; if (!x) return;
          close();
          const msgs = { clearchat: ['Delete chat history?', `Every message with ${char.name} is removed.`], clearmem: ['Delete all memories?', 'Every saved memory is removed for good.'], reset: ['Delete everything?', 'Companions, chats, memories, goals and settings are erased. This can\'t be undone.'] };
          if (!(await confirmSheet({ title: msgs[x][0], body: msgs[x][1], ok: 'Delete', danger: true }))) return;
          if (x === 'clearchat') ctx.store.update((st) => { st.chats[char.id] = []; }, { silent: true });
          if (x === 'clearmem') ctx.store.update((st) => { st.memories = []; }, { silent: true });
          if (x === 'reset') { store.replace(store.initialState()); ctx.go('welcome', {}, { reset: true }); }
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
  return el;
}
