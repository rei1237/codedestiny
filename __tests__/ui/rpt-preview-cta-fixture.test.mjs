import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import { JSDOM } from 'jsdom';
import { isFreeFortuneFeatureKey } from '../../lib/payment/free-fortune-policy.mjs';

const read = p => fs.readFileSync(p, 'utf8');
const source = read('scripts/verify-rpt-preview-cta-flow.mjs');
const dashboard = read('js/core/saju/reportDashboard.js');
const shell = read('index.html');
const fixture = source.slice(source.indexOf('async function installFixture('), source.indexOf('\nasync function clickTileAndRead('));
async function install(options, paidMarkup = true) {
  const paid = shell.match(/<a\b[^>]*data-feature-key="yoga-guru-per-use"[^>]*>[\s\S]*?<\/a>/)?.[0];
  assert.ok(paid, 'paid control exists in the production shell');
  const dom = new JSDOM(paidMarkup ? paid : '', { runScripts: 'dangerously', url: 'http://localhost/index.html' });
  dom.window.scrollTo = () => {};
  dom.window.isTileKeyUnlocked = isFreeFortuneFeatureKey;
  dom.window.CodeDestinyFeaturePricingStore = { cache: {} };
  const context = { cdp: {}, FREE_KEY: 'rpt_quantumCard', PAID_KEY: 'yoga-guru-per-use',
    evaluate: async (_cdp, expression) => dom.window.eval(expression) };
  vm.runInNewContext(fixture + '\nthis.install = installFixture;', context);
  try { await context.install(options); } catch (error) { dom.window.close(); throw error; }
  return dom;
}

test('exact free keys and real paid exceptions cannot drift into invented aliases', () => {
  for (const key of ['rpt_quantumCard', 'destiny_meeting_place']) assert.equal(isFreeFortuneFeatureKey(key), true, key);
  for (const key of ['rpt_destinyMeetingPlace', 'yoga-guru-per-use', 'section_summary', 'section_daewun', 'saju_lifetime_bundle', 'human-design-report']) assert.equal(isFreeFortuneFeatureKey(key), false, key);
  assert.ok(source.indexOf('RPT fixture 무료/유료 예외 정책 불일치') < source.indexOf('await startStaticServer()'));
});

test('free fixture mirrors current dashboard attributes without fake purchase/grant/cache seed', async () => {
  assert.match(dashboard, /data-pvw-free="1"/);
  assert.match(dashboard, /onclick="toggleReportFeatureCard\(this\)"/);
  assert.match(dashboard, /block\.coinCost\s*=\s*0/);
  const dom = await install();
  try {
    const b = dom.window.document.getElementById('cdRptFixtureBtn');
    assert.equal(b.getAttribute('onclick'), 'toggleReportFeatureCard(this)');
    assert.equal(b.dataset.featureKey, 'rpt_quantumCard');
    assert.equal(b.dataset.pvwFree, '1');
    for (const a of ['data-action', 'data-tile-lock-key', 'data-tile-lock-cost', 'data-coin-cost']) assert.equal(b.hasAttribute(a), false, a);
    assert.equal(dom.window.__cdFeatureMarketingPreviewPaidOnly, true);
    assert.deepEqual(Object.keys(dom.window.CodeDestinyFeaturePricingStore.cache), []);
    b.click(); assert.equal(dom.window.__cdRptToggleCalls, 1); assert.equal(b.getAttribute('aria-expanded'), 'true');
    b.click(); assert.equal(dom.window.__cdRptToggleCalls, 2); assert.equal(b.getAttribute('aria-expanded'), 'false');
    assert.doesNotMatch(fixture, /_cdFinalizeUnlockState|accessGrant:/);
  } finally { dom.window.close(); }
});

test('all-preview mode is explicit and retains browser duplicate-handler/lifecycle assertions', async () => {
  const dom = await install({ allPreviews: true });
  try { assert.equal(dom.window.__cdFeatureMarketingPreviewPaidOnly, false); } finally { dom.window.close(); }
  for (const assertion of ['unlockedFirst.toggleCalls === 0', 'unlockedCta.toggleCalls === 1', 'unlockedSecond.toggleCalls === 2', '!unlockedSecond.previewOpen', '!unlockedSecond.blockOpen', 'unlockedThird.previewOpen', 'unlockedThird.toggleCalls === 2']) assert.ok(source.includes(assertion), assertion);
  assert.ok(source.includes("quantum-saju-480.webp"));
});

test('self-gated route fixture has actual direct action and no shell billing metadata', async () => {
  assert.match(dashboard, /lockKey: 'destiny_meeting_place'/);
  assert.match(dashboard, /action: 'openDestinyMeetingPlaceRoute'/);
  assert.match(dashboard, /if \(!b\.selfGated && !shouldAttachTileLock/);
  const dom = await install({ kind: 'route' });
  try {
    const b = dom.window.document.getElementById('cdRptFixtureBtn');
    assert.equal(b.dataset.action, 'openDestinyMeetingPlaceRoute');
    for (const a of ['onclick', 'aria-expanded', 'data-feature-key', 'data-tile-lock-key', 'data-coin-cost', 'data-pvw-free']) assert.equal(b.hasAttribute(a), false, a);
    assert.ok(source.includes('route.routeCalls === 1'));
    assert.doesNotMatch(source, /routeTarget/);
  } finally { dom.window.close(); }
});

test('production meeting-place mapping and handler navigate to the canonical route', () => {
  const mapping = dashboard.match(/var DESTINY_MEETING_PLACE_FEATURE = \{[\s\S]*?\n\};/)?.[0];
  const handler = dashboard.match(/window\.openDestinyMeetingPlaceRoute = function\(\) \{[\s\S]*?\n\};/)?.[0];
  assert.ok(mapping, 'production feature mapping must exist');
  assert.ok(handler, 'production route handler must exist');
  const calls = [];
  let denyAssign = false;
  const context = {
    _reportDashboardText: key => key,
    window: {
      location: { assign: url => { if (denyAssign) throw new Error('test navigation rejection'); calls.push(['assign', url]); } },
      open: (url, target) => calls.push(['open', url, target]),
    },
  };
  vm.runInNewContext(mapping + '\n' + handler, context);
  const feature = context.DESTINY_MEETING_PLACE_FEATURE;
  assert.equal(feature.href, '/saju/destiny-meeting-place');
  assert.equal(feature.action, 'openDestinyMeetingPlaceRoute');
  assert.equal(feature.lockKey, 'destiny_meeting_place');
  assert.equal(feature.selfGated, true);
  context.window[feature.action]();
  assert.deepEqual(calls.splice(0), [['assign', '/saju/destiny-meeting-place']]);
  // Execute the actual handler's fallback, not a duplicate fixture implementation.
  denyAssign = true;
  context.window[feature.action]();
  assert.deepEqual(calls.splice(0), [['open', '/saju/destiny-meeting-place', '_blank']]);
  denyAssign = false;
  feature.href = '';
  context.window[feature.action]();
  assert.deepEqual(calls.splice(0), [['assign', '/saju/destiny-meeting-place']]);
});

test('paid control clones a real current tile and fails closed if missing', async () => {
  const dom = await install({ kind: 'paid' });
  try {
    const b = dom.window.document.getElementById('cdRptFixtureBtn');
    assert.equal(b.dataset.featureKey, 'yoga-guru-per-use');
    assert.equal(b.dataset.coinCost, '50');
    assert.equal(b.dataset.action, 'openYogaGuru');
    assert.equal(b.getAttribute('href'), '/yoga-guru.html');
  } finally { dom.window.close(); }
  await assert.rejects(install({ kind: 'paid' }, false), /실제 유료 대조 타일 없음/);
});

test('login is reported separately, never counted as successful payment', () => {
  assert.doesNotMatch(source, /paymentEntered/);
  assert.match(source, /loginRequired: location\.pathname\.indexOf\('\/login'\) === 0/);
  assert.match(source, /paidGateOpen: !!\(gate && gate\.classList\.contains\('is-open'\)\)/);
  assert.ok(source.includes('paidCta.toggleCalls === 0 && !paidCta.blockOpen'));
});

test('route still owns fresh authentication, late-result invalidation and historical restoration', () => {
  const route = read('app/saju/destiny-meeting-place/components/DestinyMeetingPlacePage.tsx');
  assert.match(route, /await hasFreeReadingSession\(\)/);
  assert.match(route, /if \(!request\.valid\(\)\) return/);
  assert.match(route, /if \(!signedIn\)/);
  assert.match(route, /usePaidResume\(FEATURE_KEY/);
  assert.match(route, /if \(!ticket\.valid\(\)\) return false/);
  assert.match(route, /setResult\(null\); setMeta\(null\)/);
  assert.match(route, /cd:auth-session-invalidated/);
  assert.match(route, /cd:profile-changed/);
  assert.doesNotMatch(route, /runPaidAccessGate\(/);
  const guard = read('app/_lib/use-free-reading-guard.ts');
  assert.match(guard, /popstate/);
  assert.match(read('app/_lib/free-reading-access.ts'), /\/api\/auth\/me/);
});
