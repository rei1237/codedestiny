import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import { readFileSync } from 'node:fs';
import * as flags from '../../lib/guided-flow/flags.mjs';
import { ASTRO_DRAFT_KEY, ASTRO_SHELL_ENTRY, BIRTH_DRAFT_TARGETS, writeBirthDraft } from '../../lib/guided-flow/astro-draft.mjs';

// R5 숙요·베다 진입(2026-11-21 사용자 "승인 받지 않은 부분에 대해서는 권장안으로 진행해줘"): 점성술과 같은 계약을 /sukuyo/·/vedic/ 에 붙인다.
const shell = readFileSync('js/destiny-profile.js', 'utf8');

function setup({ source = shell, profile = null, pathname = '/ggulggul/' } = {}) {
  const events = {}, state = new Map(), opened = [], replaced = [], applied = [];
  let creates = 0;
  const ctx = {
    DPStorage: { current: () => profile }, _dpProfileSaveInFlight: false, setTimeout: () => 0,
    sessionStorage: { setItem: (k, v) => state.set(k, String(v)), removeItem: (k) => state.delete(k), getItem: (k) => (state.has(k) ? state.get(k) : null) },
    document: { addEventListener: (n, fn) => { events[n] = fn; } },
    window: { addEventListener: (n, fn) => { events[n] = fn; }, _dpOpenFortuneType: (t) => opened.push(t), dpStartProfileCreate: () => { creates += 1; },
      location: pathname ? { pathname, replace: (url) => replaced.push(url) } : undefined },
    _dpResolveCurrentProfileForSaju: () => profile, _dpHasValidProfileDate: (y, m, d) => !!(y && m && d), _dpSyncProfileFormToCurrent() {}, _toast() {},
    _dpHasSessionHint: () => false, _dpLoadFromServer: (cb) => cb(false),
    _dpApplyProfileToForm: (p) => applied.push(p),
  };
  vm.runInNewContext(source.slice(source.indexOf('  var _dpHomeEntryKey ='), source.indexOf('  window.cdOneStepFreeSajuEntry =')), ctx);
  return { ctx, state, opened, replaced, applied, creates: () => creates };
}
const draft = { name: '하늘', gender: 'F', birth: { year: 1995, month: 3, day: 4, hour: null, minute: null, timeUnknown: true, calType: 'lunar' } };
const KINDS = [
  { type: 'sukuyo', flag: 'GUIDED_SUKUYO_ENABLED', entry: 'cdHomeSukuyoEntry', landing: '/sukuyo/?step=name', page: 'app/sukuyo/page.js' },
  { type: 'vedic', flag: 'GUIDED_VEDIC_ENABLED', entry: 'cdHomeVedicEntry', landing: '/vedic/?step=name', page: 'app/vedic/page.js' },
];

test('flags, draft keys and entry/landing addresses are mirrored in the static shell', () => {
  for (const k of KINDS) {
    const m = new RegExp(String.raw`^ *var ${k.flag} = (true|false);$`, 'm').exec(shell);
    assert.ok(m, `${k.flag} missing in shell`);
    assert.equal(m[1] === 'true', flags[k.flag], k.flag);
    const t = BIRTH_DRAFT_TARGETS[k.type];
    assert.equal(t.entry, `/ggulggul/?action=${k.entry}`);
    assert.equal(t.landing, k.landing);
    assert.ok(shell.includes(`key: '${t.key}'`) && shell.includes(`landing: '${k.landing}'`), k.type);
  }
  assert.equal(BIRTH_DRAFT_TARGETS.astro.key, ASTRO_DRAFT_KEY);
  assert.equal(BIRTH_DRAFT_TARGETS.astro.entry, ASTRO_SHELL_ENTRY);
  assert.equal(new Set(Object.values(BIRTH_DRAFT_TARGETS).map((t) => t.key)).size, 3, 'each service has its own draft key');
});

test('profile-less entry goes to its own guided input once, then falls back to the form', () => {
  for (const k of KINDS) {
    const h = setup();
    h.ctx.window[k.entry]();
    assert.deepEqual(h.replaced, [k.landing], k.type);
    assert.equal(h.creates(), 0);
    h.ctx.window[k.entry]();
    assert.equal(h.replaced.length, 1, 'no loop');
    assert.equal(h.creates(), 1);
  }
});

test('a fresh draft fills the profile form for its own service only', () => {
  for (const k of KINDS) {
    const h = setup({ profile: { birth: { year: 1990, month: 1, day: 1 } } });
    assert.equal(writeBirthDraft(h.ctx.sessionStorage, BIRTH_DRAFT_TARGETS[k.type].key, draft), true);
    h.ctx.window[k.entry]();
    assert.deepEqual(h.replaced, []); assert.equal(h.creates(), 1); assert.equal(h.applied.length, 1);
    assert.equal(h.state.has(BIRTH_DRAFT_TARGETS[k.type].key), false, 'consumed once');
    assert.equal(h.state.get('cd:home-fortune-intent:v1'), k.type);
    assert.deepEqual(h.opened, []);
    // 다른 서비스 초안은 이 진입이 쓰지 않는다.
    const other = setup({ profile: { birth: { year: 1990, month: 1, day: 1 } } });
    writeBirthDraft(other.ctx.sessionStorage, ASTRO_DRAFT_KEY, draft);
    other.ctx.window[k.entry]();
    assert.deepEqual(other.opened, [k.type]); assert.equal(other.applied.length, 0);
  }
});

test('flag off, saved profile, locale shell: unchanged', () => {
  for (const k of KINDS) {
    const ready = setup({ profile: { birth: { year: 1990, month: 1, day: 1 } } });
    ready.ctx.window[k.entry]();
    assert.deepEqual(ready.opened, [k.type]); assert.deepEqual(ready.replaced, []);
    const locale = setup({ pathname: '/en/ggulggul/' }); locale.ctx.window[k.entry]();
    assert.deepEqual(locale.replaced, []); assert.equal(locale.creates(), 1);
    const offSrc = shell.replace(`var ${k.flag} = true;`, `var ${k.flag} = false;`);
    assert.notEqual(offSrc, shell);
    const off = setup({ source: offSrc });
    writeBirthDraft(off.ctx.sessionStorage, BIRTH_DRAFT_TARGETS[k.type].key, draft);
    off.ctx.window[k.entry]();
    assert.deepEqual(off.replaced, []); assert.equal(off.creates(), 1); assert.equal(off.applied.length, 0);
    const page = readFileSync(k.page, 'utf8');
    assert.ok(page.includes(`if (!${k.flag}) return <SeoLandingTemplate page={page} />;`), k.page);
    assert.ok(page.includes(`<SeoLandingTemplate page={page}><AstroGuidedEntry kind="${k.type}" /></SeoLandingTemplate>`), k.page);
  }
});

test('i18n: every locale has sukuyo/vedic copy with the same keys as astro', () => {
  for (const loc of ['de', 'en', 'es', 'fr', 'hi', 'ja', 'ko', 'ms', 'nl', 'vi', 'zh-cn', 'zh-tw']) {
    const g = JSON.parse(readFileSync(`public/i18n/${loc}/guidedFlow.json`, 'utf8')).guidedFlow;
    for (const kind of ['sukuyo', 'vedic']) assert.deepEqual(Object.keys(g[kind]), Object.keys(g.astro), `${loc}.${kind}`);
  }
});
