// 6단계 R2 무료 사주 연결(2026-11-21 승인): index.html 머리 인라인 스크립트의 판정 표.
// 보내는 경우는 "섹션 없는 진입 + 처음 온 비회원"뿐이고, 나머지는 모두 셸 그대로(오늘과 같음)여야 한다.
import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {readFileSync} from 'node:fs';
import {FREE_SAJU_ENTRY_GUIDED_ENABLED} from '../../lib/guided-flow/flags.mjs';

const html = readFileSync('index.html', 'utf8');
const match = html.match(/<script id="cd-free-saju-entry-route">([\s\S]*?)<\/script>/);
const source = match ? match[1] : '';

function store(entries = {}) {
  const map = new Map(Object.entries(entries));
  return {
    get length() { return map.size; },
    key: i => [...map.keys()][i] ?? null,
    getItem: k => (map.has(k) ? map.get(k) : null),
    setItem: (k, v) => map.set(k, String(v)),
    removeItem: k => map.delete(k),
  };
}

function run({url = 'https://codedestiny.test/ggulggul/?action=cdOneStepFreeSajuEntry', auth = false, ss = {}, ls = {},
  referrer = '', runtime = '', authHint = true, code = source} = {}) {
  const u = new URL(url);
  const replaced = [];
  const location = {protocol: u.protocol, pathname: u.pathname, search: u.search, hash: u.hash, origin: u.origin, replace: to => replaced.push(to)};
  const window = {location, sessionStorage: store(ss), localStorage: store(ls)};
  if (authHint) window.__cdAuthHint = {hasAuthHint: () => auth};
  if (runtime) window.__CODE_DESTINY_RUNTIME_TARGET = runtime;
  const context = {window, document: {referrer, documentElement: {getAttribute: () => null}}, URL, URLSearchParams};
  vm.createContext(context);
  vm.runInContext(code, context);
  return replaced;
}

test('스크립트가 셸 머리에 있고 플래그가 lib/guided-flow/flags.mjs 와 같다', () => {
  assert.ok(source, 'cd-free-saju-entry-route 인라인 스크립트');
  const inline = source.match(/var FREE_SAJU_ENTRY_GUIDED_ENABLED=(true|false);/);
  assert.ok(inline);
  assert.equal(inline[1] === 'true', FREE_SAJU_ENTRY_GUIDED_ENABLED);
  // 로그인 힌트 정본(auth-hint.js) 뒤에서 파싱 시점에 돈다.
  assert.ok(html.indexOf('/js/core/auth-hint.js') < html.indexOf('id="cd-free-saju-entry-route"'));
  assert.ok(html.indexOf('id="cd-free-saju-entry-route"') < html.indexOf('<body'));
});

test('섹션 없는 진입 + 처음 온 비회원 → /saju/free/ (추적 키 유지, v 제거)', () => {
  assert.deepEqual(run(), ['/saju/free/']);
  assert.deepEqual(run({url: 'https://codedestiny.test/?action=cdOneStepFreeSajuEntry'}), ['/saju/free/']);
  assert.deepEqual(run({url: 'https://codedestiny.test/ggulggul/index.html?action=cdOneStepFreeSajuEntry'}), ['/saju/free/']);
  assert.deepEqual(run({url: 'https://codedestiny.test/ggulggul/?utm_source=naver&action=cdOneStepFreeSajuEntry&gclid=g1&ref=blog&v=3'}),
    ['/saju/free/?utm_source=naver&gclid=g1&ref=blog']);
  assert.deepEqual(run({url: 'http://localhost:3000/ggulggul/?action=cdOneStepFreeSajuEntry#'}), ['/saju/free/']);
  // 프로필이 아닌 빈 키·무관한 키는 막지 않는다.
  assert.deepEqual(run({ls: {'FORTUNE_APP_USER_PROFILES.list::guest': '[]', 'FORTUNE_APP_USER_PROFILES.meta::guest': '{"x":1}', cd_lang: 'ko'}}), ['/saju/free/']);
});

test('셸 그대로인 경우(오늘과 같음)', () => {
  const stay = {
    section: {url: 'https://codedestiny.test/ggulggul/?action=cdOneStepFreeSajuEntry&section=compatCard'},
    emptySection: {url: 'https://codedestiny.test/ggulggul/?action=cdOneStepFreeSajuEntry&section='},
    snulife: {url: 'https://codedestiny.test/ggulggul/?action=cdOneStepFreeSajuEntry&entry=snulife'},
    lang: {url: 'https://codedestiny.test/ggulggul/?action=cdOneStepFreeSajuEntry&lang=en'},
    payment: {url: 'https://codedestiny.test/ggulggul/?action=cdOneStepFreeSajuEntry&paymentId=p1'},
    hash: {url: 'https://codedestiny.test/ggulggul/?action=cdOneStepFreeSajuEntry#resultPage'},
    otherAction: {url: 'https://codedestiny.test/ggulggul/?action=cdHomeZiweiEntry'},
    twoActions: {url: 'https://codedestiny.test/ggulggul/?action=cdOneStepFreeSajuEntry&action=openTarotModal'},
    noAction: {url: 'https://codedestiny.test/ggulggul/'},
    hashOnly: {url: 'https://codedestiny.test/ggulggul/#destinyCardForm'},
    locale: {url: 'https://codedestiny.test/en/?action=cdOneStepFreeSajuEntry'},
    staticCopy: {url: 'https://codedestiny.test/static/?action=cdOneStepFreeSajuEntry'},
    app: {runtime: 'mobile-app'},
    capacitorScheme: {url: 'capacitor://localhost/index.html?action=cdOneStepFreeSajuEntry'},
    loggedIn: {auth: true},
    noAuthHintApi: {authHint: false},
    w2GuestReturn: {ss: {'cd:saju-login-draft:v1': JSON.stringify({savedAt: 1, path: '/ggulggul/', fields: {}, guestResult: true})}},
    seoLanding: {ss: {'cd:seo-landing-entry:v1': '{"action":"cdOneStepFreeSajuEntry","profile":{}}'}},
    homeIntent: {ss: {'cd:home-fortune-intent:v1': 'saju'}},
    homeSection: {ss: {'cd:home-fortune-section:v1': 'compatCard'}},
    guestProfileList: {ls: {'FORTUNE_APP_USER_PROFILES.list::guest': '[{"id":"a"}]'}},
    guestProfileCache: {ls: {'codeDestiny:guestProfile': '{"birth":{"year":1990}}'}},
    activeProfileCache: {ss: {'code-destiny.activeProfileCache.v1': '{"id":"a"}'}},
    fromGuidedFlow: {referrer: 'https://codedestiny.test/saju/free/'},
  };
  for (const [name, opts] of Object.entries(stay)) assert.deepEqual(run(opts), [], name);
  // 다른 사이트에서 온 /saju/free/ 리퍼러는 왕복 방지 대상이 아니다.
  assert.deepEqual(run({referrer: 'https://other.example/saju/free/'}), ['/saju/free/']);
});

test('저장소 접근이 막히면 셸 그대로(fail-closed)', () => {
  const code = source.replace('var ss=w.sessionStorage', 'var ss={getItem:function(){throw new Error("blocked")}}');
  assert.deepEqual(run({code}), []);
});

test('플래그 끔이면 어떤 진입도 옮기지 않는다', () => {
  const code = source.replace('var FREE_SAJU_ENTRY_GUIDED_ENABLED=true;', 'var FREE_SAJU_ENTRY_GUIDED_ENABLED=false;');
  assert.notEqual(code, source, 'flag literal must exist');
  assert.deepEqual(run({code}), []);
  assert.deepEqual(run({code, url: 'https://codedestiny.test/?action=cdOneStepFreeSajuEntry&utm_source=x'}), []);
});
