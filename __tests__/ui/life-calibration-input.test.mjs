// 인생 보정 P2 입력 화면(2026-11-28): 클라이언트 상태·검증, 플래그 OFF 무변화, API 클라이언트(네트워크 mock).
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { build } from 'esbuild';
import { JSDOM } from 'jsdom';
import { LIFE_CALIBRATION_INPUT_ENABLED, lifeCalibrationInputEnabled } from '../../lib/life-calibration/flags.mjs';
import {
  canAddEntry, createEntry, fromApiEvents, legacyToEntries, noteNeedsCaution, patternSummary, readSelfHint,
  toApiEvents, validateEntries, validateEntry, writeSelfHint, yearRange,
} from '../../lib/life-calibration/input-state.mjs';
import { normalizeLifeEvents } from '../../lib/life-calibration/life-events.mjs';

const read = (p) => fs.readFileSync(p, 'utf8');
const memoryStorage = () => { const m = new Map(); return { getItem: (k) => (m.has(k) ? m.get(k) : null), setItem: (k, v) => m.set(k, String(v)) }; };

// ── 상태·검증 ──
test('validation mirrors the server rules and never echoes note text', () => {
  const ok = createEntry(2015, { domain: 'career', outcome: 'good', intensity: 3 });
  assert.deepEqual(validateEntry(ok, { birthYear: 1990, nowYear: 2026 }), []);
  assert.deepEqual(validateEntry({ ...ok, year: 1989 }, { birthYear: 1990, nowYear: 2026 }), ['year_range']);
  assert.deepEqual(validateEntry({ ...ok, year: 2027 }, { birthYear: 1990, nowYear: 2026 }), ['year_range']);
  assert.deepEqual(validateEntry({ ...ok, domain: null }, { nowYear: 2026 }), ['domain_required']);
  assert.deepEqual(validateEntry({ ...ok, domain: 'health' }, { nowYear: 2026 }), ['domain_invalid']);
  assert.deepEqual(validateEntry({ ...ok, month: 13, intensity: 4 }, { nowYear: 2026 }), ['month_range', 'intensity_range']);
  const secret = 'x'.repeat(81);
  const errs = validateEntry({ ...ok, note: secret }, { nowYear: 2026 });
  assert.deepEqual(errs, ['note_long']);
  assert.ok(!JSON.stringify(errs).includes('xxx'));
  const dup = { ...ok, id: 'other' };
  assert.deepEqual(validateEntry(dup, { nowYear: 2026, others: [ok] }), ['duplicate']);
  const all = validateEntries([ok, dup], { nowYear: 2026 });
  assert.equal(all.ok, false);
  assert.deepEqual(Object.keys(all.byId).sort(), [ok.id, 'other'].sort());
});

test('entry limit, year range and payload shape match the server normalizer', () => {
  const twelve = Array.from({ length: 12 }, (_, i) => createEntry(2000 + i, { domain: 'money' }));
  assert.equal(canAddEntry(twelve.slice(0, 11)), true);
  assert.equal(canAddEntry(twelve), false);
  assert.equal(validateEntries([...twelve, createEntry(2020, { domain: 'study' })], { nowYear: 2026 }).tooMany, true);
  assert.deepEqual(yearRange(2020, 2026), [2020, 2021, 2022, 2023, 2024, 2025, 2026]);
  assert.equal(yearRange(undefined, 2026).length, 30);
  const entries = [createEntry(2018, { domain: 'family', outcome: 'bad', note: '  이사  ', certainty: 'unsure' }), createEntry(2012, { domain: 'study', month: 3 })];
  const payload = toApiEvents(entries);
  assert.deepEqual(payload.map((e) => e.year), [2012, 2018]);
  assert.equal(payload[1].note, '이사');
  assert.deepEqual(Object.keys(payload[0]).sort(), ['certainty', 'channel', 'domain', 'intensity', 'month', 'note', 'outcome', 'source', 'year']);
  const normalized = normalizeLifeEvents(payload, { minYear: 1990, maxYear: 2026 });
  assert.equal(normalized.length, 2, 'the server normalizer accepts the payload as is');
  const back = fromApiEvents([...payload, { year: 2019, outcome: 'ordinary' }, { year: 2020, outcome: 'skip' }]);
  assert.equal(back.length, 2, 'outcomes outside the input choices are not drawn');
});

test('legacy v2 calibration becomes a draft only (domain unknown stays empty, health is not carried)', () => {
  const draft = legacyToEntries({ v: 2, periods: [
    { polarity: 'good', age: 21, area: 'love', intensity: 3, note: ' 첫\n연애 ' },
    { outcome: 'bad', year: 2010, area: 'health' },
    { outcome: 'good', year: 2030 },
    { outcome: 'ordinary', year: 2011 },
  ] }, { birthYear: 1990, nowYear: 2026 });
  assert.equal(draft.length, 2);
  assert.deepEqual(draft.map((e) => [e.year, e.domain, e.outcome, e.channel]), [[2010, null, 'bad', 'legacy_local'], [2010, 'relationship', 'good', 'legacy_local']]);
  assert.equal(draft[1].note, '첫 연애');
  assert.deepEqual(legacyToEntries({ v: 1, periods: [{ outcome: 'good', year: 2010 }] }), []);
  const screen = read('app/profile/life/LifeCalibrationScreen.tsx');
  assert.ok(!/putEvents\([^)]*legacy/.test(screen), 'legacy draft is never uploaded directly');
  assert.ok(screen.includes('if (!events.length && !legacyOfferDone(storage(), profileId))'), 'offered once, only when the server is empty');
});

test('note caution, self hint and pattern summary', () => {
  assert.equal(noteNeedsCaution('우울증 치료 시작'), true);
  assert.equal(noteNeedsCaution('이직 성공'), false);
  assert.equal(noteNeedsCaution('   '), false);
  const s = memoryStorage();
  assert.equal(readSelfHint(s, 'acct'), '');
  writeSelfHint(s, 'acct', 'p1');
  assert.equal(readSelfHint(s, 'acct'), 'p1');
  assert.equal(readSelfHint(s, ''), '');
  assert.deepEqual(patternSummary([createEntry(2010, { domain: 'career' })]), { kind: 'none' });
  assert.deepEqual(patternSummary([createEntry(2010, { domain: 'career' }), createEntry(2014, { domain: 'career' })]), { kind: 'good', domain: 'career' });
  assert.deepEqual(patternSummary([createEntry(2010, { domain: 'money', outcome: 'mixed' }), createEntry(2014, { domain: 'money', outcome: 'mixed' })]), { kind: 'both', domain: 'money' });
  assert.deepEqual(patternSummary([createEntry(2010, { domain: 'money' }), createEntry(2014, { domain: 'study', outcome: 'bad' })]), { kind: 'spread' });
});

// ── 플래그 OFF: 사용자가 보는 것이 바뀌지 않는다 ──
test('flag is off and the dev-only preview cannot open it in a production build', () => {
  assert.equal(LIFE_CALIBRATION_INPUT_ENABLED, false);
  assert.equal(lifeCalibrationInputEnabled({ nodeEnv: 'production', search: '?lcPreview=1' }), false);
  assert.equal(lifeCalibrationInputEnabled({ nodeEnv: 'test', search: '?lcPreview=1' }), false);
  assert.equal(lifeCalibrationInputEnabled({ nodeEnv: 'development', search: '' }), false);
  assert.equal(lifeCalibrationInputEnabled({ nodeEnv: 'development', search: '?lcPreview=true' }), false);
  assert.equal(lifeCalibrationInputEnabled({ nodeEnv: 'development', search: '?lcPreview=1' }), true);
  const shell = read('js/destiny-profile.js');
  const m = shell.match(/^\s*var LIFE_CALIBRATION_INPUT_ENABLED = (true|false);$/m);
  assert.ok(m, 'static shell constant is bound');
  assert.equal(m[1] === 'true', LIFE_CALIBRATION_INPUT_ENABLED, 'static shell and app flag agree');
  for (const mirror of ['public/js/destiny-profile.js']) assert.equal(read(mirror), shell, `${mirror} is synced`);
});

test('route is private: noindex, canonical, sitemap and robots exclude /profile/', async () => {
  const layout = read('app/profile/life/layout.tsx');
  assert.ok(layout.includes('robots: ROBOTS_META.NOINDEX'));
  assert.ok(layout.includes('canonical: "/profile/life/"'));
  const policy = read('lib/seo/index-policy.mjs');
  assert.ok(policy.includes('privatePrefix("/profile")'));
  assert.ok(!read('public/sitemap.xml').includes('/profile/'), 'not in the sitemap');
});

async function bundleRoute(nodeEnv) {
  const out = await build({
    stdin: {
      contents: "import { createElement } from 'react'; import { createRoot } from 'react-dom/client'; import C from './app/profile/life/LifeCalibrationRouteClient'; globalThis.__lcRender = async (el) => { const root = createRoot(el); root.render(createElement(C)); for (let i = 0; i < 20; i += 1) await new Promise((r) => setTimeout(r, 5)); return root; };",
      resolveDir: process.cwd(), loader: 'tsx',
    },
    bundle: true, write: false, format: 'iife', platform: 'browser', jsx: 'automatic',
    define: { 'process.env.NODE_ENV': JSON.stringify(nodeEnv) },
    plugins: [{ name: 'mocks', setup(b) {
      b.onResolve({ filter: /^next\/dynamic$/ }, () => ({ path: 'dynamic', namespace: 'mock' }));
      b.onResolve({ filter: /useT$/ }, () => ({ path: 'useT', namespace: 'mock' }));
      b.onResolve({ filter: /\.module\.css$/ }, () => ({ path: 'css', namespace: 'mock' }));
      b.onLoad({ filter: /^dynamic$/, namespace: 'mock' }, () => ({ contents: 'export default function dynamic(){ return function Screen(){ window.__lcScreenRendered = true; return null; }; }' }));
      b.onLoad({ filter: /^useT$/, namespace: 'mock' }, () => ({ contents: 'export const useTPick=()=>()=>"";' }));
      b.onLoad({ filter: /^css$/, namespace: 'mock' }, () => ({ contents: 'export default new Proxy({}, { get: (_, k) => String(k) });' }));
    } }],
  });
  return out.outputFiles[0].text;
}

async function renderRoute(nodeEnv, search) {
  const dom = new JSDOM('<html lang="ko"><body><div id="root"></div></body></html>', { url: `https://example.com/profile/life/${search}`, runScripts: 'outside-only' });
  const win = dom.window;
  const calls = [];
  win.fetch = async (...a) => { calls.push(a); throw new Error('network is mocked'); };
  win.eval(await bundleRoute(nodeEnv));
  await win.__lcRender(win.document.getElementById('root'));
  return { dom, win, calls };
}

test('flag off: the route renders the placeholder, never loads the input screen, and makes no API call', async () => {
  for (const search of ['', '?lcPreview=1', '?profileId=p1']) {
    const { dom, win, calls } = await renderRoute('production', search);
    assert.ok(win.document.querySelector('[data-life-calibration="off"]'), `placeholder for ${search || '(none)'}`);
    assert.equal(win.__lcScreenRendered, undefined);
    assert.equal(calls.length, 0);
    dom.window.close();
  }
  const dev = await renderRoute('development', '?lcPreview=1');
  assert.equal(dev.win.__lcScreenRendered, true, 'the check is not vacuous: the local preview does open the screen');
  dev.dom.window.close();
});

test('flag off: saving a profile in the static shell draws no new link', () => {
  const shell = read('js/destiny-profile.js');
  const start = shell.indexOf('  var LIFE_CALIBRATION_INPUT_ENABLED = false;');
  const end = shell.indexOf('\n  }\n', shell.indexOf('function _dpShowLifeCalibrationNudge')) + 4;
  const snippet = shell.slice(start, end);
  const dom = new JSDOM('<body><div><button id="dpSaveBtn"></button></div></body>', { runScripts: 'outside-only' });
  const win = dom.window;
  win._dpText = () => 'nudge';
  win.eval(`${snippet}\nwindow.__nudge = _dpShowLifeCalibrationNudge;`);
  assert.equal(win.__nudge('p1'), null);
  assert.equal(win.document.getElementById('dpLifeCalibrationNudge'), null);
  win.eval(`${snippet.replace('var LIFE_CALIBRATION_INPUT_ENABLED = false;', 'var LIFE_CALIBRATION_INPUT_ENABLED = true;')}\nwindow.__nudgeOn = _dpShowLifeCalibrationNudge;`);
  const link = win.__nudgeOn('p 1');
  assert.equal(link.getAttribute('href'), '/profile/life/?profileId=p%201');
  dom.window.close();
  assert.ok(shell.includes("_dpUpdateSaveBtn();\n      _dpShowLifeCalibrationNudge(createProfileId);"), 'called after a successful save');
  for (const loc of ["ko: {", "en: {", "ja: {", "'zh-CN': {", "'zh-TW': {"]) {
    const at = shell.indexOf(`    ${loc}\n`);
    assert.ok(shell.slice(at, at + 200).includes('lifeCalibrationNudge:'), `nudge text for ${loc}`);
  }
});

// ── API 클라이언트(authFetch mock) ──
async function loadClient() {
  const out = await build({
    stdin: { contents: "export * from './app/_lib/life-calibration-client';", resolveDir: process.cwd(), loader: 'ts' },
    bundle: true, write: false, format: 'cjs', platform: 'node',
    plugins: [{ name: 'mocks', setup(b) {
      b.onResolve({ filter: /auth-client$/ }, () => ({ path: 'auth', namespace: 'mock' }));
      b.onLoad({ filter: /^auth$/, namespace: 'mock' }, () => ({ contents: 'export const authFetch=(...a)=>globalThis.__lcAuth(...a);' }));
    } }],
  });
  const mod = { exports: {} };
  new Function('require', 'module', 'exports', out.outputFiles[0].text)(() => ({}), mod, mod.exports);
  return mod.exports.lifeCalibrationApi;
}
const reply = (status, body) => ({ ok: status < 400, status, json: async () => body });

test('API client sends the expected requests and reads error codes', async () => {
  const api = await loadClient();
  const seen = [];
  globalThis.__lcAuth = async (url, init) => { seen.push({ url, method: init.method, body: init.body ? JSON.parse(init.body) : null, credentials: init.credentials, cache: init.cache }); return reply(200, { ok: true, granted: true, version: 'v1', events: [] }); };
  assert.deepEqual(await api.getConsent(), { ok: true, data: { ok: true, granted: true, version: 'v1', events: [] } });
  await api.setConsent(true, true);
  await api.setConsent(false);
  await api.setSelf('p1');
  await api.getEvents('p/1');
  await api.putEvents('p1', [{ year: 2010 }]);
  assert.deepEqual(seen.map((s) => `${s.method} ${s.url}`), [
    'GET /api/life-calibration/consent', 'POST /api/life-calibration/consent', 'POST /api/life-calibration/consent',
    'POST /api/life-calibration/self', 'GET /api/life-calibration/events?profileId=p%2F1', 'PUT /api/life-calibration/events',
  ]);
  assert.deepEqual(seen[1].body, { granted: true, source: 'profile_form', age14Attested: true });
  assert.deepEqual(seen[2].body, { granted: false, source: 'profile_form' });
  assert.deepEqual(seen[5].body, { profileId: 'p1', events: [{ year: 2010 }] });
  assert.ok(seen.every((s) => s.credentials === 'include' && s.cache === 'no-store'));

  const cases = [
    [reply(403, { ok: false, code: 'PROFILE_NOT_SELF' }), 'PROFILE_NOT_SELF'],
    [reply(400, { ok: false, error: { code: 'INVALID_LIFE_EVENT' } }), 'INVALID_LIFE_EVENT'],
    [reply(503, { ok: false, error: 'note_encryption_unavailable' }), 'NOTE_ENCRYPTION_UNAVAILABLE'],
    [reply(404, null), 'HTTP_404'],
    [reply(200, { ok: false }), 'HTTP_200'],
  ];
  for (const [response, code] of cases) {
    globalThis.__lcAuth = async () => response;
    const r = await api.getEvents('p1');
    assert.equal(r.ok, false);
    assert.equal(r.code, code);
  }
  globalThis.__lcAuth = async () => { throw new Error('offline'); };
  assert.deepEqual(await api.getConsent(), { ok: false, status: 0, code: 'NETWORK_ERROR' });
  delete globalThis.__lcAuth;
});

test('copy follows the rules: no training claim, no accuracy promise, no health domain, all locales authored', () => {
  const copy = read('app/profile/life/life-copy.ts').replace(/^\/\/.*$/gm, '');
  assert.ok(!/학습/.test(copy), 'no training claim either way');
  assert.ok(!/정확(도|해)|적중|맞춰 드|100%/.test(copy), 'no accuracy promise');
  assert.ok(!/domain_health|건강/.test(copy), 'no health tag');
  const authored = JSON.parse(read('i18n/authored/lifeCalibration-01.json'));
  const keys = [...copy.matchAll(/^\s{2}(\w+): "/gm)].map((m) => m[1]);
  for (const loc of ['en', 'ja', 'zh-CN', 'zh-TW']) {
    const pub = JSON.parse(read(`public/i18n/${loc.toLowerCase()}/lifeCalibration.json`));
    for (const k of keys) assert.ok(typeof pub.lifeCalibration[k] === 'string' && pub.lifeCalibration[k], `${loc} ${k}`);
  }
  assert.ok(authored);
});
