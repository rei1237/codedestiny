import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { inspectAssets, inspectLock } from './preflight.mjs';

const lock = pkg => ({ lockfileVersion: 3, packages: {
  '': { dependencies: { verified: '1.0.0' } },
  'node_modules/verified': { version: '1.0.0', resolved: 'https://registry.npmjs.org/verified/-/verified-1.0.0.tgz',
    integrity: 'sha512-' + Buffer.alloc(64).toString('base64'), license: 'MIT', ...pkg },
} });
const manifest = { dependencies: { verified: '1.0.0' } };
test('allowlisted lock passes; aliases, non-registry sources, unreviewed licenses and incomplete locks fail', () => {
  assert.deepEqual(inspectLock(manifest, lock({})), []);
  for (const metadata of [{ name: 'sweph-wasm' }, { optionalDependencies: { other: 'npm:sweph-wasm@2.6.9' } },
    { license: 'LGPL-3.0-only' }, { license: undefined }, { resolved: 'file:../vendor.tgz' }, { link: true },
    { integrity: 'sha512-bad' }, { hasInstallScript: true }])
    assert.ok(inspectLock(manifest, lock(metadata)).length);
  assert.ok(inspectLock({ dependencies: { renamed: 'npm:sweph-wasm@2.6.9' } }, lock({})).length);
  assert.throws(() => inspectLock(manifest, {}));
});
test('vendored ephemerides and unattributed WASM require review even with an empty manifest', () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'cr010-assets-'));
  try {
    for (const name of ['seas_18.se1', 'calculation.wasm', 'swisseph-loader.js']) fs.writeFileSync(path.join(dir, name), '');
    assert.deepEqual(inspectAssets(dir).map(x => x.issue).sort(), ['prohibited-asset','prohibited-asset','wasm-origin-review']);
  } finally {
    for (const file of fs.readdirSync(dir)) fs.unlinkSync(path.join(dir, file));
    fs.rmdirSync(dir);
  }
});
