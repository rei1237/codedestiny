const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');
const assert = require('node:assert/strict');
const vm = require('node:vm');

const source = fs.readFileSync(path.resolve(__dirname, '../../js/saju-engine.js'), 'utf8');

test('사주 결과는 상단 핵심 카드의 레이아웃이 준비된 뒤 공개한다', () => {
  const prepare = source.indexOf("resultPageEl.style.visibility = 'hidden';");
  const mount = source.indexOf("resultPageEl.style.display = 'block';", prepare);
  const ilju = source.indexOf('renderIlju(p);');
  const tenshin = source.indexOf('renderTenshin(p);');
  const skillTree = source.indexOf('renderSkillTree(p,natal);');
  const reveal = source.indexOf("resultPageEl.style.visibility = 'visible';", skillTree);
  const scroll = source.indexOf('resultPageEl.scrollIntoView', reveal);

  assert.ok(prepare >= 0, '결과 영역을 공개 전 숨기지 않는다');
  assert.ok(mount > prepare, '숨김 상태에서 결과 레이아웃을 먼저 만들지 않는다');
  assert.ok(ilju > mount && tenshin > ilju, '일주/십신 카드가 결과 공개 전 렌더되지 않는다');
  assert.ok(reveal > skillTree, '상단 핵심 카드가 준비되기 전에 결과를 공개한다');
  assert.ok(scroll > reveal, '결과 공개 전에 스크롤을 시작한다');
});

test('사주 계산 오류는 다음 시도의 결과 공개 상태를 복구한다', () => {
  const failure = source.indexOf("if (_rp) {\n        _rp.style.display = 'none';");
  const resetVisibility = source.indexOf("_rp.style.visibility = 'visible';", failure);
  const resetBusy = source.indexOf("_rp.removeAttribute('aria-busy');", failure);

  assert.ok(failure >= 0 && resetVisibility > failure && resetBusy > resetVisibility,
    '오류 뒤 결과 영역이 숨김 또는 busy 상태로 남는다');
});

// 묶음 표면은 소스 순서만 보지 않고 실제 함수를 돌려 닫힘·열림·권한 조회 실패를 본다.
function bundleSurfaces(isOpen) {
  const start = source.indexOf('function _cdSajuBundleOpen(){');
  const end = source.indexOf("window.addEventListener('cd:unlocks-changed',function(){ try{ _cdRenderBundleSurfaces();", start);
  assert.ok(start >= 0 && end > start, '묶음 표면 함수를 찾지 못했다');
  const calls = [];
  const note = (name) => (...args) => { calls.push(name); return args[0]; };
  const hosts = { sajuBundleOffer: {}, letterBox: { style: {} } };
  const context = vm.createContext({
    console,
    document: { getElementById: (id) => hosts[id] || null },
    window: {
      __cdLastBundleArgs: { p: { y: { g: '甲' }, m: { j: '子' }, d: { g: '甲', j: '子' } }, natal: {}, bazi: {}, johu: {} },
      CdSajuBundleOffer: {
        isOpen,
        isLottoOpen: () => false,
        renderInline: note('offer'),
        removeInline: note('removeOffer'),
        clearCards: note('clearCards'),
      },
    },
    G_POWER: {},
    _cdSajuGateUnlocked: () => false,
    invokeOptionalGlobalRenderer: (name) => calls.push(name),
    runDeferredSajuTasks: (tasks) => tasks.forEach((task) => task()),
    renderDailyMonthlyFortune: note('daily'),
    renderLetter: note('letter'),
    renderTodayDestinyCard: note('today'),
    findSimilarCelebs: note('celebs'),
    renderHormoneVibe: note('hormone'),
  });
  vm.runInContext(source.slice(start, end), context);
  context._cdRenderBundleSurfaces();
  return calls;
}

test('무료 첫 화면은 원국과 한 줄 성향을 공개 전에 그리고 묶음 표면은 공개 뒤에 판정한다', () => {
  const reveal = source.indexOf("resultPageEl.style.visibility = 'visible';");
  const manse = source.indexOf('renderManse(');
  const oneLiner = source.indexOf('_cdRenderNatalOneLiner(p)');
  const surfaces = source.indexOf('try { _cdRenderBundleSurfaces(); }');
  assert.ok(manse >= 0 && manse < reveal, '원국이 공개 전에 그려지지 않는다');
  assert.ok(oneLiner >= 0 && oneLiner < surfaces, '한 줄 성향이 묶음 판정에 앞서지 않는다');
  assert.ok(surfaces > reveal, '묶음 표면이 공개 전에 그려진다');
});

test('묶음이 닫혀 있으면 안내만 그리고 묶음 안의 카드는 호출하지 않는다', () => {
  const calls = bundleSurfaces(() => false);
  assert.ok(calls.includes('offer'));
  for (const paid of ['daily', 'letter', 'today', 'celebs', 'renderTTest', 'hormone', 'renderDopamineReport', 'renderSajuFourCutContent', 'renderLottoNumbers']) {
    assert.ok(!calls.includes(paid), `${paid}가 잠금 상태에서 호출됐다`);
  }
});

test('권한 조회가 실패해도 닫힘으로 떨어져 묶음 카드를 그리지 않는다', () => {
  const calls = bundleSurfaces(() => { throw new Error('access-store failed'); });
  assert.ok(calls.includes('offer'));
  assert.ok(!calls.includes('daily') && !calls.includes('letter'));
});

test('묶음이 열리면 안내를 걷고 묶음 카드를 그린다', () => {
  const calls = bundleSurfaces(() => true);
  assert.ok(calls.includes('removeOffer') && !calls.includes('offer'));
  for (const paid of ['daily', 'letter', 'today', 'celebs', 'renderLottoNumbers']) assert.ok(calls.includes(paid), `${paid}가 호출되지 않았다`);
});
