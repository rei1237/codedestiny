import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { JSDOM } from 'jsdom';
const require = createRequire(import.meta.url);
const free = require('../../js/core/astro/natal-reading.js');
const paid = require('../../worker/lib/astro-natal-reading.cjs');
const fixtures = JSON.parse(readFileSync('__tests__/fixtures/astro-natal-charts.json', 'utf8'));
const client = readFileSync('js/core/astro/basic-deep-client.js', 'utf8');
const FEATURE = 'astro_basic_deep_pack';
const birth = { year: 1990, month: 10, day: 14, hour: 14, minute: 30, tz: 9, lat: 37.5665, lon: 126.978 };
const success = { ok: true, status: 200, payload: { ok: true, unlocked: true, featureKey: FEATURE, html: '<div id="asStory">서버 상세 본문</div><div id="asDeep">서버 심화 본문</div>' } };
const tick = () => new Promise(resolve => setTimeout(resolve, 0));
function setup(requester) {
  const dom = new JSDOM('<div id="astroResult"><div data-astro-public-summary>무료 요약</div><section data-astro-server-detail></section></div>', { url: 'https://example.test', runScripts: 'outside-only' });
  const w = dom.window;
  w._astroBirth = { ...birth };
  w._cdAIPromptRequestJson = requester;
  w.isTileKeyUnlocked = () => true; // A forged/stale browser unlock must not grant the report.
  w.eval(client);
  const area = w.document.getElementById('astroResult');
  w.AstroBasicDeep.mount(area, w._astroBirth);
  return { dom, w, area, body: () => area.querySelector('.as-authorized-detail'), buttons: () => area.querySelectorAll('button') };
}

test('free charts, short summaries and periods match server calculations without any detailed model or generator', () => {
  assert.equal(free.renderDeep, undefined);
  for (const fixture of Object.values(fixtures)) for (const timeKnown of [true, false]) {
    const chart = timeKnown ? fixture.chart : fixture.noon;
    const opts = { timeKnown, birth: fixture.birth, today: '2026-10-05', moonDay: fixture.moonDay };
    const a = free.build(chart, opts), b = paid.build(chart, opts);
    for (const key of ['cover', 'planets', 'angles', 'aspects', 'periods', 'balance', 'stellium', 'notes']) assert.deepEqual(a[key], b[key], key);
    assert.equal(a.portrait.headline, b.portrait.headline);
    assert.equal(a.categories, undefined); assert.equal(a.deep, undefined); assert.equal(a.portrait.paragraphs, undefined);
    assert.doesNotMatch(free.render(a) + free.renderChart(a), /as-cats|as-temperament|as-deep-part/);
  }
});

test('server-only narrative tables are absent from both public source and public shared exports', () => {
  const source = readFileSync('js/core/astro/natal-reading.js', 'utf8');
  assert.doesNotMatch(source, /var SIGN_STYLE|var PROF =|function writeCategory|function deepOf|function renderDeep|function portraitOf/);
  for (const key of ['SIGN_STYLE', 'PROF', 'deepOf', 'portraitOf', 'writeCategory', 'renderDeep']) assert.equal(free._shared[key], undefined);
  const engine = readFileSync('js/saju-engine.js', 'utf8');
  assert.doesNotMatch(engine, /AstroNatalReading\.renderDeep|astroStoryHtml = .*renderDeep|\+ masterInsight|\+ birthMapSectionHtml|\+ lifeAreaSectionHtml/);
  assert.equal((engine.match(/AstroBasicDeep\.mount/g) || []).length, 2, 'normal and fallback paths mount the same server client');
});

test('401, 402 and 503 never expose detail despite local unlock, and only 402 offers the existing purchase', async () => {
  for (const status of [401, 402, 503]) {
    const t = setup(async () => ({ ok: false, status, payload: { featureKey: FEATURE, coinPrice: 30, amountKRW: 3000, html: 'MUST NOT SHOW' } }));
    await tick();
    assert.equal(t.body().textContent, '');
    assert.equal(t.buttons()[1].hidden, status !== 402);
    assert.equal(t.buttons()[2].hidden, true);
    assert.equal(t.area.querySelector('[data-astro-public-summary]').textContent, '무료 요약');
    t.dom.window.close();
  }
});

test('read uses birth facts with credentials delegated to the existing requester; no client chart or entitlement is sent', async () => {
  let seen;
  const t = setup(async (path, init) => { seen = { path, init }; return success; });
  await tick();
  assert.equal(seen.path, '/api/astro/basic-deep'); assert.equal(seen.init.method, 'POST'); assert.equal(seen.init.cache, 'no-store');
  assert.deepEqual(JSON.parse(seen.init.body), { date: '1990-10-14', time: '14:30', timeKnown: true, timezone: 9, latitude: 37.5665, longitude: 126.978 });
  assert.match(t.body().textContent, /서버 상세/);
  assert.equal(t.area.querySelector('#asStory'), null, 'server story ID must not collide with the free summary');
  assert.equal(t.buttons()[2].hidden, false);
  const input = t.w.AstroBasicDeep.inputOf({ ...birth, tz: 0, lat: 0, lon: 0, unknownHour: true });
  assert.equal(input.timezone, 0); assert.equal(input.latitude, 0); assert.equal(input.longitude, 0); assert.equal(input.timeKnown, false);
  t.dom.window.close();
});

test('network failure can be retried and unlock notification performs only another authorized read', async () => {
  let calls = 0;
  const t = setup(async () => { if (++calls === 1) throw new Error('offline'); return success; });
  await tick(); assert.equal(t.body().textContent, '');
  t.buttons()[0].click(); await tick(); assert.match(t.body().textContent, /서버 상세/);
  t.w.dispatchEvent(new t.w.CustomEvent('cd:unlocks-changed')); await tick();
  assert.equal(calls, 3); assert.match(t.body().textContent, /서버 상세/);
  t.dom.window.close();
});

test('logout, profile switch and replaced screens reject late responses and remove existing detail', async () => {
  for (const kind of ['auth', 'profile', 'replace']) {
    let release;
    const t = setup(() => new Promise(resolve => { release = resolve; }));
    if (kind === 'auth') t.w.dispatchEvent(new t.w.CustomEvent('cd:auth-changed'));
    if (kind === 'profile') { t.w._astroBirth.year = 2000; t.w.document.dispatchEvent(new t.w.CustomEvent('cd:profile-card-published')); }
    if (kind === 'replace') t.area.innerHTML = '<div>다른 차트</div>';
    release(success); await tick();
    assert.doesNotMatch(t.area.textContent, /서버 상세/);
    t.dom.window.close();
  }
  const t = setup(async () => success); await tick();
  t.w.dispatchEvent(new t.w.CustomEvent('cd:auth-changed'));
  assert.equal(t.body().textContent, ''); assert.equal(t.buttons()[2].hidden, true);
  t.dom.window.close();
});

test('PDF refreshes authority and refuses to print a stale purchased screen after revocation or outage', async () => {
  for (const status of [401, 402, 503]) {
    let calls = 0;
    const t = setup(async () => ++calls === 1 ? success : { ok: false, status, payload: {} });
    await tick(); t.buttons()[2].click(); await tick();
    assert.equal(calls, 2); assert.equal(t.body().textContent, '');
    assert.equal(t.w.document.querySelector('iframe'), null);
    t.dom.window.close();
  }
});

test('sharing reads only the free summary even when authorized detail is visible', async () => {
  const t = setup(async () => success); await tick();
  let shared;
  t.w.shareWithReward = cb => cb(); t.w.cdBuildShareUrl = () => 'https://example.test/?open=astro';
  t.w._shareText = () => '점성술'; t.w.navigator.share = async data => { shared = data; };
  const source = readFileSync('js/share.js', 'utf8');
  t.w.eval(source.slice(source.indexOf('function shareAstroKakao()'), source.indexOf('function shareSukuyoKakao()')));
  t.w.shareAstroKakao();
  assert.match(shared.text, /무료 요약/); assert.doesNotMatch(shared.text, /서버 상세|서버 심화|구매 권한/);
  t.dom.window.close();
});
