// Merge two copies of the app state (this device + the cloud copy) without
// losing either side's changes. Pure function; see tests/merge.test.js.
//
//  - Collections with ids (messages, memories, goals, events, sessions,
//    wallpapers) are unioned by id; when both sides have an item, the one with
//    the newer `u` (edit time) wins, else this device's copy.
//  - Deletions are recorded in `deleted` (tombstones) so a deleted memory,
//    goal or shared moment can never come back from an older copy.
//  - "Clear chat" is a tombstone timestamp: messages at or before it are gone.
//  - Settings-like objects come from whichever copy was saved more recently.
//  - Photos stored only on this device ('[local]' placeholders in the cloud)
//    are never overwritten by the placeholder.

const LOCAL = '[local]';
const COLLECTIONS = ['memories', 'goals', 'events', 'studySessions', 'customWallpapers'];
const SCALARS = ['onboarded', 'draft', 'companionId', 'companions', 'settings', 'chatMeta', 'days', 'activeStudy', 'version'];

function mergeDeleted(a = {}, b = {}) {
  const out = {};
  for (const kind of new Set([...Object.keys(a), ...Object.keys(b)])) {
    out[kind] = { ...(b[kind] || {}) };
    for (const [id, ts] of Object.entries(a[kind] || {})) out[kind][id] = Math.max(ts, out[kind][id] || 0);
  }
  return out;
}

function pickItem(local, remote) {
  if (!local) return remote;
  if (!remote) return local;
  const winner = (remote.u || 0) > (local.u || 0) ? remote : local;
  const loser = winner === local ? remote : local;
  const merged = { ...loser, ...winner };
  for (const k of Object.keys(merged)) {
    if (merged[k] === LOCAL && typeof loser[k] === 'string' && loser[k] !== LOCAL) merged[k] = loser[k];
  }
  return merged;
}

// Keeps this device's order; items only the other copy has are appended.
function unionById(local = [], remote = [], gone = {}) {
  const rmap = new Map(remote.map((r) => [r.id, r]));
  const out = local.map((l) => pickItem(l, rmap.get(l.id)));
  const seen = new Set(local.map((l) => l.id));
  for (const r of remote) if (!seen.has(r.id)) out.push(r);
  return out.filter((x) => !gone?.[x.id]);
}
const ORDER = { memories: (a, b) => (b.ts || 0) - (a.ts || 0), events: (a, b) => (a.ts || 0) - (b.ts || 0), studySessions: (a, b) => (a.ts || 0) - (b.ts || 0) };

export function mergeStates(local, remote) {
  if (!remote) return local;
  if (!local) return remote;
  const deleted = mergeDeleted(local.deleted, remote.deleted);
  const newer = (remote.updatedAt || 0) > (local.updatedAt || 0) ? remote : local;
  const out = { ...local };
  for (const k of SCALARS) if (k in newer) out[k] = newer[k];
  // a companion created on either device survives
  out.companions = { ...(newer === local ? remote.companions : local.companions), ...newer.companions };
  for (const k of COLLECTIONS) { out[k] = unionById(local[k], remote[k], deleted[k]); if (ORDER[k]) out[k].sort(ORDER[k]); }
  out.chats = {};
  for (const cid of new Set([...Object.keys(local.chats || {}), ...Object.keys(remote.chats || {})])) {
    const cleared = deleted.chats?.[cid] || 0;
    out.chats[cid] = unionById(local.chats?.[cid], remote.chats?.[cid], deleted.messages)
      .filter((m) => m.ts > cleared)
      .sort((a, b) => a.ts - b.ts);
  }
  out.deleted = deleted;
  out.updatedAt = Math.max(local.updatedAt || 0, remote.updatedAt || 0);
  out.rev = Math.max(local.rev || 0, remote.rev || 0);
  out.ownerId = local.ownerId || remote.ownerId;
  return out;
}
