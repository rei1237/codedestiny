const test = require('node:test');
const assert = require('node:assert/strict');
const { readFileSync } = require('node:fs');
const { resolve } = require('node:path');

(async () => {
const { isInventorySource, inspectSource, sourceCopies, sourceRoute, readMusicManifest, unresolvedInventory, applyInventoryReviews } = await import('../../scripts/lib/payment-inventory.mjs');
const policy = await import('../../lib/music-access-policy.js');

test('tracked native and independent public sources stay in the inventory', () => {
  for (const file of ['apps/mobile/android/Payment.java', 'apps/mobile/ios/Store.swift', 'public/standalone/checkout.html', 'app/new-feature/page.tsx', 'worker/routes/payment.js']) {
    assert.equal(isInventorySource(file), true, file);
  }
  for (const file of ['.claude/worktrees/old/index.html', '.codex-worktrees/old/index.html', 'reports/result.json', 'worker/build-cache/bundle.js', 'docs/archive/payment.md', '__tests__/worker/payment.test.js']) {
    assert.equal(isInventorySource(file), false, file);
  }
});

test('only actual route files establish routes; components do not invent routes', () => {
  assert.equal(sourceRoute('app/(features)/music/page.tsx'), '/music/');
  assert.equal(sourceRoute('app/music/MusicPlayer.tsx'), null);
  assert.equal(sourceRoute('public/external/checkout.html'), '/external/checkout.html');
});

test('HTML comments and structured data cannot masquerade as executable gates', () => {
  const source = '<!-- <script>fakePurchase( -->\n<script type="application/ld+json">{"payment":true}</script>\n<script>\nwindow["purchaseFeature"]({featureKey:"track"});\n</script>';
  const row = inspectSource('public/checkout.html', source, new Set(['track']));
  assert.deepEqual(row.parseErrors, []);
  assert.deepEqual(row.calls, [{ name: 'purchaseFeature', line: 4, review: 'UNREVIEWED' }]);
  assert.ok(row.features.some(ref => ref.key === 'track' && ref.line === 4));
});

test('helper text and predicates are not counted as payment boundary calls', () => {
  const row = inspectSource('app/new/page.tsx', '_cdPaymentI18n("key"); isTileKeyUnlocked("x"); requestPayment({});', new Set());
  assert.deepEqual(row.calls, [{ name: 'requestPayment', line: 1, review: 'UNREVIEWED' }]);
});

test('bad executable syntax remains a blocking diagnostic', () => {
  const row = inspectSource('app/new/page.tsx', 'purchaseFeature({', new Set());
  assert.ok(row.parseErrors.length);
});

test('duplicate file names do not hide changed public payment code', () => {
  const rows = sourceCopies([
    { file: 'js/payment.js', sha256: 'a' },
    { file: 'public/js/payment.js', sha256: 'b' },
    { file: 'public/copy.js', sha256: 'a' },
  ]);
  assert.equal(rows[1].mirrorOf, null);
  assert.equal(rows[2].mirrorOf, 'js/payment.js');
});

test('actual music manifest expansion derives unique downloadable products', () => {
  const source = readFileSync(resolve(__dirname, '../../app/music/_data/musicManifest.ts'), 'utf8');
  const result = readMusicManifest(source, policy);
  assert.ok(result.products.length > 0);
  for (const track of result.products) {
    assert.equal(track.purchaseFeatureKey, policy.buildMusicTrackFeatureKey(track.audioSourceKey));
    assert.equal(track.priceKRW, policy.MUSIC_TRACK_UNLOCK_PRICE_KRW);
  }
  assert.equal(new Set(result.products.map(t => t.purchaseFeatureKey)).size, result.products.length);
});

test('manifest execution fails closed for a new I/O dependency', () => {
  assert.throws(() => readMusicManifest('import { readFile } from "node:fs"; export const tracks = readFile("secret");', policy), /Unreviewed manifest dependency/);
});

test('unreviewed new purchase call and unreviewed product cannot pass coverage', () => {
  const row = inspectSource('app/new/page.tsx', 'purchaseFeature({featureKey:"new"});', new Set(['new']));
  const issues = unresolvedInventory({ products: [{ id: 'new', review: 'UNREVIEWED' }], sources: [row] });
  assert.ok(issues.includes('PRODUCT_UNREVIEWED:new'));
  assert.ok(issues.includes('CALL_UNREVIEWED:app/new/page.tsx:1'));
  assert.deepEqual(unresolvedInventory({ products: [], sources: [] }), ['EMPTY_INVENTORY']);
});

test('source changes invalidate previous review and cannot hide newly added calls', () => {
  const row = inspectSource('app/new/page.tsx', 'purchaseFeature({});', new Set());
  const result = applyInventoryReviews({ products: [], sources: [row] }, { sources: {
    [row.file]: { sha256: 'old-hash', role: 'entry', rationale: 'previous inspection', calls: [{ name: 'purchaseFeature', line: 1, rationale: 'reviewed' }] },
  } });
  assert.deepEqual(result, ['INVALID_SOURCE_REVIEW:app/new/page.tsx']);
  assert.equal(row.calls[0].review, 'UNREVIEWED');
});
})().catch(error => { console.error(error); process.exitCode = 1; });
