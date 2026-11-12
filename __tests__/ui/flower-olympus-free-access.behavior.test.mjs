import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import { createRequire } from 'node:module';
import { isFreeFortuneFeatureKey } from '../../lib/payment/free-fortune-policy.mjs';
const require = createRequire(import.meta.url),
  acorn = require('acorn');
const read = p => fs.readFileSync(p, 'utf8');
const runtime = read('js/core/index-inline-runtime.js'),
  dp = read('js/destiny-profile.js'),
  olympus = read('js/olympus-oracle.js');
function fn(source, name) {
  let found;
  function walk(node) {
    if (!node || typeof node !== 'object' || found) return;
    if (node.type === 'FunctionDeclaration' && node.id.name === name) {
      found = source.slice(node.start, node.end);
      return;
    }
    for (const value of Object.values(node)) if (Array.isArray(value)) value.forEach(walk);else if (value && typeof value === 'object') walk(value);
  }
  walk(acorn.parse(source, {
    ecmaVersion: 'latest',
    sourceType: 'module'
  }));
  assert.ok(found, name);
  return found;
}
function events() {
  const handlers = new Map();
  return {
    addEventListener(n, f) {
      const a = handlers.get(n) || [];
      a.push(f);
      handlers.set(n, a);
    },
    dispatch(n, detail) {
      for (const f of handlers.get(n) || []) f({
        type: n,
        detail
      });
    }
  };
}
function storage() {
  const m = new Map();
  return {
    getItem: k => m.get(k) || null,
    setItem: (k, v) => m.set(k, String(v)),
    removeItem: k => m.delete(k)
  };
}
function fixture() {
  const localStorage = storage(),
    sessionStorage = storage();
  let profile = {
    id: 'one',
    name: 'A',
    birth: {
      year: 1991,
      month: 3,
      day: 8,
      hour: 12
    },
    location: {
      lat: 37,
      lng: 126
    }
  };
  const w = {
    ...events(),
    location: {
      pathname: '/ggulggul/',
      search: '',
      hash: '',
      href: ''
    },
    cdIsFreeFortuneFeatureKey: isFreeFortuneFeatureKey,
    __dpVerifyOlympusSession: async () => true,
    hasAuthToken: () => true
  };
  const document = {
    ...events(),
    getElementById: () => null,
    querySelector: () => null
  };
  const c = vm.createContext({
    window: w,
    document,
    localStorage,
    sessionStorage,
    console,
    Promise,
    JSON,
    Number,
    Object,
    Date,
    Math,
    setTimeout: () => 0,
    clearTimeout() {},
    requestAnimationFrame() {},
    _toast() {},
    __cdHasAuthToken: () => w.hasAuthToken(),
    __cdGetAuthTokenForLockSync: () => '',
    __cdResolveApiBaseForLockSync: () => '',
    _dfServerMatchLang: () => 'ko'
  });
  w.DestinyProfileManager = {
    storage: {
      current: () => profile
    }
  };
  localStorage.setItem('fortune_auth_user', JSON.stringify({
    id: 'user-one'
  }));
  return {
    c,
    w,
    document,
    localStorage,
    sessionStorage,
    get profile() {
      return profile;
    },
    set profile(p) {
      profile = p;
    }
  };
}
function flowerFixture() {
  const h = fixture();
  vm.runInContext(`var _dfReadingEpoch=0;var _dfServerMatch={fingerprint:'',sources:null,theme:null,inflight:null,status:'idle'};var _dfServerMatchPayloadMemo={key:'old',payload:{}};var _dfSukuyoAstronomyCache={key:'',value:null,failed:false,pending:false};var _dfStudioState={selection:{old:true},flowerData:{},history:[{}],loadingTasks:{},linkedSources:{}};var _DF_ATELIER_LOCK_KEY='flower-fc';`, h.c);
  for (const name of ['_dfReadingIdentity', '_dfReadingIsCurrent', '_dfInvalidateReading', '_dfServerMatchFingerprint', '_dfRequestServerMatch', '_dfIsFlowerAtelierUnlocked', '_dfRequirePaidSourceUnlock', 'closeDestinyFlowerStudio']) vm.runInContext(fn(runtime, name), h.c);
  h.c.closeDestinyFlowerShareSheet = () => {};
  h.c._dfRestoreOriginalTitle = () => {};
  h.c._dfSetBodyLock = () => {};
  return h;
}
const payload = {
  birth: {
    year: 1991,
    month: 3,
    day: 8,
    hour: 12
  }
};
const result = label => ({
  status: 200,
  json: async () => ({
    ok: true,
    sources: {
      saju: {
        label
      }
    },
    theme: {
      label
    }
  })
});
test('main flower/Olympus exact free keys bypass payment but keep login and current profile', () => {
  const h = fixture();
  let opens = 0,
    login = 0,
    paid = 0,
    form = 0;
  Object.assign(h.c, {
    _DP_FEATURE_LOCKS: {
      flower: {
        key: 'flower-fc'
      },
      olympus: {
        key: 'olympus-fc'
      }
    },
    DPStorage: {
      current: () => h.profile
    },
    _dpHasAuthToken: () => h.w.hasAuthToken(),
    _dpIsFeatureLocked: () => true,
    _cdIsAdminLikeUser: () => false,
    _dpGetAuthToken: () => '',
    _DP_UNLOCK_PRODUCT_BY_FEATURE_KEY: {}
  });
  h.w.__cdOpenLoginRequiredModal = () => login++;
  h.w.dpScrollToForm = () => form++;
  h.w._cdChooseServicePaymentMode = () => {
    paid++;
    return Promise.resolve('cancel');
  };
  vm.runInContext(fn(dp, '_dpGateLockFeature'), h.c);
  for (const key of ['flower', 'olympus']) h.c._dpGateLockFeature(key, () => opens++);
  assert.equal(opens, 2);
  assert.equal(paid, 0);
  h.w.hasAuthToken = () => false;
  h.c._dpGateLockFeature('flower', () => opens++);
  assert.equal(login, 1);
  assert.equal(opens, 2);
  h.w.hasAuthToken = () => true;
  h.profile = null;
  h.c._dpGateLockFeature('olympus', () => opens++);
  assert.equal(form, 1);
  assert.equal(opens, 2);
  assert.ok(!isFreeFortuneFeatureKey('section_summary'));
  assert.ok(!isFreeFortuneFeatureKey('section_daewun'));
});
test('all four flower tabs are free and flower login never opens a payment chooser', () => {
  const h = flowerFixture();
  assert.equal(h.c._dfIsFlowerAtelierUnlocked(), true);
  assert.equal(h.c._dfRequirePaidSourceUnlock('saju'), true);
  let login = 0;
  h.w.hasAuthToken = () => false;
  h.w.__cdOpenLoginRequiredModal = () => login++;
  assert.equal(h.c._dfRequirePaidSourceUnlock('astrology'), false);
  assert.equal(login, 1);
});
test('flower duplicate clicks share one request and account/profile changes reject identical-birth late data', async () => {
  const h = flowerFixture();
  const pending = [];
  let settled = 0;
  h.c.fetch = () => new Promise(r => pending.push(r));
  const a = h.c._dfRequestServerMatch(payload, () => settled++);
  assert.strictEqual(h.c._dfRequestServerMatch(payload, () => settled++), a);
  assert.equal(pending.length, 1);
  h.c._dfInvalidateReading();
  assert.equal(h.c._dfStudioState.selection, null);
  assert.equal(h.c._dfStudioState.flowerData, null);
  assert.equal(h.c._dfStudioState.history.length, 0);
  const b = h.c._dfRequestServerMatch(payload, () => settled++);
  pending[0](result('old'));
  await a;
  assert.equal(settled, 0);
  assert.equal(h.c._dfServerMatch.sources, null);
  pending[1](result('new'));
  await b;
  assert.equal(settled, 1);
  assert.equal(h.c._dfServerMatch.sources.saju.label, 'new');
  const c = h.c._dfRequestServerMatch({
    birth: {
      ...payload.birth,
      day: 9
    }
  }, () => settled++);
  h.profile = {
    ...h.profile,
    id: 'two'
  };
  pending[2](result('other profile'));
  await c;
  assert.equal(settled, 1);
  assert.equal(h.c._dfServerMatch.sources, null);
});
test('flower close cancels pending completion and allows a new request', async () => {
  const h = flowerFixture();
  let resolve,
    settled = 0;
  h.c.fetch = () => new Promise(r => resolve = r);
  const task = h.c._dfRequestServerMatch(payload, () => settled++);
  h.c.closeDestinyFlowerStudio();
  resolve(result('closed'));
  await task;
  assert.equal(settled, 0);
  assert.equal(h.c._dfServerMatch.inflight, null);
  assert.equal(h.c._dfServerMatch.sources, null);
});
function olympusFixture() {
  const h = fixture(),
    pending = [];
  h.c.__compute = () => new Promise((resolve, reject) => pending.push({
    resolve,
    reject
  }));
  vm.runInContext(olympus.replace(fn(olympus, 'computePlacementsWithSwissBridge'), 'function computePlacementsWithSwissBridge(payload) { return __compute(payload); }'), h.c);
  return {
    ...h,
    pending
  };
}
const placements = {
  sun: {
    key: 'aries',
    deg: 1
  }
};
async function settle() {
  await Promise.resolve();
  await Promise.resolve();
  await Promise.resolve();
}
test('Olympus latest click wins without purchase and close/auth/profile/back cancels late navigation', async () => {
  for (const event of ['cd:auth-changed', 'cd:auth-session-invalidated', 'cd:profile-changed', 'destiny:profile-changed', 'popstate', 'pagehide', 'close', 'document-profile']) {
    const h = olympusFixture();
    h.w.openOlympusOracleModal();
  await settle();
    assert.equal(h.pending.length, 1);
    if (event === 'close') h.w.closeOlympusOracleModal();else if (event === 'document-profile') h.document.dispatch('destinyProfileChanged');else h.w.dispatch(event);
    h.pending[0].resolve(placements);
    await settle();
    assert.equal(h.w.location.href, '', event);
    assert.equal(h.sessionStorage.getItem('OLYMPUS_ORACLE_PROFILE'), null, event);
  }
  const h = olympusFixture();
  h.w.openOlympusOracleModal();
  await settle();
  h.w.openOlympusOracleModal();
  await settle();
  h.pending[0].resolve(placements);
  await settle();
  assert.equal(h.w.location.href, '');
  h.pending[1].resolve(placements);
  await settle();
  assert.equal(h.w.location.href, '/olympus');
  assert.equal(JSON.parse(h.sessionStorage.getItem('OLYMPUS_ORACLE_PROFILE')).calc, 'swiss');
});
test('Olympus calculation failure preserves approximation only for the still-current request', async () => {
  const h = olympusFixture();
  h.w.openOlympusOracleModal();
  await settle();
  h.w.dispatch('cd:auth-changed');
  h.pending[0].reject(new Error('mock'));
  await settle();
  assert.equal(h.w.location.href, '');
  h.w.openOlympusOracleModal();
  await settle();
  h.pending[1].reject(new Error('mock'));
  await settle();
  assert.equal(h.w.location.href, '/olympus');
  assert.equal(JSON.parse(h.sessionStorage.getItem('OLYMPUS_ORACLE_PROFILE')).calc, 'approx');
});
test('free source copy preserves illustrations, existing purchase keys and public Olympus route', () => {
  const html = read('index.html');
  for (const key of ['flower-fc', 'olympus-fc']) {
    assert.match(html, new RegExp('data-cd-price-key="' + key + '" data-cd-price-free="true"'));
    assert.ok(dp.includes("'" + key + "': 'unlock." + key.replace('-', '_') + "'"));
  }
  for (const line of html.split('\n').filter(s => /^\s*(open(?:Destiny|Astrology|Jamidusu|Sukuyo)FlowerStudio|openOlympusOracleModal|'flower-fc'):\{/.test(s))) {
    assert.ok(!line.includes("ct:'paid'"));
    assert.ok(!line.includes('해금 5,000원'));
  }
  assert.ok(html.includes('/images/service-introductions/destiny-flower-320.webp'));
  assert.ok(html.includes('기존 구매 건의 환불'));
  assert.ok(!read('app/olympus/page.js').includes('useFreeReadingGuard'));
});
test('DP delayed opening rejects changed identity, dismissal and an older repeated click', () => {
  const h = fixture(),
    timers = [];
  let opened = 0;
  const overlay = () => ({
    setAttribute() {},
    classList: {
      remove() {}
    },
    parentNode: {
      removeChild() {}
    }
  });
  Object.assign(h.c, {
    _dpProfileFortuneEntryVersion: 0,
    _DP_FEATURE_LOCKS: {
      flower: {
        key: 'flower-fc'
      },
      olympus: {
        key: 'olympus-fc'
      }
    },
    DPStorage: {
      current: () => h.profile
    },
    _dpGetProfileScope: () => 'mock-user',
    _dpHasAuthToken: () => true,
    _dpGateLockFeature: (_type, cb) => cb(),
    _fortuneStartMessage: () => '',
    setTimeout: fn => {
      timers.push(fn);
      return timers.length;
    }
  });
  h.w.openDestinyFlowerStudio = () => opened++;
  for (const name of ['_dpProfileFortuneIdentity', '_dpInvalidateProfileFortuneEntry']) vm.runInContext(fn(dp, name), h.c);
  const start = dp.indexOf('  window._dpOpenFortuneType = function(type) {'),
    end = dp.indexOf('  window.openFortuneFromProfile =', start);
  vm.runInContext(dp.slice(start, end), h.c);
  h.w._dpFortuneSelEl = overlay();
  h.w._dpOpenFortuneType('flower');
  h.c._dpInvalidateProfileFortuneEntry();
  timers.shift()();
  assert.equal(opened, 0);
  h.w._dpFortuneSelEl = overlay();
  h.w._dpOpenFortuneType('flower');
  h.profile = {
    ...h.profile,
    id: 'two'
  };
  timers.shift()();
  assert.equal(opened, 0);
  h.w._dpFortuneSelEl = overlay();
  h.w._dpOpenFortuneType('flower');
  h.w._dpFortuneSelEl = overlay();
  h.w._dpOpenFortuneType('flower');
  timers.shift()();
  assert.equal(opened, 0);
  timers.shift()();
  assert.equal(opened, 1);
});
test('Olympus intentional page handoff keeps the validated profile but later auth change clears it', async () => {
  const h = olympusFixture();
  h.w.openOlympusOracleModal();
  await settle();
  h.pending[0].resolve(placements);
  await settle();
  h.w.dispatch('pagehide');
  assert.ok(h.sessionStorage.getItem('OLYMPUS_ORACLE_PROFILE'));
  h.w.dispatch('cd:auth-session-invalidated');
  assert.equal(h.sessionStorage.getItem('OLYMPUS_ORACLE_PROFILE'), null);
});

function installFreshVerifier(h, response) {
  const calls=[];
  Object.assign(h.c,{
    _dpGetProfileScope:()=>JSON.parse(h.localStorage.getItem('fortune_auth_user')||'{}').id,
    _dpProfileFortuneEntryVersion:0,
    _dpProfileFortuneIdentity:()=>h.localStorage.getItem('fortune_auth_user'),
    _dpBuildAuthHeaders:x=>x,
    _dpResolveIdScope:u=>String(u&&(u.id||u.userId||u._id||u.uid)||'').trim().toLowerCase(),
    _DP_FETCH_TIMEOUT_MS:20000,
    _dpBuildApiCandidates:(path,options)=>{assert.equal(options.allowWorkerFallback,false);return [{url:path}]},
    _dpFetchWithTimeout:async (...args)=>{calls.push(args);const r=await(typeof response==='function'?response():response);return {ok:r.ok,json:async()=>r.data};},
  });
  const start=dp.indexOf('  window.__dpVerifyOlympusSession = async function(expectedScope) {');
  vm.runInContext(dp.slice(start,dp.indexOf('  var _dpSetCurrentTimer',start)),h.c);
  return calls;
}
const authOK={ok:true,data:{ok:true,authenticated:true,user:{id:'user-one'}}};
test('Olympus main denies stale-token, degraded, malformed, mismatch and unavailable fresh auth without calculation or handoff',async()=>{
  for(const response of [{ok:true,data:{user:{id:'user-one'}}},{ok:false,status:401},{ok:false,status:503},{ok:true,data:{}},{ok:true,data:{...authOK.data,degraded:true}},{ok:true,data:{...authOK.data,ok:false}},{ok:true,data:{...authOK.data,authenticated:false}},{ok:true,data:{user:{id:'another-user'}}}]){
    const h=olympusFixture();const calls=installFreshVerifier(h,response);
    h.w.openOlympusOracleModal();await settle();await settle();
    assert.equal(h.pending.length,0);assert.equal(h.w.location.href,'');assert.equal(h.sessionStorage.getItem('OLYMPUS_ORACLE_PROFILE'),null);
    assert.equal(calls.length,1);assert.equal(calls[0][0],'/api/auth/me');assert.equal(calls[0][1].method,'GET');assert.equal(calls[0][1].cache,'no-store');assert.equal(calls[0][1].headers['x-code-destiny-cache-refresh'],'1');assert.equal(calls[0][2],20000);
  }
  const missing=olympusFixture();delete missing.w.__dpVerifyOlympusSession;missing.w.openOlympusOracleModal();await settle();assert.equal(missing.pending.length,0);
});
test('Olympus fresh auth cannot commit after account, profile, back or newer intent changes',async()=>{
  for(const change of ['auth','profile','back','epoch']){
    const h=olympusFixture();let resolve;installFreshVerifier(h,()=>new Promise(r=>resolve=r));
    h.w.openOlympusOracleModal();await settle();
    if(change==='auth')h.localStorage.setItem('fortune_auth_user',JSON.stringify({id:'two'}));
    if(change==='profile')h.w.DestinyProfileManager.storage.current=()=>({...h.profile,id:'two'});
    if(change==='back')h.w.dispatch('popstate');
    if(change==='epoch')h.c._dpProfileFortuneEntryVersion++;
    resolve(authOK);await settle();await settle();assert.equal(h.pending.length,0,change);assert.equal(h.w.location.href,'',change);
  }
  const h=olympusFixture();const calls=installFreshVerifier(h,authOK);h.w.openOlympusOracleModal();await settle();await settle();assert.equal(h.pending.length,1);h.pending[0].resolve(placements);await settle();assert.equal(h.w.location.href,'/olympus');assert.equal(JSON.parse(h.sessionStorage.getItem('OLYMPUS_ORACLE_PROFILE')).readingOwner.accountId,'user-one');
  h.w.location.href='';h.w.openOlympusOracleModal();await settle();await settle();assert.equal(calls.length,2,'Every entry performs a fresh auth read');
});
test('five-system free cards show one free badge and retain the paid Ziwei expert offer',()=>{
  const html=read('index.html');
  for(const key of ['compat-astro-synastry','compat-ziwei-compatibility','vedic-compatibility-per-use']){
    const line=html.split('\n').find(s=>s.includes('data-cd-price-key="'+key+'"'));
    assert.ok(line);assert.equal((line.match(/<span/g)||[]).length,1);assert.ok(!line.includes('기본 무료'));assert.match(line,/data-price-krw="0"/);
  }
  assert.match(html,/data-cd-price-key="ziwei-ai-consultation"[^>]*data-price-krw="30000">명반 무료 · 전문가 상담 30,000원/);
});
test('main and React handoff signatures use the same semantic birth/location contract',()=>{
  const jsx=read('OlympusVIPLounge.jsx');const start=jsx.indexOf('  function olympusProfileReadingFields('),end=jsx.indexOf('function olympusStoredIdentity(',start);const c=vm.createContext({});vm.runInContext(fn(olympus,'profileReadingFields')+jsx.slice(start,end),c);
  const a={name:'A',gender:'F',birth:{year:1990,month:5,day:15,hour:12,minute:0},location:{lat:37.5,lng:127,baseTzOffset:9}};
  const b={name:'A',gender:'F',birth:{timeUnknown:false,minute:0,hour:'12',day:15,month:5,year:1990,calType:'solar',decorative:'ignored'},location:{label:'Seoul',baseTzOffset:540,lng:'127',lat:37.5},birthTimeUnknown:false};
  assert.equal(JSON.stringify(c.profileReadingFields(a)),JSON.stringify(c.olympusProfileReadingFields(b)));
  for(const changed of [{...b,birth:{...b.birth,day:16}},{...b,gender:'M'},{...b,location:{...b.location,lng:128}},{...b,birth:{...b.birth,timeUnknown:true}}])assert.notEqual(JSON.stringify(c.profileReadingFields(a)),JSON.stringify(c.olympusProfileReadingFields(changed)));
});
test('fortune entry ignores unrelated cross-tab storage writes but not auth/profile ones', () => {
  // 2026-11-12: a new tab writing cd_lang during the 350ms overlay fade silently cancelled Olympus/flower entry.
  const marker = "  window.addEventListener('storage', function(event) {";
  const start = dp.indexOf(marker);
  assert.ok(start > 0, 'filtered storage listener present');
  const block = dp.slice(start, dp.indexOf('\n  });', start) + 6);
  let handler = null, invalidated = 0;
  vm.runInNewContext(block, {
    NS: 'FORTUNE_APP_USER_PROFILES',
    _dpInvalidateProfileFortuneEntry: () => invalidated++,
    window: { addEventListener: (name, fn) => { if (name === 'storage') handler = fn; } },
  });
  for (const key of ['cd_lang', 'cd:first-visit:v1:ggulggul:guest', 'cdSajuPersonaV1']) handler({ key });
  assert.equal(invalidated, 0);
  for (const key of [null, 'fortune_auth_user', 'fortune_auth_token', 'FORTUNE_APP_USER_PROFILES.current::u1']) handler({ key });
  assert.equal(invalidated, 4);
});
