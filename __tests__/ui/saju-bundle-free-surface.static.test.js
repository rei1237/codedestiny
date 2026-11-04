const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const test = require('node:test');
const assert = require('node:assert/strict');
const { pathToFileURL } = require('node:url');
const { JSDOM } = require('jsdom');

const root = path.resolve(__dirname, '../..');
const read = (rel) => fs.readFileSync(path.join(root, rel), 'utf8');
const engine = read('js/saju-engine.js');
const indexHtml = read('index.html');
const dashboard = read('js/core/saju/reportDashboard.js');
const BUNDLE = 'saju_lifetime_bundle';

function between(src, start, end) {
  const a = src.indexOf(start);
  assert.ok(a >= 0, `찾지 못함: ${start}`);
  const b = src.indexOf(end, a + start.length);
  assert.ok(b > a, `끝을 찾지 못함: ${end}`);
  return src.slice(a, b);
}
function functionBody(src, name) {
  const a = src.indexOf(`function ${name}(`);
  assert.ok(a >= 0, `함수 없음: ${name}`);
  const open = src.indexOf('{', a);
  let depth = 0;
  for (let i = open; i < src.length; i += 1) {
    if (src[i] === '{') depth += 1;
    else if (src[i] === '}') { depth -= 1; if (depth === 0) return src.slice(open, i + 1); }
  }
  throw new Error(`함수 끝 없음: ${name}`);
}

test('한 줄 성향은 60갑자 모두 한 문장이고 서로 겹치지 않으며 유료 해석 문장이 없다', async () => {
  const generated = read('js/core/saju/natal-one-liner.generated.js');
  const sandbox = { globalThis: {} };
  sandbox.window = sandbox.globalThis;
  vm.runInNewContext(generated, sandbox);
  const api = sandbox.globalThis.CdSajuNatalOneLiner;
  const depth = await import(pathToFileURL(path.join(root, 'lib/saju/reading-depth.mjs')).href);
  assert.equal(depth.DAY_KEYS.length, 60);
  const seen = new Set();
  for (const key of depth.DAY_KEYS) {
    const line = api.get(key);
    assert.ok(line && line.length > 0, `${key} 비어 있음`);
    assert.equal((line.match(/[.!?]/g) || []).length, 1, `${key} 한 문장이 아님: ${line}`);
    assert.ok(line.endsWith('.') || line.endsWith('!') || line.endsWith('?'), `${key} 문장 끝`);
    assert.ok(!seen.has(line), `${key} 다른 일주와 겹침: ${line}`);
    seen.add(line);
    // 둘째 문장부터는 서버 전용이다. 생성 파일에 있으면 안 된다.
    const rest = String(depth.PILLAR_NOTES[key]).slice(line.length).trim();
    if (rest) assert.ok(!generated.includes(rest.split(/[.!?]/)[0].trim()), `${key} 유료 문장이 들어감`);
  }
  assert.equal(api.get('없는키'), '');
  assert.ok(!generated.includes('PILLAR_NOTES'));
});

test('미해제 첫 렌더는 원국 -> 한 줄 성향 -> 묶음 안내 순서이고 묶음 렌더러는 isOpen 뒤에만 호출된다', () => {
  const pipeline = between(engine, 'try { renderManse(p); }', "var ss=document.getElementById('shareSection')");
  const manse = pipeline.indexOf('renderManse(p)');
  const oneLiner = pipeline.indexOf('_cdRenderNatalOneLiner(p)');
  const offer = pipeline.indexOf('_cdRenderBundleSurfaces(');
  assert.ok(manse >= 0 && oneLiner > manse, '한 줄 성향이 원국 뒤에 와야 한다');
  assert.ok(offer > oneLiner, '묶음 안내가 한 줄 성향 뒤에 와야 한다');
  // 한 줄 성향은 동기 호출이다(지연 작업 목록 안에 있지 않다).
  assert.ok(oneLiner < pipeline.indexOf('runDeferredSajuTasks(['), '한 줄 성향은 동기 호출');
  // 기존 이벤트와 전역은 무료 경로에서도 그대로 나온다.
  assert.match(pipeline, /window\.__cdLastSummaryArgs=/);
  assert.match(pipeline, /cd:saju-summary-ready/);
  assert.match(pipeline, /window\.__cdLastBundleArgs=/);

  const guarded = ['renderDailyMonthlyFortune', 'renderLetter', 'renderTodayDestinyCard', 'findSimilarCelebs',
    'renderLottoNumbers', 'renderHormoneVibe', 'renderDopamineReport', 'renderTTest'];
  const deferred = pipeline.slice(pipeline.indexOf('runDeferredSajuTasks(['));
  for (const name of guarded) {
    assert.ok(!deferred.includes(name + '('), `${name} 은 첫 렌더 지연 목록에서 직접 호출하면 안 된다`);
    assert.ok(!/invokeOptionalGlobalRenderer\('renderTTest'/.test(pipeline), 'renderTTest 직접 호출 금지');
  }
  const body = functionBody(engine, '_cdRenderBundleSurfaces');
  assert.match(body, /_cdSajuBundleOpen\(\)/);
  assert.match(body, /_cdSajuSharedTileOpen\(\)/);
  const gateAt = body.indexOf('_cdSajuBundleOpen()');
  const sharedAt = body.indexOf('_cdSajuSharedTileOpen()');
  for (const name of ['renderDailyMonthlyFortune', 'renderLetter', 'renderTodayDestinyCard', 'findSimilarCelebs', 'renderLottoNumbers']) {
    assert.ok(body.indexOf(name) > gateAt && gateAt >= 0, `${name} 은 isOpen 검사 뒤에만 호출`);
  }
  for (const name of ['renderHormoneVibe', 'renderDopamineReport', 'renderTTest']) {
    assert.ok(body.indexOf(name) > sharedAt && sharedAt >= 0, `${name} 은 공유 타일 검사 뒤에만 호출`);
  }
  // 회당 카드는 묶음 판정에 넣지 않는다.
  assert.ok(!body.includes('renderSajuQuestionPromptGenerator'));
  // 기존 해금 이벤트에서 다시 그린다.
  assert.match(engine, /addEventListener\('cd:unlocks-changed'[\s\S]{0,200}_cdRenderBundleSurfaces/);
});

test('권한 조회가 실패해도 원국과 한 줄 성향은 렌더되고 묶음 판정은 닫힘으로 떨어진다', () => {
  const oneLinerBody = functionBody(engine, '_cdRenderNatalOneLiner');
  assert.ok(!/isOpen|isTileKeyUnlocked|_cdSajuGateUnlocked|_cdSajuBundleOpen/.test(oneLinerBody), '한 줄 성향은 권한 조회와 무관');
  assert.match(oneLinerBody, /CdSajuNatalOneLiner/);
  const pipeline = between(engine, 'try { renderManse(p); }', 'window.__cdLastSummaryArgs=');
  assert.match(pipeline, /try \{ _cdRenderNatalOneLiner\(p\); \}/);
  const openFn = new Function('window', functionBody(engine, '_cdSajuBundleOpen').replace(/^\{/, 'try{}catch(e){}return (function(){') + ')()');
  assert.equal(openFn({ CdSajuBundleOffer: { isOpen() { throw new Error('access lookup failed'); } } }), false);
  assert.equal(openFn({ CdSajuBundleOffer: { isOpen() { return true; } } }), true);
  assert.equal(openFn({}), false);
});

test('옛 게이트 버튼과 잠금 타일은 묶음 결제로 이어지고 판정 키는 그대로다', () => {
  const gates = between(indexHtml, 'var SECTION_GATE_KEYS=[', '];');
  assert.match(gates, /unlockKey:'section_daewun'[^}]*purchaseKey:'saju_lifetime_bundle'|purchaseKey:'saju_lifetime_bundle'[^}]*unlockKey:'section_daewun'/);
  assert.match(gates, /unlockKey:'section_summary'[^}]*purchaseKey:'saju_lifetime_bundle'|purchaseKey:'saju_lifetime_bundle'[^}]*unlockKey:'section_summary'/);
  for (const id of ['daewunGate', 'summaryGate']) {
    const block = between(indexHtml, `id="${id}"`, '</button>');
    assert.match(block, /data-unlock-key="saju_lifetime_bundle"/);
    assert.match(block, /data-unlock-cost="290"/);
    assert.ok(!/data-saju-price-key=/.test(block), `${id} 에 개별 가격 표기가 남음`);
    assert.ok(!/(20,000|10,000)원/.test(block), `${id} 에 옛 가격 문구가 남음`);
  }
  // 타일 잠금 클릭: 판매 종료 키는 묶음 안내로 간다.
  assert.match(indexHtml, /_cdSajuBundleSaleClosedKey\(tileLockKey\)[\s\S]{0,400}CdSajuBundleOffer\.open/);
  assert.match(indexHtml, /tryUnlockFeature[\s\S]{0,1800}saju_lifetime_bundle/);
  assert.match(indexHtml, /resolveUnlockProductIdByFeatureKey[\s\S]{0,1200}unlock\.saju_lifetime_bundle|saju_lifetime_bundle:\s*['"]unlock\.saju_lifetime_bundle/);
});

test('판매 종료 응답은 묶음 안내를 열고 이미 해금 응답은 결제창 없이 열림으로 본다', () => {
  for (const [file, src] of [['index.html', indexHtml], ['js/destiny-profile.js', read('js/destiny-profile.js')]]) {
    assert.match(src, /PRODUCT_SALE_ENDED/, `${file} 판매 종료 처리`);
    assert.match(src, /CdSajuBundleOffer/, `${file} 묶음 안내 호출`);
    assert.match(src, /alreadyUnlocked/, `${file} 이미 해금 처리`);
    assert.match(src, /MISSING_PROFILE_ID/, `${file} 프로필 없음 처리`);
  }
  const offer = read('js/core/saju/bundle-offer.js');
  assert.match(offer, /handleBillingError/);
  assert.match(offer, /PRODUCT_SALE_ENDED/);
});

function offerWindow({ profileId = '', unlocked = false } = {}) {
  const dom = new JSDOM('<!doctype html><body></body>', { runScripts: 'outside-only', url: 'https://code-destiny.com/' });
  const w = dom.window;
  w.cdBirthScopeCurrentProfileId = () => profileId;
  w.isTileKeyUnlocked = (key) => unlocked && key === BUNDLE;
  w.eval(read('js/core/saju/bundle-offer.js'));
  return w;
}

test('묶음 안내는 포함 목록, 샘플, 29,000원, 영구 소장 설명, 결제 버튼을 보여 준다', () => {
  const w = offerWindow({ profileId: 'profile-1' });
  w.CdSajuBundleOffer.open({ source: 'test' });
  const panel = w.document.getElementById('cdBundleOffer');
  assert.ok(panel && !panel.hidden);
  const text = panel.textContent;
  assert.match(text, /29,000원/);
  assert.match(text, /영구/);
  assert.ok(panel.querySelectorAll('li').length >= 8, '포함 항목 목록');
  assert.ok(panel.querySelector('.cd-bundle-offer__sample'), '샘플');
  const pay = panel.querySelector('[data-action="unlockPremiumFeature"]');
  assert.equal(pay.getAttribute('data-unlock-key'), BUNDLE);
  assert.equal(pay.getAttribute('data-unlock-cost'), '290');
  assert.ok(!/LLM|AI 미사용|정확도/.test(text));
  assert.equal(w.CdSajuBundleOffer.isOpen(), false);
});

test('프로필을 저장하지 않은 입력은 결제 버튼 대신 프로필 저장 안내로 간다', () => {
  const w = offerWindow({ profileId: '' });
  let guided = 0;
  w.addEventListener('cd:saju-bundle-profile-guidance', () => { guided += 1; });
  w.CdSajuBundleOffer.open({ source: 'test' });
  const panel = w.document.getElementById('cdBundleOffer');
  assert.ok(panel.querySelector('[data-cd-bundle-profile-guide]'));
  assert.equal(panel.querySelector('[data-action="unlockPremiumFeature"]'), null);
  assert.equal(guided, 1);
});

test('판매 종료 응답과 해금 상태를 묶음 안내가 읽는다', () => {
  const w = offerWindow({ profileId: 'p', unlocked: false });
  assert.equal(w.CdSajuBundleOffer.handleBillingError(409, { code: 'PRODUCT_SALE_ENDED', bundleFeatureKey: BUNDLE }), true);
  assert.ok(!w.document.getElementById('cdBundleOffer').hidden);
  assert.equal(w.CdSajuBundleOffer.handleBillingError(402, { code: 'INSUFFICIENT' }), false);
  const open = offerWindow({ profileId: 'p', unlocked: true });
  assert.equal(open.CdSajuBundleOffer.isOpen(), true);
});

test('기존 section_summary 구매자의 공유 타일은 잠금 키를 유지한다', () => {
  for (const id of ['tbal', 'tetoegen', '4CUT', 'dopamine']) {
    const line = dashboard.split('\n').find((l) => new RegExp(`id:\\s*['"]${id}['"]`).test(l));
    assert.ok(line, id);
    assert.match(line, /lockKey:\s*'section_summary'/, `${id} 잠금 키`);
  }
  assert.match(functionBody(engine, '_cdSajuSharedTileOpen'), /section_summary/);
  // 옛 가격 배지와 개별 해금 안내가 남지 않는다.
  assert.ok(!/badge:"5,000원"/.test(dashboard));
  assert.ok(!/리포트 해금 안내 보기/.test(dashboard));
  assert.match(dashboard, /묶음 포함/);
});

test('테토/에겐 상세와 로또 리포트는 개별 권리 또는 묶음으로 열린다', () => {
  const ent = read('js/entertain-engine.js');
  assert.match(functionBody(ent, 'isTetogenDeepReportUnlocked'), /saju_lifetime_bundle|CdSajuBundleOffer/);
  const lotto = read('js/saju-engine-tarot-sukuyo-quantum.js');
  const open = between(lotto, 'window.openLottoRitualReport=function', 'window.saveLottoRitualReport');
  assert.match(open, /saju_lifetime_bundle|CdSajuBundleOffer/);
  assert.ok(!/1회 1,000원/.test(open));
  // 방어선: 일진·월운과 편지 렌더러 자체도 묶음이 닫혀 있으면 아무것도 만들지 않는다.
  assert.match(functionBody(lotto, 'renderDailyMonthlyFortune').slice(0, 900), /isOpen|BundleOpen|saju_lifetime_bundle/);
  assert.match(functionBody(lotto, 'renderLetter').slice(0, 900), /isOpen|BundleOpen|saju_lifetime_bundle/);
});

test('가격 동기화 스크립트는 판매 종료 상품의 개별 가격을 다시 쓰지 않는다', () => {
  const sync = read('scripts/lib/sync-saju-reading-prices.mjs');
  assert.ok(!/data-career-style-price/.test(sync));
  assert.ok(!/section_daewun|section_summary/.test(sync.replace(/\/\/.*$/gm, '')) || /saju_lifetime_bundle/.test(sync));
});

// ── 뇌구조 부트 ──
function bootWindow({ open }) {
  const dom = new JSDOM('<!doctype html><body><section id="destinyAnatomyCard" hidden data-da-engine="/e.js" data-da-hdcopy="/h.js" data-da-copy="/c.js" data-da-render="/r.js"></section></body>',
    { runScripts: 'outside-only', url: 'https://code-destiny.com/', pretendToBeVisual: true });
  const w = dom.window;
  w.G_PILLARS = { d: { g: '甲', j: '子' } };
  w.CdSajuBundleOffer = { isOpen: () => open.value };
  const appended = [];
  const origAppend = w.document.head.appendChild.bind(w.document.head);
  w.document.head.appendChild = (node) => { appended.push(node); return origAppend(node); };
  w.fetch = () => { throw new Error('fetch 금지'); };
  w.eval(read('js/core/saju/destiny-anatomy/boot.js'));
  return { w, appended };
}

test('뇌구조 부트: 미해제면 자산을 불러오지 않고 카드에 계산 결과가 없으며 해제 뒤에 시작한다', async () => {
  const open = { value: false };
  const { w, appended } = bootWindow({ open });
  await new Promise((resolve) => setTimeout(resolve, 30));
  w.dispatchEvent(new w.CustomEvent('cd:saju-summary-ready', { detail: {} }));
  const card = w.document.getElementById('destinyAnatomyCard');
  assert.equal(appended.filter((n) => n.tagName === 'SCRIPT' || n.tagName === 'LINK').length, 0, '자산 로드 금지');
  assert.equal(card.innerHTML.trim(), '');
  assert.equal(card.hidden, true);
  open.value = true;
  w.dispatchEvent(new w.CustomEvent('cd:unlocks-changed'));
  assert.ok(appended.some((n) => n.tagName === 'SCRIPT'), '해제 뒤에는 자산을 불러온다');
  assert.equal(card.hidden, false);
});

test('영냥이 모자 표면은 묶음 판정에 닿지 않는다', () => {
  const hat = read('js/core/saju/destiny-anatomy/boot.js');
  assert.ok(!/yeongnyangi|영냥/i.test(hat));
});
