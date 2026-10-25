import './setup.js';
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mergeStates } from '../src/state/merge.js';

const base = (o = {}) => ({ updatedAt: 1, rev: 1, chats: {}, memories: [], goals: [], events: [], studySessions: [], customWallpapers: [], settings: {}, companions: {}, deleted: {}, ...o });

test('messages from both devices are kept, in time order, without duplicates', () => {
  const a = base({ chats: { luna: [{ id: 'm1', ts: 1, text: 'a' }, { id: 'm3', ts: 3, text: 'c (device A)' }] } });
  const b = base({ chats: { luna: [{ id: 'm1', ts: 1, text: 'a' }, { id: 'm2', ts: 2, text: 'b (device B)' }] }, updatedAt: 5, rev: 4 });
  assert.deepEqual(mergeStates(a, b).chats.luna.map((m) => m.id), ['m1', 'm2', 'm3']);
});

test('a deleted memory never comes back from a stale copy', () => {
  const local = base({ memories: [], deleted: { memories: { x: 10 } }, updatedAt: 10 });
  const staleRemote = base({ memories: [{ id: 'x', title: 'Bank stuff', ts: 1 }], updatedAt: 20, rev: 9 });
  assert.equal(mergeStates(local, staleRemote).memories.length, 0);
  assert.equal(mergeStates(staleRemote, local).memories.length, 0, 'symmetric');
});

test('cleared chat stays cleared, newer messages survive', () => {
  const local = base({ chats: { luna: [{ id: 'n', ts: 50 }] }, deleted: { chats: { luna: 40 } } });
  const remote = base({ chats: { luna: [{ id: 'old', ts: 30 }, { id: 'n', ts: 50 }] }, updatedAt: 99, rev: 7 });
  assert.deepEqual(mergeStates(local, remote).chats.luna.map((m) => m.id), ['n']);
});

test('the newer edit of the same memory wins; settings come from the newer copy', () => {
  const local = base({ memories: [{ id: 'm', title: 'old', u: 1 }], settings: { userName: 'Ru' }, updatedAt: 100 });
  const remote = base({ memories: [{ id: 'm', title: 'new', u: 5 }], settings: { userName: 'Rutuja' }, updatedAt: 200, rev: 3 });
  const m = mergeStates(local, remote);
  assert.equal(m.memories[0].title, 'new'); assert.equal(m.settings.userName, 'Rutuja');
});

test("this device's uploaded photo is never replaced by the cloud placeholder", () => {
  const local = base({ chats: { luna: [{ id: 'p', ts: 1, img: 'data:image/jpeg;base64,AAA' }] } });
  const remote = base({ chats: { luna: [{ id: 'p', ts: 1, img: '[local]', reaction: '❤️', u: 9 }] }, updatedAt: 9, rev: 2 });
  const p = mergeStates(local, remote).chats.luna[0];
  assert.match(p.img, /^data:image/); assert.equal(p.reaction, '❤️');
});

test('a companion created on another device is kept', () => {
  const local = base({ companions: { luna: { id: 'luna' } }, updatedAt: 1 });
  const remote = base({ companions: { alex: { id: 'alex' } }, updatedAt: 2, rev: 2 });
  assert.deepEqual(Object.keys(mergeStates(local, remote).companions).sort(), ['alex', 'luna']);
});
