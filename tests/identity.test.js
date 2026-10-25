import './setup.js';
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { existsSync } from 'node:fs';
import { CHARACTERS } from '../src/data/characters.js';

// Which board crops show which person (checked by eye when extracted).
const SHOWS = (p) => (/alex|activities\/(study|hangout)\.jpg/.test(p) ? 'alex'
  : /luna|activities\/(coffee|cook|read|movie)\.jpg/.test(p) ? 'luna' : 'nobody');

function allImages(c) {
  return [c.avatar, c.portrait, c.hero, c.preview, c.wide, c.chatPhoto, ...c.outfits.map((o) => o.img), ...Object.values(c.scenes)];
}

for (const c of Object.values(CHARACTERS)) {
  test(`${c.name}: every image used for ${c.name} shows ${c.name} (no identity swaps)`, () => {
    for (const p of allImages(c)) {
      assert.ok(existsSync(p), `missing asset ${p}`);
      assert.equal(SHOWS(p), c.id, `${p} is used for ${c.name} but shows ${SHOWS(p)}`);
    }
  });
}
