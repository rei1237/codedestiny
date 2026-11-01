const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const os = require('node:os');
const path = require('node:path');

test('obsolete crafted panels are removed only inside known manifests; dynamic names and all manifest images survive', async t => {
  const { buildReferencedNameIndex, removeUnusedIntroductionImages } = await import('../../scripts/build-mobile-app.mjs');
  const dist = await fs.mkdtemp(path.join(os.tmpdir(), 'cd-introduction-'));
  t.after(() => fs.rm(dist, { recursive: true, force: true }));
  const folder = path.join(dist, 'feature-details/crafted/example');
  const unknown = path.join(dist, 'feature-details/crafted/unknown');
  await fs.mkdir(folder, { recursive: true });
  await fs.mkdir(unknown, { recursive: true });
  const manifest = JSON.stringify({ panels: [{ src: '/feature-details/crafted/example/current.webp', variants: [{ src: '/feature-details/crafted/example/current-540.webp' }] }] });
  await fs.writeFile(path.join(folder, 'manifest.json'), manifest);
  for (const name of ['current.webp', 'current-540.webp', 'dynamic.webp', 'obsolete.webp']) await fs.writeFile(path.join(folder, name), 'art');
  await fs.writeFile(path.join(unknown, 'unknown.webp'), 'art');
  await fs.mkdir(path.join(dist, 'images/feature-details'), { recursive: true });
  await fs.mkdir(path.join(dist, 'images/service-introductions'), { recursive: true });
  await fs.writeFile(path.join(dist, 'images/feature-details/old-hero.webp'), 'art');
  await fs.writeFile(path.join(dist, 'images/feature-details/dynamic.webp'), 'art');
  await fs.writeFile(path.join(dist, 'images/service-introductions/theme-960.webp'), 'art');
  await fs.writeFile(path.join(dist, 'runtime.js'), `const src = '/feature-details/crafted/' + id + '/dynamic.webp';`);
  const refs = await buildReferencedNameIndex(dist);
  assert.deepEqual(await removeUnusedIntroductionImages(refs, dist), [
    { path: 'feature-details/crafted/example/obsolete.webp', bytes: 3 },
    { path: 'images/feature-details/old-hero.webp', bytes: 3 },
  ]);
  assert.equal(await fs.readFile(path.join(folder, 'manifest.json'), 'utf8'), manifest);
  for (const name of ['current.webp', 'current-540.webp', 'dynamic.webp']) await fs.access(path.join(folder, name));
  await fs.access(path.join(unknown, 'unknown.webp'));
  await fs.access(path.join(dist, 'images/feature-details/dynamic.webp'));
  await fs.access(path.join(dist, 'images/service-introductions/theme-960.webp'));
});

test('introduction art retains dimensions and alpha; bigger encodes are discarded', async t => {
  const sharp = require('sharp');
  const { shrinkOversizedImages } = await import('../../scripts/build-mobile-app.mjs');
  const dist = await fs.mkdtemp(path.join(os.tmpdir(), 'cd-introduction-pixels-'));
  t.after(() => fs.rm(dist, { recursive: true, force: true }));
  for (const prefix of ['feature-details/crafted', 'images/service-introductions', 'images/consultation-editorial', 'images/feature-details']) {
    const folder = path.join(dist, prefix);
    await fs.mkdir(folder, { recursive: true });
    const input = await sharp({ create: { width: 1536, height: 1024, channels: 4, background: '#97a4bb80' } }).webp({ quality: 80 }).toBuffer();
    const file = path.join(folder, 'detail.webp');
    await fs.writeFile(file, input);
    await shrinkOversizedImages(dist);
    const output = await fs.readFile(file);
    const meta = await sharp(output).metadata();
    assert.equal(meta.width, 1536);
    assert.equal(meta.height, 1024);
    assert.ok(meta.hasAlpha);
    assert.ok(output.length <= input.length);
  }
});
