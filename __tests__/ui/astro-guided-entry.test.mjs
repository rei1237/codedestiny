import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import { readFileSync } from 'node:fs';
import * as flags from '../../lib/guided-flow/flags.mjs';
import { ASTRO_DRAFT_KEY, ASTRO_DRAFT_TTL_MS, ASTRO_SHELL_ENTRY, astroDraftProfile, writeAstroDraft } from '../../lib/guided-flow/astro-draft.mjs';

// R5 서양 점성술 진입(2026-11-21 승인 "서양 점성술만 먼저"): /astrology/ 공통 스텝 입력 ↔ 셸 cdHomeAstroEntry 계약.
const shell = readFileSync('js/destiny-profile.js', 'utf8');

function setup({ source = shell, profile = null, pathname = '/ggulggul/', session = false, server = null } = {}) {
  const events = {}, state = new Map(), opened = [], replaced = [], applied = [];
  let creates = 0, current = profile;
  const ctx = {
    DPStorage: { current: () => current }, _dpProfileSaveInFlight: false, setTimeout: () => 0,
    sessionStorage: { setItem: (k, v) => state.set(k, String(v)), removeItem: (k) => state.delete(k), getItem: (k) => (state.has(k) ? state.get(k) : null) },
    document: { addEventListener: (n, fn) => { events[n] = fn; } },
    window: { addEventListener: (n, fn) => { events[n] = fn; }, _dpOpenFortuneType: (t) => opened.push(t), dpStartProfileCreate: () => { creates += 1; },
      location: pathname ? { pathname, replace: (url) => replaced.push(url) } : undefined },
    _dpResolveCurrentProfileForSaju: () => current, _dpHasValidProfileDate: (y, m, d) => !!(y && m && d), _dpSyncProfileFormToCurrent() {}, _toast() {},
    _dpHasSessionHint: () => session, _dpLoadFromServer: (cb) => { if (server) current = server; cb(!!server); },
    _dpApplyProfileToForm: (p) => applied.push(p),
  };
  vm.runInNewContext(source.slice(source.indexOf('  var _dpHomeEntryKey ='), source.indexOf('  window.cdOneStepFreeSajuEntry =')), ctx);
  return { ctx, state, opened, replaced, applied, creates: () => creates };
}
const draft = { name: '하늘', gender: 'F', birth: { year: 1995, month: 3, day: 4, hour: 9, minute: 30, timeUnknown: false, calType: 'solar' } };
const putDraft = (h, at = Date.now()) => h.state.set(ASTRO_DRAFT_KEY, JSON.stringify({ at, profile: draft }));

test('flag and draft key/TTL are mirrored in the static shell', () => {
  const flag = /^\s*var GUIDED_ASTRO_ENABLED = (true|false);$/m.exec(shell);
  assert.ok(flag, 'shell flag missing');
  assert.equal(flag[1] === 'true', flags.GUIDED_ASTRO_ENABLED);
  assert.match(shell, new RegExp(`var _dpAstroDraftKey = '${ASTRO_DRAFT_KEY}';`));
  assert.match(shell, /var _dpAstroDraftTtl = 30 \* 60 \* 1000;/);
  assert.equal(ASTRO_DRAFT_TTL_MS, 30 * 60 * 1000);
  assert.equal(ASTRO_SHELL_ENTRY, '/ggulggul/?action=cdHomeAstroEntry');
});

test('W1 answers map to the shell profile form shape', () => {
  const base = { name: ' 하늘 ', gender: 'male', date: '1995-03-04', calendar: 'leap', time: '', placeText: '', place: null };
  assert.deepEqual(astroDraftProfile(base), { name: '하늘', gender: 'M', birth: { year: 1995, month: 3, day: 4, hour: null, minute: null, timeUnknown: true, calType: 'lunar_leap' } });
  const placed = astroDraftProfile({ ...base, gender: 'female', calendar: 'solar', time: '07:05', place: { text: '부산', lat: 35.1, lng: 129.0, timezone: 'Asia/Seoul', name: '부산' } });
  assert.deepEqual(placed.birth, { year: 1995, month: 3, day: 4, hour: 7, minute: 5, timeUnknown: false, calType: 'solar' });
  assert.deepEqual(placed.location, { tz: 'Asia/Seoul', lat: 35.1, lng: 129.0 });
  assert.equal(astroDraftProfile({ ...base, name: '' }), null);
  assert.equal(astroDraftProfile({ ...base, gender: 'unknown' }), null);
  assert.equal(writeAstroDraft({ setItem() { throw Error('blocked'); }, getItem: () => null }, draft), false);
});

test('profile-less astro entry goes to the guided input once, then falls back to the form (no loop)', () => {
  const h = setup();
  h.ctx.window.cdHomeAstroEntry();
  assert.deepEqual(h.replaced, ['/astrology/?step=name']);
  assert.equal(h.creates(), 0);
  assert.equal(h.state.get('cd:home-fortune-intent:v1'), undefined);
  h.ctx.window.cdHomeAstroEntry(); // 초안 없이 곧바로 다시 왔다 → 기존 폼
  assert.equal(h.replaced.length, 1);
  assert.equal(h.creates(), 1);
});

test('a fresh draft fills the existing profile form; save/consent stays the shell flow', () => {
  for (const profile of [null, { birth: { year: 1990, month: 1, day: 1 } }]) {
    const h = setup({ profile });
    putDraft(h);
    h.ctx.window.cdHomeAstroEntry();
    assert.deepEqual(h.replaced, []);
    assert.equal(h.creates(), 1);
    assert.equal(h.applied.length, 1);
    assert.equal(h.applied[0].name, '하늘');
    assert.equal(h.state.has(ASTRO_DRAFT_KEY), false, 'draft is consumed once');
    assert.equal(h.state.get('cd:home-fortune-intent:v1'), 'astro');
    assert.deepEqual(h.opened, []);
  }
  const stale = setup({ profile: { birth: { year: 1990, month: 1, day: 1 } } });
  putDraft(stale, Date.now() - 31 * 60 * 1000);
  stale.ctx.window.cdHomeAstroEntry();
  assert.deepEqual(stale.opened, ['astro']);
  assert.equal(stale.applied.length, 0);
});

test('unchanged paths: saved profile, server profile, other services, non-shell pages, flag off', () => {
  const ready = setup({ profile: { birth: { year: 1990, month: 1, day: 1 } } });
  ready.ctx.window.cdHomeAstroEntry();
  assert.deepEqual(ready.opened, ['astro']); assert.deepEqual(ready.replaced, []);
  const server = setup({ session: true, server: { birth: { year: 1990, month: 1, day: 1 } } });
  server.ctx.window.cdHomeAstroEntry();
  assert.deepEqual(server.opened, ['astro']); assert.deepEqual(server.replaced, []);
  // 숙요·베다는 같은 방식의 자기 랜딩으로 간다(sukuyo-vedic-guided-entry.test.mjs). 자미·사주는 그대로 폼.
  for (const type of ['ziwei', 'saju']) {
    const other = setup(); other.ctx.window.cdHomeFortuneEntry(type);
    assert.deepEqual(other.replaced, [], type); assert.equal(other.creates(), 1, type);
  }
  for (const pathname of ['/en/ggulggul/', null]) {
    const off = setup({ pathname }); off.ctx.window.cdHomeAstroEntry();
    assert.deepEqual(off.replaced, []); assert.equal(off.creates(), 1);
  }
  const disabled = setup({ source: shell.replace('var GUIDED_ASTRO_ENABLED = true;', 'var GUIDED_ASTRO_ENABLED = false;') });
  putDraft(disabled);
  disabled.ctx.window.cdHomeAstroEntry();
  assert.deepEqual(disabled.replaced, []); assert.equal(disabled.creates(), 1); assert.equal(disabled.applied.length, 0);
});

test('/astrology/ landing renders the guided input only when the flag is on', () => {
  const page = readFileSync('app/astrology/page.js', 'utf8');
  assert.match(page, /if \(!GUIDED_ASTRO_ENABLED\) return <SeoLandingTemplate page=\{page\} \/>;/);
  assert.match(page, /<SeoLandingTemplate page=\{guidedPage\}>\s*<div id="astro-guided-entry"[^>]*><AstroGuidedEntry \/><\/div>/);
  assert.match(page, /guidedPage = \{ \.\.\.page, heroForm: undefined, ctaHref: "#astro-guided-entry" \}/, 'hero CTA must jump to the in-page guided entry, not the shell');
  const entry = readFileSync('app/astrology/AstroGuidedEntry.tsx', 'utf8');
  assert.match(entry, /state\.source !== "user" && state\.source !== "auto"/, 'restore/back must not auto-redirect');
  assert.doesNotMatch(entry, /SavedBirthProfilePicker|authFetch|\/api\//, 'no profile/API calls from the guided input');
});
