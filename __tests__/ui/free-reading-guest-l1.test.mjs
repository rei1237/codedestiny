// L1(2026-11-21): /today/ 비회원 무료 결과와 /manse/ 안내 문구가 FREE_READING_GUEST_ENABLED 하나로 켜고 꺼진다.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { build } from 'esbuild';
import { FREE_READING_GUEST_ENABLED, FREE_RESULT_GUEST_ENABLED } from '../../lib/guided-flow/flags.mjs';
import { SEO_LANDING_PAGES } from '../../lib/seo-landing-pages.js';

const read = (p) => fs.readFileSync(p, 'utf8');

async function loadAccess(flagValue) {
  const out = await build({
    stdin: { contents: "export * from './app/_lib/free-reading-access';", resolveDir: process.cwd(), loader: 'ts' },
    bundle: true, write: false, format: 'cjs', platform: 'node',
    plugins: [{ name: 'mocks', setup(b) {
      b.onResolve({ filter: /auth-client$/ }, () => ({ path: 'auth', namespace: 'mock' }));
      b.onResolve({ filter: /guided-flow\/flags\.mjs$/ }, (args) => (flagValue === undefined ? undefined : { path: 'flags', namespace: 'mock' }));
      b.onLoad({ filter: /^auth$/, namespace: 'mock' }, () => ({ contents: 'export const authFetch=(...a)=>globalThis.__l1Auth(...a);' }));
      b.onLoad({ filter: /^flags$/, namespace: 'mock' }, () => ({ contents: `export const FREE_READING_GUEST_ENABLED=${JSON.stringify(flagValue)};` }));
    } }],
  });
  const mod = { exports: {} };
  new Function('require', 'module', 'exports', out.outputFiles[0].text)(() => ({}), mod, mod.exports);
  return mod.exports;
}

test('flag defaults on and the boundary re-exports the shared constant', async () => {
  assert.equal(FREE_READING_GUEST_ENABLED, true);
  const real = await loadAccess(undefined);
  assert.equal(real.FREE_READING_GUEST_ENABLED, true);
  assert.equal(real.freeReadingGuestAllowed(), true);
});

test('guest pass follows the flag only; session check stays fail-closed', async () => {
  for (const [flag, expected] of [[true, true], [false, false], ['true', false], [1, false]]) {
    const mod = await loadAccess(flag);
    assert.equal(mod.freeReadingGuestAllowed(), expected, `flag=${JSON.stringify(flag)}`);
    globalThis.__l1Auth = async () => ({ ok: true, json: async () => ({ authenticated: false }) });
    assert.equal(await mod.hasFreeReadingSession(), false, 'guest is never reported as signed in');
  }
});

test('/today/ opens the result for guests only through the flag, and keeps login-only resume and identity reset', () => {
  const s = read('app/today/TodayHubClient.tsx');
  assert.ok(s.includes('const signedIn = await hasFreeReadingSession();'), 'session is still checked');
  const early = s.indexOf('if (freeReadingGuestAllowed()) setAccessGranted(true);');
  assert.ok(early > 0 && early < s.indexOf('const signedIn = await hasFreeReadingSession();'), 'guests open before the session check returns');
  assert.equal(s.split('fetchLimit(controller)').length - 1, 3, 'every public read has a time limit');
  assert.ok(s.includes('if (signedIn || freeReadingGuestAllowed()) setAccessGranted(true); else setAccessError(freeCopy.description);'));
  assert.ok(s.includes('catch { if (request.valid()) { if (freeReadingGuestAllowed()) setAccessGranted(true); else setAccessError(freeCopy.description); } }'));
  assert.ok(s.includes('usePaidResume(TODAY_FEATURE_KEY'), 'historical resume unchanged');
  assert.ok(s.includes('useReadingIdentityReset('), 'account change clears the result');
  assert.ok(!/ensurePaidAccess\(|runPaidAccessGate\(|\/api\/billing\//.test(s), 'no paid path added');
  // Every computation stays a cookie-less public call (no guest server writes).
  const fetches = s.split('fetch(getApiUrl(').length - 1;
  const omits = s.split('credentials: "omit"').length - 1;
  assert.ok(fetches >= 3 && omits >= fetches, `fetch=${fetches} omit=${omits}`);
});

test('/today/ guest hero lead replaces exactly the trailing sign-in sentence in every locale', () => {
  const s = read('app/today/TodayHubClient.tsx');
  const leads = [...s.matchAll(/heroLead: "([^"]*)"/g)].map((m) => m[1]);
  assert.equal(leads.length, 12);
  const table = s.slice(s.indexOf('const TODAY_GUEST_HERO_LEAD_TAIL'), s.indexOf('function guestHeroLead'));
  const tails = [...table.matchAll(/\["([^"]+)", "([^"]+)"\]/g)].map((m) => [m[1], m[2]]);
  assert.equal(tails.length, 12);
  for (const lead of leads) assert.ok(tails.some(([from]) => lead.endsWith(from)), `no guest tail for: ${lead.slice(-40)}`);
  for (const [, to] of tails) assert.ok(!/로그인 후|after sign-in|ログイン後|登录后|登入後/.test(to), to);
});

test('/manse/ scope copy says "no login" only while both guest flags are on; the old text is kept for flag off', () => {
  const page = SEO_LANDING_PAGES.manse;
  const paragraph = page.sections[0].paragraphs[0];
  const src = read('lib/seo-landing-pages.js');
  const oldText = src.match(/"seoLanding\.manse\.scope\.answer": "([^"]*)"/)[1];
  const guestText = src.match(/"seoLanding\.manse\.scope\.answerGuest": "([^"]*)"/)[1];
  assert.ok(oldText.includes('십성 배치는 로그인 후 무료 기본 풀이에서'), 'flag-off text unchanged');
  assert.ok(guestText.includes('로그인 없이') && guestText.includes('보관함 저장은 로그인 후'));
  assert.equal(paragraph, FREE_READING_GUEST_ENABLED && FREE_RESULT_GUEST_ENABLED ? guestText : oldText);
  assert.equal(page.ctaHref, '/ggulggul/?action=cdOneStepFreeSajuEntry', 'manse still hands off to the W2 shell flow');
});
