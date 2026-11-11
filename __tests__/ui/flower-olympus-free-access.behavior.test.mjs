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
    assert.equal(h.pending.length, 1);
    if (event === 'close') h.w.closeOlympusOracleModal();else if (event === 'document-profile') h.document.dispatch('destinyProfileChanged');else h.w.dispatch(event);
    h.pending[0].resolve(placements);
    await settle();
    assert.equal(h.w.location.href, '', event);
    assert.equal(h.sessionStorage.getItem('OLYMPUS_ORACLE_PROFILE'), null, event);
  }
  const h = olympusFixture();
  h.w.openOlympusOracleModal();
  h.w.openOlympusOracleModal();
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
  h.w.dispatch('cd:auth-changed');
  h.pending[0].reject(new Error('mock'));
  await settle();
  assert.equal(h.w.location.href, '');
  h.w.openOlympusOracleModal();
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
  h.pending[0].resolve(placements);
  await settle();
  h.w.dispatch('pagehide');
  assert.ok(h.sessionStorage.getItem('OLYMPUS_ORACLE_PROFILE'));
  h.w.dispatch('cd:auth-session-invalidated');
  assert.equal(h.sessionStorage.getItem('OLYMPUS_ORACLE_PROFILE'), null);
});
