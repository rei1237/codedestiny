import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {craftedVariantIsStale} from '../../scripts/lib/build-visual-details.mjs';

// sync:public used to compare mtimes, so a fresh checkout re-encoded variants whose source never changed.
test('crafted variants re-encode only when missing or their source hash changed', () => {
  assert.equal(craftedVariantIsStale({outputExists: false, recordedHash: 'a', sourceHash: 'a'}), true);
  assert.equal(craftedVariantIsStale({outputExists: true, recordedHash: 'a', sourceHash: 'a'}), false);
  assert.equal(craftedVariantIsStale({outputExists: true, recordedHash: 'a', sourceHash: 'b'}), true);
  assert.equal(craftedVariantIsStale({outputExists: true, recordedHash: undefined, sourceHash: 'b'}), false);
  assert.doesNotMatch(fs.readFileSync('scripts/lib/build-visual-details.mjs', 'utf8'), /mtimeMs/);
});

test('every recorded crafted variant still exists', () => {
  const lock = JSON.parse(fs.readFileSync('scripts/data/crafted-variants.lock.json', 'utf8'));
  assert.ok(Object.keys(lock).length > 0);
  for (const [key, hash] of Object.entries(lock)) {
    assert.match(hash, /^[0-9a-f]{16}$/, key);
    assert.ok(fs.existsSync(`public/feature-details/crafted/${key}`), key);
  }
});
