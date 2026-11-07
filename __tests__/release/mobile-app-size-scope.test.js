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
  assert.deepEqual(removed, ['M00-1200.avif', 'M00-1200.webp', 'M00-240.webp', 'M00-600.avif', 'back-1200.avif', 'back-1200.webp', 'back-240.webp', 'back-600.avif'].map(name => `assets/yeongnyangi/tarot/v1/${name}`));
  for (const name of ['M00-600.webp', 'back-600.webp']) await fs.access(path.join(folder, name));
  for (const file of ['app/yeongnyangi/_components/TarotCardArt.tsx', 'app/yeongnyangi/_components/TarotDrawRitual.tsx']) {
    const source = await fs.readFile(path.join(__dirname, '../..', file), 'utf8');
    assert.match(source, /IS_APP_BUILD\s*\?\s*null\s*:\s*art\.avifSrc|!IS_APP_BUILD && art\.avifSrc/, `${file} must not request the avif the app drops`);
  }
  await fs.rm(path.join(folder, 'M00-600.webp'));
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

test('talisman originals leave the app only when catalog, bundled and web bytes share one sha', async t => {
  const { offloadTalismanOriginals, CRAFTED_REMOTE_ORIGIN } = await import('../../scripts/build-mobile-app.mjs');
  const studio = await fs.readFile(path.join(__dirname, '../../app/app/talismans/TalismanStudio.tsx'), 'utf8');
  assert.match(studio, /fetch\(\(IS_APP_BUILD \? TALISMAN_REMOTE_ORIGIN : ""\) \+ asset\.src/);
  assert.match(studio, /TALISMAN_REMOTE_ORIGIN = "https:\/\/code-destiny\.com"/);
  assert.match(studio, /await verifyOriginal\(bytes, asset\)/, 'remote originals must still pass the sha check');
  const root = await fs.mkdtemp(path.join(os.tmpdir(), 'cd-talisman-root-'));
  const dist = path.join(root, 'dist');
  t.after(() => fs.rm(root, { recursive: true, force: true }));
  const folder = path.join(dist, 'assets/talismans/originals');
  await fs.mkdir(folder, { recursive: true });
  const ids = ['same', 'web-differs', 'local-edited', 'web-missing'];
  for (const id of ids) await fs.writeFile(path.join(folder, `${id}.png`), id === 'local-edited' ? 'edited' : `png ${id}`);
  await fs.writeFile(path.join(dist, 'assets/talismans/catalog.json'), JSON.stringify({ assets: ids.map(id => ({ id, src: `/assets/talismans/originals/${id}.png`, sha256: sha(`png ${id}`) })) }));
  const requested = [];
  const remoteHash = async url => { requested.push(url); return url.endsWith('web-missing.png') ? null : url.endsWith('web-differs.png') ? sha('other') : sha(`png ${url.split('/').pop().replace('.png', '')}`); };
  const result = await offloadTalismanOriginals({ dist, root, remoteHash, now: 1 });
  assert.deepEqual(result.offloaded.map(item => item.path), ['assets/talismans/originals/same.png']);
  assert.deepEqual(result.kept.map(item => [item.src.split('/').pop(), item.reason]).sort(), [['local-edited.png', 'local-differs'], ['web-differs.png', 'remote-differs'], ['web-missing.png', 'remote-missing']]);
  assert.ok(requested.every(url => url.startsWith(`${CRAFTED_REMOTE_ORIGIN}/assets/talismans/originals/`)));
  assert.ok(!requested.some(url => url.endsWith('local-edited.png')));
  await assert.rejects(fs.access(path.join(folder, 'same.png')));
  for (const id of ['web-differs', 'local-edited', 'web-missing']) await fs.access(path.join(folder, `${id}.png`));
});

test('each feature ships one introduction image plus one list thumbnail and every dropped variant resolves natively', async t => {
  const { consolidateIntroductionImages, APP_IMAGE_ALIAS_FILE } = await import('../../scripts/build-mobile-app.mjs');
  const activity = await fs.readFile(path.join(__dirname, '../../apps/mobile/android/app/src/main/java/com/codedestiny/app/MainActivity.java'), 'utf8');
  assert.match(activity, /AppImageAliases\.lookup\(getAssets\(\), path\)/, 'resolveRoute must serve dropped variants from the kept image');
  const dist = await fs.mkdtemp(path.join(os.tmpdir(), 'cd-intro-one-'));
  t.after(() => fs.rm(dist, { recursive: true, force: true }));
  const intro = path.join(dist, 'images/service-introductions');
  const detail = path.join(dist, 'feature-details/assets');
  await fs.mkdir(intro, { recursive: true });
  await fs.mkdir(detail, { recursive: true });
  for (const name of ['saju.webp', 'saju-320.webp', 'saju-640.webp', 'saju-960.webp', 'tarot-960.webp', 'lonely-640.webp', 'lonely.webp']) await fs.writeFile(path.join(intro, name), name);
  for (const name of ['saju-320.webp', 'saju-960.webp', 'saju-og.webp', 'tarot-960.webp', 'tarot-catalog-320.webp', 'own-320.webp', 'own-catalog-320.webp', 'own-480.webp', 'own-960.webp', 'own-960.webp.json']) await fs.writeFile(path.join(detail, name), name);
  const compared = [];
  const sameArt = async (a, b) => { compared.push(path.basename(a)); return path.basename(a) === 'saju-960.webp'; };
  const { aliases } = await consolidateIntroductionImages({ dist, sameArt });
  const left = async dir => (await fs.readdir(dir)).sort();
  assert.deepEqual(await left(intro), ['lonely-640.webp', 'lonely.webp', 'saju-320.webp', 'saju-960.webp', 'tarot-960.webp'], 'variants without a 960 stay untouched');
  assert.deepEqual(await left(detail), ['own-320.webp', 'own-960.webp', 'own-960.webp.json', 'tarot-960.webp'], 'a differing 960 copy stays as that feature\'s one image');
  assert.deepEqual(compared.sort(), ['saju-960.webp', 'tarot-960.webp']);
  assert.equal(aliases.get('/images/service-introductions/saju.webp'), '/images/service-introductions/saju-960.webp');
  assert.equal(aliases.get('/feature-details/assets/saju-960.webp'), '/images/service-introductions/saju-960.webp');
  assert.equal(aliases.get('/feature-details/assets/saju-og.webp'), '/images/service-introductions/saju-960.webp');
  assert.equal(aliases.get('/feature-details/assets/tarot-catalog-320.webp'), '/feature-details/assets/tarot-960.webp');
  assert.equal(aliases.get('/feature-details/assets/own-480.webp'), '/feature-details/assets/own-960.webp');
  // 목록 썸네일은 960 그림을 디코드하지 않게 짝인 -320 으로 간다.
  assert.equal(aliases.get('/feature-details/assets/saju-320.webp'), '/images/service-introductions/saju-320.webp');
  assert.equal(aliases.get('/feature-details/assets/own-catalog-320.webp'), '/feature-details/assets/own-320.webp');
  const table = await fs.readFile(path.join(dist, APP_IMAGE_ALIAS_FILE), 'utf8');
  assert.equal(table.trim().split('\n').length, aliases.size);
  for (const target of new Set(aliases.values())) await fs.access(path.join(dist, target));
});

test('verified dead image families leave the app, but assembled names and referenced files stay', async t => {
  const { removeVerifiedDeadImages } = await import('../../scripts/build-mobile-app.mjs');
  const dist = await fs.mkdtemp(path.join(os.tmpdir(), 'cd-dead-'));
  t.after(() => fs.rm(dist, { recursive: true, force: true }));
  const files = [
    'fuctionassets/다마고치 에셋/달 컨셉/달 컨셉 쥐.webp', 'assets/yeongnyangi/hat/moon-library-v1.webp', 'assets/yeongnyangi/mv/heaven-light-v5-ch1-320.webp',
    'assets/yeongnyangi/mv/heaven-light-v72-ch1-320.webp', 'assets/yeongnyangi/mv/heaven-light-v7-poster-960.webp', 'assets/sharing/neo-letter-v1.webp',
    'assets/yeongnyangi/report-art/cover-print.webp', 'images/destiny-island/guardians/career-v1.webp', 'assets/yeongnyangi/service-packs/tuna-gift-set-v1.webp',
  ];
  for (const rel of files) { await fs.mkdir(path.dirname(path.join(dist, rel)), { recursive: true }); await fs.writeFile(path.join(dist, rel), 'x'); }
  const removed = (await removeVerifiedDeadImages(new Set(['tuna-gift-set-v1.webp']), dist)).map(item => item.path).sort();
  assert.deepEqual(removed, ['assets/yeongnyangi/hat/moon-library-v1.webp', 'assets/yeongnyangi/mv/heaven-light-v5-ch1-320.webp', 'fuctionassets/다마고치 에셋/달 컨셉/달 컨셉 쥐.webp']);
  const art = await fs.readFile(path.join(__dirname, '../../app/yeongnyangi/_components/HeavenLightCinema.tsx'), 'utf8');
  assert.match(art, /heaven-light-v72-ch\$\{index\+1\}-320\.webp/, 'cinema must still read v72 chapter art the rule keeps');
});

test('the date archive leaves the app and the guard strips links that would point at it', async t => {
  const { removeAppForbiddenRoutes } = await import('../../scripts/build-mobile-app.mjs');
  const dist = await fs.mkdtemp(path.join(os.tmpdir(), 'cd-routes-'));
  t.after(() => fs.rm(dist, { recursive: true, force: true }));
  for (const rel of ['fortune/date/2026-11-01/rat/index.html', 'fortune/today/rat/index.html']) { await fs.mkdir(path.dirname(path.join(dist, rel)), { recursive: true }); await fs.writeFile(path.join(dist, rel), 'x'); }
  await removeAppForbiddenRoutes(dist);
  await assert.rejects(fs.access(path.join(dist, 'fortune/date')));
  await fs.access(path.join(dist, 'fortune/today/rat/index.html'));
  const guard = await fs.readFile(path.join(__dirname, '../../scripts/app-payment-guard.js'), 'utf8');
  assert.ok(guard.includes(String.raw`{ pattern: /^\/fortune\/date(\/|\?|#|$)/ },`), 'guard must strip /fortune/date links without a redirect');
});

test('foreign-language copies leave the app and their links open the Korean page or disappear', async t => {
  const { removeLocaleMirrors } = await import('../../scripts/build-mobile-app.mjs');
  const dist = await fs.mkdtemp(path.join(os.tmpdir(), 'cd-locales-'));
  t.after(() => fs.rm(dist, { recursive: true, force: true }));
  for (const rel of ['en/index.html', 'ja/tokushoho/index.html', 'zh/insights/a/index.html', 'zh-tw/index.html', 'insights/ziwei-basics/index.html']) { await fs.mkdir(path.dirname(path.join(dist, rel)), { recursive: true }); await fs.writeFile(path.join(dist, rel), 'x'); }
  assert.deepEqual(await removeLocaleMirrors(dist), ['en', 'ja(tokushoho 제외)', 'zh', 'zh-tw']);
  for (const rel of ['en', 'ja/index.html', 'zh', 'zh-tw']) await assert.rejects(fs.access(path.join(dist, rel)));
  await fs.access(path.join(dist, 'ja/tokushoho/index.html'));
  await fs.access(path.join(dist, 'insights/ziwei-basics/index.html'));

  const { JSDOM } = require('jsdom');
  const guard = await fs.readFile(path.join(__dirname, '../../scripts/app-payment-guard.js'), 'utf8');
  const dom = new JSDOM(`<!doctype html><body>
    <div id="langWrap"></div><div data-cd-locale-switcher></div>
    <a id="self" hreflang="en" href="/en/insights/ziwei-basics-en/index.html">English</a>
    <a id="other" hreflang="ja" href="https://code-destiny.com/ja/yeongnyangi/?q=1">日本語</a>
    <a id="date" href="/zh/fortune/date/2026-11-01/rat/">date</a>
    <a id="foreign" href="https://example.com/en/page">ext</a>
    <a id="legal" href="/ja/tokushoho/">特定商取引法</a>
  </body>`, { url: 'https://localhost/insights/ziwei-basics/index.html', runScripts: 'outside-only' });
  t.after(() => dom.window.close());
  dom.window.eval(guard);
  const doc = dom.window.document;
  if (doc.readyState === 'loading') await new Promise(resolve => doc.addEventListener('DOMContentLoaded', resolve));
  assert.equal(doc.getElementById('self'), null, 'a link to the page being read is removed');
  assert.equal(doc.getElementById('other').getAttribute('href'), '/yeongnyangi/?q=1');
  assert.equal(doc.getElementById('other').hasAttribute('hreflang'), false);
  assert.equal(doc.getElementById('date'), null, 'a Korean twin inside a pruned route is removed');
  assert.equal(doc.getElementById('foreign').getAttribute('href'), 'https://example.com/en/page');
  assert.equal(doc.getElementById('legal').getAttribute('href'), '/ja/tokushoho/', 'the Japanese legal notice stays in the app');
  assert.equal(doc.getElementById('cdAppLocaleSwitcherHidden').textContent, '#langWrap,[data-cd-locale-switcher]{display:none!important}');
  const switcher = await fs.readFile(path.join(__dirname, '../../app/components/LocaleSwitcher.tsx'), 'utf8');
  assert.match(switcher, /<div data-cd-locale-switcher=""/, 'the React switcher keeps the marker the guard hides');
});
