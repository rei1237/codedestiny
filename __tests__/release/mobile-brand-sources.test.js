const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const os = require('node:os');
const path = require('node:path');

test('only unused brand authoring sources with responsive derivatives are excluded', async t => {
  const { removeUnusedBrandSources } = await import('../../scripts/build-mobile-app.mjs');
  const directory = await fs.mkdtemp(path.join(os.tmpdir(), 'cd-brand-source-'));
  t.after(() => fs.rm(directory, { recursive: true, force: true }));
  const brand = path.join(directory, 'images', 'brand');
  await fs.mkdir(brand, { recursive: true });
  const files = ['loading-source.png', 'loading-720.webp', 'used-source.png', 'used-480.avif', 'icon-source.png', 'runtime.png'];
  for (const name of files) await fs.writeFile(path.join(brand, name), 'art');
  await fs.writeFile(path.join(directory, 'images', 'loading-source.png'), 'another directory');
  const removed = await removeUnusedBrandSources(new Set(['used-source.png']), directory);
  assert.deepEqual(removed, [{ path: 'images/brand/loading-source.png', bytes: 3 }]);
  assert.deepEqual((await fs.readdir(brand)).sort(), files.filter(name => name !== 'loading-source.png').sort());
  assert.equal(await fs.readFile(path.join(directory, 'images', 'loading-source.png'), 'utf8'), 'another directory');
  assert.deepEqual(await removeUnusedBrandSources(new Set(), path.join(directory, 'missing')), []);
});
