import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { build } from 'esbuild';
import { createRequire } from 'node:module';
import { JSDOM } from 'jsdom';

const require = createRequire(import.meta.url);
const React = require('react');
const { act } = React;
const { createRoot } = require('react-dom/client');
const entry = 'components/fpti/FptiResultCard.tsx';
const output = await build({
  entryPoints: [entry], bundle: true, write: false, format: 'cjs', platform: 'node',
  jsx: 'automatic', external: ['react', 'react/jsx-runtime'],
  plugins: [{ name: 'fpti-mocks', setup(b) {
    const mocks = {
      'auth-client': 'export const AUTH_SESSION_INVALIDATED_EVENT="cd:auth-session-invalidated"; export const authFetch=(...args)=>globalThis.__fptiAuth(...args);',
      'loadingMessages': 'export const getCurrentLoadingLocale=()=>"ko";',
      'framer-motion': 'import React from "react"; export const m={section:({initial,animate,transition,...props})=>React.createElement("section",props)};',
      'premium-report': `export const validateFptiDeepReport=()=>({valid:true}); export const buildFptiDeepReport=()=>({generatedAt:"2026-11-11",typeName:"테스트 유형",userTypeCode:"AHFR",summary:{preview:"미리보기",highlights:[]},chapters:Array.from({length:7},(_,i)=>({order:i+1,roman:String(i+1),title:"해석 제목",chapterSummary:"요약",sections:[{title:"성향 해석",body:"미리보기 본문"}]}))});`,
      './_lib/copy': `export const useFptiSharedCopy=()=>new Proxy({codeSlotLabel:(n)=>String(n),qualityLabels:{full:"완전"},axisCardLabels:{},freeSummaryLabels:{coreTrait:"trait",loveStyle:"love",workTalent:"work",moneyRhythm:"money",caution:"caution",growthAdvice:"growth"},currentChapterProgress:(n,total)=>n+"/"+total,errorLoginRequired:"로그인이 필요합니다",pdfButtonLabel:"PDF 저장"},{get:(o,k)=>o[k]??String(k)});`,
    };
    b.onResolve({ filter: /auth-client$|loadingMessages$|premium-report$|^framer-motion$|^\.\/_lib\/copy$/ }, args => {
      const key = Object.keys(mocks).find(k => args.path === k || args.path.endsWith('/' + k));
      return { path: key, namespace: 'mock' };
    });
    b.onLoad({ filter: /.*/, namespace: 'mock' }, args => ({ contents: mocks[args.path], loader: 'js' }));
    b.onResolve({ filter: /^\.\/Fpti(ElementChart|TenGodsPanel|RelationshipCard|ShareCard|StrategyCard)$/ }, () => ({ path: 'leaf', namespace: 'leaf' }));
    b.onLoad({ filter: /.*/, namespace: 'leaf' }, () => ({ contents: 'export default function Leaf(){return null;}' }));
    b.onLoad({ filter: /\.css$/ }, () => ({ contents: 'export default {};', loader: 'js' }));
    b.onResolve({ filter: /export-result-pdf$/ }, () => ({ path: 'pdf', namespace: 'pdf' }));
    b.onLoad({ filter: /.*/, namespace: 'pdf' }, () => ({ contents: 'export const exportResultPdf=async()=>{throw new Error("PDF is not exercised in this mock");};' }));
  } }],
});
const mod = { exports: {} };
new Function('require', 'module', 'exports', output.outputFiles[0].text)(require, mod, mod.exports);
const Card = mod.exports.default;
const result = {
  code: 'AHFR', typeName: '테스트 유형', keywords: [], axisScores: {}, source: {}, confidence: 90,
  quality: 'full', axisMeanings: {}, strengths: ['강점'], weaknesses: ['주의'], careerTips: [],
  growthTips: [], relationStyle: {}, goodMatch: [], cautionMatch: [], oneLiner: '기질', relationshipSummary: '관계', careerMoneySummary: '일과 돈', strategySummary: '전략',
};
const birthInput = { birthDate: '1990-01-01', birthTime: '12:00', timeUnknown: true, calendarType: 'solar' };
const report = { chapters: [{ order: 1, title: '실제 해석', sections: [{ title: '성향 해석', body: '검증된 전체 해석 본문' }] }] };
const response = (data, status = 200) => ({ ok: status < 400, status, json: async () => data });
const freePayload = () => ({ ok: true, data: { source: 'public', accessSource: 'public', featureKey: 'premium-fpti-report', profileId: 'profile-a', saved: false, report } });
const deferred = () => { let resolve; const promise = new Promise(r => { resolve = r; }); return { promise, resolve }; };

async function mount({ profileId = 'profile-a', authenticated = true, session, free, archive, restore = false } = {}) {
  const dom = new JSDOM('<div id="root"></div>', { url: 'http://localhost' });
  globalThis.window = dom.window;
  globalThis.document = dom.window.document;
  globalThis.IS_REACT_ACT_ENVIRONMENT = true;
  const calls = [];
  globalThis.__fptiAuth = async (...args) => {
    calls.push(args);
    if (args[0] === '/api/auth/me') return session ? session(...args) : response({ authenticated, user: authenticated ? { id: 'owner-a' } : null });
    if (args[0] === '/api/fpti/deep-report/free') return free ? free(...args) : response(freePayload());
    if (String(args[0]).startsWith('/api/fpti/deep-report')) return archive ? archive(...args) : response({}, 404);
    throw Error('Unexpected API request: ' + args[0]);
  };
  const root = createRoot(document.getElementById('root'));
  const props = { result, savedProfileId: profileId, birthInput, restorePurchasedReport: restore };
  await act(async () => root.render(React.createElement(Card, props)));
  const freeButton = () => document.querySelector('[data-cd-reading-action="primary"]');
  return {
    calls, dom, root, props, freeButton,
    async click() { await act(async () => freeButton().click()); },
    async close() { await act(async () => root.unmount()); dom.window.close(); },
  };
}

test('free result uses exact saved birth input, deduplicates clicks, and never creates a receipt or archive', async () => {
  const pending = deferred();
  const app = await mount({ free: () => pending.promise });
  try {
    await act(async () => { app.freeButton().click(); app.freeButton().click(); });
    const requests = app.calls.filter(([url]) => url === '/api/fpti/deep-report/free');
    assert.equal(requests.length, 1);
    assert.deepEqual(JSON.parse(requests[0][1].body), { profileId: 'profile-a', birthInput: { birthDate: '1990-01-01', birthTime: '', birthTimeUnknown: true, calendarType: 'solar' } });
    assert.deepEqual(requests[0][2], { retryOn401: false });
    assert.ok(app.calls.filter(([url]) => url === '/api/auth/me').every(([, , options]) => options.forceFresh === true));
    await act(async () => pending.resolve(response(freePayload())));
    assert.match(document.body.textContent, /검증된 전체 해석 본문/);
    assert.match(document.body.textContent, /보관함에 자동 저장되지/);
    assert.equal(document.querySelector('a[href*="records/view"]'), null);
    assert.ok(document.querySelector('[data-fpti-pdf-section]'));
    assert.equal(window.localStorage.length, 0);
    assert.ok(app.calls.every(([url, init]) => url === '/api/fpti/deep-report/free' || init.method === 'GET'));
  } finally { await app.close(); }
});

test('missing profile and expired login fail closed without purchase copy or a free request', async () => {
  for (const options of [{ profileId: '' }, { authenticated: false }]) {
    const app = await mount(options);
    try {
      await app.click();
      assert.equal(app.calls.filter(([url]) => url.endsWith('/free')).length, 0);
      assert.doesNotMatch(document.body.textContent, /구매|결제/);
      assert.match(document.body.textContent, options.profileId === '' ? /프로필로 저장/ : /로그인이 필요/);
    } finally { await app.close(); }
  }
});

test('auth, profile, storage and history changes discard pending and completed free reports', async () => {
  for (const event of ['cd:auth-changed', 'cd:auth-session-invalidated', 'cd:profile-changed', 'destinyProfileChanged', 'popstate', 'storage']) {
    const pending = deferred();
    const app = await mount({ free: () => pending.promise });
    try {
      await app.click();
      await act(async () => (event === 'destinyProfileChanged' ? document : window).dispatchEvent(new window.Event(event)));
      await act(async () => pending.resolve(response(freePayload())));
      assert.doesNotMatch(document.body.textContent, /검증된 전체 해석 본문/, event);
      assert.equal(document.querySelector('[data-fpti-pdf-section]'), null, event);
      await app.click();
      assert.match(document.body.textContent, /검증된 전체 해석 본문/);
      await act(async () => (event === 'destinyProfileChanged' ? document : window).dispatchEvent(new window.Event(event)));
      assert.doesNotMatch(document.body.textContent, /검증된 전체 해석 본문/, event);
    } finally { await app.close(); }
  }
});

test('input changes and unmount reject a late free response', async () => {
  const pending = deferred();
  const app = await mount({ free: () => pending.promise });
  try {
    await app.click();
    await act(async () => app.root.render(React.createElement(Card, { ...app.props, birthInput: { ...birthInput, birthDate: '1991-01-01' } })));
    await act(async () => pending.resolve(response(freePayload())));
    assert.doesNotMatch(document.body.textContent, /검증된 전체 해석 본문/);
  } finally { await app.close(); }
  const next = deferred();
  const removed = await mount({ free: () => next.promise });
  await removed.click();
  await removed.close();
  await act(async () => next.resolve(response(freePayload())));
});

test('logout during the fresh session check cannot dispatch a free report request', async () => {
  const pending = deferred();
  let count = 0;
  const app = await mount({ session: () => ++count === 1 ? response({ authenticated: true, user: { id: 'owner-a' } }) : pending.promise });
  try {
    await app.click();
    await act(async () => window.dispatchEvent(new window.Event('cd:auth-changed')));
    await act(async () => pending.resolve(response({ authenticated: true, user: { id: 'owner-a' } })));
    assert.equal(app.calls.filter(([url]) => url.endsWith('/free')).length, 0);
    assert.equal(document.querySelector('[data-fpti-pdf-section]'), null);
  } finally { await app.close(); }
});

test('a late historical archive cannot reappear after a profile change', async () => {
  const pending = deferred();
  const app = await mount({ archive: () => pending.promise });
  try {
    await act(async () => document.dispatchEvent(new window.Event('destinyProfileChanged')));
    await act(async () => pending.resolve(response({ ok: true, data: { report } })));
    assert.doesNotMatch(document.body.textContent, /검증된 전체 해석 본문/);
    assert.equal(document.querySelector('a[href*="records/view"]'), null);
  } finally { await app.close(); }
});

test('unrelated storage changes do not strand an active free request', async () => {
  const pending = deferred();
  const app = await mount({ free: () => pending.promise });
  try {
    await app.click();
    await act(async () => window.dispatchEvent(new window.StorageEvent('storage', { key: 'cd_lang', newValue: 'ko' })));
    await act(async () => pending.resolve(response(freePayload())));
    assert.match(document.body.textContent, /검증된 전체 해석 본문/);
  } finally { await app.close(); }
});

test('wrong profile, paid provenance, unexpected saving and failed responses cannot unlock a report', async () => {
  for (const alteration of [{ profileId: 'other-owner' }, { source: 'paid' }, { accessSource: 'paid' }, { saved: true }, { featureKey: 'other' }]) {
    const payload = freePayload(); Object.assign(payload.data, alteration);
    const app = await mount({ free: () => response(payload) });
    try { await app.click(); assert.doesNotMatch(document.body.textContent, /검증된 전체 해석 본문/); assert.ok(app.freeButton()); }
    finally { await app.close(); }
  }
  let attempts = 0;
  const app = await mount({ free: () => ++attempts === 1 ? response({}, 503) : response(freePayload()) });
  try { await app.click(); assert.ok(app.freeButton()); await app.click(); assert.match(document.body.textContent, /검증된 전체 해석 본문/); }
  finally { await app.close(); }
});

test('historical archive read, refund denial and explicit old purchase resume keep their original API paths', async () => {
  const archived = await mount({ archive: () => response({ ok: true, data: { report } }) });
  try {
    assert.match(document.body.textContent, /검증된 전체 해석 본문/);
    assert.ok(document.querySelector('a[href*="records/view"]'));
    assert.ok(archived.calls.every(([, init]) => init.method === 'GET'));
    assert.doesNotMatch(document.body.textContent, /보관함에 자동 저장되지/);
  } finally { await archived.close(); }
  const refunded = await mount({ archive: () => response({}, 402) });
  try { assert.ok(refunded.freeButton()); assert.equal(document.querySelector('a[href*="records/view"]'), null); }
  finally { await refunded.close(); }
  const resumed = await mount({ restore: true, archive: () => response({ ok: true, data: { report } }) });
  try { assert.ok(resumed.calls.some(([url, init]) => url === '/api/fpti/deep-report' && init.method === 'POST')); }
  finally { await resumed.close(); }
});

test('experience captures original calculation input and clears results on identity changes', () => {
  const source = fs.readFileSync('components/fpti/FptiExperience.tsx', 'utf8');
  assert.match(source, /setResultInput\(\{ \.\.\.analysisInput \}\)/);
  assert.match(source, /birthInput=\{resultInput\}/);
  assert.match(source, /useReadingIdentityReset/);
  assert.match(source, /revision !== profileRevision.current/);
  assert.match(source, /if \(!valid\(\)\) return false;/);
  assert.match(source, /usePaidResume\(FPTI_DEEP_REPORT_RESUME_KIND/);
  assert.doesNotMatch(source, /CraftedProductDisclosure|buildResumeDescriptor|packPaidResumeArg\(/);
  const card = fs.readFileSync(entry, 'utf8');
  assert.doesNotMatch(card, /purchaseFeature|transactionId|unlockMethod|localStorage|useAccessStoreSnapshot/);
});

test('public metadata and service guide describe the free report without changing URL or indexing structure', () => {
  const page = fs.readFileSync('app/saju-fpti/page.tsx', 'utf8');
  assert.doesNotMatch(page, /유료|paid deep report|有料|付费/);
  assert.match(page, /로그인 후 저장한 프로필/);
  assert.match(page, /무료 결과는 보관함에 자동 저장되지/);
  assert.match(page, /canonical: PAGE_URL/);
  assert.match(page, /https:\/\/code-destiny.com\/saju-fpti/);
});
