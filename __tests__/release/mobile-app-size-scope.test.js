const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const os = require('node:os');
const path = require('node:path');
const { createHash } = require('node:crypto');

const sha = text => createHash('sha256').update(text).digest('hex');

test('app keeps only the tarot size the deck UI requests and fails closed without it', async t => {
  const { removeUnusedTarotSizes, APP_TAROT_KEPT_SIZE } = await import('../../scripts/build-mobile-app.mjs');
  assert.equal(APP_TAROT_KEPT_SIZE, 'std');
  const deck = await fs.readFile(path.join(__dirname, '../../lib/tarot/yeongnyangi-deck.ts'), 'utf8');
  assert.match(deck, /resolveTarotDeckCard\(\{ brand: 'yeongnyangi', cardCode, locale, imageFailed \}\)/, 'the app UI must keep using the default std size');
  const dist = await fs.mkdtemp(path.join(os.tmpdir(), 'cd-tarot-'));
  t.after(() => fs.rm(dist, { recursive: true, force: true }));
  const folder = path.join(dist, 'assets/yeongnyangi/tarot/v1');
  await fs.mkdir(folder, { recursive: true });
  const art = id => ({ id, files: { thumb: `/assets/yeongnyangi/tarot/v1/${id}-240.webp`, std: `/assets/yeongnyangi/tarot/v1/${id}-600.webp`, hi: `/assets/yeongnyangi/tarot/v1/${id}-1200.webp` }, avifFiles: { std: `/assets/yeongnyangi/tarot/v1/${id}-600.avif`, hi: `/assets/yeongnyangi/tarot/v1/${id}-1200.avif` } });
  await fs.writeFile(path.join(folder, 'manifest.json'), JSON.stringify({ cards: [art('M00')], back: art('back') }));
  for (const id of ['M00', 'back']) for (const name of [`${id}-240.webp`, `${id}-600.webp`, `${id}-1200.webp`, `${id}-600.avif`, `${id}-1200.avif`]) await fs.writeFile(path.join(folder, name), 'x');
  const removed = (await removeUnusedTarotSizes(dist)).map(item => item.path).sort();
  assert.deepEqual(removed, ['M00-1200.avif', 'M00-1200.webp', 'M00-240.webp', 'back-1200.avif', 'back-1200.webp', 'back-240.webp'].map(name => `assets/yeongnyangi/tarot/v1/${name}`));
  for (const name of ['M00-600.webp', 'M00-600.avif', 'back-600.webp']) await fs.access(path.join(folder, name));
  await fs.rm(path.join(folder, 'M00-600.avif'));
  await assert.rejects(removeUnusedTarotSizes(dist), /std/);
});

test('crafted detail art moves to the website only when its bytes match public and code does not name it', async t => {
  const { offloadCraftedDetailImages, CRAFTED_REMOTE_ORIGIN } = await import('../../scripts/build-mobile-app.mjs');
  const root = await fs.mkdtemp(path.join(os.tmpdir(), 'cd-crafted-root-'));
  const dist = path.join(root, 'dist');
  t.after(() => fs.rm(root, { recursive: true, force: true }));
  const names = ['same.webp', 'same-540.webp', 'changed.webp', 'named.webp'];
  for (const base of [dist, path.join(root, 'public')]) {
    await fs.mkdir(path.join(base, 'feature-details/crafted/x'), { recursive: true });
    for (const name of names) await fs.writeFile(path.join(base, 'feature-details/crafted/x', name), base === dist ? 're-encoded' : `original ${name}`);
  }
  const panel = name => ({ src: `/feature-details/crafted/x/${name}`, text: 't' });
  await fs.writeFile(path.join(dist, 'feature-details/crafted/x/manifest.json'), JSON.stringify({ panels: [{ ...panel('same.webp'), variants: [{ src: '/feature-details/crafted/x/same-540.webp', width: 540 }] }, panel('changed.webp'), panel('named.webp')] }));
  await fs.writeFile(path.join(dist, 'feature-details/edition.json'), JSON.stringify({ crafted: [{ cover: { src: '/feature-details/crafted/x/same.webp' } }] }));
  await fs.writeFile(path.join(dist, 'chunk.js'), 'const art="/feature-details/crafted/x/named.webp"');
  const requested = [];
  const remoteHash = async url => { requested.push(url); return url.endsWith('changed.webp') ? sha('other') : sha(`original ${url.split('/').pop()}`); };
  const result = await offloadCraftedDetailImages({ dist, root, remoteHash, now: 1 });
  assert.deepEqual(result.offloaded.map(item => item.path).sort(), ['feature-details/crafted/x/same-540.webp', 'feature-details/crafted/x/same.webp']);
  assert.deepEqual(result.kept.map(item => [item.src.split('/').pop(), item.reason]).sort(), [['changed.webp', 'remote-differs'], ['named.webp', 'named-in-code']]);
  assert.ok(!requested.some(url => url.endsWith('named.webp')));
  const manifest = JSON.parse(await fs.readFile(path.join(dist, 'feature-details/crafted/x/manifest.json'), 'utf8'));
  assert.equal(manifest.panels[0].src, `${CRAFTED_REMOTE_ORIGIN}/feature-details/crafted/x/same.webp`);
  assert.equal(manifest.panels[0].variants[0].src, `${CRAFTED_REMOTE_ORIGIN}/feature-details/crafted/x/same-540.webp`);
  assert.equal(manifest.panels[1].src, '/feature-details/crafted/x/changed.webp');
  assert.equal(JSON.parse(await fs.readFile(path.join(dist, 'feature-details/edition.json'), 'utf8')).crafted[0].cover.src, `${CRAFTED_REMOTE_ORIGIN}/feature-details/crafted/x/same.webp`);
  await assert.rejects(fs.access(path.join(dist, 'feature-details/crafted/x/same.webp')));
  for (const name of ['changed.webp', 'named.webp']) await fs.access(path.join(dist, 'feature-details/crafted/x', name));
});
