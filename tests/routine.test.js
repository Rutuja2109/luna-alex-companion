import './setup.js';
import { test } from 'node:test';
import assert from 'node:assert/strict';
import * as R from '../src/engine/routine.js';
import { CHARACTERS } from '../src/data/characters.js';

const luna = CHARACTERS.luna;
const cfg = { id: 'luna' };
const at = (h, m = 0, day = '2026-10-21') => new Date(`${day}T${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:00`).getTime(); // a Wednesday

test('routine is deterministic for a given time', () => {
  assert.equal(R.current(luna, cfg, at(11, 30), []).id, 'study');
  assert.equal(R.current(luna, cfg, at(11, 30), []).id, R.current(luna, cfg, at(11, 30), []).id);
  assert.equal(R.current(luna, cfg, at(23, 0), []).id, 'bed');
});

test('a live shared session overrides the routine everywhere (current + today)', () => {
  const now = at(15, 0); // routine says "work"
  const ev = [{ id: 'e1', companionId: 'luna', kind: 'shared', activity: 'movie', ts: now - 10 * 60e3, lastSeen: now - 20e3 }];
  const cur = R.current(luna, cfg, now, ev);
  assert.equal(cur.withUser, true); assert.equal(cur.activity, 'movie');
  const t = R.today(luna, cfg, now, ev);
  const nows = t.filter((e) => e.status === 'now');
  assert.equal(nows.length, 1, 'exactly one NOW entry'); assert.equal(nows[0].shared, true);
});

test('a stale (unheartbeated) session no longer overrides, but stays in history', () => {
  const now = at(15, 0);
  const ev = [{ id: 'e1', companionId: 'luna', kind: 'shared', activity: 'movie', ts: now - 60 * 60e3, lastSeen: now - 30 * 60e3 }];
  assert.equal(R.current(luna, cfg, now, ev).id, 'work');
  const past = R.today(luna, cfg, now, ev).find((e) => e.shared);
  assert.equal(past.status, 'past'); assert.equal(past.minutes, 30);
});

test("another companion's events never affect this companion", () => {
  const now = at(15, 0);
  const ev = [{ id: 'x', companionId: 'alex', kind: 'shared', activity: 'movie', ts: now - 60e3, lastSeen: now }];
  assert.equal(R.current(luna, cfg, now, ev).withUser, undefined);
  assert.equal(R.today(luna, cfg, now, ev).filter((e) => e.shared).length, 0);
});

test('a day snapshot keeps past days stable when the routine changes later', () => {
  const day = at(12, 0);
  const snap = R.baseRoutine(new Date(day), cfg);
  const days = { [`luna:${R.dateKey(day)}`]: snap };
  const changed = { id: 'luna', routine: [['00:00', 'bed'], ['10:00', 'cook']] };
  assert.equal(R.routineFor(new Date(day), changed, days).find((e) => e.id === 'study')?.id, 'study', 'snapshot wins');
  assert.equal(R.routineFor(new Date(day), changed, {}).some((e) => e.id === 'study'), false, 'without snapshot the new routine applies');
});
