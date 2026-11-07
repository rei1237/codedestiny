import '../../scripts/lib/mock-network-guard.cjs';
import test from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';
import { JSDOM } from 'jsdom';
import { HOME_CONCERNS, REFUND_LINE, REFUND_POLICY_HREF } from '../../lib/marketing/home-concerns.mjs';
import { FEATURE_KEY_PRICE_TABLE, UNLOCK_PRODUCT_BY_FEATURE_KEY } from '../../worker/lib/paid-feature-registry.js';

// 무료 만세력 결과 화면의 순서: 고른 고민의 짧은 답 → 그 고민의 단건 → 사주 전체 풀이 묶음.
const read = path => readFileSync(new URL('../../' + path, import.meta.url), 'utf8');
const won = amount => amount.toLocaleString('ko-KR') + '원';
const BANNED = /적중|1위|최고|100%|돼지/;

function resultWindow({ url = 'https://code-destiny.com/ggulggul/', stored = null, storageThrows = false } = {}) {
  const dom = new JSDOM('<!doctype html><body><section id="sajuCard"><div id="manseGrid"></div>'
    + '<div id="sajuBundleOffer"></div><section id="sajuConcernAnswer" hidden></section></section></body>',
  { runScripts: 'outside-only', url });
  const w = dom.window;
  if (storageThrows) {
    Object.defineProperty(w, 'sessionStorage', { configurable: true, get() { throw new w.DOMException('denied', 'SecurityError'); } });
  } else if (stored != null) {
    w.sessionStorage.setItem('cd:home-concern', stored);
  }
  w.cdBirthScopeCurrentProfileId = () => 'profile-1';
  w.isTileKeyUnlocked = () => false;
  w.eval(read('js/core/saju/bundle-offer.js'));
  w.eval(read('js/core/saju/concern-offers.generated.js'));
  w.eval(read('js/core/saju/concern-answer.js'));
  return w;
}

const CTX = {
  ygd: { e: 'fire', n: '병화' },
  yEv: { score: 64, label: '😊 좋은 운', evalSummary: '흐름을 살펴요' },
  gaeun: {
    love: '마음을 천천히 전해 보세요. 두 번째 문장.',
    wealth: '지출을 먼저 나눠 적어 보세요. 두 번째 문장.',
    relationship: '말의 속도를 맞춰 보세요. 두 번째 문장.',
    career: '성과를 설명할 기회를 준비하세요. 주목받는 일과 오래 유지할 일을 함께 고르세요.',
    lifestyle: '하루에 집중할 일을 정해 보세요. 두 번째 문장.',
  },
};

test('resolveConcern은 주소 → sessionStorage 순으로 허용 목록 안의 값만 읽는다', () => {
  assert.equal(resultWindow({ url: 'https://code-destiny.com/ggulggul/?concern=money' }).CdConcernAnswer.resolveConcern(), 'money');
  assert.equal(resultWindow({ url: 'https://code-destiny.com/ggulggul/?concern=%3Cscript%3E' }).CdConcernAnswer.resolveConcern(), null);
  assert.equal(resultWindow({ url: 'https://code-destiny.com/ggulggul/?concern=foo' }).CdConcernAnswer.resolveConcern(), null);
  assert.equal(resultWindow({ url: 'https://code-destiny.com/ggulggul/?concern=constructor' }).CdConcernAnswer.resolveConcern(), null);
  // 주소가 위조돼도 저장된 정상 값은 살린다. 저장값도 목록 밖이면 버린다.
  assert.equal(resultWindow({ url: 'https://code-destiny.com/ggulggul/?concern=foo', stored: 'job' }).CdConcernAnswer.resolveConcern(), 'job');
  assert.equal(resultWindow({ stored: '<img src=x onerror=alert(1)>' }).CdConcernAnswer.resolveConcern(), null);
  assert.equal(resultWindow({ url: 'https://code-destiny.com/ggulggul/?concern=love', stored: 'job' }).CdConcernAnswer.resolveConcern(), 'love');
  assert.equal(resultWindow({ storageThrows: true }).CdConcernAnswer.resolveConcern(), null);
});

test('buildAnswer는 올해 흐름 라벨, 고민 분야 첫 문장, 연결 문장 3줄을 만든다', () => {
  const w = resultWindow();
  const { lines } = w.CdConcernAnswer.buildAnswer('job', CTX);
  assert.equal(lines.length, 3);
  assert.match(lines[0], /좋은 운/);
  assert.equal(lines[1], '성과를 설명할 기회를 준비하세요.');
  assert.match(lines[2], /이직/);
  for (const concern of HOME_CONCERNS) {
    const answer = w.CdConcernAnswer.buildAnswer(concern.id, CTX);
    assert.equal(answer.lines[1], CTX.gaeun[concern.sajuField].split(/(?<=[.!?])\s/)[0], concern.id + ' 분야');
  }
  // 엔진 라벨의 과장 표현은 부드럽게 바꾼다(금지 표현).
  const best = w.CdConcernAnswer.buildAnswer('money', { ...CTX, yEv: { score: 88, label: '🌟 최고의 운' } });
  assert.doesNotMatch(best.lines.join(' '), BANNED);
  assert.match(best.lines[0], /아주 좋은 운/);
  for (const concern of [...HOME_CONCERNS.map(c => c.id), null]) {
    assert.doesNotMatch(w.CdConcernAnswer.buildAnswer(concern, CTX).lines.join(' '), BANNED);
  }
});

test('고민이 없거나 위조됐으면 lifestyle 기준 일반 답을 내고 단건 카드는 붙이지 않는다', () => {
  for (const options of [{}, { url: 'https://code-destiny.com/ggulggul/?concern=%3Cscript%3E' }, { storageThrows: true }]) {
    const w = resultWindow(options);
    const host = w.document.getElementById('sajuConcernAnswer');
    w.CdConcernAnswer.render(host, CTX);
    assert.equal(host.hidden, false);
    const answer = host.querySelector('.concern-answer');
    assert.ok(answer, '일반 답');
    assert.match(answer.textContent, /하루에 집중할 일을 정해 보세요\./);
    assert.equal(host.querySelector('.concern-offer'), null);
    assert.doesNotMatch(host.innerHTML, /<script/i);
  }
});

test('render는 고민 답 → 고민 단건(가격·환불 한 줄) → 묶음 순서로 놓는다', () => {
  const w = resultWindow({ url: 'https://code-destiny.com/ggulggul/?action=cdOneStepFreeSajuEntry&concern=job' });
  const host = w.document.getElementById('sajuConcernAnswer');
  w.CdConcernAnswer.render(host, CTX);
  w.CdSajuBundleOffer.renderInline(w.document.getElementById('sajuBundleOffer'));
  w.CdConcernAnswer.render(host, CTX); // 다시 그려도 겹치지 않는다
  const children = [...host.children];
  assert.equal(children.length, 3);
  assert.ok(children[0].matches('.concern-answer'));
  assert.ok(children[1].matches('.concern-offer[data-feature-key="tarot-ijik"]'));
  assert.equal(children[2].id, 'sajuBundleOffer');
  const offer = children[1];
  assert.match(offer.textContent, new RegExp(won(FEATURE_KEY_PRICE_TABLE['tarot-ijik'].amountKRW)));
  assert.match(offer.textContent, /5,000원/);
  assert.match(offer.textContent, new RegExp(REFUND_LINE));
  assert.ok(offer.querySelector(`a[href="${REFUND_POLICY_HREF}"]`), '환불 기준 링크');
  assert.ok(offer.querySelector('a[href="/features/tarot-ijik/"]'), '단건 상세로 가는 길');
  assert.equal(offer.querySelector('[data-action]'), null, '단건 카드는 결제 함수를 직접 부르지 않는다');
  assert.match(children[2].textContent, new RegExp(won(UNLOCK_PRODUCT_BY_FEATURE_KEY.saju_lifetime_bundle.amountKRW)));
  assert.match(children[2].textContent, /29,000원/);
  assert.doesNotMatch(host.textContent, BANNED);
});

test('묶음 안내는 가격을 생성 파일에서 읽고 리터럴로 들고 있지 않다', () => {
  const source = read('js/core/saju/bundle-offer.js');
  assert.doesNotMatch(source, /29,000원/);
  assert.match(source, /CdConcernOffers/);
  // 생성 파일이 없으면 가격 줄만 빠진다(빈 "원"이나 undefined 금지).
  const dom = new JSDOM('<!doctype html><body><div id="sajuBundleOffer"></div></body>', { runScripts: 'outside-only', url: 'https://code-destiny.com/' });
  dom.window.eval(source);
  const card = dom.window.CdSajuBundleOffer.renderInline(dom.window.document.getElementById('sajuBundleOffer'));
  assert.doesNotMatch(card.textContent, /undefined|\(\s*\)|\d원/);
});

test('생성 파일은 고민별 사주 분야와 환불 한 줄을 정본에서 싣는다', () => {
  const sandbox = {};
  sandbox.window = sandbox;
  vm.runInNewContext(read('js/core/saju/concern-offers.generated.js'), sandbox);
  const data = sandbox.CdConcernOffers;
  for (const concern of HOME_CONCERNS) {
    assert.equal(data.concerns[concern.id].sajuField, concern.sajuField);
    assert.equal(data.concerns[concern.id].priceLabel, won(FEATURE_KEY_PRICE_TABLE[concern.featureKey].amountKRW));
  }
  assert.equal(data.refund.line, REFUND_LINE);
  assert.equal(data.refund.href, REFUND_POLICY_HREF);
});

// renderCurrentSeasonSummary 에서 올해 간지 계산을 꺼낸 뒤에도 출력은 그대로다(추출 전 출력의 해시).
const SEASON_SNAPSHOT_SHA256 = '1d88653df35effc701e2463840733ff78657225766ef610c1d099f34c114909e';
function seasonFixture() {
  const engine = read('js/saju-engine.js');
  const start = engine.indexOf('function renderCurrentSeasonSummary(bazi){');
  const end = engine.indexOf('// 🔴 종합 풀이', start);
  const FIXED = Date.UTC(2026, 10, 7, 3, 0, 0);
  class FixedDate extends Date {
    constructor(...args) { super(...(args.length ? args : [FIXED])); }
    static now() { return FIXED; }
  }
  const dom = new JSDOM('<section id="currentSeasonCard"><div id="currentSeasonSummary"></div></section>');
  const box = dom.window.document.getElementById('currentSeasonSummary');
  const calls = [];
  const ctx = { document: dom.window.document, console, CURRENT_AGE: 35,
    GAN: { 甲: { e: 'wood', n: '갑목' }, 丙: { e: 'fire', n: '병화' } }, JI: { 子: { e: 'water', a: '쥐' }, 午: { e: 'fire', a: '말' } },
    _coreEightChar: (...args) => { calls.push(args); return { getYearGan: () => '丙', getYearZhi: () => '午' }; },
    evalDaewun: (g, j) => ({ score: g === '丙' ? 72 : 55, label: '라벨' + g + j, tagCls: 'tag-good', emoji: '😊', evalSummary: '요약' + g + j }),
    getDetailedGaeun: (e, good) => ({ love: '연애' + e + good, wealth: '재물' + e + good, career: '일' + e + good }), _getDwHapResults: () => [],
    _cdSajuGateUnlocked: () => true, G_DAEWUN: [{ age: 30, g: '甲', j: '子' }], SajuReadingPresentation: { setFlow: () => {} } };
  ctx.window = ctx;
  vm.createContext(ctx);
  ctx.Date = FixedDate;
  vm.runInContext(engine.slice(start, end), ctx);
  return { ctx, box, calls };
}

test('_cdCurrentYearGanZhi를 꺼내도 renderCurrentSeasonSummary 출력은 그대로다', () => {
  const { ctx, box, calls } = seasonFixture();
  assert.equal(typeof ctx._cdCurrentYearGanZhi, 'function');
  assert.deepEqual({ ...ctx._cdCurrentYearGanZhi() }, { yg: '丙', yz: '午' });
  calls.length = 0;
  ctx.renderCurrentSeasonSummary();
  assert.equal(createHash('sha256').update(box.innerHTML).digest('hex'), SEASON_SNAPSHOT_SHA256);
  assert.deepEqual(calls, [[2026, 11, 7, 12, 0]]);
  assert.match(read('js/saju-engine.js'), /function renderCurrentSeasonSummary\(bazi\)\{[\s\S]*?_cdCurrentYearGanZhi\(\)[\s\S]*?\n\}/);
});

test('무료 결과 화면은 묶음 안내보다 먼저 고민 답을 그리고 로그인 복귀에 고민을 싣는다', () => {
  const engine = read('js/saju-engine.js');
  const answerAt = engine.indexOf('_cdRenderConcernAnswer();', engine.indexOf('window.__cdLastBundleArgs={p:p'));
  const bundleAt = engine.indexOf('_cdRenderBundleSurfaces(); } catch(e) { console.error(\'BundleSurfaces');
  assert.ok(answerAt > 0 && answerAt < bundleAt, '고민 답 → 묶음 순서');
  const index = read('index.html');
  assert.match(index, /<div id="sajuBundleOffer"><\/div>\s*<section id="sajuConcernAnswer"[^>]*hidden[^>]*><\/section>\s*<\/section>/);
  assert.match(index, /<script defer src="\/js\/core\/saju\/concern-answer\.js\?v=build-[0-9a-f]+"><\/script>/);

  // 로그인 복귀 주소와 임시 보관에 고민을 싣는다(허용 목록은 CdConcernAnswer.resolveConcern 이 지킨다).
  const pick = name => {
    const start = engine.indexOf('function ' + name + '(');
    return engine.slice(start, engine.indexOf('\n}\n', start) + 2);
  };
  const store = new Map();
  const ctx = {
    URL, JSON, Date, concern: 'money', GENDER: 'F',
    location: { pathname: '/ggulggul/', search: '?concern=%3Cscript%3E', origin: 'https://code-destiny.com' },
    document: { getElementById: () => null, querySelector: () => null },
    sessionStorage: { setItem: (k, v) => store.set(k, v) },
    SAJU_LOGIN_FIELDS: [], SAJU_LOGIN_DRAFT_KEY: 'draft',
  };
  ctx.window = ctx;
  ctx.window.CdConcernAnswer = { resolveConcern: () => ctx.concern };
  vm.createContext(ctx);
  vm.runInContext(['sajuLoginDraftScope', 'getSajuReturnPath', '_cdSajuConcern', 'getSajuLoginReturnPath', 'saveSajuLoginDraft'].map(pick).join('\n'), ctx);
  const path = new URL(ctx.getSajuLoginReturnPath(), 'https://code-destiny.com');
  assert.equal(path.searchParams.get('concern'), 'money');
  assert.equal(path.searchParams.get('action'), 'cdOneStepFreeSajuEntry');
  ctx.saveSajuLoginDraft();
  assert.equal(JSON.parse(store.get('draft')).concern, 'money');
  ctx.concern = null;
  assert.equal(new URL(ctx.getSajuLoginReturnPath(), 'https://code-destiny.com').searchParams.get('concern'), null, '위조 concern은 복귀 주소에서 뺀다');
});
